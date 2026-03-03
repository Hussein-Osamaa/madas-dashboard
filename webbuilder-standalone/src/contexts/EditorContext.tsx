'use client'

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { EditorState, EditorActions, EditorHistoryState, Website, WebsitePage, ContentBlock } from '@/types/editor'

interface EditorContextType extends EditorState, EditorActions {}

const EditorContext = createContext<EditorContextType | undefined>(undefined)

type EditorAction =
  | { type: 'SET_WEBSITE'; payload: Website }
  | { type: 'SET_CURRENT_PAGE'; payload: WebsitePage }
  | { type: 'ADD_COMPONENT'; payload: { component: ContentBlock; index?: number } }
  | { type: 'UPDATE_COMPONENT'; payload: { id: string; updates: Partial<ContentBlock> } }
  | { type: 'DELETE_COMPONENT'; payload: string }
  | { type: 'DUPLICATE_COMPONENT'; payload: string }
  | { type: 'MOVE_COMPONENT'; payload: { id: string; newIndex: number } }
  | { type: 'SELECT_COMPONENT'; payload: string | null }
  | { type: 'SET_PREVIEW_MODE'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_UNSAVED_CHANGES'; payload: boolean }
  | { type: 'ADD_TO_HISTORY'; payload: Website }
  | { type: 'UNDO' }
  | { type: 'REDO' }

// Create a sample website for testing
const createSampleWebsite = (): Website => ({
  id: 'sample-website-1',
  name: 'My Sample Website',
  description: 'A sample website created for testing',
  domain: '',
  pages: [
    {
      id: 'page-1',
      name: 'Home',
      slug: 'home',
      title: 'Welcome to My Website',
      description: 'This is the home page',
      content: {
        blocks: [
          {
            id: 'heading-1',
            type: 'heading',
            content: {
              text: 'Welcome to My Website',
              level: 1,
              align: 'center'
            },
            styles: {
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: '#2563eb',
              marginBottom: '1rem'
            },
            order: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'text-1',
            type: 'text',
            content: {
              text: 'This is a sample paragraph to demonstrate the website builder functionality. You can edit this text and add more components to build your website.',
              align: 'center'
            },
            styles: {
              fontSize: '1.1rem',
              lineHeight: '1.6',
              color: '#374151',
              marginBottom: '2rem'
            },
            order: 1,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'button-1',
            type: 'button',
            content: {
              text: 'Get Started',
              link: '#',
              variant: 'primary',
              size: 'large'
            },
            styles: {
              marginTop: '1rem'
            },
            order: 2,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        layout: 'default',
        backgroundColor: '#ffffff'
      },
      seo: {
        title: 'Welcome to My Website',
        description: 'This is the home page',
        keywords: ['website', 'sample', 'demo'],
        robots: 'index, follow'
      },
      isHomePage: true,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  settings: {
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
  createdAt: new Date(),
  updatedAt: new Date(),
  status: 'draft'
})

const initialState: EditorState = {
  website: createSampleWebsite(),
  currentPage: null,
  selectedComponent: null,
  isPreviewMode: false,
  isSaving: false,
  hasUnsavedChanges: false,
  history: [],
  historyIndex: -1,
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_WEBSITE':
      return {
        ...state,
        website: action.payload,
        hasUnsavedChanges: false,
      }

    case 'SET_CURRENT_PAGE':
      return {
        ...state,
        currentPage: action.payload,
        selectedComponent: null,
      }

    case 'ADD_COMPONENT':
      if (!state.currentPage) return state
      
      const newComponent = {
        ...action.payload.component,
        id: uuidv4(),
      }
      
      const updatedPage = {
        ...state.currentPage,
        content: {
          ...state.currentPage.content,
          blocks: action.payload.index !== undefined
            ? [
                ...state.currentPage.content.blocks.slice(0, action.payload.index),
                newComponent,
                ...state.currentPage.content.blocks.slice(action.payload.index),
              ]
            : [...state.currentPage.content.blocks, newComponent],
        },
      }
      
      return {
        ...state,
        currentPage: updatedPage,
        hasUnsavedChanges: true,
      }

    case 'UPDATE_COMPONENT':
      if (!state.currentPage) return state
      
      const updatedBlocks = state.currentPage.content.blocks.map(block =>
        block.id === action.payload.id
          ? { ...block, ...action.payload.updates }
          : block
      )
      
      return {
        ...state,
        currentPage: {
          ...state.currentPage,
          content: {
            ...state.currentPage.content,
            blocks: updatedBlocks,
          },
        },
        hasUnsavedChanges: true,
      }

    case 'DELETE_COMPONENT':
      if (!state.currentPage) return state
      
      return {
        ...state,
        currentPage: {
          ...state.currentPage,
          content: {
            ...state.currentPage.content,
            blocks: state.currentPage.content.blocks.filter(
              block => block.id !== action.payload
            ),
          },
        },
        selectedComponent: state.selectedComponent === action.payload ? null : state.selectedComponent,
        hasUnsavedChanges: true,
      }

    case 'DUPLICATE_COMPONENT':
      if (!state.currentPage) return state
      
      const componentToDuplicate = state.currentPage.content.blocks.find(
        block => block.id === action.payload
      )
      
      if (!componentToDuplicate) return state
      
      const duplicatedComponent = {
        ...componentToDuplicate,
        id: uuidv4(),
        order: componentToDuplicate.order + 1,
      }
      
      const blocksWithDuplicate = state.currentPage.content.blocks.map(block =>
        block.order > componentToDuplicate.order
          ? { ...block, order: block.order + 1 }
          : block
      )
      
      return {
        ...state,
        currentPage: {
          ...state.currentPage,
          content: {
            ...state.currentPage.content,
            blocks: [...blocksWithDuplicate, duplicatedComponent].sort(
              (a, b) => a.order - b.order
            ),
          },
        },
        hasUnsavedChanges: true,
      }

    case 'MOVE_COMPONENT':
      if (!state.currentPage) return state
      
      const blocks = [...state.currentPage.content.blocks]
      const componentIndex = blocks.findIndex(block => block.id === action.payload.id)
      
      if (componentIndex === -1) return state
      
      const [movedComponent] = blocks.splice(componentIndex, 1)
      blocks.splice(action.payload.newIndex, 0, movedComponent)
      
      const reorderedBlocks = blocks.map((block, index) => ({
        ...block,
        order: index,
      }))
      
      return {
        ...state,
        currentPage: {
          ...state.currentPage,
          content: {
            ...state.currentPage.content,
            blocks: reorderedBlocks,
          },
        },
        hasUnsavedChanges: true,
      }

    case 'SELECT_COMPONENT':
      return {
        ...state,
        selectedComponent: action.payload,
      }

    case 'SET_PREVIEW_MODE':
      return {
        ...state,
        isPreviewMode: action.payload,
      }

    case 'SET_SAVING':
      return {
        ...state,
        isSaving: action.payload,
      }

    case 'SET_UNSAVED_CHANGES':
      return {
        ...state,
        hasUnsavedChanges: action.payload,
      }

    case 'ADD_TO_HISTORY':
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push({
        website: action.payload,
        timestamp: Date.now(),
      })
      
      return {
        ...state,
        history: newHistory.slice(-50), // Keep only last 50 states
        historyIndex: newHistory.length - 1,
      }

    case 'UNDO':
      if (state.historyIndex > 0) {
        return {
          ...state,
          website: state.history[state.historyIndex - 1].website,
          historyIndex: state.historyIndex - 1,
          hasUnsavedChanges: true,
        }
      }
      return state

    case 'REDO':
      if (state.historyIndex < state.history.length - 1) {
        return {
          ...state,
          website: state.history[state.historyIndex + 1].website,
          historyIndex: state.historyIndex + 1,
          hasUnsavedChanges: true,
        }
      }
      return state

    default:
      return state
  }
}

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialState)

  const setWebsite = useCallback((website: Website) => {
    dispatch({ type: 'SET_WEBSITE', payload: website })
    dispatch({ type: 'ADD_TO_HISTORY', payload: website })
  }, [])

  const setCurrentPage = useCallback((page: WebsitePage) => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: page })
  }, [])

  const addComponent = useCallback((component: ContentBlock, index?: number) => {
    dispatch({ type: 'ADD_COMPONENT', payload: { component, index } })
  }, [])

  const updateComponent = useCallback((id: string, updates: Partial<ContentBlock>) => {
    dispatch({ type: 'UPDATE_COMPONENT', payload: { id, updates } })
  }, [])

  const deleteComponent = useCallback((id: string) => {
    dispatch({ type: 'DELETE_COMPONENT', payload: id })
  }, [])

  const duplicateComponent = useCallback((id: string) => {
    dispatch({ type: 'DUPLICATE_COMPONENT', payload: id })
  }, [])

  const moveComponent = useCallback((id: string, newIndex: number) => {
    dispatch({ type: 'MOVE_COMPONENT', payload: { id, newIndex } })
  }, [])

  const selectComponent = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_COMPONENT', payload: id })
  }, [])

  const setPreviewMode = useCallback((isPreview: boolean) => {
    dispatch({ type: 'SET_PREVIEW_MODE', payload: isPreview })
  }, [])

  const saveWebsite = useCallback(async () => {
    if (!state.website) return
    
    dispatch({ type: 'SET_SAVING', payload: true })
    
    try {
      // TODO: Implement actual save functionality
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      dispatch({ type: 'SET_UNSAVED_CHANGES', payload: false })
    } catch (error) {
      console.error('Failed to save website:', error)
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false })
    }
  }, [state.website])

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' })
  }, [])

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' })
  }, [])

  const canUndo = state.historyIndex > 0
  const canRedo = state.historyIndex < state.history.length - 1

  // Set current page when website is loaded
  useEffect(() => {
    if (state.website && !state.currentPage) {
      const homePage = state.website.pages.find(page => page.isHomePage) || state.website.pages[0]
      if (homePage) {
        dispatch({ type: 'SET_CURRENT_PAGE', payload: homePage })
      }
    }
  }, [state.website, state.currentPage])

  // Auto-save functionality
  useEffect(() => {
    if (state.hasUnsavedChanges && state.website) {
      const timer = setTimeout(() => {
        saveWebsite()
      }, 2000) // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timer)
    }
  }, [state.hasUnsavedChanges, state.website, saveWebsite])

  const value: EditorContextType = {
    ...state,
    setWebsite,
    setCurrentPage,
    addComponent,
    updateComponent,
    deleteComponent,
    duplicateComponent,
    moveComponent,
    selectComponent,
    setPreviewMode,
    saveWebsite,
    undo,
    redo,
    canUndo,
    canRedo,
  }

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  )
}

export function useEditor() {
  const context = useContext(EditorContext)
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider')
  }
  return context
}
