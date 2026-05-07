use serde::{Deserialize, Serialize};

pub mod routes {
    pub const DASHBOARD: &str = "/api/console/dashboard";
    pub const EVENTS: &str = "/api/console/events";
    pub const RULES: &str = "/api/console/rules";
    pub const SUGGESTIONS: &str = "/api/console/suggestions";
    pub const AI_EXPLAIN: &str = "/api/console/events/explain";
    pub const APPROVALS: &str = "/api/console/approvals";
    pub const SETTINGS: &str = "/api/console/settings";
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsoleResponse<T> {
    pub data: T,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilterChipDto {
    pub label: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetailItemDto {
    pub label: String,
    pub value: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MetricDto {
    pub label: String,
    pub value: String,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventItemDto {
    pub title: String,
    pub subtitle: String,
    pub severity: String,
    pub host: Option<String>,
    pub host_status: Option<String>,
    pub subject: Option<String>,
    pub user_agent: Option<String>,
    pub country: Option<String>,
    pub country_code: Option<String>,
    pub region: Option<String>,
    pub city: Option<String>,
    pub timezone: Option<String>,
    pub asn: Option<String>,
    pub asn_org: Option<String>,
    pub isp: Option<String>,
    pub is_proxy: Option<bool>,
    pub is_vpn: Option<bool>,
    pub is_tor: Option<bool>,
    pub is_datacenter: Option<bool>,
    pub status_code: Option<i32>,
    pub response_time_ms: Option<i64>,
    pub request_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionItemDto {
    pub title: String,
    pub description: String,
    pub cta: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuleRowDto {
    pub name: String,
    pub summary: String,
    pub scope: String,
    pub status: String,
    pub mode: String,
    pub kind: String,
    pub host: Option<String>,
    pub path_prefix: Option<String>,
    pub rps: Option<u32>,
    pub burst: Option<u32>,
    #[serde(default)]
    pub admin_prefixes: Vec<String>,
    pub source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SuggestionItemDto {
    pub id: String,
    pub title: String,
    pub summary: String,
    pub badge: String,
    pub confidence: Option<String>,
    pub evidence: Vec<String>,
    pub proposed_rule: Option<String>,
    pub model: Option<String>,
    pub generated_at: Option<String>,
    pub primary_action: String,
    pub secondary_action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiExplanationDto {
    pub request_id: Option<String>,
    pub title: String,
    pub summary: String,
    pub risk: String,
    pub confidence: String,
    pub evidence: Vec<String>,
    pub next_steps: Vec<String>,
    pub model: Option<String>,
    pub generated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovalItemDto {
    pub name: String,
    pub summary: String,
    pub badge: String,
    pub primary_action: String,
    pub secondary_action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsStateDto {
    pub subject_header: String,
    pub email_header: String,
    pub locale: String,
    pub notes: String,
    pub shadow_mode_enabled: bool,
    pub raw_yaml: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfigDto {
    pub server: ServerConfigDto,
    pub database: DatabaseConfigDto,
    pub identity: IdentityConfigDto,
    pub security: SecurityConfigDto,
    pub ai: AiConfigDto,
    pub observability: ObservabilityConfigDto,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerConfigDto {
    pub listen_addr: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseConfigDto {
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IdentityConfigDto {
    pub mode: String,
    pub provider_hint: String,
    pub trusted_headers: TrustedHeadersConfigDto,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrustedHeadersConfigDto {
    pub authenticated: String,
    pub subject: String,
    pub email: String,
    pub groups: String,
    pub provider: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecurityConfigDto {
    pub admin_shadow_prefixes: Vec<String>,
    pub login_ip_limit: RateLimitConfigDto,
    pub login_user_limit: RateLimitConfigDto,
    pub console_admin_groups: Vec<String>,
    pub protected_hosts: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RateLimitConfigDto {
    pub rule_id: String,
    pub path_prefix: String,
    pub rps: u32,
    pub burst: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiConfigDto {
    pub enabled: bool,
    pub provider: String,
    pub model: String,
    pub api_key_env: String,
    pub base_url: Option<String>,
    pub timeout_ms: u64,
    pub system_prompt: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ObservabilityConfigDto {
    pub caddy_access_log: CaddyAccessLogConfigDto,
    pub geoip: GeoIpConfigDto,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaddyAccessLogConfigDto {
    pub enabled: bool,
    pub path: String,
    pub poll_interval_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeoIpConfigDto {
    pub enabled: bool,
    pub database_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardOverviewDto {
    pub metrics: Vec<DashboardMetricDto>,
    pub recent_events: Vec<EventItemDto>,
    pub actions: Vec<ActionItemDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardMetricDto {
    pub label: String,
    pub value: String,
    pub detail: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventsOverviewDto {
    pub metrics: Vec<MetricDto>,
    pub filters: Vec<FilterChipDto>,
    pub stream: Vec<EventItemDto>,
    pub details: Vec<DetailItemDto>,
    #[serde(default)]
    pub protected_hosts: Vec<String>,
    #[serde(default)]
    pub observed_hosts: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RulesOverviewDto {
    pub metrics: Vec<MetricDto>,
    pub filters: Vec<FilterChipDto>,
    pub rules: Vec<RuleRowDto>,
    pub details: Vec<DetailItemDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SuggestionsOverviewDto {
    pub metrics: Vec<MetricDto>,
    pub filters: Vec<FilterChipDto>,
    pub suggestions: Vec<SuggestionItemDto>,
    pub details: Vec<DetailItemDto>,
    pub ai_enabled: bool,
    pub ai_provider: Option<String>,
    pub ai_model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovalsOverviewDto {
    pub metrics: Vec<MetricDto>,
    pub filters: Vec<FilterChipDto>,
    pub approvals: Vec<ApprovalItemDto>,
    pub details: Vec<DetailItemDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsOverviewDto {
    pub metrics: Vec<MetricDto>,
    pub filters: Vec<FilterChipDto>,
    pub settings: SettingsStateDto,
    pub config: AppConfigDto,
    pub details: Vec<DetailItemDto>,
    pub config_details: Vec<DetailItemDto>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsoleListQuery {
    pub search: Option<String>,
    pub status: Option<String>,
    pub scope: Option<String>,
    pub mode: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovalRequest {
    pub rule_id: String,
    pub approved_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplainEventRequest {
    pub request_id: Option<String>,
    pub host: Option<String>,
    pub path: String,
    pub method: String,
    pub status_code: Option<i32>,
    pub response_time_ms: Option<i64>,
    pub client_ip: String,
    pub user_agent: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertPolicyRuleRequest {
    pub name: Option<String>,
    pub kind: String,
    pub summary: Option<String>,
    pub mode: String,
    pub host: Option<String>,
    pub path_prefix: Option<String>,
    pub rps: Option<u32>,
    pub burst: Option<u32>,
    #[serde(default)]
    pub admin_prefixes: Vec<String>,
    pub status: Option<String>,
    pub source: Option<String>,
}
