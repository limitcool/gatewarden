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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { buildCountryOptions, buildHostOptions, buildLiveEventStats, defaultIpInfoFromEventRows, getEventsOverview, normalizeEventRows, normalizeFilters, normalizeMetrics } from "@/lib/console-api"
import type { EventsOverviewDto } from "@/lib/console-types"
import { toast } from "sonner"

const iconMap = [Activity, TrendingDown, Clock]

export default function EventsPage() {
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchValue, setSearchValue] = useState("")
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeFilters, setActiveFilters] = useState<{ key: string; label: string; value: string }[]>([])
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

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await getEventsOverview()
        setData(response.data)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "加载事件流失败")
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
        toast.error(error instanceof Error ? error.message : "刷新失败")
      } finally {
        setTimeout(() => setIsRefreshing(false), 300)
      }
    }
    void refresh()
  }

  const handleIPVersionChange = (value: string) => {
    setIpVersionFilter(value)
    if (value !== "all") {
      setActiveFilters(prev => [
        ...prev.filter(f => f.key !== "ipVersion"),
        { key: "ipVersion", label: "IP 版本", value: value.toUpperCase() }
      ])
    } else {
      setActiveFilters(prev => prev.filter(f => f.key !== "ipVersion"))
    }
  }

  const handleSeverityChange = (value: string) => {
    setSeverityFilter(value)
    const severityLabels: Record<string, string> = {
      critical: "危险",
      warning: "告警",
      info: "信息",
      success: "成功",
    }
    if (value !== "all") {
      setActiveFilters(prev => [
        ...prev.filter(f => f.key !== "severity"),
        { key: "severity", label: "严重程度", value: severityLabels[value] || value }
      ])
    } else {
      setActiveFilters(prev => prev.filter(f => f.key !== "severity"))
    }
  }

  const handleCountryChange = (value: string) => {
    setCountryFilter(value)
    const countryOption = buildCountryOptions(eventRows).find(c => c.value === value)
    if (value !== "all" && countryOption) {
      setActiveFilters(prev => [
        ...prev.filter(f => f.key !== "country"),
        { key: "country", label: "国家", value: countryOption.label }
      ])
    } else {
      setActiveFilters(prev => prev.filter(f => f.key !== "country"))
    }
  }

  const handleHostChange = (value: string) => {
    setHostFilter(value)
    const hostOption = buildHostOptions(rawEventRows).find((host) => host.value === value)
    if (value !== "all" && hostOption) {
      setActiveFilters((prev) => [
        ...prev.filter((f) => f.key !== "host"),
        { key: "host", label: "域名", value: hostOption.label },
      ])
    } else {
      setActiveFilters((prev) => prev.filter((f) => f.key !== "host"))
    }
  }

  const handleStatusCodeChange = (value: string) => {
    const statusLabels: Record<string, string> = {
      "2xx": "2xx 成功",
      "4xx": "4xx 客户端错误",
      "5xx": "5xx 服务端错误",
      "404": "404 未找到",
      "429": "429 限流",
      "500": "500 内部错误",
      "502": "502 网关错误",
      "504": "504 超时",
    }
    setStatusCodeFilter(value)
    if (value !== "all") {
      setActiveFilters(prev => [
        ...prev.filter(f => f.key !== "statusCode"),
        { key: "statusCode", label: "状态码", value: statusLabels[value] || value }
      ])
    } else {
      setActiveFilters(prev => prev.filter(f => f.key !== "statusCode"))
    }
  }

  const handleRemoveFilter = (key: string) => {
    if (key === "ipVersion") setIpVersionFilter("all")
    if (key === "severity") setSeverityFilter("all")
    if (key === "statusCode") setStatusCodeFilter("all")
    if (key === "host") setHostFilter("all")
    if (key === "country") setCountryFilter("all")
    setActiveFilters(prev => prev.filter(f => f.key !== key))
  }

  const handleClearAllFilters = () => {
    setActiveFilters([])
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

  const filters = normalizeFilters(data?.filters ?? []).map((f) => ({
    ...f,
    active: f.value === activeFilter,
  }))

  const rawEventRows = useMemo(() => normalizeEventRows(data?.stream ?? []), [data?.stream])
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

  const fallbackIpInfo = defaultIpInfoFromEventRows(eventRows)
  const stats = buildLiveEventStats(rawEventRows)
  const countryOptions = buildCountryOptions(rawEventRows)
  const hostOptions = buildHostOptions(rawEventRows)
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
        title="事件流"
        description="实时监控网关事件和请求日志"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(!showStats)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {showStats ? "隐藏统计" : "显示统计"}
          </Button>
        }
      />

      {/* 统计大盘 */}
      {showStats && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="traffic">流量分析</TabsTrigger>
            <TabsTrigger value="geo">地理分布</TabsTrigger>
            <TabsTrigger value="threats">威胁情报</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <MetricsGrid columns={3}>
              {normalizeMetrics(data?.metrics ?? []).map((metric, index) => (
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
                label="平均响应时间"
                value={`${responseStats.average}ms`}
                detail="最近请求的平均耗时"
                icon={Clock}
              />
              <MetricCard
                label="P95 响应时间"
                value={`${responseStats.p95}ms`}
                detail="95 分位响应时间"
                icon={Clock}
              />
              <MetricCard
                label="慢请求"
                value={responseStats.slowRequests}
                detail="耗时大于等于 1000ms 的请求数"
                icon={TrendingDown}
              />
              <MetricCard
                label="错误率"
                value={`${responseStats.errorRate}%`}
                detail="状态码 >= 400 的请求占比"
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
        searchPlaceholder="搜索 IP、路径、规则..."
        onSearch={setSearchValue}
        ipVersionValue={ipVersionFilter}
        onIPVersionChange={handleIPVersionChange}
        severityValue={severityFilter}
        onSeverityChange={handleSeverityChange}
        statusCodeValue={statusCodeFilter}
        onStatusCodeChange={handleStatusCodeChange}
        hostOptions={hostOptions}
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
