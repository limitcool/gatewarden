"use client"

import { cn } from "@/lib/utils"
import { HelperText, MetaLabel } from "./primitives"
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
        "relative flex min-h-[148px] flex-col justify-between rounded-xl border border-border/80 bg-card p-4 shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <MetaLabel>{label}</MetaLabel>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
              {value}
            </span>
            {status && <StatusBadge status={status} className="mb-1" />}
          </div>
        </div>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-secondary/60 text-foreground">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      {detail && (
        <HelperText size="xs" className="max-w-[30ch]">{detail}</HelperText>
      )}
    </div>
  )
}
