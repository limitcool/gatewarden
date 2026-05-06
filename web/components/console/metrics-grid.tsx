"use client"

import { cn } from "@/lib/utils"

interface MetricsGridProps {
  children: React.ReactNode
  className?: string
  columns?: 2 | 3 | 4
}

export function MetricsGrid({ children, className, columns = 4 }: MetricsGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  )
}
