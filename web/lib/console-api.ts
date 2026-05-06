import type {
  ActionItemDto,
  ApprovalItemDto,
  ApprovalsOverviewDto,
  ConsoleResponse,
  DashboardMetricDto,
  DashboardOverviewDto,
  DetailItemDto,
  EventItemDto,
  EventsOverviewDto,
  FilterChipDto,
  MetricDto,
  RuleRowDto,
  RulesOverviewDto,
  SettingsOverviewDto,
  SettingsStateDto,
  SuggestionItemDto,
  SuggestionsOverviewDto,
} from "./console-types"
import type { EventRow } from "@/components/console"

const consoleHeaders = {
  "x-console-subject": process.env.NEXT_PUBLIC_CONSOLE_SUBJECT ?? "admin",
  "x-console-email": process.env.NEXT_PUBLIC_CONSOLE_EMAIL ?? "admin@example.com",
  "x-console-groups": process.env.NEXT_PUBLIC_CONSOLE_GROUPS ?? "admin",
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...consoleHeaders,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function getSeverity(value: string): "critical" | "warning" | "info" | "success" {
  const normalized = value.toLowerCase()
  if (normalized.includes("deny") || normalized.includes("block")) return "critical"
  if (normalized.includes("rate") || normalized.includes("review") || normalized.includes("warn")) return "warning"
  if (normalized.includes("allow") || normalized.includes("active") || normalized.includes("ok")) return "success"
  return "info"
}

const exactTextMap: Record<string, string> = {
  "Protected routes": "受保护路径",
  "Rate limit policies": "限流策略",
  "Captured events": "采集事件",
  "Stored events": "存储事件",
  "404 responses": "404 响应",
  "Avg latency": "平均耗时",
  "5xx responses": "5xx 响应",
  "Auth-linked": "关联身份",
  "Anonymous": "匿名请求",
  "Active rules": "生效规则",
  "In review": "待审核",
  "Auth-aware": "鉴权感知",
  "Pending suggestions": "待处理建议",
  "Shadow admin hits": "管理面影子命中",
  "Review inventory": "待审核库存",
  "Ready now": "当前可审批",
  "Blocked": "已退回",
  "Published": "已发布",
  "Header mappings": "身份映射",
  "Policy presets": "策略预设",
  "Locales": "语言支持",
  "Gateway: caddy": "网关: Caddy",
  "Mode: mixed": "模式: 混合",
  "Source: live": "来源: 实时",
  "Source: live db": "来源: 实时数据库",
  "Scope: mixed": "范围: 混合",
  "Source: live events": "来源: 实时事件",
  "Approval: required": "审批: 必需",
  "Mode: advisory": "模式: 建议",
  "Owner: operator": "负责人: 运维",
  "State: pending": "状态: 待处理",
  "Target: caddy": "目标: Caddy",
  "Auth preset: live headers": "鉴权预设: 实时头部",
  "Data source: sqlite": "数据源: SQLite",
  "Response: observed": "响应: 已观测",
  "HTTP observability": "HTTP 观测",
  "Human in the loop": "人工审核",
  "Caddy first": "Caddy 优先",
  "Identity preset": "身份预设",
  "Header mapping": "头部映射",
  "Persistence": "持久化",
  "Decision posture": "决策姿态",
  "Approval model": "审批模型",
  "AI source": "AI 来源",
  "Review goal": "审核目标",
  "OSS posture": "OSS 运行模式",
  "LLM role": "LLM 角色",
  "Publishing gate": "发布门槛",
  "Protect admin": "保护管理面",
  "Publish ready rules": "发布待审规则",
  "Open rules": "打开规则",
  "Open approvals": "打开审批",
  "Approve": "批准",
  "Request revision": "退回修改",
  "Ready": "就绪",
  "Evidence": "证据",
  "Review": "审核",
  "Later": "稍后",
  "Hold": "暂缓",
  "Calm": "平稳",
}

function translateText(text: string) {
  let result = exactTextMap[text] ?? text

  const replacements: Array<[RegExp, string]> = [
    [/Current persisted rule inventory across admin, login, and API surfaces/gi, "当前已持久化的管理面、登录面和 API 保护规则数量"],
    [/IP, user, and path-aware defaults from the live rule store/gi, "来自实时规则存储的 IP、用户和路径维度默认策略"],
    [/Recent requests written through SeaORM/gi, "最近写入 SeaORM 的真实请求事件"],
    [/Recent ingress decisions persisted in SQLite/gi, "最近持久化到 SQLite 的网关判定事件"],
    [/Recent requests that reached an application or Caddy route miss/gi, "最近到达应用或命中 Caddy 路由缺失的请求数量"],
    [/Average request duration derived from structured Caddy logs/gi, "基于 Caddy 结构化日志计算的平均请求耗时"],
    [/Recent upstream failures and internal server errors/gi, "最近的上游失败与内部服务错误数量"],
    [/Events with TinyAuth subject context/gi, "带有身份上下文的事件数量"],
    [/Events without authenticated subject context/gi, "未带身份上下文的事件数量"],
    [/Live persisted rules inside the deterministic policy store/gi, "当前确定性策略存储中的实时规则"],
    [/Rules waiting for explicit operator publication/gi, "等待人工确认发布的规则"],
    [/Subject-based controls enabled/gi, "已启用主体维度控制的规则数量"],
    [/Candidate rules waiting for review/gi, "等待人工审核的候选规则数量"],
    [/Unauthenticated admin requests still surfacing as review signals/gi, "未认证管理面访问仍在产生审核信号"],
    [/Persisted review rules that still need operator action/gi, "仍需运维处理的持久化待审规则"],
    [/Rules that already have a deterministic translation/gi, "已经完成确定性翻译、可直接审批的规则"],
    [/Rules explicitly pushed back for revision/gi, "已明确退回修改的规则"],
    [/Rules already moved into the active inventory/gi, "已进入生效库存的规则"],
    [/Canonical auth mapping is enabled/gi, "已启用标准身份映射"],
    [/Admin, login, API/gi, "管理面、登录面、API"],
    [/en \+ zh-CN/gi, "英文 + 简体中文"],
    [/Gatewarden trusts external identity context and maps it into the canonical subject model\./gi, "Gatewarden 信任外部身份上下文，并映射到统一主体模型。"],
    [/Trusted headers are now loaded from persisted console settings and applied by the runtime adapter\./gi, "受信头部已从持久化控制台设置加载，并由运行时适配器应用。"],
    [/Event stream now prefers real stored security events instead of static-only placeholders\./gi, "事件流现在优先展示真实存储的安全事件，而不是静态占位数据。"],
    [/The product still defaults to reviewable signals before stronger enforcement\./gi, "产品仍默认先展示可审核信号，再逐步升级到更强执行。"],
    [/Status codes and latency are ingested from structured access logs and correlated by request id when available\./gi, "状态码与耗时来自结构化访问日志，并在可用时按请求 ID 关联。"],
    [/The shared traits keep room for Nginx and Traefik later\./gi, "当前接口设计为后续接入 Nginx 和 Traefik 预留了空间。"],
    [/AI suggestions are translated into explicit rules before activation\./gi, "AI 建议会先转成明确规则，再进入激活流程。"],
    [/Approved AI rules are persisted as ordinary inventory entries after review\./gi, "AI 规则经审核后，会以普通库存条目形式持久化。"],
    [/Rules should be narrow enough that approval is a real decision, not a guess\./gi, "规则范围应足够收敛，让审批成为真实决策，而不是拍脑袋。"],
    [/The approval lane now persists decisions in SQLite instead of remaining display-only\./gi, "审批通道现在会把决策持久化到 SQLite，而不是只做展示。"],
    [/Inference output stays on the recommendation side of the boundary\./gi, "推理输出仍停留在建议层，不会越界直接执行。"],
    [/No suggestion becomes real enforcement without an explicit approval request\./gi, "没有显式审批之前，任何建议都不会变成真实强制策略。"],
    [/Require auth context and strict anonymous guardrails on privileged routes\./gi, "要求管理路径具备身份上下文，并对匿名访问施加严格保护。"],
    [/Only reviewed rules move from shadow or review into active enforcement\./gi, "只有通过审核的规则才会从影子或待审状态进入真实强制。"],
    [/Escalate anonymous login limiter/gi, "加强匿名登录限流"],
    [/Promote admin auth rule/gi, "提升管理面鉴权规则"],
    [/No new advisory spikes/gi, "暂无新增建议峰值"],
    [/\brecent anonymous rate-limit hits on \/api\/login suggest tightening thresholds before broader exposure\./gi, "最近匿名登录限流命中表明，在进一步开放之前应收紧阈值。"],
    [/recent unauthenticated \/admin decisions are still landing in shadow mode and can be promoted after review\./gi, "最近未认证的 /admin 请求仍停留在影子模式，审核后可提升为强制策略。"],
    [/Recent traffic is quiet enough that the queue is currently fed by the persisted review inventory\./gi, "近期流量较平稳，当前队列主要由已持久化的待审库存构成。"],
  ]

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement)
  }

  return result
}

