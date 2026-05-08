import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

export function ConsolePanel({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-2xl border border-border/80 bg-card p-5 shadow-sm", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function InsetPanel({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-xl border border-border/60 bg-background/70 p-4", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function MetaLabel({
  className,
  children,
  ...props
}: ComponentProps<"div"> & { children: ReactNode }) {
  return (
    <div
      className={cn("text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function HelperText({
  className,
  children,
  size = "sm",
  ...props
}: ComponentProps<"p"> & {
  children: ReactNode
  size?: "sm" | "xs"
}) {
  return (
    <p
      className={cn(
        size === "sm" ? "text-sm leading-relaxed text-muted-foreground" : "text-xs leading-relaxed text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </p>
  )
}
