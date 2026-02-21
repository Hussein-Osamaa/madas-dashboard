import { useState, useEffect } from 'react';
import { ElementType, SelectedElement, elementLabels } from '../../types/elementEditor';
import { Section } from '../../types/builder';
import ImageUploader from './ImageUploader';
import { db, collection, getDocs } from '../../lib/firebase';

interface Props {
  selectedElement: SelectedElement | null;
  section: Section;
  onUpdateSection: (section: Section) => void;
  onClearSelection: () => void;
  businessId?: string;
  siteId?: string;
}

interface Collection {
  id: string;
  name: string;
  status?: string;
  image?: string;
  description?: string;
  productCount?: number;
}

// Color picker component
const ColorPicker = ({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: string; 
  onChange: (color: string) => void;
}) => {
  // Extract hex color from gradient or use value directly
  const extractHexColor = (val: string): string => {
    if (!val) return '#000000';
    // If it's already a hex color
    if (val.startsWith('#') && (val.length === 7 || val.length === 4)) {
      return val;
    }
    // Extract first hex color from gradient
    const hexMatch = val.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/);
    return hexMatch ? hexMatch[0] : '#000000';
  };

  const hexValue = extractHexColor(value);
  const isGradient = value?.includes('gradient');

  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-gray-600">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="color"
          value={hexValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border border-gray-200"
          title={isGradient ? 'Gradient detected - click to change to solid color' : ''}
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="w-20 text-xs px-2 py-1 border rounded"
        />
      </div>
    </div>
  );
};

