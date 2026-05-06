"use client"

import { cn } from "@/lib/utils"

export type StatusType = "active" | "review" | "shadow" | "blocked" | "info" | "advisory"

interface StatusBadgeProps {
  status: StatusType
  className?: string
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  active: {
    label: "生效中",
    className: "bg-status-active/15 text-status-active border-status-active/20",
  },
  review: {
    label: "待审核",
    className: "bg-status-warning/15 text-status-warning border-status-warning/20",
  },
  shadow: {
    label: "影子模式",
    className: "bg-status-warning/15 text-status-warning border-status-warning/20",
  },
  blocked: {
    label: "阻塞",
    className: "bg-status-error/15 text-status-error border-status-error/20",
  },
  info: {
    label: "信息",
    className: "bg-status-info/15 text-status-info border-status-info/20",
  },
  advisory: {
    label: "建议模式",
    className: "bg-status-warning/15 text-status-warning border-status-warning/20",
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