export function getStatus(value?: string): "active" | "review" | "shadow" | "blocked" | "info" | "advisory" {
  const normalized = value?.toLowerCase() ?? ""
  if (normalized === "active" || normalized === "review" || normalized === "shadow" || normalized === "blocked" || normalized === "advisory") {
    return normalized
  }
  if (normalized.includes("allow") || normalized.includes("stable")) return "active"
  if (normalized.includes("rate") || normalized.includes("review")) return "review"
  if (normalized.includes("shadow")) return "shadow"
  if (normalized.includes("block") || normalized.includes("deny")) return "blocked"
  return "info"
}

export function normalizeMetrics(metrics: MetricDto[] | DashboardMetricDto[]) {
  return metrics.map((metric) => ({
    label: translateText(metric.label),
    value: metric.value,
    detail: translateText(metric.detail),
    status: "status" in metric ? getStatus(metric.status) : undefined,
  }))
}

export function normalizeFilters(filters: FilterChipDto[]) {
  return [
    { label: "全部", value: "all" },
    ...filters.map((filter) => ({
      label: translateText(filter.label),
      value: filter.value,
    })),
  ]
}

export function normalizeDetails(details: DetailItemDto[]) {
  return details.map((detail) => ({
    label: translateText(detail.label),
    value: translateText(detail.value),
    description: translateText(detail.description),
  }))
}

