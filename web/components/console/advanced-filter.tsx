"use client"

import { useState } from "react"
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
  onIPVersionChange?: (value: string) => void
  severityOptions?: { label: string; value: string }[]
  onSeverityChange?: (value: string) => void
  statusCodeOptions?: { label: string; value: string }[]
  onStatusCodeChange?: (value: string) => void
  countryOptions?: { label: string; value: string }[]
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
  searchPlaceholder = "搜索 IP、规则、事件...",
  onSearch,
  ipVersionOptions = [
    { label: "全部", value: "all" },
    { label: "IPv4", value: "ipv4" },
    { label: "IPv6", value: "ipv6" },
  ],
  onIPVersionChange,
  severityOptions = [
    { label: "全部级别", value: "all" },
    { label: "危险", value: "critical" },
    { label: "告警", value: "warning" },
    { label: "信息", value: "info" },
    { label: "成功", value: "success" },
  ],
  onSeverityChange,
  statusCodeOptions = [
    { label: "全部状态", value: "all" },
    { label: "2xx 成功", value: "2xx" },
    { label: "4xx 客户端错误", value: "4xx" },
    { label: "5xx 服务端错误", value: "5xx" },
    { label: "404 未找到", value: "404" },
    { label: "429 限流", value: "429" },
    { label: "500 内部错误", value: "500" },
    { label: "502 网关错误", value: "502" },
    { label: "504 超时", value: "504" },
  ],
  onStatusCodeChange,
  countryOptions = [],
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
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [localSearch, setLocalSearch] = useState(searchValue)

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
              className="h-8 text-xs"
            >
              {filter.label}
              {filter.count !== undefined && (
                <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px] bg-muted">
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
              placeholder={searchPlaceholder}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-8 pl-8 pr-8 text-sm"
            />
            {localSearch && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => handleSearchChange("")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* 高级筛选 */}
          <Popover open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
                高级筛选
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="font-medium text-sm">高级筛选</div>
                
                {/* IP 版本 */}
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    IP 版本
                  </Label>
                  <Select onValueChange={onIPVersionChange} defaultValue="all">
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="选择 IP 版本" />
                    </SelectTrigger>
                    <SelectContent>
                      {ipVersionOptions.map((opt) => (
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
                    严重程度
                  </Label>
                  <Select onValueChange={onSeverityChange} defaultValue="all">
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="选择严重程度" />
                    </SelectTrigger>
                    <SelectContent>
                      {severityOptions.map((opt) => (
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
                    状态码
                  </Label>
                  <Select onValueChange={onStatusCodeChange} defaultValue="all">
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="选择状态码范围" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusCodeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 国家/地区 */}
                {countryOptions.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" />
                      国家/地区
                    </Label>
                    <Select onValueChange={onCountryChange} defaultValue="all">
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="选择国家/地区" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">全部</SelectItem>
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
                      代理检测
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                          checked={proxyFilters.vpn}
                          onCheckedChange={(checked) => handleProxyChange("vpn", !!checked)}
                        />
                        VPN
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                          checked={proxyFilters.proxy}
                          onCheckedChange={(checked) => handleProxyChange("proxy", !!checked)}
                        />
                        代理
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                          checked={proxyFilters.tor}
                          onCheckedChange={(checked) => handleProxyChange("tor", !!checked)}
                        />
                        Tor
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                          checked={proxyFilters.datacenter}
                          onCheckedChange={(checked) => handleProxyChange("datacenter", !!checked)}
                        />
                        数据中心
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2 border-t border-border">
                  <Button size="sm" className="h-7 text-xs" onClick={() => setAdvancedOpen(false)}>
                    应用筛选
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
              className="h-8 w-8 p-0" 
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            </Button>
          )}
        </div>
      </div>

      {/* 活跃筛选标签 */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">当前筛选:</span>
          {activeFilters.map((filter) => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="text-xs h-6 gap-1 cursor-pointer hover:bg-secondary/80"
              onClick={() => onRemoveFilter?.(filter.key)}
            >
              {filter.label}: {filter.value}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          {activeFilters.length > 1 && onClearAllFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground"
              onClick={onClearAllFilters}
            >
              清除全部
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
