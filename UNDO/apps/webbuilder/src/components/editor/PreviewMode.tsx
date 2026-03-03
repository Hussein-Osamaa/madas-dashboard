'use client'

import { useState } from 'react'
import { Button } from '@shared/shared'
import { X, Smartphone, Tablet, Monitor, Download, Share2 } from 'lucide-react'
import { useEditor } from '@/contexts/EditorContext'
import { ComponentRenderer } from './ComponentRenderer'

export function PreviewMode() {
  const { 
    currentPage, 
    setPreviewMode, 
    saveWebsite 
  } = useEditor()
  
  const [deviceView, setDeviceView] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  if (!currentPage) {
    return (
      <div className="preview-mode">
        <div className="preview-toolbar">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreviewMode(false)}
            >
              <X className="w-4 h-4 mr-2" />
              Exit Preview
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No page to preview
            </h3>
            <p className="text-gray-600">
              Select a page to preview your website
            </p>
          </div>
        </div>
      </div>
    )
  }

  const getDeviceStyles = () => {
    switch (deviceView) {
      case 'mobile':
        return { maxWidth: '375px', margin: '0 auto' }
      case 'tablet':
        return { maxWidth: '768px', margin: '0 auto' }
      default:
        return { maxWidth: '100%' }
    }
  }

  const handlePublish = async () => {
    await saveWebsite()
    // TODO: Implement actual publishing logic
    alert('Website published successfully!')
  }

  return (
    <div className="preview-mode">
      {/* Preview Toolbar */}
      <div className="preview-toolbar">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPreviewMode(false)}
          >
            <X className="w-4 h-4 mr-2" />
            Exit Preview
          </Button>
          
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={deviceView === 'mobile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDeviceView('mobile')}
              className="h-8 w-8 p-0"
            >
              <Smartphone className="w-4 h-4" />
            </Button>
            <Button
              variant={deviceView === 'tablet' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDeviceView('tablet')}
              className="h-8 w-8 p-0"
            >
              <Tablet className="w-4 h-4" />
            </Button>
            <Button
              variant={deviceView === 'desktop' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDeviceView('desktop')}
              className="h-8 w-8 p-0"
            >
              <Monitor className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={handlePublish}>
            Publish Website
          </Button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto bg-gray-100 p-8">
        <div style={getDeviceStyles()}>
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {currentPage.title}
              </h1>
              {currentPage.content.metadata?.description && (
                <p className="text-gray-600 mt-2">
                  {currentPage.content.metadata.description}
                </p>
              )}
            </div>
            
            {/* Page Content */}
            <div className="p-6">
              {currentPage.content.blocks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Empty page
                  </h3>
                  <p className="text-gray-600">
                    Add components to build your page
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {currentPage.content.blocks.map((block) => (
                    <ComponentRenderer
                      key={block.id}
                      component={block}
                      isSelected={false}
                      onSelect={() => {}}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
