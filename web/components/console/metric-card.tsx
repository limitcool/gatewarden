"use client"

import { cn } from "@/lib/utils"
import { StatusBadge, type StatusType } from "./status-badge"
import type { LucideIcon } from "lucide-react"

interface MetricCardProps {
  label: string
  value: string | number
  detail?: string
  status?: StatusType
  icon?: LucideIcon
  className?: string
}

export function MetricCard({
  label,
  value,
  detail,
  status,
  icon: Icon,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-2 p-4 rounded-lg border border-border bg-card",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {Icon && (
          <Icon className="h-4 w-4 text-muted-foreground/60" />
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </span>
        {status && <StatusBadge status={status} />}
      </div>
      {detail && (
        <p className="text-xs text-muted-foreground leading-relaxed">{detail}</p>
      )}
    </div>
  )
}
