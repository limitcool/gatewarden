use crate::{
    console::{ConsoleDataProvider, ConsoleSettingsState, SeaOrmConsoleDataProvider},
    config::AppConfig,
    security::{SecurityService, resolve_client_ip},
    store::Store,
};
use axum::{
    Router,
    Json,
    extract::{Path, State},
    http::{HeaderMap, Method, StatusCode},
    response::IntoResponse,
    routing::{get, post},
};
use ingress_api::routes;
use serde::Deserialize;
use std::sync::RwLock;
use serde::Serialize;
use std::sync::Arc;

#[derive(Debug, Clone)]
pub struct AppState {
    console: Arc<SeaOrmConsoleDataProvider>,
    security: Arc<SecurityService>,
    store: Arc<Store>,
    config: Arc<AppConfig>,
    runtime_settings: Arc<RwLock<ConsoleSettingsState>>,
}

impl AppState {
    pub fn new(
        store: Arc<Store>,
        config: Arc<AppConfig>,
        runtime_settings: Arc<RwLock<ConsoleSettingsState>>,
    ) -> Self {
        Self {
            console: Arc::new(SeaOrmConsoleDataProvider::new(
                store.clone(),
                config.clone(),
                runtime_settings.clone(),
            )),
            security: Arc::new(SecurityService::new(
                store.clone(),
                config.clone(),
                runtime_settings.clone(),
            )),
            store,
            config,
            runtime_settings,
        }
    }

    fn authorize_console(&self, headers: &HeaderMap) -> Result<ConsolePrincipal, (StatusCode, String)> {
        let auth = self.security.resolve_auth_context(headers);
        if !auth.is_authenticated {
            return Err((
                StatusCode::UNAUTHORIZED,
                "console access requires authenticated identity headers".to_string(),
            ));
        }

        let required_groups = &self.config.security.console_admin_groups;
        if !required_groups.is_empty()
            && !auth.groups.iter().any(|group| {
                required_groups
                    .iter()
                    .any(|required| required.eq_ignore_ascii_case(group))
            })
        {
            return Err((
                StatusCode::FORBIDDEN,
                format!(
                    "console access requires one of the configured admin groups: {}",
                    required_groups.join(", ")
                ),
            ));
        }

        Ok(ConsolePrincipal {
            subject_id: auth
                .subject_id
                .unwrap_or_else(|| "unknown-operator".to_string()),
        })
    }
}

#[derive(Debug, Clone)]
struct ConsolePrincipal {
    subject_id: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct HealthzResponse {
    pub status: &'static str,
}

#[derive(Debug, Deserialize)]
struct UpdateSettingsRequest {
    subject_header: String,
    email_header: String,
    locale: String,
    notes: String,
    shadow_mode_enabled: bool,
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/healthz", get(healthz))
        .route("/api/forward-auth", get(forward_auth).post(forward_auth))
        .route(routes::DASHBOARD, get(dashboard))
        .route(routes::EVENTS, get(events))
        .route(routes::RULES, get(rules_index))
        .route(routes::SUGGESTIONS, get(suggestions))
        .route(routes::APPROVALS, get(approvals))
        .route("/api/console/approvals/{rule_name}/approve", post(approve_rule))
        .route("/api/console/approvals/{rule_name}/revision", post(request_rule_revision))
        .route(routes::SETTINGS, get(settings).put(update_settings))
        .with_state(state)
}

async fn healthz() -> axum::Json<HealthzResponse> {
    axum::Json(HealthzResponse { status: "ok" })
}

async fn dashboard(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    if let Err(error) = state.authorize_console(&headers) {
        return error.into_response();
    }
    match state.console.dashboard().await {
        Ok(data) => axum::Json(data).into_response(),
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("dashboard load failed: {error}"),
        )
            .into_response(),
    }
}

async fn events(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    if let Err(error) = state.authorize_console(&headers) {
        return error.into_response();
    }
    match state.console.events().await {
        Ok(data) => axum::Json(data).into_response(),
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("events load failed: {error}"),
        )
            .into_response(),
    }
}

async fn rules_index(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    if let Err(error) = state.authorize_console(&headers) {
        return error.into_response();
    }
    match state.console.rules().await {
        Ok(data) => axum::Json(data).into_response(),
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("rules load failed: {error}"),
        )
            .into_response(),
    }
}

