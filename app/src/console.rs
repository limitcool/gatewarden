use crate::{config::AppConfig, entities::security_events, store::Store};
use anyhow::Result;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use ingress_api::{
    ActionItemDto, ApprovalItemDto, ApprovalsOverviewDto, ConsoleResponse, DashboardMetricDto,
    DashboardOverviewDto, DetailItemDto, EventItemDto, EventsOverviewDto, FilterChipDto, MetricDto,
    RuleRowDto, RulesOverviewDto, SettingsOverviewDto, SettingsStateDto, SuggestionItemDto,
    SuggestionsOverviewDto,
};
use std::sync::{Arc, RwLock};

#[derive(Debug, Clone)]
pub struct ConsoleSettingsState {
    pub subject_header: String,
    pub email_header: String,
    pub locale: String,
    pub notes: String,
    pub shadow_mode_enabled: bool,
    pub updated_by: Option<String>,
    pub updated_at: DateTime<Utc>,
}

impl ConsoleSettingsState {
    pub fn from_config(config: &AppConfig) -> Self {
        Self {
            subject_header: config.identity.trusted_headers.subject.clone(),
            email_header: config.identity.trusted_headers.email.clone(),
            locale: "en".to_string(),
            notes: format!(
                "Identity mode: {}. Provider hint: {}. AI remains advisory-only until a reviewer publishes a rule.",
                config.identity.mode, config.identity.provider_hint
            ),
            shadow_mode_enabled: true,
            updated_by: None,
            updated_at: Utc::now(),
        }
    }

    pub fn as_settings_dto(&self) -> SettingsStateDto {
        SettingsStateDto {
            subject_header: self.subject_header.clone(),
            email_header: self.email_header.clone(),
            locale: self.locale.clone(),
            notes: self.notes.clone(),
            shadow_mode_enabled: self.shadow_mode_enabled,
        }
    }
}

#[derive(Debug, Clone)]
pub struct PolicyRuleState {
    pub name: String,
    pub summary: String,
    pub scope: String,
    pub status: String,
    pub mode: String,
    pub source: String,
    pub approved_by: Option<String>,
}

#[derive(Debug, Clone)]
pub struct HttpObservationState {
    pub request_id: Option<String>,
    pub method: String,
    pub path: String,
    pub host: String,
    pub client_ip: String,
    pub status_code: i32,
    pub duration_ms: i64,
    pub upstream_duration_ms: Option<i64>,
    pub upstream_latency_ms: Option<i64>,
    pub service_name: Option<String>,
    pub error_kind: Option<String>,
    pub user_agent: Option<String>,
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
    pub created_at: DateTime<Utc>,
    pub source: String,
}

#[async_trait]
pub trait ConsoleDataProvider: Send + Sync + 'static {
    async fn dashboard(&self) -> Result<ConsoleResponse<DashboardOverviewDto>>;
    async fn events(&self) -> Result<ConsoleResponse<EventsOverviewDto>>;
    async fn rules(&self) -> Result<ConsoleResponse<RulesOverviewDto>>;
    async fn suggestions(&self) -> Result<ConsoleResponse<SuggestionsOverviewDto>>;
    async fn approvals(&self) -> Result<ConsoleResponse<ApprovalsOverviewDto>>;
    async fn settings(&self) -> Result<ConsoleResponse<SettingsOverviewDto>>;
}

#[derive(Debug, Clone)]
pub struct SeaOrmConsoleDataProvider {
    store: Arc<Store>,
    config: Arc<AppConfig>,
    runtime_settings: Arc<RwLock<ConsoleSettingsState>>,
}

impl SeaOrmConsoleDataProvider {
    pub fn new(
        store: Arc<Store>,
        config: Arc<AppConfig>,
        runtime_settings: Arc<RwLock<ConsoleSettingsState>>,
    ) -> Self {
        Self {
            store,
            config,
            runtime_settings,
        }
    }
}

