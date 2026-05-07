use crate::console::{ConsoleSettingsState, PolicyRuleState};
use crate::config::AppConfig;
use crate::store::{EventRecordInput, Store};
use chrono::Utc;
use http::{HeaderMap, HeaderValue, Method};
use ingress_caddy::{CaddyForwardAuthAdapter, TrustedHeaderConfig};
use ingress_core::{CanonicalRequestContext, Decision, RequestContext};
use ingress_gateway::{GatewayAdapter, GatewayInput, GatewayResponse};
use ingress_policy::PolicyEngine;
use ingress_rate_limit::{InMemoryRateLimiter, RateLimitDescriptor, RateLimitRule, RateLimitScope};
use anyhow::Result;
use std::{
    net::{IpAddr, Ipv4Addr},
    sync::{Arc, Mutex, RwLock},
};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct SecurityService {
    config: Arc<AppConfig>,
    store: Arc<Store>,
    runtime_settings: Arc<RwLock<ConsoleSettingsState>>,
}

impl SecurityService {
    pub fn new(
        store: Arc<Store>,
        config: Arc<AppConfig>,
        runtime_settings: Arc<RwLock<ConsoleSettingsState>>,
    ) -> Self {
        Self {
            config: config.clone(),
            store,
            runtime_settings,
        }
    }

    pub fn resolve_auth_context(&self, headers: &HeaderMap) -> ingress_core::AuthContext {
        self.adapter().resolve_auth(headers)
    }

    pub async fn evaluate_forward_auth(
        &self,
        method: Method,
        path: String,
        headers: HeaderMap,
        scheme: String,
        host: String,
        client_ip: IpAddr,
    ) -> anyhow::Result<GatewayResponse> {
        let adapter = self.adapter();
        let policy = self.load_policy().await?;
        let user_agent = extract_user_agent(&headers);
        let raw_request = RequestContext {
            request_id: Uuid::new_v4().to_string(),
            received_at: Utc::now(),
            method,
            normalized_path: normalize_path(&path),
            path,
            query: None,
            headers,
            client_ip,
            scheme,
            host,
            user_agent,
            auth: Default::default(),
            gateway: ingress_core::GatewayKind::Caddy,
        };

        let canonical = adapter.normalize_request(GatewayInput::Request(raw_request))?;
        let decision = policy.evaluate(&canonical);
        self.record_event(&canonical, &decision).await?;
        let mut response = adapter.to_gateway_response(&decision)?;
        self.attach_forwarded_identity_headers(&canonical, &mut response)?;
        Ok(response)
    }

    async fn record_event(
        &self,
        request: &CanonicalRequestContext,
        decision: &Decision,
    ) -> anyhow::Result<()> {
        let reason = decision
            .reason_codes
            .first()
            .cloned()
            .unwrap_or_else(|| "unknown".to_string());

        self.store
            .insert_event(EventRecordInput {
                request_id: request.request_id.clone(),
                action: format!("{:?}", decision.action).to_lowercase(),
                reason,
                path: request.normalized_path.clone(),
                method: request.method.to_string(),
                client_ip: request.client_ip.to_string(),
                subject_id: request.auth.subject_id.clone(),
                email: request.auth.email.clone(),
                host: request.host.clone(),
                user_agent: request.user_agent.clone(),
            })
            .await
    }

    fn adapter(&self) -> CaddyForwardAuthAdapter {
        let settings = self
            .runtime_settings
            .read()
            .expect("runtime settings lock poisoned");
        CaddyForwardAuthAdapter::with_trusted_headers(TrustedHeaderConfig {
            authenticated: self.config.identity.trusted_headers.authenticated.clone(),
            subject: settings.subject_header.clone(),
            email: settings.email_header.clone(),
            groups: self.config.identity.trusted_headers.groups.clone(),
            provider: self.config.identity.trusted_headers.provider.clone(),
        })
    }

