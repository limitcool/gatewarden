"use client"

import { useState } from "react"
import { AppSidebar } from "./app-sidebar"
import { Topbar } from "./topbar"
import { cn } from "@/lib/utils"

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <div className="hidden lg:flex">
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Sidebar - Mobile */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-200",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <AppSidebar onToggle={() => setMobileSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          showMenuButton
          onMenuClick={() => setMobileSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-7xl mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
