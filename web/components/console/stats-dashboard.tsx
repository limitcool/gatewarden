"use client"

import { useMemo } from "react"
import { useI18n } from "@/components/i18n-provider"
import { cn } from "@/lib/utils"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Minus, TrendingDown, TrendingUp } from "lucide-react"

interface ChartCardProps {
  title: string
  subtitle?: string
  trend?: {
    value: number
    label: string
  }
  children: React.ReactNode
  className?: string
}

function cssColor(token: string) {
  return `var(${token})`
}

function tooltipStyle() {
  return {
    backgroundColor: cssColor("--card"),
    border: `1px solid ${cssColor("--border")}`,
    borderRadius: "12px",
    fontSize: "12px",
    color: cssColor("--foreground"),
  }
}

function axisStroke() {
  return cssColor("--border")
}

function axisTick() {
  return { fontSize: 11, fill: cssColor("--muted-foreground") }
}

function ChartCard({ title, subtitle, trend, children, className }: ChartCardProps) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {trend ? (
          <div
            className={cn(
              "inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 text-xs font-medium",
              trend.value > 0
                ? "border-status-active/30 bg-status-active/10 text-status-active"
                : trend.value < 0
                  ? "border-status-error/30 bg-status-error/10 text-status-error"
                  : "border-border bg-muted text-muted-foreground"
            )}
          >
            {trend.value > 0 ? <TrendingUp className="h-3 w-3" /> : trend.value < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            <span>{trend.value > 0 ? "+" : ""}{trend.value}%</span>
            <span>{trend.label}</span>
          </div>
        ) : null}
      </div>
      {children}
    </section>
  )
}

interface RequestTrendChartProps {
  data: { time: string; requests: number; blocked: number }[]
  className?: string
}