#[async_trait]
impl ConsoleDataProvider for SeaOrmConsoleDataProvider {
    async fn dashboard(&self) -> Result<ConsoleResponse<DashboardOverviewDto>> {
        let recent = self.store.recent_events(3).await?;
        let rules = self.store.list_policy_rules().await?;
        let observations = self.store.recent_http_observations(20).await?;
        let protected_routes = rules.len();
        let rate_limit_rules = rules
            .iter()
            .filter(|rule| rule.scope.to_ascii_lowercase().contains("ip") || rule.name.contains("login"))
            .count();
        let error_count = observations.iter().filter(|item| item.status_code >= 500).count();
        let p95_latency = percentile_latency(&observations, 95).unwrap_or(0);
        Ok(ConsoleResponse {
            data: DashboardOverviewDto {
                metrics: vec![
                    dashboard_metric(
                        "Protected routes",
                        &protected_routes.to_string(),
                        "Current persisted rule inventory across admin, login, and API surfaces",
                        "stable",
                    ),
                    dashboard_metric(
                        "Rate limit policies",
                        &rate_limit_rules.to_string(),
                        "IP, user, and path-aware defaults from the live rule store",
                        "active",
                    ),
                    dashboard_metric(
                        "Captured events",
                        &recent.len().to_string(),
                        "Recent requests written through SeaORM",
                        "review",
                    ),
                    dashboard_metric(
                        "5xx responses",
                        &error_count.to_string(),
                        "Recent upstream and proxy failures observed from Caddy access logs",
                        if error_count > 0 { "blocked" } else { "active" },
                    ),
                    dashboard_metric(
                        "P95 latency",
                        &format!("{p95_latency}ms"),
                        "Recent request latency percentile derived from structured access logs",
                        if p95_latency > 800 { "review" } else { "active" },
                    ),
                ],
                recent_events: map_recent_events(&recent),
                actions: vec![
                    action_item("Protect admin", "Require auth context and strict anonymous guardrails on privileged routes.", "Open rules"),
                    action_item("Publish ready rules", "Only reviewed rules move from shadow or review into active enforcement.", "Open approvals"),
                ],
            },
        })
    }

    async fn events(&self) -> Result<ConsoleResponse<EventsOverviewDto>> {
        let events = self.store.recent_events(12).await?;
        let observations = self.store.recent_http_observations(40).await?;
        let auth_linked = events.iter().filter(|entry| entry.subject_id.is_some()).count();
        let not_found = observations.iter().filter(|entry| entry.status_code == 404).count();
        let server_errors = observations.iter().filter(|entry| entry.status_code >= 500).count();
        let avg_latency = average_latency(&observations).unwrap_or(0);

        Ok(ConsoleResponse {
            data: EventsOverviewDto {
                metrics: vec![
                    metric("Stored events", &events.len().to_string(), "Recent ingress decisions persisted in SQLite"),
                    metric("404 responses", &not_found.to_string(), "Recent requests that reached an application or Caddy route miss"),
                    metric("Avg latency", &format!("{avg_latency}ms"), "Average request duration derived from structured Caddy logs"),
                    metric("5xx responses", &server_errors.to_string(), "Recent upstream failures and internal server errors"),
                    metric("Auth-linked", &format!("{auth_linked}"), "Events with TinyAuth subject context"),
                    metric("Anonymous", &format!("{}", events.len().saturating_sub(auth_linked)), "Events without authenticated subject context"),
                ],
                filters: vec![
                    filter("Gateway: caddy", "gateway:caddy"),
                    filter("Mode: mixed", "mode:mixed"),
                    filter("Source: live", "source:live"),
                    filter("Response: observed", "response:observed"),
                ],
                stream: map_recent_events_with_observations(&events, &observations),
                details: vec![
                    detail("Persistence", "SeaORM + SQLite", "Event stream now prefers real stored security events instead of static-only placeholders."),
                    detail("Decision posture", "Advisory first", "The product still defaults to reviewable signals before stronger enforcement."),
                    detail("HTTP observability", "Caddy JSON log", "Status codes and latency are ingested from structured access logs and correlated by request id when available."),
                ],
            },
        })
    }

