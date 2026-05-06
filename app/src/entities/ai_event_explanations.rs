use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "ai_event_explanations")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(indexed, nullable)]
    pub request_id: Option<String>,
    pub title: String,
    pub summary: String,
    pub risk: String,
    pub confidence: String,
    pub evidence_json: String,
    pub next_steps_json: String,
    pub model_name: String,
    pub provider: String,
    #[sea_orm(indexed)]
    pub created_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
