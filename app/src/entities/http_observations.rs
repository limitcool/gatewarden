use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "http_observations")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub created_at: DateTimeUtc,
    pub request_id: Option<String>,
    pub method: String,
    pub path: String,
    pub host: String,
    pub client_ip: String,
    pub status_code: i32,
    pub duration_ms: i64,
    pub upstream_duration_ms: Option<i64>,
    pub upstream_latency_ms: Option<i64>,
    pub service_name: Option<String>,
    pub error_kind: Option<String>,
    pub source: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