    async fn rules(&self) -> Result<ConsoleResponse<RulesOverviewDto>> {
        let rules = self.store.list_policy_rules().await?;
        let active_rules = rules
            .iter()
            .filter(|rule| rule.status.eq_ignore_ascii_case("active"))
            .count();
        let review_rules = rules
            .iter()
            .filter(|rule| rule.status.eq_ignore_ascii_case("review"))
            .count();
        let auth_aware = rules
            .iter()
            .filter(|rule| rule.scope.to_ascii_lowercase().contains("subject"))
            .count();
        let ai_rules = rules
            .iter()
            .filter(|rule| rule.source.eq_ignore_ascii_case("approved-ai"))
            .count();

        Ok(ConsoleResponse {
            data: RulesOverviewDto {
                metrics: vec![
                    metric("Active rules", &active_rules.to_string(), "Live persisted rules inside the deterministic policy store"),
                    metric("In review", &review_rules.to_string(), "Rules waiting for explicit operator publication"),
                    metric("Auth-aware", &auth_aware.to_string(), "Subject-based controls enabled"),
                ],
                filters: vec![
                    filter("Source: live db", "source:live_db"),
                    filter("Gateway: caddy", "gateway:caddy"),
                    filter("Scope: mixed", "scope:mixed"),
                ],
                rules: map_rules(&rules),
                details: vec![
                    detail("Gateway strategy", "Caddy first", "The shared traits keep room for Nginx and Traefik later."),
                    detail("Approval model", "Human in the loop", "AI suggestions are translated into explicit rules before activation."),
                    detail("AI source", &ai_rules.to_string(), "Approved AI rules are persisted as ordinary inventory entries after review."),
                ],
            },
        })
    }

    async fn suggestions(&self) -> Result<ConsoleResponse<SuggestionsOverviewDto>> {
        let events = self.store.recent_events(50).await?;
        let rules = self.store.list_policy_rules().await?;
        let anonymous_bursts = events
            .iter()
            .filter(|entry| entry.reason == "rate_limit.exceeded" && entry.subject_id.is_none())
            .count();
        let admin_shadows = events
            .iter()
            .filter(|entry| entry.reason == "auth.required_for_admin")
            .count();
        let pending_rules = rules
            .iter()
            .filter(|rule| rule.status.eq_ignore_ascii_case("review"))
            .count();

        let mut suggestions = Vec::new();
        if anonymous_bursts > 0 {
            suggestions.push(SuggestionItemDto {
                title: "Escalate anonymous login limiter".to_string(),
                summary: format!(
                    "{anonymous_bursts} recent anonymous rate-limit hits on /api/login suggest tightening thresholds before broader exposure."
                ),
                badge: "Evidence".to_string(),
                primary_action: "Open approvals".to_string(),
                secondary_action: "Later".to_string(),
            });
        }
        if admin_shadows > 0 {
            suggestions.push(SuggestionItemDto {
                title: "Promote admin auth rule".to_string(),
                summary: format!(
                    "{admin_shadows} recent unauthenticated /admin decisions are still landing in shadow mode and can be promoted after review."
                ),
                badge: "Review".to_string(),
                primary_action: "Open approvals".to_string(),
                secondary_action: "Hold".to_string(),
            });
        }
        if suggestions.is_empty() {
            suggestions.push(SuggestionItemDto {
                title: "No new advisory spikes".to_string(),
                summary: "Recent traffic is quiet enough that the queue is currently fed by the persisted review inventory.".to_string(),
                badge: "Calm".to_string(),
                primary_action: "Open approvals".to_string(),
                secondary_action: "Later".to_string(),
            });
        }

        Ok(ConsoleResponse {
            data: SuggestionsOverviewDto {
                metrics: vec![
                    metric("Pending suggestions", &suggestions.len().to_string(), "Candidate rules waiting for review"),
                    metric("Shadow admin hits", &admin_shadows.to_string(), "Unauthenticated admin requests still surfacing as review signals"),
                    metric("Review inventory", &pending_rules.to_string(), "Persisted review rules that still need operator action"),
                ],
                filters: vec![
                    filter("Source: live events", "source:live_events"),
                    filter("Approval: required", "approval:required"),
                    filter("Mode: advisory", "mode:advisory"),
                ],
                suggestions,
                details: vec![
                    detail("LLM role", "Explanation only", "Inference output stays on the recommendation side of the boundary."),
                    detail("Publishing gate", "Manual approval", "No suggestion becomes real enforcement without an explicit approval request."),
                ],
            },
        })
    }

