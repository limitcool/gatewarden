use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::{fs, net::SocketAddr, path::Path};

pub const DEFAULT_CONFIG_PATH: &str = "gatewarden.yaml";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub identity: IdentityConfig,
    pub security: SecurityConfig,
    #[serde(default)]
    pub ai: AiConfig,
    #[serde(default)]
    pub observability: ObservabilityConfig,
}

impl AppConfig {
    pub fn load() -> Result<Self> {
        let raw = Self::read_raw()?;
        let mut config = Self::parse_raw(&raw)?;
        config.apply_env_overrides();
        config.validate()?;
        Ok(config)
    }

    pub fn read_raw() -> Result<String> {
        fs::read_to_string(DEFAULT_CONFIG_PATH)
            .with_context(|| format!("failed to read config file: {DEFAULT_CONFIG_PATH}"))
    }

    pub fn parse_raw(raw: &str) -> Result<Self> {
        let config: Self = serde_yaml::from_str(raw)
            .with_context(|| format!("failed to parse config file: {DEFAULT_CONFIG_PATH}"))?;
        config.validate()?;
        Ok(config)
    }

    pub fn write_raw(raw: &str) -> Result<Self> {
        let config = Self::parse_raw(raw)?;
        fs::write(DEFAULT_CONFIG_PATH, raw)
            .with_context(|| format!("failed to write config file: {DEFAULT_CONFIG_PATH}"))?;
        Ok(config)
    }

    fn validate(&self) -> Result<()> {
        self.server.listen_addr()?;
        self.security.validate()?;
        self.ai.validate()?;
        Ok(())
    }

    fn apply_env_overrides(&mut self) {
        if let Ok(database_url) = std::env::var("GATEWARDEN_DATABASE_URL") {
            let trimmed = database_url.trim();
            if !trimmed.is_empty() {
                self.database.url = trimmed.to_string();
            }
        }

        if let Ok(base_url) = std::env::var("GATEWARDEN_AI_BASE_URL") {
            let trimmed = base_url.trim();
            if !trimmed.is_empty() {
                self.ai.base_url = Some(trimmed.to_string());
            }
        }

        if let Ok(model) = std::env::var("GATEWARDEN_AI_MODEL") {
            let trimmed = model.trim();
            if !trimmed.is_empty() {
                self.ai.model = trimmed.to_string();
            }
        }
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
    #[serde(default)]
    pub protected_hosts: Vec<String>,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiConfig {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default = "default_ai_provider")]
    pub provider: String,
    #[serde(default = "default_ai_model")]
    pub model: String,
    #[serde(default = "default_ai_api_key_env")]
    pub api_key_env: String,
    #[serde(default)]
    pub base_url: Option<String>,
    #[serde(default = "default_ai_timeout_ms")]
    pub timeout_ms: u64,
    #[serde(default = "default_ai_system_prompt")]
    pub system_prompt: String,
}

impl Default for AiConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            provider: default_ai_provider(),
            model: default_ai_model(),
            api_key_env: default_ai_api_key_env(),
            base_url: None,
            timeout_ms: default_ai_timeout_ms(),
            system_prompt: default_ai_system_prompt(),
        }
    }
}

impl AiConfig {
    fn validate(&self) -> Result<()> {
        anyhow::ensure!(
            matches!(
                self.provider.trim().to_ascii_lowercase().as_str(),
                "openai" | "anthropic" | "gemini" | "groq" | "deepseek" | "xai" | "ollama"
            ),
            "ai.provider must be one of: openai, anthropic, gemini, groq, deepseek, xai, ollama"
        );
        anyhow::ensure!(
            !self.model.trim().is_empty(),
            "ai.model must not be empty"
        );
        anyhow::ensure!(
            self.timeout_ms > 0,
            "ai.timeout_ms must be greater than 0"
        );
        Ok(())
    }
}

fn default_ai_provider() -> String {
    "openai".to_string()
}

fn default_ai_model() -> String {
    "gpt-4.1-mini".to_string()
}

fn default_ai_api_key_env() -> String {
    "GATEWARDEN_AI_API_KEY".to_string()
}

fn default_ai_timeout_ms() -> u64 {
    15_000
}

fn default_ai_system_prompt() -> String {
    "You are Gatewarden, an AI security analyst. Produce concise, evidence-based, operator-reviewable guidance. Never claim enforcement happened unless the evidence explicitly shows it. Prefer narrow deterministic rule drafts over broad vague advice.".to_string()
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
