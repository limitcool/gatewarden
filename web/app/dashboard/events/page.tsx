"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  PageHeader,
  ConsolePanel,
  HelperText,
  InsetPanel,
  MetricCard,
  MetaLabel,
  MetricsGrid,
  AdvancedFilter,
  EventTable,
  IPDetailCard,
  RequestTrendChart,
  GeoDistributionChart,
  EventCategoryChart,
  IPVersionChart,
  RealtimeTrafficChart,
  TopAttackersList,
  type ProxyFilters,
  type EventRow,
} from "@/components/console"
import { Activity, TrendingDown, Clock, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { buildCountryOptions, buildHostInventory, buildHostOptions, buildLiveEventStats, defaultIpInfoFromEventRows, getEventsOverview, normalizeEventRows, normalizeFilters, normalizeMetrics } from "@/lib/console-api"
import type { EventsOverviewDto } from "@/lib/console-types"
import { toast } from "sonner"
import { useI18n } from "@/components/i18n-provider"

const iconMap = [Activity, TrendingDown, Clock]

function matchesStatusCodeFilter(statusCode: number, statusCodeFilter: string) {
  return (
    statusCodeFilter === "all" ||
    (statusCodeFilter === "2xx" && statusCode >= 200 && statusCode < 300) ||
    (statusCodeFilter === "4xx" && statusCode >= 400 && statusCode < 500) ||
    (statusCodeFilter === "5xx" && statusCode >= 500 && statusCode < 600) ||
    statusCode.toString() === statusCodeFilter
  )
}

function getResponseStats(rows: EventRow[]) {
  const responseTimes = rows
    .map((row) => row.responseTime)
    .filter((value): value is number => value !== undefined)
    .sort((left, right) => left - right)

  const responseTimeCount = responseTimes.length
  const responseTimeSum = responseTimes.reduce((sum, value) => sum + value, 0)
  const slowRequests = responseTimes.filter((value) => value >= 1000).length
  const errorResponses = rows.filter((row) => row.statusCode >= 400).length

  return {
    average: responseTimeCount > 0 ? Math.round(responseTimeSum / responseTimeCount) : 0,
    p95: responseTimeCount > 0 ? responseTimes[Math.max(0, Math.ceil(responseTimeCount * 0.95) - 1)] : 0,
    slowRequests,
    errorRate: rows.length > 0 ? Math.round((errorResponses / rows.length) * 100) : 0,
  }
}

function filterEventRows(
  rows: EventRow[],
  params: {
    activeFilter: string
    searchValue: string
    ipVersionFilter: string
    severityFilter: string
    statusCodeFilter: string
    hostFilter: string
    countryFilter: string
    proxyFilters: ProxyFilters
  }
) {
  const {
    activeFilter,
    searchValue,
    ipVersionFilter,
    severityFilter,
    statusCodeFilter,
    hostFilter,
    countryFilter,
    proxyFilters,
  } = params

  const keyword = searchValue.trim().toLowerCase()

  return rows
    .filter((event) => {
      const matchesFilter =
        activeFilter === "all" ||
        event.severity === activeFilter ||
        (activeFilter === "blocked" && event.statusCode >= 400) ||
        (activeFilter === "passed" && event.statusCode < 400)

      const matchesSearch =
        keyword.length === 0 ||
        event.ip.toLowerCase().includes(keyword) ||
        event.path.toLowerCase().includes(keyword) ||
        (event.host ?? "").toLowerCase().includes(keyword) ||
        (event.subject ?? "").toLowerCase().includes(keyword) ||
        (event.rule ?? "").toLowerCase().includes(keyword)

      const matchesIpVersion =
        ipVersionFilter === "all" ||
        (ipVersionFilter === "ipv4" && event.ipVersion === "IPv4") ||
        (ipVersionFilter === "ipv6" && event.ipVersion === "IPv6")

      const matchesSeverity = severityFilter === "all" || event.severity === severityFilter
      const matchesHost = hostFilter === "all" || event.host === hostFilter
      const matchesCountry = countryFilter === "all" || event.countryCode === countryFilter
      const matchesProxy =
        (!proxyFilters.vpn || event.isVPN) &&
        (!proxyFilters.proxy || event.isProxy) &&
        (!proxyFilters.tor || event.isTor) &&
        (!proxyFilters.datacenter || event.isDatacenter)

      const matchesStatusCode = matchesStatusCodeFilter(event.statusCode, statusCodeFilter)

      return (
        matchesFilter &&
        matchesSearch &&
        matchesIpVersion &&
        matchesSeverity &&
        matchesHost &&
        matchesCountry &&
        matchesProxy &&
        matchesStatusCode
      )
    })
    .sort((left, right) => (right.responseTime ?? -1) - (left.responseTime ?? -1))
}

export default function EventsPage() {
  const { locale, t } = useI18n()
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchValue, setSearchValue] = useState("")
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [ipVersionFilter, setIpVersionFilter] = useState("all")
  const [severityFilter, setSeverityFilter] = useState("all")
  const [statusCodeFilter, setStatusCodeFilter] = useState("all")
  const [hostFilter, setHostFilter] = useState("all")
  const [countryFilter, setCountryFilter] = useState("all")
  const [proxyFilters, setProxyFilters] = useState<ProxyFilters>({
    vpn: false,
    proxy: false,
    tor: false,
    datacenter: false,
  })
  const [showStats, setShowStats] = useState(true)
  const [showHostInventory, setShowHostInventory] = useState(true)
  const [data, setData] = useState<EventsOverviewDto | null>(null)

  const severityLabelMap = useMemo(
    () => ({
      critical: t("component.filter.severity.critical"),
      warning: t("component.filter.severity.warning"),
      info: t("component.filter.severity.info"),
      success: t("component.filter.severity.success"),
    }),
    [t]
  )

  const statusCodeLabelMap = useMemo(
    () => ({
      "2xx": t("component.filter.statusCode.2xx"),
      "4xx": t("component.filter.statusCode.4xx"),
      "5xx": t("component.filter.statusCode.5xx"),
      "404": t("component.filter.statusCode.404"),
      "429": t("component.filter.statusCode.429"),
      "500": t("component.filter.statusCode.500"),
      "502": t("component.filter.statusCode.502"),
      "504": t("component.filter.statusCode.504"),
    }),
    [t]
  )

  const loadEvents = useCallback(async () => {
    try {
      const response = await getEventsOverview()
      setData(response.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("page.events.toast.loadError"))
    }
  }, [t])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadEvents()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadEvents])

  const handleRefresh = () => {
    setIsRefreshing(true)
    const refresh = async () => {
      try {
        const response = await getEventsOverview()
        setData(response.data)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("page.events.toast.refreshError"))
      } finally {
        setTimeout(() => setIsRefreshing(false), 300)
      }
    }
    void refresh()
  }

  const handleIPVersionChange = (value: string) => {
    setIpVersionFilter(value)
  }

  const handleSeverityChange = (value: string) => {
    setSeverityFilter(value)
  }

  const handleCountryChange = (value: string) => {
    setCountryFilter(value)
  }

  const handleHostChange = (value: string) => {
    setHostFilter(value)
  }

  const handleStatusCodeChange = (value: string) => {
    setStatusCodeFilter(value)
  }

  const handleRemoveFilter = (key: string) => {
    if (key === "ipVersion") setIpVersionFilter("all")
    if (key === "severity") setSeverityFilter("all")
    if (key === "statusCode") setStatusCodeFilter("all")
    if (key === "host") setHostFilter("all")
    if (key === "country") setCountryFilter("all")
  }

  const handleClearAllFilters = () => {
    setIpVersionFilter("all")
    setSeverityFilter("all")
    setStatusCodeFilter("all")
    setHostFilter("all")
    setCountryFilter("all")
    setProxyFilters({ vpn: false, proxy: false, tor: false, datacenter: false })
  }

  const handleEventClick = (event: EventRow) => {
    setSelectedEvent(event)
  }

  const filters = normalizeFilters(data?.filters ?? [], locale).map((f) => ({
    ...f,
    active: f.value === activeFilter,
  }))

  const rawEventRows = useMemo(() => normalizeEventRows(data?.stream ?? [], locale), [data?.stream, locale])
  const responseStats = useMemo(() => getResponseStats(rawEventRows), [rawEventRows])
  const hostInventory = useMemo(
    () => buildHostInventory(data?.protectedHosts ?? [], data?.observedHosts ?? [], rawEventRows),
    [data?.protectedHosts, data?.observedHosts, rawEventRows]
  )
  const eventRows = useMemo(
    () =>
      filterEventRows(rawEventRows, {
        activeFilter,
        searchValue,
        ipVersionFilter,
        severityFilter,
        statusCodeFilter,
        hostFilter,
        countryFilter,
        proxyFilters,
      }),
    [activeFilter, countryFilter, hostFilter, ipVersionFilter, proxyFilters, rawEventRows, searchValue, severityFilter, statusCodeFilter]
  )

  const fallbackIpInfo = defaultIpInfoFromEventRows(eventRows, locale)
  const stats = buildLiveEventStats(rawEventRows, locale)
  const countryOptions = useMemo(() => buildCountryOptions(rawEventRows), [rawEventRows])
  const hostOptions = useMemo(() => {
    const inventoryMap = new Map(hostInventory.map((item) => [item.host, item]))
    return buildHostOptions(rawEventRows).map((option) => ({
      ...option,
      status: inventoryMap.get(option.value)?.status ?? "unknown",
    }))
  }, [hostInventory, rawEventRows])
  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string; value: string }[] = []
    const countryOption = countryOptions.find((option) => option.value === countryFilter)
    const hostOption = hostOptions.find((option) => option.value === hostFilter)

    if (ipVersionFilter !== "all") {
      filters.push({ key: "ipVersion", label: t("component.filter.ipVersion"), value: ipVersionFilter.toUpperCase() })
    }
    if (severityFilter !== "all") {
      filters.push({ key: "severity", label: t("component.filter.severity"), value: severityLabelMap[severityFilter as keyof typeof severityLabelMap] ?? severityFilter })
    }
    if (statusCodeFilter !== "all") {
      filters.push({ key: "statusCode", label: t("component.filter.statusCode"), value: statusCodeLabelMap[statusCodeFilter as keyof typeof statusCodeLabelMap] ?? statusCodeFilter })
    }
    if (hostFilter !== "all" && hostOption) {
      filters.push({ key: "host", label: t("component.filter.host"), value: hostOption.label })
    }
    if (countryFilter !== "all" && countryOption) {
      filters.push({ key: "country", label: t("component.filter.country"), value: countryOption.label })
    }

    return filters
  }, [countryFilter, countryOptions, hostFilter, hostOptions, ipVersionFilter, severityFilter, severityLabelMap, statusCodeFilter, statusCodeLabelMap, t])
  const priorityMetrics = useMemo(
    () => [
      {
        label: t("page.events.metric.avgResponse"),
        value: `${responseStats.average}ms`,
        detail: t("page.events.metric.avgResponseDetail"),
        icon: Clock,
      },
      {
        label: t("page.events.metric.errorRate"),
        value: `${responseStats.errorRate}%`,
        detail: t("page.events.metric.errorRateDetail"),
        icon: Activity,
      },
      {
        label: t("page.events.metric.p95"),
        value: `${responseStats.p95}ms`,
        detail: t("page.events.metric.p95Detail"),
        icon: TrendingDown,
      },
      {
        label: t("page.events.metric.slowRequests"),
        value: responseStats.slowRequests,
        detail: t("page.events.metric.slowRequestsDetail"),
        icon: Clock,
      },
    ],
    [responseStats, t]
  )

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("page.events.title")}
        description={t("page.events.description")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 rounded-lg px-3 text-xs"
              onClick={() => setShowHostInventory((current) => !current)}
            >
              {showHostInventory ? t("page.events.hideCoverage") : t("page.events.showCoverage")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 rounded-lg px-3 text-xs"
              onClick={() => setShowStats(!showStats)}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              {showStats ? t("page.events.hideStats") : t("page.events.showStats")}
            </Button>
          </div>
        }
      />

      <MetricsGrid columns={4} className="lg:hidden">
        {priorityMetrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
            icon={metric.icon}
          />
        ))}
      </MetricsGrid>

      {showHostInventory && hostInventory.length > 0 && (
        <ConsolePanel>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="text-sm font-semibold tracking-tight text-foreground">
                  {t("page.events.hostInventoryTitle")}
                </div>
                <HelperText className="max-w-2xl">{t("page.events.hostInventoryDescription")}</HelperText>
              </div>
              <InsetPanel>
                <div className="flex flex-wrap gap-2">
                  {hostInventory.map((item) => (
                    <button
                      key={item.host}
                      type="button"
                      onClick={() => handleHostChange(item.host)}
                      className={[
                        "inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-xs font-medium transition-colors",
                        hostFilter === item.host
                          ? "border-foreground bg-foreground text-background"
                          : item.isConnected
                            ? "border-status-active/30 bg-status-active/10 text-status-active hover:bg-status-active/15"
                            : "border-status-error/30 bg-status-error/10 text-status-error hover:bg-status-error/15",
                      ].join(" ")}
                    >
                      <span className="font-mono">{item.host}</span>
                      <span className="text-xs opacity-80">
                        {item.isConnected ? t("common.protected") : t("common.unprotected")}
                      </span>
                    </button>
                  ))}
                  {hostFilter !== "all" && (
                    <Button variant="outline" size="sm" className="min-h-11 rounded-lg px-3 text-xs" onClick={() => handleHostChange("all")}>
                      {t("page.events.clearHostFilter")}
                    </Button>
                  )}
                </div>
              </InsetPanel>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <InsetPanel>
                <MetaLabel>{t("common.protected")}</MetaLabel>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                  {hostInventory.filter((item) => item.isConnected).length}
                </div>
                <HelperText className="mt-1">
                  {t("page.events.hostInventoryProtected", {
                    count: hostInventory.filter((item) => item.isConnected).length,
                  })}
                </HelperText>
              </InsetPanel>
              <InsetPanel>
                <MetaLabel>{t("common.unprotected")}</MetaLabel>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                  {hostInventory.filter((item) => !item.isConnected).length}
                </div>
                <HelperText className="mt-1">
                  {t("page.events.hostInventoryUnprotected", {
                    count: hostInventory.filter((item) => !item.isConnected).length,
                  })}
                </HelperText>
              </InsetPanel>
            </div>
          </div>
        </ConsolePanel>
      )}

      {showStats && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-5 h-auto w-full justify-start rounded-xl border border-border/80 bg-card p-1 shadow-sm">
            <TabsTrigger value="overview" className="rounded-lg px-3 py-1.5">
              {t("page.events.tab.overview")}
            </TabsTrigger>
            <TabsTrigger value="traffic" className="rounded-lg px-3 py-1.5">
              {t("page.events.tab.traffic")}
            </TabsTrigger>
            <TabsTrigger value="geo" className="rounded-lg px-3 py-1.5">
              {t("page.events.tab.geo")}
            </TabsTrigger>
            <TabsTrigger value="threats" className="rounded-lg px-3 py-1.5">
              {t("page.events.tab.threats")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-5">
            <MetricsGrid columns={3} className="hidden lg:grid">
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
            <MetricsGrid columns={4} className="hidden lg:grid">
              <MetricCard
                label={t("page.events.metric.avgResponse")}
                value={`${responseStats.average}ms`}
                detail={t("page.events.metric.avgResponseDetail")}
                icon={Clock}
              />
              <MetricCard
                label={t("page.events.metric.p95")}
                value={`${responseStats.p95}ms`}
                detail={t("page.events.metric.p95Detail")}
                icon={Clock}
              />
              <MetricCard
                label={t("page.events.metric.slowRequests")}
                value={responseStats.slowRequests}
                detail={t("page.events.metric.slowRequestsDetail")}
                icon={TrendingDown}
              />
              <MetricCard
                label={t("page.events.metric.errorRate")}
                value={`${responseStats.errorRate}%`}
                detail={t("page.events.metric.errorRateDetail")}
                icon={Activity}
              />
            </MetricsGrid>
            <div className="grid gap-4 lg:grid-cols-2">
              <RequestTrendChart data={stats.requestTrend} />
              <EventCategoryChart data={stats.eventCategories} />
            </div>
          </TabsContent>

          <TabsContent value="traffic" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <RealtimeTrafficChart
                data={stats.realtimeTraffic}
                className="lg:col-span-2"
              />
              <IPVersionChart
                ipv4={stats.ipVersionStats.ipv4}
                ipv6={stats.ipVersionStats.ipv6}
              />
            </div>
            <RequestTrendChart data={stats.requestTrend} />
          </TabsContent>

          <TabsContent value="geo" className="space-y-4">
            <GeoDistributionChart data={stats.geoDistribution} />
          </TabsContent>

          <TabsContent value="threats" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <TopAttackersList
                data={stats.topAttackers}
                onIPClick={(ip) => {
                  const event = rawEventRows.find((e) => e.ip === ip)
                  if (event) setSelectedEvent(event)
                }}
              />
              <EventCategoryChart data={stats.eventCategories} />
            </div>
          </TabsContent>
        </Tabs>
      )}

      <AdvancedFilter
        filters={filters}
        onFilterChange={setActiveFilter}
        searchValue={searchValue}
        searchPlaceholder={t("page.events.search")}
        onSearch={setSearchValue}
        ipVersionValue={ipVersionFilter}
        onIPVersionChange={handleIPVersionChange}
        severityValue={severityFilter}
        onSeverityChange={handleSeverityChange}
        statusCodeValue={statusCodeFilter}
        onStatusCodeChange={handleStatusCodeChange}
        hostOptions={hostOptions}
        featuredHostOptions={hostOptions.slice(0, 8)}
        hostValue={hostFilter}
        onHostChange={handleHostChange}
        countryOptions={countryOptions}
        countryValue={countryFilter}
        onCountryChange={handleCountryChange}
        proxyFilters={proxyFilters}
        onProxyFilterChange={setProxyFilters}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onClearAllFilters={handleClearAllFilters}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EventTable
            events={eventRows}
            onRowClick={handleEventClick}
            selectedEventId={selectedEvent?.id}
          />
        </div>
        <div>
          {selectedEvent ? (
            <IPDetailCard
              ipInfo={{
                ip: selectedEvent.ip,
                version: selectedEvent.ipVersion,
                country: selectedEvent.country,
                countryCode: selectedEvent.countryCode,
                region: selectedEvent.region,
                city: selectedEvent.city,
                timezone: selectedEvent.timezone,
                asn: selectedEvent.asn,
                asnOrg: selectedEvent.asnOrg,
                isp: selectedEvent.isp,
                isProxy: selectedEvent.isProxy,
                isVPN: selectedEvent.isVPN,
                isTor: selectedEvent.isTor,
                isDatacenter: selectedEvent.isDatacenter,
                threatLevel: selectedEvent.severity === "critical" ? "high" : 
                             selectedEvent.severity === "warning" ? "medium" : "low",
              }}
              onViewHistory={() => {}}
              onBlock={() => {}}
            />
          ) : (
            <IPDetailCard
              ipInfo={fallbackIpInfo}
              onViewHistory={() => {}}
              onBlock={() => {}}
            />
          )}
        </div>
      </div>
    </div>
  )
}
