use crate::console::{ConsoleSettingsState, HttpObservationState, PolicyRuleState};
use crate::entities::{console_settings, http_observations, policy_rules, security_events};
use crate::config::{DatabaseConfig, ensure_parent_directory};
use anyhow::{Context, Result};
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, Database, DatabaseConnection, DbBackend,
    EntityTrait, QueryFilter, QueryOrder, QuerySelect, Schema, Set, Statement,
};
use sea_orm::sea_query::{Index, TableCreateStatement};

#[derive(Debug, Clone)]
pub struct EventRecordInput {
    pub request_id: String,
    pub action: String,
    pub reason: String,
    pub path: String,
    pub method: String,
    pub client_ip: String,
    pub subject_id: Option<String>,
    pub email: Option<String>,
    pub host: String,
    pub user_agent: Option<String>,
}

#[derive(Debug, Clone)]
pub struct PolicyRuleSeed {
    pub name: String,
    pub summary: String,
    pub scope: String,
    pub status: String,
    pub mode: String,
    pub source: String,
}

#[derive(Debug, Clone)]
pub struct HttpObservationInput {
    pub created_at: chrono::DateTime<Utc>,
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

#[derive(Debug, Clone)]
pub struct Store {
    db: DatabaseConnection,
}

impl Store {
    pub async fn connect(database: &DatabaseConfig) -> Result<Self> {
        ensure_parent_directory(&database.url)?;
        let db = Database::connect(&database.url)
            .await
            .with_context(|| format!("failed to connect database: {}", database.url))?;
        let store = Self { db };
        store.migrate().await?;
        Ok(store)
    }

    pub async fn insert_event(&self, event: EventRecordInput) -> Result<()> {
        let model = security_events::ActiveModel {
            created_at: Set(Utc::now().into()),
            request_id: Set(event.request_id),
            action: Set(event.action),
            reason: Set(event.reason),
            path: Set(event.path),
            method: Set(event.method),
            client_ip: Set(event.client_ip),
            subject_id: Set(event.subject_id),
            email: Set(event.email),
            host: Set(event.host),
            user_agent: Set(event.user_agent),
            ..Default::default()
        };

        model
            .insert(&self.db)
            .await
            .context("failed to insert security event")?;
        Ok(())
    }

    pub async fn recent_events(
        &self,
        limit: u64,
    ) -> Result<Vec<security_events::Model>> {
        security_events::Entity::find()
            .order_by_desc(security_events::Column::CreatedAt)
            .limit(limit)
            .all(&self.db)
            .await
            .context("failed to query recent security events")
    }

    pub async fn insert_http_observation(&self, event: HttpObservationInput) -> Result<()> {
        let model = http_observations::ActiveModel {
            created_at: Set(event.created_at.into()),
            request_id: Set(event.request_id),
            method: Set(event.method),
            path: Set(event.path),
            host: Set(event.host),
            client_ip: Set(event.client_ip),
            status_code: Set(event.status_code),
            duration_ms: Set(event.duration_ms),
            upstream_duration_ms: Set(event.upstream_duration_ms),
            upstream_latency_ms: Set(event.upstream_latency_ms),
            service_name: Set(event.service_name),
            error_kind: Set(event.error_kind),
            user_agent: Set(event.user_agent),
            country: Set(event.country),
            country_code: Set(event.country_code),
            region: Set(event.region),
            city: Set(event.city),
            timezone: Set(event.timezone),
            asn: Set(event.asn),
            asn_org: Set(event.asn_org),
            isp: Set(event.isp),
            is_proxy: Set(event.is_proxy),
            is_vpn: Set(event.is_vpn),
            is_tor: Set(event.is_tor),
            is_datacenter: Set(event.is_datacenter),
            source: Set(event.source),
            ..Default::default()
        };

        model
            .insert(&self.db)
            .await
            .context("failed to insert http observation")?;
        Ok(())
    }

    pub async fn recent_http_observations(&self, limit: u64) -> Result<Vec<HttpObservationState>> {
        let rows = http_observations::Entity::find()
            .order_by_desc(http_observations::Column::CreatedAt)
            .limit(limit)
            .all(&self.db)
            .await
            .context("failed to query recent http observations")?;

        Ok(rows
            .into_iter()
            .map(|row| HttpObservationState {
                request_id: row.request_id,
                method: row.method,
                path: row.path,
                host: row.host,
                client_ip: row.client_ip,
                status_code: row.status_code,
                duration_ms: row.duration_ms,
                upstream_duration_ms: row.upstream_duration_ms,
                upstream_latency_ms: row.upstream_latency_ms,
                service_name: row.service_name,
                error_kind: row.error_kind,
                user_agent: row.user_agent,
                country: row.country,
                country_code: row.country_code,
                region: row.region,
                city: row.city,
                timezone: row.timezone,
                asn: row.asn,
                asn_org: row.asn_org,
                isp: row.isp,
                is_proxy: row.is_proxy.unwrap_or(false),
                is_vpn: row.is_vpn.unwrap_or(false),
                is_tor: row.is_tor.unwrap_or(false),
                is_datacenter: row.is_datacenter.unwrap_or(false),
                created_at: row.created_at.into(),
                source: row.source,
            })
            .collect())
    }

