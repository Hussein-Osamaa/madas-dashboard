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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Remove browser extension elements that cause hydration issues
              (function() {
                const removeExtensions = () => {
                  const elements = document.querySelectorAll('[id*="ext-"], [class*="ext-"], [id*="megabonus"], [class*="megabonus"]');
                  elements.forEach(el => el.remove());
                };
                
                // Remove immediately
                removeExtensions();
                
                // Remove after DOM is ready
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', removeExtensions);
                }
                
                // Remove periodically to catch dynamically added elements
                setInterval(removeExtensions, 1000);
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
