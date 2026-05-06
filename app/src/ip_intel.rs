use crate::config::GeoIpConfig;
use anyhow::Result;
use reqwest::Client;
use serde::Deserialize;
use std::{
    collections::HashMap,
    net::IpAddr,
    sync::Arc,
    time::Duration,
};
use tokio::sync::RwLock;

#[derive(Debug, Clone, Default)]
pub struct IpGeoRecord {
    pub country: Option<String>,
    pub country_code: Option<String>,
    pub region: Option<String>,
    pub city: Option<String>,
    pub timezone: Option<String>,
    pub asn: Option<String>,
    pub asn_org: Option<String>,
    pub isp: Option<String>,
    pub is_proxy: bool,
    pub is_vpn: bool,
    pub is_tor: bool,
    pub is_datacenter: bool,
}

#[derive(Debug, Clone)]
pub struct IpIntelService {
    enabled: bool,
    endpoint: String,
    client: Client,
    cache: Arc<RwLock<HashMap<String, Option<IpGeoRecord>>>>,
}

impl IpIntelService {
    pub fn new(config: &GeoIpConfig) -> Self {
        Self {
            enabled: config.enabled,
            endpoint: config.endpoint.trim_end_matches('/').to_string(),
            client: Client::builder()
                .timeout(Duration::from_millis(config.timeout_ms.max(250)))
                .build()
                .expect("geoip client should build"),
            cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn lookup(&self, ip: &str) -> Option<IpGeoRecord> {
        if !self.enabled || !is_public_ip(ip) {
            return None;
        }

        if let Some(cached) = self.cache.read().await.get(ip).cloned() {
            return cached;
        }

        let fetched = self.fetch(ip).await.ok().flatten();
        self.cache
            .write()
            .await
            .insert(ip.to_string(), fetched.clone());
        fetched
    }

    async fn fetch(&self, ip: &str) -> Result<Option<IpGeoRecord>> {
        let response = self
            .client
            .get(format!("{}/{}", self.endpoint, ip))
            .send()
            .await?;

        if !response.status().is_success() {
            return Ok(None);
        }

        let payload: IpWhoEnvelope = response.json().await?;
        if !payload.success {
            return Ok(None);
        }

        let data = match payload.data {
            Some(data) => data,
            None => return Ok(None),
        };

        Ok(Some(IpGeoRecord {
            country: data.country.filter(|value| !value.is_empty()),
            country_code: data.country_code.filter(|value| !value.is_empty()),
            region: data.region.filter(|value| !value.is_empty()),
            city: data.city.filter(|value| !value.is_empty()),
            timezone: data.time_zone.filter(|value| !value.is_empty()),
            asn: data
                .asn
                .as_ref()
                .and_then(|value| value.number.map(|item| format!("AS{item}"))),
            asn_org: data.asn.and_then(|value| value.org).filter(|value| !value.is_empty()),
            isp: data.connection.and_then(|value| value.isp).filter(|value| !value.is_empty()),
            is_proxy: false,
            is_vpn: false,
            is_tor: false,
            is_datacenter: false,
        }))
    }
}

fn is_public_ip(value: &str) -> bool {
    match value.parse::<IpAddr>() {
        Ok(IpAddr::V4(ip)) => {
            !(ip.is_private()
                || ip.is_loopback()
                || ip.is_link_local()
                || ip.is_broadcast()
                || ip.is_multicast()
                || ip.is_unspecified()
                || is_ipv4_documentation(ip))
        }
        Ok(IpAddr::V6(ip)) => {
            !(ip.is_loopback()
                || ip.is_unspecified()
                || ip.is_unique_local()
                || ip.is_unicast_link_local()
                || ip.is_multicast()
                || is_ipv6_documentation(ip))
        }
        Err(_) => false,
    }
}

fn is_ipv4_documentation(ip: std::net::Ipv4Addr) -> bool {
    let octets = ip.octets();
    matches!(
        octets,
        [192, 0, 2, _] | [198, 51, 100, _] | [203, 0, 113, _]
    )
}

fn is_ipv6_documentation(ip: std::net::Ipv6Addr) -> bool {
    let segments = ip.segments();
    segments[0] == 0x2001 && segments[1] == 0x0db8
}

#[derive(Debug, Deserialize)]
struct IpWhoEnvelope {
    success: bool,
    data: Option<IpWhoData>,
}

#[derive(Debug, Deserialize)]
struct IpWhoData {
    #[serde(default)]
    country: Option<String>,
    #[serde(rename = "countryCode", default)]
    country_code: Option<String>,
    #[serde(default)]
    region: Option<String>,
    #[serde(default)]
    city: Option<String>,
    #[serde(rename = "time_zone", default)]
    time_zone: Option<String>,
    #[serde(default)]
    asn: Option<IpWhoAsn>,
    #[serde(default)]
    connection: Option<IpWhoConnection>,
}

#[derive(Debug, Deserialize)]
struct IpWhoAsn {
    #[serde(default)]
    number: Option<i64>,
    #[serde(default)]
    org: Option<String>,
}

#[derive(Debug, Deserialize)]
struct IpWhoConnection {
    #[serde(default)]
    isp: Option<String>,
}
