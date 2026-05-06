use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "security_events")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub created_at: DateTimeUtc,
    pub request_id: String,
    pub action: String,
    pub reason: String,
    pub path: String,
    pub method: String,
    pub client_ip: String,
    pub subject_id: Option<String>,
    pub email: Option<String>,
    pub host: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
