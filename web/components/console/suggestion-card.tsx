"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScopeBadge } from "./scope-badge"
import { ArrowUpRight, Clock3, Lightbulb } from "lucide-react"

interface Suggestion {
  id?: string
  title: string
  summary: string
  badge: string
  confidence?: string
  evidence?: string[]
  proposedRule?: string
  model?: string
  generatedAt?: string
  primaryAction: string
  secondaryAction: string
}

interface SuggestionCardProps {
  suggestions: Suggestion[]
  title?: string
  className?: string
  onPrimaryAction?: (suggestion: Suggestion) => void
  onSecondaryAction?: (suggestion: Suggestion) => void
}

export function SuggestionCard({
  suggestions,
  title = "智能建议",
  className,
  onPrimaryAction,
  onSecondaryAction,
}: SuggestionCardProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-status-warning" />
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
        </div>
        <span className="text-xs text-muted-foreground">{suggestions.length} 条建议</span>
      </div>
      <div className="divide-y divide-border">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id ?? suggestion.title}
            className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {suggestion.title}
                </span>
                <ScopeBadge variant="outline" className="rounded-full">
                  {suggestion.badge}
                </ScopeBadge>
                {suggestion.confidence ? (
                  <span className="text-[11px] text-muted-foreground">
                    置信度 {suggestion.confidence}
                  </span>
                ) : null}
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {suggestion.summary}
              </p>
              {suggestion.evidence && suggestion.evidence.length > 0 ? (
                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <div className="text-[11px] font-medium text-foreground">证据</div>
                  <div className="mt-2 space-y-1.5">
                    {suggestion.evidence.map((item, index) => (
                      <p key={`${suggestion.id ?? suggestion.title}-evidence-${index}`} className="text-xs leading-relaxed text-muted-foreground">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
              {suggestion.proposedRule ? (
                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <div className="text-[11px] font-medium text-foreground">拟议规则草案</div>
                  <code className="mt-2 block whitespace-pre-wrap break-all text-[11px] text-muted-foreground">
                    {suggestion.proposedRule}
                  </code>
                </div>
              ) : null}
              {suggestion.model || suggestion.generatedAt ? (
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  {suggestion.model ? <span>{suggestion.model}</span> : null}
                  {suggestion.generatedAt ? <span>{suggestion.generatedAt}</span> : null}
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-2 self-start lg:self-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSecondaryAction?.(suggestion)}
                className="h-8 rounded-full px-3 text-xs"
              >
                <Clock3 className="mr-1.5 h-3.5 w-3.5" />
                {suggestion.secondaryAction}
              </Button>
              <Button
                size="sm"
                onClick={() => onPrimaryAction?.(suggestion)}
                className="h-8 rounded-full px-3 text-xs"
              >
                <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />
                {suggestion.primaryAction}
              </Button>
            </div>
          </div>
        ))}
        {suggestions.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            暂无智能建议
          </div>
        )}
      </div>
    </div>
  )
}
