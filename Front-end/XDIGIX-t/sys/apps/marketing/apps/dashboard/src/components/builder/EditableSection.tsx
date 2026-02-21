import { useRef, useCallback } from 'react';
import { Section } from '../../types/builder';
import { ElementType, SelectedElement } from '../../types/elementEditor';

interface Props {
  section: Section;
  children: React.ReactNode;
  isSelected: boolean;
  selectedElement: SelectedElement | null;
  onSelectElement: (element: SelectedElement | null) => void;
  onSelectSection: () => void;
}

// Map CSS classes and data attributes to element types
const getElementTypeFromTarget = (element: HTMLElement): { type: ElementType; index?: number } | null => {
  // Check data attributes first (support both naming conventions)
  const dataType = (element.dataset.editableType || element.dataset.editType) as ElementType;
  if (dataType) {
    const index = element.dataset.editableIndex ? parseInt(element.dataset.editableIndex) : undefined;
    return { type: dataType, index };
  }

  // Check for specific elements by tag and class
  const tagName = element.tagName.toLowerCase();
  const classList = Array.from(element.classList);

  // Banner text detection
  if (classList.some(c => c.includes('banner-text') || c.includes('marquee-track'))) {
    return { type: 'description' };
  }

  // Title detection
  if (tagName === 'h1' || classList.some(c => c.includes('title') || c.includes('heading'))) {
    return { type: 'title' };
  }

  // Subtitle/description detection
  if (tagName === 'h2' || tagName === 'h3' || classList.some(c => c.includes('subtitle'))) {
    return { type: 'subtitle' };
  }

  // Paragraph/description
  if (tagName === 'p' && !classList.some(c => c.includes('price'))) {
    if (classList.some(c => c.includes('description') || c.includes('desc'))) {
      return { type: 'description' };
    }
    // Check if it looks like a subtitle (near h1)
    const prevSibling = element.previousElementSibling;
    if (prevSibling?.tagName.toLowerCase() === 'h1') {
      return { type: 'subtitle' };
    }
    return { type: 'description' };
  }

  // Button detection
  if (tagName === 'button' || (tagName === 'a' && classList.some(c => 
    c.includes('btn') || c.includes('button') || c.includes('cta') || c.includes('banner-button')
  ))) {
    return { type: 'button' };
  }

  // Link with button styling (has background color or rounded styling)
  if (tagName === 'a' && (element.style.backgroundColor || classList.some(c => c.includes('rounded')))) {
    return { type: 'button' };
  }

  // Image detection
  if (tagName === 'img') {
    return { type: 'image' };
  }

  // Card detection
  if (classList.some(c => c.includes('card') || c.includes('item'))) {
    // Try to find index from siblings
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(element);
      if (index >= 0) {
        // Determine card type based on context
        if (classList.some(c => c.includes('product'))) return { type: 'product', index };
        if (classList.some(c => c.includes('team'))) return { type: 'teamMember', index };
        if (classList.some(c => c.includes('feature'))) return { type: 'feature', index };
        if (classList.some(c => c.includes('testimonial'))) return { type: 'testimonial', index };
        if (classList.some(c => c.includes('service'))) return { type: 'service', index };
        if (classList.some(c => c.includes('pricing') || c.includes('plan'))) return { type: 'pricingPlan', index };
        return { type: 'card', index };
      }
    }
    return { type: 'card' };
  }

  // Icon detection
  if (classList.includes('material-icons') || tagName === 'svg' || classList.some(c => c.includes('icon'))) {
    return { type: 'icon' };
  }

  // Price detection
  if (classList.some(c => c.includes('price'))) {
    return { type: 'price' };
  }

  // Input detection
  if (tagName === 'input' || tagName === 'textarea') {
    return { type: 'input' };
  }

  // Social icons
  if (classList.some(c => c.includes('social'))) {
    return { type: 'socialIcon' };
  }

  // Stats
  if (classList.some(c => c.includes('stat'))) {
    return { type: 'stat' };
  }

  // FAQ items
  if (classList.some(c => c.includes('faq'))) {
    return { type: 'faqItem' };
  }

  // Gallery items
  if (classList.some(c => c.includes('gallery'))) {
    return { type: 'galleryItem' };
  }

  // Partner logos
  if (classList.some(c => c.includes('partner') || c.includes('logo'))) {
    return { type: 'partner' };
  }

  // Video
  if (tagName === 'video' || tagName === 'iframe' || classList.some(c => c.includes('video'))) {
    return { type: 'video' };
  }

  // Countdown
  if (classList.some(c => c.includes('countdown') || c.includes('timer'))) {
    return { type: 'countdown' };
  }

  // Divider
  if (tagName === 'hr' || classList.some(c => c.includes('divider'))) {
    return { type: 'divider' };
  }

  return null;
};

