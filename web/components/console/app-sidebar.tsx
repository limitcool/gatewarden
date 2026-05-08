"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Activity,
  Shield,
  Lightbulb,
  CheckCircle,
  Settings,
  ChevronLeft,
  X,
  Menu,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/components/i18n-provider"

interface AppSidebarProps {
  collapsed?: boolean
  onToggle?: () => void
  onNavigate?: () => void
  mobile?: boolean
}

export function AppSidebar({ collapsed = false, onToggle, onNavigate, mobile = false }: AppSidebarProps) {
  const pathname = usePathname()
  const { t } = useI18n()

  const navigation = [
    {
      name: t("nav.overview"),
      href: "/dashboard/default",
      icon: LayoutDashboard,
    },
    {
      name: t("nav.events"),
      href: "/dashboard/events",
      icon: Activity,
    },
    {
      name: t("nav.rules"),
      href: "/dashboard/rules",
      icon: Shield,
    },
    {
      name: t("nav.suggestions"),
      href: "/dashboard/suggestions",
      icon: Lightbulb,
    },
    {
      name: t("nav.approvals"),
      href: "/dashboard/approvals",
      icon: CheckCircle,
    },
    {
      name: t("nav.settings"),
      href: "/dashboard/settings",
      icon: Settings,
    },
  ]

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        {!collapsed && (
          <Link href="/dashboard/default" onClick={onNavigate} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
              <Shield className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <span className="block text-sm font-semibold tracking-tight text-sidebar-foreground">
                Gatewarden
              </span>
              <span className="block text-xs text-sidebar-foreground/60">
                {t("shell.consoleSubtitle")}
              </span>
            </div>
          </Link>
        )}
        {mobile && !collapsed ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            aria-label={t("shell.closeMenu")}
            className="ml-auto h-11 w-11 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
        {collapsed && (
          <div className="flex items-center justify-center w-full">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
              <Shield className="h-4 w-4" />
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.name}
              onClick={onNavigate}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg border border-transparent px-3 text-sm font-medium transition-colors",
                collapsed && "justify-center",
                isActive
                  ? "border-sidebar-border bg-background text-sidebar-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:border-sidebar-border/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          aria-label={collapsed ? t("shell.openMenu") : t("shell.collapse")}
          aria-expanded={!collapsed}
          className={cn(
            "min-h-11 w-full rounded-lg border border-transparent text-sidebar-foreground/70 hover:border-sidebar-border hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            collapsed && "justify-center"
          )}
        >
          {collapsed ? (
            <Menu className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-sm">{t("shell.collapse")}</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
