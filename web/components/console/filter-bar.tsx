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
  searchPlaceholder = "",
  onSearch,
  extraActionLabel = "",
  onExtraAction,
  className,
}: FilterBarProps) {
  const { t } = useI18n()

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-border/80 bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <Button
            key={filter.value}
            variant={filter.active ? "secondary" : "ghost"}
            size="pill"
            className={cn(
              "rounded-lg",
              filter.active && "border border-border/80 bg-secondary text-foreground shadow-sm"
            )}
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
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder || t("component.filter.searchPlaceholder")}
          onChange={(e) => onSearch?.(e.target.value)}
          className="h-9 rounded-lg border-border/80 bg-muted/30 pl-9 text-sm shadow-none"
        />
      </div>
    </div>
  )
}
