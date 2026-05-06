use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "ai_suggestions")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique)]
    pub suggestion_id: String,
    pub title: String,
    pub summary: String,
    pub badge: String,
    pub confidence: String,
    pub evidence_json: String,
    pub proposed_rule: Option<String>,
    pub model_name: String,
    pub provider: String,
    pub status: String,
    #[sea_orm(indexed)]
    pub created_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
