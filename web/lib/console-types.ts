export interface ConsoleResponse<T> {
  data: T
}

export interface FilterChipDto {
  label: string
  value: string
}

export interface DetailItemDto {
  label: string
  value: string
  description: string
}

export interface MetricDto {
  label: string
  value: string
  detail: string
}

export interface EventItemDto {
  title: string
  subtitle: string
  severity: string
  host?: string | null
  hostStatus?: string | null
  subject?: string | null
  userAgent?: string | null
  country?: string | null
  countryCode?: string | null
  region?: string | null
  city?: string | null
  timezone?: string | null
  asn?: string | null
  asnOrg?: string | null
  isp?: string | null
  isProxy?: boolean | null
  isVpn?: boolean | null
  isTor?: boolean | null
  isDatacenter?: boolean | null
  statusCode?: number | null
  responseTimeMs?: number | null
  requestId?: string | null
}

export interface ActionItemDto {
  title: string
  description: string
  cta: string
}

export interface RuleRowDto {
  name: string
  summary: string
  scope: string
  status: string
  mode: string
  kind: string
  host?: string | null
  pathPrefix?: string | null
  rps?: number | null
  burst?: number | null
  adminPrefixes: string[]
  source?: string | null
}

export interface UpsertPolicyRuleRequest {
  name?: string
  kind: string
  summary?: string
  mode: string
  host?: string
  pathPrefix?: string
  rps?: number
  burst?: number
  adminPrefixes: string[]
  status?: string
  source?: string
}

export interface SuggestionItemDto {
  id: string
  title: string
  summary: string
  badge: string
  confidence?: string | null
  evidence: string[]
  proposedRule?: string | null
  model?: string | null
  generatedAt?: string | null
  primaryAction: string
  secondaryAction: string
}

export interface AiExplanationDto {
  requestId?: string | null
  title: string
  summary: string
  risk: string
  confidence: string
  evidence: string[]
  nextSteps: string[]
  model?: string | null
  generatedAt?: string | null
}

export interface ApprovalItemDto {
  name: string
  summary: string
  badge: string
  primaryAction: string
  secondaryAction: string
}

export interface SettingsStateDto {
  subjectHeader: string
  emailHeader: string
  locale: string
  notes: string
  shadowModeEnabled: boolean
  rawYaml?: string
}

export interface AppConfigDto {
  server: ServerConfigDto
  database: DatabaseConfigDto
  identity: IdentityConfigDto
  security: SecurityConfigDto
  ai: AiConfigDto
  observability: ObservabilityConfigDto
}

export interface ServerConfigDto {
  listenAddr: string
}

export interface DatabaseConfigDto {
  url: string
}

export interface IdentityConfigDto {
  mode: string
  providerHint: string
  trustedHeaders: TrustedHeadersConfigDto
}

export interface TrustedHeadersConfigDto {
  authenticated: string
  subject: string
  email: string
  groups: string
  provider: string
}

export interface SecurityConfigDto {
  adminShadowPrefixes: string[]
  loginIpLimit: RateLimitConfigDto
  loginUserLimit: RateLimitConfigDto
  consoleAdminGroups: string[]
  protectedHosts: string[]
}

export interface RateLimitConfigDto {
  ruleId: string
  pathPrefix: string
  rps: number
  burst: number
}

export interface AiConfigDto {
  enabled: boolean
  provider: string
  model: string
  apiKeyEnv: string
  baseUrl?: string | null
  timeoutMs: number
  systemPrompt: string
}

export interface ObservabilityConfigDto {
  caddyAccessLog: CaddyAccessLogConfigDto
  geoip: GeoIpConfigDto
}

export interface CaddyAccessLogConfigDto {
  enabled: boolean
  path: string
  pollIntervalMs: number
}

export interface GeoIpConfigDto {
  enabled: boolean
  databasePath: string
}

export interface DashboardMetricDto {
  label: string
  value: string
  detail: string
  status: string
}

export interface DashboardOverviewDto {
  metrics: DashboardMetricDto[]
  recentEvents: EventItemDto[]
  actions: ActionItemDto[]
}

export interface EventsOverviewDto {
  metrics: MetricDto[]
  filters: FilterChipDto[]
  stream: EventItemDto[]
  details: DetailItemDto[]
  protectedHosts?: string[]
  observedHosts?: string[]
}

export interface RulesOverviewDto {
  metrics: MetricDto[]
  filters: FilterChipDto[]
  rules: RuleRowDto[]
  details: DetailItemDto[]
}

export interface SuggestionsOverviewDto {
  metrics: MetricDto[]
  filters: FilterChipDto[]
  suggestions: SuggestionItemDto[]
  details: DetailItemDto[]
  aiEnabled: boolean
  aiProvider?: string | null
  aiModel?: string | null
}

export interface ApprovalsOverviewDto {
  metrics: MetricDto[]
  filters: FilterChipDto[]
  approvals: ApprovalItemDto[]
  details: DetailItemDto[]
}

export interface SettingsOverviewDto {
  metrics: MetricDto[]
  filters: FilterChipDto[]
  settings: SettingsStateDto
  config?: AppConfigDto
  details: DetailItemDto[]
  configDetails?: DetailItemDto[]
}
