use anyhow::Result;
use http::{HeaderValue, StatusCode};
use ingress_core::{
    AuthContext, CanonicalRequestContext, Decision, DecisionAction, GatewayKind, GatewayMetadata,
};
use ingress_gateway::{GatewayAdapter, GatewayInput, GatewayResponse};

const ADAPTER_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Debug, Clone)]
pub struct TrustedHeaderConfig {
    pub authenticated: String,
    pub subject: String,
    pub email: String,
    pub groups: String,
    pub provider: String,
}

impl Default for TrustedHeaderConfig {
    fn default() -> Self {
        Self {
            authenticated: "X-Authenticated".to_string(),
            subject: "Remote-User".to_string(),
            email: "Remote-Email".to_string(),
            groups: "Remote-Groups".to_string(),
            provider: "X-Auth-Provider".to_string(),
        }
    }
}

#[derive(Debug, Default)]
pub struct CaddyForwardAuthAdapter {
    trusted_headers: TrustedHeaderConfig,
}

impl CaddyForwardAuthAdapter {
    pub fn new() -> Self {
        Self::with_trusted_headers(TrustedHeaderConfig::default())
    }

    pub fn with_trusted_headers(trusted_headers: TrustedHeaderConfig) -> Self {
        Self { trusted_headers }
    }

    pub fn resolve_auth(&self, headers: &http::HeaderMap) -> AuthContext {
        let subject_id = first_header(
            headers,
            &header_candidates(
                &self.trusted_headers.subject,
                &[
                    "remote-user",
                    "x-user",
                    "x-forwarded-user",
                    "x-auth-request-user",
                    "x-pomerium-claim-sub",
                ],
            ),
        )
        .map(ToOwned::to_owned);
        let email = first_header(
            headers,
            &header_candidates(
                &self.trusted_headers.email,
                &[
                    "remote-email",
                    "x-email",
                    "x-forwarded-email",
                    "x-auth-request-email",
                    "x-pomerium-claim-email",
                ],
            ),
        )
        .map(ToOwned::to_owned);
        let groups = first_header(
            headers,
            &header_candidates(
                &self.trusted_headers.groups,
                &[
                    "remote-groups",
                    "x-groups",
                    "x-forwarded-groups",
                    "x-auth-request-groups",
                    "x-pomerium-claim-groups",
                ],
            ),
        )
        .map(|value| {
            value
                .split([',', ';'])
                .map(str::trim)
                .filter(|entry| !entry.is_empty())
                .map(ToOwned::to_owned)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
        let provider = first_header(
            headers,
            &header_candidates(
                &self.trusted_headers.provider,
                &["x-auth-provider", "x-forwarded-provider", "x-auth-request-provider"],
            ),
        )
        .map(ToOwned::to_owned)
        .or_else(|| {
            if subject_id.is_some() || email.is_some() {
                Some("external-idp".to_string())
            } else {
                None
            }
        });
        let is_authenticated = first_header(
            headers,
            &header_candidates(&self.trusted_headers.authenticated, &["x-authenticated", "x-auth"]),
        )
        .map(|value| {
            value.eq_ignore_ascii_case("true")
                || value.eq_ignore_ascii_case("yes")
                || value == "1"
        })
        .unwrap_or_else(|| subject_id.is_some() || email.is_some());

        AuthContext {
            is_authenticated,
            subject_id,
            email,
            groups,
            provider,
        }
    }
}

fn header_candidates<'a>(preferred: &'a str, fallbacks: &'a [&'a str]) -> Vec<&'a str> {
    let mut candidates = Vec::with_capacity(fallbacks.len() + 1);
    candidates.push(preferred);
    for fallback in fallbacks {
        if !fallback.eq_ignore_ascii_case(preferred) {
            candidates.push(fallback);
        }
    }
    candidates
}

fn first_header<'a>(headers: &'a http::HeaderMap, names: &[&str]) -> Option<&'a str> {
    names
        .iter()
        .find_map(|name| headers.get(*name).and_then(|value| value.to_str().ok()))
}

