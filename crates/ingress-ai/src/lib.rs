use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiSuggestion {
    pub title: String,
    pub summary: String,
    pub badge: String,
    pub confidence: String,
    pub evidence: Vec<String>,
    pub proposed_rule: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiExplanation {
    pub title: String,
    pub summary: String,
    pub risk: String,
    pub confidence: String,
    pub evidence: Vec<String>,
    pub next_steps: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuggestionGenerationInput {
    pub protected_hosts: Vec<String>,
    pub active_rules: Vec<String>,
    pub review_rules: Vec<String>,
    pub recent_events: Vec<AiEventContext>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExplainEventInput {
    pub event: AiEventContext,
    pub protected_hosts: Vec<String>,
    pub active_rules: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiEventContext {
    pub request_id: Option<String>,
    pub host: Option<String>,
    pub path: String,
    pub method: String,
    pub client_ip: String,
    pub subject: Option<String>,
    pub status_code: Option<i32>,
    pub response_time_ms: Option<i64>,
    pub user_agent: Option<String>,
    pub reason: Option<String>,
    pub country: Option<String>,
    pub asn_org: Option<String>,
}
