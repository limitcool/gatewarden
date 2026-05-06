import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://github.com/limitcool/gatewarden'),
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
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
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
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