// Find the closest editable element
const findEditableElement = (target: HTMLElement, container: HTMLElement): { type: ElementType; index?: number } | null => {
  let current: HTMLElement | null = target;
  
  while (current && current !== container) {
    const result = getElementTypeFromTarget(current);
    if (result) {
      return result;
    }
    current = current.parentElement;
  }
  
  return null;
};

const EditableSection = ({ 
  section, 
  children, 
  isSelected, 
  selectedElement, 
  onSelectElement, 
  onSelectSection 
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    
    if (!isSelected) {
      onSelectSection();
      return;
    }

    const target = e.target as HTMLElement;
    const container = containerRef.current;
    
    if (!container) return;

    // Check if clicking on the section background (directly on container or its direct children)
    const isBackgroundClick = target === container || 
      (target.parentElement === container && target.tagName.toLowerCase() === 'div');

    if (isBackgroundClick) {
      onSelectElement({
        type: 'background',
        sectionId: section.id
      });
      return;
    }

    // Find the closest editable element
    const editableElement = findEditableElement(target, container);
    
    if (editableElement) {
      onSelectElement({
        type: editableElement.type,
        sectionId: section.id,
        index: editableElement.index
      });
    } else {
      // Default to background if no specific element found
      onSelectElement({
        type: 'background',
        sectionId: section.id
      });
    }
  }, [isSelected, section.id, onSelectElement, onSelectSection]);

  // Get highlight class based on selected element type
  const getHighlightStyle = () => {
    if (!isSelected || !selectedElement) return {};
    return {};
  };

  return (
    <div 
      ref={containerRef}
      onClick={handleClick}
      className={`relative group ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
      style={getHighlightStyle()}
    >
      {/* Element type indicator */}
      {isSelected && selectedElement && (
        <div className="absolute top-0 left-0 z-50 transform -translate-y-full">
          <div className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-t font-medium flex items-center gap-1">
            <span className="material-icons text-xs">
              {selectedElement.type === 'background' ? 'format_color_fill' :
               selectedElement.type === 'title' ? 'title' :
               selectedElement.type === 'subtitle' ? 'text_fields' :
               selectedElement.type === 'button' ? 'smart_button' :
               selectedElement.type === 'image' ? 'image' :
               selectedElement.type === 'card' ? 'dashboard' :
               selectedElement.type === 'product' ? 'inventory_2' :
               'edit'}
            </span>
            <span>
              {selectedElement.type.charAt(0).toUpperCase() + selectedElement.type.slice(1)}
              {selectedElement.index !== undefined ? ` #${selectedElement.index + 1}` : ''}
            </span>
          </div>
        </div>
      )}

      {/* Clickable hint overlay when section is selected */}
      {isSelected && !selectedElement && (
        <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div className="bg-black/60 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-2">
            <span className="material-icons text-sm">touch_app</span>
            <span>Click on any element to edit it</span>
          </div>
        </div>
      )}

      {/* Section content */}
      <div className={`${isSelected ? 'cursor-pointer' : ''}`}>
        {children}
      </div>

      {/* Overlay to show clickable areas on hover when selected */}
      {isSelected && (
        <style>{`
          [data-section-id="${section.id}"] h1:hover,
          [data-section-id="${section.id}"] h2:hover,
          [data-section-id="${section.id}"] h3:hover,
          [data-section-id="${section.id}"] p:hover,
          [data-section-id="${section.id}"] a:hover,
          [data-section-id="${section.id}"] button:hover,
          [data-section-id="${section.id}"] img:hover,
          [data-section-id="${section.id}"] [class*="card"]:hover,
          [data-section-id="${section.id}"] [class*="item"]:hover,
          [data-section-id="${section.id}"] [data-edit-type]:hover {
            outline: 2px dashed rgba(39, 73, 31, 0.5) !important;
            outline-offset: 2px !important;
          }
          [data-section-id="${section.id}"] .banner-text:hover,
          [data-section-id="${section.id}"] .banner-button:hover,
          [data-section-id="${section.id}"] .marquee-track:hover {
            outline: 2px dashed rgba(39, 73, 31, 0.5) !important;
            outline-offset: 2px !important;
          }
        `}</style>
      )}
    </div>
  );
};

export default EditableSection;