    async fn approvals(&self) -> Result<ConsoleResponse<ApprovalsOverviewDto>> {
        let rules = self.store.list_policy_rules().await?;
        let review_rules: Vec<_> = rules
            .iter()
            .filter(|rule| rule.status.eq_ignore_ascii_case("review"))
            .cloned()
            .collect();
        let blocked_rules = rules
            .iter()
            .filter(|rule| rule.status.eq_ignore_ascii_case("blocked"))
            .count();
        let published_today = rules
            .iter()
            .filter(|rule| rule.approved_by.is_some())
            .count();

        Ok(ConsoleResponse {
            data: ApprovalsOverviewDto {
                metrics: vec![
                    metric("Ready now", &review_rules.len().to_string(), "Rules that already have a deterministic translation"),
                    metric("Blocked", &blocked_rules.to_string(), "Rules explicitly pushed back for revision"),
                    metric("Published", &published_today.to_string(), "Rules already moved into the active inventory"),
                ],
                filters: vec![
                    filter("Owner: operator", "owner:operator"),
                    filter("State: pending", "state:pending"),
                    filter("Target: caddy", "target:caddy"),
                ],
                approvals: review_rules
                    .iter()
                    .map(|rule| ApprovalItemDto {
                        name: rule.name.clone(),
                        summary: rule.summary.clone(),
                        badge: "Ready".to_string(),
                        primary_action: "Approve".to_string(),
                        secondary_action: "Request revision".to_string(),
                    })
                    .collect(),
                details: vec![
                    detail("Review goal", "Minimize blast radius", "Rules should be narrow enough that approval is a real decision, not a guess."),
                    detail("OSS posture", "Live approval", "The approval lane now persists decisions in SQLite instead of remaining display-only."),
                ],
            },
        })
    }

    async fn settings(&self) -> Result<ConsoleResponse<SettingsOverviewDto>> {
        let settings = self
            .runtime_settings
            .read()
            .expect("runtime settings lock poisoned")
            .clone();
        Ok(ConsoleResponse {
            data: SettingsOverviewDto {
                metrics: vec![
                    metric("Header mappings", "5", "Canonical auth mapping is enabled"),
                    metric("Policy presets", "3", "Admin, login, API"),
                    metric("Locales", "2", "en + zh-CN"),
                ],
                filters: vec![
                    filter("Gateway: caddy", "gateway:caddy"),
                    filter("Auth preset: live headers", "auth:live_headers"),
                    filter("Data source: sqlite", "data:sqlite"),
                ],
                settings: settings.as_settings_dto(),
                details: vec![
                    detail(
                        "Identity preset",
                        &self.config.identity.provider_hint,
                        "Gatewarden trusts external identity context and maps it into the canonical subject model.",
                    ),
                    detail(
                        "Header mapping",
                        &format!(
                            "{} / {} / {}",
                            settings.subject_header,
                            settings.email_header,
                            self.config.identity.trusted_headers.groups
                        ),
                        "Trusted headers are now loaded from persisted console settings and applied by the runtime adapter.",
                    ),
                ],
            },
        })
    }
}

fn map_rules(rules: &[PolicyRuleState]) -> Vec<RuleRowDto> {
    rules
        .iter()
        .map(|rule| RuleRowDto {
            name: rule.name.clone(),
            summary: rule.summary.clone(),
            scope: rule.scope.clone(),
            status: rule.status.clone(),
            mode: rule.mode.clone(),
        })
        .collect()
}

