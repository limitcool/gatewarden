"use client"

import { cn } from "@/lib/utils"
import { useI18n } from "@/components/i18n-provider"
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
  title,
  className,
  maxItems = 5,
}: EventStreamCardProps) {
  const { t } = useI18n()
  const displayedEvents = events.slice(0, maxItems)

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm", className)}>
      <div className="flex items-center justify-between border-b border-border/80 px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title ?? t("page.overview.recentEvents")}</h3>
        <span className="text-xs text-muted-foreground">{t("common.requests", { count: events.length })}</span>
      </div>
      <div className="divide-y divide-border">
        {displayedEvents.map((event) => {
          const config = severityConfig[event.severity]
          const Icon = config.icon

          return (
            <div
              key={event.id}
              className="flex items-start gap-3 px-4 py-3.5"
            >
              <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.className)} />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
                <p className="truncate text-xs leading-relaxed text-muted-foreground">{event.subtitle}</p>
              </div>
              {event.timestamp && (
                <span className="text-xs text-muted-foreground shrink-0">{event.timestamp}</span>
              )}
            </div>
          )
        })}
        {events.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            {t("component.eventStream.empty")}
          </div>
        )}
      </div>
    </div>
  )
}
