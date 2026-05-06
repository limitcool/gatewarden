use crate::config::AiConfig;
use anyhow::{Context, Result};
use genai::adapter::AdapterKind;
use genai::chat::{ChatMessage, ChatRequest};
use genai::resolver::{AuthData, Endpoint, ServiceTargetResolver};
use genai::{Client, ModelIden, ServiceTarget};
use ingress_ai::{AiExplanation, AiSuggestion, ExplainEventInput, SuggestionGenerationInput};
use reqwest::Client as ReqwestClient;
use serde::de::DeserializeOwned;
use std::sync::Arc;
use std::time::Duration;

#[derive(Debug, Clone)]
pub struct AiService {
    config: Arc<AiConfig>,
    client: Client,
}

impl AiService {
    pub fn new(config: Arc<AiConfig>) -> Result<Self> {
        let reqwest = ReqwestClient::builder()
            .timeout(Duration::from_millis(config.timeout_ms))
            .build()
            .context("failed to build AI reqwest client")?;

        let provider = parse_adapter_kind(&config.provider)?;
        let api_key_env = config.api_key_env.clone();
        let base_url = config.base_url.clone();
        let target_resolver = ServiceTargetResolver::from_resolver_fn(
            move |target: ServiceTarget| -> Result<ServiceTarget, genai::resolver::Error> {
                let endpoint = match &base_url {
                    Some(url) if !url.trim().is_empty() => Endpoint::from_owned(normalize_base_url(url)),
                    _ => target.endpoint,
                };
                let auth = AuthData::from_env(api_key_env.clone());
                let model = ModelIden::new(provider, target.model.model_name.to_string());
                Ok(ServiceTarget {
                    endpoint,
                    auth,
                    model,
                })
            },
        );

        let client = Client::builder()
            .with_reqwest(reqwest)
            .with_service_target_resolver(target_resolver)
            .build();

        Ok(Self { config, client })
    }

    pub fn is_enabled(&self) -> bool {
        self.config.enabled
    }

    pub fn provider(&self) -> &str {
        &self.config.provider
    }

    pub fn model(&self) -> &str {
        &self.config.model
    }

    pub async fn generate_suggestions(
        &self,
        input: &SuggestionGenerationInput,
    ) -> Result<Vec<AiSuggestion>> {
        let prompt = format!(
            "Return JSON only as an array of suggestion objects. Each object must contain title, summary, badge, confidence, evidence (array of strings), proposed_rule.\n\nContext:\n{}",
            serde_json::to_string_pretty(input)?
        );

        self.run_json_request::<Vec<AiSuggestion>>(&prompt).await
    }

    pub async fn explain_event(&self, input: &ExplainEventInput) -> Result<AiExplanation> {
        let prompt = format!(
            "Return JSON only with title, summary, risk, confidence, evidence (array of strings), next_steps (array of strings).\n\nContext:\n{}",
            serde_json::to_string_pretty(input)?
        );

        self.run_json_request::<AiExplanation>(&prompt).await
    }

    async fn run_json_request<T>(&self, prompt: &str) -> Result<T>
    where
        T: DeserializeOwned,
    {
        let request = ChatRequest::new(vec![ChatMessage::user(prompt)])
            .with_system(self.config.system_prompt.clone());
        let response = self
            .client
            .exec_chat(&self.config.model, request, None)
            .await
            .with_context(|| format!("AI request failed for model {}", self.config.model))?;
        let content = response
            .content_text_into_string()
            .context("AI response did not contain text content")?;
        let normalized = extract_json_payload(&content);
        serde_json::from_str(&normalized).context("failed to parse AI JSON response")
    }
}

fn parse_adapter_kind(value: &str) -> Result<AdapterKind> {
    match value.trim().to_ascii_lowercase().as_str() {
        "openai" => Ok(AdapterKind::OpenAI),
        "anthropic" => Ok(AdapterKind::Anthropic),
        "gemini" => Ok(AdapterKind::Gemini),
        "groq" => Ok(AdapterKind::Groq),
        "deepseek" => Ok(AdapterKind::DeepSeek),
        "xai" => Ok(AdapterKind::Xai),
        "ollama" => Ok(AdapterKind::Ollama),
        other => anyhow::bail!("unsupported AI provider: {other}"),
    }
}

fn normalize_base_url(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.ends_with('/') {
        trimmed.to_string()
    } else {
        format!("{trimmed}/")
    }
}

fn extract_json_payload(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.starts_with("```") {
        let without_fence = trimmed
            .trim_start_matches("```json")
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim();
        without_fence.to_string()
    } else {
        trimmed.to_string()
    }
}