    async fn load_policy(&self) -> Result<IngressPolicy> {
        let rules = self.store.list_policy_rules().await?;
        Ok(IngressPolicy::from_rules(
            rules,
            self.runtime_settings.clone(),
            self.config.as_ref(),
        ))
    }

    fn attach_forwarded_identity_headers(
        &self,
        request: &CanonicalRequestContext,
        response: &mut GatewayResponse,
    ) -> anyhow::Result<()> {
        if let Some(subject) = &request.auth.subject_id {
            response
                .headers
                .insert("Remote-User", HeaderValue::from_str(subject)?);
        }
        if let Some(email) = &request.auth.email {
            response
                .headers
                .insert("Remote-Email", HeaderValue::from_str(email)?);
        }
        if !request.auth.groups.is_empty() {
            response.headers.insert(
                "Remote-Groups",
                HeaderValue::from_str(&request.auth.groups.join(","))?,
            );
        }
        if let Some(provider) = &request.auth.provider {
            response
                .headers
                .insert("X-Auth-Provider", HeaderValue::from_str(provider)?);
        }
        response.headers.insert(
            "X-Authenticated",
            HeaderValue::from_static(if request.auth.is_authenticated { "true" } else { "false" }),
        );
        response.headers.insert(
            "X-Request-Id",
            HeaderValue::from_str(&request.request_id)?,
        );
        Ok(())
    }
}

#[derive(Debug)]
struct IngressPolicy {
    rate_limiter: Mutex<InMemoryRateLimiter>,
    rules: Vec<RuntimeRule>,
    runtime_settings: Arc<RwLock<ConsoleSettingsState>>,
}

#[derive(Debug, Clone)]
enum RuntimeRule {
    Admin {
        rule_id: String,
        host: Option<String>,
        prefixes: Vec<String>,
        mode: String,
    },
    RateLimit {
        host: Option<String>,
        mode: String,
        rule: RateLimitRule,
    },
}

impl Default for IngressPolicy {
    fn default() -> Self {
        Self {
            rate_limiter: Mutex::new(InMemoryRateLimiter::new()),
            rules: Vec::new(),
            runtime_settings: Arc::new(RwLock::new(ConsoleSettingsState {
                subject_header: "Remote-User".to_string(),
                email_header: "Remote-Email".to_string(),
                locale: "en".to_string(),
                notes: String::new(),
                shadow_mode_enabled: true,
                raw_yaml: String::new(),
                updated_by: None,
                updated_at: Utc::now(),
            })),
        }
    }
}

impl IngressPolicy {
    fn from_rules(
        rules: Vec<PolicyRuleState>,
        runtime_settings: Arc<RwLock<ConsoleSettingsState>>,
        config: &AppConfig,
    ) -> Self {
        let mut runtime_rules = Vec::new();

        for rule in rules.into_iter().filter(|rule| rule.status.eq_ignore_ascii_case("active")) {
            match rule.kind.as_str() {
                "admin-protect" => {
                    let prefixes = if rule.admin_prefixes.is_empty() {
                        config.security.admin_shadow_prefixes.clone()
                    } else {
                        rule.admin_prefixes.clone()
                    };
                    runtime_rules.push(RuntimeRule::Admin {
                        rule_id: rule.name,
                        host: rule.host,
                        prefixes,
                        mode: rule.mode,
                    });
                }
                "rate-limit-ip" => {
                    if let (Some(path_prefix), Some(rps), Some(burst)) =
                        (rule.path_prefix.clone(), rule.rps, rule.burst)
                    {
                        runtime_rules.push(RuntimeRule::RateLimit {
                            host: rule.host,
                            mode: rule.mode,
                            rule: RateLimitRule {
                                id: rule.name,
                                scope: RateLimitScope::Ip,
                                path_prefix,
                                rps,
                                burst,
                            },
                        });
                    }
                }
                "rate-limit-user" => {
                    if let (Some(path_prefix), Some(rps), Some(burst)) =
                        (rule.path_prefix.clone(), rule.rps, rule.burst)
                    {
                        runtime_rules.push(RuntimeRule::RateLimit {
                            host: rule.host,
                            mode: rule.mode,
                            rule: RateLimitRule {
                                id: rule.name,
                                scope: RateLimitScope::User,
                                path_prefix,
                                rps,
                                burst,
                            },
                        });
                    }
                }
                _ => {}
            }
        }

        Self {
            rate_limiter: Mutex::new(InMemoryRateLimiter::new()),
            rules: runtime_rules,
            runtime_settings,
        }
    }
}

