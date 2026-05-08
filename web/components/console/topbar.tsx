"use client"

import Link from "next/link"
import { Fragment, useState, useTransition } from "react"
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
import { Search, Bell, User, Moon, Sun, Menu, Github } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { useI18n } from "@/components/i18n-provider"
import { updateSettings } from "@/lib/console-api"
import { toast } from "sonner"

interface TopbarProps {
  className?: string
  onMenuClick?: () => void
  showMenuButton?: boolean
  mobileMenuOpen?: boolean
}

export function Topbar({
  className,
  onMenuClick,
  showMenuButton = false,
  mobileMenuOpen = false,
}: TopbarProps) {
  const { theme, setTheme } = useTheme()
  const { locale, setLocale, t } = useI18n()
  const [isSwitchingLocale, startSwitchingLocale] = useTransition()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const githubUrl = "https://github.com/limitcool/gatewarden"
  const utilityButtonClassName = "rounded-lg border border-transparent hover:border-border/80 hover:bg-muted/40"

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
    <Fragment>
      <header
        className={cn(
          "flex h-16 items-center justify-between border-b border-border/80 bg-background px-4 lg:px-6",
          className
        )}
      >
        <div className="flex items-center gap-4">
          {showMenuButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="h-11 w-11 rounded-lg lg:hidden"
              aria-label={t("shell.toggleMenu")}
              aria-pressed={mobileMenuOpen}
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label={t("topbar.search")}
              placeholder={t("topbar.search")}
              className="min-h-11 w-72 rounded-lg border-border/80 bg-muted/40 pl-9 text-sm shadow-none"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn(utilityButtonClassName, "sm:hidden")}
            onClick={() => setMobileSearchOpen((current) => !current)}
            aria-label={t("topbar.search")}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={utilityButtonClassName}
            asChild
          >
            <Link href={githubUrl} target="_blank" rel="noreferrer" aria-label={t("topbar.github")}>
              <Github className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={cn(utilityButtonClassName, "min-w-12 px-3 text-xs font-medium tabular-nums")}
            onClick={handleLocaleToggle}
            disabled={isSwitchingLocale}
            aria-label={t("topbar.language")}
          >
            <span className="sr-only">{t("topbar.language")}</span>
            {locale === "zh-CN" ? "EN" : "中"}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn(utilityButtonClassName, "relative")}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={t("topbar.theme")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">{t("topbar.theme")}</span>
          </Button>

          <DropdownMenu open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(utilityButtonClassName, "relative")}
                aria-label={t("topbar.notifications")}
              >
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
                  className="min-h-11 rounded-lg px-2.5 text-xs text-muted-foreground"
                  onClick={() => setHasUnreadNotifications(false)}
                >
                  {t("topbar.clearNotifications")}
                </Button>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex min-h-14 flex-col items-start gap-1 py-2.5">
                <span className="text-sm font-medium">{t("topbar.pendingRule")}</span>
                <span className="text-xs text-muted-foreground">{t("topbar.pendingRuleDesc")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex min-h-14 flex-col items-start gap-1 py-2.5">
                <span className="text-sm font-medium">{t("topbar.securityAlert")}</span>
                <span className="text-xs text-muted-foreground">{t("topbar.securityAlertDesc")}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs text-center text-muted-foreground">
                {t("topbar.viewAllNotifications")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(utilityButtonClassName, "gap-2 px-2.5")}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-secondary/70">
                  <User className="h-4 w-4 text-foreground/80" />
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
      {mobileSearchOpen ? (
        <div className="border-b border-border/80 bg-background px-4 pb-3 sm:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              aria-label={t("topbar.search")}
              placeholder={t("topbar.search")}
              className="min-h-11 rounded-lg border-border/80 bg-muted/40 pl-9 text-sm shadow-none"
            />
          </div>
        </div>
      ) : null}
    </Fragment>
  )
}
