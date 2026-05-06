"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScopeBadge } from "./scope-badge"

interface Approval {
  id?: string
  name: string
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">{approvals.length} 条待审批</span>
      </div>
      <div className="divide-y divide-border">
        {approvals.map((approval) => (
          <div
            key={approval.id ?? approval.name}
            className="flex flex-col sm:flex-row sm:items-center gap-4 px-4 py-4"
          >
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-sm font-mono font-medium text-foreground">
                  {approval.name}
                </code>
                <ScopeBadge>{approval.badge}</ScopeBadge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {approval.summary}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRevision?.(approval)}
                className="h-8 text-xs"
              >
                {approval.secondaryAction}
              </Button>
              <Button
                size="sm"
                onClick={() => onApprove?.(approval)}
                className="h-8 text-xs"
              >
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