fn map_recent_events(entries: &[security_events::Model]) -> Vec<EventItemDto> {
    if entries.is_empty() {
        return vec![event_item(
            "No security events yet",
            "Run traffic through /api/forward-auth to populate the event stream.",
            "info",
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
        )];
    }

    entries
        .iter()
        .map(|entry| {
            let subtitle = match &entry.subject_id {
                Some(subject) => format!("{} {} from {} as {}", entry.method, entry.path, entry.client_ip, subject),
                None => format!("{} {} from {}", entry.method, entry.path, entry.client_ip),
            };
            event_item(
                &format!("{} [{}]", entry.reason, entry.action),
                &subtitle,
                &entry.action,
                Some(entry.host.clone()),
                entry.subject_id.clone(),
                entry.user_agent.clone(),
                None,
                None,
                None,
                None,
                None,
                None,
                None,
                None,
                None,
                None,
                None,
                None,
                None,
                None,
                Some(entry.request_id.clone()),
            )
        })
        .collect()
}

fn map_recent_events_with_observations(
    entries: &[security_events::Model],
    observations: &[HttpObservationState],
) -> Vec<EventItemDto> {
    if entries.is_empty() && observations.is_empty() {
        return vec![event_item(
            "No security events yet",
            "Run traffic through /api/forward-auth to populate the event stream.",
            "info",
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
        )];
    }

    let mut combined = Vec::new();
    for entry in entries {
        let observation = find_matching_observation(entry, observations);
        let subtitle = match (&entry.subject_id, observation) {
            (Some(subject), Some(item)) => format!(
                "{} {} from {} as {} · {}ms · {}",
                entry.method, entry.path, entry.client_ip, subject, item.duration_ms, item.status_code
            ),
            (Some(subject), None) => format!("{} {} from {} as {}", entry.method, entry.path, entry.client_ip, subject),
            (None, Some(item)) => format!(
                "{} {} from {} · {}ms · {}",
                entry.method, entry.path, entry.client_ip, item.duration_ms, item.status_code
            ),
            (None, None) => format!("{} {} from {}", entry.method, entry.path, entry.client_ip),
        };
        combined.push(event_item(
            &format!("{} [{}]", entry.reason, entry.action),
            &subtitle,
            observation
                .map(|item| severity_for_status(item.status_code))
                .unwrap_or(&entry.action),
            Some(entry.host.clone()),
            entry.subject_id.clone(),
            observation
                .and_then(|item| item.user_agent.clone())
                .or_else(|| entry.user_agent.clone()),
            observation.and_then(|item| item.country.clone()),
            observation.and_then(|item| item.country_code.clone()),
            observation.and_then(|item| item.region.clone()),
            observation.and_then(|item| item.city.clone()),
            observation.and_then(|item| item.timezone.clone()),
            observation.and_then(|item| item.asn.clone()),
            observation.and_then(|item| item.asn_org.clone()),
            observation.and_then(|item| item.isp.clone()),
            observation.map(|item| item.is_proxy),
            observation.map(|item| item.is_vpn),
            observation.map(|item| item.is_tor),
            observation.map(|item| item.is_datacenter),
            observation.map(|item| item.status_code),
            observation.map(|item| item.duration_ms),
            Some(entry.request_id.clone()),
        ));
    }

    for observation in observations
        .iter()
        .filter(|item| match &item.request_id {
            Some(request_id) => !entries.iter().any(|entry| entry.request_id == *request_id),
            None => true,
        })
        .take(12)
    {
        let title = match observation.status_code {
            404 => "not_found [observe]".to_string(),
            500..=599 => format!(
                "{} [observe]",
                observation
                    .error_kind
                    .clone()
                    .unwrap_or_else(|| "upstream_error".to_string())
            ),
            _ => format!("http.{} [observe]", observation.status_code),
        };
        let subtitle = format!(
            "{} {} from {} · {}ms · {}",
            observation.method, observation.path, observation.client_ip, observation.duration_ms, observation.status_code
        );
        combined.push(event_item(
            &title,
            &subtitle,
            severity_for_status(observation.status_code),
            Some(observation.host.clone()),
            None,
            observation.user_agent.clone(),
            observation.country.clone(),
            observation.country_code.clone(),
            observation.region.clone(),
            observation.city.clone(),
            observation.timezone.clone(),
            observation.asn.clone(),
            observation.asn_org.clone(),
            observation.isp.clone(),
            Some(observation.is_proxy),
            Some(observation.is_vpn),
            Some(observation.is_tor),
            Some(observation.is_datacenter),
            Some(observation.status_code),
            Some(observation.duration_ms),
            observation.request_id.clone(),
        ));
    }

    combined
}

