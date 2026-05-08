"use client"

import { useCallback, useEffect, useId, useMemo, useState, useTransition, type ReactNode } from "react"
import {
  PageHeader,
  MetricCard,
  MetricsGrid,
  FilterBar,
  DetailListCard,
} from "@/components/console"
import {
  Bot,
  Link2,
  Radar,
  Settings as SettingsIcon,
  Shield,
} from "lucide-react"
import {
  getSettingsOverview,
  normalizeDetails,
  normalizeFilters,
  normalizeMetrics,
  updateSettings,
} from "@/lib/console-api"
import { toast } from "sonner"
import type { AppConfigDto, SettingsOverviewDto } from "@/lib/console-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/components/i18n-provider"
import { cn } from "@/lib/utils"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

const iconMap = [SettingsIcon, Link2, Radar]
const sectionOrder = ["identity", "security", "ai", "observability"] as const

type SettingsSection = (typeof sectionOrder)[number]

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
}

function joinLines(values: string[]) {
  return values.join("\n")
}

function SettingsPanel({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-2xl border border-border/80 bg-muted/20 p-4 sm:p-5", className)}>
      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  )
}

function SettingToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
  id,
  ariaLabel,
}: {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  id: string
  ariaLabel: string
}) {
  return (
    <div className="flex min-h-16 items-start justify-between gap-4 rounded-xl border border-border/60 bg-background/70 px-4 py-3">
      <div className="space-y-1">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} aria-label={ariaLabel} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function FieldGroup({
  htmlFor,
  label,
  description,
  children,
  className,
}: {
  htmlFor?: string
  label: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="space-y-1">
        <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">{label}</Label>
        {description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  )
}

function SectionIntro({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-background text-muted-foreground">
        {icon}
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function TokenList({
  items,
  emptyLabel,
}: {
  items: string[]
  emptyLabel: string
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item} variant="outline" className="min-h-7 rounded-full px-2.5 font-mono text-xs">
          {item}
        </Badge>
      ))}
    </div>
  )
}

