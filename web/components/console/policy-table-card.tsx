"use client"

import { useI18n } from "@/components/i18n-provider"
import { cn } from "@/lib/utils"
import { StatusBadge, type StatusType } from "./status-badge"
import { ScopeBadge } from "./scope-badge"
import { ChevronRight } from "lucide-react"

interface Rule {
  id: string
  name: string
  summary: string
  scope: string
  mode: string
  status: StatusType
}

interface PolicyTableCardProps {
  rules: Rule[]
  title?: string
  className?: string
  onRuleClick?: (rule: Rule) => void
}

export function PolicyTableCard({
  rules,
  title,
  className,
  onRuleClick,
}: PolicyTableCardProps) {
  const { t } = useI18n()
  const modeMap: Record<string, string> = {
    enforce: t("component.policy.mode.enforce"),
    shadow: t("component.policy.mode.shadow"),
    advisory: t("component.policy.mode.advisory"),
  }

  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">{title ?? t("page.rules.title")}</h3>
        <span className="text-xs text-muted-foreground">{t("common.rules", { count: rules.length })}</span>
      </div>
      <div className="divide-y divide-border">
        {rules.map((rule) => (
          <div
            key={rule.id}
            onClick={() => onRuleClick?.(rule)}
            className="flex items-center gap-4 px-4 py-4 hover:bg-accent/50 transition-colors cursor-pointer group"
          >
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-sm font-mono font-medium text-foreground">
                  {rule.name}
                </code>
                <StatusBadge status={rule.status} />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {rule.summary}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <ScopeBadge variant="outline">{rule.scope}</ScopeBadge>
                <ScopeBadge>{modeMap[rule.mode] || rule.mode}</ScopeBadge>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
        ))}
        {rules.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t("component.policy.empty")}
          </div>
        )}
      </div>
    </div>
  )
}
