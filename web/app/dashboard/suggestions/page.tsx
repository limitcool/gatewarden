"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
import { useI18n } from "@/components/i18n-provider"

const iconMap = [Lightbulb, CheckCircle, TrendingUp]

export default function SuggestionsPage() {
  const { t, locale } = useI18n()
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchValue, setSearchValue] = useState("")
  const [data, setData] = useState<SuggestionsOverviewDto | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()

  const loadSuggestions = useCallback(async () => {
    try {
      const response = await getSuggestionsOverview()
      setData(response.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("page.suggestions.toast.loadError"))
    }
  }, [t])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSuggestions()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadSuggestions])

  const filters = useMemo(() => normalizeFilters(data?.filters ?? [], locale).map((f) => ({
    ...f,
    active: f.value === activeFilter,
  })), [data?.filters, activeFilter, locale])

  const suggestions = useMemo(() => {
    return normalizeSuggestions(data?.suggestions ?? [], locale).filter((item) => {
      const combinedText = `${item.title} ${item.summary} ${item.badge}`.toLowerCase()
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "high" && (combinedText.includes("证据") || combinedText.includes("evidence"))) ||
        (activeFilter === "performance" && (combinedText.includes("限流") || combinedText.includes("rate limit"))) ||
        (activeFilter === "security" && (combinedText.includes("管理面") || combinedText.includes("鉴权") || combinedText.includes("admin") || combinedText.includes("auth"))) ||
        item.badge.toLowerCase().includes(activeFilter.toLowerCase())
      const keyword = searchValue.trim().toLowerCase()
      const matchesSearch =
        keyword.length === 0 ||
        item.title.toLowerCase().includes(keyword) ||
        item.summary.toLowerCase().includes(keyword)
      return matchesFilter && matchesSearch
    })
  }, [data?.suggestions, activeFilter, searchValue, locale])

  const handlePrimaryAction = (suggestion: { primaryAction: string }) => {
    if (suggestion.primaryAction.includes("审批") || suggestion.primaryAction.toLowerCase().includes("approval")) {
      router.push("/dashboard/approvals")
      return
    }
    toast.message(suggestion.primaryAction)
  }

  const handleSecondaryAction = (suggestion: { secondaryAction: string }) => {
    toast.message(t("page.suggestions.toast.recorded", { action: suggestion.secondaryAction }))
  }

  const handleRefreshSuggestions = async () => {
    setIsRefreshing(true)
    try {
      const response = await refreshSuggestionsOverview()
      setData(response.data)
      toast.success(t("page.suggestions.toast.refreshSuccess"))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("page.suggestions.toast.refreshError"))
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.suggestions.title")}
        description={t("page.suggestions.description")}
        action={(
          <div className="flex items-center gap-2">
            {data?.aiEnabled && data?.aiProvider && data?.aiModel ? (
              <div className="hidden rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground sm:block">
                {data.aiProvider} · {data.aiModel}
              </div>
            ) : null}
            <Button size="sm" onClick={() => void handleRefreshSuggestions()} disabled={isRefreshing}>
              {isRefreshing ? t("page.suggestions.refreshing") : t("page.suggestions.refresh")}
            </Button>
          </div>
        )}
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
        searchPlaceholder={t("page.suggestions.search")}
        onSearch={setSearchValue}
        onExtraAction={() => toast.message(t("page.suggestions.toast.filterHelp"))}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SuggestionCard
            suggestions={suggestions}
            title={t("page.suggestions.title")}
            onPrimaryAction={handlePrimaryAction}
            onSecondaryAction={handleSecondaryAction}
          />
        </div>
        <div>
          <DetailListCard
            details={normalizeDetails(data?.details ?? [], locale)}
            title={t("page.suggestions.details")}
          />
        </div>
      </div>
    </div>
  )
}
