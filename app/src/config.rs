use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::{fs, net::SocketAddr, path::Path};

const DEFAULT_CONFIG_PATH: &str = "gatewarden.yaml";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub identity: IdentityConfig,
    pub security: SecurityConfig,
    #[serde(default)]
    pub observability: ObservabilityConfig,
}

impl AppConfig {
    pub fn load() -> Result<Self> {
        let raw = fs::read_to_string(DEFAULT_CONFIG_PATH)
            .with_context(|| format!("failed to read config file: {DEFAULT_CONFIG_PATH}"))?;
        let config: Self = serde_yaml::from_str(&raw)
            .with_context(|| format!("failed to parse config file: {DEFAULT_CONFIG_PATH}"))?;
        config.validate()?;
        Ok(config)
    }

    fn validate(&self) -> Result<()> {
        self.server.listen_addr()?;
        self.security.validate()?;
        Ok(())
    }

}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub listen_addr: String,
}

impl ServerConfig {
    pub fn listen_addr(&self) -> Result<SocketAddr> {
        self.listen_addr
            .parse()
            .with_context(|| format!("invalid server.listen_addr value: {}", self.listen_addr))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdentityConfig {
    pub mode: String,
    pub provider_hint: String,
    pub trusted_headers: TrustedHeadersConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrustedHeadersConfig {
    pub authenticated: String,
    pub subject: String,
    pub email: String,
    pub groups: String,
    pub provider: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    pub admin_shadow_prefixes: Vec<String>,
    pub login_ip_limit: RateLimitConfig,
    pub login_user_limit: RateLimitConfig,
    #[serde(default = "default_console_admin_groups")]
    pub console_admin_groups: Vec<String>,
}

impl SecurityConfig {
    fn validate(&self) -> Result<()> {
        self.login_ip_limit.validate("security.login_ip_limit")?;
        self.login_user_limit.validate("security.login_user_limit")?;
        Ok(())
    }
}

fn default_console_admin_groups() -> Vec<String> {
    vec!["admin".to_string()]
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ObservabilityConfig {
    #[serde(default)]
    pub caddy_access_log: CaddyAccessLogConfig,
    #[serde(default)]
    pub geoip: GeoIpConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaddyAccessLogConfig {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default = "default_caddy_access_log_path")]
    pub path: String,
    #[serde(default = "default_caddy_poll_interval_ms")]
    pub poll_interval_ms: u64,
}

impl Default for CaddyAccessLogConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            path: default_caddy_access_log_path(),
            poll_interval_ms: default_caddy_poll_interval_ms(),
        }
    }
}

fn default_caddy_access_log_path() -> String {
    "app/data/caddy-access.jsonl".to_string()
}

fn default_caddy_poll_interval_ms() -> u64 {
    1_000
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeoIpConfig {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default = "default_geoip_database_path")]
    pub database_path: String,
}

impl Default for GeoIpConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            database_path: default_geoip_database_path(),
        }
    }
}

fn default_geoip_database_path() -> String {
    "app/data/GeoLite2-City.mmdb".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitConfig {
    pub rule_id: String,
    pub path_prefix: String,
    pub rps: u32,
    pub burst: u32,
}

impl RateLimitConfig {
    fn validate(&self, scope: &str) -> Result<()> {
        anyhow::ensure!(self.rps > 0, "{scope}.rps must be greater than 0");
        anyhow::ensure!(self.burst > 0, "{scope}.burst must be greater than 0");
        anyhow::ensure!(
            !self.path_prefix.trim().is_empty(),
            "{scope}.path_prefix must not be empty"
        );
        Ok(())
    }
}

pub fn ensure_parent_directory(database_url: &str) -> Result<()> {
    if let Some(path) = database_url.strip_prefix("sqlite://") {
        let file_path = path.split('?').next().unwrap_or(path);
        if let Some(parent) = Path::new(file_path).parent() {
            fs::create_dir_all(parent).with_context(|| {
                format!("failed to create database directory: {}", parent.display())
            })?;
        }
    }

    Ok(())
}