    pub async fn load_or_seed_console_settings(
        &self,
        defaults: ConsoleSettingsState,
    ) -> Result<ConsoleSettingsState> {
        if let Some(existing) = console_settings::Entity::find_by_id(1)
            .one(&self.db)
            .await
            .context("failed to query console settings")?
        {
            return Ok(ConsoleSettingsState {
                subject_header: existing.subject_header,
                email_header: existing.email_header,
                locale: existing.locale,
                notes: existing.notes,
                shadow_mode_enabled: existing.shadow_mode_enabled,
                updated_at: existing.updated_at.into(),
                updated_by: existing.updated_by,
            });
        }

        let record = console_settings::ActiveModel {
            id: Set(1),
            subject_header: Set(defaults.subject_header.clone()),
            email_header: Set(defaults.email_header.clone()),
            locale: Set(defaults.locale.clone()),
            notes: Set(defaults.notes.clone()),
            shadow_mode_enabled: Set(defaults.shadow_mode_enabled),
            updated_at: Set(defaults.updated_at.into()),
            updated_by: Set(defaults.updated_by.clone()),
        };

        record
            .insert(&self.db)
            .await
            .context("failed to seed console settings")?;

        Ok(defaults)
    }

    pub async fn save_console_settings(
        &self,
        settings: &ConsoleSettingsState,
    ) -> Result<ConsoleSettingsState> {
        let model = console_settings::ActiveModel {
            id: Set(1),
            subject_header: Set(settings.subject_header.clone()),
            email_header: Set(settings.email_header.clone()),
            locale: Set(settings.locale.clone()),
            notes: Set(settings.notes.clone()),
            shadow_mode_enabled: Set(settings.shadow_mode_enabled),
            updated_at: Set(settings.updated_at.into()),
            updated_by: Set(settings.updated_by.clone()),
        };

        console_settings::Entity::delete_by_id(1)
            .exec(&self.db)
            .await
            .context("failed to replace console settings")?;

        model
            .insert(&self.db)
            .await
            .context("failed to persist console settings")?;

        Ok(settings.clone())
    }

    pub async fn ensure_policy_rules(&self, seeds: &[PolicyRuleSeed]) -> Result<()> {
        for seed in seeds {
            let exists = policy_rules::Entity::find()
                .filter(policy_rules::Column::Name.eq(seed.name.clone()))
                .one(&self.db)
                .await
                .with_context(|| format!("failed to query policy rule: {}", seed.name))?;

            if exists.is_some() {
                continue;
            }

            let now = Utc::now();
            let model = policy_rules::ActiveModel {
                name: Set(seed.name.clone()),
                summary: Set(seed.summary.clone()),
                scope: Set(seed.scope.clone()),
                status: Set(seed.status.clone()),
                mode: Set(seed.mode.clone()),
                source: Set(seed.source.clone()),
                created_at: Set(now.into()),
                updated_at: Set(now.into()),
                approved_by: Set(None),
                ..Default::default()
            };

            model
                .insert(&self.db)
                .await
                .with_context(|| format!("failed to seed policy rule: {}", seed.name))?;
        }

        Ok(())
    }

    pub async fn list_policy_rules(&self) -> Result<Vec<PolicyRuleState>> {
        let rows = policy_rules::Entity::find()
            .order_by_asc(policy_rules::Column::Name)
            .all(&self.db)
            .await
            .context("failed to query policy rules")?;

        Ok(rows
            .into_iter()
            .map(|row| PolicyRuleState {
                name: row.name,
                summary: row.summary,
                scope: row.scope,
                status: row.status,
                mode: row.mode,
                source: row.source,
                approved_by: row.approved_by,
            })
            .collect())
    }

    pub async fn approve_rule(&self, rule_name: &str, approved_by: &str) -> Result<()> {
        self.update_rule_status(rule_name, "active", "enforce", Some(approved_by.to_string()))
            .await
    }

    pub async fn request_rule_revision(&self, rule_name: &str, actor: &str) -> Result<()> {
        self.update_rule_status(rule_name, "blocked", "shadow", Some(actor.to_string()))
            .await
    }

