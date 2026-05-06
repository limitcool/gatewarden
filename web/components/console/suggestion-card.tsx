"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScopeBadge } from "./scope-badge"
import { Lightbulb } from "lucide-react"

interface Suggestion {
  id?: string
  title: string
  summary: string
  badge: string
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
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
            className="flex flex-col sm:flex-row sm:items-center gap-4 px-4 py-4"
          >
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground">
                  {suggestion.title}
                </span>
                <ScopeBadge variant="outline">{suggestion.badge}</ScopeBadge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {suggestion.summary}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSecondaryAction?.(suggestion)}
                className="h-8 text-xs"
              >
                {suggestion.secondaryAction}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPrimaryAction?.(suggestion)}
                className="h-8 text-xs"
              >
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
