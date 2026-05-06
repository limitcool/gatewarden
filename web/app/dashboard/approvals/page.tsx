"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
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

const iconMap = [Clock, CheckCircle, Timer]

export default function ApprovalsPage() {
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchValue, setSearchValue] = useState("")
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<ApprovalsOverviewDto | null>(null)

  const loadApprovals = async () => {
    try {
      const response = await getApprovalsOverview()
      setData(response.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载审批队列失败")
    }
  }

  useEffect(() => {
    void loadApprovals()
  }, [])
  const filters = useMemo(() => normalizeFilters(data?.filters ?? []).map((f) => ({
    ...f,
    active: f.value === activeFilter,
  })), [data?.filters, activeFilter])

  const approvals = useMemo(() => {
    return normalizeApprovals(data?.approvals ?? []).filter((approval) => {
      const matchesFilter =
        activeFilter === "all" ||
        activeFilter === "owner:operator" ||
        activeFilter === "target:caddy" ||
        (activeFilter === "state:pending" && approval.primaryAction.includes("批准")) ||
        approval.badge.toLowerCase().includes(activeFilter.toLowerCase())
      const keyword = searchValue.trim().toLowerCase()
      const matchesSearch =
        keyword.length === 0 ||
        approval.name.toLowerCase().includes(keyword) ||
        approval.summary.toLowerCase().includes(keyword)
      return matchesFilter && matchesSearch
    })
  }, [data?.approvals, activeFilter, searchValue])

  const handleApprove = (approval: { name: string }) => {
    startTransition(async () => {
      try {
        await approveRule(approval.name)
        toast.success(`已批准规则：${approval.name}`)
        await loadApprovals()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "批准失败")
      }
    })
  }

  const handleRevision = (approval: { name: string }) => {
    startTransition(async () => {
      try {
        await requestRuleRevision(approval.name)
        toast.success(`已退回规则：${approval.name}`)
        await loadApprovals()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "退回失败")
      }
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="审批队列"
        description="审核和批准待处理的规则变更"
      />

      <MetricsGrid columns={3}>
        {normalizeMetrics(data?.metrics ?? []).map((metric, index) => (
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
        searchPlaceholder="搜索审批项..."
        onSearch={setSearchValue}
        onExtraAction={() => toast.message("审批页已支持状态标签和关键字检索。")}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ApprovalQueueCard
            approvals={approvals}
            title="待审批队列"
            onApprove={handleApprove}
            onRevision={handleRevision}
          />
        </div>
        <div>
          <DetailListCard
            details={normalizeDetails(data?.details ?? [])}
            title="审批详情"
          />
        </div>
      </div>
    </div>
  )
}