impl PolicyEngine for IngressPolicy {
    fn evaluate(&self, request: &CanonicalRequestContext) -> Decision {
        let shadow_mode_enabled = self
            .runtime_settings
            .read()
            .expect("runtime settings lock poisoned")
            .shadow_mode_enabled;

        for rule in &self.rules {
            match rule {
                RuntimeRule::Admin {
                    rule_id,
                    host,
                    prefixes,
                    mode,
                } => {
                    if !host_matches(host.as_deref(), request.host.as_str()) {
                        continue;
                    }
                    if prefixes
                        .iter()
                        .any(|prefix| request.normalized_path.starts_with(prefix))
                        && !request.auth.is_authenticated
                    {
                        return match effective_mode(mode, shadow_mode_enabled) {
                            "shadow" => Decision::shadow("auth.required_for_admin", rule_id.clone()),
                            _ => Decision::block("auth.required_for_admin", rule_id.clone()),
                        };
                    }
                }
                RuntimeRule::RateLimit { host, mode, rule } => {
                    if !host_matches(host.as_deref(), request.host.as_str()) {
                        continue;
                    }
                    if rule.scope == RateLimitScope::User && !request.auth.is_authenticated {
                        continue;
                    }
                    if let Some(decision) = self.check_rate_limit(request, rule, mode, shadow_mode_enabled) {
                        return decision;
                    }
                }
            }
        }

        Decision::allow("policy.allow")
    }
}

impl IngressPolicy {
    fn check_rate_limit(
        &self,
        request: &CanonicalRequestContext,
        rule: &RateLimitRule,
        mode: &str,
        shadow_mode_enabled: bool,
    ) -> Option<Decision> {
        if !rule.matches(request) {
            return None;
        }

        let descriptor = RateLimitDescriptor::new(rule.key_for(request), rule.rps, rule.burst);
        let mut limiter = self
            .rate_limiter
            .lock()
            .expect("rate limiter mutex poisoned");
        let snapshot = limiter.check(&descriptor, request.received_at);

        if snapshot.exceeded {
            return Some(match effective_mode(mode, shadow_mode_enabled) {
                "shadow" => Decision::shadow("rate_limit.exceeded", rule.id.clone()),
                _ => Decision::rate_limit(
                    "rate_limit.exceeded",
                    rule.id.clone(),
                    snapshot.remaining,
                    snapshot.reset_at.timestamp(),
                ),
            });
        }

        None
    }
}

fn effective_mode(rule_mode: &str, shadow_mode_enabled: bool) -> &'static str {
    if rule_mode.eq_ignore_ascii_case("shadow") || shadow_mode_enabled {
        "shadow"
    } else {
        "enforce"
    }
}

fn host_matches(rule_host: Option<&str>, request_host: &str) -> bool {
    match rule_host.map(str::trim).filter(|value| !value.is_empty()) {
        Some(rule_host) => rule_host.eq_ignore_ascii_case(request_host),
        None => true,
    }
}

fn normalize_path(path: &str) -> String {
    match path.split_once('?') {
        Some((head, _)) => head.to_string(),
        None => path.to_string(),
    }
}

pub fn resolve_client_ip(headers: &HeaderMap) -> IpAddr {
    headers
        .get("x-forwarded-for")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(',').next())
        .map(str::trim)
        .and_then(|value| value.parse::<IpAddr>().ok())
        .unwrap_or(IpAddr::V4(Ipv4Addr::LOCALHOST))
}

fn extract_user_agent(headers: &HeaderMap) -> Option<String> {
    headers
        .get("user-agent")
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}
