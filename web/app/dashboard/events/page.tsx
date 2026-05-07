"use client"

import { useEffect, useMemo, useState } from "react"
import {
  PageHeader,
  MetricCard,
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
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { buildCountryOptions, buildHostInventory, buildHostOptions, buildLiveEventStats, defaultIpInfoFromEventRows, getEventsOverview, normalizeEventRows, normalizeFilters, normalizeMetrics } from "@/lib/console-api"
import type { EventsOverviewDto } from "@/lib/console-types"
import { toast } from "sonner"
import { useI18n } from "@/components/i18n-provider"

const iconMap = [Activity, TrendingDown, Clock]

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

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await getEventsOverview()
        setData(response.data)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("page.events.toast.loadError"))
      }
    }

    void loadEvents()
  }, [])

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
  const protectedHosts = data?.protectedHosts ?? []
  const observedHosts = data?.observedHosts ?? []
  const hostInventory = useMemo(
    () => buildHostInventory(protectedHosts, observedHosts, rawEventRows),
    [protectedHosts, observedHosts, rawEventRows]
  )
  const eventRows = useMemo(() => {
    return rawEventRows.filter((event) => {
      const matchesFilter =
        activeFilter === "all" ||
        event.severity === activeFilter ||
        (activeFilter === "blocked" && event.statusCode >= 400) ||
        (activeFilter === "passed" && event.statusCode < 400)
      const keyword = searchValue.trim().toLowerCase()
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

      const matchesSeverity =
        severityFilter === "all" || event.severity === severityFilter

      const matchesHost =
        hostFilter === "all" || event.host === hostFilter

      const matchesCountry =
        countryFilter === "all" || event.countryCode === countryFilter

      const matchesProxy =
        (!proxyFilters.vpn || event.isVPN) &&
        (!proxyFilters.proxy || event.isProxy) &&
        (!proxyFilters.tor || event.isTor) &&
        (!proxyFilters.datacenter || event.isDatacenter)

      const matchesStatusCode =
        statusCodeFilter === "all" ||
        (statusCodeFilter === "2xx" && event.statusCode >= 200 && event.statusCode < 300) ||
        (statusCodeFilter === "4xx" && event.statusCode >= 400 && event.statusCode < 500) ||
        (statusCodeFilter === "5xx" && event.statusCode >= 500 && event.statusCode < 600) ||
        event.statusCode.toString() === statusCodeFilter

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
    }).sort((a, b) => {
      const left = a.responseTime ?? -1
      const right = b.responseTime ?? -1
      return right - left
    })
  }, [rawEventRows, activeFilter, searchValue, ipVersionFilter, severityFilter, hostFilter, countryFilter, proxyFilters, statusCodeFilter])

  const fallbackIpInfo = defaultIpInfoFromEventRows(eventRows, locale)
  const stats = buildLiveEventStats(rawEventRows, locale)
  const countryOptions = buildCountryOptions(rawEventRows)
  const hostOptions = useMemo(() => {
    const inventoryMap = new Map(hostInventory.map((item) => [item.host, item]))
    return buildHostOptions(rawEventRows).map((option) => ({
      ...option,
      status: inventoryMap.get(option.value)?.status ?? "unknown",
    }))
  }, [hostInventory, rawEventRows])
  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string; value: string }[] = []
    const countryOption = buildCountryOptions(rawEventRows).find((option) => option.value === countryFilter)
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
  }, [countryFilter, hostFilter, hostOptions, ipVersionFilter, rawEventRows, severityFilter, severityLabelMap, statusCodeFilter, statusCodeLabelMap, t])
  const responseStats = useMemo(() => {
    const withResponseTime = rawEventRows.filter((row) => row.responseTime !== undefined)
    const count = withResponseTime.length
    const average = count > 0
      ? Math.round(withResponseTime.reduce((sum, row) => sum + (row.responseTime ?? 0), 0) / count)
      : 0
    const sorted = withResponseTime
      .map((row) => row.responseTime ?? 0)
      .sort((a, b) => a - b)
    const p95 = count > 0 ? sorted[Math.max(0, Math.ceil(count * 0.95) - 1)] : 0
    const slowRequests = withResponseTime.filter((row) => (row.responseTime ?? 0) >= 1000).length
    const errorResponses = rawEventRows.filter((row) => row.statusCode >= 400).length
    const errorRate = rawEventRows.length > 0 ? Math.round((errorResponses / rawEventRows.length) * 100) : 0

    return { average, p95, slowRequests, errorRate }
  }, [rawEventRows])

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.events.title")}
        description={t("page.events.description")}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(!showStats)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {showStats ? t("page.events.hideStats") : t("page.events.showStats")}
          </Button>
        }
      />

      {hostInventory.length > 0 && (
        <div className="rounded-lg border border-border bg-card px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">{t("page.events.hostInventoryTitle")}</div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("page.events.hostInventoryDescription")}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{t("page.events.hostInventoryProtected", { count: hostInventory.filter((item) => item.isProtected).length })}</span>
              <span>·</span>
              <span>{t("page.events.hostInventoryUnprotected", { count: hostInventory.filter((item) => !item.isProtected).length })}</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {hostInventory.map((item) => (
              <button
                key={item.host}
                type="button"
                onClick={() => handleHostChange(item.host)}
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  hostFilter === item.host
                    ? "border-foreground bg-foreground text-background"
                    : item.isProtected
                      ? "border-status-active/30 bg-status-active/10 text-status-active hover:bg-status-active/15"
                      : "border-status-error/30 bg-status-error/10 text-status-error hover:bg-status-error/15",
                ].join(" ")}
              >
                <span className="font-mono">{item.host}</span>
                <span className="text-[10px] opacity-80">{item.isProtected ? t("common.protected") : t("common.unprotected")}</span>
              </button>
            ))}
            {hostFilter !== "all" && (
              <Button variant="ghost" size="pill" onClick={() => handleHostChange("all")}>
                {t("page.events.clearHostFilter")}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 统计大盘 */}
      {showStats && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">{t("page.events.tab.overview")}</TabsTrigger>
            <TabsTrigger value="traffic">{t("page.events.tab.traffic")}</TabsTrigger>
            <TabsTrigger value="geo">{t("page.events.tab.geo")}</TabsTrigger>
            <TabsTrigger value="threats">{t("page.events.tab.threats")}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
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
            <MetricsGrid columns={4}>
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
                  const event = rawEventRows.find(e => e.ip === ip)
                  if (event) setSelectedEvent(event)
                }}
              />
              <EventCategoryChart data={stats.eventCategories} />
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* 高级筛选 */}
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

      {/* 事件列表和详情 */}
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
