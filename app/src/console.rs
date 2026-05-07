use crate::{ai::AiService, config::AppConfig, entities::security_events, store::Store};
use anyhow::Result;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use ingress_api::{
    ActionItemDto, ApprovalItemDto, ApprovalsOverviewDto, ConsoleResponse, DashboardMetricDto,
    DashboardOverviewDto, DetailItemDto, EventItemDto, EventsOverviewDto, ExplainEventRequest,
    FilterChipDto, MetricDto, RuleRowDto, RulesOverviewDto, SettingsOverviewDto,
    SettingsStateDto, SuggestionItemDto, SuggestionsOverviewDto, AiExplanationDto, AppConfigDto,
    ServerConfigDto, DatabaseConfigDto, IdentityConfigDto, TrustedHeadersConfigDto,
    SecurityConfigDto, RateLimitConfigDto, AiConfigDto, ObservabilityConfigDto,
    CaddyAccessLogConfigDto, GeoIpConfigDto,
};
use ingress_ai::{AiEventContext, ExplainEventInput, SuggestionGenerationInput};
use std::{
    collections::{BTreeSet, HashSet},
    sync::{Arc, RwLock},
};

#[derive(Debug, Clone)]
pub struct ConsoleSettingsState {
    pub subject_header: String,
    pub email_header: String,
    pub locale: String,
    pub notes: String,
    pub shadow_mode_enabled: bool,
    pub raw_yaml: String,
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
            raw_yaml: crate::config::AppConfig::read_raw().unwrap_or_default(),
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
            raw_yaml: self.raw_yaml.clone(),
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

#[allow(dead_code)]
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

    pub async fn refresh_ai_suggestions(
        &self,
        ai: Arc<AiService>,
    ) -> Result<ConsoleResponse<SuggestionsOverviewDto>> {
        if !ai.is_enabled() {
            return self.suggestions().await;
        }

        let events = self.store.recent_events(24).await?;
        let observations = self.store.recent_http_observations(24).await?;
        let rules = self.store.list_policy_rules().await?;
        let payload = SuggestionGenerationInput {
            protected_hosts: self.config.security.protected_hosts.clone(),
            active_rules: rules
                .iter()
                .filter(|rule| rule.status.eq_ignore_ascii_case("active"))
                .map(|rule| format!("{}: {}", rule.name, rule.summary))
                .collect(),
            review_rules: rules
                .iter()
                .filter(|rule| rule.status.eq_ignore_ascii_case("review"))
                .map(|rule| format!("{}: {}", rule.name, rule.summary))
                .collect(),
            recent_events: build_ai_event_contexts(&events, &observations),
        };

        let suggestions = ai.generate_suggestions(&payload).await?;
        self.store
            .replace_ai_suggestions(&suggestions, ai.provider(), ai.model())
            .await?;
        self.suggestions().await
    }

