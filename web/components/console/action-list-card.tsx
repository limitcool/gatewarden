"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScopeBadge } from "./scope-badge"
import type { LucideIcon } from "lucide-react"

export interface ActionListItem {
  id?: string
  title: string
  summary: string
  badge: string
  badgeVariant?: "default" | "outline"
  meta?: string
  primaryAction: string
  secondaryAction?: string
}

interface ActionListCardProps<TItem extends ActionListItem> {
  items: TItem[]
  title: string
  icon: LucideIcon
  iconClassName?: string
  countLabel?: string
  emptyState: string
  className?: string
  onPrimaryAction?: (item: TItem) => void
  onSecondaryAction?: (item: TItem) => void
}

export function ActionListCard<TItem extends ActionListItem>({
  items,
  title,
  icon: Icon,
  iconClassName,
  countLabel,
  emptyState,
  className,
  onPrimaryAction,
  onSecondaryAction,
}: ActionListCardProps<TItem>) {
  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4 text-muted-foreground", iconClassName)} />
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {countLabel ?? `${items.length} 条`}
        </span>
      </div>

      <div className="divide-y divide-border">
        {items.map((item) => (
          <div
            key={item.id ?? item.title}
            className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 text-sm font-medium text-foreground">
                  {item.title}
                </div>
                <ScopeBadge variant={item.badgeVariant ?? "default"} className="rounded-full">
                  {item.badge}
                </ScopeBadge>
                {item.meta ? (
                  <span className="text-[11px] text-muted-foreground">{item.meta}</span>
                ) : null}
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {item.summary}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start lg:self-center">
              {item.secondaryAction ? (
                <Button
                  variant="outline"
                  size="pill"
                  onClick={() => onSecondaryAction?.(item)}
                >
                  {item.secondaryAction}
                </Button>
              ) : null}
              <Button
                size="pill"
                onClick={() => onPrimaryAction?.(item)}
              >
                {item.primaryAction}
              </Button>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {emptyState}
          </div>
        )}
      </div>
    </div>
  )
}
