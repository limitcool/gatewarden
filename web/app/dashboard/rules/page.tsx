"use client"

import { useCallback, useEffect, useId, useMemo, useState } from "react"
import {
  ConsolePanel,
  PageHeader,
  HelperText,
  InsetPanel,
  MetaLabel,
  MetricCard,
  MetricsGrid,
  FilterBar,
  PolicyTableCard,
  DetailListCard,
} from "@/components/console"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Shield, Zap, Target, Compass, ExternalLink, Github, Link2, PencilLine, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  buildHostInventory,
  createRule,
  deleteRule,
  getEventsOverview,
  getRulesOverview,
  normalizeDetails,
  normalizeEventRows,
  normalizeMetrics,
  normalizeRules,
  updateRule,
} from "@/lib/console-api"
import type { EventsOverviewDto, RuleRowDto, RulesOverviewDto, UpsertPolicyRuleRequest } from "@/lib/console-types"
import { useI18n } from "@/components/i18n-provider"

const iconMap = [Shield, Zap, Target]

type PlaybookKind = "admin-protect" | "rate-limit-ip" | "rate-limit-user"
type RuleFilter = "all" | "active" | "review" | "shadow" | PlaybookKind

type NormalizedRule = ReturnType<typeof normalizeRules>[number]

const caddySnippet = `(gatewarden_forward_auth) {
    forward_auth localhost:10040 {
        uri /api/forward-auth
        copy_headers Remote-User Remote-Email Remote-Groups X-Auth-Provider X-Authenticated X-Request-Id
    }
}`

function toPlaybookKind(value: string): PlaybookKind {
  if (value === "rate-limit-ip" || value === "rate-limit-user") {
    return value
  }
  return "admin-protect"
}