fn dashboard_metric(label: &str, value: &str, detail: &str, status: &str) -> DashboardMetricDto {
    DashboardMetricDto {
        label: label.to_string(),
        value: value.to_string(),
        detail: detail.to_string(),
        status: status.to_string(),
    }
}

fn metric(label: &str, value: &str, detail: &str) -> MetricDto {
    MetricDto {
        label: label.to_string(),
        value: value.to_string(),
        detail: detail.to_string(),
    }
}

fn filter(label: &str, value: &str) -> FilterChipDto {
    FilterChipDto {
        label: label.to_string(),
        value: value.to_string(),
    }
}

fn event_item(
    title: &str,
    subtitle: &str,
    severity: &str,
    host: Option<String>,
    subject: Option<String>,
    user_agent: Option<String>,
    country: Option<String>,
    country_code: Option<String>,
    region: Option<String>,
    city: Option<String>,
    timezone: Option<String>,
    asn: Option<String>,
    asn_org: Option<String>,
    isp: Option<String>,
    is_proxy: Option<bool>,
    is_vpn: Option<bool>,
    is_tor: Option<bool>,
    is_datacenter: Option<bool>,
    status_code: Option<i32>,
    response_time_ms: Option<i64>,
    request_id: Option<String>,
) -> EventItemDto {
    EventItemDto {
        title: title.to_string(),
        subtitle: subtitle.to_string(),
        severity: severity.to_string(),
        host,
        subject,
        user_agent,
        country,
        country_code,
        region,
        city,
        timezone,
        asn,
        asn_org,
        isp,
        is_proxy,
        is_vpn,
        is_tor,
        is_datacenter,
        status_code,
        response_time_ms,
        request_id,
    }
}

fn severity_for_status(status_code: i32) -> &'static str {
    match status_code {
        500..=599 => "deny",
        400..=499 => "review",
        _ => "allow",
    }
}

fn average_latency(observations: &[HttpObservationState]) -> Option<i64> {
    if observations.is_empty() {
        return None;
    }
    Some(observations.iter().map(|item| item.duration_ms).sum::<i64>() / observations.len() as i64)
}

fn percentile_latency(observations: &[HttpObservationState], percentile: usize) -> Option<i64> {
    if observations.is_empty() {
        return None;
    }
    let mut values: Vec<i64> = observations.iter().map(|item| item.duration_ms).collect();
    values.sort_unstable();
    let index = ((values.len() - 1) * percentile) / 100;
    values.get(index).copied()
}

fn find_matching_observation<'a>(
    entry: &security_events::Model,
    observations: &'a [HttpObservationState],
) -> Option<&'a HttpObservationState> {
    observations
        .iter()
        .find(|item| {
            item.request_id
                .as_ref()
                .map(|request_id| request_id == &entry.request_id)
                .unwrap_or(false)
        })
        .or_else(|| {
            observations.iter().find(|item| {
                item.host == entry.host
                    && item.client_ip == entry.client_ip
                    && item.method.eq_ignore_ascii_case(&entry.method)
                    && normalize_observation_path(&item.path) == entry.path
                    && item
                        .created_at
                        .signed_duration_since(entry.created_at)
                        .num_seconds()
                        .abs()
                        <= 5
            })
        })
}

fn normalize_observation_path(path: &str) -> &str {
    path.split('?').next().unwrap_or(path)
}

fn action_item(title: &str, description: &str, cta: &str) -> ActionItemDto {
    ActionItemDto {
        title: title.to_string(),
        description: description.to_string(),
        cta: cta.to_string(),
    }
}

fn detail(label: &str, value: &str, description: &str) -> DetailItemDto {
    DetailItemDto {
        label: label.to_string(),
        value: value.to_string(),
        description: description.to_string(),
    }
}
