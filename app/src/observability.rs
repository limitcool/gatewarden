use crate::{
    config::CaddyAccessLogConfig,
    ip_intel::IpIntelService,
    store::{HttpObservationInput, Store},
};
use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use std::{
    fs::File,
    io::{BufRead, BufReader, Seek, SeekFrom},
    path::Path,
    sync::Arc,
    time::Duration,
};

#[derive(Debug, Clone)]
pub struct ObservabilityService {
    store: Arc<Store>,
    config: CaddyAccessLogConfig,
    ip_intel: IpIntelService,
}

impl ObservabilityService {
    pub fn new(
        store: Arc<Store>,
        config: CaddyAccessLogConfig,
        ip_intel: IpIntelService,
    ) -> Self {
        Self {
            store,
            config,
            ip_intel,
        }
    }

    pub fn start(self) {
        if !self.config.enabled {
            return;
        }

        tokio::spawn(async move {
            if let Err(error) = self.run().await {
                eprintln!("observability ingest exited: {error}");
            }
        });
    }

    async fn run(self) -> Result<()> {
        let mut offset = 0_u64;
        let poll_interval = Duration::from_millis(self.config.poll_interval_ms.max(250));
        loop {
            if let Err(error) = self.ingest_once(&mut offset).await {
                eprintln!("observability ingest warning: {error}");
            }
            tokio::time::sleep(poll_interval).await;
        }
    }

