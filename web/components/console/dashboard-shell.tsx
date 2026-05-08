"use client"

import { useState } from "react"
import { useI18n } from "@/components/i18n-provider"
import { AppSidebar } from "./app-sidebar"
import { Topbar } from "./topbar"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const { t } = useI18n()

  return (
    <div className="flex h-screen overflow-hidden bg-muted/20">
      <div className="hidden lg:flex">
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent
          side="left"
          className="w-[17rem] border-r border-sidebar-border bg-sidebar p-0 sm:max-w-none lg:hidden"
        >
          <SheetTitle className="sr-only">{t("shell.navigationTitle")}</SheetTitle>
          <AppSidebar
            mobile
            onToggle={() => setMobileSidebarOpen(false)}
            onNavigate={() => setMobileSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          showMenuButton
          mobileMenuOpen={mobileSidebarOpen}
          onMenuClick={() => setMobileSidebarOpen((current) => !current)}
        />
        <main className="flex-1 overflow-y-auto bg-muted/20">
          <div className="mx-auto max-w-7xl px-5 py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
