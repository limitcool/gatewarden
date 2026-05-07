"use client"

import { useI18n } from "@/components/i18n-provider"
import { cn } from "@/lib/utils"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

// 通用图表卡片
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

function ChartCard({ title, subtitle, trend, children, className }: ChartCardProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded",
            trend.value > 0 ? "text-status-active bg-status-active/10" : 
            trend.value < 0 ? "text-status-error bg-status-error/10" : 
            "text-muted-foreground bg-muted"
          )}>
            {trend.value > 0 ? <TrendingUp className="h-3 w-3" /> : 
             trend.value < 0 ? <TrendingDown className="h-3 w-3" /> : 
             <Minus className="h-3 w-3" />}
            {trend.value > 0 ? "+" : ""}{trend.value}% {trend.label}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

// 请求趋势图
interface RequestTrendChartProps {
  data: { time: string; requests: number; blocked: number }[]
  className?: string
}

export function RequestTrendChart({ data, className }: RequestTrendChartProps) {
  const { t } = useI18n()
  return (
    <ChartCard
      title={t("component.chart.requestTrend")}
      subtitle={t("component.chart.requestTrendSubtitle")}
      trend={{ value: 12, label: t("component.chart.vsYesterday") }}
      className={className}
    >
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
              tickFormatter={(value) => value >= 1000 ? `${value/1000}k` : value}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px"
              }}
            />
            <Area 
              type="monotone" 
              dataKey="requests" 
              name={t("component.chart.totalRequests")}
              stroke="hsl(var(--primary))" 
              fill="url(#colorRequests)" 
              strokeWidth={2}
            />
            <Area 
              type="monotone" 
              dataKey="blocked" 
              name={t("component.chart.blocked")}
              stroke="hsl(var(--destructive))" 
              fill="url(#colorBlocked)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

// 地理分布图
interface GeoDistributionChartProps {
  data: { country: string; code: string; requests: number; blocked: number }[]
  className?: string
}

export function GeoDistributionChart({ data, className }: GeoDistributionChartProps) {
  const { t } = useI18n()
  return (
    <ChartCard
      title={t("component.chart.geoDistribution")}
      subtitle={t("component.chart.geoDistributionSubtitle")}
      className={className}
    >
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
            <XAxis 
              type="number" 
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
              tickFormatter={(value) => value >= 1000 ? `${value/1000}k` : value}
            />
            <YAxis 
              type="category" 
              dataKey="country" 
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
              width={60}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px"
              }}
            />
            <Bar dataKey="requests" name={t("component.chart.totalRequests")} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            <Bar dataKey="blocked" name={t("component.chart.blocked")} fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

// 事件分类饼图
interface EventCategoryChartProps {
  data: { name: string; value: number; color: string }[]
  className?: string
}

export function EventCategoryChart({ data, className }: EventCategoryChartProps) {
  const { t } = useI18n()
  return (
    <ChartCard
      title={t("component.chart.eventCategories")}
      subtitle={t("component.chart.eventCategoriesSubtitle")}
      className={className}
    >
      <div className="h-[200px] flex items-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px"
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-2 mr-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-muted-foreground">{item.name}</span>
              <span className="font-medium ml-auto">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  )
}

// IP 版本分布
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
      subtitle="IPv4 vs IPv6"
      className={className}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">IPv4</span>
              <span className="font-medium">{ipv4Percent}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${ipv4Percent}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">IPv6</span>
              <span className="font-medium">{ipv6Percent}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-status-info rounded-full transition-all"
                style={{ width: `${ipv6Percent}%` }}
              />
            </div>
          </div>
        </div>
        <div className="pt-2 border-t border-border grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">{t("component.chart.ipv4Requests")}</div>
            <div className="font-medium">{ipv4.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("component.chart.ipv6Requests")}</div>
            <div className="font-medium">{ipv6.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </ChartCard>
  )
}

// 实时流量线图
interface RealtimeTrafficChartProps {
  data: { time: string; value: number }[]
  className?: string
}

export function RealtimeTrafficChart({ data, className }: RealtimeTrafficChartProps) {
  const { t } = useI18n()
  return (
    <ChartCard
      title={t("component.chart.realtimeTraffic")}
      subtitle={t("component.chart.realtimeTrafficSubtitle")}
      className={className}
    >
      <div className="h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px"
              }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              name="RPS"
              stroke="hsl(var(--status-active))" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

// Top 攻击者列表
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
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {data.map((item, index) => (
          <div 
            key={item.ip}
            className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors"
            onClick={() => onIPClick?.(item.ip)}
          >
            <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <code className={cn(
                  "font-mono text-sm truncate",
                  item.version === "IPv6" && "text-xs"
                )}>
                  {item.ip}
                </code>
                <span className="text-[10px] text-muted-foreground px-1 py-0.5 bg-secondary rounded">
                  {item.version}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">{item.country}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-destructive">{item.blocked.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{t("component.chart.blocked")}</div>
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  )
}
