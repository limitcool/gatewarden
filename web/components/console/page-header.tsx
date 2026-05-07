"use client"

import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, action, className }: PageHeaderProps) {
  const actionContent = actions || action
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border/80 pb-5 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actionContent && (
        <div className="mt-1 flex items-center gap-2 sm:mt-0 sm:shrink-0">
          {actionContent}
        </div>
      )}
    </div>
  )
}
