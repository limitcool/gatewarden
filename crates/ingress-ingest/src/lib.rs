use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessEvent {
    pub timestamp: DateTime<Utc>,
    pub client_ip: String,
    pub path: String,
    pub status: u16,
}
