use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "console_settings")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub subject_header: String,
    pub email_header: String,
    pub locale: String,
    pub notes: String,
    pub shadow_mode_enabled: bool,
    pub updated_at: DateTimeUtc,
    pub updated_by: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
