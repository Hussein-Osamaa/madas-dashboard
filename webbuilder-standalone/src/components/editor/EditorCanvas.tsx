'use client'

import { useState, useRef } from 'react'
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useEditor } from '@/contexts/EditorContext'
import { ComponentRenderer } from './ComponentRenderer'
import { DragOverlayContent } from './DragOverlayContent'

export function EditorCanvas() {
  const {
    currentPage,
    selectedComponent,
    selectComponent,
    addComponent,
    moveComponent
  } = useEditor()
  
  const [draggedComponent, setDraggedComponent] = useState<any>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const handleDragStart = (e: React.DragEvent) => {
    try {
      const componentData = JSON.parse(e.dataTransfer.getData('application/json'))
      setDraggedComponent(componentData)
    } catch (error) {
      console.error('Failed to parse drag data:', error)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    
    if (!draggedComponent) return
    
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const y = e.clientY - rect.top
    const componentHeight = 50 // Approximate height of each component
    const index = Math.floor(y / componentHeight)
    
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    
    if (!draggedComponent) return
    
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const y = e.clientY - rect.top
    const componentHeight = 50
    const index = Math.floor(y / componentHeight)
    
    addComponent(draggedComponent.defaultProps, index)
    
    setDraggedComponent(null)
    setDragOverIndex(null)
  }

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Deselect component if clicking on empty canvas
    if (e.target === e.currentTarget) {
      selectComponent(null)
    }
  }

  if (!currentPage) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No page selected</h3>
          <p className="text-gray-600">Select a page from the sidebar to start editing</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Canvas Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {currentPage.title}
            </h2>
            <p className="text-sm text-gray-600">
              {currentPage.content.blocks.length} components
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Desktop</span>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div
            ref={canvasRef}
            className="editor-canvas min-h-[600px] p-8"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleCanvasClick}
          >
            {currentPage.content.blocks.length === 0 ? (
              <div className="flex items-center justify-center h-96 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Start building your page
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Drag components from the sidebar or click to add them
                  </p>
                  <div className="text-sm text-gray-500">
                    Tip: You can also use keyboard shortcuts (Ctrl/Cmd + K)
                  </div>
                </div>
              </div>
            ) : (
              <DndContext
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
              >
                <SortableContext
                  items={currentPage.content.blocks.map(block => block.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {currentPage.content.blocks.map((block, index) => (
                      <div key={block.id}>
                        {/* Drop indicator */}
                        {dragOverIndex === index && (
                          <div className="h-1 bg-blue-500 rounded-full mb-4"></div>
                        )}
                        
                        <ComponentRenderer
                          component={block}
                          isSelected={selectedComponent === block.id}
                          onSelect={() => selectComponent(block.id)}
                        />
                      </div>
                    ))}
                    
                    {/* Drop indicator at the end */}
                    {dragOverIndex === currentPage.content.blocks.length && (
                      <div className="h-1 bg-blue-500 rounded-full mt-4"></div>
                    )}
                  </div>
                </SortableContext>
                
                <DragOverlay>
                  {draggedComponent && (
                    <DragOverlayContent component={draggedComponent} />
                  )}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
