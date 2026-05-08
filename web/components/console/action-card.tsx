"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/components/i18n-provider"
import { ArrowRight } from "lucide-react"
import { HelperText } from "./primitives"

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
    <div className={cn("overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm", className)}>
      <div className="border-b border-border/80 px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title ?? t("page.overview.quickActions")}</h3>
      </div>
      <div className="divide-y divide-border">
        {actions.map((action) => (
          <div
            key={action.id ?? action.title}
            className="flex items-center justify-between gap-4 px-4 py-3.5"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{action.title}</p>
              <HelperText size="xs" className="mt-1">{action.description}</HelperText>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction?.(action)}
              className="min-h-11 shrink-0 rounded-lg px-3 text-xs"
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
