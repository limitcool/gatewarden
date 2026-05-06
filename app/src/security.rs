use crate::console::ConsoleSettingsState;
use crate::config::AppConfig;
use crate::store::{EventRecordInput, Store};
use chrono::Utc;
use http::{HeaderMap, HeaderValue, Method};
use ingress_caddy::{CaddyForwardAuthAdapter, TrustedHeaderConfig};
use ingress_core::{CanonicalRequestContext, Decision, RequestContext};
use ingress_gateway::{GatewayAdapter, GatewayInput, GatewayResponse};
use ingress_policy::PolicyEngine;
use ingress_rate_limit::{InMemoryRateLimiter, RateLimitDescriptor, RateLimitRule, RateLimitScope};
use std::{
    net::{IpAddr, Ipv4Addr},
    sync::{Arc, Mutex, RwLock},
};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct SecurityService {
    config: Arc<AppConfig>,
    policy: Arc<IngressPolicy>,
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
            policy: Arc::new(IngressPolicy::from_config(config.as_ref(), runtime_settings.clone())),
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
        let decision = self.policy.evaluate(&canonical);
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
    admin_shadow_prefixes: Vec<String>,
    login_ip_rule: RateLimitRule,
    login_user_rule: RateLimitRule,
    runtime_settings: Arc<RwLock<ConsoleSettingsState>>,
}

impl Default for IngressPolicy {
    fn default() -> Self {
        Self {
            rate_limiter: Mutex::new(InMemoryRateLimiter::new()),
            admin_shadow_prefixes: vec!["/admin".to_string()],
            login_ip_rule: RateLimitRule {
                id: "protect-login-ip".to_string(),
                scope: RateLimitScope::Ip,
                path_prefix: "/api/login".to_string(),
                rps: 5,
                burst: 10,
            },
            login_user_rule: RateLimitRule {
                id: "protect-login-user".to_string(),
                scope: RateLimitScope::User,
                path_prefix: "/api/login".to_string(),
                rps: 3,
                burst: 6,
            },
            runtime_settings: Arc::new(RwLock::new(ConsoleSettingsState {
                subject_header: "Remote-User".to_string(),
                email_header: "Remote-Email".to_string(),
                locale: "en".to_string(),
                notes: String::new(),
                shadow_mode_enabled: true,
                updated_by: None,
                updated_at: Utc::now(),
            })),
        }
    }
}

impl IngressPolicy {
    fn from_config(config: &AppConfig, runtime_settings: Arc<RwLock<ConsoleSettingsState>>) -> Self {
        Self {
            rate_limiter: Mutex::new(InMemoryRateLimiter::new()),
            admin_shadow_prefixes: config.security.admin_shadow_prefixes.clone(),
            login_ip_rule: RateLimitRule {
                id: config.security.login_ip_limit.rule_id.clone(),
                scope: RateLimitScope::Ip,
                path_prefix: config.security.login_ip_limit.path_prefix.clone(),
                rps: config.security.login_ip_limit.rps,
                burst: config.security.login_ip_limit.burst,
            },
            login_user_rule: RateLimitRule {
                id: config.security.login_user_limit.rule_id.clone(),
                scope: RateLimitScope::User,
                path_prefix: config.security.login_user_limit.path_prefix.clone(),
                rps: config.security.login_user_limit.rps,
                burst: config.security.login_user_limit.burst,
            },
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
        if self
            .admin_shadow_prefixes
            .iter()
            .any(|prefix| request.normalized_path.starts_with(prefix))
            && !request.auth.is_authenticated
        {
            return if shadow_mode_enabled {
                Decision::shadow("auth.required_for_admin", "admin-requires-auth")
            } else {
                Decision::block("auth.required_for_admin", "admin-requires-auth")
            };
        }

        if let Some(decision) = self.check_rate_limit(request, &self.login_ip_rule) {
            return decision;
        }

        if request.auth.is_authenticated {
            if let Some(decision) = self.check_rate_limit(request, &self.login_user_rule) {
                return decision;
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
            return Some(Decision::rate_limit(
                "rate_limit.exceeded",
                rule.id.clone(),
                snapshot.remaining,
                snapshot.reset_at.timestamp(),
            ));
        }

        None
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
