"use client"

import { useState } from "react"
import { useI18n } from "@/components/i18n-provider"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  Globe,
  Shield,
  Tag,
  RefreshCw,
  CircleDashed
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

interface Filter {
  label: string
  value: string
  active?: boolean
  count?: number
}

export interface ProxyFilters {
  vpn?: boolean
  proxy?: boolean
  tor?: boolean
  datacenter?: boolean
}

type ProxyFilterKey = keyof ProxyFilters

interface AdvancedFilterProps {
  // 基础筛选
  filters?: Filter[]
  onFilterChange?: (value: string) => void
  // 搜索
  searchValue?: string
  searchPlaceholder?: string
  onSearch?: (value: string) => void
  // 高级筛选选项
  ipVersionOptions?: { label: string; value: string }[]
  ipVersionValue?: string
  onIPVersionChange?: (value: string) => void
  severityOptions?: { label: string; value: string }[]
  severityValue?: string
  onSeverityChange?: (value: string) => void
  statusCodeOptions?: { label: string; value: string }[]
  statusCodeValue?: string
  onStatusCodeChange?: (value: string) => void
  hostOptions?: { label: string; value: string; status?: "protected" | "unprotected" | "unknown" }[]
  hostValue?: string
  onHostChange?: (value: string) => void
  featuredHostOptions?: { label: string; value: string; status?: "protected" | "unprotected" | "unknown" }[]
  countryOptions?: { label: string; value: string }[]
  countryValue?: string
  onCountryChange?: (value: string) => void
  dateRange?: { from?: Date; to?: Date }
  onDateRangeChange?: (range: { from?: Date; to?: Date }) => void
  // 代理检测
  proxyFilters?: ProxyFilters
  onProxyFilterChange?: (filters: ProxyFilters) => void
  // 刷新
  onRefresh?: () => void
  isRefreshing?: boolean
  // 活跃筛选标签
  activeFilters?: { key: string; label: string; value: string }[]
  onRemoveFilter?: (key: string) => void
  onClearAllFilters?: () => void
  className?: string
}

