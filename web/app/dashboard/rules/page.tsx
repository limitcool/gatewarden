"use client"

import { useEffect, useMemo, useState } from "react"
import {
  PageHeader,
  MetricCard,
  MetricsGrid,
  FilterBar,
  PolicyTableCard,
  DetailListCard,
} from "@/components/console"
import { Button } from "@/components/ui/button"
import { Shield, Zap, Target, Plus } from "lucide-react"
import { toast } from "sonner"
import { getRulesOverview, normalizeDetails, normalizeFilters, normalizeMetrics, normalizeRules } from "@/lib/console-api"
import type { RulesOverviewDto } from "@/lib/console-types"

const iconMap = [Shield, Zap, Target]

export default function RulesPage() {
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchValue, setSearchValue] = useState("")
  const [selectedRuleName, setSelectedRuleName] = useState<string | null>(null)
  const [data, setData] = useState<RulesOverviewDto | null>(null)

  const loadRules = async () => {
    try {
      const response = await getRulesOverview()
      setData(response.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载规则失败")
    }
  }

  useEffect(() => {
    void loadRules()
  }, [])
  const filters = useMemo(() => normalizeFilters(data?.filters ?? []).map((f) => ({
    ...f,
    active: f.value === activeFilter,
  })), [data?.filters, activeFilter])

  const rules = useMemo(() => {
    const list = normalizeRules(data?.rules ?? [])
    return list.filter((rule) => {
      const matchesFilter = activeFilter === "all" || rule.status === activeFilter || rule.mode === activeFilter
      const keyword = searchValue.trim().toLowerCase()
      const matchesSearch =
        keyword.length === 0 ||
        rule.name.toLowerCase().includes(keyword) ||
        rule.summary.toLowerCase().includes(keyword) ||
        rule.scope.toLowerCase().includes(keyword)
      return matchesFilter && matchesSearch
    })
  }, [data?.rules, activeFilter, searchValue])

  const details = normalizeDetails(data?.details ?? [])
  const selectedRule = rules.find((rule) => rule.name === selectedRuleName) ?? rules[0]
  const selectedDetails = selectedRule
    ? [
        { label: "规则名称", value: selectedRule.name, description: "当前选中的持久化策略规则" },
        { label: "作用域", value: selectedRule.scope, description: "实时来自规则存储的匹配范围" },
        { label: "模式", value: selectedRule.mode, description: "当前执行模式" },
        { label: "状态", value: selectedRule.status, description: "当前审核或生效状态" },
      ]
    : details

  const handleCreateRule = () => {
    toast.info("当前 OSS 控制台暂未开放前端新建规则入口，请先从后端种子或审批流入库。")
  }

  const handleMoreFilters = () => {
    toast.message("支持按状态、模式和关键字筛选，后续可扩展为更细的规则属性过滤。")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="策略规则"
        description="管理网关的访问控制和安全策略"
        actions={
          <Button size="sm" className="h-8" onClick={handleCreateRule}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            新建规则
          </Button>
        }
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
        searchPlaceholder="搜索规则..."
        onSearch={setSearchValue}
        onExtraAction={handleMoreFilters}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PolicyTableCard
            rules={rules}
            title="规则列表"
            onRuleClick={(rule) => setSelectedRuleName(rule.name)}
          />
        </div>
        <div>
          <DetailListCard
            details={selectedDetails}
            title="规则详情"
          />
        </div>
      </div>
    </div>
  )
}
