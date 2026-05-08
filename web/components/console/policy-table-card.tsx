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
  kind: string
  host?: string
  pathPrefix?: string
  rps?: number
  burst?: number
  adminPrefixes: string[]
  source?: string
}

interface PolicyTableCardProps {
  rules: Rule[]
  title?: string
  className?: string
  onRuleClick?: (rule: Rule) => void
  selectedRuleId?: string | null
}

export function PolicyTableCard({
  rules,
  title,
  className,
  onRuleClick,
  selectedRuleId,
}: PolicyTableCardProps) {
  const { t } = useI18n()
  const modeMap: Record<string, string> = {
    enforce: t("component.policy.mode.enforce"),
    shadow: t("component.policy.mode.shadow"),
    advisory: t("component.policy.mode.advisory"),
  }
  const kindMap: Record<string, string> = {
    "admin-protect": t("component.policy.kind.admin"),
    "rate-limit-ip": t("component.policy.kind.rateLimitIp"),
    "rate-limit-user": t("component.policy.kind.rateLimitUser"),
  }
  const sourceMap: Record<string, string> = {
    manual: t("component.policy.source.manual"),
    "approved-ai": t("component.policy.source.approvedAi"),
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm", className)}>
      <div className="flex items-center justify-between border-b border-border/80 px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title ?? t("page.rules.title")}</h3>
        <span className="text-xs text-muted-foreground">{t("common.rules", { count: rules.length })}</span>
      </div>
      <div className="divide-y divide-border">
        {rules.map((rule) => (
          <button
            key={rule.id}
            type="button"
            onClick={() => onRuleClick?.(rule)}
            aria-pressed={selectedRuleId === rule.id}
            className={cn(
              "group flex min-h-16 w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              selectedRuleId === rule.id && "bg-muted/40"
            )}
          >
            <div className="min-w-0 flex-1 space-y-2.5">
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
                <ScopeBadge variant="outline">{kindMap[rule.kind] || rule.kind}</ScopeBadge>
                <ScopeBadge variant="outline">{rule.scope}</ScopeBadge>
                <ScopeBadge>{modeMap[rule.mode] || rule.mode}</ScopeBadge>
                {rule.host ? (
                  <ScopeBadge variant="outline" className="font-mono">
                    {rule.host}
                  </ScopeBadge>
                ) : null}
                {rule.pathPrefix ? (
                  <ScopeBadge variant="outline" className="font-mono">
                    {rule.pathPrefix}
                  </ScopeBadge>
                ) : null}
                {!rule.pathPrefix && rule.adminPrefixes[0] ? (
                  <ScopeBadge variant="outline" className="font-mono">
                    {rule.adminPrefixes[0]}
                    {rule.adminPrefixes.length > 1 ? ` +${rule.adminPrefixes.length - 1}` : ""}
                  </ScopeBadge>
                ) : null}
                {rule.rps && rule.burst ? (
                  <ScopeBadge variant="outline">
                    {`${rule.rps} RPS / ${rule.burst} burst`}
                  </ScopeBadge>
                ) : null}
                {rule.source ? (
                  <ScopeBadge variant="outline">
                    {sourceMap[rule.source] || rule.source}
                  </ScopeBadge>
                ) : null}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </button>
        ))}
        {rules.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            {t("component.policy.empty")}
          </div>
        )}
      </div>
    </div>
  )
}
