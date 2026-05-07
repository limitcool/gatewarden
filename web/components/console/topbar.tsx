"use client"

import { useEffect, useState, useTransition } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Bell, User, Moon, Sun, Menu } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { useI18n } from "@/components/i18n-provider"
import { updateSettings } from "@/lib/console-api"
import { toast } from "sonner"

interface TopbarProps {
  className?: string
  onMenuClick?: () => void
  showMenuButton?: boolean
}

export function Topbar({ className, onMenuClick, showMenuButton = false }: TopbarProps) {
  const { theme, setTheme } = useTheme()
  const { locale, setLocale, t } = useI18n()
  const [isSwitchingLocale, startSwitchingLocale] = useTransition()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true)

  useEffect(() => {
    if (isNotificationsOpen) {
      setHasUnreadNotifications(false)
    }
  }, [isNotificationsOpen])

  const handleLocaleToggle = () => {
    const nextLocale = locale === "zh-CN" ? "en" : "zh-CN"
    setLocale?.(nextLocale)
    startSwitchingLocale(async () => {
      try {
        await updateSettings({ locale: nextLocale })
      } catch (error) {
        setLocale?.(locale)
        toast.error(error instanceof Error ? error.message : t("topbar.localeError"))
      }
    })
  }

  return (
    <header
      className={cn(
        "flex h-16 items-center justify-between border-b border-border/80 bg-background px-4 lg:px-6",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <Button variant="ghost" size="sm" onClick={onMenuClick} className="h-9 w-9 rounded-lg p-0 lg:hidden">
            <Menu className="h-4 w-4" />
          </Button>
        )}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("topbar.search")}
            className="h-9 w-72 rounded-lg border-border/80 bg-muted/40 pl-9 text-sm shadow-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 min-w-12 rounded-lg border border-transparent px-2 text-xs font-medium hover:border-border/80 hover:bg-muted/50"
          onClick={handleLocaleToggle}
          disabled={isSwitchingLocale}
        >
          <span className="sr-only">{t("topbar.language")}</span>
          {locale === "zh-CN" ? "EN" : "中"}
        </Button>

        {/* Theme Toggle */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative h-9 w-9 rounded-lg border border-transparent p-0 hover:border-border/80 hover:bg-muted/50"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{t("topbar.theme")}</span>
        </Button>

        {/* Notifications */}
        <DropdownMenu open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="relative h-9 w-9 rounded-lg border border-transparent p-0 hover:border-border/80 hover:bg-muted/50">
              <Bell className="h-4 w-4" />
              {hasUnreadNotifications ? (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-status-error" />
              ) : null}
              <span className="sr-only">{t("topbar.notifications")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <div className="flex items-center justify-between px-2 py-1.5">
              <DropdownMenuLabel className="px-0 text-xs font-normal text-muted-foreground">
                {t("topbar.notifications")}
              </DropdownMenuLabel>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-md px-2 text-[11px] text-muted-foreground"
                onClick={() => setHasUnreadNotifications(false)}
              >
                {locale === "zh-CN" ? "清除红点" : "Clear dot"}
              </Button>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
              <span className="text-sm font-medium">{t("topbar.pendingRule")}</span>
              <span className="text-xs text-muted-foreground">{t("topbar.pendingRuleDesc")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
              <span className="text-sm font-medium">{t("topbar.securityAlert")}</span>
              <span className="text-xs text-muted-foreground">{t("topbar.securityAlertDesc")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs text-center text-muted-foreground">
              {t("topbar.viewAllNotifications")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 gap-2 rounded-lg border border-transparent px-2 hover:border-border/80 hover:bg-muted/50">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-secondary/70">
                <User className="h-3.5 w-3.5 text-foreground/80" />
              </div>
              <span className="hidden text-sm font-medium sm:inline-block">{t("topbar.admin")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{t("topbar.admin")}</p>
                <p className="text-xs text-muted-foreground">admin@example.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>{t("topbar.profile")}</DropdownMenuItem>
            <DropdownMenuItem>{t("topbar.docs")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">{t("topbar.logout")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
