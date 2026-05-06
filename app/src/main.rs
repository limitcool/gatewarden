mod console;
mod config;
mod entities;
mod http;
mod ip_intel;
mod observability;
mod security;
mod store;

use anyhow::{Context, Result};
use console::ConsoleSettingsState;
use ip_intel::IpIntelService;
use observability::ObservabilityService;
use std::sync::{Arc, RwLock};
use tokio::net::TcpListener;

#[tokio::main]
async fn main() -> Result<()> {
    let config = Arc::new(config::AppConfig::load()?);
    let listen_addr = config.server.listen_addr()?;
    let store = Arc::new(store::Store::connect(&config.database).await?);
    let default_settings = ConsoleSettingsState::from_config(config.as_ref());
    let runtime_settings = Arc::new(RwLock::new(
        store
            .load_or_seed_console_settings(default_settings)
            .await?,
    ));
    store
        .ensure_policy_rules(&[
            store::PolicyRuleSeed {
                name: "protect-login-ip".to_string(),
                summary: "Token bucket on /api/login keyed by client IP".to_string(),
                scope: "ip + path".to_string(),
                status: "active".to_string(),
                mode: "enforce".to_string(),
                source: "manual".to_string(),
            },
            store::PolicyRuleSeed {
                name: "protect-login-user".to_string(),
                summary: "Token bucket on /api/login keyed by authenticated subject".to_string(),
                scope: "subject + path".to_string(),
                status: "active".to_string(),
                mode: "enforce".to_string(),
                source: "manual".to_string(),
            },
            store::PolicyRuleSeed {
                name: "admin-requires-auth".to_string(),
                summary: "Require authenticated operator context on /admin paths".to_string(),
                scope: "subject + path".to_string(),
                status: "active".to_string(),
                mode: "shadow".to_string(),
                source: "manual".to_string(),
            },
            store::PolicyRuleSeed {
                name: "protect-admin-surface-v2".to_string(),
                summary: "Tighten anonymous access on /admin while preserving authenticated operator traffic.".to_string(),
                scope: "subject + path".to_string(),
                status: "review".to_string(),
                mode: "shadow".to_string(),
                source: "approved-ai".to_string(),
            },
        ])
        .await?;
    let ip_intel = IpIntelService::new(&config.observability.geoip);
    if config.observability.geoip.enabled && !ip_intel.is_enabled() {
        eprintln!(
            "geoip requested but MMDB is unavailable at {}",
            ip_intel.database_path()
        );
    }

    ObservabilityService::new(
        store.clone(),
        config.observability.caddy_access_log.clone(),
        ip_intel,
    )
    .start();
    let state = http::AppState::new(store, config, runtime_settings);
    let listener = TcpListener::bind(listen_addr)
        .await
        .with_context(|| format!("failed to bind HTTP listener on {listen_addr}"))?;

    println!("gatewarden listening on http://{listen_addr}");

    axum::serve(listener, http::router(state))
        .await
        .context("axum server exited unexpectedly")?;

    Ok(())
}
