"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import {
  PageHeader,
  MetricCard,
  MetricsGrid,
  FilterBar,
  ApprovalQueueCard,
  DetailListCard,
} from "@/components/console"
import { Clock, CheckCircle, Timer } from "lucide-react"
import { toast } from "sonner"
import { approveRule, getApprovalsOverview, normalizeApprovals, normalizeDetails, normalizeFilters, normalizeMetrics, requestRuleRevision } from "@/lib/console-api"
import type { ApprovalsOverviewDto } from "@/lib/console-types"
import { useI18n } from "@/components/i18n-provider"

const iconMap = [Clock, CheckCircle, Timer]

export default function ApprovalsPage() {
  const { t, locale } = useI18n()
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchValue, setSearchValue] = useState("")
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<ApprovalsOverviewDto | null>(null)

  const loadApprovals = useCallback(async () => {
    try {
      const response = await getApprovalsOverview()
      setData(response.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("page.approvals.toast.loadError"))
    }
  }, [t])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadApprovals()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadApprovals])
  const filters = useMemo(() => normalizeFilters(data?.filters ?? [], locale).map((f) => ({
    ...f,
    active: f.value === activeFilter,
  })), [data?.filters, activeFilter, locale])

  const approvals = useMemo(() => {
    return normalizeApprovals(data?.approvals ?? [], locale).filter((approval) => {
      const matchesFilter =
        activeFilter === "all" ||
        activeFilter === "owner:operator" ||
        activeFilter === "target:caddy" ||
        (activeFilter === "state:pending" &&
          (approval.primaryAction.toLowerCase().includes("批准") || approval.primaryAction.toLowerCase().includes("approve"))) ||
        approval.badge.toLowerCase().includes(activeFilter.toLowerCase())
      const keyword = searchValue.trim().toLowerCase()
      const matchesSearch =
        keyword.length === 0 ||
        approval.name.toLowerCase().includes(keyword) ||
        approval.summary.toLowerCase().includes(keyword)
      return matchesFilter && matchesSearch
    })
  }, [data?.approvals, activeFilter, searchValue, locale])

  const handleApprove = (approval: { name: string }) => {
    startTransition(async () => {
      try {
        await approveRule(approval.name)
        toast.success(t("page.approvals.toast.approveSuccess", { name: approval.name }))
        await loadApprovals()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("page.approvals.toast.approveError"))
      }
    })
  }

  const handleRevision = (approval: { name: string }) => {
    startTransition(async () => {
      try {
        await requestRuleRevision(approval.name)
        toast.success(t("page.approvals.toast.revisionSuccess", { name: approval.name }))
        await loadApprovals()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("page.approvals.toast.revisionError"))
      }
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.approvals.title")}
        description={t("page.approvals.description")}
      />

      <MetricsGrid columns={3}>
        {normalizeMetrics(data?.metrics ?? [], locale).map((metric, index) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
            icon={iconMap[index]}
          />
        ))}
      </MetricsGrid>

      <FilterBar
        filters={filters}
        onFilterChange={setActiveFilter}
        searchPlaceholder={t("page.approvals.search")}
        onSearch={setSearchValue}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ApprovalQueueCard
            approvals={approvals}
            title={t("page.approvals.title")}
            onApprove={handleApprove}
            onRevision={handleRevision}
          />
        </div>
        <div>
          <DetailListCard
            details={normalizeDetails(data?.details ?? [], locale)}
            title={t("page.approvals.details")}
          />
        </div>
      </div>
    </div>
  )
}
