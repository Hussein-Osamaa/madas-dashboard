import { useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { Section } from '../../types/builder';
import { SelectedElement, ElementType } from '../../types/elementEditor';
import SectionRenderer from './SectionRenderer';
import SortableSection from './SortableSection';

type Props = {
  sections: Section[];
  selectedSection: string | null;
  selectedElement: SelectedElement | null;
  previewMode: 'desktop' | 'tablet' | 'mobile';
  onSelectSection: (id: string | null) => void;
  onSelectElement: (element: SelectedElement | null) => void;
  onUpdateSection: (id: string, data: any) => void;
  onDeleteSection: (id: string) => void;
  onReorderSections: (sections: Section[]) => void;
  onDuplicateSection: (id: string) => void;
  siteId?: string;
};

// Helper to detect element type from clicked target
const getElementTypeFromTarget = (element: HTMLElement): { type: ElementType; index?: number } | null => {
  // Check data attributes first (most reliable)
  const dataType = element.dataset.editType as ElementType;
  if (dataType) {
    const index = element.dataset.editIndex ? parseInt(element.dataset.editIndex) : undefined;
    return { type: dataType, index };
  }

  const tagName = element.tagName.toLowerCase();
  const classList = Array.from(element.classList);
  const classString = classList.join(' ');

  // Banner-specific detection
  if (classString.includes('banner-text') || classString.includes('marquee-track')) {
    return { type: 'description' };
  }
  if (classString.includes('banner-button')) {
    return { type: 'button' };
  }
  if (classString.includes('banner-section')) {
    return { type: 'background' };
  }

  // Hero-specific detection
  if (classString.includes('hero-title')) {
    return { type: 'title' };
  }
  if (classString.includes('hero-subtitle')) {
    return { type: 'subtitle' };
  }
  if (classString.includes('hero-button')) {
    return { type: 'button' };
  }
  if (classString.includes('hero-background') || classString.includes('hero-section')) {
    return { type: 'background' };
  }

  // Products-specific detection
  if (classString.includes('products-title')) {
    return { type: 'title' };
  }
  if (classString.includes('products-subtitle')) {
    return { type: 'subtitle' };
  }
  if (classString.includes('product-card')) {
    const index = element.dataset.editIndex ? parseInt(element.dataset.editIndex) : undefined;
    return { type: 'card', index };
  }
  if (classString.includes('products-placeholder')) {
    return { type: 'product' };
  }
  if (classString.includes('products-section')) {
    return { type: 'background' };
  }

  // Deals-specific detection
  if (classString.includes('deals-title')) {
    return { type: 'title' };
  }
  if (classString.includes('deals-button')) {
    return { type: 'button' };
  }
  if (classString.includes('deals-card')) {
    const index = element.dataset.editIndex ? parseInt(element.dataset.editIndex) : undefined;
    return { type: 'card', index };
  }
  if (classString.includes('deals-image')) {
    return { type: 'image' };
  }
  if (classString.includes('deals-product-name')) {
    return { type: 'title' };
  }
  if (classString.includes('deals-description')) {
    return { type: 'description' };
  }
  if (classString.includes('deals-price')) {
    return { type: 'card' };
  }
  if (classString.includes('deals-add-button')) {
    return { type: 'button' };
  }

  // Title detection (h1 or elements with title/heading class)
  if (tagName === 'h1' || classString.includes('hero-title') || classString.includes('section-title')) {
    return { type: 'title' };
  }

  // Subtitle detection (h2, h3 or elements with subtitle class)
  if (tagName === 'h2' || tagName === 'h3' || classString.includes('subtitle') || classString.includes('hero-subtitle')) {
    return { type: 'subtitle' };
  }

  // Description/paragraph detection
  if (tagName === 'p' && !classString.includes('price')) {
    // Check context - is it near a title?
    const prevSibling = element.previousElementSibling;
    if (prevSibling?.tagName.toLowerCase() === 'h1' || prevSibling?.classList.contains('hero-title')) {
      return { type: 'subtitle' };
    }
    return { type: 'description' };
  }

  // Button detection (buttons or styled anchors)
  if (tagName === 'button' || 
      (tagName === 'a' && (classString.includes('btn') || classString.includes('button') || classString.includes('rounded') || element.style.backgroundColor))) {
    return { type: 'button' };
  }

  // Image detection
  if (tagName === 'img') {
    return { type: 'image' };
  }

  // Card detection with index
  if (classString.includes('card') || classString.includes('-item') || classString.includes('product-card')) {
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        child => child.classList.contains('card') || 
                 Array.from(child.classList).some(c => c.includes('-item') || c.includes('card'))
      );
      const index = siblings.indexOf(element);
      
      // Determine specific card type
      if (classString.includes('product')) return { type: 'product', index: index >= 0 ? index : undefined };
      if (classString.includes('team')) return { type: 'teamMember', index: index >= 0 ? index : undefined };
      if (classString.includes('feature')) return { type: 'feature', index: index >= 0 ? index : undefined };
      if (classString.includes('testimonial')) return { type: 'testimonial', index: index >= 0 ? index : undefined };
      if (classString.includes('service')) return { type: 'service', index: index >= 0 ? index : undefined };
      if (classString.includes('pricing') || classString.includes('plan')) return { type: 'pricingPlan', index: index >= 0 ? index : undefined };
      if (classString.includes('faq')) return { type: 'faqItem', index: index >= 0 ? index : undefined };
      if (classString.includes('gallery')) return { type: 'galleryItem', index: index >= 0 ? index : undefined };
      if (classString.includes('partner')) return { type: 'partner', index: index >= 0 ? index : undefined };
      if (classString.includes('stat')) return { type: 'stat', index: index >= 0 ? index : undefined };
      
      return { type: 'card', index: index >= 0 ? index : undefined };
    }
    return { type: 'card' };
  }

  // Icon detection
  if (classList.includes('material-icons') || tagName === 'svg' || classString.includes('icon')) {
    return { type: 'icon' };
  }

  // Price detection
  if (classString.includes('price')) {
    return { type: 'price' };
  }

  // Input detection
  if (tagName === 'input' || tagName === 'textarea') {
    return { type: 'input' };
  }

  // Social icons
  if (classString.includes('social')) {
    return { type: 'socialIcon' };
  }

  // Video
  if (tagName === 'video' || tagName === 'iframe' || classString.includes('video')) {
    return { type: 'video' };
  }

  // Countdown
  if (classString.includes('countdown') || classString.includes('timer')) {
    return { type: 'countdown' };
  }

  // Divider
  if (tagName === 'hr' || classString.includes('divider')) {
    return { type: 'divider' };
  }

  return null;
};

