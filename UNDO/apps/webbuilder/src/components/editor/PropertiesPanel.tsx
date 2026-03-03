'use client'

import { useState } from 'react'
import { Button, Input } from '@shared/shared'
import { useEditor } from '@/contexts/EditorContext'
import { 
  Type, 
  Palette, 
  Layout, 
  Settings,
  Eye,
  EyeOff,
  Copy,
  Trash2
} from 'lucide-react'

export function PropertiesPanel() {
  const { 
    currentPage, 
    selectedComponent, 
    updateComponent, 
    deleteComponent, 
    duplicateComponent 
  } = useEditor()
  
  const [activeTab, setActiveTab] = useState('content')

  const selectedBlock = currentPage?.content.blocks.find(
    block => block.id === selectedComponent
  )

  if (!selectedBlock) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No component selected
          </h3>
          <p className="text-gray-600">
            Select a component to edit its properties
          </p>
        </div>
      </div>
    )
  }

  const handleContentUpdate = (field: string, value: any) => {
    updateComponent(selectedBlock.id, {
      content: { ...selectedBlock.content, [field]: value }
    })
  }

  const handleStyleUpdate = (property: string, value: any) => {
    updateComponent(selectedBlock.id, {
      styles: { ...selectedBlock.styles, [property]: value }
    })
  }

  const renderContentProperties = () => {
    switch (selectedBlock.type) {
      case 'text':
        return (
          <div className="space-y-4">
            <div>
              <label className="property-label">Text Content</label>
              <textarea
                value={selectedBlock.content.text || ''}
                onChange={(e) => handleContentUpdate('text', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                rows={3}
              />
            </div>
            
            <div>
              <label className="property-label">Text Level</label>
              <select
                value={selectedBlock.content.level || 'p'}
                onChange={(e) => handleContentUpdate('level', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
                <option value="h4">Heading 4</option>
                <option value="h5">Heading 5</option>
                <option value="h6">Heading 6</option>
                <option value="p">Paragraph</option>
              </select>
            </div>
            
            <div>
              <label className="property-label">Text Align</label>
              <select
                value={selectedBlock.content.align || 'left'}
                onChange={(e) => handleContentUpdate('align', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
                <option value="justify">Justify</option>
              </select>
            </div>
          </div>
        )

      case 'image':
        return (
          <div className="space-y-4">
            <div>
              <label className="property-label">Image URL</label>
              <Input
                value={selectedBlock.content.src || ''}
                onChange={(e) => handleContentUpdate('src', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            
            <div>
              <label className="property-label">Alt Text</label>
              <Input
                value={selectedBlock.content.alt || ''}
                onChange={(e) => handleContentUpdate('alt', e.target.value)}
                placeholder="Image description"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="property-label">Width</label>
                <Input
                  value={selectedBlock.content.width || ''}
                  onChange={(e) => handleContentUpdate('width', e.target.value)}
                  placeholder="100%"
                />
              </div>
              <div>
                <label className="property-label">Height</label>
                <Input
                  value={selectedBlock.content.height || ''}
                  onChange={(e) => handleContentUpdate('height', e.target.value)}
                  placeholder="auto"
                />
              </div>
            </div>
          </div>
        )

      case 'button':
        return (
          <div className="space-y-4">
            <div>
              <label className="property-label">Button Text</label>
              <Input
                value={selectedBlock.content.text || ''}
                onChange={(e) => handleContentUpdate('text', e.target.value)}
                placeholder="Click Me"
              />
            </div>
            
            <div>
              <label className="property-label">Link URL</label>
              <Input
                value={selectedBlock.content.href || ''}
                onChange={(e) => handleContentUpdate('href', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            
            <div>
              <label className="property-label">Button Variant</label>
              <select
                value={selectedBlock.content.variant || 'primary'}
                onChange={(e) => handleContentUpdate('variant', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="outline">Outline</option>
                <option value="ghost">Ghost</option>
              </select>
            </div>
          </div>
        )

      default:
        return (
          <div className="text-center text-gray-500 py-8">
            No content properties available for this component type.
          </div>
        )
    }
  }

  const renderStyleProperties = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="property-label">Background Color</label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={selectedBlock.styles.backgroundColor || '#ffffff'}
              onChange={(e) => handleStyleUpdate('backgroundColor', e.target.value)}
              className="w-8 h-8 border border-gray-300 rounded"
            />
            <Input
              value={selectedBlock.styles.backgroundColor || ''}
              onChange={(e) => handleStyleUpdate('backgroundColor', e.target.value)}
              placeholder="#ffffff"
            />
          </div>
        </div>
        
        <div>
          <label className="property-label">Text Color</label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={selectedBlock.styles.color || '#000000'}
              onChange={(e) => handleStyleUpdate('color', e.target.value)}
              className="w-8 h-8 border border-gray-300 rounded"
            />
            <Input
              value={selectedBlock.styles.color || ''}
              onChange={(e) => handleStyleUpdate('color', e.target.value)}
              placeholder="#000000"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="property-label">Padding</label>
            <Input
              value={selectedBlock.styles.padding || ''}
              onChange={(e) => handleStyleUpdate('padding', e.target.value)}
              placeholder="1rem"
            />
          </div>
          <div>
            <label className="property-label">Margin</label>
            <Input
              value={selectedBlock.styles.margin || ''}
              onChange={(e) => handleStyleUpdate('margin', e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        
        <div>
          <label className="property-label">Border Radius</label>
          <Input
            value={selectedBlock.styles.borderRadius || ''}
            onChange={(e) => handleStyleUpdate('borderRadius', e.target.value)}
            placeholder="0.5rem"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="property-group">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Properties
          </h3>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => duplicateComponent(selectedBlock.id)}
              title="Duplicate component"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteComponent(selectedBlock.id)}
              title="Delete component"
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="text-sm text-gray-600 mb-4">
          {selectedBlock.type.charAt(0).toUpperCase() + selectedBlock.type.slice(1)} Component
        </div>
      </div>

      {/* Tabs */}
      <div className="property-group">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'content'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Type className="w-4 h-4 inline mr-2" />
            Content
          </button>
          <button
            onClick={() => setActiveTab('style')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'style'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Palette className="w-4 h-4 inline mr-2" />
            Style
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="property-group">
          {activeTab === 'content' ? renderContentProperties() : renderStyleProperties()}
        </div>
      </div>
    </div>
  )
}
