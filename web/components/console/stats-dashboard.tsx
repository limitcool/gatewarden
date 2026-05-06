"use client"

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
  return (
    <ChartCard
      title="请求趋势"
      subtitle="过去 24 小时"
      trend={{ value: 12, label: "较昨日" }}
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
              name="总请求"
              stroke="hsl(var(--primary))" 
              fill="url(#colorRequests)" 
              strokeWidth={2}
            />
            <Area 
              type="monotone" 
              dataKey="blocked" 
              name="已阻塞"
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
  return (
    <ChartCard
      title="地理分布"
      subtitle="按国家/地区"
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
            <Bar dataKey="requests" name="总请求" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            <Bar dataKey="blocked" name="已阻塞" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
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
  return (
    <ChartCard
      title="事件分类"
      subtitle="按类型分布"
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
  const total = ipv4 + ipv6
  const ipv4Percent = Math.round((ipv4 / total) * 100)
  const ipv6Percent = 100 - ipv4Percent

  return (
    <ChartCard
      title="IP 版本分布"
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
            <div className="text-xs text-muted-foreground">IPv4 请求</div>
            <div className="font-medium">{ipv4.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">IPv6 请求</div>
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
  return (
    <ChartCard
      title="实时流量"
      subtitle="每秒请求数 (RPS)"
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
  return (
    <ChartCard
      title="高风险 IP"
      subtitle="按阻塞数排序"
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
              <div className="text-xs text-muted-foreground">已阻塞</div>
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  )
}