export default function SettingsPage() {
  const { locale: currentLocale, setLocale: setShellLocale, t } = useI18n()
  const [activeFilter, setActiveFilter] = useState("identity")
  const [searchValue, setSearchValue] = useState("")
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<SettingsOverviewDto | null>(null)
  const [initialConfig, setInitialConfig] = useState<AppConfigDto | null>(null)
  const [config, setConfig] = useState<AppConfigDto | null>(null)
  const [locale, setLocale] = useState<"en" | "zh-CN">("zh-CN")
  const [notes, setNotes] = useState("")
  const [shadowModeEnabled, setShadowModeEnabled] = useState(true)
  const consoleLanguageId = useId()
  const notesId = useId()
  const identityModeId = useId()
  const providerHintId = useId()
  const authenticatedHeaderId = useId()
  const subjectHeaderId = useId()
  const emailHeaderId = useId()
  const groupsHeaderId = useId()
  const providerHeaderId = useId()
  const listenAddrId = useId()
  const databaseUrlId = useId()
  const consoleAdminGroupsId = useId()
  const adminPrefixesId = useId()
  const loginIpRuleId = useId()
  const loginIpPathId = useId()
  const loginIpRpsId = useId()
  const loginIpBurstId = useId()
  const loginUserRuleId = useId()
  const loginUserPathId = useId()
  const loginUserRpsId = useId()
  const loginUserBurstId = useId()
  const aiProviderId = useId()
  const aiModelId = useId()
  const aiApiKeyEnvId = useId()
  const aiBaseUrlId = useId()
  const aiTimeoutId = useId()
  const aiSystemPromptId = useId()
  const logPathId = useId()
  const pollIntervalId = useId()
  const mmdbPathId = useId()
  const shadowModeSwitchId = useId()
  const aiEnabledSwitchId = useId()
  const caddyLogEnabledSwitchId = useId()
  const geoipEnabledSwitchId = useId()

  const copy = useMemo(
    () =>
      currentLocale === "zh-CN"
        ? {
            runtimeIntro: "控制台语言、影子模式和运维备注，决定了这套控制台如何被团队日常使用。",
            identityIntro: "这里定义 Gatewarden 如何信任上游身份信息，并把外部认证头收口成统一主体模型。",
            securityIntro: "保护逻辑和接入边界都在这里。把运行基础、管理组和真实保护阈值分开处理，会更容易上线和回滚。",
            aiIntro: "AI 只负责建议和解释，不直接替你执行。这里配置模型来源、超时和系统提示词。",
            observabilityIntro: "状态码、响应时间、域名和 GeoIP 解析都依赖这里的采集链路。观测不完整，后面的判断都会失真。",
            runtimePanelTitle: "运行方式",
            runtimePanelDescription: "控制台层面的设置，优先影响运维视角和默认发布姿态。",
            identityPanelTitle: "身份来源",
            identityPanelDescription: "说明 Gatewarden 当前依赖谁来完成认证，以及如何识别这个来源。",
            headersPanelTitle: "受信身份头",
            headersPanelDescription: "这些头会被映射到统一主体模型。字段名必须和你的真实代理链保持一致。",
            gatewayPanelTitle: "网关与存储",
            gatewayPanelDescription: "这里只放运行基座参数，便于排查监听端口、数据库连接和部署差异。",
            consolePanelTitle: "控制台访问边界",
            consolePanelDescription: "控制台管理员组和已接入域名分开看。域名接入状态由真实事件自动判定，不需要手工登记。",
            adminPanelTitle: "管理面保护默认值",
            adminPanelDescription: "命中这些路径前缀时，Gatewarden 会优先把请求当作管理面流量处理。",
            ipLimitPanelTitle: "登录 IP 限流",
            ipLimitPanelDescription: "适合先挡撞库和爆破。路径、持续速率和突发容量都要尽量贴近真实登录流量。",
            userLimitPanelTitle: "登录主体限流",
            userLimitPanelDescription: "当你已经有可靠主体标识时，再用主体维度限制异常重试会更准确。",
            aiPanelTitle: "模型连接",
            aiPanelDescription: "支持 OpenAI-compatible 入口，所以 provider、base URL 和模型名都需要可控。",
            promptPanelTitle: "系统提示词",
            promptPanelDescription: "这里只定义 AI 的分析边界和表达方式，不建议把业务规则直接写进提示词代替确定性策略。",
            logPanelTitle: "Caddy 访问日志",
            logPanelDescription: "事件流里的状态码、响应耗时、域名和 User-Agent 都来自这里。",
            geoPanelTitle: "GeoIP 与 ASN",
            geoPanelDescription: "建议直接使用 MMDB，本地解析更稳定，也更适合自托管环境。",
            connectedHostsTitle: "已接入域名",
            connectedHostsEmpty: "当前还没有从结构化配置里拿到已接入域名。",
            noSearchTitle: "没有匹配的配置分组",
            noSearchDescription: "换一个关键字，或者清空搜索后再切换分组。",
            summaryTitle: "当前运行姿态",
            detailTitle: "配置说明",
            dirty: "有未保存修改",
            clean: "与已保存配置一致",
            reload: "重新拉取",
            saveHint: "保存后会写回当前后端配置。涉及身份映射、日志采集或监听地址的改动，通常还需要重启 Gatewarden 才会完全生效。",
            summaryLocale: "控制台语言",
            summaryShadow: "默认发布姿态",
            summaryAi: "AI 建议",
            summaryLogs: "日志采集",
            summaryGeo: "GeoIP 解析",
            enabled: "已启用",
            disabled: "未启用",
            shadowOn: "影子模式",
            shadowOff: "直接强制",
          }
        : {
            runtimeIntro: "Console language, rollout posture, and operator notes shape how the team uses this surface day to day.",
            identityIntro: "This defines how Gatewarden trusts upstream identity context and maps it into a canonical subject model.",
            securityIntro: "Protection logic and rollout boundaries live here. Separating runtime plumbing, admin access, and real thresholds makes deployment easier to reason about.",
            aiIntro: "AI only assists with suggestions and explanations. It does not directly enforce policy from here.",
            observabilityIntro: "Status codes, latency, hosts, and GeoIP all depend on this collection path. Weak observability makes every later decision less trustworthy.",
            runtimePanelTitle: "Runtime posture",
            runtimePanelDescription: "These are console-level settings that change operator experience and the default publication posture.",
            identityPanelTitle: "Identity source",
            identityPanelDescription: "Describe who authenticates traffic upstream and how Gatewarden recognizes that source.",
            headersPanelTitle: "Trusted identity headers",
            headersPanelDescription: "These headers are mapped into the canonical subject model and must match your real proxy chain.",
            gatewayPanelTitle: "Gateway and storage",
            gatewayPanelDescription: "Keep runtime plumbing here so listen address and database issues are easy to isolate.",
            consolePanelTitle: "Console access boundary",
            consolePanelDescription: "Admin groups and connected hosts are separated on purpose. Host connection state is inferred from real traffic, not maintained manually.",
            adminPanelTitle: "Admin surface defaults",
            adminPanelDescription: "Requests matching these prefixes are treated as privileged admin traffic by default.",
            ipLimitPanelTitle: "Login IP limiter",
            ipLimitPanelDescription: "Use this first against brute force and credential stuffing. Keep path, sustained rate, and burst aligned with real login traffic.",
            userLimitPanelTitle: "Login subject limiter",
            userLimitPanelDescription: "Once subject identity is reliable, a subject-based limiter is more precise for abnormal retries.",
            aiPanelTitle: "Model connection",
            aiPanelDescription: "OpenAI-compatible endpoints are expected, so provider, base URL, and model name must stay editable.",
            promptPanelTitle: "System prompt",
            promptPanelDescription: "This defines the AI analysis boundary and voice. Do not replace deterministic rules with prompt-only logic.",
            logPanelTitle: "Caddy access logs",
            logPanelDescription: "The event stream reads status codes, latency, hosts, and user agents from this pipeline.",
            geoPanelTitle: "GeoIP and ASN",
            geoPanelDescription: "MMDB is the better default here because local lookups are more stable for self-hosted environments.",
            connectedHostsTitle: "Connected hosts",
            connectedHostsEmpty: "No connected hosts were returned inside the structured config yet.",
            noSearchTitle: "No matching setting groups",
            noSearchDescription: "Try a different keyword, or clear search and switch sections again.",
            summaryTitle: "Current runtime posture",
            detailTitle: "Configuration notes",
            dirty: "Unsaved changes",
            clean: "Saved state",
            reload: "Reload",
            saveHint: "Saving writes back to the connected backend configuration. Changes to identity mapping, log collection, or listen address usually still require a Gatewarden restart to take full effect.",
            summaryLocale: "Console language",
            summaryShadow: "Default publication posture",
            summaryAi: "AI suggestions",
            summaryLogs: "Log ingestion",
            summaryGeo: "GeoIP resolution",
            enabled: "Enabled",
            disabled: "Disabled",
            shadowOn: "Shadow mode",
            shadowOff: "Direct enforce",
          },
    [currentLocale]
  )

  const loadSettings = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await getSettingsOverview()
      setData(response.data)
      setConfig(response.data.config ?? null)
      setInitialConfig(response.data.config ?? null)
      setLocale(response.data.settings.locale === "en" ? "en" : "zh-CN")
      setNotes(response.data.settings.notes)
      setShadowModeEnabled(response.data.settings.shadowModeEnabled)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("page.settings.toast.loadError"))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSettings()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadSettings])

  const metrics = useMemo(
    () => normalizeMetrics(data?.metrics ?? [], currentLocale),
    [data?.metrics, currentLocale]
  )

  const filters = useMemo(
    () =>
      normalizeFilters(
        [
          { label: t("page.settings.filter.identity"), value: "identity" },
          { label: t("page.settings.filter.security"), value: "security" },
          { label: t("page.settings.filter.ai"), value: "ai" },
          { label: t("page.settings.filter.observability"), value: "observability" },
        ],
        currentLocale
      ).map((filter) => ({
        ...filter,
        active: filter.value === activeFilter,
      })),
    [activeFilter, currentLocale, t]
  )

  const normalizedDetails = useMemo(
    () => normalizeDetails(activeFilter === "all" ? data?.configDetails ?? [] : data?.details ?? [], currentLocale),
    [activeFilter, currentLocale, data?.configDetails, data?.details]
  )

  const filteredDetails = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase()
    if (keyword.length === 0) return normalizedDetails

    return normalizedDetails.filter((detail) =>
      [detail.label, detail.value, detail.description ?? ""].some((value) =>
        value.toLowerCase().includes(keyword)
      )
    )
  }, [normalizedDetails, searchValue])

  const updateConfig = (updater: (current: AppConfigDto) => AppConfigDto) => {
    setConfig((current) => (current ? updater(current) : current))
  }

  const activeSection = activeFilter === "all" ? "all" : (activeFilter as SettingsSection)

  const sectionSearchIndex = useMemo(() => {
    if (!config) {
      return {
        identity: "",
        security: "",
        ai: "",
        observability: "",
      } satisfies Record<SettingsSection, string>
    }

    return {
      identity: [
        t("page.settings.filter.identity"),
        copy.runtimeIntro,
        config.identity.mode,
        config.identity.providerHint,
        config.identity.trustedHeaders.authenticated,
        config.identity.trustedHeaders.subject,
        config.identity.trustedHeaders.email,
        config.identity.trustedHeaders.groups,
        config.identity.trustedHeaders.provider,
        notes,
        locale,
      ].join(" "),
      security: [
        t("page.settings.filter.security"),
        copy.securityIntro,
        config.server.listenAddr,
        config.database.url,
        ...config.security.consoleAdminGroups,
        ...config.security.protectedHosts,
        ...config.security.adminShadowPrefixes,
        config.security.loginIpLimit.ruleId,
        config.security.loginIpLimit.pathPrefix,
        String(config.security.loginIpLimit.rps),
        String(config.security.loginIpLimit.burst),
        config.security.loginUserLimit.ruleId,
        config.security.loginUserLimit.pathPrefix,
        String(config.security.loginUserLimit.rps),
        String(config.security.loginUserLimit.burst),
      ].join(" "),
      ai: [
        t("page.settings.filter.ai"),
        copy.aiIntro,
        config.ai.provider,
        config.ai.model,
        config.ai.apiKeyEnv,
        config.ai.baseUrl ?? "",
        config.ai.systemPrompt,
      ].join(" "),
      observability: [
        t("page.settings.filter.observability"),
        copy.observabilityIntro,
        config.observability.caddyAccessLog.path,
        String(config.observability.caddyAccessLog.pollIntervalMs),
        config.observability.geoip.databasePath,
      ].join(" "),
    }
  }, [config, copy.aiIntro, copy.observabilityIntro, copy.runtimeIntro, copy.securityIntro, locale, notes, t])

  const visibleSections = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase()
    const baseSections =
      activeSection === "all"
        ? [...sectionOrder]
        : sectionOrder.filter((section) => section === activeSection)

    if (keyword.length === 0) return baseSections

    return baseSections.filter((section) => sectionSearchIndex[section].toLowerCase().includes(keyword))
  }, [activeSection, searchValue, sectionSearchIndex])

  const initialLocale = data?.settings.locale === "en" ? "en" : "zh-CN"
  const isDirty = useMemo(() => {
    if (!data) return false
    if (config && initialConfig) {
      return (
        JSON.stringify(config) !== JSON.stringify(initialConfig) ||
        locale !== initialLocale ||
        notes !== data.settings.notes ||
        shadowModeEnabled !== data.settings.shadowModeEnabled
      )
    }
    return locale !== initialLocale || notes !== data.settings.notes || shadowModeEnabled !== data.settings.shadowModeEnabled
  }, [config, data, initialConfig, initialLocale, locale, notes, shadowModeEnabled])

  const summaryDetails = [
    {
      label: copy.summaryLocale,
      value: locale === "zh-CN" ? t("page.settings.locale.zh-CN") : t("page.settings.locale.en"),
    },
    {
      label: copy.summaryShadow,
      value: shadowModeEnabled ? copy.shadowOn : copy.shadowOff,
    },
    {
      label: copy.summaryAi,
      value: config?.ai.enabled ? copy.enabled : copy.disabled,
    },
    {
      label: copy.summaryLogs,
      value: config?.observability.caddyAccessLog.enabled ? copy.enabled : copy.disabled,
    },
    {
      label: copy.summaryGeo,
      value: config?.observability.geoip.enabled ? copy.enabled : copy.disabled,
    },
  ]

  const handleReset = () => {
    if (!data) return
    setConfig(initialConfig)
    setLocale(initialLocale)
    setShellLocale?.(initialLocale)
    setNotes(data.settings.notes)
    setShadowModeEnabled(data.settings.shadowModeEnabled)
    toast.message(t("page.settings.toast.reset"))
  }

  const handleSave = async () => {
    startTransition(async () => {
      try {
        await updateSettings({
          locale,
          notes,
          shadowModeEnabled,
          config: config ?? undefined,
        })
        setShellLocale?.(locale)
        toast.success(t("page.settings.toast.saveSuccess"))
        await loadSettings()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("page.settings.toast.saveError"))
      }
    })
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("page.settings.title")}
        description={t("page.settings.description")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="min-h-8 rounded-full px-2.5 text-xs">
              {isDirty ? copy.dirty : copy.clean}
            </Badge>
            <Button variant="outline" size="sm" className="min-h-11 rounded-lg px-3 text-xs" onClick={() => void loadSettings()}>
              {copy.reload}
            </Button>
          </div>
        }
      />

      <MetricsGrid columns={3}>
        {metrics.map((metric, index) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
            icon={iconMap[index]}
          />
        ))}
      </MetricsGrid>

      <FilterBar
        filters={filters}
        onFilterChange={setActiveFilter}
        searchPlaceholder={t("page.settings.search")}
        onSearch={setSearchValue}
        onExtraAction={() => toast.message(t("page.settings.toast.filterHelp"))}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="border-b border-border/80 px-5 py-4">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              {config ? t("page.settings.structuredTitle") : t("page.settings.unavailableTitle")}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {config ? t("page.settings.structuredDescription") : t("page.settings.unavailableDescription")}
            </p>
          </div>

          {config ? (
            <>
              <div className="space-y-8 px-5 py-5">
                {visibleSections.length === 0 ? (
                  <Empty className="px-5 py-12">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <SettingsIcon className="h-4 w-4" />
                      </EmptyMedia>
                      <EmptyTitle>{copy.noSearchTitle}</EmptyTitle>
                      <EmptyDescription className="max-w-md">{copy.noSearchDescription}</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : null}

                {visibleSections.includes("identity") ? (
                  <div className="space-y-5">
                    <SectionIntro
                      icon={<SettingsIcon className="h-4 w-4" />}
                      title={t("page.settings.filter.identity")}
                      description={copy.identityIntro}
                    />

                    <div className="grid gap-4 xl:grid-cols-2">
                      <SettingsPanel
                        title={copy.runtimePanelTitle}
                        description={copy.runtimePanelDescription}
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <FieldGroup htmlFor={consoleLanguageId} label={t("page.settings.field.consoleLanguage")}>
                            <Select value={locale} onValueChange={(value) => setLocale(value as "en" | "zh-CN")}>
                              <SelectTrigger id={consoleLanguageId} aria-label={t("page.settings.field.consoleLanguage")}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="zh-CN">{t("page.settings.locale.zh-CN")}</SelectItem>
                                <SelectItem value="en">{t("page.settings.locale.en")}</SelectItem>
                              </SelectContent>
                            </Select>
                          </FieldGroup>
                        </div>

                        <SettingToggleRow
                          id={shadowModeSwitchId}
                          ariaLabel={t("page.settings.field.shadowMode")}
                          title={t("page.settings.field.shadowMode")}
                          description={t("page.settings.field.shadowModeHint")}
                          checked={shadowModeEnabled}
                          onCheckedChange={setShadowModeEnabled}
                        />

                        <FieldGroup htmlFor={notesId} label={t("page.settings.field.notes")}>
                          <Textarea
                            id={notesId}
                            rows={5}
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder={t("page.settings.notesPlaceholder")}
                          />
                        </FieldGroup>
                      </SettingsPanel>

                      <SettingsPanel
                        title={copy.identityPanelTitle}
                        description={copy.identityPanelDescription}
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <FieldGroup htmlFor={identityModeId} label={t("page.settings.field.identityMode")}>
                            <Input
                              id={identityModeId}
                              value={config.identity.mode}
                              onChange={(event) =>
                                updateConfig((current) => ({
                                  ...current,
                                  identity: { ...current.identity, mode: event.target.value },
                                }))
                              }
                            />
                          </FieldGroup>

                          <FieldGroup htmlFor={providerHintId} label={t("page.settings.field.providerHint")}>
                            <Input
                              id={providerHintId}
                              value={config.identity.providerHint}
                              onChange={(event) =>
                                updateConfig((current) => ({
                                  ...current,
                                  identity: { ...current.identity, providerHint: event.target.value },
                                }))
                              }
                            />
                          </FieldGroup>
                        </div>
                      </SettingsPanel>

                      <SettingsPanel
                        title={copy.headersPanelTitle}
                        description={copy.headersPanelDescription}
                        className="xl:col-span-2"
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <FieldGroup htmlFor={authenticatedHeaderId} label={t("page.settings.field.authenticatedHeader")}>
                            <Input
                              id={authenticatedHeaderId}
                              value={config.identity.trustedHeaders.authenticated}
                              onChange={(event) =>
                                updateConfig((current) => ({
                                  ...current,
                                  identity: {
                                    ...current.identity,
                                    trustedHeaders: {
                                      ...current.identity.trustedHeaders,
                                      authenticated: event.target.value,
                                    },
                                  },
                                }))
                              }
                            />
                          </FieldGroup>

                          <FieldGroup htmlFor={subjectHeaderId} label={t("page.settings.field.subjectHeader")}>
                            <Input
                              id={subjectHeaderId}
                              value={config.identity.trustedHeaders.subject}
                              onChange={(event) =>
                                updateConfig((current) => ({
                                  ...current,
                                  identity: {
                                    ...current.identity,
                                    trustedHeaders: {
                                      ...current.identity.trustedHeaders,
                                      subject: event.target.value,
                                    },
                                  },
                                }))
                              }
                            />
                          </FieldGroup>

                          <FieldGroup htmlFor={emailHeaderId} label={t("page.settings.field.emailHeader")}>
                            <Input
                              id={emailHeaderId}
                              value={config.identity.trustedHeaders.email}
                              onChange={(event) =>
                                updateConfig((current) => ({
                                  ...current,
                                  identity: {
                                    ...current.identity,
                                    trustedHeaders: {
                                      ...current.identity.trustedHeaders,
                                      email: event.target.value,
                                    },
                                  },
                                }))
                              }
                            />
                          </FieldGroup>

                          <FieldGroup htmlFor={groupsHeaderId} label={t("page.settings.field.groupsHeader")}>
                            <Input
                              id={groupsHeaderId}
                              value={config.identity.trustedHeaders.groups}
                              onChange={(event) =>
                                updateConfig((current) => ({
                                  ...current,
                                  identity: {
                                    ...current.identity,
                                    trustedHeaders: {
                                      ...current.identity.trustedHeaders,
                                      groups: event.target.value,
                                    },
                                  },
                                }))
                              }
                            />
                          </FieldGroup>

                          <FieldGroup
                            htmlFor={providerHeaderId}
                            label={t("page.settings.field.providerHeader")}
                            className="md:col-span-2"
                          >
                            <Input
                              id={providerHeaderId}
                              value={config.identity.trustedHeaders.provider}
                              onChange={(event) =>
                                updateConfig((current) => ({
                                  ...current,
                                  identity: {
                                    ...current.identity,
                                    trustedHeaders: {
                                      ...current.identity.trustedHeaders,
                                      provider: event.target.value,
                                    },
                                  },
                                }))
                              }
                            />
                          </FieldGroup>
                        </div>
                      </SettingsPanel>
                    </div>
                  </div>
                ) : null}

                {visibleSections.includes("security") ? (
                  <div className="space-y-5">
                    <SectionIntro
                      icon={<Shield className="h-4 w-4" />}
                      title={t("page.settings.filter.security")}
                      description={copy.securityIntro}
                    />

                    <div className="grid gap-4 xl:grid-cols-2">
                      <SettingsPanel
                        title={copy.gatewayPanelTitle}
                        description={copy.gatewayPanelDescription}
                      >
                        <FieldGroup htmlFor={listenAddrId} label={t("page.settings.field.listenAddr")}>
                          <Input
                            id={listenAddrId}
                            value={config.server.listenAddr}
                            onChange={(event) =>
                              updateConfig((current) => ({
                                ...current,
                                server: { ...current.server, listenAddr: event.target.value },
                              }))
                            }
                          />
                        </FieldGroup>

                        <FieldGroup htmlFor={databaseUrlId} label={t("page.settings.field.databaseUrl")}>
                          <Input
                            id={databaseUrlId}
                            value={config.database.url}
                            onChange={(event) =>
                              updateConfig((current) => ({
                                ...current,
                                database: { ...current.database, url: event.target.value },
                              }))
                            }
                          />
                        </FieldGroup>
                      </SettingsPanel>

                      <SettingsPanel
                        title={copy.consolePanelTitle}
                        description={copy.consolePanelDescription}
                      >
                        <FieldGroup htmlFor={consoleAdminGroupsId} label={t("page.settings.field.consoleAdminGroups")}>
                          <Textarea
                            id={consoleAdminGroupsId}
                            rows={5}
                            value={joinLines(config.security.consoleAdminGroups)}
                            onChange={(event) =>
                              updateConfig((current) => ({
                                ...current,
                                security: {
                                  ...current.security,
                                  consoleAdminGroups: splitLines(event.target.value),
                                },
                              }))
                            }
                            placeholder={"admin\nops"}
                          />
                        </FieldGroup>

                        <FieldGroup
                          label={copy.connectedHostsTitle}
                          description={t("page.settings.field.protectedHostsHint")}
                        >
                          <TokenList
                            items={config.security.protectedHosts}
                            emptyLabel={copy.connectedHostsEmpty}
                          />
                        </FieldGroup>
                      </SettingsPanel>

                      <SettingsPanel
                        title={copy.adminPanelTitle}
                        description={copy.adminPanelDescription}
                        className="xl:col-span-2"
                      >
                        <FieldGroup htmlFor={adminPrefixesId} label={t("page.settings.field.adminPrefixes")}>
                          <Textarea
                            id={adminPrefixesId}
                            rows={5}
                            value={joinLines(config.security.adminShadowPrefixes)}
                            onChange={(event) =>
                              updateConfig((current) => ({
                                ...current,
                                security: {
                                  ...current.security,
                                  adminShadowPrefixes: splitLines(event.target.value),
                                },
                              }))
                            }
                            placeholder={"/admin\n/dashboard/admin\n/ops"}
                          />
                        </FieldGroup>
                      </SettingsPanel>

                      <SettingsPanel
                        title={copy.ipLimitPanelTitle}
                        description={copy.ipLimitPanelDescription}
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <FieldGroup htmlFor={loginIpRuleId} label={t("page.settings.field.ruleId")}>
                            <Input
                              id={loginIpRuleId}
                              value={config.security.loginIpLimit.ruleId}
                              onChange={(event) =>
                                updateConfig((current) => ({
                                  ...current,
                                  security: {
                                    ...current.security,
                                    loginIpLimit: {
                                      ...current.security.loginIpLimit,
                                      ruleId: event.target.value,
                                    },
                                  },
                                }))
                              }
                            />
                          </FieldGroup>

                          <FieldGroup htmlFor={loginIpPathId} label={t("page.settings.field.pathPrefix")}>
                            <Input
                              id={loginIpPathId}
                              value={config.security.loginIpLimit.pathPrefix}
                              onChange={(event) =>
                                updateConfig((current) => ({
                                  ...current,
                                  security: {
                                    ...current.security,
                                    loginIpLimit: {
                                      ...current.security.loginIpLimit,
                                      pathPrefix: event.target.value,
                                    },
                                  },
                                }))
                              }
                            />
                          </FieldGroup>

                          <FieldGroup htmlFor={loginIpRpsId} label={t("page.settings.field.rps")}>
                            <Input
                              id={loginIpRpsId}
                              type="number"
                              value={config.security.loginIpLimit.rps}
                              onChange={(event) =>
                                updateConfig((current) => ({
                                  ...current,
                                  security: {
                                    ...current.security,
                                    loginIpLimit: {
                                      ...current.security.loginIpLimit,
                                      rps: Number(event.target.value) || 0,
                                    },
                                  },
                                }))
                              }
                            />
                          </FieldGroup>

                          <FieldGroup htmlFor={loginIpBurstId} label={t("page.settings.field.burst")}>
                            <Input
                              id={loginIpBurstId}
                              type="number"
                              value={config.security.loginIpLimit.burst}
                              onChange={(event) =>
                                updateConfig((current) => ({
                                  ...current,
                                  security: {
                                    ...current.security,
                                    loginIpLimit: {
                                      ...current.security.loginIpLimit,
                                      burst: Number(event.target.value) || 0,
                                    },
                                  },
                                }))
                              }
                            />
                          </FieldGroup>
                        </div>
                      </SettingsPanel>

                      <SettingsPanel
                        title={copy.userLimitPanelTitle}
                        description={copy.userLimitPanelDescription}
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <FieldGroup htmlFor={loginUserRuleId} label={t("page.settings.field.ruleId")}>
                            <Input
                              id={loginUserRuleId}
                              value={config.security.loginUserLimit.ruleId}
                              onChange={(event) =>
                                updateConfig((current) => ({
                                  ...current,
                                  security: {
                                    ...current.security,
                                    loginUserLimit: {
                                      ...current.security.loginUserLimit,
                                      ruleId: event.target.value,
                                    },
                                  },
                                }))
                              }
                            />
                          </FieldGroup>

                          <FieldGroup htmlFor={loginUserPathId} label={t("page.settings.field.pathPrefix")}>
                            <Input
                              id={loginUserPathId}
                              value={config.security.loginUserLimit.pathPrefix}
                              onChange={(event) =>
                                updateConfig((current) => ({
                                  ...current,
                                  security: {
                                    ...current.security,
                                    loginUserLimit: {
                                      ...current.security.loginUserLimit,
                                      pathPrefix: event.target.value,
                                    },
                                  },
                                }))
                              }
                            />
                          </FieldGroup>

                          <FieldGroup htmlFor={loginUserRpsId} label={t("page.settings.field.rps")}>
                            <Input
                              id={loginUserRpsId}
                              type="number"
                              value={config.security.loginUserLimit.rps}
                              onChange={(event) =>
                                updateConfig((current) => ({
                                  ...current,
                                  security: {
                                    ...current.security,
                                    loginUserLimit: {
                                      ...current.security.loginUserLimit,
                                      rps: Number(event.target.value) || 0,
                                    },
                                  },
                                }))
                              }
                            />
                          </FieldGroup>

                          <FieldGroup htmlFor={loginUserBurstId} label={t("page.settings.field.burst")}>
                            <Input
                              id={loginUserBurstId}
                              type="number"
                              value={config.security.loginUserLimit.burst}
                              onChange={(event) =>
                                updateConfig((current) => ({
                                  ...current,
                                  security: {
                                    ...current.security,
                                    loginUserLimit: {
                                      ...current.security.loginUserLimit,
                                      burst: Number(event.target.value) || 0,
                                    },
                                  },
                                }))
                              }
                            />
                          </FieldGroup>
                        </div>
                      </SettingsPanel>
                    </div>
                  </div>
                ) : null}

                {visibleSections.includes("ai") ? (
                  <div className="space-y-5">
                    <SectionIntro
                      icon={<Bot className="h-4 w-4" />}
                      title={t("page.settings.filter.ai")}
                      description={copy.aiIntro}
                    />

                    <div className="grid gap-4 xl:grid-cols-2">
                      <SettingsPanel title={copy.aiPanelTitle} description={copy.aiPanelDescription}>
                        <SettingToggleRow
                          id={aiEnabledSwitchId}
                          ariaLabel={t("page.settings.field.aiEnabled")}
                          title={t("page.settings.field.aiEnabled")}
                          description={t("page.settings.field.aiEnabledHint")}
                          checked={config.ai.enabled}
                          onCheckedChange={(checked) =>
                            updateConfig((current) => ({
                              ...current,
                              ai: { ...current.ai, enabled: checked },
                            }))
                          }
                        />

                        <div className="grid gap-4 md:grid-cols-2">
                          <FieldGroup htmlFor={aiProviderId} label={t("page.settings.field.provider")}>
                            <Input
                              id={aiProviderId}
                              value={config.ai.provider}
                              onChange={(event) =>
                                updateConfig((current) => ({
                                  ...current,
                                  ai: { ...current.ai, provider: event.target.value },
                                }))
                              }
                            />
                          </FieldGroup>

                          <FieldGroup htmlFor={aiModelId} label={t("page.settings.field.model")}>
                            <Input
                              id={aiModelId}
                              value={config.ai.model}
                              onChange={(event) =>
                                updateConfig((current) => ({
                                  ...current,
                                  ai: { ...current.ai, model: event.target.value },
                                }))
                              }
                            />
                          </FieldGroup>

                          <FieldGroup htmlFor={aiApiKeyEnvId} label={t("page.settings.field.apiKeyEnv")}>
                            <Input
                              id={aiApiKeyEnvId}
                              value={config.ai.apiKeyEnv}
                              onChange={(event) =>
                                updateConfig((current) => ({
                                  ...current,
                                  ai: { ...current.ai, apiKeyEnv: event.target.value },
                                }))
                              }
                            />
                          </FieldGroup>

                          <FieldGroup htmlFor={aiBaseUrlId} label={t("page.settings.field.baseUrl")}>
                            <Input
                              id={aiBaseUrlId}
                              value={config.ai.baseUrl ?? ""}
                              onChange={(event) =>
                                updateConfig((current) => ({
                                  ...current,
                                  ai: {
                                    ...current.ai,
                                    baseUrl: event.target.value.trim() ? event.target.value : null,
                                  },
                                }))
                              }
                              placeholder="https://api.openai.com/v1"
                            />
                          </FieldGroup>

                          <FieldGroup htmlFor={aiTimeoutId} label={t("page.settings.field.timeoutMs")} className="md:col-span-2">
                            <Input
                              id={aiTimeoutId}
                              type="number"
                              value={config.ai.timeoutMs}
                              onChange={(event) =>
                                updateConfig((current) => ({
                                  ...current,
                                  ai: { ...current.ai, timeoutMs: Number(event.target.value) || 0 },
                                }))
                              }
                            />
                          </FieldGroup>
                        </div>
                      </SettingsPanel>

                      <SettingsPanel title={copy.promptPanelTitle} description={copy.promptPanelDescription}>
                        <FieldGroup htmlFor={aiSystemPromptId} label={t("page.settings.field.systemPrompt")}>
                          <Textarea
                            id={aiSystemPromptId}
                            rows={13}
                            value={config.ai.systemPrompt}
                            onChange={(event) =>
                              updateConfig((current) => ({
                                ...current,
                                ai: { ...current.ai, systemPrompt: event.target.value },
                              }))
                            }
                          />
                        </FieldGroup>
                      </SettingsPanel>
                    </div>
                  </div>
                ) : null}

                {visibleSections.includes("observability") ? (
                  <div className="space-y-5">
                    <SectionIntro
                      icon={<Radar className="h-4 w-4" />}
                      title={t("page.settings.filter.observability")}
                      description={copy.observabilityIntro}
                    />

                    <div className="grid gap-4 xl:grid-cols-2">
                      <SettingsPanel title={copy.logPanelTitle} description={copy.logPanelDescription}>
                        <SettingToggleRow
                          id={caddyLogEnabledSwitchId}
                          ariaLabel={t("page.settings.section.caddyAccessLog")}
                          title={t("page.settings.section.caddyAccessLog")}
                          description={t("page.settings.field.caddyLogHint")}
                          checked={config.observability.caddyAccessLog.enabled}
                          onCheckedChange={(checked) =>
                            updateConfig((current) => ({
                              ...current,
                              observability: {
                                ...current.observability,
                                caddyAccessLog: {
                                  ...current.observability.caddyAccessLog,
                                  enabled: checked,
                                },
                              },
                            }))
                          }
                        />

                        <FieldGroup htmlFor={logPathId} label={t("page.settings.field.logPath")}>
                          <Input
                            id={logPathId}
                            value={config.observability.caddyAccessLog.path}
                            onChange={(event) =>
                              updateConfig((current) => ({
                                ...current,
                                observability: {
                                  ...current.observability,
                                  caddyAccessLog: {
                                    ...current.observability.caddyAccessLog,
                                    path: event.target.value,
                                  },
                                },
                              }))
                            }
                          />
                        </FieldGroup>

                        <FieldGroup htmlFor={pollIntervalId} label={t("page.settings.field.pollInterval")}>
                          <Input
                            id={pollIntervalId}
                            type="number"
                            value={config.observability.caddyAccessLog.pollIntervalMs}
                            onChange={(event) =>
                              updateConfig((current) => ({
                                ...current,
                                observability: {
                                  ...current.observability,
                                  caddyAccessLog: {
                                    ...current.observability.caddyAccessLog,
                                    pollIntervalMs: Number(event.target.value) || 0,
                                  },
                                },
                              }))
                            }
                          />
                        </FieldGroup>
                      </SettingsPanel>

                      <SettingsPanel title={copy.geoPanelTitle} description={copy.geoPanelDescription}>
                        <SettingToggleRow
                          id={geoipEnabledSwitchId}
                          ariaLabel={t("page.settings.section.geoip")}
                          title={t("page.settings.section.geoip")}
                          description={t("page.settings.field.geoHint")}
                          checked={config.observability.geoip.enabled}
                          onCheckedChange={(checked) =>
                            updateConfig((current) => ({
                              ...current,
                              observability: {
                                ...current.observability,
                                geoip: {
                                  ...current.observability.geoip,
                                  enabled: checked,
                                },
                              },
                            }))
                          }
                        />

                        <FieldGroup htmlFor={mmdbPathId} label={t("page.settings.field.mmdbPath")}>
                          <Input
                            id={mmdbPathId}
                            value={config.observability.geoip.databasePath}
                            onChange={(event) =>
                              updateConfig((current) => ({
                                ...current,
                                observability: {
                                  ...current.observability,
                                  geoip: {
                                    ...current.observability.geoip,
                                    databasePath: event.target.value,
                                  },
                                },
                              }))
                            }
                          />
                        </FieldGroup>
                      </SettingsPanel>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 border-t border-border/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">{copy.saveHint}</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="min-h-11 rounded-lg px-3 text-xs" onClick={handleReset}>
                    {t("common.reset")}
                  </Button>
                  <Button size="sm" className="min-h-11 rounded-lg px-3 text-xs" onClick={() => void handleSave()} disabled={isPending}>
                    {isPending ? t("common.saving") : t("common.save")}
                  </Button>
                </div>
              </div>
            </>
          ) : isLoading ? (
            <div className="px-5 py-8 text-sm text-muted-foreground">{t("page.settings.loading")}</div>
          ) : (
            <div className="space-y-6 px-5 py-5">
              <div className="grid gap-4 xl:grid-cols-2">
                <SettingsPanel
                  title={copy.runtimePanelTitle}
                  description={t("page.settings.unavailableRuntimeDescription")}
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldGroup htmlFor={consoleLanguageId} label={t("page.settings.field.consoleLanguage")}>
                      <Select value={locale} onValueChange={(value) => setLocale(value as "en" | "zh-CN")}>
                        <SelectTrigger id={consoleLanguageId} aria-label={t("page.settings.field.consoleLanguage")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="zh-CN">{t("page.settings.locale.zh-CN")}</SelectItem>
                          <SelectItem value="en">{t("page.settings.locale.en")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldGroup>
                  </div>

                  <SettingToggleRow
                    id={shadowModeSwitchId}
                    ariaLabel={t("page.settings.field.shadowMode")}
                    title={t("page.settings.field.shadowMode")}
                    description={t("page.settings.field.shadowModeHint")}
                    checked={shadowModeEnabled}
                    onCheckedChange={setShadowModeEnabled}
                  />

                  <FieldGroup htmlFor={notesId} label={t("page.settings.field.notes")}>
                    <Textarea
                      id={notesId}
                      rows={5}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder={t("page.settings.notesPlaceholder")}
                    />
                  </FieldGroup>
                </SettingsPanel>

                <SettingsPanel
                  title={t("page.settings.unavailableFallbackTitle")}
                  description={t("page.settings.unavailableFallbackDescription")}
                >
                  <DetailListCard details={filteredDetails} title={copy.detailTitle} />
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="min-h-11 rounded-lg px-3 text-xs" onClick={() => void loadSettings()}>
                      {t("page.settings.retry")}
                    </Button>
                  </div>
                </SettingsPanel>
              </div>

              <div className="flex flex-col gap-3 border-t border-border/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
                  {t("page.settings.unavailableSaveHint")}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="min-h-11 rounded-lg px-3 text-xs" onClick={handleReset}>
                    {t("common.reset")}
                  </Button>
                  <Button size="sm" className="min-h-11 rounded-lg px-3 text-xs" onClick={() => void handleSave()} disabled={isPending}>
                    {isPending ? t("common.saving") : t("common.save")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <DetailListCard details={summaryDetails} title={copy.summaryTitle} />
          <DetailListCard details={filteredDetails} title={copy.detailTitle} />
        </div>
      </div>
    </div>
  )
}
