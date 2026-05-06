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
    pub user_agent: Option<String>,
    pub country: Option<String>,
    pub country_code: Option<String>,
    pub region: Option<String>,
    pub city: Option<String>,
    pub timezone: Option<String>,
    pub asn: Option<String>,
    pub asn_org: Option<String>,
    pub isp: Option<String>,
    pub is_proxy: Option<bool>,
    pub is_vpn: Option<bool>,
    pub is_tor: Option<bool>,
    pub is_datacenter: Option<bool>,
    pub source: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
