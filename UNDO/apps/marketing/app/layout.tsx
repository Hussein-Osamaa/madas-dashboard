import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Madas - Build Beautiful Websites with Ease',
  description: 'Create stunning websites without coding. Drag, drop, and publish with our intuitive website builder.',
  keywords: ['website builder', 'drag and drop', 'website creator', 'no-code', 'web design'],
  authors: [{ name: 'Madas Team' }],
  creator: 'Madas',
  publisher: 'Madas',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'Madas - Build Beautiful Websites with Ease',
    description: 'Create stunning websites without coding. Drag, drop, and publish with our intuitive website builder.',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    siteName: 'Madas',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Madas - Website Builder',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Madas - Build Beautiful Websites with Ease',
    description: 'Create stunning websites without coding. Drag, drop, and publish with our intuitive website builder.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
