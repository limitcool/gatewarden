use chrono::{DateTime, Utc};
use http::{HeaderMap, Method};
use serde::{Deserialize, Serialize};
use std::net::IpAddr;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum GatewayKind {
    Caddy,
    Nginx,
    Traefik,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GatewayMetadata {
    pub kind: GatewayKind,
    pub adapter_version: String,
    pub raw_forwarded_for: Option<String>,
}

impl GatewayMetadata {
    pub fn new(kind: GatewayKind, adapter_version: impl Into<String>) -> Self {
        Self {
            kind,
            adapter_version: adapter_version.into(),
            raw_forwarded_for: None,
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AuthContext {
    pub is_authenticated: bool,
    pub subject_id: Option<String>,
    pub email: Option<String>,
    pub groups: Vec<String>,
    pub provider: Option<String>,
}

#[derive(Debug, Clone)]
pub struct RequestContext {
    pub request_id: String,
    pub received_at: DateTime<Utc>,
    pub method: Method,
    pub path: String,
    pub normalized_path: String,
    pub query: Option<String>,
    pub headers: HeaderMap,
    pub client_ip: IpAddr,
    pub scheme: String,
    pub host: String,
    pub user_agent: Option<String>,
    pub auth: AuthContext,
    pub gateway: GatewayKind,
}

pub type CanonicalRequestContext = RequestContext;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DecisionAction {
    Allow,
    Block,
    RateLimit,
    Shadow,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RateLimitStatus {
    pub remaining: u32,
    pub reset_at_unix: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Decision {
    pub action: DecisionAction,
    pub reason_codes: Vec<String>,
    pub matched_rule_ids: Vec<String>,
    pub rate_limit_status: Option<RateLimitStatus>,
}

impl Decision {
    pub fn allow(reason: impl Into<String>) -> Self {
        Self {
            action: DecisionAction::Allow,
            reason_codes: vec![reason.into()],
            matched_rule_ids: Vec::new(),
            rate_limit_status: None,
        }
    }

    pub fn block(reason: impl Into<String>, rule_id: impl Into<String>) -> Self {
        Self {
            action: DecisionAction::Block,
            reason_codes: vec![reason.into()],
            matched_rule_ids: vec![rule_id.into()],
            rate_limit_status: None,
        }
    }

    pub fn shadow(reason: impl Into<String>, rule_id: impl Into<String>) -> Self {
        Self {
            action: DecisionAction::Shadow,
            reason_codes: vec![reason.into()],
            matched_rule_ids: vec![rule_id.into()],
            rate_limit_status: None,
        }
    }

    pub fn rate_limit(
        reason: impl Into<String>,
        rule_id: impl Into<String>,
        remaining: u32,
        reset_at_unix: i64,
    ) -> Self {
        Self {
            action: DecisionAction::RateLimit,
            reason_codes: vec![reason.into()],
            matched_rule_ids: vec![rule_id.into()],
            rate_limit_status: Some(RateLimitStatus {
                remaining,
                reset_at_unix,
            }),
        }
    }
}
