import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Website Builder - Madas',
  description: 'Build beautiful websites with our drag-and-drop editor',
  keywords: ['website builder', 'drag and drop', 'editor', 'web design'],
  authors: [{ name: 'Madas Team' }],
  creator: 'Madas',
  publisher: 'Madas',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BUILDER_URL || 'http://localhost:3002'),
  robots: {
    index: false,
    follow: false,
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
