import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: {
    default: 'Lake County Local - Discover Local Businesses & Deals',
    template: '%s | Lake County Local',
  },
  description: 'Your trusted local directory for discovering businesses and exclusive deals in Lake County, Florida. Support local and save.',
  manifest: '/manifest.json',
  keywords: ['Lake County', 'local businesses', 'deals', 'directory', 'Florida', 'vouchers'],
  authors: [{ name: 'Lake County Local' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Lake County Local',
    title: 'Lake County Local - Discover Local Businesses & Deals',
    description: 'Your trusted local directory for discovering businesses and exclusive deals in Lake County, Florida.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lake County Local',
    description: 'Discover local businesses and exclusive deals in Lake County, Florida.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#11487e',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
