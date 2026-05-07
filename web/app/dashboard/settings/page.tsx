"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import {
  PageHeader,
  MetricCard,
  MetricsGrid,
  FilterBar,
  DetailListCard,
} from "@/components/console"
import { Settings as SettingsIcon, Link2, Radar, Bot } from "lucide-react"
import { getSettingsOverview, normalizeDetails, normalizeFilters, normalizeMetrics, updateSettings } from "@/lib/console-api"
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
import { useI18n } from "@/components/i18n-provider"

const iconMap = [SettingsIcon, Link2, Radar]

type SettingsSection = "identity" | "security" | "ai" | "observability"

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
}

function joinLines(values: string[]) {
  return values.join("\n")
}

export default function SettingsPage() {
  const { locale: currentLocale, t } = useI18n()
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

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const response = await getSettingsOverview()
      setData(response.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("page.settings.toast.loadError"))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadSettings()
  }, [])

  useEffect(() => {
    if (!data) return
    setConfig(data.config ?? null)
    setInitialConfig(data.config ?? null)
    setLocale(data.settings.locale === "en" ? "en" : "zh-CN")
    setNotes(data.settings.notes)
    setShadowModeEnabled(data.settings.shadowModeEnabled)
  }, [data])

  const filters = useMemo(
    () =>
      normalizeFilters([
        { label: t("page.settings.filter.identity"), value: "identity" },
        { label: t("page.settings.filter.security"), value: "security" },
        { label: t("page.settings.filter.ai"), value: "ai" },
        { label: t("page.settings.filter.observability"), value: "observability" },
      ], currentLocale).map((f) => ({
        ...f,
        active: f.value === activeFilter,
      })),
    [activeFilter, currentLocale, t]
  )

  const filteredDetails = normalizeDetails(
    activeFilter === "all" ? data?.configDetails ?? [] : data?.details ?? []
  ).filter((detail) => {
    const keyword = searchValue.trim().toLowerCase()
    return (
      keyword.length === 0 ||
      detail.label.toLowerCase().includes(keyword) ||
      detail.value.toLowerCase().includes(keyword) ||
      detail.description.toLowerCase().includes(keyword)
    )
  })

  const handleReset = () => {
    if (!initialConfig || !data) return
    setConfig(initialConfig)
    setLocale(data.settings.locale === "en" ? "en" : "zh-CN")
    setNotes(data.settings.notes)
    setShadowModeEnabled(data.settings.shadowModeEnabled)
    toast.message(t("page.settings.toast.reset"))
  }

  const handleSave = async () => {
    if (!config) return
    startTransition(async () => {
      try {
        await updateSettings({
          locale,
          notes,
          shadowModeEnabled,
          config,
        })
        toast.success(t("page.settings.toast.saveSuccess"))
        await loadSettings()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("page.settings.toast.saveError"))
      }
    })
  }

  const updateConfig = (updater: (current: AppConfigDto) => AppConfigDto) => {
    setConfig((current) => (current ? updater(current) : current))
  }

  const activeSection = activeFilter as SettingsSection

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.settings.title")}
        description={t("page.settings.description")}
      />

      <MetricsGrid columns={3}>
        {normalizeMetrics(data?.metrics ?? [], currentLocale).map((metric, index) => (
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
        onExtraAction={() =>
          toast.message(t("page.settings.toast.filterHelp"))
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-medium text-foreground">{t("page.settings.structuredTitle")}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("page.settings.structuredDescription")}
              </p>
            </div>

            {config ? (
              <div className="space-y-6 p-4">
                {(activeSection === "identity" || activeSection === "security" || activeSection === "ai" || activeSection === "observability") && (
                  <div className="grid gap-6">
                    {(activeSection === "identity") && (
                      <>
                        <section className="space-y-4">
                          <div className="flex items-center gap-2">
                            <SettingsIcon className="h-4 w-4 text-muted-foreground" />
                            <h4 className="text-sm font-medium text-foreground">{t("page.settings.section.basics")}</h4>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label className="text-sm">{t("page.settings.field.consoleLanguage")}</Label>
                              <Select value={locale} onValueChange={(value) => setLocale(value as "en" | "zh-CN")}>
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="zh-CN">{t("page.settings.locale.zh-CN")}</SelectItem>
                                  <SelectItem value="en">{t("page.settings.locale.en")}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="rounded-lg border border-border bg-muted/30 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-sm font-medium text-foreground">{t("page.settings.field.shadowMode")}</div>
                                  <p className="mt-0.5 text-xs text-muted-foreground">{t("page.settings.field.shadowModeHint")}</p>
                                </div>
                                <Switch checked={shadowModeEnabled} onCheckedChange={setShadowModeEnabled} />
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">{t("page.settings.field.notes")}</Label>
                            <Textarea
                              rows={4}
                              value={notes}
                              onChange={(event) => setNotes(event.target.value)}
                              placeholder={t("page.settings.notesPlaceholder")}
                            />
                          </div>
                        </section>

                        <section className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-muted-foreground" />
                            <h4 className="text-sm font-medium text-foreground">{t("page.settings.section.identity")}</h4>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label className="text-sm">{t("page.settings.field.identityMode")}</Label>
                              <Input
                                value={config.identity.mode}
                                onChange={(event) =>
                                  updateConfig((current) => ({
                                    ...current,
                                    identity: { ...current.identity, mode: event.target.value },
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">{t("page.settings.field.providerHint")}</Label>
                              <Input
                                value={config.identity.providerHint}
                                onChange={(event) =>
                                  updateConfig((current) => ({
                                    ...current,
                                    identity: { ...current.identity, providerHint: event.target.value },
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">{t("page.settings.field.authenticatedHeader")}</Label>
                              <Input
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
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">{t("page.settings.field.subjectHeader")}</Label>
                              <Input
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
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">{t("page.settings.field.emailHeader")}</Label>
                              <Input
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
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">{t("page.settings.field.groupsHeader")}</Label>
                              <Input
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
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label className="text-sm">{t("page.settings.field.providerHeader")}</Label>
                              <Input
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
                            </div>
                          </div>
                        </section>
                      </>
                    )}

                    {(activeSection === "security") && (
                      <>
                        <section className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Radar className="h-4 w-4 text-muted-foreground" />
                            <h4 className="text-sm font-medium text-foreground">{t("page.settings.section.gatewayAndDb")}</h4>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label className="text-sm">{t("page.settings.field.listenAddr")}</Label>
                              <Input
                                value={config.server.listenAddr}
                                onChange={(event) =>
                                  updateConfig((current) => ({
                                    ...current,
                                    server: { ...current.server, listenAddr: event.target.value },
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">{t("page.settings.field.databaseUrl")}</Label>
                              <Input
                                value={config.database.url}
                                onChange={(event) =>
                                  updateConfig((current) => ({
                                    ...current,
                                    database: { ...current.database, url: event.target.value },
                                  }))
                                }
                              />
                            </div>
                          </div>
                        </section>

                        <section className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-muted-foreground" />
                            <h4 className="text-sm font-medium text-foreground">{t("page.settings.section.protectedHosts")}</h4>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-lg border border-border bg-muted/30 p-4">
                              <div className="text-sm font-medium text-foreground">
                                {t("page.settings.field.protectedHosts")}
                              </div>
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                {t("page.settings.field.protectedHostsHint")}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">{t("page.settings.field.consoleAdminGroups")}</Label>
                              <Textarea
                                rows={6}
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
                            </div>
                          </div>
                        </section>

                        <section className="space-y-4">
                          <h4 className="text-sm font-medium text-foreground">{t("page.settings.section.adminProtection")}</h4>
                          <div className="space-y-2">
                            <Label className="text-sm">{t("page.settings.field.adminPrefixes")}</Label>
                            <Textarea
                              rows={4}
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
                              placeholder={"/admin\n/console"}
                            />
                          </div>
                        </section>

                        <section className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-lg border border-border p-4">
                            <h4 className="text-sm font-medium text-foreground">{t("page.settings.section.loginIpLimit")}</h4>
                            <div className="mt-4 space-y-3">
                              <Input
                                value={config.security.loginIpLimit.ruleId}
                                onChange={(event) =>
                                  updateConfig((current) => ({
                                    ...current,
                                    security: {
                                      ...current.security,
                                      loginIpLimit: { ...current.security.loginIpLimit, ruleId: event.target.value },
                                    },
                                  }))
                                }
                                placeholder={t("page.settings.field.ruleId")}
                              />
                              <Input
                                value={config.security.loginIpLimit.pathPrefix}
                                onChange={(event) =>
                                  updateConfig((current) => ({
                                    ...current,
                                    security: {
                                      ...current.security,
                                      loginIpLimit: { ...current.security.loginIpLimit, pathPrefix: event.target.value },
                                    },
                                  }))
                                }
                                placeholder={t("page.settings.field.pathPrefix")}
                              />
                              <div className="grid grid-cols-2 gap-3">
                                <Input
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
                                  placeholder={t("page.settings.field.rps")}
                                />
                                <Input
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
                                  placeholder={t("page.settings.field.burst")}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="rounded-lg border border-border p-4">
                            <h4 className="text-sm font-medium text-foreground">{t("page.settings.section.loginUserLimit")}</h4>
                            <div className="mt-4 space-y-3">
                              <Input
                                value={config.security.loginUserLimit.ruleId}
                                onChange={(event) =>
                                  updateConfig((current) => ({
                                    ...current,
                                    security: {
                                      ...current.security,
                                      loginUserLimit: { ...current.security.loginUserLimit, ruleId: event.target.value },
                                    },
                                  }))
                                }
                                placeholder={t("page.settings.field.ruleId")}
                              />
                              <Input
                                value={config.security.loginUserLimit.pathPrefix}
                                onChange={(event) =>
                                  updateConfig((current) => ({
                                    ...current,
                                    security: {
                                      ...current.security,
                                      loginUserLimit: { ...current.security.loginUserLimit, pathPrefix: event.target.value },
                                    },
                                  }))
                                }
                                placeholder={t("page.settings.field.pathPrefix")}
                              />
                              <div className="grid grid-cols-2 gap-3">
                                <Input
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
                                  placeholder={t("page.settings.field.rps")}
                                />
                                <Input
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
                                  placeholder={t("page.settings.field.burst")}
                                />
                              </div>
                            </div>
                          </div>
                        </section>
                      </>
                    )}

                    {(activeSection === "ai") && (
                      <section className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-muted-foreground" />
                          <h4 className="text-sm font-medium text-foreground">{t("page.settings.section.aiProvider")}</h4>
                        </div>
                        <div className="rounded-lg border border-border p-4 space-y-4">
                          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                            <div>
                              <div className="text-sm font-medium text-foreground">{t("page.settings.field.aiEnabled")}</div>
                              <p className="mt-0.5 text-xs text-muted-foreground">{t("page.settings.field.aiEnabledHint")}</p>
                            </div>
                            <Switch
                              checked={config.ai.enabled}
                              onCheckedChange={(checked) =>
                                updateConfig((current) => ({
                                  ...current,
                                  ai: { ...current.ai, enabled: checked },
                                }))
                              }
                            />
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label className="text-sm">{t("page.settings.field.provider")}</Label>
                              <Input
                                value={config.ai.provider}
                                onChange={(event) =>
                                  updateConfig((current) => ({
                                    ...current,
                                    ai: { ...current.ai, provider: event.target.value },
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">{t("page.settings.field.model")}</Label>
                              <Input
                                value={config.ai.model}
                                onChange={(event) =>
                                  updateConfig((current) => ({
                                    ...current,
                                    ai: { ...current.ai, model: event.target.value },
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">{t("page.settings.field.apiKeyEnv")}</Label>
                              <Input
                                value={config.ai.apiKeyEnv}
                                onChange={(event) =>
                                  updateConfig((current) => ({
                                    ...current,
                                    ai: { ...current.ai, apiKeyEnv: event.target.value },
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">{t("page.settings.field.baseUrl")}</Label>
                              <Input
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
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">{t("page.settings.field.timeoutMs")}</Label>
                              <Input
                                type="number"
                                value={config.ai.timeoutMs}
                                onChange={(event) =>
                                  updateConfig((current) => ({
                                    ...current,
                                    ai: { ...current.ai, timeoutMs: Number(event.target.value) || 0 },
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">{t("page.settings.field.systemPrompt")}</Label>
                            <Textarea
                              rows={8}
                              value={config.ai.systemPrompt}
                              onChange={(event) =>
                                updateConfig((current) => ({
                                  ...current,
                                  ai: { ...current.ai, systemPrompt: event.target.value },
                                }))
                              }
                            />
                          </div>
                        </div>
                      </section>
                    )}

                    {(activeSection === "observability") && (
                      <section className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Radar className="h-4 w-4 text-muted-foreground" />
                          <h4 className="text-sm font-medium text-foreground">{t("page.settings.section.observability")}</h4>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-lg border border-border p-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium text-foreground">{t("page.settings.section.caddyAccessLog")}</div>
                                <p className="mt-0.5 text-xs text-muted-foreground">{t("page.settings.field.caddyLogHint")}</p>
                              </div>
                              <Switch
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
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">{t("page.settings.field.logPath")}</Label>
                              <Input
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
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">{t("page.settings.field.pollInterval")}</Label>
                              <Input
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
                            </div>
                          </div>

                          <div className="rounded-lg border border-border p-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium text-foreground">{t("page.settings.section.geoip")}</div>
                                <p className="mt-0.5 text-xs text-muted-foreground">{t("page.settings.field.geoHint")}</p>
                              </div>
                              <Switch
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
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">{t("page.settings.field.mmdbPath")}</Label>
                              <Input
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
                            </div>
                          </div>
                        </div>
                      </section>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                  <Button variant="outline" size="sm" className="h-8" onClick={handleReset}>
                    {t("common.reset")}
                  </Button>
                  <Button size="sm" className="h-8" onClick={() => void handleSave()} disabled={isPending}>
                    {isPending ? t("common.saving") : t("common.save")}
                  </Button>
                </div>
              </div>
            ) : isLoading ? (
              <div className="p-6 text-sm text-muted-foreground">{t("page.settings.loading")}</div>
            ) : (
              <div className="space-y-4 p-6">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="text-sm font-medium text-foreground">
                    {t("page.settings.unavailableTitle")}
                  </div>
                  <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {t("page.settings.unavailableDescription")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8" onClick={() => void loadSettings()}>
                    {t("page.settings.retry")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <DetailListCard
            details={filteredDetails}
            title={t("page.settings.section.configNotes")}
          />
        </div>
      </div>
    </div>
  )
}
