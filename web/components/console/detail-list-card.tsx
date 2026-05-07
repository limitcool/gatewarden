"use client"

import { useI18n } from "@/components/i18n-provider"
import { cn } from "@/lib/utils"

interface DetailItem {
  label: string
  value: string
  description?: string
}

interface DetailListCardProps {
  details: DetailItem[]
  title?: string
  className?: string
}

export function DetailListCard({
  details,
  title,
  className,
}: DetailListCardProps) {
  const { t } = useI18n()

  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      {title && (
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
        </div>
      )}
      <div className="divide-y divide-border">
        {details.map((detail, index) => (
          <div key={index} className="px-4 py-3 space-y-1">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-muted-foreground shrink-0">{detail.label}</span>
              <span className="text-sm font-medium text-foreground text-right truncate">
                {detail.value}
              </span>
            </div>
            {detail.description && (
              <p className="text-xs text-muted-foreground">{detail.description}</p>
            )}
          </div>
        ))}
        {details.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            {t("component.detail.empty")}
          </div>
        )}
      </div>
    </div>
  )
}