    async fn update_rule_status(
        &self,
        rule_name: &str,
        status: &str,
        mode: &str,
        actor: Option<String>,
    ) -> Result<()> {
        let existing = policy_rules::Entity::find()
            .filter(policy_rules::Column::Name.eq(rule_name.to_string()))
            .one(&self.db)
            .await
            .with_context(|| format!("failed to query policy rule: {rule_name}"))?
            .with_context(|| format!("policy rule not found: {rule_name}"))?;

        let mut model: policy_rules::ActiveModel = existing.into();
        model.status = Set(status.to_string());
        model.mode = Set(mode.to_string());
        model.updated_at = Set(Utc::now().into());
        model.approved_by = Set(actor);
        model
            .update(&self.db)
            .await
            .with_context(|| format!("failed to update policy rule: {rule_name}"))?;
        Ok(())
    }

    async fn migrate(&self) -> Result<()> {
        let backend = self.db.get_database_backend();
        let schema = Schema::new(backend);

        if backend == DbBackend::Sqlite {
            self.sqlite_migrate_legacy_schema().await?;
            self.sqlite_add_column_if_missing("security_events", "user_agent", "TEXT NULL")
                .await?;
            self.sqlite_add_column_if_missing("http_observations", "user_agent", "TEXT NULL")
                .await?;
            self.sqlite_add_column_if_missing("http_observations", "country", "TEXT NULL")
                .await?;
            self.sqlite_add_column_if_missing("http_observations", "country_code", "TEXT NULL")
                .await?;
            self.sqlite_add_column_if_missing("http_observations", "region", "TEXT NULL")
                .await?;
            self.sqlite_add_column_if_missing("http_observations", "city", "TEXT NULL")
                .await?;
            self.sqlite_add_column_if_missing("http_observations", "timezone", "TEXT NULL")
                .await?;
            self.sqlite_add_column_if_missing("http_observations", "asn", "TEXT NULL")
                .await?;
            self.sqlite_add_column_if_missing("http_observations", "asn_org", "TEXT NULL")
                .await?;
            self.sqlite_add_column_if_missing("http_observations", "isp", "TEXT NULL")
                .await?;
            self.sqlite_add_column_if_missing("http_observations", "is_proxy", "INTEGER NULL")
                .await?;
            self.sqlite_add_column_if_missing("http_observations", "is_vpn", "INTEGER NULL")
                .await?;
            self.sqlite_add_column_if_missing("http_observations", "is_tor", "INTEGER NULL")
                .await?;
            self.sqlite_add_column_if_missing("http_observations", "is_datacenter", "INTEGER NULL")
                .await?;
            self.ensure_indexes().await?;
            return Ok(());
        }

        self.create_entity_table(
            backend,
            self.create_table_statement(&schema, security_events::Entity),
            "failed to create security_events schema",
        )
        .await?;
        self.create_entity_table(
            backend,
            self.create_table_statement(&schema, console_settings::Entity),
            "failed to create console settings schema",
        )
        .await?;
        self.create_entity_table(
            backend,
            self.create_table_statement(&schema, policy_rules::Entity),
            "failed to create policy rules schema",
        )
        .await?;
        self.create_entity_table(
            backend,
            self.create_table_statement(&schema, http_observations::Entity),
            "failed to create http observations schema",
        )
        .await?;
        self.ensure_indexes().await?;
        Ok(())
    }

    fn create_table_statement<E>(&self, schema: &Schema, entity: E) -> TableCreateStatement
    where
        E: EntityTrait,
    {
        let mut statement = schema.create_table_from_entity(entity);
        statement.if_not_exists();
        statement
    }

    async fn create_entity_table(
        &self,
        backend: DbBackend,
        statement: TableCreateStatement,
        error_message: &str,
    ) -> Result<()> {
        self.db
            .execute(backend.build(&statement))
            .await
            .context(error_message.to_string())?;
        Ok(())
    }

