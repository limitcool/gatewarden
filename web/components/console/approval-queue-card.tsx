"use client"

import { useI18n } from "@/components/i18n-provider"
import { ShieldCheck } from "lucide-react"
import { ActionListCard } from "./action-list-card"

interface Approval {
  id?: string
  name: string
  displayName?: string
  summary: string
  badge: string
  primaryAction: string
  secondaryAction?: string
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
  title,
  className,
  onApprove,
  onRevision,
}: ApprovalQueueCardProps) {
  const { t } = useI18n()
  const items = approvals.map((approval) => ({
    ...approval,
    title: approval.displayName ?? approval.name,
    badgeVariant: "default" as const,
  }))

  return (
    <ActionListCard
      items={items}
      title={title ?? t("page.approvals.title")}
      icon={ShieldCheck}
      iconClassName="text-status-active"
      countLabel={t("common.pendingItems", { count: approvals.length })}
      emptyState={t("component.approval.empty")}
      className={className}
      onPrimaryAction={onApprove}
      onSecondaryAction={onRevision}
    />
  )
}
