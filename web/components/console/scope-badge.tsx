"use client"

import { cn } from "@/lib/utils"

interface ScopeBadgeProps {
  children: React.ReactNode
  variant?: "default" | "outline"
  className?: string
}

export function ScopeBadge({ children, variant = "default", className }: ScopeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded",
        variant === "default" 
          ? "bg-secondary text-secondary-foreground" 
          : "border border-border text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  )
}