export function normalizeRecentEvents(events: EventItemDto[]) {
  return events.map((event, index) => ({
    id: `recent-${index}`,
    title: translateEventTitle(event.title),
    subtitle: translateEventSubtitle(event.subtitle),
    severity: getSeverity(event.severity),
    timestamp: "",
    statusCode: event.statusCode ?? undefined,
    responseTime: event.responseTimeMs ?? undefined,
    requestId: event.requestId ?? undefined,
  }))
}

export function normalizeRules(rules: RuleRowDto[]) {
  return rules.map((rule, index) => ({
    id: `${rule.name}-${index}`,
    name: rule.name,
    summary: translateText(rule.summary),
    scope: translateScope(rule.scope),
    mode: rule.mode,
    status: getStatus(rule.status),
  }))
}

export function normalizeSuggestions(suggestions: SuggestionItemDto[]) {
  return suggestions.map((item, index) => ({
    id: `suggestion-${index}`,
    title: translateText(item.title),
    summary: translateText(item.summary),
    badge: translateText(item.badge),
    primaryAction: translateText(item.primaryAction),
    secondaryAction: translateText(item.secondaryAction),
  }))
}

export function normalizeActions(actions: ActionItemDto[]) {
  return actions.map((action, index) => ({
    id: `action-${index}`,
    title: translateText(action.title),
    description: translateText(action.description),
    cta: translateText(action.cta),
    ctaKey: action.cta,
  }))
}

export function normalizeApprovals(approvals: ApprovalItemDto[]) {
  return approvals.map((item, index) => ({
    id: `approval-${index}`,
    name: item.name,
    displayName: translateRuleName(item.name),
    summary: translateRuleSummary(item.summary, item.name),
    badge: translateText(item.badge),
    primaryAction: translateText(item.primaryAction),
    secondaryAction: translateText(item.secondaryAction),
  }))
}

function translateScope(scope: string) {
  return scope
    .replace(/subject/gi, "主体")
    .replace(/path/gi, "路径")
    .replace(/\bip\b/gi, "IP")
    .replace(/\s*\+\s*/g, " + ")
}

function translateEventTitle(title: string) {
  return title
    .replace("policy.allow", "策略放行")
    .replace("rate_limit.exceeded", "限流触发")
    .replace("[allow]", "[放行]")
    .replace("[ratelimit]", "[限流]")
    .replace("[deny]", "[拒绝]")
    .replace("not_found [observe]", "404 访问事件 [观测]")
    .replace("http.404 [observe]", "404 访问事件 [观测]")
    .replace("http.500 [observe]", "500 服务错误 [观测]")
    .replace("http.502 [observe]", "502 网关错误 [观测]")
    .replace("http.504 [observe]", "504 网关超时 [观测]")
}

function translateEventSubtitle(subtitle: string) {
  return subtitle
    .replace(/^GET /, "GET ")
    .replace(/^POST /, "POST ")
    .replace(/^PUT /, "PUT ")
    .replace(/^DELETE /, "DELETE ")
    .replace(" from ", " · 来源 ")
    .replace(" as ", " · 主体 ")
}