    async fn sqlite_migrate_legacy_schema(&self) -> Result<()> {
        self.db
            .execute(Statement::from_string(
                DbBackend::Sqlite,
                r#"
                CREATE TABLE IF NOT EXISTS security_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                    created_at TEXT NOT NULL,
                    request_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    path TEXT NOT NULL,
                    method TEXT NOT NULL,
                    client_ip TEXT NOT NULL,
                    subject_id TEXT NULL,
                    email TEXT NULL,
                    host TEXT NOT NULL,
                    user_agent TEXT NULL
                )
                "#
                .to_string(),
            ))
            .await
            .context("failed to create security_events table")?;
        self.db
            .execute(Statement::from_string(
                DbBackend::Sqlite,
                r#"
                CREATE TABLE IF NOT EXISTS console_settings (
                    id INTEGER PRIMARY KEY NOT NULL,
                    subject_header TEXT NOT NULL,
                    email_header TEXT NOT NULL,
                    locale TEXT NOT NULL,
                    notes TEXT NOT NULL,
                    shadow_mode_enabled INTEGER NOT NULL,
                    updated_at TEXT NOT NULL,
                    updated_by TEXT NULL
                )
                "#
                .to_string(),
            ))
            .await
            .context("failed to create console_settings table")?;
        self.db
            .execute(Statement::from_string(
                DbBackend::Sqlite,
                r#"
                CREATE TABLE IF NOT EXISTS policy_rules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                    name TEXT NOT NULL UNIQUE,
                    summary TEXT NOT NULL,
                    scope TEXT NOT NULL,
                    status TEXT NOT NULL,
                    mode TEXT NOT NULL,
                    source TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    approved_by TEXT NULL
                )
                "#
                .to_string(),
            ))
            .await
            .context("failed to create policy_rules table")?;
        self.db
            .execute(Statement::from_string(
                DbBackend::Sqlite,
                r#"
                CREATE TABLE IF NOT EXISTS http_observations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                    created_at TEXT NOT NULL,
                    request_id TEXT NULL,
                    method TEXT NOT NULL,
                    path TEXT NOT NULL,
                    host TEXT NOT NULL,
                    client_ip TEXT NOT NULL,
                    status_code INTEGER NOT NULL,
                    duration_ms INTEGER NOT NULL,
                    upstream_duration_ms INTEGER NULL,
                    upstream_latency_ms INTEGER NULL,
                    service_name TEXT NULL,
                    error_kind TEXT NULL,
                    user_agent TEXT NULL,
                    country TEXT NULL,
                    country_code TEXT NULL,
                    region TEXT NULL,
                    city TEXT NULL,
                    timezone TEXT NULL,
                    asn TEXT NULL,
                    asn_org TEXT NULL,
                    isp TEXT NULL,
                    is_proxy INTEGER NULL,
                    is_vpn INTEGER NULL,
                    is_tor INTEGER NULL,
                    is_datacenter INTEGER NULL,
                    source TEXT NOT NULL
                )
                "#
                .to_string(),
            ))
            .await
            .context("failed to create http_observations table")?;
        Ok(())
    }

    async fn ensure_indexes(&self) -> Result<()> {
        let backend = self.db.get_database_backend();
        let indexes = vec![
            Index::create()
                .name("idx-security-events-created-at")
                .table(security_events::Entity)
                .col(security_events::Column::CreatedAt)
                .if_not_exists()
                .to_owned(),
            Index::create()
                .name("idx-security-events-request-id")
                .table(security_events::Entity)
                .col(security_events::Column::RequestId)
                .if_not_exists()
                .to_owned(),
            Index::create()
                .name("idx-security-events-host")
                .table(security_events::Entity)
                .col(security_events::Column::Host)
                .if_not_exists()
                .to_owned(),
            Index::create()
                .name("idx-http-observations-created-at")
                .table(http_observations::Entity)
                .col(http_observations::Column::CreatedAt)
                .if_not_exists()
                .to_owned(),
            Index::create()
                .name("idx-http-observations-request-id")
                .table(http_observations::Entity)
                .col(http_observations::Column::RequestId)
                .if_not_exists()
                .to_owned(),
            Index::create()
                .name("idx-http-observations-host-client-ip")
                .table(http_observations::Entity)
                .col(http_observations::Column::Host)
                .col(http_observations::Column::ClientIp)
                .if_not_exists()
                .to_owned(),
            Index::create()
                .name("idx-http-observations-status-code")
                .table(http_observations::Entity)
                .col(http_observations::Column::StatusCode)
                .if_not_exists()
                .to_owned(),
            Index::create()
                .name("idx-http-observations-duration-ms")
                .table(http_observations::Entity)
                .col(http_observations::Column::DurationMs)
                .if_not_exists()
                .to_owned(),
        ];

        for statement in indexes {
            self.db
                .execute(backend.build(&statement))
                .await
                .context("failed to create index")?;
        }

        Ok(())
    }

    async fn sqlite_add_column_if_missing(
        &self,
        table: &str,
        column: &str,
        definition: &str,
    ) -> Result<()> {
        if self.sqlite_has_column(table, column).await? {
            return Ok(());
        }

        self.db
            .execute(Statement::from_string(
                DbBackend::Sqlite,
                format!("ALTER TABLE {table} ADD COLUMN {column} {definition}"),
            ))
            .await
            .with_context(|| format!("failed to add column {column} to {table}"))?;
        Ok(())
    }

    async fn sqlite_has_column(&self, table: &str, column: &str) -> Result<bool> {
        let rows = self
            .db
            .query_all(Statement::from_string(
                DbBackend::Sqlite,
                format!("PRAGMA table_info({table})"),
            ))
            .await
            .with_context(|| format!("failed to inspect sqlite schema for {table}"))?;

        Ok(rows.iter().any(|row| {
            row.try_get::<String>("", "name")
                .map(|name| name.eq_ignore_ascii_case(column))
                .unwrap_or(false)
        }))
    }
}