    pub async fn explain_event(
        &self,
        ai: Arc<AiService>,
        request: ExplainEventRequest,
    ) -> Result<ConsoleResponse<AiExplanationDto>> {
        if let Some(request_id) = request.request_id.as_deref() {
            if let Some(cached) = self.store.get_ai_event_explanation(request_id).await? {
                return Ok(ConsoleResponse {
                    data: AiExplanationDto {
                        request_id: cached.request_id,
                        title: cached.title,
                        summary: cached.summary,
                        risk: cached.risk,
                        confidence: cached.confidence,
                        evidence: cached.evidence,
                        next_steps: cached.next_steps,
                        model: Some(format!("{}/{}", cached.provider, cached.model_name)),
                        generated_at: Some(cached.created_at.to_rfc3339()),
                    },
                });
            }
        }

        let rules = self.store.list_policy_rules().await?;
        let input = ExplainEventInput {
            event: AiEventContext {
                request_id: request.request_id.clone(),
                host: request.host.clone(),
                path: request.path,
                method: request.method,
                client_ip: request.client_ip,
                subject: None,
                status_code: request.status_code,
                response_time_ms: request.response_time_ms,
                user_agent: request.user_agent,
                reason: None,
                country: None,
                asn_org: None,
            },
            protected_hosts: self.config.security.protected_hosts.clone(),
            active_rules: rules
                .iter()
                .filter(|rule| rule.status.eq_ignore_ascii_case("active"))
                .map(|rule| format!("{}: {}", rule.name, rule.summary))
                .collect(),
        };
        let explanation = ai.explain_event(&input).await?;
        self.store
            .upsert_ai_event_explanation(
                request.request_id.as_deref(),
                &explanation,
                ai.provider(),
                ai.model(),
            )
            .await?;

        Ok(ConsoleResponse {
            data: AiExplanationDto {
                request_id: request.request_id,
                title: explanation.title,
                summary: explanation.summary,
                risk: explanation.risk,
                confidence: explanation.confidence,
                evidence: explanation.evidence,
                next_steps: explanation.next_steps,
                model: Some(format!("{}/{}", ai.provider(), ai.model())),
                generated_at: Some(Utc::now().to_rfc3339()),
            },
        })
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
        let protected_hosts = self.config.security.protected_hosts.clone();
        let protected_host_set = protected_host_set(&protected_hosts);
        let events = self
            .store
            .recent_events(12)
            .await?
            .into_iter()
            .filter(|entry| matches_protected_host(&entry.host, &protected_host_set))
            .collect::<Vec<_>>();
        let observations = self
            .store
            .recent_http_observations(40)
            .await?
            .into_iter()
            .filter(|entry| matches_protected_host(&entry.host, &protected_host_set))
            .collect::<Vec<_>>();
        let auth_linked = events.iter().filter(|entry| entry.subject_id.is_some()).count();
        let not_found = observations.iter().filter(|entry| entry.status_code == 404).count();
        let server_errors = observations.iter().filter(|entry| entry.status_code >= 500).count();
        let avg_latency = average_latency(&observations).unwrap_or(0);
        let observed_hosts = observed_host_list(&events, &observations);
        let protected_hosts_label = if protected_hosts.is_empty() {
            "all hosts".to_string()
        } else {
            protected_hosts.join(", ")
        };

        Ok(ConsoleResponse {
            data: EventsOverviewDto {
                metrics: vec![
                    metric("Stored events", &events.len().to_string(), "Recent ingress decisions persisted in the configured datastore"),
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
                stream: map_recent_events_with_observations(&events, &observations, &protected_host_set),
                details: vec![
                    detail("Persistence", "SeaORM + SQL", "Event stream now prefers real stored security events instead of static-only placeholders."),
                    detail("Decision posture", "Advisory first", "The product still defaults to reviewable signals before stronger enforcement."),
                    detail("HTTP observability", "Caddy JSON log", "Status codes and latency are ingested from structured access logs and correlated by request id when available."),
                    detail(
                        "Protected hosts",
                        &protected_hosts_label,
                        "This view defaults to hosts that are explicitly connected to Gatewarden forward auth.",
                    ),
                ],
                protected_hosts,
                observed_hosts,
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
        let rules = self.store.list_policy_rules().await?;
        let pending_rules = rules
            .iter()
            .filter(|rule| rule.status.eq_ignore_ascii_case("review"))
            .count();
        let persisted = self.store.list_ai_suggestions().await?;
        let suggestions = if persisted.is_empty() {
            vec![SuggestionItemDto {
                id: "suggestion-placeholder".to_string(),
                title: "No new advisory spikes".to_string(),
                summary: "Recent traffic is quiet enough that the queue is currently fed by the persisted review inventory.".to_string(),
                badge: "Calm".to_string(),
                confidence: Some("待生成".to_string()),
                evidence: vec!["当前还没有生成新的 AI 建议，可点击刷新建议进行分析。".to_string()],
                proposed_rule: None,
                model: None,
                generated_at: None,
                primary_action: "Open approvals".to_string(),
                secondary_action: "Later".to_string(),
            }]
        } else {
            persisted
                .into_iter()
                .map(|item| SuggestionItemDto {
                    id: item.suggestion_id,
                    title: item.title,
                    summary: item.summary,
                    badge: item.badge,
                    confidence: Some(item.confidence),
                    evidence: item.evidence,
                    proposed_rule: item.proposed_rule,
                    model: Some(format!("{}/{}", item.provider, item.model_name)),
                    generated_at: Some(item.created_at.to_rfc3339()),
                    primary_action: "Open approvals".to_string(),
                    secondary_action: "Later".to_string(),
                })
                .collect()
        };

        Ok(ConsoleResponse {
            data: SuggestionsOverviewDto {
                metrics: vec![
                    metric("Pending suggestions", &suggestions.len().to_string(), "Candidate rules waiting for review"),
                    metric("Shadow admin hits", &pending_rules.to_string(), "Unauthenticated admin requests still surfacing as review signals"),
                    metric("Review inventory", &pending_rules.to_string(), "Persisted review rules that still need operator action"),
                ],
                filters: vec![
                    filter("Source: ai advisory", "source:ai_advisory"),
                    filter("Approval: required", "approval:required"),
                    filter("Mode: advisory", "mode:advisory"),
                ],
                suggestions,
                details: vec![
                    detail("LLM role", "Advisory analysis", "Inference output stays on the recommendation side of the boundary."),
                    detail("Publishing gate", "Manual approval", "No suggestion becomes real enforcement without an explicit approval request."),
                ],
                ai_enabled: self.config.ai.enabled,
                ai_provider: self.config.ai.enabled.then(|| self.config.ai.provider.clone()),
                ai_model: self.config.ai.enabled.then(|| self.config.ai.model.clone()),
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
                    detail("OSS posture", "Live approval", "The approval lane now persists decisions in the configured datastore instead of remaining display-only."),
                ],
            },
        })
    }

    async fn settings(&self) -> Result<ConsoleResponse<SettingsOverviewDto>> {
        let mut settings = self
            .runtime_settings
            .read()
            .expect("runtime settings lock poisoned")
            .clone();
        if let Ok(raw_yaml) = crate::config::AppConfig::read_raw() {
            settings.raw_yaml = raw_yaml;
        }
        let config_snapshot = crate::config::AppConfig::parse_raw(&settings.raw_yaml)
            .unwrap_or_else(|_| self.config.as_ref().clone());
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
                    filter("Data source: sql", "data:sql"),
                ],
                settings: settings.as_settings_dto(),
                config: map_app_config(&config_snapshot),
                details: vec![
                    detail(
                        "Identity preset",
                        &config_snapshot.identity.provider_hint,
                        "Gatewarden trusts external identity context and maps it into the canonical subject model.",
                    ),
                    detail(
                        "Header mapping",
                        &format!(
                            "{} / {} / {}",
                            settings.subject_header,
                            settings.email_header,
                            config_snapshot.identity.trusted_headers.groups
                        ),
                        "Trusted headers are now loaded from persisted console settings and applied by the runtime adapter.",
                    ),
                ],
                config_details: build_config_snapshot(&config_snapshot),
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
                Some("protected".to_string()),
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
    protected_hosts: &HashSet<String>,
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
            Some(host_status(&entry.host, protected_hosts).to_string()),
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
            Some(host_status(&observation.host, protected_hosts).to_string()),
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
    host_status: Option<String>,
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
        host_status,
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

fn protected_host_set(hosts: &[String]) -> HashSet<String> {
    hosts
        .iter()
        .map(|host| host.trim().to_ascii_lowercase())
        .filter(|host| !host.is_empty())
        .collect()
}

fn matches_protected_host(host: &str, protected_hosts: &HashSet<String>) -> bool {
    if protected_hosts.is_empty() {
        return true;
    }

    protected_hosts.contains(&host.trim().to_ascii_lowercase())
}

fn host_status(host: &str, protected_hosts: &HashSet<String>) -> &'static str {
    if protected_hosts.is_empty() {
        return "protected";
    }

    if protected_hosts.contains(&host.trim().to_ascii_lowercase()) {
        "protected"
    } else {
        "unprotected"
    }
}

fn observed_host_list(
    events: &[security_events::Model],
    observations: &[HttpObservationState],
) -> Vec<String> {
    let mut hosts = BTreeSet::new();

    for host in events.iter().map(|entry| entry.host.trim()).filter(|host| !host.is_empty()) {
        hosts.insert(host.to_string());
    }

    for host in observations
        .iter()
        .map(|entry| entry.host.trim())
        .filter(|host| !host.is_empty())
    {
        hosts.insert(host.to_string());
    }

    hosts.into_iter().collect()
}

fn build_ai_event_contexts(
    events: &[security_events::Model],
    observations: &[HttpObservationState],
) -> Vec<AiEventContext> {
    events
        .iter()
        .map(|entry| {
            let observation = find_matching_observation(entry, observations);
            AiEventContext {
                request_id: Some(entry.request_id.clone()),
                host: Some(entry.host.clone()),
                path: entry.path.clone(),
                method: entry.method.clone(),
                client_ip: entry.client_ip.clone(),
                subject: entry.subject_id.clone(),
                status_code: observation.map(|item| item.status_code),
                response_time_ms: observation.map(|item| item.duration_ms),
                user_agent: observation
                    .and_then(|item| item.user_agent.clone())
                    .or_else(|| entry.user_agent.clone()),
                reason: Some(entry.reason.clone()),
                country: observation.and_then(|item| item.country.clone()),
                asn_org: observation.and_then(|item| item.asn_org.clone()),
            }
        })
        .collect()
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

fn build_config_snapshot(config: &AppConfig) -> Vec<DetailItemDto> {
    let protected_hosts = if config.security.protected_hosts.is_empty() {
        "none".to_string()
    } else {
        config.security.protected_hosts.join(", ")
    };
    let admin_prefixes = if config.security.admin_shadow_prefixes.is_empty() {
        "none".to_string()
    } else {
        config.security.admin_shadow_prefixes.join(", ")
    };

    vec![
        detail("server.listen_addr", &config.server.listen_addr, "监听地址。"),
        detail("database.url", &mask_database_url(&config.database.url), "当前运行中的数据库连接串，已脱敏。"),
        detail("identity.mode", &config.identity.mode, "身份上下文接入模式。"),
        detail("identity.provider_hint", &config.identity.provider_hint, "上游身份提供方提示。"),
        detail("identity.trusted_headers.authenticated", &config.identity.trusted_headers.authenticated, "认证状态头。"),
        detail("identity.trusted_headers.subject", &config.identity.trusted_headers.subject, "主体标识头。"),
        detail("identity.trusted_headers.email", &config.identity.trusted_headers.email, "邮箱标识头。"),
        detail("identity.trusted_headers.groups", &config.identity.trusted_headers.groups, "用户组头。"),
        detail("identity.trusted_headers.provider", &config.identity.trusted_headers.provider, "上游 provider 头。"),
        detail("security.admin_shadow_prefixes", &admin_prefixes, "管理面保护路径前缀。"),
        detail("security.login_ip_limit", &format!("{} | rps={} | burst={}", config.security.login_ip_limit.path_prefix, config.security.login_ip_limit.rps, config.security.login_ip_limit.burst), "基于 IP 的登录限流规则。"),
        detail("security.login_user_limit", &format!("{} | rps={} | burst={}", config.security.login_user_limit.path_prefix, config.security.login_user_limit.rps, config.security.login_user_limit.burst), "基于主体的登录限流规则。"),
        detail("security.console_admin_groups", &config.security.console_admin_groups.join(", "), "允许访问控制台的管理组。"),
        detail("security.protected_hosts", &protected_hosts, "默认受 Gatewarden 保护的域名。"),
        detail("ai.enabled", if config.ai.enabled { "true" } else { "false" }, "是否启用 AI 建议与事件解释。"),
        detail("ai.provider", &config.ai.provider, "AI provider。"),
        detail("ai.model", &config.ai.model, "当前 AI 模型。"),
        detail("ai.api_key_env", &config.ai.api_key_env, "读取 AI API key 的环境变量名。"),
        detail("ai.base_url", config.ai.base_url.as_deref().unwrap_or("default"), "OpenAI-compatible endpoint base URL。"),
        detail("ai.timeout_ms", &config.ai.timeout_ms.to_string(), "AI 请求超时时间。"),
        detail("observability.caddy_access_log.enabled", if config.observability.caddy_access_log.enabled { "true" } else { "false" }, "是否读取 Caddy access log。"),
        detail("observability.caddy_access_log.path", &config.observability.caddy_access_log.path, "Caddy access log 路径。"),
        detail("observability.caddy_access_log.poll_interval_ms", &config.observability.caddy_access_log.poll_interval_ms.to_string(), "Caddy access log 轮询间隔。"),
        detail("observability.geoip.enabled", if config.observability.geoip.enabled { "true" } else { "false" }, "是否启用 MMDB GeoIP。"),
        detail("observability.geoip.database_path", &config.observability.geoip.database_path, "MMDB 路径。"),
    ]
}

fn map_app_config(config: &AppConfig) -> AppConfigDto {
    AppConfigDto {
        server: ServerConfigDto {
            listen_addr: config.server.listen_addr.clone(),
        },
        database: DatabaseConfigDto {
            url: config.database.url.clone(),
        },
        identity: IdentityConfigDto {
            mode: config.identity.mode.clone(),
            provider_hint: config.identity.provider_hint.clone(),
            trusted_headers: TrustedHeadersConfigDto {
                authenticated: config.identity.trusted_headers.authenticated.clone(),
                subject: config.identity.trusted_headers.subject.clone(),
                email: config.identity.trusted_headers.email.clone(),
                groups: config.identity.trusted_headers.groups.clone(),
                provider: config.identity.trusted_headers.provider.clone(),
            },
        },
        security: SecurityConfigDto {
            admin_shadow_prefixes: config.security.admin_shadow_prefixes.clone(),
            login_ip_limit: RateLimitConfigDto {
                rule_id: config.security.login_ip_limit.rule_id.clone(),
                path_prefix: config.security.login_ip_limit.path_prefix.clone(),
                rps: config.security.login_ip_limit.rps,
                burst: config.security.login_ip_limit.burst,
            },
            login_user_limit: RateLimitConfigDto {
                rule_id: config.security.login_user_limit.rule_id.clone(),
                path_prefix: config.security.login_user_limit.path_prefix.clone(),
                rps: config.security.login_user_limit.rps,
                burst: config.security.login_user_limit.burst,
            },
            console_admin_groups: config.security.console_admin_groups.clone(),
            protected_hosts: config.security.protected_hosts.clone(),
        },
        ai: AiConfigDto {
            enabled: config.ai.enabled,
            provider: config.ai.provider.clone(),
            model: config.ai.model.clone(),
            api_key_env: config.ai.api_key_env.clone(),
            base_url: config.ai.base_url.clone(),
            timeout_ms: config.ai.timeout_ms,
            system_prompt: config.ai.system_prompt.clone(),
        },
        observability: ObservabilityConfigDto {
            caddy_access_log: CaddyAccessLogConfigDto {
                enabled: config.observability.caddy_access_log.enabled,
                path: config.observability.caddy_access_log.path.clone(),
                poll_interval_ms: config.observability.caddy_access_log.poll_interval_ms,
            },
            geoip: GeoIpConfigDto {
                enabled: config.observability.geoip.enabled,
                database_path: config.observability.geoip.database_path.clone(),
            },
        },
    }
}

fn mask_database_url(value: &str) -> String {
    if let Some((prefix, tail)) = value.split_once("://") {
        if let Some((credentials, rest)) = tail.split_once('@') {
            if credentials.contains(':') {
                let username = credentials.split(':').next().unwrap_or("user");
                return format!("{prefix}://{username}:***@{rest}");
            }
        }
    }
    value.to_string()
}
