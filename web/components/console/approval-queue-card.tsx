"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScopeBadge } from "./scope-badge"
import { ShieldCheck, ArrowUpRight, RotateCcw } from "lucide-react"

interface Approval {
  id?: string
  name: string
  displayName?: string
  summary: string
  badge: string
  primaryAction: string
  secondaryAction: string
}

interface ApprovalQueueCardProps {
  approvals: Approval[]
  title?: string
  className?: string
  onApprove?: (approval: Approval) => void
  onRevision?: (approval: Approval) => void
}

export function ApprovalQueueCard({
  approvals,
  title = "待审批队列",
  className,
  onApprove,
  onRevision,
}: ApprovalQueueCardProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-status-active" />
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
        </div>
        <span className="text-xs text-muted-foreground">{approvals.length} 条待审批</span>
      </div>
      <div className="divide-y divide-border">
        {approvals.map((approval) => (
          <div
            key={approval.id ?? approval.name}
            className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-sm font-mono font-medium text-foreground">
                  {approval.displayName ?? approval.name}
                </code>
                <ScopeBadge className="rounded-full">{approval.badge}</ScopeBadge>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {approval.summary}
              </p>
            </div>
            <div className="flex items-center gap-2 self-start lg:self-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRevision?.(approval)}
                className="h-8 rounded-full px-3 text-xs"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                {approval.secondaryAction}
              </Button>
              <Button
                size="sm"
                onClick={() => onApprove?.(approval)}
                className="h-8 rounded-full px-3 text-xs"
              >
                <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />
                {approval.primaryAction}
              </Button>
            </div>
          </div>
        ))}
        {approvals.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            暂无待审批项目
          </div>
        )}
      </div>
    </div>
  )
}
