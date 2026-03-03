'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { SiteRenderer } from '@/components/editor/SiteRenderer'
import { Website } from '@/types/editor'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

export default function PreviewPage() {
  const params = useParams()
  const siteId = params.siteId as string
  const [website, setWebsite] = useState<Website | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWebsite = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!siteId) {
          setError('No site ID provided')
          return
        }

        // Fetch website data from Firestore
        const websiteDoc = await getDoc(doc(db, 'websites', siteId))
        
        if (!websiteDoc.exists()) {
          setError('Website not found')
          return
        }

        const websiteData = websiteDoc.data()
        
        // Convert Firestore timestamps to Date objects
        const website: Website = {
          id: websiteDoc.id,
          name: websiteData.name || 'Untitled Website',
          description: websiteData.description || '',
          domain: websiteData.domain || '',
          pages: websiteData.pages || [],
          settings: websiteData.settings || {
            theme: 'default',
            colors: {
              primary: '#2563eb',
              secondary: '#6b7280',
              accent: '#3b82f6',
              background: '#ffffff',
              text: '#000000'
            },
            fonts: {
              heading: 'Inter',
              body: 'Inter'
            },
            layout: {
              maxWidth: 1200,
              padding: 20
            }
          },
          createdAt: websiteData.createdAt?.toDate() || new Date(),
          updatedAt: websiteData.updatedAt?.toDate() || new Date(),
          publishedAt: websiteData.publishedAt?.toDate(),
          status: websiteData.status || 'draft'
        }

        setWebsite(website)
      } catch (err) {
        console.error('Error fetching website:', err)
        setError('Failed to load website')
      } finally {
        setLoading(false)
      }
    }

    fetchWebsite()
  }, [siteId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Preview...</h3>
          <p className="text-gray-600">Please wait while we load your website</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Preview Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    )
  }

  if (!website) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Website Found</h3>
          <p className="text-gray-600">The requested website could not be loaded.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Preview Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-sm font-medium text-gray-900">
            Preview: {website.name}
          </h1>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {website.status}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => window.close()}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Close Preview
          </button>
        </div>
      </div>

      {/* Website Content */}
      <SiteRenderer 
        website={website} 
        isPreview={true}
        className="preview-content"
      />
    </div>
  )
}
