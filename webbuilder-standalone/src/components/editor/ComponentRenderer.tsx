'use client'

import { useState } from 'react'
import { ContentBlock } from '@/types/editor'
import { ComponentProps } from '@/types/editor'
import { useEditor } from '@/contexts/EditorContext'
import { 
  Copy, 
  Trash2, 
  Move, 
  Eye, 
  EyeOff,
  Settings
} from 'lucide-react'

interface ComponentRendererProps {
  component: ContentBlock
  isSelected: boolean
  onSelect: () => void
}

export function ComponentRenderer({ 
  component, 
  isSelected, 
  onSelect 
}: ComponentRendererProps) {
  const { updateComponent, deleteComponent, duplicateComponent } = useEditor()
  const [isHovered, setIsHovered] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  const handleUpdate = (updates: Partial<ContentBlock>) => {
    updateComponent(component.id, updates)
  }

  const handleDelete = () => {
    deleteComponent(component.id)
  }

  const handleDuplicate = () => {
    duplicateComponent(component.id)
  }

  const handleToggleVisibility = () => {
    setIsVisible(!isVisible)
    // TODO: Implement visibility toggle in component data
  }

  const renderComponent = () => {
    switch (component.type) {
      case 'text':
        return (
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleUpdate({
              content: { ...component.content, text: e.currentTarget.textContent || '' }
            })}
            style={{
              ...component.styles,
              outline: 'none',
              minHeight: '1.5rem'
            }}
          >
            {component.content.text}
          </div>
        )

      case 'image':
        return (
          <img
            src={component.content.src}
            alt={component.content.alt}
            style={component.styles}
            onLoad={() => console.log('Image loaded')}
            onError={() => console.log('Image failed to load')}
          />
        )

      case 'button':
        return (
          <button
            style={component.styles}
            onClick={() => {
              if (component.content.href && component.content.href !== '#') {
                window.open(component.content.href, component.content.target || '_self')
              }
            }}
          >
            {component.content.text}
          </button>
        )

      case 'container':
        return (
          <div style={component.styles}>
            <div className="p-4 text-center text-gray-500 border-2 border-dashed border-gray-300 rounded">
              Container - Add components here
            </div>
          </div>
        )

      case 'row':
        return (
          <div style={component.styles}>
            <div className="p-4 text-center text-gray-500 border-2 border-dashed border-gray-300 rounded">
              Row - Add columns here
            </div>
          </div>
        )

      case 'column':
        return (
          <div style={component.styles}>
            <div className="p-4 text-center text-gray-500 border-2 border-dashed border-gray-300 rounded">
              Column - Add content here
            </div>
          </div>
        )

      case 'form':
        return (
          <form style={component.styles}>
            <div className="space-y-4">
              {component.content.fields?.map((field: any, index: number) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      className="w-full p-2 border border-gray-300 rounded-md"
                      rows={4}
                      placeholder={field.placeholder}
                      required={field.required}
                    />
                  ) : (
                    <input
                      type={field.type}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      placeholder={field.placeholder}
                      required={field.required}
                    />
                  )}
                </div>
              ))}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
              >
                {component.content.submitText || 'Submit'}
              </button>
            </div>
          </form>
        )

      default:
        return (
          <div style={component.styles} className="p-4 border border-gray-300 rounded">
            <div className="text-gray-500 text-center">
              Unknown component type: {component.type}
            </div>
          </div>
        )
    }
  }

  if (!isVisible) {
    return (
      <div
        className="relative group opacity-50"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="p-4 border border-gray-300 rounded bg-gray-100">
          <div className="flex items-center justify-center text-gray-500">
            <EyeOff className="w-4 h-4 mr-2" />
            Component hidden
          </div>
        </div>
        
        {/* Component Controls */}
        {(isSelected || isHovered) && (
          <div className="absolute -top-8 left-0 flex items-center space-x-1 bg-white border border-gray-200 rounded shadow-sm">
            <button
              onClick={handleToggleVisibility}
              className="p-1 hover:bg-gray-100 rounded"
              title="Show component"
            >
              <Eye className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`relative group ${
        isSelected ? 'component-selected' : isHovered ? 'component-hover' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      {/* Drag Handle */}
      <div className="drag-handle"></div>
      
      {/* Component Content */}
      <div className="relative">
        {renderComponent()}
      </div>

      {/* Component Controls */}
      {(isSelected || isHovered) && (
        <div className="absolute -top-8 left-0 flex items-center space-x-1 bg-white border border-gray-200 rounded shadow-sm">
          <button
            onClick={handleToggleVisibility}
            className="p-1 hover:bg-gray-100 rounded"
            title="Hide component"
          >
            <Eye className="w-3 h-3" />
          </button>
          <button
            onClick={handleDuplicate}
            className="p-1 hover:bg-gray-100 rounded"
            title="Duplicate component"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 hover:bg-gray-100 rounded text-red-600"
            title="Delete component"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <div className="w-px h-4 bg-gray-200"></div>
          <button
            className="p-1 hover:bg-gray-100 rounded cursor-move"
            title="Move component"
          >
            <Move className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Resize Handles */}
      {isSelected && (
        <>
          <div className="resize-handle resize-handle-nw"></div>
          <div className="resize-handle resize-handle-ne"></div>
          <div className="resize-handle resize-handle-sw"></div>
          <div className="resize-handle resize-handle-se"></div>
        </>
      )}
    </div>
  )
}
