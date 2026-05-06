use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleSuggestion {
    pub title: String,
    pub rationale: String,
}
