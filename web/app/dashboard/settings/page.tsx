"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import {
  PageHeader,
  MetricCard,
  MetricsGrid,
  FilterBar,
  SettingsFormCard,
  type SettingsFormValues,
  DetailListCard,
} from "@/components/console"
import { Settings as SettingsIcon, Link2, CheckCircle } from "lucide-react"
import { getSettingsOverview, normalizeDetails, normalizeFilters, normalizeMetrics, updateSettings } from "@/lib/console-api"
import { toast } from "sonner"
import type { SettingsOverviewDto } from "@/lib/console-types"

const iconMap = [SettingsIcon, Link2, CheckCircle]

export default function SettingsPage() {
  const [activeFilter, setActiveFilter] = useState("basic")
  const [initialSettings, setInitialSettings] = useState<SettingsFormValues | null>(null)
  const [settings, setSettings] = useState<SettingsFormValues>({
    subjectHeader: "",
    emailHeader: "",
    locale: "zh-CN",
    notes: "",
    shadowModeEnabled: true,
  })
  const [searchValue, setSearchValue] = useState("")
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<SettingsOverviewDto | null>(null)

  const loadSettings = async () => {
    try {
      const response = await getSettingsOverview()
      setData(response.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载设置失败")
    }
  }

  useEffect(() => {
    void loadSettings()
  }, [])

  useEffect(() => {
    if (data?.settings) {
      const nextSettings: SettingsFormValues = {
        subjectHeader: data.settings.subjectHeader,
        emailHeader: data.settings.emailHeader,
        locale: data.settings.locale === "en" ? "en" : "zh-CN",
        notes: data.settings.notes,
        shadowModeEnabled: data.settings.shadowModeEnabled,
      }
      setSettings(nextSettings)
      setInitialSettings(nextSettings)
    }
  }, [data?.settings])

  const filters = useMemo(() => normalizeFilters(data?.filters ?? []).map((f) => ({
    ...f,
    active: f.value === activeFilter,
  })), [data?.filters, activeFilter])

  const filteredDetails = normalizeDetails(data?.details ?? []).filter((detail) => {
    const keyword = searchValue.trim().toLowerCase()
    const matchesSearch = keyword.length === 0 || detail.label.toLowerCase().includes(keyword) || detail.value.toLowerCase().includes(keyword)
    if (!matchesSearch) return false

    if (activeFilter === "basic") {
      return detail.label.includes("身份") || detail.label.includes("头部")
    }
    if (activeFilter === "integrations") {
      return detail.label.includes("映射") || detail.description.includes("加载")
    }
    if (activeFilter === "alerts") {
      return detail.description.includes("运行") || detail.description.includes("应用")
    }
    return true
  })

  const handleReset = () => {
    if (!initialSettings) return
    setSettings(initialSettings)
    toast.message("已恢复到当前已保存配置")
  }

  const handleSave = async (newSettings: SettingsFormValues) => {
    startTransition(async () => {
      try {
        await updateSettings({
          subjectHeader: newSettings.subjectHeader,
          emailHeader: newSettings.emailHeader,
          locale: newSettings.locale,
          notes: newSettings.notes,
          shadowModeEnabled: newSettings.shadowModeEnabled,
        })
        toast.success("设置已保存")
        await loadSettings()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "保存失败")
      }
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="系统设置"
        description="配置 Gatewarden 网关的全局参数"
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
        searchPlaceholder="搜索设置..."
        onSearch={setSearchValue}
        onExtraAction={() => toast.message("当前设置项以基础配置为主，后续可扩展更多分类面板。")}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SettingsFormCard
            settings={settings}
            onSettingsChange={setSettings}
            onSave={handleSave}
            onReset={handleReset}
            activeSection={(activeFilter === "integrations" || activeFilter === "alerts" || activeFilter === "advanced") ? activeFilter : "basic"}
            isLoading={isPending}
          />
        </div>
        <div>
          <DetailListCard
            details={filteredDetails}
            title="配置信息"
          />
        </div>
      </div>
    </div>
  )
}
