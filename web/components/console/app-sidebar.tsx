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
  Menu,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface AppSidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

const navigation = [
  {
    name: "概览",
    href: "/dashboard/default",
    icon: LayoutDashboard,
  },
  {
    name: "事件流",
    href: "/dashboard/events",
    icon: Activity,
  },
  {
    name: "策略规则",
    href: "/dashboard/rules",
    icon: Shield,
  },
  {
    name: "智能建议",
    href: "/dashboard/suggestions",
    icon: Lightbulb,
  },
  {
    name: "审批队列",
    href: "/dashboard/approvals",
    icon: CheckCircle,
  },
  {
    name: "系统设置",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

export function AppSidebar({ collapsed = false, onToggle }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Header */}
      <div className="flex items-center h-14 px-4 border-b border-sidebar-border">
        {!collapsed && (
          <Link href="/dashboard/default" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded bg-foreground">
              <Shield className="h-4 w-4 text-background" />
            </div>
            <span className="font-semibold text-sm text-sidebar-foreground tracking-tight">
              Gatewarden
            </span>
          </Link>
        )}
        {collapsed && (
          <div className="flex items-center justify-center w-full">
            <div className="flex items-center justify-center w-7 h-7 rounded bg-foreground">
              <Shield className="h-4 w-4 text-background" />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                collapsed && "justify-center",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            "w-full h-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
            collapsed && "justify-center"
          )}
        >
          {collapsed ? (
            <Menu className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-xs">收起侧栏</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