async fn suggestions(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    if let Err(error) = state.authorize_console(&headers) {
        return error.into_response();
    }
    match state.console.suggestions().await {
        Ok(data) => axum::Json(data).into_response(),
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("suggestions load failed: {error}"),
        )
            .into_response(),
    }
}

async fn approvals(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    if let Err(error) = state.authorize_console(&headers) {
        return error.into_response();
    }
    match state.console.approvals().await {
        Ok(data) => axum::Json(data).into_response(),
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("approvals load failed: {error}"),
        )
            .into_response(),
    }
}

async fn settings(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    if let Err(error) = state.authorize_console(&headers) {
        return error.into_response();
    }
    match state.console.settings().await {
        Ok(data) => axum::Json(data).into_response(),
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("settings load failed: {error}"),
        )
            .into_response(),
    }
}

async fn update_settings(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<UpdateSettingsRequest>,
) -> impl IntoResponse {
    let principal = match state.authorize_console(&headers) {
        Ok(principal) => principal,
        Err(error) => return error.into_response(),
    };

    if payload.subject_header.trim().is_empty() || payload.email_header.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            "subject_header and email_header must not be empty",
        )
            .into_response();
    }
    if payload.locale != "en" && payload.locale != "zh-CN" {
        return (StatusCode::BAD_REQUEST, "locale must be en or zh-CN").into_response();
    }

    let updated = ConsoleSettingsState {
        subject_header: payload.subject_header.trim().to_string(),
        email_header: payload.email_header.trim().to_string(),
        locale: payload.locale,
        notes: payload.notes.trim().to_string(),
        shadow_mode_enabled: payload.shadow_mode_enabled,
        updated_by: Some(principal.subject_id),
        updated_at: chrono::Utc::now(),
    };

    if let Err(error) = state.store.save_console_settings(&updated).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("failed to persist settings: {error}"),
        )
            .into_response();
    }

    *state
        .runtime_settings
        .write()
        .expect("runtime settings lock poisoned") = updated;

    match state.console.settings().await {
        Ok(data) => Json(data).into_response(),
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("settings load failed: {error}"),
        )
            .into_response(),
    }
}

async fn approve_rule(
    State(state): State<AppState>,
    Path(rule_name): Path<String>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let principal = match state.authorize_console(&headers) {
        Ok(principal) => principal,
        Err(error) => return error.into_response(),
    };

    match state.store.approve_rule(&rule_name, &principal.subject_id).await {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("failed to approve rule: {error}"),
        )
            .into_response(),
    }
}

async fn request_rule_revision(
    State(state): State<AppState>,
    Path(rule_name): Path<String>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let principal = match state.authorize_console(&headers) {
        Ok(principal) => principal,
        Err(error) => return error.into_response(),
    };

    match state
        .store
        .request_rule_revision(&rule_name, &principal.subject_id)
        .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("failed to request rule revision: {error}"),
        )
            .into_response(),
    }
}

