"use client"

import { useEffect, useMemo, useState } from "react"
import {
  PageHeader,
  MetricCard,
  MetricsGrid,
  FilterBar,
  SuggestionCard,
  DetailListCard,
} from "@/components/console"
import { Lightbulb, CheckCircle, TrendingUp } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { getSuggestionsOverview, normalizeDetails, normalizeFilters, normalizeMetrics, normalizeSuggestions, refreshSuggestionsOverview } from "@/lib/console-api"
import type { SuggestionsOverviewDto } from "@/lib/console-types"
import { Button } from "@/components/ui/button"

const iconMap = [Lightbulb, CheckCircle, TrendingUp]

export default function SuggestionsPage() {
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchValue, setSearchValue] = useState("")
  const [data, setData] = useState<SuggestionsOverviewDto | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const response = await getSuggestionsOverview()
        setData(response.data)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "加载建议失败")
      }
    }

    void loadSuggestions()
  }, [])

  const filters = useMemo(() => normalizeFilters(data?.filters ?? []).map((f) => ({
    ...f,
    active: f.value === activeFilter,
  })), [data?.filters, activeFilter])

  const suggestions = useMemo(() => {
    return normalizeSuggestions(data?.suggestions ?? []).filter((item) => {
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "high" && item.badge.includes("证据")) ||
        (activeFilter === "performance" && item.title.includes("限流")) ||
        (activeFilter === "security" && (item.title.includes("管理面") || item.title.includes("鉴权"))) ||
        item.badge.toLowerCase().includes(activeFilter.toLowerCase())
      const keyword = searchValue.trim().toLowerCase()
      const matchesSearch =
        keyword.length === 0 ||
        item.title.toLowerCase().includes(keyword) ||
        item.summary.toLowerCase().includes(keyword)
      return matchesFilter && matchesSearch
    })
  }, [data?.suggestions, activeFilter, searchValue])

  const handlePrimaryAction = (suggestion: { primaryAction: string }) => {
    if (suggestion.primaryAction.includes("审批")) {
      router.push("/dashboard/approvals")
      return
    }
    toast.message(suggestion.primaryAction)
  }

  const handleSecondaryAction = (suggestion: { secondaryAction: string }) => {
    toast.message(`已记录：${suggestion.secondaryAction}`)
  }

  const handleRefreshSuggestions = async () => {
    setIsRefreshing(true)
    try {
      const response = await refreshSuggestionsOverview()
      setData(response.data)
      toast.success("AI 建议已刷新")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "刷新 AI 建议失败")
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="智能建议"
        description="基于 AI 分析的策略优化建议"
        action={(
          <div className="flex items-center gap-2">
            {data?.aiEnabled && data?.aiProvider && data?.aiModel ? (
              <div className="hidden rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground sm:block">
                {data.aiProvider} · {data.aiModel}
              </div>
            ) : null}
            <Button size="sm" onClick={() => void handleRefreshSuggestions()} disabled={isRefreshing}>
              {isRefreshing ? "分析中..." : "刷新 AI 建议"}
            </Button>
          </div>
        )}
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
        searchPlaceholder="搜索建议..."
        onSearch={setSearchValue}
        onExtraAction={() => toast.message("建议页已支持标签和关键字过滤。")}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SuggestionCard
            suggestions={suggestions}
            title="优化建议"
            onPrimaryAction={handlePrimaryAction}
            onSecondaryAction={handleSecondaryAction}
          />
        </div>
        <div>
          <DetailListCard
            details={normalizeDetails(data?.details ?? [])}
            title="建议详情"
          />
        </div>
      </div>
    </div>
  )
}