function parseEventSubtitle(subtitle: string) {
  const asMatch = subtitle.match(/^([A-Z]+)\s+(\S+)\s+from\s+(\S+)(?:\s+as\s+(.+))?$/)
  if (!asMatch) {
    return {
      method: "GET",
      path: "/",
      ip: "未采集",
      subject: undefined as string | undefined,
    }
  }

  return {
    method: asMatch[1],
    path: asMatch[2],
    ip: asMatch[3],
    subject: asMatch[4],
  }
}

function translateRuleName(name: string) {
  const normalized = name.trim().toLowerCase()

  if (normalized === "protect-admin-surface-v2") {
    return "保护管理后台访问"
  }
  if (normalized === "protect-login-ip" || normalized === "protect-login-user") {
    return "收紧登录接口限流"
  }

  return name
}

function translateRuleSummary(summary: string, ruleName?: string) {
  if (ruleName?.trim().toLowerCase() === "protect-admin-surface-v2") {
    return "收紧匿名用户对 /admin 的访问，仅保留已认证运维人员的正常访问。"
  }
  if (ruleName?.trim().toLowerCase() === "protect-login-ip" || ruleName?.trim().toLowerCase() === "protect-login-user") {
    return "针对登录接口增加更严格的限流，降低撞库、爆破和异常重试流量。"
  }

  return translateText(summary)
}