export function AdvancedFilter({
  filters = [],
  onFilterChange,
  searchValue = "",
  searchPlaceholder = "",
  onSearch,
  ipVersionOptions = [],
  ipVersionValue = "all",
  onIPVersionChange,
  severityOptions = [],
  severityValue = "all",
  onSeverityChange,
  statusCodeOptions = [],
  statusCodeValue = "all",
  onStatusCodeChange,
  hostOptions = [],
  hostValue = "all",
  onHostChange,
  featuredHostOptions = [],
  countryOptions = [],
  countryValue = "all",
  onCountryChange,
  proxyFilters,
  onProxyFilterChange,
  onRefresh,
  isRefreshing = false,
  activeFilters = [],
  onRemoveFilter,
  onClearAllFilters,
  className,
}: AdvancedFilterProps) {
  const { t } = useI18n()
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [localSearch, setLocalSearch] = useState(searchValue)

  const defaultIpVersionOptions = [
    { label: t("common.all"), value: "all" },
    { label: "IPv4", value: "ipv4" },
    { label: "IPv6", value: "ipv6" },
  ]
  const defaultSeverityOptions = [
    { label: t("component.filter.severity.all"), value: "all" },
    { label: t("component.filter.severity.critical"), value: "critical" },
    { label: t("component.filter.severity.warning"), value: "warning" },
    { label: t("component.filter.severity.info"), value: "info" },
    { label: t("component.filter.severity.success"), value: "success" },
  ]
  const defaultStatusCodeOptions = [
    { label: t("component.filter.statusCode.all"), value: "all" },
    { label: t("component.filter.statusCode.2xx"), value: "2xx" },
    { label: t("component.filter.statusCode.4xx"), value: "4xx" },
    { label: t("component.filter.statusCode.5xx"), value: "5xx" },
    { label: t("component.filter.statusCode.404"), value: "404" },
    { label: t("component.filter.statusCode.429"), value: "429" },
    { label: t("component.filter.statusCode.500"), value: "500" },
    { label: t("component.filter.statusCode.502"), value: "502" },
    { label: t("component.filter.statusCode.504"), value: "504" },
  ]

  const resolvedIpVersionOptions = ipVersionOptions.length > 0 ? ipVersionOptions : defaultIpVersionOptions
  const resolvedSeverityOptions = severityOptions.length > 0 ? severityOptions : defaultSeverityOptions
  const resolvedStatusCodeOptions = statusCodeOptions.length > 0 ? statusCodeOptions : defaultStatusCodeOptions

  const handleSearchChange = (value: string) => {
    setLocalSearch(value)
    onSearch?.(value)
  }

  const handleProxyChange = (key: ProxyFilterKey, checked: boolean) => {
    if (proxyFilters && onProxyFilterChange) {
      onProxyFilterChange({
        ...proxyFilters,
        [key]: checked,
      })
    }
  }

  const hostButtonClassName = (status?: "protected" | "unprotected" | "unknown", active?: boolean) => {
    if (active) {
      return "border-foreground bg-foreground text-background hover:bg-foreground"
    }
    if (status === "unprotected") {
      return "border-status-error/30 bg-status-error/10 text-status-error hover:bg-status-error/15"
    }
    if (status === "protected") {
      return "border-status-active/30 bg-status-active/10 text-status-active hover:bg-status-active/15"
    }
    return "border-border bg-background text-foreground hover:bg-accent"
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* 主筛选栏 */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* 左侧：快捷筛选 */}
        <div className="flex items-center gap-2 flex-wrap">
          {filters.map((filter) => (
            <Button
              key={filter.value}
              variant={filter.active ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onFilterChange?.(filter.value)}
              className="text-xs"
            >
              {filter.label}
              {filter.count !== undefined && (
                <Badge variant="secondary" className="ml-1.5 min-h-5 px-1.5 text-[11px] bg-muted">
                  {filter.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* 右侧：搜索和高级筛选 */}
        <div className="flex items-center gap-2">
          {/* 搜索框 */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={localSearch}
              placeholder={searchPlaceholder || t("component.filter.searchPlaceholder")}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-9 pl-8 pr-9 text-sm"
            />
            {localSearch && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0.5 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => handleSearchChange("")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* 高级筛选 */}
          <Popover open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
                {t("component.filter.advanced")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="font-medium text-sm">{t("component.filter.advanced")}</div>
                
                {/* IP 版本 */}
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    {t("component.filter.ipVersion")}
                  </Label>
                  <Select onValueChange={onIPVersionChange} value={ipVersionValue}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder={t("component.filter.ipVersionPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {resolvedIpVersionOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 严重程度 */}
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    {t("component.filter.severity")}
                  </Label>
                  <Select onValueChange={onSeverityChange} value={severityValue}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder={t("component.filter.severityPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {resolvedSeverityOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 状态码 */}
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1.5">
                    <CircleDashed className="h-3.5 w-3.5" />
                    {t("component.filter.statusCode")}
                  </Label>
                  <Select onValueChange={onStatusCodeChange} value={statusCodeValue}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder={t("component.filter.statusCodePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {resolvedStatusCodeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 域名 */}
                {hostOptions.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" />
                      {t("component.filter.host")}
                    </Label>
                    <Select onValueChange={onHostChange} value={hostValue}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder={t("component.filter.hostPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">{t("component.filter.allHosts")}</SelectItem>
                        {hostOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}{opt.status === "unprotected" ? ` · ${t("common.unprotected")}` : opt.status === "protected" ? ` · ${t("common.protected")}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 国家/地区 */}
                {countryOptions.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" />
                      {t("component.filter.country")}
                    </Label>
                    <Select onValueChange={onCountryChange} value={countryValue}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder={t("component.filter.countryPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">{t("common.all")}</SelectItem>
                        {countryOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 代理检测 */}
                {proxyFilters && (
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" />
                      {t("component.filter.proxySignals")}
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex min-h-9 items-center gap-2 rounded-md px-2 text-xs cursor-pointer hover:bg-muted/60">
                        <Checkbox
                          checked={proxyFilters.vpn}
                          onCheckedChange={(checked) => handleProxyChange("vpn", !!checked)}
                        />
                        {t("component.filter.vpn")}
                      </label>
                      <label className="flex min-h-9 items-center gap-2 rounded-md px-2 text-xs cursor-pointer hover:bg-muted/60">
                        <Checkbox
                          checked={proxyFilters.proxy}
                          onCheckedChange={(checked) => handleProxyChange("proxy", !!checked)}
                        />
                        {t("component.filter.proxy")}
                      </label>
                      <label className="flex min-h-9 items-center gap-2 rounded-md px-2 text-xs cursor-pointer hover:bg-muted/60">
                        <Checkbox
                          checked={proxyFilters.tor}
                          onCheckedChange={(checked) => handleProxyChange("tor", !!checked)}
                        />
                        {t("component.filter.tor")}
                      </label>
                      <label className="flex min-h-9 items-center gap-2 rounded-md px-2 text-xs cursor-pointer hover:bg-muted/60">
                        <Checkbox
                          checked={proxyFilters.datacenter}
                          onCheckedChange={(checked) => handleProxyChange("datacenter", !!checked)}
                        />
                        {t("component.filter.datacenter")}
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2 border-t border-border">
                  <Button size="sm" className="text-xs" onClick={() => setAdvancedOpen(false)}>
                    {t("common.apply")}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* 刷新按钮 */}
          {onRefresh && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-9 p-0" 
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            </Button>
          )}
        </div>
      </div>

      {featuredHostOptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("component.filter.featuredHosts")}</span>
          <Button
            variant={hostValue === "all" ? "secondary" : "ghost"}
            size="sm"
            className="text-xs"
            onClick={() => onHostChange?.("all")}
          >
            {t("common.all")}
          </Button>
          {featuredHostOptions.map((host) => (
            <Button
              key={host.value}
              size="sm"
              variant="outline"
              className={cn("text-xs", hostButtonClassName(host.status, hostValue === host.value))}
              onClick={() => onHostChange?.(host.value)}
            >
              {host.label}
              {host.status === "unprotected" && <span className="ml-1 text-[11px]">{t("common.unprotected")}</span>}
            </Button>
          ))}
        </div>
      )}

      {/* 活跃筛选标签 */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">{t("common.currentFilters")}</span>
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-transparent bg-secondary px-2.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => onRemoveFilter?.(filter.key)}
            >
              {filter.label}: {filter.value}
              <X className="h-3 w-3" />
            </button>
          ))}
          {activeFilters.length > 1 && onClearAllFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={onClearAllFilters}
            >
              {t("common.clearAll")}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
