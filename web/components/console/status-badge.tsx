"use client"

import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/components/i18n-provider"
import { cn } from "@/lib/utils"

export type StatusType = "active" | "review" | "shadow" | "blocked" | "info" | "advisory"

interface StatusBadgeProps {
  status: StatusType
  className?: string
}

const statusConfig: Record<StatusType, { labelKey: string; className: string }> = {
  active: {
    labelKey: "component.status.active",
    className: "bg-status-active/15 text-status-active border-status-active/20",
  },
  review: {
    labelKey: "component.status.review",
    className: "bg-status-warning/15 text-status-warning border-status-warning/20",
  },
  shadow: {
    labelKey: "component.status.shadow",
    className: "bg-status-warning/15 text-status-warning border-status-warning/20",
  },
  blocked: {
    labelKey: "component.status.blocked",
    className: "bg-status-error/15 text-status-error border-status-error/20",
  },
  info: {
    labelKey: "component.status.info",
    className: "bg-status-info/15 text-status-info border-status-info/20",
  },
  advisory: {
    labelKey: "component.status.advisory",
    className: "bg-status-warning/15 text-status-warning border-status-warning/20",
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useI18n()
  const config = statusConfig[status]

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        config.className,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {t(config.labelKey)}
    </Badge>
  )
}
