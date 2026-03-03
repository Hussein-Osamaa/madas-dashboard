'use client'

import { Button } from '@/components/ui/Button'
import { 
  Save, 
  Undo, 
  Redo, 
  Eye, 
  Download, 
  Upload, 
  Settings,
  Home,
  Smartphone,
  Tablet,
  Monitor,
  ExternalLink,
  Globe
} from 'lucide-react'
import { useEditor } from '@/contexts/EditorContext'

export function EditorToolbar() {
  const {
    isSaving,
    hasUnsavedChanges,
    canUndo,
    canRedo,
    saveWebsite,
    undo,
    redo,
    setPreviewMode,
    website
  } = useEditor()

  const handlePreview = () => {
    if (website?.id) {
      // Open preview in new tab
      window.open(`/preview/${website.id}`, '_blank')
    }
  }

  const handlePublish = async () => {
    if (!website?.id) return
    
    try {
      // TODO: Implement publish functionality
      console.log('Publishing website:', website.id)
      // This will be implemented in the next phase
    } catch (error) {
      console.error('Failed to publish website:', error)
    }
  }

  return (
    <div className="toolbar">
      {/* Left Section */}
      <div className="toolbar-group">
        {/* Logo/Home */}
        <Button variant="ghost" size="sm">
          <Home className="w-4 h-4 mr-2" />
          Madas
        </Button>
        
        {/* Save */}
        <Button
          variant="ghost"
          size="sm"
          onClick={saveWebsite}
          disabled={isSaving || !hasUnsavedChanges}
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
        
        {/* Undo/Redo */}
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={!canUndo}
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={!canRedo}
          >
            <Redo className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Center Section - Device Preview */}
      <div className="toolbar-group">
        <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Smartphone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Tablet className="w-4 h-4" />
          </Button>
          <Button variant="default" size="sm" className="h-8 w-8 p-0">
            <Monitor className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Right Section */}
      <div className="toolbar-group">
        {/* Preview in Editor */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPreviewMode(true)}
        >
          <Eye className="w-4 h-4 mr-2" />
          Preview
        </Button>
        
        {/* Preview in New Tab */}
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreview}
          disabled={!website?.id}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Preview Site
        </Button>
        
        {/* Publish */}
        <Button
          variant="default"
          size="sm"
          onClick={handlePublish}
          disabled={!website?.id || isSaving}
        >
          <Globe className="w-4 h-4 mr-2" />
          Publish
        </Button>
        
        {/* Export */}
        <Button variant="ghost" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
        
        {/* Import */}
        <Button variant="ghost" size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Import
        </Button>
        
        {/* Settings */}
        <Button variant="ghost" size="sm">
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
