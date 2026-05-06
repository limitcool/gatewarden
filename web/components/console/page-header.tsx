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
    <div className={cn("flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actionContent && <div className="flex items-center gap-2 mt-2 sm:mt-0">{actionContent}</div>}
    </div>
  )
}