export function RequestTrendChart({ data, className }: RequestTrendChartProps) {
  const { t } = useI18n()
  const tooltip = useMemo(() => tooltipStyle(), [])

  return (
    <ChartCard
      title={t("component.chart.requestTrend")}
      subtitle={t("component.chart.requestTrendSubtitle")}
      trend={{ value: 12, label: t("component.chart.vsYesterday") }}
      className={className}
    >
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gatewarden-requests" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={cssColor("--primary")} stopOpacity={0.16} />
                <stop offset="95%" stopColor={cssColor("--primary")} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gatewarden-blocked" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={cssColor("--destructive")} stopOpacity={0.16} />
                <stop offset="95%" stopColor={cssColor("--destructive")} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={axisStroke()} vertical={false} />
            <XAxis dataKey="time" tick={axisTick()} axisLine={{ stroke: axisStroke() }} tickLine={false} />
            <YAxis
              tick={axisTick()}
              axisLine={{ stroke: axisStroke() }}
              tickLine={false}
              tickFormatter={(value) => (value >= 1000 ? `${value / 1000}k` : value)}
            />
            <Tooltip contentStyle={tooltip} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Area
              type="monotone"
              dataKey="requests"
              name={t("component.chart.totalRequests")}
              stroke={cssColor("--primary")}
              fill="url(#gatewarden-requests)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="blocked"
              name={t("component.chart.blocked")}
              stroke={cssColor("--destructive")}
              fill="url(#gatewarden-blocked)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

interface GeoDistributionChartProps {
  data: { country: string; code: string; requests: number; blocked: number }[]
  className?: string
}

export function GeoDistributionChart({ data, className }: GeoDistributionChartProps) {
  const { t } = useI18n()
  const tooltip = useMemo(() => tooltipStyle(), [])

  return (
    <ChartCard
      title={t("component.chart.geoDistribution")}
      subtitle={t("component.chart.geoDistributionSubtitle")}
      className={className}
    >
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={axisStroke()} horizontal vertical={false} />
            <XAxis
              type="number"
              tick={axisTick()}
              axisLine={{ stroke: axisStroke() }}
              tickLine={false}
              tickFormatter={(value) => (value >= 1000 ? `${value / 1000}k` : value)}
            />
            <YAxis
              type="category"
              dataKey="country"
              tick={axisTick()}
              axisLine={{ stroke: axisStroke() }}
              tickLine={false}
              width={72}
            />
            <Tooltip contentStyle={tooltip} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Bar dataKey="requests" name={t("component.chart.totalRequests")} fill={cssColor("--primary")} radius={[0, 6, 6, 0]} />
            <Bar dataKey="blocked" name={t("component.chart.blocked")} fill={cssColor("--destructive")} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

interface EventCategoryChartProps {
  data: { name: string; value: number; color: string }[]
  className?: string
}

export function EventCategoryChart({ data, className }: EventCategoryChartProps) {
  const { t } = useI18n()
  const tooltip = useMemo(() => tooltipStyle(), [])

  return (
    <ChartCard
      title={t("component.chart.eventCategories")}
      subtitle={t("component.chart.eventCategoriesSubtitle")}
      className={className}
    >
      <div className="flex h-[220px] items-center gap-4">
        <div className="min-w-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={76} paddingAngle={2} dataKey="value">
                {data.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltip} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="hidden min-w-40 flex-col gap-2 sm:flex">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{item.name}</span>
              <span className="font-medium text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  )
}

interface IPVersionChartProps {
  ipv4: number
  ipv6: number
  className?: string
}

export function IPVersionChart({ ipv4, ipv6, className }: IPVersionChartProps) {
  const { t } = useI18n()
  const total = ipv4 + ipv6
  const ipv4Percent = total > 0 ? Math.round((ipv4 / total) * 100) : 0
  const ipv6Percent = total > 0 ? 100 - ipv4Percent : 0

  return (
    <ChartCard
      title={t("component.chart.ipVersion")}
      subtitle={t("component.chart.ipVersionSubtitle")}
      className={className}
    >
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("component.chart.ipv4Label")}</span>
              <span className="font-medium text-foreground">{ipv4Percent}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${ipv4Percent}%` }} />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("component.chart.ipv6Label")}</span>
              <span className="font-medium text-foreground">{ipv6Percent}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-status-info transition-[width]" style={{ width: `${ipv6Percent}%` }} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <div className="text-xs text-muted-foreground">{t("component.chart.ipv4Requests")}</div>
            <div className="mt-1 font-medium text-foreground">{ipv4.toLocaleString()}</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <div className="text-xs text-muted-foreground">{t("component.chart.ipv6Requests")}</div>
            <div className="mt-1 font-medium text-foreground">{ipv6.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </ChartCard>
  )
}

interface RealtimeTrafficChartProps {
  data: { time: string; value: number }[]
  className?: string
}

export function RealtimeTrafficChart({ data, className }: RealtimeTrafficChartProps) {
  const { t } = useI18n()
  const tooltip = useMemo(() => tooltipStyle(), [])

  return (
    <ChartCard
      title={t("component.chart.realtimeTraffic")}
      subtitle={t("component.chart.realtimeTrafficSubtitle")}
      className={className}
    >
      <div className="h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={axisStroke()} vertical={false} />
            <XAxis dataKey="time" tick={axisTick()} axisLine={{ stroke: axisStroke() }} tickLine={false} />
            <YAxis tick={axisTick()} axisLine={{ stroke: axisStroke() }} tickLine={false} />
            <Tooltip contentStyle={tooltip} />
            <Line
              type="monotone"
              dataKey="value"
              name={t("component.chart.rps")}
              stroke={cssColor("--status-active")}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

interface TopAttackersProps {
  data: { ip: string; version: "IPv4" | "IPv6"; country: string; requests: number; blocked: number }[]
  className?: string
  onIPClick?: (ip: string) => void
}

export function TopAttackersList({ data, className, onIPClick }: TopAttackersProps) {
  const { t } = useI18n()

  return (
    <ChartCard
      title={t("component.chart.topAttackers")}
      subtitle={t("component.chart.topAttackersSubtitle")}
      className={className}
    >
      <div className="space-y-2">
        {data.map((item, index) => (
          <button
            key={item.ip}
            type="button"
            className="flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-2.5 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            onClick={() => onIPClick?.(item.ip)}
          >
            <span className="w-5 shrink-0 text-xs text-muted-foreground">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <code className={cn("min-w-0 truncate font-mono text-sm text-foreground", item.version === "IPv6" && "text-xs")}>{item.ip}</code>
                <span className="inline-flex min-h-5 items-center rounded-full border border-border px-1.5 text-[11px] text-muted-foreground">
                  {item.version}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{item.country}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-status-error">{item.blocked.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{t("component.chart.blocked")}</div>
            </div>
          </button>
        ))}
      </div>
    </ChartCard>
  )
}
