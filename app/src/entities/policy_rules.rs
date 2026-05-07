use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "policy_rules")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique)]
    pub name: String,
    pub kind: String,
    pub summary: String,
    pub scope: String,
    pub status: String,
    pub mode: String,
    pub host: Option<String>,
    pub path_prefix: Option<String>,
    pub rps: Option<i32>,
    pub burst: Option<i32>,
    pub admin_prefixes_json: String,
    pub source: String,
    pub created_at: DateTimeUtc,
    pub updated_at: DateTimeUtc,
    pub approved_by: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