    async fn ingest_once(&self, offset: &mut u64) -> Result<()> {
        let path = Path::new(&self.config.path);
        if !path.exists() {
            return Ok(());
        }

        let file = File::open(path)
            .with_context(|| format!("failed to open caddy access log: {}", path.display()))?;
        let metadata = file
            .metadata()
            .with_context(|| format!("failed to stat caddy access log: {}", path.display()))?;
        if metadata.len() < *offset {
            *offset = 0;
        }

        let mut reader = BufReader::new(file);
        reader
            .seek(SeekFrom::Start(*offset))
            .with_context(|| format!("failed to seek caddy access log: {}", path.display()))?;

        let mut consumed = 0_u64;
        for line in reader.lines() {
            let line = line.context("failed to read caddy access log line")?;
            consumed += line.len() as u64 + 1;
            if line.trim().is_empty() {
                continue;
            }
            if let Some(mut observation) = parse_caddy_log_line(&line)? {
                if let Some(geo) = self.ip_intel.lookup(&observation.client_ip).await {
                    observation.country = geo.country;
                    observation.country_code = geo.country_code;
                    observation.region = geo.region;
                    observation.city = geo.city;
                    observation.timezone = geo.timezone;
                    observation.asn = geo.asn;
                    observation.asn_org = geo.asn_org;
                    observation.isp = geo.isp;
                    observation.is_proxy = Some(geo.is_proxy);
                    observation.is_vpn = Some(geo.is_vpn);
                    observation.is_tor = Some(geo.is_tor);
                    observation.is_datacenter = Some(geo.is_datacenter);
                }
                self.store.insert_http_observation(observation).await?;
            }
        }

        *offset += consumed;
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
struct CaddyLogEntry {
    ts: Option<serde_json::Value>,
    request: Option<CaddyRequest>,
    status: Option<u16>,
    duration: Option<f64>,
    resp_headers: Option<serde_json::Value>,
    logger: Option<String>,
    #[serde(default)]
    service_name: Option<String>,
    #[serde(default)]
    upstream_duration_ms: Option<f64>,
    #[serde(default)]
    upstream_latency_ms: Option<f64>,
    #[serde(default)]
    error_kind: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CaddyRequest {
    method: Option<String>,
    uri: Option<String>,
    host: Option<String>,
    remote_ip: Option<String>,
    headers: Option<serde_json::Map<String, serde_json::Value>>,
}

fn parse_caddy_log_line(line: &str) -> Result<Option<HttpObservationInput>> {
    let entry: CaddyLogEntry = match serde_json::from_str(line) {
        Ok(value) => value,
        Err(_) => return Ok(None),
    };

    let request = match entry.request {
        Some(value) => value,
        None => return Ok(None),
    };

    let created_at = entry
        .ts
        .as_ref()
        .and_then(parse_log_timestamp)
        .unwrap_or_else(Utc::now);
    let method = request.method.unwrap_or_else(|| "GET".to_string());
    let path = request.uri.unwrap_or_else(|| "/".to_string());
    let host = request.host.unwrap_or_else(|| "unknown".to_string());
    let client_ip = request.remote_ip.unwrap_or_else(|| "0.0.0.0".to_string());
    let status_code = i32::from(entry.status.unwrap_or(0));
    let duration_ms = entry
        .duration
        .map(seconds_to_ms)
        .or_else(|| entry.upstream_duration_ms.map(round_ms))
        .unwrap_or(0);
    let request_id = extract_request_id(request.headers.as_ref(), entry.resp_headers.as_ref());
    let error_kind = entry.error_kind.or_else(|| classify_status(status_code));
    let user_agent = extract_header_value_case_insensitive(request.headers.as_ref(), "user-agent");

    Ok(Some(HttpObservationInput {
        created_at,
        request_id,
        method,
        path,
        host,
        client_ip,
        status_code,
        duration_ms,
        upstream_duration_ms: entry.upstream_duration_ms.map(round_ms),
        upstream_latency_ms: entry.upstream_latency_ms.map(round_ms),
        service_name: entry.service_name.or(entry.logger),
        error_kind,
        user_agent,
        country: None,
        country_code: None,
        region: None,
        city: None,
        timezone: None,
        asn: None,
        asn_org: None,
        isp: None,
        is_proxy: None,
        is_vpn: None,
        is_tor: None,
        is_datacenter: None,
        source: "caddy_access_log".to_string(),
    }))
}

fn seconds_to_ms(value: f64) -> i64 {
    (value * 1_000.0).round() as i64
}

fn round_ms(value: f64) -> i64 {
    value.round() as i64
}

fn parse_log_timestamp(value: &serde_json::Value) -> Option<DateTime<Utc>> {
    match value {
        serde_json::Value::String(item) => DateTime::parse_from_rfc3339(item)
            .map(|ts| ts.with_timezone(&Utc))
            .ok(),
        serde_json::Value::Number(item) => {
            let seconds = item.as_f64()?;
            let whole = seconds.trunc() as i64;
            let nanos = ((seconds.fract() * 1_000_000_000.0).round() as u32).min(999_999_999);
            DateTime::<Utc>::from_timestamp(whole, nanos)
        }
        _ => None,
    }
}

fn extract_request_id(
    request_headers: Option<&serde_json::Map<String, serde_json::Value>>,
    response_headers: Option<&serde_json::Value>,
) -> Option<String> {
    extract_header_value_case_insensitive(request_headers, "x-request-id")
        .or_else(|| extract_header_value_from_value_case_insensitive(response_headers, "x-request-id"))
}

fn extract_header_value_case_insensitive(
    headers: Option<&serde_json::Map<String, serde_json::Value>>,
    key: &str,
) -> Option<String> {
    let value = headers?
        .iter()
        .find(|(name, _)| name.eq_ignore_ascii_case(key))
        .map(|(_, value)| value)?;
    match value {
        serde_json::Value::Array(items) => items.first()?.as_str().map(ToString::to_string),
        serde_json::Value::String(item) => Some(item.to_string()),
        _ => None,
    }
}

fn extract_header_value_from_value_case_insensitive(
    value: Option<&serde_json::Value>,
    key: &str,
) -> Option<String> {
    extract_header_value_case_insensitive(value?.as_object(), key)
}

fn classify_status(status_code: i32) -> Option<String> {
    match status_code {
        404 => Some("not_found".to_string()),
        500..=599 => Some("upstream_error".to_string()),
        429 => Some("rate_limited".to_string()),
        403 => Some("policy_denied".to_string()),
        _ => None,
    }
}
