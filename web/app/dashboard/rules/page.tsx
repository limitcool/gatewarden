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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Shield, Zap, Target, Plus } from "lucide-react"
import { toast } from "sonner"
import { getRulesOverview, normalizeDetails, normalizeFilters, normalizeMetrics, normalizeRules } from "@/lib/console-api"
import type { RulesOverviewDto } from "@/lib/console-types"
import { useI18n } from "@/components/i18n-provider"

const iconMap = [Shield, Zap, Target]

export default function RulesPage() {
  const { t, locale } = useI18n()
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchValue, setSearchValue] = useState("")
  const [selectedRuleName, setSelectedRuleName] = useState<string | null>(null)
  const [data, setData] = useState<RulesOverviewDto | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [draftRuleName, setDraftRuleName] = useState("")
  const [draftRuleSummary, setDraftRuleSummary] = useState("")
  const [draftRuleScope, setDraftRuleScope] = useState("subject + path")

  const loadRules = async () => {
    try {
      const response = await getRulesOverview()
      setData(response.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("page.rules.toast.loadError"))
    }
  }

  useEffect(() => {
    void loadRules()
  }, [])
  const filters = useMemo(() => normalizeFilters(data?.filters ?? [], locale).map((f) => ({
    ...f,
    active: f.value === activeFilter,
  })), [data?.filters, activeFilter, locale])

  const rules = useMemo(() => {
    const list = normalizeRules(data?.rules ?? [], locale)
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
  }, [data?.rules, activeFilter, searchValue, locale])

  const details = normalizeDetails(data?.details ?? [], locale)
  const selectedRule = rules.find((rule) => rule.name === selectedRuleName) ?? rules[0]
  const selectedDetails = selectedRule
    ? [
        { label: locale === "zh-CN" ? "规则名称" : "Rule name", value: selectedRule.name, description: locale === "zh-CN" ? "当前选中的持久化策略规则" : "The currently selected persisted policy rule" },
        { label: locale === "zh-CN" ? "作用域" : "Scope", value: selectedRule.scope, description: locale === "zh-CN" ? "实时来自规则存储的匹配范围" : "The live matching scope from the rule store" },
        { label: locale === "zh-CN" ? "模式" : "Mode", value: selectedRule.mode, description: locale === "zh-CN" ? "当前执行模式" : "The current execution mode" },
        { label: locale === "zh-CN" ? "状态" : "Status", value: selectedRule.status, description: locale === "zh-CN" ? "当前审核或生效状态" : "The current review or active state" },
      ]
    : details

  const handleMoreFilters = () => {
    toast.message(t("page.rules.toast.filterHelp"))
  }

  const handleCreateRule = () => {
    toast.success(t("page.rules.toast.createSuccess"))
    setIsCreateOpen(false)
    setDraftRuleName("")
    setDraftRuleSummary("")
    setDraftRuleScope("subject + path")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.rules.title")}
        description={t("page.rules.description")}
        actions={
          <Button size="sm" className="h-8" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {t("page.rules.create")}
          </Button>
        }
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
        searchPlaceholder={t("page.rules.search")}
        onSearch={setSearchValue}
        onExtraAction={handleMoreFilters}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PolicyTableCard
            rules={rules}
            title={t("page.rules.title")}
            onRuleClick={(rule) => setSelectedRuleName(rule.name)}
          />
        </div>
        <div>
          <DetailListCard
            details={selectedDetails}
            title={t("page.rules.details")}
          />
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("page.rules.createDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("page.rules.createDialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("page.rules.createRuleName")}</Label>
              <Input
                value={draftRuleName}
                onChange={(event) => setDraftRuleName(event.target.value)}
                placeholder="protect-admin-surface-v3"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("page.rules.createScope")}</Label>
              <Input
                value={draftRuleScope}
                onChange={(event) => setDraftRuleScope(event.target.value)}
                placeholder="subject + path"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("page.rules.createSummary")}</Label>
              <Textarea
                rows={5}
                value={draftRuleSummary}
                onChange={(event) => setDraftRuleSummary(event.target.value)}
                placeholder={t("page.rules.createSummaryPlaceholder")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              {t("page.rules.cancel")}
            </Button>
            <Button
              onClick={handleCreateRule}
              disabled={!draftRuleName.trim() || !draftRuleSummary.trim()}
            >
              {t("page.rules.createDraft")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
