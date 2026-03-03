'use client'

import dynamic from 'next/dynamic'
import { EditorProvider } from '@/contexts/EditorContext'

const EditorLayout = dynamic(() => import('./editor/EditorLayout').then(mod => ({ default: mod.EditorLayout })), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Website Builder...</h3>
        <p className="text-gray-600">Please wait while we prepare the editor</p>
      </div>
    </div>
  )
})

export function DynamicEditor() {
  return (
    <EditorProvider>
      <EditorLayout />
    </EditorProvider>
  )
}
