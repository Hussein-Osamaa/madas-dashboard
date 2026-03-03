'use client'

import { useState } from 'react'
import { EditorToolbar } from './EditorToolbar'
import { ComponentLibrary } from './ComponentLibrary'
import { EditorCanvas } from './EditorCanvas'
import { PropertiesPanel } from './PropertiesPanel'
import { PreviewMode } from './PreviewMode'
import { useEditor } from '@/contexts/EditorContext'

export function EditorLayout() {
  const { isPreviewMode } = useEditor()
  const [sidebarWidth, setSidebarWidth] = useState(300)
  const [propertiesWidth, setPropertiesWidth] = useState(300)

  if (isPreviewMode) {
    return <PreviewMode />
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Toolbar */}
      <EditorToolbar />
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Component Library */}
        <div
          className="sidebar"
          style={{ width: sidebarWidth }}
        >
          <ComponentLibrary />
        </div>
        
        {/* Resize Handle */}
        <div
          className="w-1 bg-gray-300 cursor-col-resize hover:bg-gray-400 transition-colors"
          onMouseDown={(e) => {
            const startX = e.clientX
            const startWidth = sidebarWidth
            
            const handleMouseMove = (e: MouseEvent) => {
              const newWidth = startWidth + (e.clientX - startX)
              setSidebarWidth(Math.max(200, Math.min(500, newWidth)))
            }
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove)
              document.removeEventListener('mouseup', handleMouseUp)
            }
            
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
          }}
        />
        
        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col">
          <EditorCanvas />
        </div>
        
        {/* Resize Handle */}
        <div
          className="w-1 bg-gray-300 cursor-col-resize hover:bg-gray-400 transition-colors"
          onMouseDown={(e) => {
            const startX = e.clientX
            const startWidth = propertiesWidth
            
            const handleMouseMove = (e: MouseEvent) => {
              const newWidth = startWidth - (e.clientX - startX)
              setPropertiesWidth(Math.max(200, Math.min(500, newWidth)))
            }
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove)
              document.removeEventListener('mouseup', handleMouseUp)
            }
            
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
          }}
        />
        
        {/* Right Sidebar - Properties Panel */}
        <div
          className="properties-panel"
          style={{ width: propertiesWidth }}
        >
          <PropertiesPanel />
        </div>
      </div>
    </div>
  )
}
