"use client"

import { useEffect, useState } from "react"
import {
  PageHeader,
  MetricCard,
  MetricsGrid,
  EventStreamCard,
  ActionCard,
  RequestTrendChart,
  GeoDistributionChart,
  IPVersionChart,
  RealtimeTrafficChart,
  TopAttackersList,
} from "@/components/console"
import { Shield, Activity, AlertTriangle, Clock } from "lucide-react"
import { buildLiveEventStats, getDashboardOverview, getEventsOverview, normalizeActions, normalizeEventRows, normalizeMetrics, normalizeRecentEvents } from "@/lib/console-api"
import type { DashboardOverviewDto } from "@/lib/console-types"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useI18n } from "@/components/i18n-provider"

const iconMap = [Shield, Activity, AlertTriangle, Clock]

export default function DashboardPage() {
  const router = useRouter()
  const { t, locale } = useI18n()
  const [data, setData] = useState<DashboardOverviewDto | null>(null)
  const [liveEvents, setLiveEvents] = useState<ReturnType<typeof normalizeEventRows>>([])

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [dashboardResponse, eventsResponse] = await Promise.all([
          getDashboardOverview(),
          getEventsOverview(),
        ])
        setData(dashboardResponse.data)
        setLiveEvents(normalizeEventRows(eventsResponse.data.stream, locale))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("page.overview.toast.loadError"))
      }
    }

    void loadDashboard()
  }, [])

  const actions = normalizeActions(data?.actions ?? [], locale)
  const stats = buildLiveEventStats(liveEvents, locale)

  const handleAction = (action: { cta: string; ctaKey?: string }) => {
    if (action.ctaKey?.toLowerCase().includes("rules")) {
      router.push("/dashboard/rules")
      return
    }
    if (action.ctaKey?.toLowerCase().includes("approvals")) {
      router.push("/dashboard/approvals")
      return
    }
    toast.message(action.cta)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.overview.title")}
        description={t("page.overview.description")}
      />

      {/* 核心指标 */}
      <MetricsGrid columns={4}>
        {normalizeMetrics(data?.metrics ?? [], locale).map((metric, index) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
            status={metric.status}
            icon={iconMap[index]}
          />
        ))}
      </MetricsGrid>

      {/* 统计图表 - 第一行 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RequestTrendChart data={stats.requestTrend} />
        <GeoDistributionChart data={stats.geoDistribution} />
      </div>

      {/* 统计图表 - 第二行 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <RealtimeTrafficChart 
          data={stats.realtimeTraffic} 
          className="lg:col-span-2"
        />
        <IPVersionChart 
          ipv4={stats.ipVersionStats.ipv4}
          ipv6={stats.ipVersionStats.ipv6}
        />
      </div>

      {/* 事件和操作 */}
      <div className="grid gap-6 lg:grid-cols-3">
          <EventStreamCard
          events={normalizeRecentEvents(data?.recentEvents ?? [], locale)}
          title={t("page.overview.recentEvents")}
          maxItems={5}
          className="lg:col-span-2"
        />
        <TopAttackersList 
          data={stats.topAttackers.slice(0, 4)}
        />
      </div>

      {/* 快捷操作 */}
      <ActionCard
        actions={actions}
        title={t("page.overview.quickActions")}
        onAction={handleAction}
      />
    </div>
  )
}
