"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ScopeBadgeProps {
  children: React.ReactNode
  variant?: "default" | "outline"
  className?: string
}

export function ScopeBadge({ children, variant = "default", className }: ScopeBadgeProps) {
  return (
    <Badge
      variant={variant === "default" ? "secondary" : "outline"}
      className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", className)}
    >
      {children}
    </Badge>
  )
}