// Walk up the DOM tree to find an editable element
const findEditableElement = (target: HTMLElement, sectionContainer: HTMLElement): { type: ElementType; index?: number } | null => {
  let current: HTMLElement | null = target;
  
  while (current && current !== sectionContainer && current !== document.body) {
    const result = getElementTypeFromTarget(current);
    if (result) {
      return result;
    }
    current = current.parentElement;
  }
  
  return null;
};

const BuilderCanvas = ({
  sections,
  selectedSection,
  selectedElement,
  previewMode,
  onSelectSection,
  onSelectElement,
  onUpdateSection,
  onDeleteSection,
  onReorderSections,
  onDuplicateSection,
  siteId
}: Props) => {
  const previewWrapperRef = useRef<HTMLDivElement>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Handle click on section content to select elements
  const handleSectionContentClick = useCallback((e: React.MouseEvent, sectionId: string) => {
    // Only handle if this section is already selected
    if (selectedSection !== sectionId) {
      return; // Let the section selection happen first
    }

    e.stopPropagation();
    
    const target = e.target as HTMLElement;
    const sectionContainer = (e.currentTarget as HTMLElement).querySelector('[data-section-content]') || e.currentTarget;
    
    // Find the editable element
    const editableElement = findEditableElement(target, sectionContainer as HTMLElement);
    
    if (editableElement) {
      onSelectElement({
        type: editableElement.type,
        sectionId,
        index: editableElement.index
      });
    } else {
      // Default to background if clicking on empty space
      onSelectElement({
        type: 'background',
        sectionId
      });
    }
  }, [selectedSection, onSelectElement]);

  // Prevent all link navigation in the builder (links, buttons, icons, etc.)
  useEffect(() => {
    const wrapper = previewWrapperRef.current;
    if (!wrapper) return;

    const preventNavigation = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Find if the click is on or within an anchor tag
      const anchor = target.closest('a');
      if (anchor && anchor.href) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      // Also prevent form submissions
      const form = target.closest('form');
      if (form) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    };

    // Use capture phase to catch events before they bubble
    wrapper.addEventListener('click', preventNavigation, true);

    return () => {
      wrapper.removeEventListener('click', preventNavigation, true);
    };
  }, []);

  // Override Tailwind responsive classes based on preview mode
  useEffect(() => {
    const wrapper = previewWrapperRef.current;
    if (!wrapper) return;

    const restoreResponsiveClasses = () => {
      const allElements = wrapper.querySelectorAll('*');
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const attributes = Array.from(htmlEl.attributes);
        
        attributes.forEach((attr) => {
          if (attr.name.startsWith('data-original-')) {
            const originalClass = attr.value;
            if (!htmlEl.classList.contains(originalClass)) {
              htmlEl.classList.add(originalClass);
            }
            htmlEl.removeAttribute(attr.name);
          }
        });
      });
    };

    const removeResponsiveClasses = () => {
      const allElements = wrapper.querySelectorAll('*');
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const classes = Array.from(htmlEl.classList);
        
        classes.forEach((cls) => {
          if (previewMode === 'mobile') {
            if (cls.match(/^(sm|md|lg|xl):/)) {
              htmlEl.classList.remove(cls);
              const attrName = `data-original-${cls.replace(/:/g, '-')}`;
              if (!htmlEl.hasAttribute(attrName)) {
                htmlEl.setAttribute(attrName, cls);
              }
            }
          } else if (previewMode === 'tablet') {
            if (cls.match(/^(lg|xl):/)) {
              htmlEl.classList.remove(cls);
              const attrName = `data-original-${cls.replace(/:/g, '-')}`;
              if (!htmlEl.hasAttribute(attrName)) {
                htmlEl.setAttribute(attrName, cls);
              }
            }
          }
        });
      });
    };

    restoreResponsiveClasses();
    
    if (previewMode !== 'desktop') {
      requestAnimationFrame(() => {
        setTimeout(removeResponsiveClasses, 0);
      });
    }

    return () => {
      restoreResponsiveClasses();
    };
  }, [previewMode, sections]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);

      const newSections = arrayMove(sections, oldIndex, newIndex);
      onReorderSections(newSections);
    }
  };

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  const getPreviewContainerStyle = () => {
    if (previewMode === 'mobile') {
      return {
        width: '375px',
        maxWidth: '375px',
        minWidth: '375px',
        margin: '0 auto',
        transform: 'scale(1)'
      };
    } else if (previewMode === 'tablet') {
      return {
        width: '768px',
        maxWidth: '768px',
        minWidth: '768px',
        margin: '0 auto',
        transform: 'scale(1)'
      };
    }
    return {
      width: '100%',
      maxWidth: '100%'
    };
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div 
        ref={previewWrapperRef}
        className={`mx-auto transition-all duration-300 ${
          previewMode !== 'desktop' ? 'shadow-2xl rounded-lg border-4 border-gray-300 bg-gray-800 overflow-hidden' : ''
        } ${previewMode === 'mobile' ? 'force-mobile' : previewMode === 'tablet' ? 'force-tablet' : 'force-desktop'}`}
        style={getPreviewContainerStyle()}
        data-preview-mode={previewMode}
      >
        {/* Device frame decoration for mobile/tablet */}
        {previewMode !== 'desktop' && (
          <div className="bg-gray-800 rounded-t-lg px-2 py-2 flex items-center justify-center">
            <div className="h-1 w-16 bg-gray-600 rounded-full"></div>
          </div>
        )}
        
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedSections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div 
              className="bg-white min-h-screen"
              style={{
                width: previewMode === 'mobile' ? '375px' : previewMode === 'tablet' ? '768px' : '100%',
                maxWidth: '100%',
                overflowX: 'hidden'
              }}
            >
              {sortedSections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <span className="material-icons text-6xl text-madas-text/30 mb-4">add_circle_outline</span>
                  <p className="text-lg font-medium text-madas-text/70 mb-2">No Sections Yet</p>
                  <p className="text-sm text-madas-text/60">Add your first section from the sidebar</p>
                </div>
              ) : (
                sortedSections.map((section) => (
                  <SortableSection
                    key={section.id}
                    section={section}
                    isSelected={selectedSection === section.id}
                    onSelect={() => onSelectSection(section.id)}
                    onDelete={() => onDeleteSection(section.id)}
                    onDuplicate={() => onDuplicateSection(section.id)}
                  >
                    <div 
                      onClick={(e) => handleSectionContentClick(e, section.id)}
                      data-section-id={section.id}
                      className={`relative ${selectedSection === section.id ? 'cursor-pointer' : ''}`}
                    >
                      {/* Element highlight indicator when section is selected */}
                      {selectedSection === section.id && (
                        <style>{`
                          [data-section-id="${section.id}"] h1:hover,
                          [data-section-id="${section.id}"] h2:hover,
                          [data-section-id="${section.id}"] h3:hover,
                          [data-section-id="${section.id}"] p:hover,
                          [data-section-id="${section.id}"] a:hover,
                          [data-section-id="${section.id}"] button:hover,
                          [data-section-id="${section.id}"] img:hover,
                          [data-section-id="${section.id}"] [class*="card"]:hover,
                          [data-section-id="${section.id}"] [class*="-item"]:hover,
                          [data-section-id="${section.id}"] .banner-text:hover,
                          [data-section-id="${section.id}"] .banner-button:hover,
                          [data-section-id="${section.id}"] .marquee-track:hover,
                          [data-section-id="${section.id}"] .hero-title:hover,
                          [data-section-id="${section.id}"] .hero-subtitle:hover,
                          [data-section-id="${section.id}"] .hero-button:hover,
                          [data-section-id="${section.id}"] .carousel-nav:hover,
                          [data-section-id="${section.id}"] .products-title:hover,
                          [data-section-id="${section.id}"] .products-subtitle:hover,
                          [data-section-id="${section.id}"] .product-card:hover,
                          [data-section-id="${section.id}"] [data-edit-type]:hover {
                            outline: 2px dashed rgba(39, 73, 31, 0.6) !important;
                            outline-offset: 2px !important;
                            transition: outline 0.15s ease !important;
                          }
                        `}</style>
                      )}
                      
                      {/* Disable link navigation styling */}
                      <style>{`
                        [data-section-id="${section.id}"] a {
                          cursor: default !important;
                        }
                        [data-section-id="${section.id}"] a:hover {
                          cursor: pointer !important;
                        }
                      `}</style>
                      
                      {/* Selected element indicator */}
                      {selectedSection === section.id && selectedElement && selectedElement.sectionId === section.id && (
                        <div className="absolute top-0 left-0 z-50 -translate-y-full pointer-events-none">
                          <div className="bg-primary text-white text-[10px] px-2 py-1 rounded-t font-medium flex items-center gap-1 shadow-lg">
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
                              Editing: {selectedElement.type.charAt(0).toUpperCase() + selectedElement.type.slice(1)}
                              {selectedElement.index !== undefined ? ` #${selectedElement.index + 1}` : ''}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <div data-section-content>
                        <SectionRenderer
                          section={section}
                          isSelected={selectedSection === section.id}
                          onSelect={() => onSelectSection(section.id)}
                          previewMode={previewMode}
                          siteId={siteId}
                        />
                      </div>
                    </div>
                  </SortableSection>
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};

export default BuilderCanvas;