function parsePrefixes(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildDefaultRuleName(kind: PlaybookKind, host?: string, pathPrefix?: string) {
  const sanitize = (value?: string) =>
    (value || "global")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")

  if (kind === "admin-protect") {
    return `admin-protect-${sanitize(host)}`
  }

  return `${kind}-${sanitize(host)}-${sanitize(pathPrefix || "/")}`
}

function buildRulePayload(params: {
  kind: PlaybookKind
  name: string
  summary: string
  mode: string
  host?: string
  pathPrefix?: string
  rps?: number
  burst?: number
  adminPrefixes: string[]
  status?: string
}): UpsertPolicyRuleRequest {
  return {
    name: params.name.trim() || undefined,
    kind: params.kind,
    summary: params.summary.trim() || undefined,
    mode: params.mode,
    host: params.host?.trim() || undefined,
    pathPrefix: params.pathPrefix?.trim() || undefined,
    rps: params.rps,
    burst: params.burst,
    adminPrefixes: params.adminPrefixes,
    status: params.status,
    source: "manual",
  }
}

function formatPolicyStatus(status: string, t: (key: string, params?: Record<string, string | number>) => string) {
  switch (status) {
    case "active":
      return t("component.status.active")
    case "review":
      return t("component.status.review")
    case "shadow":
      return t("component.status.shadow")
    case "blocked":
      return t("component.status.blocked")
    case "info":
      return t("component.status.info")
    case "advisory":
      return t("component.status.advisory")
    default:
      return status
  }
}

function formatPolicyMode(mode: string, t: (key: string, params?: Record<string, string | number>) => string) {
  switch (mode) {
    case "enforce":
      return t("component.policy.mode.enforce")
    case "shadow":
      return t("component.policy.mode.shadow")
    case "advisory":
      return t("component.policy.mode.advisory")
    default:
      return mode
  }
}

export default function RulesPage() {
  const { t, locale } = useI18n()
  const [activeFilter, setActiveFilter] = useState<RuleFilter>("all")
  const [searchValue, setSearchValue] = useState("")
  const [selectedRuleName, setSelectedRuleName] = useState<string | null>(null)
  const [data, setData] = useState<RulesOverviewDto | null>(null)
  const [eventsData, setEventsData] = useState<EventsOverviewDto | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingRuleName, setEditingRuleName] = useState<string | null>(null)
  const [selectedHost, setSelectedHost] = useState<string | null>(null)
  const [selectedPlaybook, setSelectedPlaybook] = useState<PlaybookKind>("admin-protect")
  const [ruleName, setRuleName] = useState("")
  const [ruleSummary, setRuleSummary] = useState("")
  const [ruleMode, setRuleMode] = useState<"shadow" | "enforce">("shadow")
  const [adminPrefixesValue, setAdminPrefixesValue] = useState("")
  const [pathPrefixValue, setPathPrefixValue] = useState("")
  const [rpsValue, setRpsValue] = useState("5")
  const [burstValue, setBurstValue] = useState("10")
  const [isSavingRule, setIsSavingRule] = useState(false)
  const [isDeletingRule, setIsDeletingRule] = useState(false)
  const githubUrl = "https://github.com/limitcool/gatewarden"
  const ruleNameId = useId()
  const ruleSummaryId = useId()
  const adminPrefixesId = useId()
  const pathPrefixId = useId()
  const rpsId = useId()
  const burstId = useId()

  const loadRules = useCallback(async () => {
    try {
      const response = await getRulesOverview()
      setData(response.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("page.rules.toast.loadError"))
    }
  }, [t])

  const loadEvents = useCallback(async () => {
    try {
      const response = await getEventsOverview()
      setEventsData(response.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("page.events.toast.loadError"))
    }
  }, [t])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([loadRules(), loadEvents()])
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadEvents, loadRules])

  const hostInventory = useMemo(() => {
    return buildHostInventory(
      eventsData?.protectedHosts ?? [],
      eventsData?.observedHosts ?? [],
      normalizeEventRows(eventsData?.stream ?? [], locale)
    )
  }, [eventsData?.protectedHosts, eventsData?.observedHosts, eventsData?.stream, locale])

  const selectedHostItem = hostInventory.find((item) => item.host === selectedHost) ?? hostInventory[0]
  const protectedHostCount = hostInventory.filter((item) => item.isConnected).length
  const caddyOnlyHostCount = hostInventory.filter((item) => !item.isConnected).length

  const filters = useMemo(
    () => [
      { label: t("common.all"), value: "all" as RuleFilter, active: activeFilter === "all" },
      { label: t("component.status.active"), value: "active" as RuleFilter, active: activeFilter === "active" },
      { label: t("component.status.review"), value: "review" as RuleFilter, active: activeFilter === "review" },
      { label: t("component.status.shadow"), value: "shadow" as RuleFilter, active: activeFilter === "shadow" },
      { label: t("component.policy.kind.admin"), value: "admin-protect" as RuleFilter, active: activeFilter === "admin-protect" },
      { label: t("component.policy.kind.rateLimitIp"), value: "rate-limit-ip" as RuleFilter, active: activeFilter === "rate-limit-ip" },
      { label: t("component.policy.kind.rateLimitUser"), value: "rate-limit-user" as RuleFilter, active: activeFilter === "rate-limit-user" },
    ],
    [activeFilter, t]
  )

  const rules = useMemo(() => {
    const list = normalizeRules(data?.rules ?? [], locale)
    return list.filter((rule) => {
      const matchesFilter =
        activeFilter === "all" ||
        rule.status === activeFilter ||
        rule.mode === activeFilter ||
        rule.kind === activeFilter

      const keyword = searchValue.trim().toLowerCase()
      const matchesSearch =
        keyword.length === 0 ||
        rule.name.toLowerCase().includes(keyword) ||
        rule.summary.toLowerCase().includes(keyword) ||
        rule.scope.toLowerCase().includes(keyword) ||
        (rule.host?.toLowerCase().includes(keyword) ?? false) ||
        (rule.pathPrefix?.toLowerCase().includes(keyword) ?? false)

      return matchesFilter && matchesSearch
    })
  }, [data?.rules, activeFilter, searchValue, locale])

  const selectedRule = rules.find((rule) => rule.name === selectedRuleName) ?? rules[0]
  const details = normalizeDetails(data?.details ?? [], locale)

  const selectedDetails = selectedRule
    ? [
        { label: t("page.rules.detail.name"), value: selectedRule.name, description: t("page.rules.detail.nameDescription") },
        { label: t("page.rules.detail.kind"), value: t(`component.policy.kind.${selectedRule.kind === "admin-protect" ? "admin" : selectedRule.kind === "rate-limit-ip" ? "rateLimitIp" : "rateLimitUser"}`), description: t("page.rules.detail.kindDescription") },
        { label: t("page.rules.detail.host"), value: selectedRule.host ?? t("page.rules.detail.global"), description: t("page.rules.detail.hostDescription") },
        { label: t("page.rules.detail.path"), value: selectedRule.pathPrefix ?? (selectedRule.adminPrefixes[0] ?? t("page.rules.detail.notSet")), description: t("page.rules.detail.pathDescription") },
        { label: t("page.rules.detail.mode"), value: formatPolicyMode(selectedRule.mode, t), description: t("page.rules.detail.modeDescription") },
        { label: t("page.rules.detail.status"), value: formatPolicyStatus(selectedRule.status, t), description: t("page.rules.detail.statusDescription") },
        { label: t("page.rules.detail.rateLimit"), value: selectedRule.rps && selectedRule.burst ? `${selectedRule.rps} / ${selectedRule.burst}` : t("page.rules.detail.notSet"), description: t("page.rules.detail.rateLimitDescription") },
        { label: t("page.rules.detail.source"), value: selectedRule.source === "approved-ai" ? t("component.policy.source.approvedAi") : t("component.policy.source.manual"), description: t("page.rules.detail.sourceDescription") },
      ]
    : details

  const playbooks = useMemo(() => {
    const activeAdmin = rules.find((rule) => rule.kind === "admin-protect")
    const activeLoginIp = rules.find((rule) => rule.kind === "rate-limit-ip")
    const activeLoginUser = rules.find((rule) => rule.kind === "rate-limit-user")

    return [
      {
        kind: "admin-protect" as const,
        title: t("page.rules.playbook.adminTitle"),
        summary: t("page.rules.playbook.adminSummary"),
        status: activeAdmin?.status ?? "review",
      },
      {
        kind: "rate-limit-ip" as const,
        title: t("page.rules.playbook.loginIpTitle"),
        summary: t("page.rules.playbook.loginIpSummary"),
        status: activeLoginIp?.status ?? "review",
      },
      {
        kind: "rate-limit-user" as const,
        title: t("page.rules.playbook.loginUserTitle"),
        summary: t("page.rules.playbook.loginUserSummary"),
        status: activeLoginUser?.status ?? "review",
      },
    ]
  }, [rules, t])

  const hostChipClassName = (item: (typeof hostInventory)[number], isSelected: boolean) => {
    if (item.isConnected) {
      return isSelected
        ? "border-status-active/40 bg-status-active/15 text-status-active"
        : "border-status-active/30 bg-status-active/10 text-status-active hover:bg-status-active/15"
    }

    return isSelected
      ? "border-status-error/40 bg-status-error/15 text-status-error"
      : "border-status-error/30 bg-status-error/10 text-status-error hover:bg-status-error/15"
  }

  const resetForm = (kind: PlaybookKind, host?: string) => {
    setEditingRuleName(null)
    setSelectedPlaybook(kind)
    setSelectedHost(host ?? selectedHostItem?.host ?? null)
    setRuleMode(kind === "admin-protect" ? "shadow" : "enforce")
    setAdminPrefixesValue(kind === "admin-protect" ? "/admin" : "")
    setPathPrefixValue("/api/login")
    setRpsValue(kind === "rate-limit-user" ? "3" : "5")
    setBurstValue(kind === "rate-limit-user" ? "6" : "10")
    setRuleSummary("")
    setRuleName(buildDefaultRuleName(kind, host ?? selectedHostItem?.host, "/api/login"))
  }

  const openCreateDialog = () => {
    resetForm(selectedPlaybook, selectedHostItem?.host)
    setIsCreateOpen(true)
  }

  const openEditDialog = (rule: NormalizedRule) => {
    setEditingRuleName(rule.name)
    setSelectedPlaybook(toPlaybookKind(rule.kind))
    setSelectedHost(rule.host ?? selectedHostItem?.host ?? null)
    setRuleName(rule.name)
    setRuleSummary(rule.summary)
    setRuleMode(rule.mode === "shadow" ? "shadow" : "enforce")
    setAdminPrefixesValue(rule.adminPrefixes.join("\n"))
    setPathPrefixValue(rule.pathPrefix ?? "")
    setRpsValue(rule.rps ? String(rule.rps) : "")
    setBurstValue(rule.burst ? String(rule.burst) : "")
    setIsCreateOpen(true)
  }

  const selectedPlaybookDetail = useMemo(() => {
    if (selectedPlaybook === "admin-protect") {
      return {
        title: t("page.rules.ruleExplain.admin.title"),
        purpose: t("page.rules.ruleExplain.admin.purpose"),
        when: t("page.rules.ruleExplain.admin.when"),
        fields: [
          {
            name: t("page.rules.ruleForm.host"),
            example: "accounts.init.cool",
            description: t("page.rules.ruleForm.hostHint"),
          },
          {
            name: t("page.rules.ruleExplain.field.adminPrefixes.name"),
            example: "/admin\n/dashboard/admin",
            description: t("page.rules.ruleExplain.field.adminPrefixes.description"),
          },
          {
            name: t("page.rules.ruleExplain.field.mode.name"),
            example: "shadow -> enforce",
            description: t("page.rules.ruleExplain.field.mode.adminDescription"),
          },
        ],
      }
    }

    if (selectedPlaybook === "rate-limit-ip") {
      return {
        title: t("page.rules.ruleExplain.loginIp.title"),
        purpose: t("page.rules.ruleExplain.loginIp.purpose"),
        when: t("page.rules.ruleExplain.loginIp.when"),
        fields: [
          {
            name: t("page.rules.ruleForm.host"),
            example: "accounts.init.cool",
            description: t("page.rules.ruleForm.hostHint"),
          },
          {
            name: t("page.rules.ruleExplain.field.pathPrefix.name"),
            example: "/api/login",
            description: t("page.rules.ruleExplain.field.pathPrefix.description"),
          },
          {
            name: t("page.rules.ruleExplain.field.rps.name"),
            example: "5",
            description: t("page.rules.ruleExplain.field.rps.description"),
          },
          {
            name: t("page.rules.ruleExplain.field.burst.name"),
            example: "10",
            description: t("page.rules.ruleExplain.field.burst.description"),
          },
        ],
      }
    }

    return {
      title: t("page.rules.ruleExplain.loginUser.title"),
      purpose: t("page.rules.ruleExplain.loginUser.purpose"),
      when: t("page.rules.ruleExplain.loginUser.when"),
      fields: [
        {
          name: t("page.rules.ruleForm.host"),
          example: "accounts.init.cool",
          description: t("page.rules.ruleForm.hostHint"),
        },
        {
          name: t("page.rules.ruleExplain.field.pathPrefix.name"),
          example: "/api/login",
          description: t("page.rules.ruleExplain.field.pathPrefix.description"),
        },
        {
          name: t("page.rules.ruleExplain.field.rps.name"),
          example: "3",
          description: t("page.rules.ruleExplain.field.subjectRps.description"),
        },
        {
          name: t("page.rules.ruleExplain.field.burst.name"),
          example: "6",
          description: t("page.rules.ruleExplain.field.subjectBurst.description"),
        },
      ],
    }
  }, [selectedPlaybook, t])

  const syncGeneratedFields = (nextKind: PlaybookKind, nextHost?: string, nextPathPrefix?: string) => {
    if (!editingRuleName) {
      setRuleName(buildDefaultRuleName(nextKind, nextHost, nextPathPrefix))
    }

    if (!ruleSummary.trim()) {
      if (nextKind === "admin-protect") {
        setRuleSummary(t("page.rules.summary.admin", { host: nextHost ?? t("page.rules.detail.global") }))
      } else if (nextKind === "rate-limit-ip") {
        setRuleSummary(t("page.rules.summary.rateLimitIp", { path: nextPathPrefix || "/api/login" }))
      } else {
        setRuleSummary(t("page.rules.summary.rateLimitUser", { path: nextPathPrefix || "/api/login" }))
      }
    }
  }

  const handleMoreFilters = () => {
    toast.message(t("page.rules.toast.filterHelp"))
  }

  const handleCopyCaddy = async () => {
    await navigator.clipboard.writeText(caddySnippet)
    toast.success(t("page.rules.toast.caddyCopied"))
  }

  const validatePayload = (): UpsertPolicyRuleRequest | null => {
    if (!selectedHostItem?.isConnected) {
      toast.message(t("page.rules.guideHostRequired"))
      return null
    }

    const host = selectedHostItem.host

    if (selectedPlaybook === "admin-protect") {
      const adminPrefixes = parsePrefixes(adminPrefixesValue)
      if (adminPrefixes.length === 0) {
        toast.error(t("page.rules.toast.adminPrefixesRequired"))
        return null
      }

      return buildRulePayload({
        kind: "admin-protect",
        name: ruleName,
        summary: ruleSummary,
        mode: ruleMode,
        host,
        adminPrefixes,
        status: editingRuleName ? selectedRule?.status : "review",
      })
    }

    const pathPrefix = pathPrefixValue.trim()
    const rps = Number(rpsValue)
    const burst = Number(burstValue)

    if (!pathPrefix || !Number.isFinite(rps) || !Number.isFinite(burst) || rps <= 0 || burst <= 0) {
      toast.error(
        selectedPlaybook === "rate-limit-ip"
          ? t("page.rules.toast.loginIpInvalid")
          : t("page.rules.toast.loginUserInvalid")
      )
      return null
    }

    return buildRulePayload({
      kind: selectedPlaybook,
      name: ruleName,
      summary: ruleSummary,
      mode: ruleMode,
      host,
      pathPrefix,
      rps,
      burst,
      adminPrefixes: [],
      status: editingRuleName ? selectedRule?.status : "review",
    })
  }

  const handleSaveRule = async () => {
    const payload = validatePayload()
    if (!payload) {
      return
    }

    setIsSavingRule(true)

    try {
      const response = editingRuleName
        ? await updateRule(editingRuleName, payload)
        : await createRule(payload)
      setData(response.data)
      setSelectedRuleName(payload.name ?? editingRuleName ?? null)
      setIsCreateOpen(false)
      toast.success(editingRuleName ? t("page.rules.toast.updateSuccess") : t("page.rules.toast.createSuccess"))
      await loadEvents()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("page.rules.toast.ruleSaveError"))
    } finally {
      setIsSavingRule(false)
    }
  }

  const handleDeleteRule = async () => {
    if (!editingRuleName) {
      return
    }

    setIsDeletingRule(true)

    try {
      await deleteRule(editingRuleName)
      toast.success(t("page.rules.toast.deleteSuccess"))
      setIsCreateOpen(false)
      setSelectedRuleName(null)
      await Promise.all([loadRules(), loadEvents()])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("page.rules.toast.deleteError"))
    } finally {
      setIsDeletingRule(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("page.rules.title")}
        description={t("page.rules.description")}
        actions={
          <>
            <Button variant="outline" size="sm" className="min-h-11 rounded-lg px-2.5" asChild>
              <a href={githubUrl} target="_blank" rel="noreferrer">
                <Github className="h-4 w-4" />
                <span className="sr-only">{t("page.rules.github")}</span>
              </a>
            </Button>
            <Button size="sm" className="min-h-11 rounded-lg px-3" onClick={openCreateDialog}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {t("page.rules.create")}
            </Button>
          </>
        }
      />

      <MetricsGrid columns={3}>
        {normalizeMetrics(data?.metrics ?? [], locale).map((metric, index) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
            icon={iconMap[index]}
          />
        ))}
      </MetricsGrid>

      <ConsolePanel>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-foreground" />
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  {t("page.rules.hostCoverageTitle")}
                </h2>
              </div>
              <HelperText className="max-w-3xl">{t("page.rules.hostCoverageDescription")}</HelperText>
            </div>
            <div className="flex flex-wrap gap-2">
              {hostInventory.map((item) => (
                <button
                  key={item.host}
                  type="button"
                  onClick={() => setSelectedHost(item.host)}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors",
                    hostChipClassName(item, selectedHostItem?.host === item.host)
                  )}
                >
                  <span className="font-mono">{item.host}</span>
                  <span className="text-xs opacity-80">
                    {item.isConnected ? t("page.rules.hostProtected") : t("page.rules.hostCaddyOnly")}
                  </span>
                </button>
              ))}
              {hostInventory.length === 0 ? (
                <span className="text-sm text-muted-foreground">{t("page.rules.guideNoHosts")}</span>
              ) : null}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <InsetPanel>
              <MetaLabel>{t("page.rules.hostProtected")}</MetaLabel>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                {protectedHostCount}
              </div>
              <HelperText className="mt-1">{t("page.rules.hostProtectedCount", { count: protectedHostCount })}</HelperText>
            </InsetPanel>
            <InsetPanel>
              <MetaLabel>{t("page.rules.hostCaddyOnly")}</MetaLabel>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                {caddyOnlyHostCount}
              </div>
              <HelperText className="mt-1">{t("page.rules.hostCaddyOnlyCount", { count: caddyOnlyHostCount })}</HelperText>
            </InsetPanel>
          </div>
        </div>
      </ConsolePanel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
        <div className="space-y-6">
          <FilterBar
            filters={filters}
            onFilterChange={(value) => setActiveFilter(value as RuleFilter)}
            searchPlaceholder={t("page.rules.search")}
            onSearch={setSearchValue}
            onExtraAction={handleMoreFilters}
          />

          <PolicyTableCard
            rules={rules}
            title={t("page.rules.title")}
            selectedRuleId={selectedRule?.id ?? null}
            onRuleClick={(rule) => setSelectedRuleName(rule.name)}
          />
        </div>

        <div className="space-y-6">
          <ConsolePanel>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold tracking-tight text-foreground">
                  {t("page.rules.guideTitle")}
                </div>
                <HelperText className="mt-1">{t("page.rules.guideDescription")}</HelperText>
              </div>
              <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>

            <div className="mt-5 space-y-4">
              <InsetPanel>
                <div className="text-sm font-medium text-foreground">{t("page.rules.guideModelTitle")}</div>
                <HelperText className="mt-2">{t("page.rules.guideModelDescription")}</HelperText>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="min-h-11 rounded-lg px-3" onClick={() => void handleCopyCaddy()}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    {t("page.rules.guideCopyCaddy")}
                  </Button>
                  <Button variant="outline" size="sm" className="min-h-11 rounded-lg px-3" asChild>
                    <a href={githubUrl} target="_blank" rel="noreferrer">
                      <Github className="h-3.5 w-3.5 mr-1.5" />
                      {t("page.rules.githubDocs")}
                    </a>
                  </Button>
                </div>
              </InsetPanel>

              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">{t("page.rules.guidePlaybookTitle")}</div>
                <div className="grid gap-3">
                  {playbooks.map((playbook) => (
                    <button
                      key={playbook.kind}
                      type="button"
                      onClick={() => {
                        setSelectedPlaybook(playbook.kind)
                        resetForm(playbook.kind, selectedHostItem?.host)
                        setIsCreateOpen(true)
                      }}
                      className="rounded-xl border border-border/60 bg-background/70 p-4 text-left transition-colors hover:bg-muted/10"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-foreground">{playbook.title}</div>
                        <Badge variant="outline" className="min-h-6 rounded-full px-2 text-xs">
                          {formatPolicyStatus(playbook.status, t)}
                        </Badge>
                      </div>
                      <HelperText className="mt-2">{playbook.summary}</HelperText>
                    </button>
                  ))}
                </div>
              </div>

              {selectedRule ? (
                <InsetPanel>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">{t("page.rules.detail.quickActions")}</div>
                      <HelperText className="mt-1">{t("page.rules.detail.quickActionsDescription")}</HelperText>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="min-h-11 rounded-lg px-3" onClick={() => openEditDialog(selectedRule)}>
                        <PencilLine className="h-3.5 w-3.5 mr-1.5" />
                        {t("page.rules.edit")}
                      </Button>
                    </div>
                  </div>
                </InsetPanel>
              ) : null}
            </div>
          </ConsolePanel>

          <DetailListCard details={selectedDetails} title={t("page.rules.details")} />
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRuleName ? t("page.rules.editTitle") : t("page.rules.createTitle")}
            </DialogTitle>
            <DialogDescription>
              {editingRuleName ? t("page.rules.editDescription") : t("page.rules.createDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <InsetPanel>
              <div className="text-sm font-medium text-foreground">{t("page.rules.ruleExplainTitle")}</div>
              <div className="mt-3 space-y-4">
                <InsetPanel className="bg-background px-3.5 py-3.5">
                  <div className="text-sm font-semibold text-foreground">{selectedPlaybookDetail.title}</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <MetaLabel>{t("page.rules.ruleExplainPurpose")}</MetaLabel>
                      <HelperText>{selectedPlaybookDetail.purpose}</HelperText>
                    </div>
                    <div className="space-y-1.5">
                      <MetaLabel>{t("page.rules.ruleExplainWhen")}</MetaLabel>
                      <HelperText>{selectedPlaybookDetail.when}</HelperText>
                    </div>
                  </div>
                </InsetPanel>

                <div className="space-y-2">
                  <MetaLabel>{t("page.rules.ruleExplainFields")}</MetaLabel>
                  <div className="grid gap-2">
                    {selectedPlaybookDetail.fields.map((field) => (
                      <InsetPanel key={field.name} className="bg-background px-3.5 py-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-medium text-foreground">{field.name}</div>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            {field.example}
                          </code>
                        </div>
                        <HelperText className="mt-1.5 whitespace-pre-line">{field.description}</HelperText>
                      </InsetPanel>
                    ))}
                  </div>
                </div>
              </div>
            </InsetPanel>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("page.rules.ruleForm.playbook")}</Label>
                <div className="grid gap-2">
                  {playbooks.map((playbook) => (
                    <button
                      key={playbook.kind}
                      type="button"
                      onClick={() => {
                        setSelectedPlaybook(playbook.kind)
                        resetForm(playbook.kind, selectedHostItem?.host)
                      }}
                      className={cn(
                        "rounded-xl border px-3.5 py-3 text-left transition-colors",
                        selectedPlaybook === playbook.kind
                          ? "border-foreground bg-muted/40"
                          : "border-border/60 bg-background/70 hover:bg-muted/10"
                      )}
                    >
                      <div className="text-sm font-medium text-foreground">{playbook.title}</div>
                      <HelperText className="mt-1">{playbook.summary}</HelperText>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-border/60 bg-background/70 p-4">
                <div className="space-y-2">
                  <Label>{t("page.rules.ruleForm.host")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {hostInventory.map((item) => (
                      <button
                        key={`dialog-${item.host}`}
                        type="button"
                        onClick={() => {
                          setSelectedHost(item.host)
                          syncGeneratedFields(selectedPlaybook, item.host, pathPrefixValue)
                        }}
                        className={cn(
                          "inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors",
                          hostChipClassName(item, selectedHostItem?.host === item.host)
                        )}
                      >
                        <span className="font-mono">{item.host}</span>
                      </button>
                    ))}
                  </div>
                  <HelperText>{selectedHostItem?.isConnected ? t("page.rules.guideProtectedHint") : t("page.rules.guideCaddyOnlyHint")}</HelperText>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={ruleNameId}>{t("page.rules.ruleForm.name")}</Label>
                  <Input id={ruleNameId} value={ruleName} onChange={(event) => setRuleName(event.target.value)} placeholder="admin-protect-accounts-init-cool" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={ruleSummaryId}>{t("page.rules.ruleForm.summary")}</Label>
                  <Textarea id={ruleSummaryId} rows={3} value={ruleSummary} onChange={(event) => setRuleSummary(event.target.value)} placeholder={t("page.rules.createSummaryPlaceholder")} />
                </div>

                <div className="space-y-2">
                  <Label>{t("page.rules.ruleForm.mode")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {(["shadow", "enforce"] as const).map((mode) => (
                      <Button
                        key={mode}
                        type="button"
                        variant={ruleMode === mode ? "secondary" : "outline"}
                        size="sm"
                        className="min-h-11 rounded-lg px-3"
                        onClick={() => setRuleMode(mode)}
                      >
                        {mode === "shadow" ? t("component.policy.mode.shadow") : t("component.policy.mode.enforce")}
                      </Button>
                    ))}
                  </div>
                  <HelperText>{t("page.rules.ruleForm.modeHint")}</HelperText>
                </div>

                {selectedPlaybook === "admin-protect" ? (
                  <div className="space-y-2">
                    <Label htmlFor={adminPrefixesId}>{t("page.rules.ruleForm.adminPrefixes")}</Label>
                    <Textarea
                      id={adminPrefixesId}
                      rows={6}
                      value={adminPrefixesValue}
                      onChange={(event) => setAdminPrefixesValue(event.target.value)}
                      placeholder="/admin&#10;/dashboard/admin"
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor={pathPrefixId}>{t("page.rules.ruleForm.pathPrefix")}</Label>
                      <Input
                        id={pathPrefixId}
                        value={pathPrefixValue}
                        onChange={(event) => {
                          setPathPrefixValue(event.target.value)
                          syncGeneratedFields(selectedPlaybook, selectedHostItem?.host, event.target.value)
                        }}
                        placeholder="/api/login"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={rpsId}>{t("page.rules.ruleForm.rps")}</Label>
                        <Input id={rpsId} type="number" min="1" value={rpsValue} onChange={(event) => setRpsValue(event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={burstId}>{t("page.rules.ruleForm.burst")}</Label>
                        <Input id={burstId} type="number" min="1" value={burstValue} onChange={(event) => setBurstValue(event.target.value)} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <div>
              {editingRuleName ? (
                <Button variant="outline" size="sm" className="px-3 text-xs" onClick={() => void handleDeleteRule()} disabled={isDeletingRule || isSavingRule}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  {isDeletingRule ? t("page.rules.deleting") : t("page.rules.delete")}
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="px-3 text-xs" onClick={() => setIsCreateOpen(false)}>
                {t("page.rules.cancel")}
              </Button>
              <Button size="sm" className="px-3 text-xs" onClick={() => void handleSaveRule()} disabled={isSavingRule || !selectedHostItem?.isConnected}>
                {isSavingRule ? t("common.saving") : editingRuleName ? t("page.rules.saveChanges") : t("page.rules.createDraft")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
