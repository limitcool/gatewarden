"use client"

import { useI18n } from "@/components/i18n-provider"
import { cn } from "@/lib/utils"
import { HelperText, MetaLabel } from "./primitives"

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
    <div className={cn("overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm", className)}>
      {title && (
        <div className="border-b border-border/80 px-4 py-3">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        </div>
      )}
      <div className="divide-y divide-border">
        {details.map((detail, index) => (
          <div key={index} className="space-y-2 px-4 py-3.5">
            <div className="flex items-start justify-between gap-4">
              <MetaLabel className="shrink-0">{detail.label}</MetaLabel>
              <span className="max-w-[65%] text-right text-sm font-medium leading-relaxed text-foreground break-words">
                {detail.value}
              </span>
            </div>
            {detail.description && (
              <HelperText size="xs" className="max-w-[36ch]">{detail.description}</HelperText>
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
