"use client"

import { useEffect, useState } from "react"
import { DashboardShell } from "./dashboard-shell"
import { I18nProvider, type Locale } from "@/components/i18n-provider"
import { getSettingsOverview } from "@/lib/console-api"

export function DashboardShellClient({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("zh-CN")

  useEffect(() => {
    const loadLocale = async () => {
      try {
        const response = await getSettingsOverview()
        setLocale(response.data.settings.locale === "en" ? "en" : "zh-CN")
      } catch {
        setLocale("zh-CN")
      }
    }

    void loadLocale()
  }, [])

  return (
    <I18nProvider locale={locale} setLocale={setLocale}>
      <DashboardShell>{children}</DashboardShell>
    </I18nProvider>
  )
}
