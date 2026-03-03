'use client'

import React from 'react'
import { Website, WebsitePage, ContentBlock } from '@/types/editor'

interface SiteRendererProps {
  website: Website
  currentPageId?: string
  isPreview?: boolean
  className?: string
}

interface ComponentRendererProps {
  component: ContentBlock
  isPreview?: boolean
}

// Individual component renderers
function TextComponent({ component }: ComponentRendererProps) {
  const { content, styles } = component
  const { text, tag = 'p', align = 'left' } = content || {}
  
  const Tag = (tag || 'p') as keyof JSX.IntrinsicElements
  
  return (
    <Tag 
      style={{
        textAlign: align,
        ...styles
      }}
      dangerouslySetInnerHTML={{ __html: text || '' }}
    />
  )
}

function HeadingComponent({ component }: ComponentRendererProps) {
  const { content, styles } = component
  const { text, level = 1, align = 'left' } = content || {}
  
  const Tag = `h${Math.min(Math.max(level, 1), 6)}` as keyof JSX.IntrinsicElements
  
  return (
    <Tag 
      style={{
        textAlign: align,
        ...styles
      }}
      dangerouslySetInnerHTML={{ __html: text || '' }}
    />
  )
}

function ImageComponent({ component }: ComponentRendererProps) {
  const { content, styles } = component
  const { src, alt = '', width, height, align = 'left' } = content || {}
  
  return (
    <div style={{ textAlign: align }}>
      <img 
        src={src} 
        alt={alt}
        style={{
          width: width || 'auto',
          height: height || 'auto',
          maxWidth: '100%',
          ...styles
        }}
      />
    </div>
  )
}

function ButtonComponent({ component }: ComponentRendererProps) {
  const { content, styles } = component
  const { text, link, variant = 'primary', size = 'medium' } = content || {}
  
  const baseStyles = {
    padding: size === 'small' ? '8px 16px' : size === 'large' ? '16px 32px' : '12px 24px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
    textAlign: 'center' as const,
    ...styles
  }
  
  const variantStyles = {
    primary: { backgroundColor: '#2563eb', color: 'white' },
    secondary: { backgroundColor: '#6b7280', color: 'white' },
    outline: { backgroundColor: 'transparent', color: '#2563eb', border: '2px solid #2563eb' }
  }
  
  const buttonStyles = { ...baseStyles, ...variantStyles[variant] }
  
  if (link) {
    return (
      <a href={link} style={buttonStyles}>
        {text}
      </a>
    )
  }
  
  return (
    <button style={buttonStyles}>
      {text}
    </button>
  )
}

function ContainerComponent({ component, isPreview }: ComponentRendererProps) {
  const { content, styles, children } = component
  const { layout = 'default', backgroundColor, padding } = content || {}
  
  const containerStyles = {
    backgroundColor: backgroundColor || 'transparent',
    padding: padding || '20px',
    ...styles
  }
  
  return (
    <div style={containerStyles}>
      {children?.map((child: ContentBlock) => (
        <ComponentRenderer 
          key={child.id} 
          component={child} 
          isPreview={isPreview}
        />
      ))}
    </div>
  )
}

function SpacerComponent({ component }: ComponentRendererProps) {
  const { content, styles } = component
  const { height = 20 } = content || {}
  
  return (
    <div 
      style={{
        height: `${height}px`,
        ...styles
      }}
    />
  )
}

// Main component renderer
function ComponentRenderer({ component, isPreview = false }: ComponentRendererProps) {
  const { type } = component
  
  switch (type) {
    case 'text':
      return <TextComponent component={component} isPreview={isPreview} />
    case 'heading':
      return <HeadingComponent component={component} isPreview={isPreview} />
    case 'image':
      return <ImageComponent component={component} isPreview={isPreview} />
    case 'button':
      return <ButtonComponent component={component} isPreview={isPreview} />
    case 'container':
      return <ContainerComponent component={component} isPreview={isPreview} />
    case 'spacer':
      return <SpacerComponent component={component} isPreview={isPreview} />
    default:
      return (
        <div style={{ 
          padding: '20px', 
          border: '2px dashed #ccc', 
          textAlign: 'center',
          color: '#666'
        }}>
          Unknown component: {type}
        </div>
      )
  }
}

// Page renderer
function PageRenderer({ page, isPreview = false }: { page: WebsitePage, isPreview?: boolean }) {
  const { content, seo } = page
  const { blocks, layout, backgroundColor, backgroundImage } = content
  
  const pageStyles = {
    minHeight: '100vh',
    backgroundColor: backgroundColor || '#ffffff',
    backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  }
  
  const containerStyles = {
    maxWidth: layout === 'full-width' ? '100%' : '1200px',
    margin: '0 auto',
    padding: layout === 'full-width' ? '0' : '0 20px'
  }
  
  return (
    <div style={pageStyles}>
      <div style={containerStyles}>
        {blocks
          .sort((a, b) => a.order - b.order)
          .map((block) => (
            <ComponentRenderer 
              key={block.id} 
              component={block} 
              isPreview={isPreview}
            />
          ))}
      </div>
    </div>
  )
}

// Main site renderer
export function SiteRenderer({ website, currentPageId, isPreview = false, className }: SiteRendererProps) {
  const currentPage = currentPageId 
    ? website.pages.find(page => page.id === currentPageId)
    : website.pages.find(page => page.isHomePage) || website.pages[0]
  
  if (!currentPage) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        color: '#666'
      }}>
        <h2>No page found</h2>
        <p>This website doesn't have any pages yet.</p>
      </div>
    )
  }
  
  return (
    <div className={className}>
      <PageRenderer page={currentPage} isPreview={isPreview} />
    </div>
  )
}

// Export for use in preview routes
export { ComponentRenderer, PageRenderer }
