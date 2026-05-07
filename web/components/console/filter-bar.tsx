"use client"

import { useI18n } from "@/components/i18n-provider"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, SlidersHorizontal } from "lucide-react"

interface Filter {
  label: string
  value: string
  active?: boolean
}

interface FilterBarProps {
  filters?: Filter[]
  onFilterChange?: (value: string) => void
  searchPlaceholder?: string
  onSearch?: (value: string) => void
  extraActionLabel?: string
  onExtraAction?: () => void
  className?: string
}

export function FilterBar({
  filters = [],
  onFilterChange,
  searchPlaceholder = "搜索...",
  onSearch,
  extraActionLabel = "更多筛选",
  onExtraAction,
  className,
}: FilterBarProps) {
  const { t } = useI18n()

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map((filter) => (
          <Button
            key={filter.value}
            variant={filter.active ? "secondary" : "ghost"}
            size="pill"
            onClick={() => onFilterChange?.(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
        {filters.length > 0 && (
          <Button variant="ghost" size="pill" onClick={onExtraAction}>
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
            {extraActionLabel || t("common.moreFilters")}
          </Button>
        )}
      </div>
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder || t("component.filter.searchPlaceholder")}
          onChange={(e) => onSearch?.(e.target.value)}
          className="h-8 pl-8 text-sm"
        />
      </div>
    </div>
  )
}
