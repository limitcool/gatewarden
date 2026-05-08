import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://gatewarden.init.cool'),
  title: 'Gatewarden',
  description: 'Open-source AI WAF for self-hosted apps, built for Caddy, trusted identity headers, deterministic enforcement, and reviewable AI-assisted security operations.',
  openGraph: {
    title: 'Gatewarden',
    description: 'Open-source AI WAF for self-hosted apps, built for Caddy, trusted identity headers, deterministic enforcement, and reviewable AI-assisted security operations.',
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gatewarden',
    description: 'Open-source AI WAF for self-hosted apps, built for Caddy, trusted identity headers, deterministic enforcement, and reviewable AI-assisted security operations.',
    images: ['/opengraph-image'],
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'oklch(0.985 0 0)' },
    { media: '(prefers-color-scheme: dark)', color: 'oklch(0.1 0 0)' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const locale = cookieStore.get('gatewarden-locale')?.value === 'en' ? 'en' : 'zh-CN'

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