// Number input component
const NumberInput = ({ 
  label, 
  value, 
  onChange, 
  min = 0, 
  max = 100,
  suffix = ''
}: { 
  label: string; 
  value: number; 
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) => (
  <div className="flex items-center justify-between gap-2">
    <label className="text-xs text-gray-600">{label}</label>
    <div className="flex items-center gap-1">
      <input
        type="range"
        min={min}
        max={max}
        value={value || 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
      />
      <span className="text-xs text-gray-500 w-12 text-right">{value || 0}{suffix}</span>
    </div>
  </div>
);

// Select input component
const SelectInput = ({ 
  label, 
  value, 
  options, 
  onChange 
}: { 
  label: string; 
  value: string; 
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
}) => (
  <div className="space-y-1">
    <label className="text-xs text-gray-600 block">{label}</label>
    <select
      value={value || ''}
      onChange={(e) => {
        e.stopPropagation();
        onChange(e.target.value);
      }}
      onClick={(e) => e.stopPropagation()}
      className="w-full text-xs px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// Toggle switch component
const ToggleSwitch = ({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: boolean; 
  onChange: (val: boolean) => void;
}) => (
  <div className="flex items-center justify-between gap-2">
    <label className="text-xs text-gray-600">{label}</label>
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-10 h-5 rounded-full transition-colors ${value ? 'bg-primary' : 'bg-gray-300'}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  </div>
);

// Text area component
const TextArea = ({ 
  label, 
  value, 
  onChange,
  rows = 2,
  placeholder = ''
}: { 
  label: string; 
  value: string; 
  onChange: (val: string) => void;
  rows?: number;
  placeholder?: string;
}) => (
  <div>
    <label className="text-xs text-gray-600 block mb-1">{label}</label>
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full text-xs px-2 py-1.5 border rounded resize-none"
    />
  </div>
);

// Text input component
const TextInput = ({ 
  label, 
  value, 
  onChange,
  placeholder = ''
}: { 
  label: string; 
  value: string; 
  onChange: (val: string) => void;
  placeholder?: string;
}) => (
  <div className="flex items-center justify-between gap-2">
    <label className="text-xs text-gray-600 whitespace-nowrap">{label}</label>
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 text-xs px-2 py-1 border rounded min-w-0"
    />
  </div>
);

// Section divider
const EditorSection = ({ 
  title, 
  icon, 
  children,
  defaultOpen = true
}: { 
  title: string; 
  icon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="material-icons text-sm text-primary">{icon}</span>
          <span className="text-xs font-medium text-gray-700">{title}</span>
        </div>
        <span className={`material-icons text-gray-400 text-sm transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
};

const ContextualEditor = ({ selectedElement, section, onUpdateSection, onClearSelection, businessId, siteId }: Props) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  
  // Product picker state
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');

  // Fetch collections when needed
  useEffect(() => {
    const fetchCollections = async () => {
      console.log('[ContextualEditor] Fetching collections for businessId:', businessId, 'section:', section.type);
      
      if (!businessId) {
        console.log('[ContextualEditor] No businessId, skipping fetch');
        return;
      }
      
      setLoadingCollections(true);
      try {
        const collectionsRef = collection(db, 'businesses', businessId, 'collections');
        const snapshot = await getDocs(collectionsRef);
        const collectionsList = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || 'Unnamed Collection',
            status: data.status,
            image: data.image || data.imageUrl || '',
            description: data.description || '',
            productCount: data.productCount || data.products?.length || 0
          };
        });
        setCollections(collectionsList);
        console.log('[ContextualEditor] Loaded collections:', collectionsList.length, collectionsList);
      } catch (error) {
        console.error('[ContextualEditor] Error fetching collections:', error);
      } finally {
        setLoadingCollections(false);
      }
    };

    fetchCollections();
  }, [businessId, section.type]);

  // Fetch products when needed
  const fetchProducts = async () => {
    if (!businessId) return;
    setLoadingProducts(true);
    try {
      const productsRef = collection(db, 'businesses', businessId, 'products');
      const snapshot = await getDocs(productsRef);
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAvailableProducts(products);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  if (!selectedElement) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <span className="material-icons text-3xl text-gray-400">touch_app</span>
        </div>
        <h3 className="text-sm font-medium text-gray-700 mb-1">Select an Element</h3>
        <p className="text-xs text-gray-500 max-w-[200px]">
          Click on any element in the section to start editing it
        </p>
      </div>
    );
  }

  const elementLabel = elementLabels[selectedElement.type] || selectedElement.type;
  const data = section.data as any;
  const style = section.style || {};

  // Helper to update section data
  const updateData = (key: string, value: any) => {
    onUpdateSection({
      ...section,
      data: { ...data, [key]: value }
    });
  };

  // Helper to update nested data
  const updateNestedData = (path: string, value: any) => {
    const keys = path.split('.');
    const newData = JSON.parse(JSON.stringify(data)); // Deep clone
    let current = newData;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (key.includes('[')) {
        const [arrKey, idx] = key.replace(']', '').split('[');
        if (!current[arrKey]) current[arrKey] = [];
        if (!current[arrKey][Number(idx)]) current[arrKey][Number(idx)] = {};
        current = current[arrKey][Number(idx)];
      } else {
        if (!current[key]) current[key] = {};
        current = current[key];
      }
    }
    
    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;
    
    onUpdateSection({ ...section, data: newData });
  };

  // Helper to update style
  const updateStyle = (key: string, value: any) => {
    onUpdateSection({
      ...section,
      style: { ...style, [key]: value }
    });
  };

  // Render editors based on element type
  const renderBackgroundEditor = () => (
    <>
      <EditorSection title="Background Color" icon="format_color_fill">
        <ColorPicker
          label="Color"
          value={style.backgroundColor || data.backgroundColor || '#ffffff'}
          onChange={(val) => {
            updateStyle('backgroundColor', val);
            updateData('backgroundColor', val);
          }}
        />
        <ToggleSwitch
          label="Use Gradient"
          value={data.backgroundColor?.includes('gradient') || false}
          onChange={(val) => {
            if (val) {
              updateData('backgroundColor', 'linear-gradient(135deg, #27491F 0%, #F0CAE1 100%)');
            } else {
              updateData('backgroundColor', style.backgroundColor || '#ffffff');
            }
          }}
        />
      </EditorSection>

      <EditorSection title="Background Image" icon="image" defaultOpen={false}>
        <ImageUploader
          value={data.backgroundImage || ''}
          onChange={(url) => updateData('backgroundImage', url)}
        />
        {data.backgroundImage && (
          <>
            <ToggleSwitch
              label="Show Overlay"
              value={data.showOverlay || false}
              onChange={(val) => updateData('showOverlay', val)}
            />
            {data.showOverlay && (
              <NumberInput
                label="Overlay Opacity"
                value={data.overlayOpacity || 50}
                onChange={(val) => updateData('overlayOpacity', val)}
                max={100}
                suffix="%"
              />
            )}
          </>
        )}
      </EditorSection>

      <EditorSection title="Spacing" icon="space_bar" defaultOpen={false}>
        <NumberInput
          label="Padding Top"
          value={style.paddingTop || 60}
          onChange={(val) => updateStyle('paddingTop', val)}
          max={200}
          suffix="px"
        />
        <NumberInput
          label="Padding Bottom"
          value={style.paddingBottom || 60}
          onChange={(val) => updateStyle('paddingBottom', val)}
          max={200}
          suffix="px"
        />
        <NumberInput
          label="Padding Left/Right"
          value={style.paddingX || 20}
          onChange={(val) => updateStyle('paddingX', val)}
          max={100}
          suffix="px"
        />
      </EditorSection>
    </>
  );

  const renderTitleEditor = () => (
    <>
      <EditorSection title="Content" icon="edit">
        <TextArea
          label="Title Text"
          value={data.title || ''}
          onChange={(val) => updateData('title', val)}
          rows={3}
          placeholder="Enter your title..."
        />
      </EditorSection>

      <EditorSection title="Typography" icon="text_fields">
        <NumberInput
          label="Font Size"
          value={data.textStyle?.titleFontSize || 48}
          onChange={(val) => updateNestedData('textStyle.titleFontSize', val)}
          min={12}
          max={120}
          suffix="px"
        />
        <SelectInput
          label="Font Weight"
          value={data.textStyle?.titleFontWeight || 'bold'}
          options={[
            { value: 'normal', label: 'Normal' },
            { value: '500', label: 'Medium' },
            { value: '600', label: 'Semi Bold' },
            { value: 'bold', label: 'Bold' },
            { value: '800', label: 'Extra Bold' },
          ]}
          onChange={(val) => updateNestedData('textStyle.titleFontWeight', val)}
        />
        <ColorPicker
          label="Text Color"
          value={data.textColor || '#ffffff'}
          onChange={(val) => updateData('textColor', val)}
        />
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs text-gray-600">Alignment</label>
          <div className="flex gap-1">
            {['left', 'center', 'right'].map(align => (
              <button
                key={align}
                type="button"
                onClick={() => updateNestedData('textStyle.titleAlignment', align)}
                className={`p-1.5 rounded ${
                  (data.textStyle?.titleAlignment || 'center') === align
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="material-icons text-sm">format_align_{align}</span>
              </button>
            ))}
          </div>
        </div>
      </EditorSection>
    </>
  );

  const renderSubtitleEditor = () => (
    <>
      <EditorSection title="Content" icon="edit">
        <TextArea
          label="Subtitle Text"
          value={data.subtitle || ''}
          onChange={(val) => updateData('subtitle', val)}
          rows={3}
          placeholder="Enter your subtitle..."
        />
      </EditorSection>

      <EditorSection title="Typography" icon="text_fields">
        <NumberInput
          label="Font Size"
          value={data.textStyle?.subtitleFontSize || 20}
          onChange={(val) => updateNestedData('textStyle.subtitleFontSize', val)}
          min={12}
          max={60}
          suffix="px"
        />
        <SelectInput
          label="Font Weight"
          value={data.textStyle?.subtitleFontWeight || 'normal'}
          options={[
            { value: 'normal', label: 'Normal' },
            { value: '500', label: 'Medium' },
            { value: '600', label: 'Semi Bold' },
            { value: 'bold', label: 'Bold' },
          ]}
          onChange={(val) => updateNestedData('textStyle.subtitleFontWeight', val)}
        />
        <ColorPicker
          label="Text Color"
          value={data.textColor || '#ffffff'}
          onChange={(val) => updateData('textColor', val)}
        />
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs text-gray-600">Alignment</label>
          <div className="flex gap-1">
            {['left', 'center', 'right'].map(align => (
              <button
                key={align}
                type="button"
                onClick={() => updateNestedData('textStyle.subtitleAlignment', align)}
                className={`p-1.5 rounded ${
                  (data.textStyle?.subtitleAlignment || 'center') === align
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="material-icons text-sm">format_align_{align}</span>
              </button>
            ))}
          </div>
        </div>
      </EditorSection>
    </>
  );

  const renderButtonEditor = () => (
    <>
      <EditorSection title="Content" icon="edit">
        <TextInput
          label="Button Text"
          value={data.buttonText || ''}
          onChange={(val) => updateData('buttonText', val)}
          placeholder="Shop Now"
        />
        <TextInput
          label="Link URL"
          value={data.buttonLink || ''}
          onChange={(val) => updateData('buttonLink', val)}
          placeholder="https://"
        />
      </EditorSection>

      <EditorSection title="Style" icon="palette">
        <ColorPicker
          label="Background"
          value={data.buttonBackgroundColor || data.textStyle?.buttonStyle?.backgroundColor || '#ffffff'}
          onChange={(val) => {
            updateData('buttonBackgroundColor', val);
            updateNestedData('textStyle.buttonStyle.backgroundColor', val);
          }}
        />
        <ColorPicker
          label="Text Color"
          value={data.buttonTextColor || data.textStyle?.buttonStyle?.textColor || '#27491F'}
          onChange={(val) => {
            updateData('buttonTextColor', val);
            updateNestedData('textStyle.buttonStyle.textColor', val);
          }}
        />
        <NumberInput
          label="Border Radius"
          value={data.textStyle?.buttonStyle?.borderRadius || 8}
          onChange={(val) => updateNestedData('textStyle.buttonStyle.borderRadius', val)}
          max={30}
          suffix="px"
        />
        <NumberInput
          label="Font Size"
          value={data.textStyle?.buttonStyle?.fontSize || 16}
          onChange={(val) => updateNestedData('textStyle.buttonStyle.fontSize', val)}
          min={12}
          max={24}
          suffix="px"
        />
        <SelectInput
          label="Font Weight"
          value={data.textStyle?.buttonStyle?.fontWeight || '600'}
          options={[
            { value: 'normal', label: 'Normal' },
            { value: '500', label: 'Medium' },
            { value: '600', label: 'Semi Bold' },
            { value: 'bold', label: 'Bold' },
          ]}
          onChange={(val) => updateNestedData('textStyle.buttonStyle.fontWeight', val)}
        />
      </EditorSection>
    </>
  );

  const renderCardEditor = () => {
    const cardStyle = data.cardStyle || {};
    
    return (
      <>
        <EditorSection title="Card Background" icon="dashboard">
          <ColorPicker
            label="Background"
            value={cardStyle.backgroundColor || '#ffffff'}
            onChange={(val) => updateNestedData('cardStyle.backgroundColor', val)}
          />
          <ColorPicker
            label="Image Background"
            value={cardStyle.imageBackground || cardStyle.imageBackgroundColor || '#f3f4f6'}
            onChange={(val) => {
              updateNestedData('cardStyle.imageBackground', val);
              updateNestedData('cardStyle.imageBackgroundColor', val);
            }}
          />
        </EditorSection>

        <EditorSection title="Card Text" icon="text_fields">
          <ColorPicker
            label="Title Color"
            value={cardStyle.textColor || '#1f2937'}
            onChange={(val) => updateNestedData('cardStyle.textColor', val)}
          />
          <ColorPicker
            label="Price Color"
            value={cardStyle.priceColor || '#059669'}
            onChange={(val) => updateNestedData('cardStyle.priceColor', val)}
          />
          <ColorPicker
            label="Description Color"
            value={cardStyle.descriptionColor || '#6b7280'}
            onChange={(val) => updateNestedData('cardStyle.descriptionColor', val)}
          />
        </EditorSection>

        <EditorSection title="Card Style" icon="style" defaultOpen={false}>
          <NumberInput
            label="Border Radius"
            value={cardStyle.borderRadius || 8}
            onChange={(val) => updateNestedData('cardStyle.borderRadius', val)}
            max={30}
            suffix="px"
          />
          <ToggleSwitch
            label="Show Border"
            value={cardStyle.showBorder || false}
            onChange={(val) => updateNestedData('cardStyle.showBorder', val)}
          />
          {cardStyle.showBorder && (
            <ColorPicker
              label="Border Color"
              value={cardStyle.borderColor || '#e5e7eb'}
              onChange={(val) => updateNestedData('cardStyle.borderColor', val)}
            />
          )}
          <ToggleSwitch
            label="Show Shadow"
            value={cardStyle.shadow !== false}
            onChange={(val) => updateNestedData('cardStyle.shadow', val)}
          />
          <SelectInput
            label="Image Aspect"
            value={cardStyle.imageAspect || 'square'}
            options={[
              { value: 'square', label: 'Square (1:1)' },
              { value: '4:3', label: 'Standard (4:3)' },
              { value: '3:4', label: 'Portrait (3:4)' },
              { value: '16:9', label: 'Wide (16:9)' },
            ]}
            onChange={(val) => updateNestedData('cardStyle.imageAspect', val)}
          />
        </EditorSection>

        <EditorSection title="Card Button" icon="smart_button" defaultOpen={false}>
          <ColorPicker
            label="Button Background"
            value={cardStyle.buttonBackgroundColor || '#27491F'}
            onChange={(val) => updateNestedData('cardStyle.buttonBackgroundColor', val)}
          />
          <ColorPicker
            label="Button Text"
            value={cardStyle.buttonTextColor || '#ffffff'}
            onChange={(val) => updateNestedData('cardStyle.buttonTextColor', val)}
          />
          <NumberInput
            label="Button Radius"
            value={cardStyle.buttonBorderRadius || 8}
            onChange={(val) => updateNestedData('cardStyle.buttonBorderRadius', val)}
            max={20}
            suffix="px"
          />
        </EditorSection>
      </>
    );
  };

  const renderProductEditor = () => renderCardEditor();

  const renderImageEditor = () => (
    <>
      <EditorSection title="Image" icon="image">
        <ImageUploader
          value={data.image || data.backgroundImage || ''}
          onChange={(url) => {
            updateData('image', url);
            if (section.type === 'hero' || section.type === 'about') {
              updateData('backgroundImage', url);
            }
          }}
        />
      </EditorSection>

      <EditorSection title="Image Style" icon="tune" defaultOpen={false}>
        <SelectInput
          label="Fit Mode"
          value={data.objectFit || 'cover'}
          options={[
            { value: 'cover', label: 'Cover (fill)' },
            { value: 'contain', label: 'Contain (fit)' },
            { value: 'fill', label: 'Stretch' },
          ]}
          onChange={(val) => updateData('objectFit', val)}
        />
        <NumberInput
          label="Border Radius"
          value={data.imageRadius || 0}
          onChange={(val) => updateData('imageRadius', val)}
          max={50}
          suffix="px"
        />
      </EditorSection>
    </>
  );

  const renderFeatureEditor = () => {
    const index = selectedElement.index;
    const items = data.items || [];
    const item = index !== undefined ? items[index] : null;

    if (!item && index !== undefined) {
      return (
        <div className="p-4 text-center text-gray-500 text-sm">
          Feature item not found
        </div>
      );
    }

    return (
      <>
        {item ? (
          <>
            <EditorSection title="Feature Content" icon="edit">
              <TextInput
                label="Icon/Emoji"
                value={item.icon || ''}
                onChange={(val) => {
                  const newItems = [...items];
                  newItems[index!] = { ...item, icon: val };
                  updateData('items', newItems);
                }}
                placeholder="⭐"
              />
              <TextInput
                label="Title"
                value={item.title || ''}
                onChange={(val) => {
                  const newItems = [...items];
                  newItems[index!] = { ...item, title: val };
                  updateData('items', newItems);
                }}
              />
              <TextArea
                label="Description"
                value={item.description || ''}
                onChange={(val) => {
                  const newItems = [...items];
                  newItems[index!] = { ...item, description: val };
                  updateData('items', newItems);
                }}
              />
            </EditorSection>
          </>
        ) : (
          <>
            <EditorSection title="Section Title" icon="title">
              <TextInput
                label="Title"
                value={data.title || ''}
                onChange={(val) => updateData('title', val)}
              />
              <TextInput
                label="Subtitle"
                value={data.subtitle || ''}
                onChange={(val) => updateData('subtitle', val)}
              />
            </EditorSection>
          </>
        )}
      </>
    );
  };

  const renderTeamMemberEditor = () => {
    const index = selectedElement.index;
    const members = data.members || [];
    const member = index !== undefined ? members[index] : null;

    if (!member && index !== undefined) {
      return (
        <div className="p-4 text-center text-gray-500 text-sm">
          Team member not found
        </div>
      );
    }

    return member ? (
      <>
        <EditorSection title="Member Info" icon="person">
          <TextInput
            label="Name"
            value={member.name || ''}
            onChange={(val) => {
              const newMembers = [...members];
              newMembers[index!] = { ...member, name: val };
              updateData('members', newMembers);
            }}
          />
          <TextInput
            label="Role"
            value={member.role || ''}
            onChange={(val) => {
              const newMembers = [...members];
              newMembers[index!] = { ...member, role: val };
              updateData('members', newMembers);
            }}
          />
          <TextArea
            label="Bio"
            value={member.bio || ''}
            onChange={(val) => {
              const newMembers = [...members];
              newMembers[index!] = { ...member, bio: val };
              updateData('members', newMembers);
            }}
          />
        </EditorSection>
        <EditorSection title="Photo" icon="image">
          <ImageUploader
            value={member.image || ''}
            onChange={(url) => {
              const newMembers = [...members];
              newMembers[index!] = { ...member, image: url };
              updateData('members', newMembers);
            }}
          />
        </EditorSection>
      </>
    ) : (
      <EditorSection title="Section Title" icon="title">
        <TextInput
          label="Title"
          value={data.title || ''}
          onChange={(val) => updateData('title', val)}
        />
        <TextInput
          label="Subtitle"
          value={data.subtitle || ''}
          onChange={(val) => updateData('subtitle', val)}
        />
      </EditorSection>
    );
  };

  const renderTestimonialEditor = () => {
    const index = selectedElement.index;
    const items = data.items || data.testimonials || [];
    const item = index !== undefined ? items[index] : null;

    return item ? (
      <>
        <EditorSection title="Testimonial" icon="format_quote">
          <TextArea
            label="Quote"
            value={item.text || item.quote || ''}
            onChange={(val) => {
              const newItems = [...items];
              newItems[index!] = { ...item, text: val, quote: val };
              updateData(data.items ? 'items' : 'testimonials', newItems);
            }}
            rows={4}
          />
          <TextInput
            label="Name"
            value={item.name || ''}
            onChange={(val) => {
              const newItems = [...items];
              newItems[index!] = { ...item, name: val };
              updateData(data.items ? 'items' : 'testimonials', newItems);
            }}
          />
          <TextInput
            label="Role/Company"
            value={item.role || item.company || ''}
            onChange={(val) => {
              const newItems = [...items];
              newItems[index!] = { ...item, role: val, company: val };
              updateData(data.items ? 'items' : 'testimonials', newItems);
            }}
          />
          <NumberInput
            label="Rating"
            value={item.rating || 5}
            onChange={(val) => {
              const newItems = [...items];
              newItems[index!] = { ...item, rating: val };
              updateData(data.items ? 'items' : 'testimonials', newItems);
            }}
            min={1}
            max={5}
            suffix="★"
          />
        </EditorSection>
      </>
    ) : (
      <EditorSection title="Section Title" icon="title">
        <TextInput
          label="Title"
          value={data.title || ''}
          onChange={(val) => updateData('title', val)}
        />
      </EditorSection>
    );
  };

  const renderStatEditor = () => {
    const index = selectedElement.index;
    const stats = data.stats || [];
    const stat = index !== undefined ? stats[index] : null;

    return stat ? (
      <EditorSection title="Statistic" icon="bar_chart">
        <TextInput
          label="Value"
          value={stat.value || ''}
          onChange={(val) => {
            const newStats = [...stats];
            newStats[index!] = { ...stat, value: val };
            updateData('stats', newStats);
          }}
          placeholder="10K+"
        />
        <TextInput
          label="Label"
          value={stat.label || ''}
          onChange={(val) => {
            const newStats = [...stats];
            newStats[index!] = { ...stat, label: val };
            updateData('stats', newStats);
          }}
          placeholder="Happy Customers"
        />
        <TextInput
          label="Icon/Emoji"
          value={stat.icon || ''}
          onChange={(val) => {
            const newStats = [...stats];
            newStats[index!] = { ...stat, icon: val };
            updateData('stats', newStats);
          }}
          placeholder="😊"
        />
      </EditorSection>
    ) : (
      <EditorSection title="Section" icon="title">
        <TextInput
          label="Title"
          value={data.title || ''}
          onChange={(val) => updateData('title', val)}
        />
        <TextInput
          label="Subtitle"
          value={data.subtitle || ''}
          onChange={(val) => updateData('subtitle', val)}
        />
      </EditorSection>
    );
  };

  const renderFaqItemEditor = () => {
    const index = selectedElement.index;
    const items = data.items || [];
    const item = index !== undefined ? items[index] : null;

    return item ? (
      <EditorSection title="FAQ Item" icon="help_outline">
        <TextInput
          label="Question"
          value={item.question || ''}
          onChange={(val) => {
            const newItems = [...items];
            newItems[index!] = { ...item, question: val };
            updateData('items', newItems);
          }}
        />
        <TextArea
          label="Answer"
          value={item.answer || ''}
          onChange={(val) => {
            const newItems = [...items];
            newItems[index!] = { ...item, answer: val };
            updateData('items', newItems);
          }}
          rows={4}
        />
      </EditorSection>
    ) : (
      <EditorSection title="Section Title" icon="title">
        <TextInput
          label="Title"
          value={data.title || ''}
          onChange={(val) => updateData('title', val)}
        />
      </EditorSection>
    );
  };

  const renderCountdownEditor = () => (
    <>
      <EditorSection title="Countdown Settings" icon="timer">
        <TextInput
          label="Target Date"
          value={data.targetDate ? new Date(data.targetDate).toISOString().split('T')[0] : ''}
          onChange={(val) => updateData('targetDate', new Date(val).toISOString())}
          placeholder="YYYY-MM-DD"
        />
        <TextInput
          label="Expired Message"
          value={data.expiredMessage || ''}
          onChange={(val) => updateData('expiredMessage', val)}
          placeholder="The wait is over!"
        />
      </EditorSection>

      <EditorSection title="Display Options" icon="visibility">
        <ToggleSwitch
          label="Show Days"
          value={data.showDays !== false}
          onChange={(val) => updateData('showDays', val)}
        />
        <ToggleSwitch
          label="Show Hours"
          value={data.showHours !== false}
          onChange={(val) => updateData('showHours', val)}
        />
        <ToggleSwitch
          label="Show Minutes"
          value={data.showMinutes !== false}
          onChange={(val) => updateData('showMinutes', val)}
        />
        <ToggleSwitch
          label="Show Seconds"
          value={data.showSeconds !== false}
          onChange={(val) => updateData('showSeconds', val)}
        />
      </EditorSection>

      <EditorSection title="Colors" icon="palette">
        <ColorPicker
          label="Background"
          value={data.backgroundColor || '#27491F'}
          onChange={(val) => updateData('backgroundColor', val)}
        />
        <ColorPicker
          label="Text Color"
          value={data.textColor || '#ffffff'}
          onChange={(val) => updateData('textColor', val)}
        />
      </EditorSection>
    </>
  );

  const renderVideoEditor = () => (
    <>
      <EditorSection title="Video Source" icon="play_circle">
        <TextInput
          label="Video URL"
          value={data.videoUrl || ''}
          onChange={(val) => updateData('videoUrl', val)}
          placeholder="YouTube or Vimeo URL"
        />
        <SelectInput
          label="Video Type"
          value={data.videoType || 'youtube'}
          options={[
            { value: 'youtube', label: 'YouTube' },
            { value: 'vimeo', label: 'Vimeo' },
            { value: 'custom', label: 'Custom URL' },
          ]}
          onChange={(val) => updateData('videoType', val)}
        />
      </EditorSection>

      <EditorSection title="Thumbnail" icon="image" defaultOpen={false}>
        <ImageUploader
          value={data.thumbnailUrl || ''}
          onChange={(url) => updateData('thumbnailUrl', url)}
        />
      </EditorSection>

      <EditorSection title="Options" icon="settings" defaultOpen={false}>
        <ToggleSwitch
          label="Autoplay"
          value={data.autoplay || false}
          onChange={(val) => updateData('autoplay', val)}
        />
        <ToggleSwitch
          label="Show Controls"
          value={data.showControls !== false}
          onChange={(val) => updateData('showControls', val)}
        />
      </EditorSection>
    </>
  );

  const renderDividerEditor = () => (
    <EditorSection title="Divider Style" icon="horizontal_rule">
      <SelectInput
        label="Style"
        value={data.style || 'line'}
        options={[
          { value: 'line', label: 'Line' },
          { value: 'dashed', label: 'Dashed' },
          { value: 'dotted', label: 'Dotted' },
          { value: 'gradient', label: 'Gradient' },
        ]}
        onChange={(val) => updateData('style', val)}
      />
      <ColorPicker
        label="Color"
        value={data.color || '#e5e7eb'}
        onChange={(val) => updateData('color', val)}
      />
      <NumberInput
        label="Height"
        value={data.height || 1}
        onChange={(val) => updateData('height', val)}
        min={1}
        max={10}
        suffix="px"
      />
      <NumberInput
        label="Width"
        value={parseInt(data.width) || 100}
        onChange={(val) => updateData('width', `${val}%`)}
        max={100}
        suffix="%"
      />
      <NumberInput
        label="Spacing"
        value={data.spacing || 40}
        onChange={(val) => updateData('spacing', val)}
        max={100}
        suffix="px"
      />
    </EditorSection>
  );

  const renderDescriptionEditor = () => (
    <>
      <EditorSection title="Content" icon="edit">
        <TextArea
          label="Text"
          value={data.content || data.description || ''}
          onChange={(val) => {
            updateData('content', val);
            updateData('description', val);
          }}
          rows={4}
        />
      </EditorSection>
      <EditorSection title="Style" icon="text_fields" defaultOpen={false}>
        <ColorPicker
          label="Text Color"
          value={data.textColor || style.textColor || '#374151'}
          onChange={(val) => {
            updateData('textColor', val);
            updateStyle('textColor', val);
          }}
        />
      </EditorSection>
    </>
  );

  // Track which menu item is expanded
  const [expandedMenuItem, setExpandedMenuItem] = useState<number | null>(null);

  // Navbar Layout Editor - Add/Remove/Edit Menu Items
  const renderNavbarLayoutEditor = () => {
    const menuItems = data.menuItems || [];
    
    const addMenuItem = () => {
      const newItem = {
        label: 'New Item',
        link: '#',
        badge: '',
        type: 'link', // 'link', 'dropdown', or 'collection'
        collectionId: '',
        collectionName: '',
        dropdownItems: []
      };
      updateData('menuItems', [...menuItems, newItem]);
      // Expand the newly added item
      setExpandedMenuItem(menuItems.length);
    };
    
    const removeMenuItem = (index: number) => {
      const newItems = menuItems.filter((_: any, i: number) => i !== index);
      updateData('menuItems', newItems);
      if (expandedMenuItem === index) {
        setExpandedMenuItem(null);
      } else if (expandedMenuItem !== null && expandedMenuItem > index) {
        setExpandedMenuItem(expandedMenuItem - 1);
      }
    };
    
    const updateMenuItem = (index: number, field: string, value: any) => {
      const newItems = [...menuItems];
      newItems[index] = { ...newItems[index], [field]: value };
      updateData('menuItems', newItems);
    };
    
    // Update multiple fields at once to avoid race conditions
    const updateMenuItemMultiple = (index: number, updates: Record<string, any>) => {
      const newItems = [...menuItems];
      newItems[index] = { ...newItems[index], ...updates };
      updateData('menuItems', newItems);
    };
    
    const moveMenuItem = (index: number, direction: 'up' | 'down') => {
      const newItems = [...menuItems];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= newItems.length) return;
      [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
      updateData('menuItems', newItems);
      // Update expanded item index
      if (expandedMenuItem === index) {
        setExpandedMenuItem(newIndex);
      } else if (expandedMenuItem === newIndex) {
        setExpandedMenuItem(index);
      }
    };

    const addDropdownItem = (menuIndex: number) => {
      const newItems = [...menuItems];
      if (!newItems[menuIndex].dropdownItems) {
        newItems[menuIndex].dropdownItems = [];
      }
      newItems[menuIndex].dropdownItems.push({
        label: 'Sub Item',
        link: '#',
        collectionId: '',
        collectionName: ''
      });
      updateData('menuItems', newItems);
    };

    const removeDropdownItem = (menuIndex: number, dropdownIndex: number) => {
      const newItems = [...menuItems];
      newItems[menuIndex].dropdownItems = newItems[menuIndex].dropdownItems.filter(
        (_: any, i: number) => i !== dropdownIndex
      );
      updateData('menuItems', newItems);
    };

    const updateDropdownItem = (menuIndex: number, dropdownIndex: number, field: string, value: any) => {
      const newItems = [...menuItems];
      newItems[menuIndex].dropdownItems[dropdownIndex] = {
        ...newItems[menuIndex].dropdownItems[dropdownIndex],
        [field]: value
      };
      updateData('menuItems', newItems);
    };

    const toggleMenuItem = (index: number) => {
      setExpandedMenuItem(expandedMenuItem === index ? null : index);
    };

    // Get type icon
    const getTypeIcon = (type: string) => {
      switch (type) {
        case 'dropdown': return 'arrow_drop_down_circle';
        case 'collection': return 'category';
        default: return 'link';
      }
    };

    return (
      <>
        {/* Logo Settings */}
        <EditorSection title="Logo" icon="image">
          <ImageUploader
            value={data.logo || ''}
            onChange={(url) => updateData('logo', url)}
          />
          <TextInput
            label="Logo Text"
            value={data.logoText || ''}
            onChange={(val) => updateData('logoText', val)}
            placeholder="Brand Name"
          />
        </EditorSection>

        {/* Menu Items */}
        <EditorSection title="Menu Items" icon="menu">
          <div className="space-y-1.5">
            {menuItems.map((item: any, index: number) => {
              const isExpanded = expandedMenuItem === index;
              
              return (
                <div 
                  key={index} 
                  className={`border rounded-lg overflow-hidden transition-all duration-200 ${
                    isExpanded ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'
                  }`}
                >
                  {/* Collapsed Header - Click to expand */}
                  <button
                    type="button"
                    onClick={() => toggleMenuItem(index)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                      isExpanded ? 'bg-primary/10' : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Drag Handle / Order */}
                    <span className="text-[10px] font-medium text-gray-400 w-4">{index + 1}</span>
                    
                    {/* Type Icon */}
                    <span className={`material-icons text-sm ${isExpanded ? 'text-primary' : 'text-gray-400'}`}>
                      {getTypeIcon(item.type)}
                    </span>
                    
                    {/* Label */}
                    <span className={`flex-1 text-xs font-medium truncate ${isExpanded ? 'text-primary' : 'text-gray-700'}`}>
                      {item.label || 'Unnamed Item'}
                    </span>
                    
                    {/* Badge indicator */}
                    {item.badge && (
                      <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-medium">
                        {item.badge}
                      </span>
                    )}
                    
                    {/* Sub-items count for dropdowns */}
                    {item.type === 'dropdown' && item.dropdownItems?.length > 0 && (
                      <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                        {item.dropdownItems.length} items
                      </span>
                    )}
                    
                    {/* Expand Arrow */}
                    <span 
                      className={`material-icons text-sm text-gray-400 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    >
                      expand_more
                    </span>
                  </button>
                  
                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 space-y-3 border-t border-gray-100">
                      {/* Action Buttons Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveMenuItem(index, 'up'); }}
                            disabled={index === 0}
                            className="p-1.5 hover:bg-gray-100 rounded text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move Up"
                          >
                            <span className="material-icons text-sm">arrow_upward</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveMenuItem(index, 'down'); }}
                            disabled={index === menuItems.length - 1}
                            className="p-1.5 hover:bg-gray-100 rounded text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move Down"
                          >
                            <span className="material-icons text-sm">arrow_downward</span>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeMenuItem(index); }}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded flex items-center gap-1 text-xs"
                          title="Delete Item"
                        >
                          <span className="material-icons text-sm">delete</span>
                          Delete
                        </button>
                      </div>

                      {/* Item Label */}
                      <div>
                        <label className="text-[10px] text-gray-500 font-medium block mb-1">Label</label>
                        <input
                          type="text"
                          value={item.label || ''}
                          onChange={(e) => updateMenuItem(index, 'label', e.target.value)}
                          placeholder="Menu Label"
                          className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>

                      {/* Item Type */}
                      <div>
                        <label className="text-[10px] text-gray-500 font-medium block mb-1">Type</label>
                        <div className="grid grid-cols-4 gap-1">
                          {[
                            { value: 'link', label: 'Link', icon: 'link' },
                            { value: 'page', label: 'Page', icon: 'description' },
                            { value: 'collection', label: 'Collection', icon: 'category' },
                            { value: 'dropdown', label: 'Dropdown', icon: 'arrow_drop_down_circle' }
                          ].map(typeOpt => (
                            <button
                              key={typeOpt.value}
                              type="button"
                              onClick={() => updateMenuItem(index, 'type', typeOpt.value)}
                              className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-[10px] transition-all ${
                                (item.type || 'link') === typeOpt.value
                                  ? 'bg-primary text-white border-primary'
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <span className="material-icons text-base">{typeOpt.icon}</span>
                              {typeOpt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Simple Link */}
                      {(item.type === 'link' || !item.type) && (
                        <div>
                          <label className="text-[10px] text-gray-500 font-medium block mb-1">Link URL</label>
                          <input
                            type="text"
                            value={item.link || ''}
                            onChange={(e) => updateMenuItem(index, 'link', e.target.value)}
                            placeholder="https:// or /page or #section"
                            className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          />
                        </div>
                      )}

                      {/* Page Link */}
                      {item.type === 'page' && (
                        <div>
                          <label className="text-[10px] text-gray-500 font-medium block mb-1">Select Page</label>
                          <select
                            value={item.pageId || ''}
                            onChange={(e) => {
                              const pageOptions: Record<string, { label: string; link: string }> = {
                                'products': { label: 'All Products', link: '/products' },
                                'about-us': { label: 'About Us', link: '/about-us' },
                                'faq': { label: 'FAQ', link: '/faq' },
                                'privacy-policy': { label: 'Privacy Policy', link: '/privacy-policy' },
                                'terms-of-service': { label: 'Terms of Service', link: '/terms-of-service' },
                                'shipping-policy': { label: 'Shipping Policy', link: '/shipping-policy' },
                                'return-policy': { label: 'Return Policy', link: '/return-policy' },
                                'cart': { label: 'Shopping Cart', link: '/cart' },
                                'favorites': { label: 'Favorites', link: '/favorites' },
                                'login': { label: 'Login', link: '/login' },
                                'register': { label: 'Register', link: '/register' },
                              };
                              const pageId = e.target.value;
                              const page = pageOptions[pageId];
                              // Update all fields at once to avoid race conditions
                              const updates: Record<string, any> = {
                                pageId: pageId,
                                link: page?.link || '#'
                              };
                              if (page && !item.label) {
                                updates.label = page.label;
                              }
                              updateMenuItemMultiple(index, updates);
                            }}
                            className="w-full text-xs px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          >
                            <option value="">-- Select Page --</option>
                            <optgroup label="Store Pages">
                              <option value="products">All Products</option>
                              <option value="cart">Shopping Cart</option>
                              <option value="favorites">Favorites / Wishlist</option>
                            </optgroup>
                            <optgroup label="Info Pages">
                              <option value="about-us">About Us</option>
                              <option value="faq">FAQ</option>
                            </optgroup>
                            <optgroup label="Policy Pages">
                              <option value="privacy-policy">Privacy Policy</option>
                              <option value="terms-of-service">Terms of Service</option>
                              <option value="shipping-policy">Shipping Policy</option>
                              <option value="return-policy">Return Policy</option>
                            </optgroup>
                            <optgroup label="Account">
                              <option value="login">Login</option>
                              <option value="register">Register</option>
                            </optgroup>
                          </select>
                          <p className="text-[10px] text-gray-400 mt-1">
                            Make sure the page is enabled in Website Settings
                          </p>
                        </div>
                      )}

                      {/* Collection Link */}
                      {item.type === 'collection' && (
                        <div>
                          <label className="text-[10px] text-gray-500 font-medium block mb-1">Select Collection</label>
                          {loadingCollections ? (
                            <div className="text-xs text-gray-400 py-2 flex items-center gap-2">
                              <span className="material-icons text-sm animate-spin">refresh</span>
                              Loading collections...
                            </div>
                          ) : collections.length === 0 ? (
                            <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded-lg">
                              No collections found. Create collections first in Inventory.
                            </div>
                          ) : (
                            <select
                              value={item.collectionId || ''}
                              onChange={(e) => {
                                const col = collections.find(c => c.id === e.target.value);
                                // Update all fields at once to avoid race conditions
                                updateMenuItemMultiple(index, {
                                  collectionId: e.target.value,
                                  collectionName: col?.name || '',
                                  link: `/products?collection=${e.target.value}`
                                });
                              }}
                              className="w-full text-xs px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            >
                              <option value="">-- Select Collection --</option>
                              {collections.map(col => (
                                <option key={col.id} value={col.id}>
                                  {col.name} {col.status !== 'active' ? `(${col.status})` : ''}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}

                      {/* Dropdown Menu Items */}
                      {item.type === 'dropdown' && (
                        <div className="border-t border-gray-100 pt-3 mt-2">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                              <span className="material-icons text-xs">subdirectory_arrow_right</span>
                              Dropdown Items
                            </label>
                            <button
                              type="button"
                              onClick={() => addDropdownItem(index)}
                              className="text-[10px] text-primary font-medium flex items-center gap-0.5 hover:underline"
                            >
                              <span className="material-icons text-sm">add</span>
                              Add Item
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                            {item.dropdownItems?.map((dropItem: any, dropIndex: number) => (
                              <div key={dropIndex} className="bg-white border border-gray-200 rounded-lg p-2.5">
                                <div className="flex gap-2 items-start">
                                  <div className="flex-1 space-y-2">
                                    {/* Sub-item label */}
                                    <input
                                      type="text"
                                      value={dropItem.label || ''}
                                      onChange={(e) => updateDropdownItem(index, dropIndex, 'label', e.target.value)}
                                      placeholder="Sub-item label"
                                      className="w-full text-xs px-2.5 py-1.5 border rounded focus:ring-1 focus:ring-primary/20 focus:border-primary"
                                    />
                                    
                                    {/* Link Type Toggle */}
                                    <div className="flex gap-1">
                                      <button
                                        type="button"
                                        onClick={() => updateDropdownItem(index, dropIndex, 'linkType', 'collection')}
                                        className={`flex-1 text-[10px] py-1.5 px-2 rounded border flex items-center justify-center gap-1 ${
                                          dropItem.linkType === 'collection'
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                        }`}
                                      >
                                        <span className="material-icons text-xs">category</span>
                                        Collection
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          updateDropdownItem(index, dropIndex, 'linkType', 'page');
                                          updateDropdownItem(index, dropIndex, 'collectionId', '');
                                        }}
                                        className={`flex-1 text-[10px] py-1.5 px-2 rounded border flex items-center justify-center gap-1 ${
                                          dropItem.linkType === 'page'
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                        }`}
                                      >
                                        <span className="material-icons text-xs">description</span>
                                        Page
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          updateDropdownItem(index, dropIndex, 'linkType', 'custom');
                                          updateDropdownItem(index, dropIndex, 'collectionId', '');
                                        }}
                                        className={`flex-1 text-[10px] py-1.5 px-2 rounded border flex items-center justify-center gap-1 ${
                                          dropItem.linkType === 'custom' || (!dropItem.linkType)
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                        }`}
                                      >
                                        <span className="material-icons text-xs">link</span>
                                        Custom
                                      </button>
                                    </div>

                                    {/* Collection Dropdown */}
                                    {dropItem.linkType === 'collection' && (
                                      <select
                                        value={dropItem.collectionId || ''}
                                        onChange={(e) => {
                                          const col = collections.find(c => c.id === e.target.value);
                                          updateDropdownItem(index, dropIndex, 'collectionId', e.target.value);
                                          updateDropdownItem(index, dropIndex, 'collectionName', col?.name || '');
                                          updateDropdownItem(index, dropIndex, 'link', `/products?collection=${e.target.value}`);
                                        }}
                                        className="w-full text-[11px] px-2.5 py-1.5 border rounded bg-white focus:ring-1 focus:ring-primary/20 focus:border-primary"
                                      >
                                        <option value="">-- Choose Collection --</option>
                                        {collections.map(col => (
                                          <option key={col.id} value={col.id}>{col.name}</option>
                                        ))}
                                      </select>
                                    )}

                                    {/* Page Dropdown */}
                                    {dropItem.linkType === 'page' && (
                                      <select
                                        value={dropItem.pageId || ''}
                                        onChange={(e) => {
                                          const pageOptions: Record<string, { label: string; link: string }> = {
                                            'products': { label: 'All Products', link: '/products' },
                                            'about-us': { label: 'About Us', link: '/about-us' },
                                            'faq': { label: 'FAQ', link: '/faq' },
                                            'privacy-policy': { label: 'Privacy Policy', link: '/privacy-policy' },
                                            'terms-of-service': { label: 'Terms of Service', link: '/terms-of-service' },
                                            'shipping-policy': { label: 'Shipping Policy', link: '/shipping-policy' },
                                            'return-policy': { label: 'Return Policy', link: '/return-policy' },
                                            'cart': { label: 'Shopping Cart', link: '/cart' },
                                            'favorites': { label: 'Favorites', link: '/favorites' },
                                          };
                                          const pageId = e.target.value;
                                          const page = pageOptions[pageId];
                                          updateDropdownItem(index, dropIndex, 'pageId', pageId);
                                          updateDropdownItem(index, dropIndex, 'link', page?.link || '#');
                                          if (page && !dropItem.label) {
                                            updateDropdownItem(index, dropIndex, 'label', page.label);
                                          }
                                        }}
                                        className="w-full text-[11px] px-2.5 py-1.5 border rounded bg-white focus:ring-1 focus:ring-primary/20 focus:border-primary"
                                      >
                                        <option value="">-- Select Page --</option>
                                        <option value="products">All Products</option>
                                        <option value="about-us">About Us</option>
                                        <option value="faq">FAQ</option>
                                        <option value="privacy-policy">Privacy Policy</option>
                                        <option value="terms-of-service">Terms of Service</option>
                                        <option value="shipping-policy">Shipping Policy</option>
                                        <option value="return-policy">Return Policy</option>
                                        <option value="cart">Shopping Cart</option>
                                        <option value="favorites">Favorites</option>
                                      </select>
                                    )}

                                    {/* Custom Link Input */}
                                    {(dropItem.linkType === 'custom' || !dropItem.linkType) && (
                                      <input
                                        type="text"
                                        value={dropItem.link || ''}
                                        onChange={(e) => updateDropdownItem(index, dropIndex, 'link', e.target.value)}
                                        placeholder="https:// or /page"
                                        className="w-full text-[11px] px-2.5 py-1.5 border rounded focus:ring-1 focus:ring-primary/20 focus:border-primary"
                                      />
                                    )}
                                  </div>
                                  
                                  {/* Delete button */}
                                  <button
                                    type="button"
                                    onClick={() => removeDropdownItem(index, dropIndex)}
                                    className="p-1 hover:bg-red-50 text-red-400 hover:text-red-500 rounded"
                                  >
                                    <span className="material-icons text-sm">close</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {(!item.dropdownItems || item.dropdownItems.length === 0) && (
                            <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                              <span className="material-icons text-2xl text-gray-300 mb-1">list</span>
                              <p className="text-[10px] text-gray-400">
                                No sub-items yet. Click "Add Item" above.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Badge */}
                      <div>
                        <label className="text-[10px] text-gray-500 font-medium block mb-1">Badge (optional)</label>
                        <input
                          type="text"
                          value={item.badge || ''}
                          onChange={(e) => updateMenuItem(index, 'badge', e.target.value)}
                          placeholder="NEW, SALE, HOT, etc."
                          className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                        <p className="text-[9px] text-gray-400 mt-1">Shows a small label next to the menu item</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty State */}
            {menuItems.length === 0 && (
              <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <span className="material-icons text-3xl text-gray-300 mb-2">menu</span>
                <p className="text-xs text-gray-500 mb-1">No menu items yet</p>
                <p className="text-[10px] text-gray-400">Add items to build your navigation</p>
              </div>
            )}

            {/* Add New Item Button */}
            <button
              type="button"
              onClick={addMenuItem}
              className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-icons text-sm">add</span>
              Add Menu Item
            </button>
          </div>
        </EditorSection>

        {/* Navbar Style */}
        <EditorSection title="Navbar Style" icon="palette" defaultOpen={false}>
          <ColorPicker
            label="Background"
            value={data.backgroundColor || '#ffffff'}
            onChange={(val) => updateData('backgroundColor', val)}
          />
          <ColorPicker
            label="Text Color"
            value={data.textColor || '#27491F'}
            onChange={(val) => updateData('textColor', val)}
          />
          <ToggleSwitch
            label="Sticky Header"
            value={data.sticky || false}
            onChange={(val) => updateData('sticky', val)}
          />
        </EditorSection>

        {/* Hover Effects */}
        <EditorSection title="Hover Effects" icon="touch_app" defaultOpen={false}>
          <ColorPicker
            label="Hover Background"
            value={data.hoverBackgroundColor || 'rgba(0,0,0,0.05)'}
            onChange={(val) => updateData('hoverBackgroundColor', val)}
          />
          <ColorPicker
            label="Hover Text/Underline"
            value={data.hoverColor || data.textColor || '#27491F'}
            onChange={(val) => updateData('hoverColor', val)}
          />
          <div className="mb-3">
            <label className="block text-xs font-medium text-madas-text/70 mb-1">Hover Effect Style</label>
            <select
              value={data.hoverEffect || 'underline'}
              onChange={(e) => updateData('hoverEffect', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="underline">Underline</option>
              <option value="highlight">Highlight Background</option>
              <option value="scale">Scale Up</option>
              <option value="glow">Glow Effect</option>
              <option value="slide">Slide Underline</option>
              <option value="fill">Fill Background</option>
            </select>
          </div>
        </EditorSection>

        {/* Icons */}
        <EditorSection title="Navbar Icons" icon="account_circle" defaultOpen={false}>
          <ToggleSwitch
            label="Show Search"
            value={data.showSearch !== false}
            onChange={(val) => updateData('showSearch', val)}
          />
          <ToggleSwitch
            label="Show Cart"
            value={data.showCart !== false}
            onChange={(val) => updateData('showCart', val)}
          />
          <ToggleSwitch
            label="Show Wishlist"
            value={data.showWishlist !== false}
            onChange={(val) => updateData('showWishlist', val)}
          />
          <ToggleSwitch
            label="Show User Icon"
            value={data.showUserIcon !== false}
            onChange={(val) => updateData('showUserIcon', val)}
          />
        </EditorSection>
      </>
    );
  };

  // Menu Item Editor (for individual items)
  const renderMenuItemEditor = () => {
    const index = selectedElement.index;
    const menuItems = data.menuItems || [];
    const item = index !== undefined ? menuItems[index] : null;

    if (!item) {
      return renderNavbarLayoutEditor();
    }

    return (
      <>
        <EditorSection title="Menu Item" icon="link">
          <TextInput
            label="Label"
            value={item.label || ''}
            onChange={(val) => {
              const newItems = [...menuItems];
              newItems[index!] = { ...item, label: val };
              updateData('menuItems', newItems);
            }}
          />
          <SelectInput
            label="Type"
            value={item.type || 'link'}
            options={[
              { value: 'link', label: 'Simple Link' },
              { value: 'collection', label: 'Link to Collection' },
              { value: 'dropdown', label: 'Dropdown Menu' },
            ]}
            onChange={(val) => {
              const newItems = [...menuItems];
              newItems[index!] = { ...item, type: val };
              updateData('menuItems', newItems);
            }}
          />
          {(item.type === 'link' || !item.type) && (
            <TextInput
              label="Link URL"
              value={item.link || ''}
              onChange={(val) => {
                const newItems = [...menuItems];
                newItems[index!] = { ...item, link: val };
                updateData('menuItems', newItems);
              }}
              placeholder="https://"
            />
          )}
          {item.type === 'collection' && (
            <SelectInput
              label="Collection"
              value={item.collectionId || ''}
              options={[
                { value: '', label: '-- Select --' },
                ...collections.map(c => ({ value: c.id, label: c.name }))
              ]}
              onChange={(val) => {
                const col = collections.find(c => c.id === val);
                const newItems = [...menuItems];
                newItems[index!] = { 
                  ...item, 
                  collectionId: val,
                  collectionName: col?.name || '',
                  link: `/products?collection=${val}`
                };
                updateData('menuItems', newItems);
              }}
            />
          )}
          <TextInput
            label="Badge"
            value={item.badge || ''}
            onChange={(val) => {
              const newItems = [...menuItems];
              newItems[index!] = { ...item, badge: val };
              updateData('menuItems', newItems);
            }}
            placeholder="NEW, SALE"
          />
        </EditorSection>
      </>
    );
  };

  // Banner Section Editors
  const renderBannerBackgroundEditor = () => (
    <>
      <EditorSection title="Background Color" icon="format_color_fill">
        <ColorPicker
          label="Color"
          value={data.backgroundColor || '#27491F'}
          onChange={(val) => updateData('backgroundColor', val)}
        />
        <div className="mt-3">
          <label className="text-xs text-gray-600 block mb-2">Quick Colors</label>
          <div className="grid grid-cols-6 gap-1.5">
            {['#27491F', '#1f2937', '#7c3aed', '#dc2626', '#ea580c', '#0891b2', '#059669', '#db2777'].map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => updateData('backgroundColor', color)}
                className={`w-full aspect-square rounded-lg border-2 transition-all ${
                  data.backgroundColor === color ? 'border-primary scale-110' : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </EditorSection>

      <EditorSection title="Settings" icon="tune" defaultOpen={false}>
        <ToggleSwitch
          label="Allow Dismiss"
          value={data.dismissible || false}
          onChange={(val) => updateData('dismissible', val)}
        />
      </EditorSection>
    </>
  );

  const renderBannerTextEditor = () => (
    <>
      <EditorSection title="Banner Text" icon="edit">
        <TextArea
          label="Text Content"
          value={data.text || ''}
          onChange={(val) => updateData('text', val)}
          rows={3}
          placeholder="🎉 Special Offer: Get 20% off!"
        />
        <TextInput
          label="Icon (emoji)"
          value={data.icon || ''}
          onChange={(val) => updateData('icon', val)}
          placeholder="🎉 or 🔥 or ⭐"
        />
      </EditorSection>

      <EditorSection title="Text Style" icon="text_fields">
        <ColorPicker
          label="Text Color"
          value={data.textColor || '#ffffff'}
          onChange={(val) => updateData('textColor', val)}
        />
      </EditorSection>

      <EditorSection title="Scrolling Animation" icon="swap_horiz" defaultOpen={false}>
        <ToggleSwitch
          label="Enable Marquee"
          value={data.enableMarquee || false}
          onChange={(val) => updateData('enableMarquee', val)}
        />
        {data.enableMarquee && (
          <>
            <NumberInput
              label="Speed"
              value={data.marqueeSpeed || 20}
              onChange={(val) => updateData('marqueeSpeed', val)}
              min={5}
              max={60}
              suffix="s"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Lower = faster scrolling. The text will continuously scroll across the banner.
            </p>
          </>
        )}
      </EditorSection>
    </>
  );

  const renderBannerButtonEditor = () => (
    <>
      <EditorSection title="Button Content" icon="smart_button">
        <TextInput
          label="Button Text"
          value={data.linkText || 'Shop Now'}
          onChange={(val) => updateData('linkText', val)}
          placeholder="Shop Now"
        />
        <TextInput
          label="Link URL"
          value={data.link || ''}
          onChange={(val) => updateData('link', val)}
          placeholder="https:// or /products"
        />
        {!data.link && (
          <p className="text-[10px] text-orange-500 mt-1">
            Add a link to show the button
          </p>
        )}
      </EditorSection>

      {data.link && (
        <EditorSection title="Button Style" icon="palette" defaultOpen={false}>
          <p className="text-[10px] text-gray-500 mb-2">
            Button uses inverted colors from banner (text color becomes button background)
          </p>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-center">
              <span 
                className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-semibold"
                style={{ 
                  backgroundColor: data.textColor || '#ffffff', 
                  color: data.backgroundColor || '#27491F' 
                }}
              >
                {data.linkText || 'Shop Now'}
                <span className="material-icons text-sm">arrow_forward</span>
              </span>
            </div>
            <p className="text-[9px] text-gray-400 text-center mt-2">Button Preview</p>
          </div>
        </EditorSection>
      )}
    </>
  );

  // Full Banner Editor (when clicking background on banner)
  const renderBannerFullEditor = () => (
    <>
      <EditorSection title="Banner Text" icon="edit">
        <TextArea
          label="Text Content"
          value={data.text || ''}
          onChange={(val) => updateData('text', val)}
          rows={2}
          placeholder="🎉 Special Offer: Get 20% off!"
        />
        <TextInput
          label="Icon (emoji)"
          value={data.icon || ''}
          onChange={(val) => updateData('icon', val)}
          placeholder="🎉"
        />
      </EditorSection>

      <EditorSection title="Button" icon="smart_button">
        <TextInput
          label="Button Text"
          value={data.linkText || 'Shop Now'}
          onChange={(val) => updateData('linkText', val)}
          placeholder="Shop Now"
        />
        <TextInput
          label="Link URL"
          value={data.link || ''}
          onChange={(val) => updateData('link', val)}
          placeholder="https:// or /products"
        />
      </EditorSection>

      <EditorSection title="Colors" icon="palette">
        <ColorPicker
          label="Background"
          value={data.backgroundColor || '#27491F'}
          onChange={(val) => updateData('backgroundColor', val)}
        />
        <ColorPicker
          label="Text Color"
          value={data.textColor || '#ffffff'}
          onChange={(val) => updateData('textColor', val)}
        />
        <div className="mt-3">
          <label className="text-xs text-gray-600 block mb-2">Presets</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { bg: '#27491F', text: '#ffffff', name: 'Forest' },
              { bg: '#1f2937', text: '#ffffff', name: 'Dark' },
              { bg: '#dc2626', text: '#ffffff', name: 'Red Alert' },
              { bg: '#7c3aed', text: '#ffffff', name: 'Purple' },
              { bg: '#fbbf24', text: '#1f2937', name: 'Gold' },
              { bg: '#f0fdf4', text: '#166534', name: 'Light Green' },
            ].map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  updateData('backgroundColor', preset.bg);
                  updateData('textColor', preset.text);
                }}
                className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:border-primary transition-colors text-left"
              >
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold"
                  style={{ backgroundColor: preset.bg, color: preset.text }}
                >
                  Aa
                </div>
                <span className="text-[10px] text-gray-600">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      </EditorSection>

      <EditorSection title="Animation" icon="swap_horiz" defaultOpen={false}>
        <ToggleSwitch
          label="Scrolling Text (Marquee)"
          value={data.enableMarquee || false}
          onChange={(val) => updateData('enableMarquee', val)}
        />
        {data.enableMarquee && (
          <NumberInput
            label="Speed"
            value={data.marqueeSpeed || 20}
            onChange={(val) => updateData('marqueeSpeed', val)}
            min={5}
            max={60}
            suffix="s"
          />
        )}
      </EditorSection>

      <EditorSection title="Options" icon="settings" defaultOpen={false}>
        <ToggleSwitch
          label="Allow Dismiss"
          value={data.dismissible || false}
          onChange={(val) => updateData('dismissible', val)}
        />
        <p className="text-[10px] text-gray-400 mt-1">
          Shows a close button so visitors can dismiss the banner
        </p>
      </EditorSection>
    </>
  );

  // Hero Section Editors
  // Shared carousel toggle component for hero editors
  const renderHeroCarouselToggle = () => {
    const slides = data.slides || [];
    const isCarousel = data.isCarousel || false;

    const addSlide = () => {
      const newSlide = {
        title: 'New Slide Title',
        subtitle: 'New slide description',
        buttonText: 'Shop Now',
        buttonLink: '#',
        backgroundColor: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
        textColor: '#ffffff'
      };
      const newSlides = [...slides, newSlide];
      updateData('slides', newSlides);
      if (!isCarousel) {
        updateData('isCarousel', true);
      }
    };

    const updateSlide = (index: number, field: string, value: any) => {
      const newSlides = [...slides];
      newSlides[index] = { ...newSlides[index], [field]: value };
      updateData('slides', newSlides);
    };

    const removeSlide = (index: number) => {
      const newSlides = slides.filter((_: any, i: number) => i !== index);
      updateData('slides', newSlides);
      if (newSlides.length <= 1) {
        updateData('isCarousel', false);
      }
    };

    return (
      <EditorSection title="Carousel Mode" icon="view_carousel" defaultOpen={false}>
        <ToggleSwitch
          label="Enable Carousel"
          value={isCarousel}
          onChange={(val) => {
            updateData('isCarousel', val);
            if (val && slides.length === 0) {
              updateData('slides', [{
                title: data.title || 'Welcome to Our Store',
                subtitle: data.subtitle || 'Discover amazing products',
                buttonText: data.buttonText || 'Shop Now',
                buttonLink: data.buttonLink || '#',
                backgroundImage: data.backgroundImage || '',
                backgroundColor: data.backgroundColor || 'linear-gradient(135deg, #27491F 0%, #3d6b2f 100%)',
                textColor: data.textColor || '#ffffff'
              }]);
            }
          }}
        />

        {isCarousel && (
          <>
            {/* Autoplay Settings */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <ToggleSwitch
                label="Autoplay"
                value={data.autoplay || false}
                onChange={(val) => updateData('autoplay', val)}
              />
              {data.autoplay && (
                <NumberInput
                  label="Interval"
                  value={(data.autoplayInterval || 5000) / 1000}
                  onChange={(val) => updateData('autoplayInterval', val * 1000)}
                  min={2}
                  max={15}
                  suffix="s"
                />
              )}
            </div>

            {/* Slides Header */}
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">
                {slides.length} Slide{slides.length !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={addSlide}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
              >
                <span className="material-icons text-sm">add</span>
                Add
              </button>
            </div>

            {/* Slides List */}
            <div className="mt-2 space-y-2">
              {slides.map((slide: any, index: number) => (
                <details key={index} className="group border border-gray-200 rounded-lg overflow-hidden">
                  <summary className="flex items-center gap-2 p-2 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                    <span className="material-icons text-sm text-gray-400 group-open:rotate-90 transition-transform">
                      chevron_right
                    </span>
                    <div 
                      className="w-8 h-8 rounded flex-shrink-0"
                      style={{ 
                        background: slide.backgroundImage 
                          ? `url(${slide.backgroundImage}) center/cover` 
                          : slide.backgroundColor || '#27491F'
                      }}
                    />
                    <span className="text-xs text-gray-700 truncate flex-1">
                      {slide.title || `Slide ${index + 1}`}
                    </span>
                    {slides.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeSlide(index);
                        }}
                        className="p-1 hover:bg-red-100 rounded transition-colors"
                      >
                        <span className="material-icons text-sm text-red-500">close</span>
                      </button>
                    )}
                  </summary>
                  
                  <div className="p-3 space-y-3 bg-white">
                    <TextInput
                      label="Title"
                      value={slide.title || ''}
                      onChange={(val) => updateSlide(index, 'title', val)}
                    />
                    <TextInput
                      label="Subtitle"
                      value={slide.subtitle || ''}
                      onChange={(val) => updateSlide(index, 'subtitle', val)}
                    />
                    <TextInput
                      label="Button Text"
                      value={slide.buttonText || ''}
                      onChange={(val) => updateSlide(index, 'buttonText', val)}
                    />
                    {!slide.buttonText && (
                      <p className="text-[10px] text-orange-500">Button hidden when empty</p>
                    )}
                    
                    <SelectInput
                      label="Link To"
                      value={slide.buttonLinkType || 'custom'}
                      options={[
                        { value: 'custom', label: 'Custom URL' },
                        { value: 'collection', label: 'Collection' },
                        { value: 'products', label: 'All Products' },
                      ]}
                      onChange={(val) => {
                        // Update multiple fields at once to avoid race condition
                        const newSlides = [...slides];
                        newSlides[index] = { 
                          ...newSlides[index], 
                          buttonLinkType: val,
                          buttonLink: val === 'products' ? '/products' : (val === 'collection' ? '' : newSlides[index].buttonLink)
                        };
                        updateData('slides', newSlides);
                      }}
                    />
                    
                    {(slide.buttonLinkType === 'custom' || !slide.buttonLinkType) && (
                      <TextInput
                        label="URL"
                        value={slide.buttonLink || ''}
                        onChange={(val) => updateSlide(index, 'buttonLink', val)}
                        placeholder="/products"
                      />
                    )}
                    
                    {slide.buttonLinkType === 'collection' && (
                      <SelectInput
                        label="Collection"
                        value={slide.buttonCollectionId || ''}
                        options={[
                          { value: '', label: '-- Select --' },
                          ...collections.map(c => ({ value: c.id, label: c.name }))
                        ]}
                        onChange={(val) => {
                          const col = collections.find(c => c.id === val);
                          // Update all fields at once to avoid race condition
                          const newSlides = [...slides];
                          newSlides[index] = {
                            ...newSlides[index],
                            buttonCollectionId: val,
                            buttonCollectionName: col?.name || '',
                            buttonLink: val ? `/products?collection=${val}` : ''
                          };
                          updateData('slides', newSlides);
                        }}
                      />
                    )}
                    
                    <div className="pt-2 border-t border-gray-100">
                      <label className="text-[10px] text-gray-500 block mb-1">Background</label>
                      <ImageUploader
                        value={slide.backgroundImage || ''}
                        onChange={(url) => updateSlide(index, 'backgroundImage', url)}
                        placeholder="Upload image"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <ColorPicker
                        label="BG Color"
                        value={slide.backgroundColor || '#27491F'}
                        onChange={(val) => updateSlide(index, 'backgroundColor', val)}
                      />
                      <ColorPicker
                        label="Text"
                        value={slide.textColor || '#ffffff'}
                        onChange={(val) => updateSlide(index, 'textColor', val)}
                      />
                    </div>
                  </div>
                </details>
              ))}
            </div>

            {/* Quick Add Button */}
            <button
              type="button"
              onClick={addSlide}
              className="w-full mt-2 py-2 border-2 border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
            >
              <span className="material-icons text-sm">add</span>
              Add Another Slide
            </button>
          </>
        )}
      </EditorSection>
    );
  };

  const renderHeroBackgroundEditor = () => (
    <>
      <EditorSection title="Background" icon="image">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-600 block mb-2">Background Image</label>
            <ImageUploader
              value={data.backgroundImage || ''}
              onChange={(url) => updateData('backgroundImage', url)}
              placeholder="Upload hero background"
            />
          </div>
          {data.backgroundImage && (
            <>
              <SelectInput
                label="Image Fit"
                value={data.backgroundSize || 'cover'}
                onChange={(val) => updateData('backgroundSize', val)}
                options={[
                  { value: 'cover', label: 'Cover - Fill & Crop' },
                  { value: 'contain', label: 'Contain - Fit Inside' },
                  { value: 'auto', label: 'Auto - Original Size' },
                  { value: '100% 100%', label: 'Stretch - Fill Exactly' },
                ]}
              />
              <SelectInput
                label="Image Position"
                value={data.backgroundPosition || 'center'}
                onChange={(val) => updateData('backgroundPosition', val)}
                options={[
                  { value: 'center', label: 'Center' },
                  { value: 'top', label: 'Top' },
                  { value: 'bottom', label: 'Bottom' },
                  { value: 'left', label: 'Left' },
                  { value: 'right', label: 'Right' },
                  { value: 'top left', label: 'Top Left' },
                  { value: 'top right', label: 'Top Right' },
                  { value: 'bottom left', label: 'Bottom Left' },
                  { value: 'bottom right', label: 'Bottom Right' },
                ]}
              />
            </>
          )}
          <ColorPicker
            label="Background Color / Overlay"
            value={data.backgroundColor || '#27491F'}
            onChange={(val) => updateData('backgroundColor', val)}
          />
          <p className="text-[10px] text-gray-400">
            {data.backgroundImage 
              ? 'Color will be used as an overlay on the image'
              : 'Solid color or gradient background'}
          </p>
        </div>
      </EditorSection>

      <EditorSection title="Quick Gradients" icon="gradient" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'Forest', value: 'linear-gradient(135deg, #27491F 0%, #3d6b2f 100%)' },
            { name: 'Sunset', value: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)' },
            { name: 'Ocean', value: 'linear-gradient(135deg, #0891b2 0%, #6366f1 100%)' },
            { name: 'Dark', value: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)' },
            { name: 'Purple', value: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)' },
            { name: 'Gold', value: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)' },
          ].map((gradient) => (
            <button
              key={gradient.name}
              type="button"
              onClick={() => updateData('backgroundColor', gradient.value)}
              className="p-2 rounded-lg border border-gray-200 hover:border-primary transition-colors text-left"
            >
              <div 
                className="w-full h-8 rounded-md mb-1"
                style={{ background: gradient.value }}
              />
              <span className="text-[10px] text-gray-600">{gradient.name}</span>
            </button>
          ))}
        </div>
      </EditorSection>

      <EditorSection title="Button" icon="smart_button" defaultOpen={false}>
        <TextInput
          label="Button Text"
          value={data.buttonText || 'Shop Now'}
          onChange={(val) => updateData('buttonText', val)}
          placeholder="Shop Now"
        />
        {!data.buttonText && (
          <p className="text-[10px] text-orange-500 mt-1">
            ⚠️ Button is hidden when text is empty
          </p>
        )}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <SelectInput
            label="Link Type"
            value={data.buttonLinkType || 'custom'}
            options={[
              { value: 'custom', label: 'Custom URL' },
              { value: 'collection', label: 'Collection Page' },
              { value: 'products', label: 'All Products' },
            ]}
            onChange={(val) => {
              // Update both at once to avoid race condition
              const updates: any = { buttonLinkType: val };
              if (val === 'products') {
                updates.buttonLink = '/products';
              } else if (val === 'collection') {
                updates.buttonLink = '';
              }
              onUpdateSection({
                ...section,
                data: { ...data, ...updates }
              });
            }}
          />
          
          {(data.buttonLinkType || 'custom') === 'custom' && (
            <TextInput
              label="URL"
              value={data.buttonLink || ''}
              onChange={(val) => updateData('buttonLink', val)}
              placeholder="/products or https://..."
            />
          )}
          
          {data.buttonLinkType === 'collection' && (
            <div className="mt-2">
              {loadingCollections ? (
                <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                  <span className="material-icons animate-spin text-sm">progress_activity</span>
                  Loading collections...
                </div>
              ) : collections.length === 0 ? (
                <div className="text-xs text-orange-500 py-2 p-3 bg-orange-50 rounded-lg">
                  <span className="material-icons text-sm mr-1 align-middle">warning</span>
                  No collections found. Create collections in the Collections page first.
                </div>
              ) : (
                <>
                  <SelectInput
                    label={`Select Collection (${collections.length} available)`}
                    value={data.buttonCollectionId || ''}
                    options={[
                      { value: '', label: '-- Choose a Collection --' },
                      ...collections.map(c => ({ value: c.id, label: c.name }))
                    ]}
                    onChange={(val) => {
                      const col = collections.find(c => c.id === val);
                      // Update all fields at once to avoid race condition
                      onUpdateSection({
                        ...section,
                        data: {
                          ...data,
                          buttonCollectionId: val,
                          buttonCollectionName: col?.name || '',
                          buttonLink: val ? `/products?collection=${val}` : ''
                        }
                      });
                    }}
                  />
                  {data.buttonCollectionId && (
                    <p className="text-[10px] text-green-600 mt-1">
                      ✓ Links to: {data.buttonCollectionName || 'Collection'}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100">
          <ColorPicker
            label="Background"
            value={data.textStyle?.buttonStyle?.backgroundColor || '#ffffff'}
            onChange={(val) => {
              const textStyle = data.textStyle || {};
              const buttonStyle = textStyle.buttonStyle || {};
              updateData('textStyle', { ...textStyle, buttonStyle: { ...buttonStyle, backgroundColor: val } });
            }}
          />
          <ColorPicker
            label="Text Color"
            value={data.textStyle?.buttonStyle?.textColor || '#27491F'}
            onChange={(val) => {
              const textStyle = data.textStyle || {};
              const buttonStyle = textStyle.buttonStyle || {};
              updateData('textStyle', { ...textStyle, buttonStyle: { ...buttonStyle, textColor: val } });
            }}
          />
          <NumberInput
            label="Border Radius"
            value={data.textStyle?.buttonStyle?.borderRadius || 8}
            onChange={(val) => {
              const textStyle = data.textStyle || {};
              const buttonStyle = textStyle.buttonStyle || {};
              updateData('textStyle', { ...textStyle, buttonStyle: { ...buttonStyle, borderRadius: val } });
            }}
            max={50}
            suffix="px"
          />
          <SelectInput
            label="Style"
            value={data.textStyle?.buttonStyle?.variant || 'filled'}
            options={[
              { value: 'filled', label: 'Filled' },
              { value: 'outlined', label: 'Outlined' },
              { value: 'ghost', label: 'Ghost (Text Only)' },
            ]}
            onChange={(val) => {
              const textStyle = data.textStyle || {};
              const buttonStyle = textStyle.buttonStyle || {};
              updateData('textStyle', { ...textStyle, buttonStyle: { ...buttonStyle, variant: val } });
            }}
          />
        </div>
      </EditorSection>

      {renderHeroCarouselToggle()}
    </>
  );

  const renderHeroTitleEditor = () => (
    <>
      <EditorSection title="Title Text" icon="title">
        <TextArea
          label="Title"
          value={data.title || ''}
          onChange={(val) => updateData('title', val)}
          rows={2}
          placeholder="Welcome to Our Store"
        />
      </EditorSection>

      <EditorSection title="Title Style" icon="text_fields">
        <ColorPicker
          label="Text Color"
          value={data.textColor || '#ffffff'}
          onChange={(val) => updateData('textColor', val)}
        />
        <NumberInput
          label="Font Size"
          value={data.textStyle?.titleFontSize || 48}
          onChange={(val) => {
            const textStyle = data.textStyle || {};
            updateData('textStyle', { ...textStyle, titleFontSize: val });
          }}
          min={16}
          max={96}
          suffix="px"
        />
        <SelectInput
          label="Font Weight"
          value={data.textStyle?.titleFontWeight || 'bold'}
          options={[
            { value: 'normal', label: 'Normal' },
            { value: '500', label: 'Medium' },
            { value: '600', label: 'Semi Bold' },
            { value: 'bold', label: 'Bold' },
            { value: '800', label: 'Extra Bold' },
          ]}
          onChange={(val) => {
            const textStyle = data.textStyle || {};
            updateData('textStyle', { ...textStyle, titleFontWeight: val });
          }}
        />
        <SelectInput
          label="Alignment"
          value={data.textStyle?.titleAlignment || 'center'}
          options={[
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' },
          ]}
          onChange={(val) => {
            const textStyle = data.textStyle || {};
            updateData('textStyle', { ...textStyle, titleAlignment: val });
          }}
        />
      </EditorSection>

      {renderHeroCarouselToggle()}
    </>
  );

  const renderHeroSubtitleEditor = () => (
    <>
      <EditorSection title="Subtitle Text" icon="text_fields">
        <TextArea
          label="Subtitle"
          value={data.subtitle || ''}
          onChange={(val) => updateData('subtitle', val)}
          rows={2}
          placeholder="Discover amazing products"
        />
      </EditorSection>

      <EditorSection title="Subtitle Style" icon="format_size">
        <NumberInput
          label="Font Size"
          value={data.textStyle?.subtitleFontSize || 18}
          onChange={(val) => {
            const textStyle = data.textStyle || {};
            updateData('textStyle', { ...textStyle, subtitleFontSize: val });
          }}
          min={12}
          max={48}
          suffix="px"
        />
        <SelectInput
          label="Font Weight"
          value={data.textStyle?.subtitleFontWeight || 'normal'}
          options={[
            { value: 'normal', label: 'Normal' },
            { value: '500', label: 'Medium' },
            { value: '600', label: 'Semi Bold' },
            { value: 'bold', label: 'Bold' },
          ]}
          onChange={(val) => {
            const textStyle = data.textStyle || {};
            updateData('textStyle', { ...textStyle, subtitleFontWeight: val });
          }}
        />
        <SelectInput
          label="Alignment"
          value={data.textStyle?.subtitleAlignment || 'center'}
          options={[
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' },
          ]}
          onChange={(val) => {
            const textStyle = data.textStyle || {};
            updateData('textStyle', { ...textStyle, subtitleAlignment: val });
          }}
        />
      </EditorSection>

      {renderHeroCarouselToggle()}
    </>
  );

  const renderHeroButtonEditor = () => {
    const buttonStyle = data.textStyle?.buttonStyle || {};
    const buttonLinkType = data.buttonLinkType || 'custom';
    
    return (
      <>
        <EditorSection title="Button Content" icon="smart_button">
          <TextInput
            label="Button Text"
            value={data.buttonText || 'Shop Now'}
            onChange={(val) => updateData('buttonText', val)}
            placeholder="Shop Now"
          />
          {!data.buttonText && (
            <p className="text-[10px] text-orange-500 mt-1">
              ⚠️ Button is hidden when text is empty
            </p>
          )}
        </EditorSection>

        <EditorSection title="Button Link" icon="link">
          <SelectInput
            label="Link Type"
            value={buttonLinkType}
            options={[
              { value: 'custom', label: 'Custom URL' },
              { value: 'collection', label: 'Collection Page' },
              { value: 'products', label: 'All Products' },
            ]}
            onChange={(val) => {
              // Update both at once to avoid race condition
              const updates: any = { buttonLinkType: val };
              if (val === 'products') {
                updates.buttonLink = '/products';
              } else if (val === 'collection') {
                updates.buttonLink = '';
              }
              onUpdateSection({
                ...section,
                data: { ...data, ...updates }
              });
            }}
          />
          
          {buttonLinkType === 'custom' && (
            <TextInput
              label="URL"
              value={data.buttonLink || ''}
              onChange={(val) => updateData('buttonLink', val)}
              placeholder="/products or https://..."
            />
          )}
          
          {buttonLinkType === 'collection' && (
            <>
              <SelectInput
                label="Select Collection"
                value={data.buttonCollectionId || ''}
                options={[
                  { value: '', label: '-- Select Collection --' },
                  ...collections.map(c => ({ value: c.id, label: c.name }))
                ]}
                onChange={(val) => {
                  const col = collections.find(c => c.id === val);
                  // Update all fields at once to avoid race condition
                  onUpdateSection({
                    ...section,
                    data: {
                      ...data,
                      buttonCollectionId: val,
                      buttonCollectionName: col?.name || '',
                      buttonLink: val ? `/products?collection=${val}` : ''
                    }
                  });
                }}
              />
              {data.buttonCollectionId && (
                <p className="text-[10px] text-green-600 mt-1">
                  ✓ Links to: {data.buttonCollectionName || 'Collection'}
                </p>
              )}
            </>
          )}
          
          {buttonLinkType === 'products' && (
            <p className="text-[10px] text-gray-500 mt-1">
              Links to the main products page
            </p>
          )}
        </EditorSection>

        <EditorSection title="Button Style" icon="palette">
          <p className="text-xs text-gray-500 mb-2 font-medium">Normal State</p>
          <ColorPicker
            label="Background Color"
            value={buttonStyle.backgroundColor || '#ffffff'}
            onChange={(val) => {
              const textStyle = data.textStyle || {};
              const newButtonStyle = { ...buttonStyle, backgroundColor: val };
              updateData('textStyle', { ...textStyle, buttonStyle: newButtonStyle });
            }}
          />
          <ColorPicker
            label="Text Color"
            value={buttonStyle.textColor || '#27491F'}
            onChange={(val) => {
              const textStyle = data.textStyle || {};
              const newButtonStyle = { ...buttonStyle, textColor: val };
              updateData('textStyle', { ...textStyle, buttonStyle: newButtonStyle });
            }}
          />
          <NumberInput
            label="Border Radius"
            value={buttonStyle.borderRadius || 8}
            onChange={(val) => {
              const textStyle = data.textStyle || {};
              const newButtonStyle = { ...buttonStyle, borderRadius: val };
              updateData('textStyle', { ...textStyle, buttonStyle: newButtonStyle });
            }}
            min={0}
            max={50}
            suffix="px"
          />
          <NumberInput
            label="Font Size"
            value={buttonStyle.fontSize || 16}
            onChange={(val) => {
              const textStyle = data.textStyle || {};
              const newButtonStyle = { ...buttonStyle, fontSize: val };
              updateData('textStyle', { ...textStyle, buttonStyle: newButtonStyle });
            }}
            min={12}
            max={24}
            suffix="px"
          />
          
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2 font-medium">Hover Effect</p>
            <SelectInput
              label="Hover Style"
              value={buttonStyle.hoverEffect || 'fill'}
              options={[
                { value: 'none', label: 'None (Color Change)' },
                { value: 'fill', label: 'Fill (Left to Right)' },
                { value: 'scale', label: 'Scale Up' },
                { value: 'glow', label: 'Glow Effect' },
              ]}
              onChange={(val) => {
                const textStyle = data.textStyle || {};
                const newButtonStyle = { ...buttonStyle, hoverEffect: val };
                updateData('textStyle', { ...textStyle, buttonStyle: newButtonStyle });
              }}
            />
            <ColorPicker
              label="Hover Background"
              value={buttonStyle.hoverBackgroundColor || buttonStyle.textColor || '#ffffff'}
              onChange={(val) => {
                const textStyle = data.textStyle || {};
                const newButtonStyle = { ...buttonStyle, hoverBackgroundColor: val };
                updateData('textStyle', { ...textStyle, buttonStyle: newButtonStyle });
              }}
            />
            <ColorPicker
              label="Hover Text Color"
              value={buttonStyle.hoverTextColor || '#1f2937'}
              onChange={(val) => {
                const textStyle = data.textStyle || {};
                const newButtonStyle = { ...buttonStyle, hoverTextColor: val };
                updateData('textStyle', { ...textStyle, buttonStyle: newButtonStyle });
              }}
            />
          </div>
        </EditorSection>

        <EditorSection title="Button Preview" icon="visibility" defaultOpen={false}>
          <div className="p-4 bg-gray-100 rounded-lg flex justify-center">
            <span
              className="inline-block shadow-lg"
              style={{
                backgroundColor: buttonStyle.backgroundColor || '#ffffff',
                color: buttonStyle.textColor || '#27491F',
                borderRadius: buttonStyle.borderRadius ? `${buttonStyle.borderRadius}px` : '0.5rem',
                fontSize: buttonStyle.fontSize ? `${buttonStyle.fontSize}px` : '16px',
                fontWeight: buttonStyle.fontWeight || '600',
                padding: buttonStyle.padding || '0.75rem 1.5rem',
              }}
            >
              {data.buttonText || 'Shop Now'}
            </span>
          </div>
          {data.buttonLink && (
            <p className="text-[10px] text-gray-400 text-center mt-2">
              → {data.buttonLink}
            </p>
          )}
        </EditorSection>

        {renderHeroCarouselToggle()}
      </>
    );
  };

  const renderHeroNavigationEditor = () => (
    <>
      <EditorSection title="Carousel Navigation" icon="swap_horiz">
        <p className="text-xs text-gray-600 mb-3">
          These arrows appear when carousel mode is enabled with multiple slides.
        </p>
        
        <div className="p-3 bg-gray-50 rounded-lg mb-3">
          <div className="flex items-center justify-center gap-4">
            <div className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-200">
              <span className="material-icons text-primary">chevron_left</span>
            </div>
            <span className="text-xs text-gray-500">Navigation Preview</span>
            <div className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-200">
              <span className="material-icons text-primary">chevron_right</span>
            </div>
          </div>
        </div>

        <ToggleSwitch
          label="Show Navigation Arrows"
          value={data.showNavigation !== false}
          onChange={(val) => updateData('showNavigation', val)}
        />
      </EditorSection>

      <EditorSection title="Autoplay Settings" icon="play_circle">
        <ToggleSwitch
          label="Autoplay"
          value={data.autoplay || false}
          onChange={(val) => updateData('autoplay', val)}
        />
        {data.autoplay && (
          <NumberInput
            label="Interval"
            value={(data.autoplayInterval || 5000) / 1000}
            onChange={(val) => updateData('autoplayInterval', val * 1000)}
            min={2}
            max={15}
            suffix="s"
          />
        )}
      </EditorSection>

      <EditorSection title="Indicators" icon="more_horiz">
        <ToggleSwitch
          label="Show Dot Indicators"
          value={data.showIndicators !== false}
          onChange={(val) => updateData('showIndicators', val)}
        />
        <p className="text-[10px] text-gray-400 mt-1">
          Dots at the bottom showing current slide position
        </p>
      </EditorSection>

      {renderHeroCarouselToggle()}
    </>
  );

  const renderHeroFullEditor = () => {
    const slides = data.slides || [];
    const isCarousel = data.isCarousel || false;

    const addSlide = () => {
      const newSlide = {
        title: 'New Slide Title',
        subtitle: 'New slide description',
        buttonText: 'Shop Now',
        buttonLink: '#',
        backgroundColor: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
        textColor: '#ffffff'
      };
      updateData('slides', [...slides, newSlide]);
      if (!isCarousel) {
        updateData('isCarousel', true);
      }
    };

    const updateSlide = (index: number, field: string, value: any) => {
      const newSlides = [...slides];
      newSlides[index] = { ...newSlides[index], [field]: value };
      updateData('slides', newSlides);
    };

    const removeSlide = (index: number) => {
      const newSlides = slides.filter((_: any, i: number) => i !== index);
      updateData('slides', newSlides);
      if (newSlides.length <= 1) {
        updateData('isCarousel', false);
      }
    };

    const duplicateSlide = (index: number) => {
      const newSlides = [...slides];
      newSlides.splice(index + 1, 0, { ...slides[index] });
      updateData('slides', newSlides);
    };

    const currentLayout = data.layout || 'default';
    
    return (
      <>
        {/* Layout Style Selector */}
        <EditorSection title="Hero Style" icon="style">
          <SelectInput
            label="Layout"
            value={currentLayout}
            onChange={(val) => updateData('layout', val)}
            options={[
              { value: 'default', label: 'Default - Title, Subtitle & Button' },
              { value: 'minimal', label: 'Minimal - Full Image & Button Only' }
            ]}
          />
          <p className="text-xs text-gray-500 mt-2">
            {currentLayout === 'minimal' 
              ? 'Full-screen image with a centered outlined button. Perfect for showcasing product imagery.'
              : 'Classic hero with title, subtitle, and call-to-action button.'}
          </p>
        </EditorSection>

        {/* Carousel Toggle */}
        <EditorSection title="Carousel Mode" icon="view_carousel">
          <ToggleSwitch
            label="Enable Carousel"
            value={isCarousel}
            onChange={(val) => {
              updateData('isCarousel', val);
              if (val && slides.length === 0) {
                // Initialize with first slide from current data
                updateData('slides', [{
                  title: data.title || 'Welcome to Our Store',
                  subtitle: data.subtitle || 'Discover amazing products',
                  buttonText: currentLayout === 'minimal' ? 'Explore Collection' : (data.buttonText || 'Shop Now'),
                  buttonLink: data.buttonLink || '#',
                  backgroundImage: data.backgroundImage || '',
                  backgroundColor: data.backgroundColor || 'linear-gradient(135deg, #27491F 0%, #3d6b2f 100%)',
                  textColor: data.textColor || '#ffffff'
                }]);
              }
            }}
          />
          {isCarousel && (
            <>
              <ToggleSwitch
                label="Autoplay"
                value={data.autoplay || false}
                onChange={(val) => updateData('autoplay', val)}
              />
              {data.autoplay && (
                <NumberInput
                  label="Interval"
                  value={(data.autoplayInterval || 5000) / 1000}
                  onChange={(val) => updateData('autoplayInterval', val * 1000)}
                  min={2}
                  max={15}
                  suffix="s"
                />
              )}
            </>
          )}
        </EditorSection>

        {/* Single Hero Content (when not carousel) */}
        {!isCarousel && (
          <>
            <EditorSection title="Hero Content" icon="edit">
              <TextArea
                label="Title"
                value={data.title || ''}
                onChange={(val) => updateData('title', val)}
                rows={2}
                placeholder="Welcome to Our Store"
              />
              <TextArea
                label="Subtitle"
                value={data.subtitle || ''}
                onChange={(val) => updateData('subtitle', val)}
                rows={2}
                placeholder="Discover amazing products"
              />
              <TextInput
                label="Button Text"
                value={data.buttonText || 'Shop Now'}
                onChange={(val) => updateData('buttonText', val)}
              />
              <TextInput
                label="Button Link"
                value={data.buttonLink || '#'}
                onChange={(val) => updateData('buttonLink', val)}
                placeholder="/products"
              />
            </EditorSection>

            <EditorSection title="Background" icon="image">
              <ImageUploader
                value={data.backgroundImage || ''}
                onChange={(url) => updateData('backgroundImage', url)}
                placeholder="Upload hero background"
              />
              <ColorPicker
                label="Background Color"
                value={data.backgroundColor || '#27491F'}
                onChange={(val) => updateData('backgroundColor', val)}
              />
            </EditorSection>

            <EditorSection title="Text Color" icon="palette">
              <ColorPicker
                label="Text Color"
                value={data.textColor || '#ffffff'}
                onChange={(val) => updateData('textColor', val)}
              />
            </EditorSection>
          </>
        )}

        {/* Carousel Slides */}
        {isCarousel && (
          <>
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">
                {slides.length} Slide{slides.length !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={addSlide}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
              >
                <span className="material-icons text-sm">add</span>
                Add Slide
              </button>
            </div>

            {slides.map((slide: any, index: number) => (
              <EditorSection 
                key={index} 
                title={`Slide ${index + 1}`} 
                icon="image"
                defaultOpen={index === 0}
              >
                {/* Slide Preview */}
                <div 
                  className="w-full h-20 rounded-lg mb-3 flex items-center justify-center text-white text-xs font-medium relative overflow-hidden"
                  style={{ 
                    background: slide.backgroundImage 
                      ? `url(${slide.backgroundImage}) center/cover` 
                      : slide.backgroundColor || '#27491F'
                  }}
                >
                  {slide.backgroundImage && (
                    <div className="absolute inset-0 bg-black/30" />
                  )}
                  <span className="relative z-10 text-center px-2 truncate">
                    {slide.title || 'Slide Title'}
                  </span>
                </div>

                {/* Slide Content */}
                <TextArea
                  label="Title"
                  value={slide.title || ''}
                  onChange={(val) => updateSlide(index, 'title', val)}
                  rows={2}
                />
                <TextArea
                  label="Subtitle"
                  value={slide.subtitle || ''}
                  onChange={(val) => updateSlide(index, 'subtitle', val)}
                  rows={2}
                />
                <TextInput
                  label="Button Text"
                  value={slide.buttonText || ''}
                  onChange={(val) => updateSlide(index, 'buttonText', val)}
                />
                <TextInput
                  label="Button Link"
                  value={slide.buttonLink || ''}
                  onChange={(val) => updateSlide(index, 'buttonLink', val)}
                />

                {/* Slide Background */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <label className="text-xs text-gray-600 block mb-2">Background Image</label>
                  <ImageUploader
                    value={slide.backgroundImage || ''}
                    onChange={(url) => updateSlide(index, 'backgroundImage', url)}
                    placeholder="Upload slide background"
                  />
                </div>
                <ColorPicker
                  label="Background Color"
                  value={slide.backgroundColor || '#27491F'}
                  onChange={(val) => updateSlide(index, 'backgroundColor', val)}
                />
                <ColorPicker
                  label="Text Color"
                  value={slide.textColor || '#ffffff'}
                  onChange={(val) => updateSlide(index, 'textColor', val)}
                />

                {/* Slide Actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => duplicateSlide(index)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <span className="material-icons text-sm">content_copy</span>
                    Duplicate
                  </button>
                  {slides.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSlide(index)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                    >
                      <span className="material-icons text-sm">delete</span>
                      Remove
                    </button>
                  )}
                </div>
              </EditorSection>
            ))}

            {/* Quick Gradient Presets for Slides */}
            <EditorSection title="Quick Backgrounds" icon="gradient" defaultOpen={false}>
              <p className="text-[10px] text-gray-500 mb-2">Click to apply to all slides</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: 'Forest', value: 'linear-gradient(135deg, #27491F 0%, #3d6b2f 100%)' },
                  { name: 'Sunset', value: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)' },
                  { name: 'Ocean', value: 'linear-gradient(135deg, #0891b2 0%, #6366f1 100%)' },
                  { name: 'Dark', value: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)' },
                  { name: 'Purple', value: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)' },
                  { name: 'Gold', value: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)' },
                ].map((gradient) => (
                  <button
                    key={gradient.name}
                    type="button"
                    onClick={() => {
                      const newSlides = slides.map((s: any) => ({ ...s, backgroundColor: gradient.value }));
                      updateData('slides', newSlides);
                    }}
                    className="p-1.5 rounded-lg border border-gray-200 hover:border-primary transition-colors"
                  >
                    <div 
                      className="w-full h-6 rounded-md mb-1"
                      style={{ background: gradient.value }}
                    />
                    <span className="text-[9px] text-gray-600">{gradient.name}</span>
                  </button>
                ))}
              </div>
            </EditorSection>
          </>
        )}
      </>
    );
  };

  // Products Section Editors
  const renderProductsTitleEditor = () => {
    const titleStyle = data.titleStyle || {};
    const subtitleStyle = data.subtitleStyle || {};
    
    return (
      <>
        <EditorSection title="Section Title" icon="title" defaultOpen={true}>
          <TextInput
            label="Title"
            value={data.title || 'Featured Products'}
            onChange={(val) => updateData('title', val)}
            placeholder="Featured Products"
          />
          <ColorPicker
            label="Title Color"
            value={titleStyle.color || '#1f2937'}
            onChange={(val) => updateNestedData('titleStyle.color', val)}
          />
          <SelectInput
            label="Title Size"
            value={titleStyle.fontSize || '2.5rem'}
            options={[
              { value: '1.5rem', label: 'Small' },
              { value: '2rem', label: 'Medium' },
              { value: '2.5rem', label: 'Large' },
              { value: '3rem', label: 'Extra Large' },
              { value: '3.5rem', label: 'Huge' },
            ]}
            onChange={(val) => updateNestedData('titleStyle.fontSize', val)}
          />
          <SelectInput
            label="Title Weight"
            value={titleStyle.fontWeight || '700'}
            options={[
              { value: '400', label: 'Normal' },
              { value: '500', label: 'Medium' },
              { value: '600', label: 'Semi Bold' },
              { value: '700', label: 'Bold' },
              { value: '800', label: 'Extra Bold' },
            ]}
            onChange={(val) => updateNestedData('titleStyle.fontWeight', val)}
          />
          <SelectInput
            label="Title Alignment"
            value={titleStyle.textAlign || 'center'}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Center' },
              { value: 'right', label: 'Right' },
            ]}
            onChange={(val) => updateNestedData('titleStyle.textAlign', val)}
          />
        </EditorSection>

        <EditorSection title="Subtitle" icon="short_text" defaultOpen={false}>
          <TextInput
            label="Subtitle"
            value={data.subtitle || ''}
            onChange={(val) => updateData('subtitle', val)}
            placeholder="Check out our best sellers"
          />
          {!data.subtitle && (
            <p className="text-[10px] text-gray-400 mt-1">
              Leave empty to hide subtitle
            </p>
          )}
          {data.subtitle && (
            <>
              <ColorPicker
                label="Subtitle Color"
                value={subtitleStyle.color || '#6b7280'}
                onChange={(val) => updateNestedData('subtitleStyle.color', val)}
              />
              <SelectInput
                label="Subtitle Size"
                value={subtitleStyle.fontSize || '1rem'}
                options={[
                  { value: '0.875rem', label: 'Small' },
                  { value: '1rem', label: 'Medium' },
                  { value: '1.125rem', label: 'Large' },
                  { value: '1.25rem', label: 'Extra Large' },
                ]}
                onChange={(val) => updateNestedData('subtitleStyle.fontSize', val)}
              />
            </>
          )}
        </EditorSection>
      </>
    );
  };

  const renderProductsLayoutEditor = () => (
    <>
      <EditorSection title="Layout" icon="grid_view">
        <SelectInput
          label="Display Style"
          value={data.layout || 'grid'}
          options={[
            { value: 'grid', label: 'Grid' },
            { value: 'carousel', label: 'Carousel' },
            { value: 'list', label: 'List' },
          ]}
          onChange={(val) => updateData('layout', val)}
        />
        {(data.layout === 'grid' || !data.layout) && (
          <SelectInput
            label="Columns"
            value={String(data.columns || 4)}
            options={[
              { value: '2', label: '2 Columns' },
              { value: '3', label: '3 Columns' },
              { value: '4', label: '4 Columns' },
            ]}
            onChange={(val) => updateData('columns', parseInt(val))}
          />
        )}
      </EditorSection>

      <EditorSection title="Display Options" icon="visibility">
        <ToggleSwitch
          label="Show Price"
          value={data.showPrice !== false}
          onChange={(val) => updateData('showPrice', val)}
        />
        <ToggleSwitch
          label="Show Add to Cart Button"
          value={data.showAddToCart !== false}
          onChange={(val) => updateData('showAddToCart', val)}
        />
      </EditorSection>
    </>
  );

  const renderProductsCardStyleEditor = () => {
    const cs = data.cardStyle || {};
    return (
      <>
        <EditorSection title="Card Style" icon="dashboard">
          <ColorPicker
            label="Card Background"
            value={cs.backgroundColor || '#ffffff'}
            onChange={(val) => updateNestedData('cardStyle.backgroundColor', val)}
          />
          <ColorPicker
            label="Text Color"
            value={cs.textColor || '#1f2937'}
            onChange={(val) => updateNestedData('cardStyle.textColor', val)}
          />
          <ColorPicker
            label="Price Color"
            value={cs.priceColor || '#6b7280'}
            onChange={(val) => updateNestedData('cardStyle.priceColor', val)}
          />
          <NumberInput
            label="Border Radius"
            value={cs.borderRadius || 12}
            onChange={(val) => updateNestedData('cardStyle.borderRadius', val)}
            min={0}
            max={30}
            suffix="px"
          />
          <SelectInput
            label="Shadow"
            value={cs.shadow || 'md'}
            options={[
              { value: 'none', label: 'None' },
              { value: 'sm', label: 'Small' },
              { value: 'md', label: 'Medium' },
              { value: 'lg', label: 'Large' },
              { value: 'xl', label: 'Extra Large' },
            ]}
            onChange={(val) => updateNestedData('cardStyle.shadow', val)}
          />
        </EditorSection>

        <EditorSection title="Image Style" icon="image">
          <SelectInput
            label="Aspect Ratio"
            value={cs.imageAspect || 'square'}
            options={[
              { value: 'square', label: 'Square (1:1)' },
              { value: 'portrait', label: 'Portrait (3:4)' },
              { value: 'landscape', label: 'Landscape (4:3)' },
            ]}
            onChange={(val) => updateNestedData('cardStyle.imageAspect', val)}
          />
          <SelectInput
            label="Image Fit"
            value={cs.imageFit || 'contain'}
            options={[
              { value: 'contain', label: 'Contain (fit inside)' },
              { value: 'cover', label: 'Cover (fill & crop)' },
              { value: 'fill', label: 'Fill (stretch)' },
              { value: 'none', label: 'None (original size)' },
            ]}
            onChange={(val) => updateNestedData('cardStyle.imageFit', val)}
          />
          <ColorPicker
            label="Image Background"
            value={cs.imageBackgroundColor || '#f3f4f6'}
            onChange={(val) => updateNestedData('cardStyle.imageBackgroundColor', val)}
          />
        </EditorSection>

        <EditorSection title="Button Style" icon="smart_button">
          <p className="text-xs text-gray-500 mb-2 font-medium">Normal State</p>
          <ToggleSwitch
            label="Full Width Button"
            value={cs.buttonFullWidth !== false}
            onChange={(val) => updateNestedData('cardStyle.buttonFullWidth', val)}
          />
          <ColorPicker
            label="Button Background"
            value={cs.buttonBackgroundColor || '#27491F'}
            onChange={(val) => updateNestedData('cardStyle.buttonBackgroundColor', val)}
          />
          <ColorPicker
            label="Button Text"
            value={cs.buttonTextColor || '#ffffff'}
            onChange={(val) => updateNestedData('cardStyle.buttonTextColor', val)}
          />
          <NumberInput
            label="Button Radius"
            value={cs.buttonBorderRadius || 8}
            onChange={(val) => updateNestedData('cardStyle.buttonBorderRadius', val)}
            min={0}
            max={25}
            suffix="px"
          />
          
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2 font-medium">Hover Effect</p>
            <SelectInput
              label="Hover Style"
              value={cs.buttonHoverEffect || 'fill'}
              options={[
                { value: 'none', label: 'None (Opacity)' },
                { value: 'fill', label: 'Fill (Left to Right)' },
                { value: 'scale', label: 'Scale Up' },
                { value: 'glow', label: 'Glow Effect' },
              ]}
              onChange={(val) => updateNestedData('cardStyle.buttonHoverEffect', val)}
            />
            <ColorPicker
              label="Hover Background"
              value={cs.buttonHoverBackgroundColor || cs.buttonTextColor || '#ffffff'}
              onChange={(val) => updateNestedData('cardStyle.buttonHoverBackgroundColor', val)}
            />
            <ColorPicker
              label="Hover Text Color"
              value={cs.buttonHoverTextColor || cs.buttonBackgroundColor || '#27491F'}
              onChange={(val) => updateNestedData('cardStyle.buttonHoverTextColor', val)}
            />
          </div>
        </EditorSection>

        <EditorSection title="Border" icon="border_style" defaultOpen={false}>
          <ToggleSwitch
            label="Show Border"
            value={cs.showBorder !== false}
            onChange={(val) => updateNestedData('cardStyle.showBorder', val)}
          />
          {cs.showBorder !== false && (
            <ColorPicker
              label="Border Color"
              value={cs.borderColor || '#e5e7eb'}
              onChange={(val) => updateNestedData('cardStyle.borderColor', val)}
            />
          )}
        </EditorSection>
      </>
    );
  };

  const renderProductsSelectionEditor = () => {
    const selectedProducts = data.selectedProducts || [];

    // Filter products based on search and already selected
    const filteredProducts = availableProducts.filter((product: any) => {
      const isNotSelected = !selectedProducts.some((p: any) => p.id === product.id);
      const matchesSearch = !productSearchQuery || 
        product.name?.toLowerCase().includes(productSearchQuery.toLowerCase());
      return isNotSelected && matchesSearch;
    });

    const addProduct = (product: any) => {
      const newProduct = {
        id: product.id,
        name: product.name,
        price: product.price,
        sellingPrice: product.sellingPrice || product.price,
        image: product.images?.[0] || product.image || '',
        description: product.description || '',
        // Sale pricing fields
        onSale: product.onSale || false,
        salePrice: product.salePrice,
        compareAtPrice: product.compareAtPrice || product.sellingPrice || product.price
      };
      updateData('selectedProducts', [...selectedProducts, newProduct]);
    };

    return (
      <>
        <EditorSection title="Selected Products" icon="inventory_2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-600">
              {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
            </p>
            <button
              type="button"
              onClick={() => {
                setShowProductPicker(!showProductPicker);
                if (!showProductPicker && availableProducts.length === 0) {
                  fetchProducts();
                }
              }}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
            >
              <span className="material-icons text-sm">
                {showProductPicker ? 'close' : 'add'}
              </span>
              {showProductPicker ? 'Close' : 'Add Products'}
            </button>
          </div>

          {/* Product Picker */}
          {showProductPicker && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="relative mb-3">
                <span className="material-icons absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {loadingProducts ? (
                <div className="text-center py-4">
                  <span className="material-icons animate-spin text-gray-400">refresh</span>
                  <p className="text-xs text-gray-500 mt-1">Loading products...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-4">
                  <span className="material-icons text-2xl text-gray-300">inventory_2</span>
                  <p className="text-xs text-gray-500 mt-1">
                    {productSearchQuery ? 'No matching products' : 'No more products to add'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filteredProducts.slice(0, 20).map((product: any) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProduct(product)}
                      className="w-full flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition-all text-left"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                        {product.images?.[0] || product.image ? (
                          <img 
                            src={product.images?.[0] || product.image} 
                            alt={product.name} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <span className="material-icons text-gray-300 w-full h-full flex items-center justify-center text-sm">image</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{product.name}</p>
                        <p className="text-[10px] text-gray-500">${product.sellingPrice || product.price}</p>
                      </div>
                      <span className="material-icons text-primary text-lg">add_circle</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Selected Products List */}
          {selectedProducts.length === 0 ? (
            <div 
              className="text-center py-4 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
              onClick={() => {
                setShowProductPicker(true);
                if (availableProducts.length === 0) {
                  fetchProducts();
                }
              }}
            >
              <span className="material-icons text-3xl text-gray-300 mb-2 block">add_shopping_cart</span>
              <p className="text-xs text-gray-500">Click to add products</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedProducts.map((product: any, index: number) => (
                <div 
                  key={product.id || index}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                >
                  <div className="w-10 h-10 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-icons text-gray-400 w-full h-full flex items-center justify-center text-lg">image</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{product.name}</p>
                    <p className="text-[10px] text-gray-500">${product.sellingPrice || product.price}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newProducts = selectedProducts.filter((_: any, i: number) => i !== index);
                      updateData('selectedProducts', newProducts);
                    }}
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                  >
                    <span className="material-icons text-sm text-red-500">close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </EditorSection>

        {renderProductsLayoutEditor()}
        {renderProductsCardStyleEditor()}
      </>
    );
  };

  const renderProductsBackgroundEditor = () => (
    <EditorSection title="Section Background" icon="format_paint" defaultOpen={true}>
      <ColorPicker
        label="Background Color"
        value={style.backgroundColor || '#ffffff'}
        onChange={(val) => updateStyle('backgroundColor', val)}
      />
      <TextInput
        label="Background Image URL"
        value={style.backgroundImage || ''}
        onChange={(val) => updateStyle('backgroundImage', val)}
        placeholder="https://..."
      />
      {style.backgroundImage && (
        <>
          <SelectInput
            label="Background Size"
            value={style.backgroundSize || 'cover'}
            options={[
              { value: 'cover', label: 'Cover' },
              { value: 'contain', label: 'Contain' },
              { value: 'auto', label: 'Auto' },
            ]}
            onChange={(val) => updateStyle('backgroundSize', val)}
          />
          <SelectInput
            label="Background Position"
            value={style.backgroundPosition || 'center'}
            options={[
              { value: 'center', label: 'Center' },
              { value: 'top', label: 'Top' },
              { value: 'bottom', label: 'Bottom' },
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
            ]}
            onChange={(val) => updateStyle('backgroundPosition', val)}
          />
        </>
      )}
    </EditorSection>
  );

  const renderProductsFullEditor = () => (
    <>
      {renderProductsBackgroundEditor()}
      {renderProductsTitleEditor()}
      {renderProductsLayoutEditor()}
      {renderProductsCardStyleEditor()}
    </>
  );

  // ============================================================================
  // DEALS SECTION EDITORS
  // ============================================================================

  const renderDealsBackgroundEditor = () => (
    <EditorSection title="Section Background" icon="format_paint" defaultOpen={true}>
      <ColorPicker
        label="Background Color"
        value={style.backgroundColor || '#ffffff'}
        onChange={(val) => updateStyle('backgroundColor', val)}
      />
      <TextInput
        label="Background Image URL"
        value={style.backgroundImage || ''}
        onChange={(val) => updateStyle('backgroundImage', val)}
        placeholder="https://..."
      />
    </EditorSection>
  );

  const renderDealsTitleEditor = () => (
    <>
      <EditorSection title="Section Header" icon="title" defaultOpen={true}>
        <TextInput
          label="Title"
          value={data.title || 'DEAL OF THE DAY'}
          onChange={(val) => updateData('title', val)}
        />
        <TextInput
          label="Button Text"
          value={data.viewMoreText || ''}
          onChange={(val) => updateData('viewMoreText', val)}
          placeholder="Leave empty to hide button"
        />
        {data.viewMoreText && data.viewMoreText.trim() && (
          <TextInput
            label="Button Link"
            value={data.viewMoreLink || '#'}
            onChange={(val) => updateData('viewMoreLink', val)}
            placeholder="/products or https://..."
          />
        )}
        <p className="text-[10px] text-gray-400 mt-1">
          Clear button text to hide the button
        </p>
      </EditorSection>
      
      {/* Countdown Timer */}
      <EditorSection title="Countdown Timer" icon="timer" defaultOpen={false}>
        <ToggleSwitch
          label="Show Countdown"
          value={data.showCountdown || false}
          onChange={(val) => updateData('showCountdown', val)}
        />
        {data.showCountdown && (
          <>
            <div className="mt-3">
              <label className="block text-xs font-medium text-madas-text/70 mb-1">
                End Date & Time
              </label>
              <input
                type="datetime-local"
                value={data.countdownEndDate ? new Date(data.countdownEndDate).toISOString().slice(0, 16) : ''}
                onChange={(e) => updateData('countdownEndDate', new Date(e.target.value).toISOString())}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Set when the deal ends
              </p>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-100">
              <SelectInput
                label="Countdown Style"
                value={data.countdownStyle?.style || 'modern'}
                options={[
                  { value: 'modern', label: 'Modern (Default)' },
                  { value: 'minimal', label: 'Minimal' },
                  { value: 'boxed', label: 'Boxed' },
                  { value: 'urgent', label: 'Urgent (Animated)' }
                ]}
                onChange={(val) => updateNestedData('countdownStyle.style', val)}
              />
              <p className="text-xs text-gray-500 mb-2 mt-3 font-medium">Colors</p>
              <ColorPicker
                label="Background"
                value={data.countdownStyle?.backgroundColor || '#1f2937'}
                onChange={(val) => updateNestedData('countdownStyle.backgroundColor', val)}
              />
              <ColorPicker
                label="Numbers Color"
                value={data.countdownStyle?.textColor || '#ffffff'}
                onChange={(val) => updateNestedData('countdownStyle.textColor', val)}
              />
              <ColorPicker
                label="Labels Color"
                value={data.countdownStyle?.labelColor || '#9ca3af'}
                onChange={(val) => updateNestedData('countdownStyle.labelColor', val)}
              />
              <NumberInput
                label="Border Radius"
                value={data.countdownStyle?.borderRadius ?? 8}
                onChange={(val) => updateNestedData('countdownStyle.borderRadius', val)}
                min={0}
                max={24}
                suffix="px"
              />
            </div>
          </>
        )}
      </EditorSection>
    </>
  );

  const renderDealsLayoutEditor = () => (
    <EditorSection title="Layout" icon="grid_view" defaultOpen={false}>
      <SelectInput
        label="Columns"
        value={String(data.columns || 4)}
        options={[
          { value: '2', label: '2 Columns' },
          { value: '3', label: '3 Columns' },
          { value: '4', label: '4 Columns' },
        ]}
        onChange={(val) => updateData('columns', parseInt(val))}
      />
    </EditorSection>
  );

  const renderDealsCardStyleEditor = () => {
    const cs = data.cardStyle || {};
    return (
      <>
        <EditorSection title="Card Style" icon="dashboard" defaultOpen={false}>
          <ColorPicker
            label="Card Background"
            value={cs.backgroundColor || '#ffffff'}
            onChange={(val) => updateNestedData('cardStyle.backgroundColor', val)}
          />
          <NumberInput
            label="Border Radius"
            value={cs.borderRadius || 8}
            onChange={(val) => updateNestedData('cardStyle.borderRadius', val)}
            min={0}
            max={30}
            suffix="px"
          />
          <ToggleSwitch
            label="Show Border"
            value={cs.showBorder !== false}
            onChange={(val) => updateNestedData('cardStyle.showBorder', val)}
          />
          {cs.showBorder !== false && (
            <ColorPicker
              label="Border Color"
              value={cs.borderColor || '#e5e7eb'}
              onChange={(val) => updateNestedData('cardStyle.borderColor', val)}
            />
          )}
        </EditorSection>

        <EditorSection title="Image Style" icon="image" defaultOpen={false}>
          <SelectInput
            label="Image Fit"
            value={cs.imageFit || 'contain'}
            options={[
              { value: 'contain', label: 'Contain (fit inside)' },
              { value: 'cover', label: 'Cover (fill & crop)' },
              { value: 'fill', label: 'Fill (stretch)' },
              { value: 'none', label: 'None (original size)' },
            ]}
            onChange={(val) => updateNestedData('cardStyle.imageFit', val)}
          />
          <ColorPicker
            label="Image Background"
            value={cs.imageBackgroundColor || '#f3f4f6'}
            onChange={(val) => updateNestedData('cardStyle.imageBackgroundColor', val)}
          />
        </EditorSection>

        <EditorSection title="Text Colors" icon="text_fields" defaultOpen={false}>
          <ColorPicker
            label="Product Name"
            value={cs.textColor || '#1f2937'}
            onChange={(val) => updateNestedData('cardStyle.textColor', val)}
          />
          <ColorPicker
            label="Description"
            value={cs.descriptionColor || '#6b7280'}
            onChange={(val) => updateNestedData('cardStyle.descriptionColor', val)}
          />
          <ColorPicker
            label="Price"
            value={cs.priceColor || '#1f2937'}
            onChange={(val) => updateNestedData('cardStyle.priceColor', val)}
          />
        </EditorSection>

        <EditorSection title="Button Style" icon="smart_button" defaultOpen={false}>
          <ColorPicker
            label="Button Background"
            value={cs.buttonBackgroundColor || '#F0CAE1'}
            onChange={(val) => updateNestedData('cardStyle.buttonBackgroundColor', val)}
          />
          <ColorPicker
            label="Button Text"
            value={cs.buttonTextColor || '#27491F'}
            onChange={(val) => updateNestedData('cardStyle.buttonTextColor', val)}
          />
          <NumberInput
            label="Button Radius"
            value={cs.buttonBorderRadius || 6}
            onChange={(val) => updateNestedData('cardStyle.buttonBorderRadius', val)}
            min={0}
            max={25}
            suffix="px"
          />
        </EditorSection>
      </>
    );
  };

  const renderDealsProductsEditor = () => {
    const selectedProducts = data.selectedProducts || [];

    // Filter products based on search and already selected
    const filteredProducts = availableProducts.filter((product: any) => {
      const isNotSelected = !selectedProducts.some((p: any) => p.id === product.id);
      const matchesSearch = !productSearchQuery || 
        product.name?.toLowerCase().includes(productSearchQuery.toLowerCase());
      return isNotSelected && matchesSearch;
    });

    const addProduct = (product: any) => {
      const newProduct = {
        id: product.id,
        name: product.name,
        price: product.price,
        sellingPrice: product.sellingPrice || product.price,
        image: product.images?.[0] || product.image || '',
        description: product.description || '',
        // Sale pricing fields
        onSale: product.onSale || false,
        salePrice: product.salePrice,
        compareAtPrice: product.compareAtPrice || product.sellingPrice || product.price
      };
      updateData('selectedProducts', [...selectedProducts, newProduct]);
    };

    const removeProduct = (productId: string) => {
      updateData('selectedProducts', selectedProducts.filter((p: any) => p.id !== productId));
    };

    const moveProduct = (index: number, direction: 'up' | 'down') => {
      const newProducts = [...selectedProducts];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= newProducts.length) return;
      [newProducts[index], newProducts[newIndex]] = [newProducts[newIndex], newProducts[index]];
      updateData('selectedProducts', newProducts);
    };

    return (
      <>
        <EditorSection title="Selected Products" icon="inventory_2" defaultOpen={true}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-600">
              {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
            </p>
            <button
              type="button"
              onClick={() => {
                setShowProductPicker(!showProductPicker);
                if (!showProductPicker && availableProducts.length === 0) {
                  fetchProducts();
                }
              }}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
            >
              <span className="material-icons text-sm">
                {showProductPicker ? 'close' : 'add'}
              </span>
              {showProductPicker ? 'Close' : 'Add Products'}
            </button>
          </div>

          {/* Product Picker */}
          {showProductPicker && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="relative mb-3">
                <span className="material-icons absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {loadingProducts ? (
                <div className="text-center py-4">
                  <span className="material-icons animate-spin text-gray-400">refresh</span>
                  <p className="text-xs text-gray-500 mt-1">Loading products...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-4">
                  <span className="material-icons text-2xl text-gray-300">inventory_2</span>
                  <p className="text-xs text-gray-500 mt-1">
                    {productSearchQuery ? 'No matching products' : 'No more products to add'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filteredProducts.slice(0, 20).map((product: any) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProduct(product)}
                      className="w-full flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition-all text-left"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                        {product.images?.[0] || product.image ? (
                          <img 
                            src={product.images?.[0] || product.image} 
                            alt={product.name} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <span className="material-icons text-gray-300 w-full h-full flex items-center justify-center text-sm">image</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{product.name}</p>
                        <p className="text-[10px] text-gray-500">${product.sellingPrice || product.price}</p>
                      </div>
                      <span className="material-icons text-primary text-lg">add_circle</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected Products List */}
          {selectedProducts.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <span className="material-icons text-3xl text-gray-300">shopping_bag</span>
              <p className="text-xs text-gray-500 mt-2">No products selected</p>
              <p className="text-[10px] text-gray-400 mt-1">Click "Add Products" to get started</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedProducts.map((product: any, index: number) => (
                <div
                  key={product.id}
                  className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 group"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-icons text-gray-300 w-full h-full flex items-center justify-center">image</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{product.name}</p>
                    <p className="text-[10px] text-gray-500">${product.sellingPrice || product.price}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => moveProduct(index, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                    >
                      <span className="material-icons text-sm text-gray-500">arrow_upward</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveProduct(index, 'down')}
                      disabled={index === selectedProducts.length - 1}
                      className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                    >
                      <span className="material-icons text-sm text-gray-500">arrow_downward</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeProduct(product.id)}
                      className="p-1 hover:bg-red-50 rounded"
                    >
                      <span className="material-icons text-sm text-red-500">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </EditorSection>
      </>
    );
  };

  const renderDealsFullEditor = () => (
    <>
      {renderDealsBackgroundEditor()}
      {renderDealsTitleEditor()}
      {renderDealsLayoutEditor()}
      {renderDealsCardStyleEditor()}
      {renderDealsProductsEditor()}
    </>
  );

  // ============================================================================
  // COLLECTIONS SECTION EDITORS
  // ============================================================================

  const renderCollectionsBackgroundEditor = () => (
    <EditorSection title="Section Background" icon="format_paint" defaultOpen={true}>
      <ColorPicker
        label="Background Color"
        value={style.backgroundColor || '#ffffff'}
        onChange={(val) => updateStyle('backgroundColor', val)}
      />
      <TextInput
        label="Background Image URL"
        value={style.backgroundImage || ''}
        onChange={(val) => updateStyle('backgroundImage', val)}
        placeholder="https://..."
      />
    </EditorSection>
  );

  const renderCollectionsTitleEditor = () => (
    <EditorSection title="Section Header" icon="title" defaultOpen={true}>
      <TextInput
        label="Title"
        value={data.title || 'Shop by Collection'}
        onChange={(val) => updateData('title', val)}
      />
      <TextInput
        label="Subtitle"
        value={data.subtitle || ''}
        onChange={(val) => updateData('subtitle', val)}
        placeholder="Browse our curated collections"
      />
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-2">Title Style</p>
        <ColorPicker
          label="Title Color"
          value={data.titleStyle?.color || '#1f2937'}
          onChange={(val) => updateNestedData('titleStyle.color', val)}
        />
        <SelectInput
          label="Text Align"
          value={data.titleStyle?.textAlign || 'center'}
          options={[
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' },
          ]}
          onChange={(val) => updateNestedData('titleStyle.textAlign', val)}
        />
      </div>
    </EditorSection>
  );

  const renderCollectionsLayoutEditor = () => (
    <EditorSection title="Layout" icon="grid_view" defaultOpen={false}>
      <SelectInput
        label="Layout Style"
        value={data.layout || 'grid'}
        options={[
          { value: 'grid', label: 'Grid' },
          { value: 'carousel', label: 'Carousel' },
          { value: 'featured', label: 'Featured (Large + Small)' },
        ]}
        onChange={(val) => updateData('layout', val)}
      />
      <SelectInput
        label="Columns"
        value={String(data.columns || 4)}
        options={[
          { value: '2', label: '2 Columns' },
          { value: '3', label: '3 Columns' },
          { value: '4', label: '4 Columns' },
          { value: '5', label: '5 Columns' },
          { value: '6', label: '6 Columns' },
        ]}
        onChange={(val) => updateData('columns', parseInt(val))}
      />
    </EditorSection>
  );

  const renderCollectionsCardStyleEditor = () => {
    const cs = data.cardStyle || {};
    return (
      <>
        <EditorSection title="Card Style" icon="dashboard" defaultOpen={false}>
          <ColorPicker
            label="Card Background"
            value={cs.backgroundColor || '#ffffff'}
            onChange={(val) => updateNestedData('cardStyle.backgroundColor', val)}
          />
          <NumberInput
            label="Border Radius"
            value={cs.borderRadius ?? 16}
            onChange={(val) => updateNestedData('cardStyle.borderRadius', val)}
            min={0}
            max={50}
            suffix="px"
          />
          <div className="flex items-center justify-between mt-2">
            <label className="text-xs text-gray-600">Show Border</label>
            <input
              type="checkbox"
              checked={cs.showBorder || false}
              onChange={(e) => updateNestedData('cardStyle.showBorder', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
          </div>
          {cs.showBorder && (
            <ColorPicker
              label="Border Color"
              value={cs.borderColor || '#e5e7eb'}
              onChange={(val) => updateNestedData('cardStyle.borderColor', val)}
            />
          )}
        </EditorSection>
        
        <EditorSection title="Image Style" icon="image" defaultOpen={false}>
          <SelectInput
            label="Aspect Ratio"
            value={cs.imageAspect || 'square'}
            options={[
              { value: 'square', label: 'Square (1:1)' },
              { value: 'portrait', label: 'Portrait (3:4)' },
              { value: 'landscape', label: 'Landscape (4:3)' },
              { value: 'wide', label: 'Wide (16:9)' },
            ]}
            onChange={(val) => updateNestedData('cardStyle.imageAspect', val)}
          />
          <SelectInput
            label="Image Fit"
            value={cs.imageFit || 'cover'}
            options={[
              { value: 'cover', label: 'Cover (Fill & Crop)' },
              { value: 'contain', label: 'Contain (Fit Inside)' },
            ]}
            onChange={(val) => updateNestedData('cardStyle.imageFit', val)}
          />
        </EditorSection>

        <EditorSection title="Overlay & Text" icon="layers" defaultOpen={false}>
          <SelectInput
            label="Name Position"
            value={cs.namePosition || 'overlay'}
            options={[
              { value: 'overlay', label: 'On Image (Overlay)' },
              { value: 'below', label: 'Below Image' },
            ]}
            onChange={(val) => updateNestedData('cardStyle.namePosition', val)}
          />
          {cs.namePosition === 'overlay' && (
            <>
              <ColorPicker
                label="Overlay Color"
                value={cs.overlayColor || '#000000'}
                onChange={(val) => updateNestedData('cardStyle.overlayColor', val)}
              />
              <NumberInput
                label="Overlay Opacity"
                value={Math.round((cs.overlayOpacity ?? 0.4) * 100)}
                onChange={(val) => updateNestedData('cardStyle.overlayOpacity', val / 100)}
                min={0}
                max={100}
                suffix="%"
              />
            </>
          )}
          <div className="space-y-2 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">Show Name</label>
              <input
                type="checkbox"
                checked={cs.showName !== false}
                onChange={(e) => updateNestedData('cardStyle.showName', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">Show Description</label>
              <input
                type="checkbox"
                checked={cs.showDescription || false}
                onChange={(e) => updateNestedData('cardStyle.showDescription', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">Show Product Count</label>
              <input
                type="checkbox"
                checked={cs.showProductCount !== false}
                onChange={(e) => updateNestedData('cardStyle.showProductCount', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
            </div>
          </div>
        </EditorSection>
        
        {/* Button Style Editor */}
        <EditorSection title="Button Style" icon="smart_button" defaultOpen={false}>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs text-gray-600">Show Button</label>
            <input
              type="checkbox"
              checked={cs.showButton !== false}
              onChange={(e) => updateNestedData('cardStyle.showButton', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
          </div>
          
          {cs.showButton !== false && (
            <>
              <TextInput
                label="Button Text"
                value={cs.buttonText || 'EXPLORE COLLECTION'}
                onChange={(val) => updateNestedData('cardStyle.buttonText', val)}
                placeholder="e.g., EXPLORE COLLECTION"
              />
              
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2 font-medium">Normal State</p>
                <ColorPicker
                  label="Background"
                  value={cs.buttonBackgroundColor || 'rgba(255,255,255,0.2)'}
                  onChange={(val) => updateNestedData('cardStyle.buttonBackgroundColor', val)}
                />
                <ColorPicker
                  label="Text Color"
                  value={cs.buttonTextColor || '#ffffff'}
                  onChange={(val) => updateNestedData('cardStyle.buttonTextColor', val)}
                />
                <NumberInput
                  label="Border Radius"
                  value={cs.buttonBorderRadius ?? 4}
                  onChange={(val) => updateNestedData('cardStyle.buttonBorderRadius', val)}
                  min={0}
                  max={50}
                  suffix="px"
                />
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2 font-medium">Hover State</p>
                <SelectInput
                  label="Hover Effect"
                  value={cs.buttonHoverEffect || 'fill'}
                  options={[
                    { value: 'none', label: 'None (Color Change)' },
                    { value: 'fill', label: 'Fill (Left to Right)' },
                    { value: 'scale', label: 'Scale Up' },
                    { value: 'glow', label: 'Glow Effect' },
                  ]}
                  onChange={(val) => updateNestedData('cardStyle.buttonHoverEffect', val)}
                />
                <ColorPicker
                  label="Hover Background"
                  value={cs.buttonHoverBackgroundColor || '#ffffff'}
                  onChange={(val) => updateNestedData('cardStyle.buttonHoverBackgroundColor', val)}
                />
                <ColorPicker
                  label="Hover Text Color"
                  value={cs.buttonHoverTextColor || '#1f2937'}
                  onChange={(val) => updateNestedData('cardStyle.buttonHoverTextColor', val)}
                />
              </div>
            </>
          )}
        </EditorSection>
      </>
    );
  };

  // Button style editor for collections
  const renderCollectionsButtonEditor = () => {
    const cs = data.cardStyle || {};
    return (
      <>
        <EditorSection title="Button Style" icon="smart_button" defaultOpen={true}>
          <TextInput
            label="Button Text"
            value={cs.buttonText || 'EXPLORE COLLECTION'}
            onChange={(val) => updateNestedData('cardStyle.buttonText', val)}
            placeholder="e.g., EXPLORE COLLECTION"
          />
          
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2 font-medium">Normal State</p>
            <ColorPicker
              label="Background"
              value={cs.buttonBackgroundColor || 'rgba(255,255,255,0.2)'}
              onChange={(val) => updateNestedData('cardStyle.buttonBackgroundColor', val)}
            />
            <ColorPicker
              label="Text Color"
              value={cs.buttonTextColor || '#ffffff'}
              onChange={(val) => updateNestedData('cardStyle.buttonTextColor', val)}
            />
            <NumberInput
              label="Border Radius"
              value={cs.buttonBorderRadius ?? 4}
              onChange={(val) => updateNestedData('cardStyle.buttonBorderRadius', val)}
              min={0}
              max={50}
              suffix="px"
            />
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2 font-medium">Hover Effect</p>
            <SelectInput
              label="Hover Style"
              value={cs.buttonHoverEffect || 'fill'}
              options={[
                { value: 'none', label: 'None (Color Change)' },
                { value: 'fill', label: 'Fill (Left to Right)' },
                { value: 'scale', label: 'Scale Up' },
                { value: 'glow', label: 'Glow Effect' },
              ]}
              onChange={(val) => updateNestedData('cardStyle.buttonHoverEffect', val)}
            />
            <ColorPicker
              label="Hover Background"
              value={cs.buttonHoverBackgroundColor || '#ffffff'}
              onChange={(val) => updateNestedData('cardStyle.buttonHoverBackgroundColor', val)}
            />
            <ColorPicker
              label="Hover Text Color"
              value={cs.buttonHoverTextColor || '#1f2937'}
              onChange={(val) => updateNestedData('cardStyle.buttonHoverTextColor', val)}
            />
          </div>
        </EditorSection>
      </>
    );
  };

  const renderCollectionsEditor = () => {
    const selectedCollections = data.selectedCollections || [];

    return (
      <>
        <EditorSection title="Collections" icon="collections" defaultOpen={true}>
          <p className="text-xs text-gray-500 mb-3">
            Select collections to display ({selectedCollections.length} selected)
          </p>
          
          {/* Selected Collections */}
          {selectedCollections.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-xs font-medium text-gray-700">Selected:</p>
              {selectedCollections.map((col: any, idx: number) => (
                <div 
                  key={col.id || idx}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                >
                  <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                    {col.image ? (
                      <img src={col.image} alt={col.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-800 to-pink-300 flex items-center justify-center">
                        <span className="material-icons text-white/70 text-sm">collections</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{col.name}</p>
                    {col.productCount !== undefined && (
                      <p className="text-xs text-gray-500">{col.productCount} products</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const updated = selectedCollections.filter((_: any, i: number) => i !== idx);
                      updateData('selectedCollections', updated);
                    }}
                    className="p-1 hover:bg-red-100 rounded text-red-500"
                  >
                    <span className="material-icons text-sm">close</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Available Collections */}
          {loadingCollections ? (
            <div className="text-center py-4">
              <span className="material-icons animate-spin text-gray-400">refresh</span>
              <p className="text-xs text-gray-500 mt-1">Loading collections...</p>
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-4 border border-dashed border-gray-300 rounded-lg">
              <span className="material-icons text-gray-400 text-2xl">collections</span>
              <p className="text-xs text-gray-500 mt-1">No collections found</p>
              <p className="text-xs text-gray-400">Create collections first</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700">Available Collections:</p>
              {collections
                .filter((col: any) => !selectedCollections.some((s: any) => s.id === col.id))
                .map((col: any) => (
                  <button
                    key={col.id}
                    onClick={() => {
                      const newCollection = {
                        id: col.id,
                        name: col.name,
                        image: col.image || '',
                        description: col.description || '',
                        productCount: col.productCount || 0
                      };
                      updateData('selectedCollections', [...selectedCollections, newCollection]);
                    }}
                    className="w-full flex items-center gap-2 p-2 hover:bg-emerald-50 rounded-lg border border-gray-200 transition-colors"
                  >
                    <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                      {col.image ? (
                        <img src={col.image} alt={col.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-800 to-pink-300 flex items-center justify-center">
                          <span className="material-icons text-white/70 text-sm">collections</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-gray-800 truncate">{col.name}</p>
                    </div>
                    <span className="material-icons text-emerald-600 text-sm">add</span>
                  </button>
                ))}
            </div>
          )}
        </EditorSection>
      </>
    );
  };

  const renderCollectionsFullEditor = () => (
    <>
      {renderCollectionsBackgroundEditor()}
      {renderCollectionsTitleEditor()}
      {renderCollectionsLayoutEditor()}
      {renderCollectionsCardStyleEditor()}
      {renderCollectionsEditor()}
    </>
  );

  // ==================== FEATURES FULL EDITOR ====================
  const renderFeaturesFullEditor = () => {
    const items = data.items || [];
    
    const addFeature = () => {
      updateData('items', [...items, { icon: '⭐', title: 'New Feature', description: 'Feature description' }]);
    };
    
    const removeFeature = (index: number) => {
      updateData('items', items.filter((_: any, i: number) => i !== index));
    };
    
    const updateFeature = (index: number, field: string, value: any) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], [field]: value };
      updateData('items', newItems);
    };

    return (
      <>
        <EditorSection title="Background" icon="format_color_fill">
          <ColorPicker
            label="Background Color"
            value={data.backgroundColor || style.backgroundColor || '#ffffff'}
            onChange={(val) => {
              updateStyle('backgroundColor', val);
              updateData('backgroundColor', val);
            }}
          />
        </EditorSection>

        <EditorSection title="Section Title" icon="title">
          <TextInput
            label="Title"
            value={data.title || ''}
            onChange={(val) => updateData('title', val)}
          />
          <TextInput
            label="Subtitle"
            value={data.subtitle || ''}
            onChange={(val) => updateData('subtitle', val)}
          />
          <ColorPicker
            label="Title Color"
            value={data.titleColor || '#1f2937'}
            onChange={(val) => updateData('titleColor', val)}
          />
        </EditorSection>

        <EditorSection title="Features" icon="star">
          <div className="space-y-2 mb-2">
            {items.map((item: any, index: number) => (
              <div key={index} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">Feature {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <span className="material-icons text-xs">delete</span>
                  </button>
                </div>
                <TextInput
                  label="Icon"
                  value={item.icon || ''}
                  onChange={(val) => updateFeature(index, 'icon', val)}
                  placeholder="⭐"
                />
                <TextInput
                  label="Title"
                  value={item.title || ''}
                  onChange={(val) => updateFeature(index, 'title', val)}
                />
                <TextArea
                  label="Description"
                  value={item.description || ''}
                  onChange={(val) => updateFeature(index, 'description', val)}
                  rows={2}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addFeature}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-colors text-xs flex items-center justify-center gap-1"
          >
            <span className="material-icons text-sm">add</span>
            Add Feature
          </button>
        </EditorSection>

        <EditorSection title="Layout" icon="view_module" defaultOpen={false}>
          <SelectInput
            label="Columns"
            value={String(data.columns || 3)}
            options={[
              { value: '2', label: '2 Columns' },
              { value: '3', label: '3 Columns' },
              { value: '4', label: '4 Columns' },
            ]}
            onChange={(val) => updateData('columns', Number(val))}
          />
        </EditorSection>

        <EditorSection title="Card Style" icon="style" defaultOpen={false}>
          <ColorPicker
            label="Card Background"
            value={data.cardBackgroundColor || '#ffffff'}
            onChange={(val) => updateData('cardBackgroundColor', val)}
          />
          <ColorPicker
            label="Text Color"
            value={data.textColor || '#374151'}
            onChange={(val) => updateData('textColor', val)}
          />
          <NumberInput
            label="Border Radius"
            value={data.borderRadius || 12}
            onChange={(val) => updateData('borderRadius', val)}
            max={30}
            suffix="px"
          />
          <ToggleSwitch
            label="Show Border"
            value={data.showBorder !== false}
            onChange={(val) => updateData('showBorder', val)}
          />
        </EditorSection>
      </>
    );
  };

  // ==================== TESTIMONIALS FULL EDITOR ====================
  const renderTestimonialsFullEditor = () => {
    const items = data.items || [];
    
    const addTestimonial = () => {
      updateData('items', [...items, {
        name: 'Customer Name',
        role: 'Customer',
        text: 'Great service and amazing products!',
        rating: 5,
        image: ''
      }]);
    };
    
    const removeTestimonial = (index: number) => {
      updateData('items', items.filter((_: any, i: number) => i !== index));
    };
    
    const updateTestimonial = (index: number, field: string, value: any) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], [field]: value };
      updateData('items', newItems);
    };

    return (
      <>
        <EditorSection title="Background" icon="format_color_fill">
          <ColorPicker
            label="Background Color"
            value={data.backgroundColor || style.backgroundColor || '#ffffff'}
            onChange={(val) => {
              updateStyle('backgroundColor', val);
              updateData('backgroundColor', val);
            }}
          />
        </EditorSection>

        <EditorSection title="Section Title" icon="title">
          <TextInput
            label="Title"
            value={data.title || ''}
            onChange={(val) => updateData('title', val)}
          />
          <ColorPicker
            label="Title Color"
            value={data.titleColor || '#1f2937'}
            onChange={(val) => updateData('titleColor', val)}
          />
        </EditorSection>

        <EditorSection title="Testimonials" icon="format_quote">
          <div className="space-y-2 mb-2">
            {items.map((item: any, index: number) => (
              <div key={index} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">Testimonial {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeTestimonial(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <span className="material-icons text-xs">delete</span>
                  </button>
                </div>
                <TextInput
                  label="Name"
                  value={item.name || ''}
                  onChange={(val) => updateTestimonial(index, 'name', val)}
                />
                <TextInput
                  label="Role/Company"
                  value={item.role || ''}
                  onChange={(val) => updateTestimonial(index, 'role', val)}
                />
                <TextArea
                  label="Quote"
                  value={item.text || ''}
                  onChange={(val) => updateTestimonial(index, 'text', val)}
                  rows={3}
                />
                <div className="flex items-center justify-between gap-2 mt-1">
                  <label className="text-xs text-gray-600">Rating</label>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => updateTestimonial(index, 'rating', star)}
                        className={`text-lg ${star <= (item.rating || 5) ? 'text-yellow-400' : 'text-gray-300'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-2">
                  <label className="text-xs text-gray-600 block mb-1">Photo</label>
                  <ImageUploader
                    value={item.image || ''}
                    onChange={(url) => updateTestimonial(index, 'image', url)}
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addTestimonial}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-colors text-xs flex items-center justify-center gap-1"
          >
            <span className="material-icons text-sm">add</span>
            Add Testimonial
          </button>
        </EditorSection>

        <EditorSection title="Card Style" icon="style" defaultOpen={false}>
          <ColorPicker
            label="Card Background"
            value={data.cardBackgroundColor || '#f9fafb'}
            onChange={(val) => updateData('cardBackgroundColor', val)}
          />
          <NumberInput
            label="Border Radius"
            value={data.borderRadius || 12}
            onChange={(val) => updateData('borderRadius', val)}
            max={30}
            suffix="px"
          />
        </EditorSection>
      </>
    );
  };

  // ==================== CTA FULL EDITOR ====================
  const renderCTAFullEditor = () => (
    <>
      <EditorSection title="Background" icon="format_color_fill">
        <ColorPicker
          label="Background Color"
          value={data.backgroundColor || '#27491F'}
          onChange={(val) => updateData('backgroundColor', val)}
        />
        <ImageUploader
          value={data.backgroundImage || ''}
          onChange={(url) => updateData('backgroundImage', url)}
        />
      </EditorSection>

      <EditorSection title="Content" icon="edit">
        <TextInput
          label="Title"
          value={data.title || ''}
          onChange={(val) => updateData('title', val)}
        />
        <TextArea
          label="Subtitle"
          value={data.subtitle || ''}
          onChange={(val) => updateData('subtitle', val)}
          rows={3}
        />
        <ColorPicker
          label="Text Color"
          value={data.textColor || '#ffffff'}
          onChange={(val) => updateData('textColor', val)}
        />
      </EditorSection>

      <EditorSection title="Button" icon="smart_button">
        <TextInput
          label="Button Text"
          value={data.buttonText || ''}
          onChange={(val) => updateData('buttonText', val)}
        />
        <TextInput
          label="Button Link"
          value={data.buttonLink || ''}
          onChange={(val) => updateData('buttonLink', val)}
          placeholder="https://..."
        />
        <ColorPicker
          label="Button Background"
          value={data.buttonBackgroundColor || '#ffffff'}
          onChange={(val) => updateData('buttonBackgroundColor', val)}
        />
        <ColorPicker
          label="Button Text Color"
          value={data.buttonTextColor || '#27491F'}
          onChange={(val) => updateData('buttonTextColor', val)}
        />
        <NumberInput
          label="Button Radius"
          value={data.buttonBorderRadius || 8}
          onChange={(val) => updateData('buttonBorderRadius', val)}
          max={30}
          suffix="px"
        />
      </EditorSection>

      <EditorSection title="Layout" icon="view_module" defaultOpen={false}>
        <SelectInput
          label="Alignment"
          value={data.alignment || 'center'}
          options={[
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' },
          ]}
          onChange={(val) => updateData('alignment', val)}
        />
      </EditorSection>
    </>
  );

  // ==================== ABOUT FULL EDITOR ====================
  const renderAboutFullEditor = () => (
    <>
      <EditorSection title="Background" icon="format_color_fill">
        <ColorPicker
          label="Background Color"
          value={data.backgroundColor || style.backgroundColor || '#ffffff'}
          onChange={(val) => {
            updateStyle('backgroundColor', val);
            updateData('backgroundColor', val);
          }}
        />
      </EditorSection>

      <EditorSection title="Content" icon="edit">
        <TextInput
          label="Title"
          value={data.title || ''}
          onChange={(val) => updateData('title', val)}
        />
        <TextArea
          label="Content"
          value={data.content || ''}
          onChange={(val) => updateData('content', val)}
          rows={6}
        />
        <ColorPicker
          label="Text Color"
          value={data.textColor || '#374151'}
          onChange={(val) => updateData('textColor', val)}
        />
      </EditorSection>

      <EditorSection title="Image" icon="image">
        <ImageUploader
          value={data.image || ''}
          onChange={(url) => updateData('image', url)}
        />
        <SelectInput
          label="Image Position"
          value={data.imagePosition || 'right'}
          options={[
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
          ]}
          onChange={(val) => updateData('imagePosition', val)}
        />
        <NumberInput
          label="Image Radius"
          value={data.imageRadius || 12}
          onChange={(val) => updateData('imageRadius', val)}
          max={50}
          suffix="px"
        />
      </EditorSection>

      <EditorSection title="Button" icon="smart_button" defaultOpen={false}>
        <TextInput
          label="Button Text"
          value={data.buttonText || ''}
          onChange={(val) => updateData('buttonText', val)}
          placeholder="Learn More"
        />
        <TextInput
          label="Button Link"
          value={data.buttonLink || ''}
          onChange={(val) => updateData('buttonLink', val)}
        />
      </EditorSection>
    </>
  );

  // ==================== CONTACT FULL EDITOR ====================
  const renderContactFullEditor = () => (
    <>
      <EditorSection title="Background" icon="format_color_fill">
        <ColorPicker
          label="Background Color"
          value={data.backgroundColor || style.backgroundColor || '#ffffff'}
          onChange={(val) => {
            updateStyle('backgroundColor', val);
            updateData('backgroundColor', val);
          }}
        />
      </EditorSection>

      <EditorSection title="Section Title" icon="title">
        <TextInput
          label="Title"
          value={data.title || ''}
          onChange={(val) => updateData('title', val)}
        />
        <TextInput
          label="Subtitle"
          value={data.subtitle || ''}
          onChange={(val) => updateData('subtitle', val)}
        />
      </EditorSection>

      <EditorSection title="Contact Info" icon="contact_mail">
        <TextInput
          label="Email"
          value={data.email || ''}
          onChange={(val) => updateData('email', val)}
          placeholder="contact@example.com"
        />
        <TextInput
          label="Phone"
          value={data.phone || ''}
          onChange={(val) => updateData('phone', val)}
          placeholder="+1 (555) 123-4567"
        />
        <TextArea
          label="Address"
          value={data.address || ''}
          onChange={(val) => updateData('address', val)}
          rows={2}
        />
      </EditorSection>

      <EditorSection title="Form Settings" icon="assignment" defaultOpen={false}>
        <ToggleSwitch
          label="Show Contact Form"
          value={data.showForm !== false}
          onChange={(val) => updateData('showForm', val)}
        />
        <TextInput
          label="Submit Button Text"
          value={data.submitButtonText || 'Send Message'}
          onChange={(val) => updateData('submitButtonText', val)}
        />
      </EditorSection>

      <EditorSection title="Map" icon="map" defaultOpen={false}>
        <ToggleSwitch
          label="Show Map"
          value={data.showMap || false}
          onChange={(val) => updateData('showMap', val)}
        />
        {data.showMap && (
          <TextInput
            label="Map Embed URL"
            value={data.mapUrl || ''}
            onChange={(val) => updateData('mapUrl', val)}
            placeholder="Google Maps embed URL"
          />
        )}
      </EditorSection>
    </>
  );

  // ==================== GALLERY FULL EDITOR ====================
  const renderGalleryFullEditor = () => {
    const images = data.images || [];
    
    const addImage = () => {
      updateData('images', [...images, { url: '', alt: '', caption: '' }]);
    };
    
    const removeImage = (index: number) => {
      updateData('images', images.filter((_: any, i: number) => i !== index));
    };
    
    const updateImage = (index: number, field: string, value: any) => {
      const newImages = [...images];
      newImages[index] = { ...newImages[index], [field]: value };
      updateData('images', newImages);
    };

    return (
      <>
        <EditorSection title="Background" icon="format_color_fill">
          <ColorPicker
            label="Background Color"
            value={data.backgroundColor || style.backgroundColor || '#ffffff'}
            onChange={(val) => {
              updateStyle('backgroundColor', val);
              updateData('backgroundColor', val);
            }}
          />
        </EditorSection>

        <EditorSection title="Section Title" icon="title">
          <TextInput
            label="Title"
            value={data.title || ''}
            onChange={(val) => updateData('title', val)}
          />
          <TextInput
            label="Subtitle"
            value={data.subtitle || ''}
            onChange={(val) => updateData('subtitle', val)}
          />
        </EditorSection>

        <EditorSection title="Images" icon="photo_library">
          <div className="space-y-2 mb-2 max-h-64 overflow-y-auto">
            {images.map((img: any, index: number) => (
              <div key={index} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">Image {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <span className="material-icons text-xs">delete</span>
                  </button>
                </div>
                <ImageUploader
                  value={img.url || ''}
                  onChange={(url) => updateImage(index, 'url', url)}
                />
                <TextInput
                  label="Alt Text"
                  value={img.alt || ''}
                  onChange={(val) => updateImage(index, 'alt', val)}
                  placeholder="Image description"
                />
                <TextInput
                  label="Caption"
                  value={img.caption || ''}
                  onChange={(val) => updateImage(index, 'caption', val)}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addImage}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-colors text-xs flex items-center justify-center gap-1"
          >
            <span className="material-icons text-sm">add_photo_alternate</span>
            Add Image
          </button>
        </EditorSection>

        <EditorSection title="Layout" icon="view_module" defaultOpen={false}>
          <SelectInput
            label="Layout Style"
            value={data.layout || 'grid'}
            options={[
              { value: 'grid', label: 'Grid' },
              { value: 'masonry', label: 'Masonry' },
              { value: 'carousel', label: 'Carousel' },
            ]}
            onChange={(val) => updateData('layout', val)}
          />
          <SelectInput
            label="Columns"
            value={String(data.columns || 3)}
            options={[
              { value: '2', label: '2 Columns' },
              { value: '3', label: '3 Columns' },
              { value: '4', label: '4 Columns' },
            ]}
            onChange={(val) => updateData('columns', Number(val))}
          />
          <NumberInput
            label="Gap"
            value={data.gap || 16}
            onChange={(val) => updateData('gap', val)}
            max={40}
            suffix="px"
          />
          <NumberInput
            label="Image Radius"
            value={data.imageRadius || 8}
            onChange={(val) => updateData('imageRadius', val)}
            max={30}
            suffix="px"
          />
        </EditorSection>
      </>
    );
  };

  // ==================== PRICING FULL EDITOR ====================
  const renderPricingFullEditor = () => {
    const plans = data.plans || [];
    
    const addPlan = () => {
      updateData('plans', [...plans, {
        name: 'New Plan',
        price: 29,
        features: ['Feature 1', 'Feature 2', 'Feature 3'],
        highlighted: false,
        buttonText: 'Get Started'
      }]);
    };
    
    const removePlan = (index: number) => {
      updateData('plans', plans.filter((_: any, i: number) => i !== index));
    };
    
    const updatePlan = (index: number, field: string, value: any) => {
      const newPlans = [...plans];
      newPlans[index] = { ...newPlans[index], [field]: value };
      updateData('plans', newPlans);
    };

    return (
      <>
        <EditorSection title="Background" icon="format_color_fill">
          <ColorPicker
            label="Background Color"
            value={data.backgroundColor || style.backgroundColor || '#ffffff'}
            onChange={(val) => {
              updateStyle('backgroundColor', val);
              updateData('backgroundColor', val);
            }}
          />
        </EditorSection>

        <EditorSection title="Section Title" icon="title">
          <TextInput
            label="Title"
            value={data.title || ''}
            onChange={(val) => updateData('title', val)}
          />
          <TextInput
            label="Subtitle"
            value={data.subtitle || ''}
            onChange={(val) => updateData('subtitle', val)}
          />
        </EditorSection>

        <EditorSection title="Currency" icon="attach_money">
          <TextInput
            label="Currency Symbol"
            value={data.currency || '$'}
            onChange={(val) => updateData('currency', val)}
          />
          <TextInput
            label="Billing Period"
            value={data.billingPeriod || '/month'}
            onChange={(val) => updateData('billingPeriod', val)}
          />
        </EditorSection>

        <EditorSection title="Plans" icon="view_column">
          <div className="space-y-2 mb-2 max-h-80 overflow-y-auto">
            {plans.map((plan: any, index: number) => (
              <div key={index} className={`rounded-lg p-2 border ${plan.highlighted ? 'border-primary bg-primary/5' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">{plan.name || `Plan ${index + 1}`}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => updatePlan(index, 'highlighted', !plan.highlighted)}
                      className={`p-1 rounded ${plan.highlighted ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-primary'}`}
                      title="Highlight Plan"
                    >
                      <span className="material-icons text-xs">star</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removePlan(index)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <span className="material-icons text-xs">delete</span>
                    </button>
                  </div>
                </div>
                <TextInput
                  label="Plan Name"
                  value={plan.name || ''}
                  onChange={(val) => updatePlan(index, 'name', val)}
                />
                <NumberInput
                  label="Price"
                  value={plan.price || 0}
                  onChange={(val) => updatePlan(index, 'price', val)}
                  min={0}
                  max={9999}
                />
                <TextArea
                  label="Features (one per line)"
                  value={(plan.features || []).join('\n')}
                  onChange={(val) => updatePlan(index, 'features', val.split('\n').filter((f: string) => f.trim()))}
                  rows={4}
                />
                <TextInput
                  label="Button Text"
                  value={plan.buttonText || 'Get Started'}
                  onChange={(val) => updatePlan(index, 'buttonText', val)}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addPlan}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-colors text-xs flex items-center justify-center gap-1"
          >
            <span className="material-icons text-sm">add</span>
            Add Plan
          </button>
        </EditorSection>

        <EditorSection title="Card Style" icon="style" defaultOpen={false}>
          <ColorPicker
            label="Card Background"
            value={data.cardBackgroundColor || '#ffffff'}
            onChange={(val) => updateData('cardBackgroundColor', val)}
          />
          <ColorPicker
            label="Highlight Color"
            value={data.highlightColor || '#27491F'}
            onChange={(val) => updateData('highlightColor', val)}
          />
          <NumberInput
            label="Border Radius"
            value={data.borderRadius || 12}
            onChange={(val) => updateData('borderRadius', val)}
            max={30}
            suffix="px"
          />
        </EditorSection>
      </>
    );
  };

  // ==================== FAQ FULL EDITOR ====================
  const renderFAQFullEditor = () => {
    const items = data.items || [];
    
    const addFAQ = () => {
      updateData('items', [...items, { question: 'New Question?', answer: 'Answer here...' }]);
    };
    
    const removeFAQ = (index: number) => {
      updateData('items', items.filter((_: any, i: number) => i !== index));
    };
    
    const updateFAQ = (index: number, field: string, value: any) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], [field]: value };
      updateData('items', newItems);
    };

    return (
      <>
        <EditorSection title="Background" icon="format_color_fill">
          <ColorPicker
            label="Background Color"
            value={data.backgroundColor || style.backgroundColor || '#ffffff'}
            onChange={(val) => {
              updateStyle('backgroundColor', val);
              updateData('backgroundColor', val);
            }}
          />
        </EditorSection>

        <EditorSection title="Section Title" icon="title">
          <TextInput
            label="Title"
            value={data.title || ''}
            onChange={(val) => updateData('title', val)}
          />
          <TextInput
            label="Subtitle"
            value={data.subtitle || ''}
            onChange={(val) => updateData('subtitle', val)}
          />
        </EditorSection>

        <EditorSection title="Questions" icon="help_outline">
          <div className="space-y-2 mb-2 max-h-64 overflow-y-auto">
            {items.map((item: any, index: number) => (
              <div key={index} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">Q{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeFAQ(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <span className="material-icons text-xs">delete</span>
                  </button>
                </div>
                <TextInput
                  label="Question"
                  value={item.question || ''}
                  onChange={(val) => updateFAQ(index, 'question', val)}
                />
                <TextArea
                  label="Answer"
                  value={item.answer || ''}
                  onChange={(val) => updateFAQ(index, 'answer', val)}
                  rows={3}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addFAQ}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-colors text-xs flex items-center justify-center gap-1"
          >
            <span className="material-icons text-sm">add</span>
            Add Question
          </button>
        </EditorSection>

        <EditorSection title="Style" icon="style" defaultOpen={false}>
          <SelectInput
            label="Layout"
            value={data.layout || 'accordion'}
            options={[
              { value: 'accordion', label: 'Accordion' },
              { value: 'grid', label: 'Grid' },
            ]}
            onChange={(val) => updateData('layout', val)}
          />
          <ColorPicker
            label="Question Color"
            value={data.questionColor || '#1f2937'}
            onChange={(val) => updateData('questionColor', val)}
          />
          <ColorPicker
            label="Answer Color"
            value={data.answerColor || '#6b7280'}
            onChange={(val) => updateData('answerColor', val)}
          />
        </EditorSection>
      </>
    );
  };

  // ==================== STATS FULL EDITOR ====================
  const renderStatsFullEditor = () => {
    const stats = data.stats || [];
    
    const addStat = () => {
      updateData('stats', [...stats, { value: '100+', label: 'New Stat', icon: '📊' }]);
    };
    
    const removeStat = (index: number) => {
      updateData('stats', stats.filter((_: any, i: number) => i !== index));
    };
    
    const updateStat = (index: number, field: string, value: any) => {
      const newStats = [...stats];
      newStats[index] = { ...newStats[index], [field]: value };
      updateData('stats', newStats);
    };

    return (
      <>
        <EditorSection title="Background" icon="format_color_fill">
          <ColorPicker
            label="Background Color"
            value={data.backgroundColor || style.backgroundColor || '#27491F'}
            onChange={(val) => {
              updateStyle('backgroundColor', val);
              updateData('backgroundColor', val);
            }}
          />
        </EditorSection>

        <EditorSection title="Section Title" icon="title">
          <TextInput
            label="Title"
            value={data.title || ''}
            onChange={(val) => updateData('title', val)}
          />
          <TextInput
            label="Subtitle"
            value={data.subtitle || ''}
            onChange={(val) => updateData('subtitle', val)}
          />
        </EditorSection>

        <EditorSection title="Statistics" icon="bar_chart">
          <div className="space-y-2 mb-2">
            {stats.map((stat: any, index: number) => (
              <div key={index} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">Stat {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeStat(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <span className="material-icons text-xs">delete</span>
                  </button>
                </div>
                <TextInput
                  label="Value"
                  value={stat.value || ''}
                  onChange={(val) => updateStat(index, 'value', val)}
                  placeholder="10K+"
                />
                <TextInput
                  label="Label"
                  value={stat.label || ''}
                  onChange={(val) => updateStat(index, 'label', val)}
                  placeholder="Happy Customers"
                />
                <TextInput
                  label="Icon/Emoji"
                  value={stat.icon || ''}
                  onChange={(val) => updateStat(index, 'icon', val)}
                  placeholder="😊"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addStat}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-colors text-xs flex items-center justify-center gap-1"
          >
            <span className="material-icons text-sm">add</span>
            Add Statistic
          </button>
        </EditorSection>

        <EditorSection title="Style" icon="style" defaultOpen={false}>
          <ColorPicker
            label="Value Color"
            value={data.valueColor || '#ffffff'}
            onChange={(val) => updateData('valueColor', val)}
          />
          <ColorPicker
            label="Label Color"
            value={data.labelColor || '#ffffff'}
            onChange={(val) => updateData('labelColor', val)}
          />
          <ToggleSwitch
            label="Animate Numbers"
            value={data.animated !== false}
            onChange={(val) => updateData('animated', val)}
          />
        </EditorSection>
      </>
    );
  };

  // ==================== TEAM FULL EDITOR ====================
  const renderTeamFullEditor = () => {
    const members = data.members || [];
    
    const addMember = () => {
      updateData('members', [...members, {
        name: 'Team Member',
        role: 'Position',
        bio: '',
        image: '',
        socialLinks: []
      }]);
    };
    
    const removeMember = (index: number) => {
      updateData('members', members.filter((_: any, i: number) => i !== index));
    };
    
    const updateMember = (index: number, field: string, value: any) => {
      const newMembers = [...members];
      newMembers[index] = { ...newMembers[index], [field]: value };
      updateData('members', newMembers);
    };

    return (
      <>
        <EditorSection title="Background" icon="format_color_fill">
          <ColorPicker
            label="Background Color"
            value={data.backgroundColor || style.backgroundColor || '#ffffff'}
            onChange={(val) => {
              updateStyle('backgroundColor', val);
              updateData('backgroundColor', val);
            }}
          />
        </EditorSection>

        <EditorSection title="Section Title" icon="title">
          <TextInput
            label="Title"
            value={data.title || ''}
            onChange={(val) => updateData('title', val)}
          />
          <TextInput
            label="Subtitle"
            value={data.subtitle || ''}
            onChange={(val) => updateData('subtitle', val)}
          />
        </EditorSection>

        <EditorSection title="Team Members" icon="groups">
          <div className="space-y-2 mb-2 max-h-64 overflow-y-auto">
            {members.map((member: any, index: number) => (
              <div key={index} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">{member.name || `Member ${index + 1}`}</span>
                  <button
                    type="button"
                    onClick={() => removeMember(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <span className="material-icons text-xs">delete</span>
                  </button>
                </div>
                <div className="mb-2">
                  <label className="text-xs text-gray-600 block mb-1">Photo</label>
                  <ImageUploader
                    value={member.image || ''}
                    onChange={(url) => updateMember(index, 'image', url)}
                  />
                </div>
                <TextInput
                  label="Name"
                  value={member.name || ''}
                  onChange={(val) => updateMember(index, 'name', val)}
                />
                <TextInput
                  label="Role/Position"
                  value={member.role || ''}
                  onChange={(val) => updateMember(index, 'role', val)}
                />
                <TextArea
                  label="Bio"
                  value={member.bio || ''}
                  onChange={(val) => updateMember(index, 'bio', val)}
                  rows={2}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addMember}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-colors text-xs flex items-center justify-center gap-1"
          >
            <span className="material-icons text-sm">person_add</span>
            Add Member
          </button>
        </EditorSection>

        <EditorSection title="Layout" icon="view_module" defaultOpen={false}>
          <SelectInput
            label="Layout"
            value={data.layout || 'grid'}
            options={[
              { value: 'grid', label: 'Grid' },
              { value: 'carousel', label: 'Carousel' },
            ]}
            onChange={(val) => updateData('layout', val)}
          />
          <SelectInput
            label="Columns"
            value={String(data.columns || 4)}
            options={[
              { value: '2', label: '2 Members' },
              { value: '3', label: '3 Members' },
              { value: '4', label: '4 Members' },
            ]}
            onChange={(val) => updateData('columns', Number(val))}
          />
        </EditorSection>
      </>
    );
  };

  // ==================== SERVICES FULL EDITOR ====================
  const renderServicesFullEditor = () => {
    const services = data.services || [];
    
    const addService = () => {
      updateData('services', [...services, {
        icon: '🚀',
        title: 'New Service',
        description: 'Service description',
        price: '',
        link: ''
      }]);
    };
    
    const removeService = (index: number) => {
      updateData('services', services.filter((_: any, i: number) => i !== index));
    };
    
    const updateService = (index: number, field: string, value: any) => {
      const newServices = [...services];
      newServices[index] = { ...newServices[index], [field]: value };
      updateData('services', newServices);
    };

    return (
      <>
        <EditorSection title="Background" icon="format_color_fill">
          <ColorPicker
            label="Background Color"
            value={data.backgroundColor || style.backgroundColor || '#ffffff'}
            onChange={(val) => {
              updateStyle('backgroundColor', val);
              updateData('backgroundColor', val);
            }}
          />
        </EditorSection>

        <EditorSection title="Section Title" icon="title">
          <TextInput
            label="Title"
            value={data.title || ''}
            onChange={(val) => updateData('title', val)}
          />
          <TextInput
            label="Subtitle"
            value={data.subtitle || ''}
            onChange={(val) => updateData('subtitle', val)}
          />
        </EditorSection>

        <EditorSection title="Services" icon="build">
          <div className="space-y-2 mb-2 max-h-64 overflow-y-auto">
            {services.map((service: any, index: number) => (
              <div key={index} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">{service.title || `Service ${index + 1}`}</span>
                  <button
                    type="button"
                    onClick={() => removeService(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <span className="material-icons text-xs">delete</span>
                  </button>
                </div>
                <TextInput
                  label="Icon/Emoji"
                  value={service.icon || ''}
                  onChange={(val) => updateService(index, 'icon', val)}
                  placeholder="🚀"
                />
                <TextInput
                  label="Title"
                  value={service.title || ''}
                  onChange={(val) => updateService(index, 'title', val)}
                />
                <TextArea
                  label="Description"
                  value={service.description || ''}
                  onChange={(val) => updateService(index, 'description', val)}
                  rows={2}
                />
                <TextInput
                  label="Price (optional)"
                  value={service.price || ''}
                  onChange={(val) => updateService(index, 'price', val)}
                  placeholder="$99"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addService}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-colors text-xs flex items-center justify-center gap-1"
          >
            <span className="material-icons text-sm">add</span>
            Add Service
          </button>
        </EditorSection>

        <EditorSection title="Layout" icon="view_module" defaultOpen={false}>
          <SelectInput
            label="Layout"
            value={data.layout || 'grid'}
            options={[
              { value: 'grid', label: 'Grid' },
              { value: 'list', label: 'List' },
              { value: 'cards', label: 'Cards' },
            ]}
            onChange={(val) => updateData('layout', val)}
          />
        </EditorSection>
      </>
    );
  };

  // ==================== VIDEO FULL EDITOR ====================
  const renderVideoFullEditor = () => (
    <>
      <EditorSection title="Background" icon="format_color_fill">
        <ColorPicker
          label="Background Color"
          value={data.backgroundColor || style.backgroundColor || '#000000'}
          onChange={(val) => {
            updateStyle('backgroundColor', val);
            updateData('backgroundColor', val);
          }}
        />
      </EditorSection>

      <EditorSection title="Section Title" icon="title">
        <TextInput
          label="Title"
          value={data.title || ''}
          onChange={(val) => updateData('title', val)}
        />
        <TextInput
          label="Subtitle"
          value={data.subtitle || ''}
          onChange={(val) => updateData('subtitle', val)}
        />
      </EditorSection>

      <EditorSection title="Video Source" icon="play_circle">
        <TextInput
          label="Video URL"
          value={data.videoUrl || ''}
          onChange={(val) => updateData('videoUrl', val)}
          placeholder="YouTube or Vimeo URL"
        />
        <SelectInput
          label="Video Type"
          value={data.videoType || 'youtube'}
          options={[
            { value: 'youtube', label: 'YouTube' },
            { value: 'vimeo', label: 'Vimeo' },
            { value: 'custom', label: 'Custom URL' },
          ]}
          onChange={(val) => updateData('videoType', val)}
        />
      </EditorSection>

      <EditorSection title="Thumbnail" icon="image">
        <ImageUploader
          value={data.thumbnailUrl || ''}
          onChange={(url) => updateData('thumbnailUrl', url)}
        />
      </EditorSection>

      <EditorSection title="Options" icon="settings" defaultOpen={false}>
        <ToggleSwitch
          label="Autoplay"
          value={data.autoplay || false}
          onChange={(val) => updateData('autoplay', val)}
        />
        <ToggleSwitch
          label="Show Controls"
          value={data.showControls !== false}
          onChange={(val) => updateData('showControls', val)}
        />
        <ToggleSwitch
          label="Loop"
          value={data.loop || false}
          onChange={(val) => updateData('loop', val)}
        />
        <ToggleSwitch
          label="Muted"
          value={data.muted || false}
          onChange={(val) => updateData('muted', val)}
        />
      </EditorSection>
    </>
  );

  // ==================== COUNTDOWN FULL EDITOR ====================
  const renderCountdownFullEditor = () => (
    <>
      <EditorSection title="Background" icon="format_color_fill">
        <ColorPicker
          label="Background Color"
          value={data.backgroundColor || '#27491F'}
          onChange={(val) => updateData('backgroundColor', val)}
        />
      </EditorSection>

      <EditorSection title="Content" icon="edit">
        <TextInput
          label="Title"
          value={data.title || ''}
          onChange={(val) => updateData('title', val)}
        />
        <TextInput
          label="Subtitle"
          value={data.subtitle || ''}
          onChange={(val) => updateData('subtitle', val)}
        />
        <ColorPicker
          label="Text Color"
          value={data.textColor || '#ffffff'}
          onChange={(val) => updateData('textColor', val)}
        />
      </EditorSection>

      <EditorSection title="Countdown Settings" icon="timer">
        <div className="space-y-1">
          <label className="text-xs text-gray-600">Target Date & Time</label>
          <input
            type="datetime-local"
            value={data.targetDate ? new Date(data.targetDate).toISOString().slice(0, 16) : ''}
            onChange={(e) => updateData('targetDate', new Date(e.target.value).toISOString())}
            className="w-full text-xs px-2 py-1.5 border rounded"
          />
        </div>
        <TextInput
          label="Expired Message"
          value={data.expiredMessage || 'The wait is over!'}
          onChange={(val) => updateData('expiredMessage', val)}
        />
      </EditorSection>

      <EditorSection title="Display Options" icon="visibility">
        <ToggleSwitch
          label="Show Days"
          value={data.showDays !== false}
          onChange={(val) => updateData('showDays', val)}
        />
        <ToggleSwitch
          label="Show Hours"
          value={data.showHours !== false}
          onChange={(val) => updateData('showHours', val)}
        />
        <ToggleSwitch
          label="Show Minutes"
          value={data.showMinutes !== false}
          onChange={(val) => updateData('showMinutes', val)}
        />
        <ToggleSwitch
          label="Show Seconds"
          value={data.showSeconds !== false}
          onChange={(val) => updateData('showSeconds', val)}
        />
      </EditorSection>

      <EditorSection title="Style" icon="style" defaultOpen={false}>
        <ColorPicker
          label="Box Background"
          value={data.boxBackgroundColor || 'rgba(255,255,255,0.2)'}
          onChange={(val) => updateData('boxBackgroundColor', val)}
        />
        <NumberInput
          label="Box Border Radius"
          value={data.boxBorderRadius || 8}
          onChange={(val) => updateData('boxBorderRadius', val)}
          max={30}
          suffix="px"
        />
      </EditorSection>
    </>
  );

  // ==================== PARTNERS FULL EDITOR ====================
  const renderPartnersFullEditor = () => {
    const partners = data.partners || [];
    
    const addPartner = () => {
      updateData('partners', [...partners, { name: 'Partner Name', logo: '', link: '' }]);
    };
    
    const removePartner = (index: number) => {
      updateData('partners', partners.filter((_: any, i: number) => i !== index));
    };
    
    const updatePartner = (index: number, field: string, value: any) => {
      const newPartners = [...partners];
      newPartners[index] = { ...newPartners[index], [field]: value };
      updateData('partners', newPartners);
    };

    return (
      <>
        <EditorSection title="Background" icon="format_color_fill">
          <ColorPicker
            label="Background Color"
            value={data.backgroundColor || style.backgroundColor || '#ffffff'}
            onChange={(val) => {
              updateStyle('backgroundColor', val);
              updateData('backgroundColor', val);
            }}
          />
        </EditorSection>

        <EditorSection title="Section Title" icon="title">
          <TextInput
            label="Title"
            value={data.title || ''}
            onChange={(val) => updateData('title', val)}
          />
          <TextInput
            label="Subtitle"
            value={data.subtitle || ''}
            onChange={(val) => updateData('subtitle', val)}
          />
        </EditorSection>

        <EditorSection title="Partners" icon="handshake">
          <div className="space-y-2 mb-2 max-h-64 overflow-y-auto">
            {partners.map((partner: any, index: number) => (
              <div key={index} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">{partner.name || `Partner ${index + 1}`}</span>
                  <button
                    type="button"
                    onClick={() => removePartner(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <span className="material-icons text-xs">delete</span>
                  </button>
                </div>
                <TextInput
                  label="Name"
                  value={partner.name || ''}
                  onChange={(val) => updatePartner(index, 'name', val)}
                />
                <div className="mb-1">
                  <label className="text-xs text-gray-600 block mb-1">Logo</label>
                  <ImageUploader
                    value={partner.logo || ''}
                    onChange={(url) => updatePartner(index, 'logo', url)}
                  />
                </div>
                <TextInput
                  label="Link (optional)"
                  value={partner.link || ''}
                  onChange={(val) => updatePartner(index, 'link', val)}
                  placeholder="https://..."
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addPartner}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-colors text-xs flex items-center justify-center gap-1"
          >
            <span className="material-icons text-sm">add</span>
            Add Partner
          </button>
        </EditorSection>

        <EditorSection title="Display Options" icon="tune" defaultOpen={false}>
          <ToggleSwitch
            label="Grayscale Logos"
            value={data.grayscale || false}
            onChange={(val) => updateData('grayscale', val)}
          />
          <ToggleSwitch
            label="Auto Scroll"
            value={data.autoScroll || false}
            onChange={(val) => updateData('autoScroll', val)}
          />
        </EditorSection>
      </>
    );
  };

  // ==================== NEWSLETTER FULL EDITOR ====================
  const renderNewsletterFullEditor = () => (
    <>
      <EditorSection title="Background" icon="format_color_fill">
        <ColorPicker
          label="Background Color"
          value={data.backgroundColor || style.backgroundColor || '#f3f4f6'}
          onChange={(val) => {
            updateStyle('backgroundColor', val);
            updateData('backgroundColor', val);
          }}
        />
      </EditorSection>

      <EditorSection title="Content" icon="edit">
        <TextInput
          label="Title"
          value={data.title || ''}
          onChange={(val) => updateData('title', val)}
        />
        <TextArea
          label="Subtitle"
          value={data.subtitle || ''}
          onChange={(val) => updateData('subtitle', val)}
          rows={2}
        />
        <ColorPicker
          label="Text Color"
          value={data.textColor || '#1f2937'}
          onChange={(val) => updateData('textColor', val)}
        />
      </EditorSection>

      <EditorSection title="Form" icon="assignment">
        <TextInput
          label="Placeholder Text"
          value={data.placeholder || 'Enter your email'}
          onChange={(val) => updateData('placeholder', val)}
        />
        <TextInput
          label="Button Text"
          value={data.buttonText || 'Subscribe'}
          onChange={(val) => updateData('buttonText', val)}
        />
        <TextInput
          label="Success Message"
          value={data.successMessage || 'Thanks for subscribing!'}
          onChange={(val) => updateData('successMessage', val)}
        />
      </EditorSection>

      <EditorSection title="Button Style" icon="smart_button" defaultOpen={false}>
        <ColorPicker
          label="Button Background"
          value={data.buttonBackgroundColor || '#27491F'}
          onChange={(val) => updateData('buttonBackgroundColor', val)}
        />
        <ColorPicker
          label="Button Text Color"
          value={data.buttonTextColor || '#ffffff'}
          onChange={(val) => updateData('buttonTextColor', val)}
        />
        <NumberInput
          label="Button Radius"
          value={data.buttonBorderRadius || 8}
          onChange={(val) => updateData('buttonBorderRadius', val)}
          max={30}
          suffix="px"
        />
      </EditorSection>
    </>
  );

  // ==================== DIVIDER FULL EDITOR ====================
  const renderDividerFullEditor = () => (
    <>
      <EditorSection title="Divider Style" icon="horizontal_rule">
        <SelectInput
          label="Style"
          value={data.style || 'line'}
          options={[
            { value: 'line', label: 'Solid Line' },
            { value: 'dashed', label: 'Dashed' },
            { value: 'dotted', label: 'Dotted' },
            { value: 'gradient', label: 'Gradient' },
            { value: 'wave', label: 'Wave' },
            { value: 'zigzag', label: 'Zigzag' },
          ]}
          onChange={(val) => updateData('style', val)}
        />
        <ColorPicker
          label="Color"
          value={data.color || '#e5e7eb'}
          onChange={(val) => updateData('color', val)}
        />
        {data.style === 'gradient' && (
          <ColorPicker
            label="Secondary Color"
            value={data.secondaryColor || '#27491F'}
            onChange={(val) => updateData('secondaryColor', val)}
          />
        )}
      </EditorSection>

      <EditorSection title="Dimensions" icon="straighten">
        <NumberInput
          label="Height"
          value={data.height || 1}
          onChange={(val) => updateData('height', val)}
          min={1}
          max={20}
          suffix="px"
        />
        <NumberInput
          label="Width"
          value={parseInt(data.width) || 100}
          onChange={(val) => updateData('width', `${val}%`)}
          min={10}
          max={100}
          suffix="%"
        />
      </EditorSection>

      <EditorSection title="Spacing" icon="space_bar">
        <NumberInput
          label="Vertical Spacing"
          value={data.spacing || 40}
          onChange={(val) => updateData('spacing', val)}
          max={100}
          suffix="px"
        />
      </EditorSection>
    </>
  );

  // ==================== IMAGE COMPARISON FULL EDITOR ====================
  const renderImageComparisonFullEditor = () => (
    <>
      <EditorSection title="Background" icon="format_color_fill">
        <ColorPicker
          label="Background Color"
          value={data.backgroundColor || style.backgroundColor || '#ffffff'}
          onChange={(val) => {
            updateStyle('backgroundColor', val);
            updateData('backgroundColor', val);
          }}
        />
      </EditorSection>

      <EditorSection title="Section Title" icon="title">
        <TextInput
          label="Title"
          value={data.title || ''}
          onChange={(val) => updateData('title', val)}
        />
        <TextInput
          label="Subtitle"
          value={data.subtitle || ''}
          onChange={(val) => updateData('subtitle', val)}
        />
      </EditorSection>

      <EditorSection title="Before Image" icon="image">
        <ImageUploader
          value={data.beforeImage || ''}
          onChange={(url) => updateData('beforeImage', url)}
        />
        <TextInput
          label="Before Label"
          value={data.beforeLabel || 'Before'}
          onChange={(val) => updateData('beforeLabel', val)}
        />
      </EditorSection>

      <EditorSection title="After Image" icon="image">
        <ImageUploader
          value={data.afterImage || ''}
          onChange={(url) => updateData('afterImage', url)}
        />
        <TextInput
          label="After Label"
          value={data.afterLabel || 'After'}
          onChange={(val) => updateData('afterLabel', val)}
        />
      </EditorSection>

      <EditorSection title="Slider Options" icon="tune" defaultOpen={false}>
        <NumberInput
          label="Initial Position"
          value={data.sliderPosition || 50}
          onChange={(val) => updateData('sliderPosition', val)}
          min={10}
          max={90}
          suffix="%"
        />
        <ColorPicker
          label="Slider Color"
          value={data.sliderColor || '#ffffff'}
          onChange={(val) => updateData('sliderColor', val)}
        />
        <ToggleSwitch
          label="Show Labels"
          value={data.showLabels !== false}
          onChange={(val) => updateData('showLabels', val)}
        />
        <SelectInput
          label="Orientation"
          value={data.orientation || 'horizontal'}
          options={[
            { value: 'horizontal', label: 'Horizontal' },
            { value: 'vertical', label: 'Vertical' },
          ]}
          onChange={(val) => updateData('orientation', val)}
        />
      </EditorSection>
    </>
  );

  // ==================== FOOTER FULL EDITOR ====================
  const renderFooterFullEditor = () => {
    const columns = data.columns || [];
    const socialLinks = data.socialLinks || [];
    const policyLinks = data.policyLinks || [];
    const isMinimal = data.layout === 'minimal';
    
    const addColumn = () => {
      updateData('columns', [...columns, { title: 'New Column', links: [{ label: 'Link', link: '#' }] }]);
    };
    
    const removeColumn = (index: number) => {
      updateData('columns', columns.filter((_: any, i: number) => i !== index));
    };
    
    const addSocialLink = () => {
      const platformNames: { [key: string]: string } = {
        'Facebook': 'Facebook',
        'Instagram': 'Instagram', 
        'TikTok': 'TikTok',
        'Twitter': 'Twitter'
      };
      updateData('socialLinks', [...socialLinks, { platform: 'Facebook', icon: 'facebook', link: '' }]);
    };
    
    const removeSocialLink = (index: number) => {
      updateData('socialLinks', socialLinks.filter((_: any, i: number) => i !== index));
    };

    const addPolicyLink = () => {
      updateData('policyLinks', [...policyLinks, { label: 'New Link', link: '#' }]);
    };

    const removePolicyLink = (index: number) => {
      updateData('policyLinks', policyLinks.filter((_: any, i: number) => i !== index));
    };

    const updatePolicyLink = (index: number, field: string, value: string) => {
      const newLinks = [...policyLinks];
      newLinks[index] = { ...newLinks[index], [field]: value };
      updateData('policyLinks', newLinks);
    };

    const addColumnLink = (colIndex: number) => {
      const newCols = [...columns];
      const col = newCols[colIndex];
      col.links = [...(col.links || []), { label: 'New Link', link: '#' }];
      updateData('columns', newCols);
    };

    const removeColumnLink = (colIndex: number, linkIndex: number) => {
      const newCols = [...columns];
      newCols[colIndex].links = newCols[colIndex].links.filter((_: any, i: number) => i !== linkIndex);
      updateData('columns', newCols);
    };

    const updateColumnLink = (colIndex: number, linkIndex: number, field: string, value: string) => {
      const newCols = [...columns];
      newCols[colIndex].links[linkIndex] = { ...newCols[colIndex].links[linkIndex], [field]: value };
      updateData('columns', newCols);
    };

    // Handle layout change with appropriate color defaults
    const handleLayoutChange = (newLayout: string) => {
      const isNewMinimal = newLayout === 'minimal';
      const wasMinimal = data.layout === 'minimal';
      
      // If switching layouts, update colors to appropriate defaults
      if (isNewMinimal !== wasMinimal) {
        if (isNewMinimal) {
          // Switching to minimal - use light theme (single combined update)
          onUpdateSection({
            ...section,
            data: { 
              ...data, 
              layout: newLayout, 
              backgroundColor: '#ffffff', 
              textColor: '#1f2937',
              borderColor: '#e5e7eb'
            },
            style: { ...style, backgroundColor: '#ffffff', color: '#1f2937' }
          });
        } else {
          // Switching to classic - use dark theme (single combined update)
          onUpdateSection({
            ...section,
            data: { 
              ...data, 
              layout: newLayout, 
              backgroundColor: '#1f2937', 
              textColor: '#ffffff' 
            },
            style: { ...style, backgroundColor: '#1f2937', color: '#ffffff' }
          });
        }
      } else {
        updateData('layout', newLayout);
      }
    };

    return (
      <>
        {/* Mode indicator */}
        <div className={`px-3 py-2 text-xs font-medium ${isMinimal ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'}`}>
          {isMinimal ? '✨ Editing Minimal Footer' : '📊 Editing Classic Footer'}
        </div>

        <EditorSection title="Layout" icon="view_module" defaultOpen={true}>
          <SelectInput
            label="Footer Style"
            value={data.layout || 'classic'}
            options={[
              { value: 'classic', label: 'Classic (Multi-column)' },
              { value: 'minimal', label: 'Minimal (Single line)' },
            ]}
            onChange={handleLayoutChange}
          />
        </EditorSection>

        <EditorSection title="Colors" icon="format_color_fill" defaultOpen={true}>
          <ColorPicker
            label="Background Color"
            value={data.backgroundColor || style.backgroundColor || (isMinimal ? '#ffffff' : '#1f2937')}
            onChange={(val) => {
              // Combined update to avoid race condition
              onUpdateSection({
                ...section,
                data: { ...data, backgroundColor: val },
                style: { ...style, backgroundColor: val }
              });
            }}
          />
          <ColorPicker
            label="Text Color"
            value={data.textColor || style.color || (isMinimal ? '#1f2937' : '#ffffff')}
            onChange={(val) => {
              // Combined update to avoid race condition
              onUpdateSection({
                ...section,
                data: { ...data, textColor: val },
                style: { ...style, color: val }
              });
            }}
          />
          {isMinimal && (
            <ColorPicker
              label="Border Color"
              value={data.borderColor || '#e5e7eb'}
              onChange={(val) => updateData('borderColor', val)}
            />
          )}
          {!isMinimal && (
            <>
              <ColorPicker
                label="Social Icon Background"
                value={data.socialIconBackgroundColor || '#1f2937'}
                onChange={(val) => updateData('socialIconBackgroundColor', val)}
              />
              <ColorPicker
                label="Social Icon Hover"
                value={data.socialIconHoverBackgroundColor || '#27491F'}
                onChange={(val) => updateData('socialIconHoverBackgroundColor', val)}
              />
            </>
          )}
          
          {/* Color Presets */}
          <div className="mt-3">
            <label className="text-xs text-gray-600 block mb-2">Quick Presets</label>
            <div className="grid grid-cols-2 gap-2">
              {(isMinimal ? [
                { bg: '#ffffff', text: '#1f2937', border: '#e5e7eb', name: 'Light' },
                { bg: '#f9fafb', text: '#374151', border: '#e5e7eb', name: 'Gray' },
                { bg: '#1f2937', text: '#ffffff', border: '#374151', name: 'Dark' },
                { bg: '#111827', text: '#f9fafb', border: '#1f2937', name: 'Slate' },
                { bg: '#27491F', text: '#ffffff', border: '#1f4914', name: 'Forest' },
                { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', name: 'Amber' },
              ] : [
                { bg: '#1f2937', text: '#ffffff', name: 'Dark' },
                { bg: '#111827', text: '#f9fafb', name: 'Slate' },
                { bg: '#27491F', text: '#ffffff', name: 'Forest' },
                { bg: '#7c3aed', text: '#ffffff', name: 'Purple' },
              ]).map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    onUpdateSection({
                      ...section,
                      data: { 
                        ...data, 
                        backgroundColor: preset.bg, 
                        textColor: preset.text,
                        ...(isMinimal && { borderColor: (preset as any).border })
                      },
                      style: { ...style, backgroundColor: preset.bg, color: preset.text }
                    });
                  }}
                  className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:border-primary transition-colors text-left"
                >
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold"
                    style={{ backgroundColor: preset.bg, color: preset.text }}
                  >
                    Aa
                  </div>
                  <span className="text-[10px] text-gray-600">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        </EditorSection>

        <EditorSection title="Brand" icon="branding_watermark" defaultOpen={true}>
          <TextInput
            label="Logo Text"
            value={data.logoText || ''}
            onChange={(val) => updateData('logoText', val)}
            placeholder="BRAND"
          />
          <div className="mt-2">
            <label className="text-xs text-gray-600 mb-1 block">Logo Image</label>
            <ImageUploader
              value={data.logo || ''}
              onChange={(url) => updateData('logo', url)}
            />
          </div>
          <TextInput
            label="Tagline"
            value={data.tagline || ''}
            onChange={(val) => updateData('tagline', val)}
            placeholder="Your brand description"
          />
          <TextInput
            label="Copyright Text"
            value={data.copyrightText || ''}
            onChange={(val) => updateData('copyrightText', val)}
            placeholder="© 2024 Company Name"
          />
        </EditorSection>

        {/* Minimal Layout - Policy Links */}
        {isMinimal && (
          <EditorSection title="Footer Links" icon="link" defaultOpen={true}>
            <p className="text-xs text-gray-500 mb-3">Links shown in the bottom bar</p>
            <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
              {policyLinks.map((link: any, index: number) => (
                <div key={index} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">Link {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removePolicyLink(index)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <span className="material-icons text-xs">delete</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={link.label || ''}
                      onChange={(e) => updatePolicyLink(index, 'label', e.target.value)}
                      placeholder="Link text"
                      className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex items-center gap-1">
                      <SelectInput
                        label=""
                        value={link.linkType || 'custom'}
                        options={[
                          { value: 'custom', label: 'Custom URL' },
                          { value: 'page', label: 'Site Page' },
                        ]}
                        onChange={(val) => updatePolicyLink(index, 'linkType', val)}
                      />
                      {link.linkType === 'page' ? (
                        <select
                          value={link.link || ''}
                          onChange={(e) => updatePolicyLink(index, 'link', e.target.value)}
                          className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">Select page...</option>
                          <optgroup label="Store Pages">
                            <option value="/products">All Products</option>
                            <option value="/cart">Shopping Cart</option>
                            <option value="/favorites">Favorites</option>
                          </optgroup>
                          <optgroup label="Info Pages">
                            <option value="/about-us">About Us</option>
                            <option value="/faq">FAQ</option>
                          </optgroup>
                          <optgroup label="Policy Pages">
                            <option value="/privacy-policy">Privacy Policy</option>
                            <option value="/terms-of-service">Terms of Service</option>
                            <option value="/shipping-policy">Shipping Policy</option>
                            <option value="/return-policy">Return Policy</option>
                          </optgroup>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={link.link || ''}
                          onChange={(e) => updatePolicyLink(index, 'link', e.target.value)}
                          placeholder="https://..."
                          className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addPolicyLink}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-colors text-xs flex items-center justify-center gap-1"
            >
              <span className="material-icons text-sm">add</span>
              Add Footer Link
            </button>
          </EditorSection>
        )}

        {/* Classic Layout - Columns */}
        {!isMinimal && (
          <EditorSection title="Columns" icon="view_column">
            <div className="space-y-3 mb-3 max-h-72 overflow-y-auto">
              {columns.map((col: any, colIndex: number) => (
                <div key={colIndex} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <input
                      type="text"
                      value={col.title || ''}
                      onChange={(e) => {
                        const newCols = [...columns];
                        newCols[colIndex] = { ...col, title: e.target.value };
                        updateData('columns', newCols);
                      }}
                      placeholder="Column Title"
                      className="flex-1 text-xs font-medium px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => removeColumn(colIndex)}
                      className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <span className="material-icons text-sm">delete</span>
                    </button>
                  </div>
                  
                  {/* Column Links */}
                  <div className="space-y-1.5 mb-2">
                    {(col.links || []).map((link: any, linkIndex: number) => (
                      <div key={linkIndex} className="flex items-center gap-1 bg-white rounded p-1.5 border border-gray-100">
                        <input
                          type="text"
                          value={link.label || ''}
                          onChange={(e) => updateColumnLink(colIndex, linkIndex, 'label', e.target.value)}
                          placeholder="Label"
                          className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded"
                        />
                        <input
                          type="text"
                          value={link.link || ''}
                          onChange={(e) => updateColumnLink(colIndex, linkIndex, 'link', e.target.value)}
                          placeholder="URL"
                          className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded"
                        />
                        <button
                          type="button"
                          onClick={() => removeColumnLink(colIndex, linkIndex)}
                          className="p-0.5 text-red-400 hover:text-red-600"
                        >
                          <span className="material-icons text-xs">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addColumnLink(colIndex)}
                    className="w-full py-1 text-xs text-gray-500 hover:text-primary flex items-center justify-center gap-0.5"
                  >
                    <span className="material-icons text-xs">add</span>
                    Add Link
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addColumn}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-colors text-xs flex items-center justify-center gap-1"
            >
              <span className="material-icons text-sm">add</span>
              Add Column
            </button>
          </EditorSection>
        )}

        <EditorSection title="Social Links" icon="share" defaultOpen={true}>
          <div className="space-y-2 mb-3">
            {socialLinks.map((link: any, index: number) => (
              <div key={index} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <SelectInput
                    label=""
                    value={link.platform || 'Facebook'}
                    options={[
                      { value: 'Facebook', label: 'Facebook' },
                      { value: 'Twitter', label: 'Twitter/X' },
                      { value: 'Instagram', label: 'Instagram' },
                      { value: 'TikTok', label: 'TikTok' },
                      { value: 'linkedin', label: 'LinkedIn' },
                      { value: 'youtube', label: 'YouTube' },
                    ]}
                    onChange={(val) => {
                      const newLinks = [...socialLinks];
                      newLinks[index] = { ...link, platform: val, icon: val.toLowerCase() };
                      updateData('socialLinks', newLinks);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeSocialLink(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <span className="material-icons text-xs">delete</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={link.link || ''}
                  onChange={(e) => {
                    const newLinks = [...socialLinks];
                    newLinks[index] = { ...link, link: e.target.value };
                    updateData('socialLinks', newLinks);
                  }}
                  placeholder="https://facebook.com/yourpage"
                  className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addSocialLink}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-colors text-xs flex items-center justify-center gap-1"
          >
            <span className="material-icons text-sm">add</span>
            Add Social Link
          </button>
        </EditorSection>

        {/* Newsletter - Show for both layouts */}
        <EditorSection title="Newsletter" icon="mail" defaultOpen={false}>
          <ToggleSwitch
            label={isMinimal ? "Show Newsletter Input" : "Show Newsletter Section"}
            value={data.showNewsletter !== false}
            onChange={(val) => updateData('showNewsletter', val)}
          />
          {(data.showNewsletter !== false) && (
            <>
              {!isMinimal && (
                <TextInput
                  label="Newsletter Title"
                  value={data.newsletterText || ''}
                  onChange={(val) => updateData('newsletterText', val)}
                  placeholder="Subscribe to our newsletter"
                />
              )}
              <TextInput
                label="Placeholder Text"
                value={data.newsletterPlaceholder || 'Email address'}
                onChange={(val) => updateData('newsletterPlaceholder', val)}
              />
            </>
          )}
        </EditorSection>
      </>
    );
  };

  const renderGenericEditor = () => {
    // Route to appropriate full editor based on section type
    switch (section.type) {
      case 'navbar':
        return renderNavbarLayoutEditor();
      case 'banner':
        return renderBannerFullEditor();
      case 'hero':
        return renderHeroFullEditor();
      case 'products':
        return renderProductsFullEditor();
      case 'deals':
        return renderDealsFullEditor();
      case 'collections':
        return renderCollectionsFullEditor();
      case 'features':
        return renderFeaturesFullEditor();
      case 'testimonials':
        return renderTestimonialsFullEditor();
      case 'cta':
        return renderCTAFullEditor();
      case 'about':
        return renderAboutFullEditor();
      case 'contact':
        return renderContactFullEditor();
      case 'gallery':
        return renderGalleryFullEditor();
      case 'pricing':
        return renderPricingFullEditor();
      case 'faq':
        return renderFAQFullEditor();
      case 'stats':
        return renderStatsFullEditor();
      case 'team':
        return renderTeamFullEditor();
      case 'services':
        return renderServicesFullEditor();
      case 'video':
        return renderVideoFullEditor();
      case 'countdown':
        return renderCountdownFullEditor();
      case 'partners':
        return renderPartnersFullEditor();
      case 'newsletter':
        return renderNewsletterFullEditor();
      case 'divider':
        return renderDividerFullEditor();
      case 'imageComparison':
        return renderImageComparisonFullEditor();
      case 'footer':
        return renderFooterFullEditor();
      default:
        return (
          <EditorSection title="Section Settings" icon="settings">
            <TextInput
              label="Title"
              value={data.title || ''}
              onChange={(val) => updateData('title', val)}
            />
            {data.subtitle !== undefined && (
              <TextInput
                label="Subtitle"
                value={data.subtitle || ''}
                onChange={(val) => updateData('subtitle', val)}
              />
            )}
            <ColorPicker
              label="Background"
              value={style.backgroundColor || data.backgroundColor || '#ffffff'}
              onChange={(val) => {
                updateStyle('backgroundColor', val);
                updateData('backgroundColor', val);
              }}
            />
            <ColorPicker
              label="Text Color"
              value={style.textColor || data.textColor || '#1f2937'}
              onChange={(val) => {
                updateStyle('textColor', val);
                updateData('textColor', val);
              }}
            />
          </EditorSection>
        );
    }
  };

  // Render appropriate editor based on element type
  const renderEditor = () => {
    // For navbar section, show layout editor by default
    if (section.type === 'navbar' && selectedElement.type === 'background') {
      return renderNavbarLayoutEditor();
    }

    // For banner section, handle specific element types
    if (section.type === 'banner') {
      switch (selectedElement.type) {
        case 'background':
          return renderBannerBackgroundEditor();
        case 'title':
        case 'description':
          return renderBannerTextEditor();
        case 'button':
        case 'link':
          return renderBannerButtonEditor();
        default:
          return renderBannerFullEditor();
      }
    }

    // For hero section, handle specific element types
    if (section.type === 'hero') {
      switch (selectedElement.type) {
        case 'background':
          return renderHeroBackgroundEditor();
        case 'title':
          return renderHeroTitleEditor();
        case 'subtitle':
          return renderHeroSubtitleEditor();
        case 'button':
        case 'link':
          return renderHeroButtonEditor();
        case 'icon':
          return renderHeroNavigationEditor();
        default:
          return renderHeroFullEditor();
      }
    }

    // For products section, handle specific element types
    if (section.type === 'products') {
      switch (selectedElement.type) {
        case 'title':
        case 'subtitle':
          return renderProductsTitleEditor();
        case 'card':
        case 'product':
          return renderProductsSelectionEditor();
        case 'background':
          return renderProductsFullEditor();
        default:
          return renderProductsFullEditor();
      }
    }

    // For deals section, handle specific element types
    if (section.type === 'deals') {
      switch (selectedElement.type) {
        case 'title':
          return renderDealsTitleEditor();
        case 'button':
          return renderDealsTitleEditor();
        case 'card':
        case 'image':
          return renderDealsCardStyleEditor();
        case 'background':
          return renderDealsFullEditor();
        default:
          return renderDealsFullEditor();
      }
    }

    // For collections section, handle specific element types
    if (section.type === 'collections') {
      switch (selectedElement.type) {
        case 'title':
          return renderCollectionsTitleEditor();
        case 'subtitle':
          return renderCollectionsTitleEditor();
        case 'collection-card':
          return renderCollectionsCardStyleEditor();
        case 'collection-button':
          return renderCollectionsButtonEditor();
        case 'collection':
          return renderCollectionsEditor();
        case 'background':
          return renderCollectionsFullEditor();
        default:
          return renderCollectionsFullEditor();
      }
    }

    // For features section
    if (section.type === 'features') {
      return renderFeaturesFullEditor();
    }

    // For testimonials section
    if (section.type === 'testimonials') {
      return renderTestimonialsFullEditor();
    }

    // For CTA section
    if (section.type === 'cta') {
      return renderCTAFullEditor();
    }

    // For about section
    if (section.type === 'about') {
      return renderAboutFullEditor();
    }

    // For contact section
    if (section.type === 'contact') {
      return renderContactFullEditor();
    }

    // For gallery section
    if (section.type === 'gallery') {
      return renderGalleryFullEditor();
    }

    // For pricing section
    if (section.type === 'pricing') {
      return renderPricingFullEditor();
    }

    // For FAQ section
    if (section.type === 'faq') {
      return renderFAQFullEditor();
    }

    // For stats section
    if (section.type === 'stats') {
      return renderStatsFullEditor();
    }

    // For team section
    if (section.type === 'team') {
      return renderTeamFullEditor();
    }

    // For services section
    if (section.type === 'services') {
      return renderServicesFullEditor();
    }

    // For video section
    if (section.type === 'video') {
      return renderVideoFullEditor();
    }

    // For countdown section
    if (section.type === 'countdown') {
      return renderCountdownFullEditor();
    }

    // For partners section
    if (section.type === 'partners') {
      return renderPartnersFullEditor();
    }

    // For newsletter section
    if (section.type === 'newsletter') {
      return renderNewsletterFullEditor();
    }

    // For divider section
    if (section.type === 'divider') {
      return renderDividerFullEditor();
    }

    // For image comparison section
    if (section.type === 'imageComparison') {
      return renderImageComparisonFullEditor();
    }

    // For footer section
    if (section.type === 'footer') {
      console.log('[FOOTER EDITOR] Rendering footer editor, section:', section);
      const footerData = data as any;
      const isMinimal = footerData.layout === 'minimal';
      
      return (
        <div className="p-3 space-y-4">
          {/* Layout Selector */}
          <div className="bg-gray-50 rounded-lg p-3">
            <label className="text-xs font-medium text-gray-700 block mb-2">Footer Style</label>
            <select
              value={footerData.layout || 'classic'}
              onChange={(e) => {
                const newLayout = e.target.value;
                const newBg = newLayout === 'minimal' ? '#ffffff' : '#1f2937';
                const newText = newLayout === 'minimal' ? '#1f2937' : '#ffffff';
                onUpdateSection({
                  ...section,
                  data: { ...data, layout: newLayout, backgroundColor: newBg, textColor: newText },
                  style: { ...style, backgroundColor: newBg, color: newText }
                });
              }}
              className="w-full px-3 py-2 text-sm border rounded-lg"
            >
              <option value="classic">Classic (Multi-column)</option>
              <option value="minimal">Minimal (Single line)</option>
            </select>
          </div>

          {/* Background Color */}
          <div className="bg-gray-50 rounded-lg p-3">
            <label className="text-xs font-medium text-gray-700 block mb-2">Background Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={footerData.backgroundColor || (isMinimal ? '#ffffff' : '#1f2937')}
                onChange={(e) => {
                  onUpdateSection({
                    ...section,
                    data: { ...data, backgroundColor: e.target.value },
                    style: { ...style, backgroundColor: e.target.value }
                  });
                }}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <input
                type="text"
                value={footerData.backgroundColor || (isMinimal ? '#ffffff' : '#1f2937')}
                onChange={(e) => {
                  onUpdateSection({
                    ...section,
                    data: { ...data, backgroundColor: e.target.value },
                    style: { ...style, backgroundColor: e.target.value }
                  });
                }}
                className="flex-1 px-2 py-1 text-xs border rounded"
              />
            </div>
          </div>

          {/* Text Color */}
          <div className="bg-gray-50 rounded-lg p-3">
            <label className="text-xs font-medium text-gray-700 block mb-2">Text Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={footerData.textColor || (isMinimal ? '#1f2937' : '#ffffff')}
                onChange={(e) => {
                  onUpdateSection({
                    ...section,
                    data: { ...data, textColor: e.target.value },
                    style: { ...style, color: e.target.value }
                  });
                }}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <input
                type="text"
                value={footerData.textColor || (isMinimal ? '#1f2937' : '#ffffff')}
                onChange={(e) => {
                  onUpdateSection({
                    ...section,
                    data: { ...data, textColor: e.target.value },
                    style: { ...style, color: e.target.value }
                  });
                }}
                className="flex-1 px-2 py-1 text-xs border rounded"
              />
            </div>
          </div>

          {/* Quick Color Presets */}
          <div className="bg-gray-50 rounded-lg p-3">
            <label className="text-xs font-medium text-gray-700 block mb-2">Quick Presets</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { bg: '#ffffff', text: '#1f2937', name: 'Light' },
                { bg: '#f3f4f6', text: '#374151', name: 'Gray' },
                { bg: '#1f2937', text: '#ffffff', name: 'Dark' },
                { bg: '#111827', text: '#f9fafb', name: 'Slate' },
                { bg: '#27491F', text: '#ffffff', name: 'Forest' },
                { bg: '#7c3aed', text: '#ffffff', name: 'Purple' },
              ].map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    onUpdateSection({
                      ...section,
                      data: { ...data, backgroundColor: preset.bg, textColor: preset.text },
                      style: { ...style, backgroundColor: preset.bg, color: preset.text }
                    });
                  }}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg border hover:border-primary transition-colors"
                >
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: preset.bg, color: preset.text }}
                  >
                    Aa
                  </div>
                  <span className="text-[9px] text-gray-600">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Brand Settings */}
          <div className="bg-gray-50 rounded-lg p-3">
            <label className="text-xs font-medium text-gray-700 block mb-2">Brand</label>
            <input
              type="text"
              value={footerData.logoText || 'BRAND'}
              onChange={(e) => updateData('logoText', e.target.value)}
              placeholder="Brand Name"
              className="w-full px-3 py-2 text-sm border rounded-lg mb-2"
            />
            <textarea
              value={footerData.tagline || ''}
              onChange={(e) => updateData('tagline', e.target.value)}
              placeholder="Tagline / Description"
              rows={2}
              className="w-full px-3 py-2 text-sm border rounded-lg"
            />
          </div>

          {/* Copyright */}
          <div className="bg-gray-50 rounded-lg p-3">
            <label className="text-xs font-medium text-gray-700 block mb-2">Copyright</label>
            <input
              type="text"
              value={footerData.copyrightText || '© 2024 Brand. All rights reserved.'}
              onChange={(e) => updateData('copyrightText', e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg"
            />
          </div>
        </div>
      );
    }

    switch (selectedElement.type) {
      case 'background':
        return renderBackgroundEditor();
      case 'title':
        return renderTitleEditor();
      case 'subtitle':
        return renderSubtitleEditor();
      case 'description':
        return renderDescriptionEditor();
      case 'button':
        return renderButtonEditor();
      case 'card':
      case 'product':
        return renderCardEditor();
      case 'image':
        return renderImageEditor();
      case 'feature':
        return renderFeatureEditor();
      case 'teamMember':
        return renderTeamMemberEditor();
      case 'testimonial':
        return renderTestimonialEditor();
      case 'stat':
        return renderStatEditor();
      case 'faqItem':
        return renderFaqItemEditor();
      case 'countdown':
        return renderCountdownEditor();
      case 'video':
        return renderVideoEditor();
      case 'divider':
        return renderDividerEditor();
      case 'menuItem':
        return renderMenuItemEditor();
      case 'link':
        if (section.type === 'navbar') {
          return renderMenuItemEditor();
        }
        return renderGenericEditor();
      default:
        return renderGenericEditor();
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-gray-100 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClearSelection}
              className="p-1.5 hover:bg-white rounded-lg transition-colors shadow-sm bg-white/80"
            >
              <span className="material-icons text-sm text-gray-600">arrow_back</span>
            </button>
            <div>
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                <span className="material-icons text-primary text-base">
                  {selectedElement.type === 'background' ? 'format_color_fill' :
                   selectedElement.type === 'title' ? 'title' :
                   selectedElement.type === 'subtitle' ? 'text_fields' :
                   selectedElement.type === 'button' ? 'smart_button' :
                   selectedElement.type === 'image' ? 'image' :
                   selectedElement.type === 'card' || selectedElement.type === 'product' ? 'dashboard' :
                   selectedElement.type === 'feature' ? 'star' :
                   selectedElement.type === 'testimonial' ? 'format_quote' :
                   selectedElement.type === 'countdown' ? 'timer' :
                   selectedElement.type === 'video' ? 'play_circle' :
                   'edit'}
                </span>
                Edit {elementLabel}
              </h3>
              {selectedElement.index !== undefined && (
                <p className="text-[10px] text-gray-500">Item #{selectedElement.index + 1}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        {renderEditor()}
      </div>

      {/* Footer hint */}
      <div className="flex-shrink-0 p-2 bg-gray-50 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 text-center">
          Click another element to edit it, or click Back to see all sections
        </p>
      </div>
    </div>
  );
};

export default ContextualEditor;
