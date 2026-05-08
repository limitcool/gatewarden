"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { dictionary as zhDictionary } from "@/components/i18n-dictionaries/zh"

export type Locale = "en" | "zh-CN"

type DictionaryValue = string | ((params?: Record<string, string | number>) => string)
type TranslationDictionary = Record<string, DictionaryValue>

interface I18nContextValue {
  locale: Locale
  t: (key: string, params?: Record<string, string | number>) => string
  setLocale?: (locale: Locale) => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({
  locale,
  setLocale,
  children,
}: {
  locale: Locale
  setLocale?: (locale: Locale) => void
  children: React.ReactNode
}) {
  const [asyncDictionary, setAsyncDictionary] = useState<TranslationDictionary | null>(
    locale === "zh-CN" ? zhDictionary : null
  )

  useEffect(() => {
    let cancelled = false

    if (locale !== "en") {
      return () => {
        cancelled = true
      }
    }

    const loadDictionary = async () => {
      const dictionaryModule = await import("@/components/i18n-dictionaries/en")
      if (!cancelled) {
        setAsyncDictionary(dictionaryModule.dictionary as TranslationDictionary)
      }
    }

    void loadDictionary()

    return () => {
      cancelled = true
    }
  }, [locale])

  const dictionary = locale === "zh-CN" ? zhDictionary : (asyncDictionary ?? zhDictionary)

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t: (key, params) => {
      const entry = dictionary[key] ?? zhDictionary[key]
      if (!entry) {
        return key
      }
      return typeof entry === "function" ? entry(params) : entry
    },
  }), [dictionary, locale, setLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider")
  }
  return context
}