async fn forward_auth(
    State(state): State<AppState>,
    method: Method,
    headers: HeaderMap,
) -> impl IntoResponse {
    let uri = headers
        .get("x-forwarded-uri")
        .or_else(|| headers.get("x-original-uri"))
        .and_then(|value| value.to_str().ok())
        .unwrap_or("/")
        .to_string();
    let scheme = headers
        .get("x-forwarded-proto")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("https")
        .to_string();
    let host = headers
        .get("x-forwarded-host")
        .or_else(|| headers.get("host"))
        .and_then(|value| value.to_str().ok())
        .unwrap_or("localhost")
        .to_string();
    let client_ip = resolve_client_ip(&headers);

    match state
        .security
        .evaluate_forward_auth(method, uri, headers, scheme, host, client_ip)
        .await
    {
        Ok(response) => (response.status, response.headers).into_response(),
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("forward auth evaluation failed: {error}"),
        )
            .into_response(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{config, store::PolicyRuleSeed};
    use axum::{
        body::{Body, to_bytes},
        http::Request,
    };
    use serde_json::Value;
    use std::{
        path::PathBuf,
        sync::{Arc, RwLock},
        time::{SystemTime, UNIX_EPOCH},
    };
    use tower::ServiceExt;

    fn test_database_url(name: &str) -> String {
        if let Ok(base_url) = std::env::var("POSTGRES_TEST_DATABASE_URL") {
            let suffix = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("system clock before unix epoch")
                .as_nanos();
            let schema = format!("gwaf_test_{}_{}", sanitize_identifier(name), suffix);
            return if base_url.contains('?') {
                format!("{base_url}&options[search_path]={schema}")
            } else {
                format!("{base_url}?options[search_path]={schema}")
            };
        }

        let mut path: PathBuf = std::env::temp_dir();
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock before unix epoch")
            .as_nanos();
        path.push(format!("gatewarden-{name}-{suffix}.db"));
        format!("sqlite://{}?mode=rwc", path.to_string_lossy().replace('\\', "/"))
    }

    fn sanitize_identifier(input: &str) -> String {
        input
            .chars()
            .map(|ch| if ch.is_ascii_alphanumeric() { ch.to_ascii_lowercase() } else { '_' })
            .collect()
    }

    fn test_config(database_url: String) -> Arc<AppConfig> {
        Arc::new(config::AppConfig {
            server: config::ServerConfig {
                listen_addr: "127.0.0.1:4000".to_string(),
            },
            database: config::DatabaseConfig { url: database_url },
            identity: config::IdentityConfig {
                mode: "trusted_header".to_string(),
                provider_hint: "external-oidc".to_string(),
                trusted_headers: config::TrustedHeadersConfig {
                    authenticated: "X-Authenticated".to_string(),
                    subject: "Remote-User".to_string(),
                    email: "Remote-Email".to_string(),
                    groups: "Remote-Groups".to_string(),
                    provider: "X-Auth-Provider".to_string(),
                },
            },
                security: config::SecurityConfig {
                    admin_shadow_prefixes: vec!["/admin".to_string()],
                    login_ip_limit: config::RateLimitConfig {
                    rule_id: "protect-login-ip".to_string(),
                    path_prefix: "/api/login".to_string(),
                    rps: 5,
                    burst: 10,
                },
                login_user_limit: config::RateLimitConfig {
                    rule_id: "protect-login-user".to_string(),
                    path_prefix: "/api/login".to_string(),
                    rps: 3,
                    burst: 6,
                    },
                    console_admin_groups: vec!["admin".to_string()],
                    protected_hosts: vec!["accounts.init.cool".to_string()],
                },
                observability: config::ObservabilityConfig::default(),
            })
        }

    async fn build_router(name: &str) -> Router {
        let config = test_config(test_database_url(name));
        let store = Arc::new(Store::connect(&config.database).await.expect("store should connect"));
        let runtime_settings = Arc::new(RwLock::new(
            store
                .load_or_seed_console_settings(ConsoleSettingsState::from_config(config.as_ref()))
                .await
                .expect("settings should seed"),
        ));
        store
            .ensure_policy_rules(&[
                PolicyRuleSeed {
                    name: "protect-login-ip".to_string(),
                    summary: "Token bucket on /api/login keyed by client IP".to_string(),
                    scope: "ip + path".to_string(),
                    status: "active".to_string(),
                    mode: "enforce".to_string(),
                    source: "manual".to_string(),
                },
                PolicyRuleSeed {
                    name: "protect-login-user".to_string(),
                    summary: "Token bucket on /api/login keyed by authenticated subject".to_string(),
                    scope: "subject + path".to_string(),
                    status: "active".to_string(),
                    mode: "enforce".to_string(),
                    source: "manual".to_string(),
                },
                PolicyRuleSeed {
                    name: "admin-requires-auth".to_string(),
                    summary: "Require authenticated operator context on /admin paths".to_string(),
                    scope: "subject + path".to_string(),
                    status: "active".to_string(),
                    mode: "shadow".to_string(),
                    source: "manual".to_string(),
                },
                PolicyRuleSeed {
                    name: "protect-admin-surface-v2".to_string(),
                    summary: "Tighten anonymous access on /admin while preserving authenticated operator traffic.".to_string(),
                    scope: "subject + path".to_string(),
                    status: "review".to_string(),
                    mode: "shadow".to_string(),
                    source: "approved-ai".to_string(),
                },
            ])
            .await
            .expect("rules should seed");

        router(AppState::new(store, config, runtime_settings))
    }

    #[tokio::test]
    async fn console_routes_require_authentication() {
        let app = build_router("console-auth").await;
        let response = app
            .oneshot(
                Request::builder()
                    .uri(routes::DASHBOARD)
                    .body(Body::empty())
                    .expect("request should build"),
            )
            .await
            .expect("request should complete");

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn console_routes_require_admin_group() {
        let app = build_router("console-group").await;
        let response = app
            .oneshot(
                Request::builder()
                    .uri(routes::DASHBOARD)
                    .header("Remote-User", "alice")
                    .header("Remote-Email", "alice@example.com")
                    .header("Remote-Groups", "viewer")
                    .body(Body::empty())
                    .expect("request should build"),
            )
            .await
            .expect("request should complete");

        assert_eq!(response.status(), StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn forward_auth_echoes_identity_headers() {
        let app = build_router("forward-headers").await;
        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/api/forward-auth")
                    .header("x-forwarded-uri", "/admin")
                    .header("x-forwarded-host", "app.example.test")
                    .header("x-forwarded-proto", "https")
                    .header("x-forwarded-for", "198.51.100.10")
                    .header("Remote-User", "alice")
                    .header("Remote-Email", "alice@example.com")
                    .header("Remote-Groups", "admin,ops")
                    .body(Body::empty())
                    .expect("request should build"),
            )
            .await
            .expect("request should complete");

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(response.headers()["x-ingress-reason"], "policy.allow");
        assert_eq!(response.headers()["Remote-User"], "alice");
        assert_eq!(response.headers()["Remote-Email"], "alice@example.com");
        assert_eq!(response.headers()["Remote-Groups"], "admin,ops");
        assert_eq!(response.headers()["X-Authenticated"], "true");
        assert!(response.headers().get("X-Request-Id").is_some());
    }

    #[tokio::test]
    async fn saving_settings_can_disable_shadow_mode() {
        let app = build_router("settings-update").await;

        let update_request = Request::builder()
            .method(Method::PUT)
            .uri(routes::SETTINGS)
            .header("content-type", "application/json")
            .header("Remote-User", "alice")
            .header("Remote-Email", "alice@example.com")
            .header("Remote-Groups", "admin,ops")
            .body(Body::from(
                r#"{"subject_header":"Remote-User","email_header":"Remote-Email","locale":"en","notes":"disable shadow","shadow_mode_enabled":false}"#,
            ))
            .expect("request should build");

        let update_response = app
            .clone()
            .oneshot(update_request)
            .await
            .expect("update should complete");
        assert_eq!(update_response.status(), StatusCode::OK);

        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/api/forward-auth")
                    .header("x-forwarded-uri", "/admin")
                    .header("x-forwarded-host", "app.example.test")
                    .header("x-forwarded-proto", "https")
                    .header("x-forwarded-for", "198.51.100.99")
                    .body(Body::empty())
                    .expect("request should build"),
            )
            .await
            .expect("request should complete");

        assert_eq!(response.status(), StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn approving_rule_moves_it_into_active_inventory() {
        let app = build_router("approval-publish").await;
        let approve_request = Request::builder()
            .method(Method::POST)
            .uri("/api/console/approvals/protect-admin-surface-v2/approve")
            .header("Remote-User", "alice")
            .header("Remote-Email", "alice@example.com")
            .header("Remote-Groups", "admin,ops")
            .body(Body::empty())
            .expect("request should build");

        let approve_response = app
            .clone()
            .oneshot(approve_request)
            .await
            .expect("approve should complete");
        assert_eq!(approve_response.status(), StatusCode::NO_CONTENT);

        let rules_request = Request::builder()
            .uri(routes::RULES)
            .header("Remote-User", "alice")
            .header("Remote-Email", "alice@example.com")
            .header("Remote-Groups", "admin,ops")
            .body(Body::empty())
            .expect("request should build");
        let rules_response = app
            .oneshot(rules_request)
            .await
            .expect("rules request should complete");

        assert_eq!(rules_response.status(), StatusCode::OK);
        let body = to_bytes(rules_response.into_body(), usize::MAX)
            .await
            .expect("body should read");
        let payload: Value = serde_json::from_slice(&body).expect("rules json should parse");
        let rules = payload["data"]["rules"]
            .as_array()
            .expect("rules should be an array");
        let published_rule = rules
            .iter()
            .find(|entry| entry["name"] == "protect-admin-surface-v2")
            .expect("published rule should exist");
        assert_eq!(published_rule["status"], "active");
        assert_eq!(published_rule["mode"], "enforce");
    }
}
