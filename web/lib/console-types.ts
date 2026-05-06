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
}

export interface SuggestionItemDto {
  title: string
  summary: string
  badge: string
  primaryAction: string
  secondaryAction: string
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
  details: DetailItemDto[]
}
