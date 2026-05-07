'use client'

import * as React from 'react'

type Theme = 'light' | 'dark' | 'system'

export interface ThemeProviderProps {
  children: React.ReactNode
  attribute?: 'class' | string
  defaultTheme?: Theme
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function getSystemTheme() {
  if (typeof window === 'undefined') {
    return 'dark' as const
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyThemeToDom(attribute: string, theme: Theme, enableSystem: boolean) {
  if (typeof document === 'undefined') {
    return getSystemTheme()
  }

  const resolved = theme === 'system' && enableSystem ? getSystemTheme() : (theme === 'system' ? 'dark' : theme)
  const root = document.documentElement

  if (attribute === 'class') {
    root.classList.remove('light', 'dark')
    root.classList.add(resolved)
  } else {
    root.setAttribute(attribute, resolved)
  }

  root.style.colorScheme = resolved
  return resolved
}

export function ThemeProvider({
  children,
  attribute = 'class',
  defaultTheme = 'system',
  enableSystem = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = React.useState<'light' | 'dark'>(() =>
    defaultTheme === 'system' && enableSystem ? 'dark' : (defaultTheme === 'system' ? 'dark' : defaultTheme)
  )

  React.useEffect(() => {
    const storedTheme = window.localStorage.getItem('gatewarden-theme') as Theme | null
    const nextTheme = storedTheme ?? defaultTheme
    setThemeState(nextTheme)
    setResolvedTheme(applyThemeToDom(attribute, nextTheme, enableSystem))
  }, [attribute, defaultTheme, enableSystem])

  React.useEffect(() => {
    if (!enableSystem || theme !== 'system') {
      return
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      setResolvedTheme(applyThemeToDom(attribute, 'system', enableSystem))
    }

    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [attribute, enableSystem, theme])

  const setTheme = React.useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme)
    window.localStorage.setItem('gatewarden-theme', nextTheme)
    setResolvedTheme(applyThemeToDom(attribute, nextTheme, enableSystem))
  }, [attribute, enableSystem])

  const value = React.useMemo<ThemeContextValue>(() => ({
    theme,
    resolvedTheme,
    setTheme,
  }), [theme, resolvedTheme, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider')
  }
  return context
}
