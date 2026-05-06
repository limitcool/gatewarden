"use client"

import { cn } from "@/lib/utils"
import { AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react"

type Severity = "critical" | "warning" | "info" | "success"

interface Event {
  id: string
  title: string
  subtitle: string
  severity: Severity
  timestamp?: string
}

interface EventStreamCardProps {
  events: Event[]
  title?: string
  className?: string
  maxItems?: number
}

const severityConfig: Record<Severity, { icon: typeof AlertCircle; className: string }> = {
  critical: {
    icon: AlertCircle,
    className: "text-status-error",
  },
  warning: {
    icon: AlertTriangle,
    className: "text-status-warning",
  },
  info: {
    icon: Info,
    className: "text-status-info",
  },
  success: {
    icon: CheckCircle,
    className: "text-status-active",
  },
}

export function EventStreamCard({
  events,
  title = "最近事件",
  className,
  maxItems = 5,
}: EventStreamCardProps) {
  const displayedEvents = events.slice(0, maxItems)

  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">{events.length} 条记录</span>
      </div>
      <div className="divide-y divide-border">
        {displayedEvents.map((event) => {
          const config = severityConfig[event.severity]
          const Icon = config.icon

          return (
            <div
              key={event.id}
              className="flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.className)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                <p className="text-xs text-muted-foreground truncate">{event.subtitle}</p>
              </div>
              {event.timestamp && (
                <span className="text-xs text-muted-foreground shrink-0">{event.timestamp}</span>
              )}
            </div>
          )
        })}
        {events.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            暂无事件记录
          </div>
        )}
      </div>
    </div>
  )
}
