'use client'

import { useState } from 'react'
import { 
  Type, 
  Image, 
  Video, 
  Square, 
  Circle, 
  Triangle,
  Layout,
  Grid,
  List,
  MousePointer as ButtonIcon,
  Link,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Star,
  Heart,
  ThumbsUp,
  MessageCircle,
  Share2,
  Download,
  Upload,
  Search,
  Filter,
  Menu,
  X,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { ComponentLibraryItem } from '@/types/editor'
import { ContentBlock } from '@/types/editor'
import { useEditor } from '@/contexts/EditorContext'

const componentCategories = [
  {
    id: 'text',
    name: 'Text',
    icon: Type,
    components: [
      {
        id: 'heading',
        name: 'Heading',
        description: 'Large text for titles',
        icon: Type,
        type: 'text',
        defaultProps: {
          type: 'text',
          content: {
            text: 'Your Heading Here',
            level: 'h1',
            align: 'left',
            color: '#000000',
            fontSize: '2rem',
            fontWeight: 'bold'
          },
          styles: {
            margin: '0 0 1rem 0',
            padding: '0'
          }
        }
      },
      {
        id: 'paragraph',
        name: 'Paragraph',
        description: 'Regular text content',
        icon: Type,
        type: 'text',
        defaultProps: {
          type: 'text',
          content: {
            text: 'Add your paragraph text here. You can edit this content by clicking on it.',
            align: 'left',
            color: '#333333',
            fontSize: '1rem',
            lineHeight: '1.6'
          },
          styles: {
            margin: '0 0 1rem 0',
            padding: '0'
          }
        }
      }
    ]
  },
  {
    id: 'media',
    name: 'Media',
    icon: Image,
    components: [
      {
        id: 'image',
        name: 'Image',
        description: 'Add images to your page',
        icon: Image,
        type: 'image',
        defaultProps: {
          type: 'image',
          content: {
            src: 'https://via.placeholder.com/400x300',
            alt: 'Image description',
            width: '100%',
            height: 'auto'
          },
          styles: {
            margin: '0 0 1rem 0',
            padding: '0'
          }
        }
      },
      {
        id: 'video',
        name: 'Video',
        description: 'Embed video content',
        icon: Video,
        type: 'video',
        defaultProps: {
          type: 'video',
          content: {
            src: '',
            poster: 'https://via.placeholder.com/400x300',
            controls: true,
            autoplay: false,
            loop: false
          },
          styles: {
            margin: '0 0 1rem 0',
            padding: '0'
          }
        }
      }
    ]
  },
  {
    id: 'layout',
    name: 'Layout',
    icon: Layout,
    components: [
      {
        id: 'container',
        name: 'Container',
        description: 'Content wrapper',
        icon: Square,
        type: 'container',
        defaultProps: {
          type: 'container',
          content: {
            maxWidth: '1200px',
            padding: '2rem',
            backgroundColor: 'transparent'
          },
          styles: {
            margin: '0 auto',
            padding: '2rem'
          }
        }
      },
      {
        id: 'row',
        name: 'Row',
        description: 'Horizontal layout',
        icon: Grid,
        type: 'row',
        defaultProps: {
          type: 'row',
          content: {
            columns: 2,
            gap: '1rem',
            alignItems: 'stretch'
          },
          styles: {
            display: 'flex',
            gap: '1rem',
            margin: '0 0 1rem 0'
          }
        }
      },
      {
        id: 'column',
        name: 'Column',
        description: 'Vertical layout',
        icon: List,
        type: 'column',
        defaultProps: {
          type: 'column',
          content: {
            flex: 1,
            padding: '1rem'
          },
          styles: {
            flex: 1,
            padding: '1rem'
          }
        }
      }
    ]
  },
  {
    id: 'interactive',
    name: 'Interactive',
    icon: ButtonIcon,
    components: [
      {
        id: 'button',
        name: 'Button',
        description: 'Clickable button',
        icon: ButtonIcon,
        type: 'button',
        defaultProps: {
          type: 'button',
          content: {
            text: 'Click Me',
            variant: 'primary',
            size: 'medium',
            href: '#'
          },
          styles: {
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '500'
          }
        }
      },
      {
        id: 'link',
        name: 'Link',
        description: 'Text link',
        icon: Link,
        type: 'link',
        defaultProps: {
          type: 'link',
          content: {
            text: 'Learn More',
            href: '#',
            target: '_self'
          },
          styles: {
            color: '#3b82f6',
            textDecoration: 'underline',
            cursor: 'pointer'
          }
        }
      }
    ]
  },
  {
    id: 'forms',
    name: 'Forms',
    icon: Mail,
    components: [
      {
        id: 'contact-form',
        name: 'Contact Form',
        description: 'Contact form with fields',
        icon: Mail,
        type: 'form',
        defaultProps: {
          type: 'form',
          content: {
            fields: [
              { type: 'text', name: 'name', label: 'Name', required: true },
              { type: 'email', name: 'email', label: 'Email', required: true },
              { type: 'textarea', name: 'message', label: 'Message', required: true }
            ],
            submitText: 'Send Message'
          },
          styles: {
            padding: '2rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.5rem'
          }
        }
      }
    ]
  }
]

export function ComponentLibrary() {
  const [activeCategory, setActiveCategory] = useState('text')
  const { addComponent } = useEditor()

  const handleDragStart = (e: React.DragEvent, component: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify(component))
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleComponentClick = (component: any) => {
    addComponent(component.defaultProps as ContentBlock)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="sidebar-section">
        <h2 className="sidebar-title">Components</h2>
        <p className="text-sm text-gray-600">
          Drag components to the canvas or click to add
        </p>
      </div>

      {/* Categories */}
      <div className="sidebar-section">
        <div className="grid grid-cols-2 gap-2">
          {componentCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                activeCategory === category.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <category.icon className="w-5 h-5 mb-2" />
              <div className="text-sm font-medium">{category.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Components */}
      <div className="flex-1 overflow-y-auto">
        <div className="sidebar-section">
          <h3 className="sidebar-title">
            {componentCategories.find(c => c.id === activeCategory)?.name}
          </h3>
          <div className="space-y-2">
            {componentCategories
              .find(c => c.id === activeCategory)
              ?.components.map((component) => (
                <div
                  key={component.id}
                  className="component-item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, component)}
                  onClick={() => handleComponentClick(component)}
                >
                  <div className="flex items-center space-x-3">
                    <component.icon className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="font-medium text-sm">{component.name}</div>
                      <div className="text-xs text-gray-500">
                        {component.description}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
