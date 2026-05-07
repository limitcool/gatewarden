"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/components/i18n-provider"
import { ArrowRight } from "lucide-react"

interface Action {
  id?: string
  title: string
  description: string
  cta: string
  ctaKey?: string
}

interface ActionCardProps {
  actions: Action[]
  title?: string
  className?: string
  onAction?: (action: Action) => void
}

export function ActionCard({
  actions,
  title,
  className,
  onAction,
}: ActionCardProps) {
  const { t } = useI18n()

  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">{title ?? t("page.overview.quickActions")}</h3>
      </div>
      <div className="divide-y divide-border">
        {actions.map((action) => (
          <div
            key={action.id ?? action.title}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{action.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAction?.(action)}
              className="h-8 text-xs shrink-0"
            >
              {action.cta}
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        ))}
        {actions.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            {t("component.action.empty")}
          </div>
        )}
      </div>
    </div>
  )
}