export function normalizeEventRows(events: EventItemDto[]) {
  return events.map((event, index) => {
    const parsed = parseEventSubtitle(event.subtitle)
    const ipVersion: "IPv4" | "IPv6" = parsed.ip.includes(":") ? "IPv6" : "IPv4"
    const loweredTitle = event.title.toLowerCase()
    const statusCode =
      event.statusCode ??
      (loweredTitle.includes("allow") ? 200 : loweredTitle.includes("rate") ? 429 : 403)
    const ruleMatch = event.title.match(/^([^[]+)/)
    const rule = ruleMatch?.[1]?.trim()

    return {
      id: `event-${index}`,
      timestamp: `${index + 1} 分钟前`,
      method: parsed.method,
      path: parsed.path,
      host: event.host?.trim() || undefined,
      subject: event.subject?.trim() || parsed.subject,
      statusCode,
      rule: rule ? translateEventTitle(rule).replace(/\s*\[.*\]/, "") : undefined,
      severity: getSeverity(event.severity),
      ip: parsed.ip,
      ipVersion,
      country: event.country?.trim() || undefined,
      countryCode: event.countryCode?.trim() || undefined,
      region: event.region?.trim() || undefined,
      city: event.city?.trim() || undefined,
      timezone: event.timezone?.trim() || undefined,
      asn: event.asn?.trim() || undefined,
      asnOrg: event.asnOrg?.trim() || undefined,
      isp: event.isp?.trim() || undefined,
      isProxy: event.isProxy ?? false,
      isVPN: event.isVpn ?? false,
      isTor: event.isTor ?? false,
      isDatacenter: event.isDatacenter ?? false,
      userAgent: event.userAgent?.trim() || undefined,
      responseTime: event.responseTimeMs ?? undefined,
      requestId: event.requestId ?? undefined,
    }
  })
}

export function defaultIpInfoFromEventRows(rows: ReturnType<typeof normalizeEventRows>) {
  const first = rows[0]
  if (!first) {
    return {
      ip: "未采集",
      version: "IPv4" as const,
      country: "未知",
      city: "未知",
      requestCount: 0,
      lastSeen: "暂无记录",
    }
  }

  return {
    ip: first.ip,
    version: first.ipVersion as "IPv4" | "IPv6",
    country: first.country ?? "未知",
    countryCode: first.countryCode,
    region: first.region,
    city: first.city,
    timezone: first.timezone,
    asn: first.asn,
    asnOrg: first.asnOrg,
    isp: first.isp,
    isProxy: first.isProxy,
    isVPN: first.isVPN,
    isTor: first.isTor,
    isDatacenter: first.isDatacenter,
    threatLevel: first.severity === "critical" ? "high" as const : first.severity === "warning" ? "medium" as const : "low" as const,
    requestCount: rows.length,
    lastSeen: first.timestamp,
  }
}

export function buildLiveEventStats(rows: EventRow[]) {
  const safeRows = rows.length > 0 ? rows : []
  const total = safeRows.length || 1
  const blockedRows = safeRows.filter((row) => row.statusCode >= 400)
  const requestTrend = Array.from({ length: Math.min(Math.max(safeRows.length, 4), 8) }, (_, bucketIndex) => {
    const bucketSize = Math.max(1, Math.ceil(total / Math.min(Math.max(safeRows.length, 4), 8)))
    const start = bucketIndex * bucketSize
    const slice = safeRows.slice(start, start + bucketSize)
    return {
      time: `T${bucketIndex + 1}`,
      requests: slice.length,
      blocked: slice.filter((row) => row.statusCode >= 400).length,
    }
  })

  const geoMap = new Map<string, { country: string; code: string; requests: number; blocked: number }>()
  for (const row of safeRows) {
    const key = row.countryCode ?? row.country ?? "UN"
    const country = row.country ?? "未知"
    const current = geoMap.get(key) ?? { country, code: key, requests: 0, blocked: 0 }
    current.requests += 1
    if (row.statusCode >= 400) current.blocked += 1
    geoMap.set(key, current)
  }

  const categoryMap = new Map<string, number>()
  for (const row of safeRows) {
    const category = row.statusCode >= 400 ? "阻断 / 限流" : row.rule ? "策略放行" : "正常通过"
    categoryMap.set(category, (categoryMap.get(category) ?? 0) + 1)
  }

  const eventCategories = Array.from(categoryMap.entries()).map(([name, value], index) => ({
    name,
    value,
    color: ["hsl(var(--destructive))", "hsl(var(--primary))", "hsl(var(--status-info))"][index % 3],
  }))

  const ipv4 = safeRows.filter((row) => row.ipVersion === "IPv4").length
  const ipv6 = safeRows.filter((row) => row.ipVersion === "IPv6").length
  const realtimeTraffic = safeRows.slice(0, 12).reverse().map((row, index) => ({
    time: `${index + 1}`,
    value: row.statusCode >= 400 ? 2 : 1,
  }))

  const attackers = new Map<string, { ip: string; version: "IPv4" | "IPv6"; country: string; requests: number; blocked: number }>()
  for (const row of safeRows) {
    const current = attackers.get(row.ip) ?? {
      ip: row.ip,
      version: row.ipVersion,
      country: row.country ?? "未知",
      requests: 0,
      blocked: 0,
    }
    current.requests += 1
    if (row.statusCode >= 400) current.blocked += 1
    attackers.set(row.ip, current)
  }

  const topAttackers = Array.from(attackers.values())
    .sort((a, b) => b.blocked - a.blocked || b.requests - a.requests)
    .slice(0, 5)

  return {
    requestTrend,
    geoDistribution: Array.from(geoMap.values()).slice(0, 6),
    eventCategories,
    ipVersionStats: {
      ipv4,
      ipv6,
    },
    realtimeTraffic,
    topAttackers,
  }
}

export function buildCountryOptions(rows: EventRow[]) {
  return Array.from(
    new Map(
      rows
        .filter((row) => row.country && row.countryCode)
        .map((row) => [row.countryCode as string, { label: row.country as string, value: row.countryCode as string }])
    ).values()
  )
}

export function buildHostOptions(rows: EventRow[]) {
  return Array.from(
    new Map(
      rows
        .filter((row) => row.host)
        .map((row) => [row.host as string, { label: row.host as string, value: row.host as string }])
    ).values()
  ).sort((a, b) => a.label.localeCompare(b.label))
}

export async function getDashboardOverview() {
  return request<ConsoleResponse<DashboardOverviewDto>>("/api/console/dashboard")
}

export async function getEventsOverview() {
  return request<ConsoleResponse<EventsOverviewDto>>("/api/console/events")
}

export async function getRulesOverview() {
  return request<ConsoleResponse<RulesOverviewDto>>("/api/console/rules")
}

export async function getSuggestionsOverview() {
  return request<ConsoleResponse<SuggestionsOverviewDto>>("/api/console/suggestions")
}

export async function getApprovalsOverview() {
  return request<ConsoleResponse<ApprovalsOverviewDto>>("/api/console/approvals")
}

export async function approveRule(ruleName: string) {
  return request<void>(`/api/console/approvals/${encodeURIComponent(ruleName)}/approve`, {
    method: "POST",
  })
}

export async function requestRuleRevision(ruleName: string) {
  return request<void>(`/api/console/approvals/${encodeURIComponent(ruleName)}/revision`, {
    method: "POST",
  })
}

export async function getSettingsOverview() {
  return request<ConsoleResponse<SettingsOverviewDto>>("/api/console/settings")
}

export async function updateSettings(settings: SettingsStateDto) {
  return request<ConsoleResponse<SettingsOverviewDto>>("/api/console/settings", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      subject_header: settings.subjectHeader,
      email_header: settings.emailHeader,
      locale: settings.locale,
      notes: settings.notes,
      shadow_mode_enabled: settings.shadowModeEnabled,
    }),
  })
}
