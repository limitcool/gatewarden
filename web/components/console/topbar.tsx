"use client"

import { useTransition } from "react"
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
        "flex items-center justify-between h-14 px-4 border-b border-border bg-background",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <Button variant="ghost" size="sm" onClick={onMenuClick} className="h-8 w-8 p-0 lg:hidden">
            <Menu className="h-4 w-4" />
          </Button>
        )}
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("topbar.search")}
            className="h-8 w-64 pl-8 text-sm bg-secondary border-0"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 min-w-12 px-2 text-xs font-medium"
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
          className="h-8 w-8 p-0 relative"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{t("topbar.theme")}</span>
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-status-error" />
              <span className="sr-only">{t("topbar.notifications")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              {t("topbar.notifications")}
            </DropdownMenuLabel>
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
            <Button variant="ghost" size="sm" className="h-8 gap-2 px-2">
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className="hidden sm:inline-block text-sm">{t("topbar.admin")}</span>
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