impl GatewayAdapter for CaddyForwardAuthAdapter {
    fn normalize_request(&self, input: GatewayInput) -> Result<CanonicalRequestContext> {
        let GatewayInput::Request(mut request) = input;
        request.auth = self.resolve_auth(&request.headers);
        let metadata = GatewayMetadata::new(GatewayKind::Caddy, ADAPTER_VERSION);
        request.gateway = metadata.kind;
        Ok(request)
    }

    fn to_gateway_response(&self, decision: &Decision) -> Result<GatewayResponse> {
        let mut response = match decision.action {
            DecisionAction::Allow | DecisionAction::Shadow => GatewayResponse::new(StatusCode::OK),
            DecisionAction::Block => GatewayResponse::new(StatusCode::FORBIDDEN),
            DecisionAction::RateLimit => GatewayResponse::new(StatusCode::TOO_MANY_REQUESTS),
        };

        if !decision.reason_codes.is_empty() {
            response.headers.insert(
                "x-ingress-reason",
                HeaderValue::from_str(&decision.reason_codes.join(","))?,
            );
        }

        Ok(response)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use http::{HeaderMap, HeaderValue, Method};
    use ingress_core::RequestContext;
    use std::net::{IpAddr, Ipv4Addr};

    #[test]
    fn maps_tinyauth_headers_into_canonical_auth_context() {
        let mut headers = HeaderMap::new();
        headers.insert("remote-user", HeaderValue::from_static("alice"));
        headers.insert("remote-email", HeaderValue::from_static("alice@example.com"));
        headers.insert("remote-groups", HeaderValue::from_static("admin, ops"));

        let request = RequestContext {
            request_id: "req-test".to_string(),
            received_at: Utc::now(),
            method: Method::GET,
            path: "/admin".to_string(),
            normalized_path: "/admin".to_string(),
            query: None,
            headers,
            client_ip: IpAddr::V4(Ipv4Addr::LOCALHOST),
            scheme: "https".to_string(),
            host: "example.test".to_string(),
            user_agent: None,
            auth: AuthContext::default(),
            gateway: GatewayKind::Unknown,
        };

        let adapter = CaddyForwardAuthAdapter::new();
        let normalized = adapter
            .normalize_request(GatewayInput::Request(request))
            .expect("request should normalize");

        assert!(normalized.auth.is_authenticated);
        assert_eq!(normalized.auth.subject_id.as_deref(), Some("alice"));
        assert_eq!(
            normalized.auth.email.as_deref(),
            Some("alice@example.com")
        );
        assert_eq!(normalized.auth.groups, vec!["admin", "ops"]);
        assert_eq!(normalized.auth.provider.as_deref(), Some("external-idp"));
        assert_eq!(normalized.gateway, GatewayKind::Caddy);
    }

    #[test]
    fn maps_generic_oidc_proxy_headers_into_canonical_auth_context() {
        let mut headers = HeaderMap::new();
        headers.insert("x-forwarded-user", HeaderValue::from_static("bob"));
        headers.insert("x-forwarded-email", HeaderValue::from_static("bob@example.com"));
        headers.insert("x-forwarded-groups", HeaderValue::from_static("platform;security"));
        headers.insert("x-auth-provider", HeaderValue::from_static("pocket-id"));

        let request = RequestContext {
            request_id: "req-oidc".to_string(),
            received_at: Utc::now(),
            method: Method::GET,
            path: "/console".to_string(),
            normalized_path: "/console".to_string(),
            query: None,
            headers,
            client_ip: IpAddr::V4(Ipv4Addr::LOCALHOST),
            scheme: "https".to_string(),
            host: "example.test".to_string(),
            user_agent: None,
            auth: AuthContext::default(),
            gateway: GatewayKind::Unknown,
        };

        let adapter = CaddyForwardAuthAdapter::new();
        let normalized = adapter
            .normalize_request(GatewayInput::Request(request))
            .expect("request should normalize");

        assert!(normalized.auth.is_authenticated);
        assert_eq!(normalized.auth.subject_id.as_deref(), Some("bob"));
        assert_eq!(normalized.auth.email.as_deref(), Some("bob@example.com"));
        assert_eq!(normalized.auth.groups, vec!["platform", "security"]);
        assert_eq!(normalized.auth.provider.as_deref(), Some("pocket-id"));
    }
}
