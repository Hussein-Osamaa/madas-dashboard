import { Website, WebsitePage, ContentBlock } from '@shared/shared'

export interface EditorState {
  website: Website | null
  currentPage: WebsitePage | null
  selectedComponent: string | null
  isPreviewMode: boolean
  isSaving: boolean
  hasUnsavedChanges: boolean
  history: EditorHistoryState[]
  historyIndex: number
}

export interface EditorHistoryState {
  website: Website
  timestamp: number
}

export interface EditorActions {
  setWebsite: (website: Website) => void
  setCurrentPage: (page: WebsitePage) => void
  addComponent: (component: ContentBlock, index?: number) => void
  updateComponent: (id: string, updates: Partial<ContentBlock>) => void
  deleteComponent: (id: string) => void
  duplicateComponent: (id: string) => void
  moveComponent: (id: string, newIndex: number) => void
  selectComponent: (id: string | null) => void
  setPreviewMode: (isPreview: boolean) => void
  saveWebsite: () => Promise<void>
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

export interface ComponentProps {
  id: string
  type: string
  content: any
  styles: Record<string, any>
  order: number
  isSelected?: boolean
  isHovered?: boolean
  onSelect?: () => void
  onUpdate?: (updates: Partial<ContentBlock>) => void
  onDelete?: () => void
  onDuplicate?: () => void
}

export interface DragItem {
  type: 'component' | 'new-component'
  componentType?: string
  componentId?: string
  data?: any
}

export interface DropResult {
  accepted: boolean
  index?: number
  parentId?: string
}

export interface ComponentLibraryItem {
  id: string
  name: string
  description: string
  icon: string
  category: string
  component: React.ComponentType<ComponentProps>
  defaultProps: Partial<ContentBlock>
  preview: string
}

export interface EditorToolbarAction {
  id: string
  label: string
  icon: string
  action: () => void
  disabled?: boolean
  shortcut?: string
}

export interface EditorSettings {
  gridSize: number
  snapToGrid: boolean
  showGrid: boolean
  showRulers: boolean
  zoom: number
  theme: 'light' | 'dark'
}

export interface PublishOptions {
  customDomain?: string
  seoTitle?: string
  seoDescription?: string
  seoKeywords?: string[]
  ogImage?: string
  robots?: string
  analytics?: {
    googleAnalytics?: string
    facebookPixel?: string
  }
}
