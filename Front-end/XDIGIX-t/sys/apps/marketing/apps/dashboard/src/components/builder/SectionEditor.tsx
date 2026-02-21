import { useState, useEffect } from 'react';
import { Section, SectionType, SelectedProduct, ProductCardStyle } from '../../types/builder';
import ImageUploader from './ImageUploader';
import RichTextEditor from './RichTextEditor';
import { useCollections } from '../../hooks/useCollections';
import { useProducts } from '../../hooks/useProducts';

const defaultCardStyle: ProductCardStyle = {
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  priceColor: '#6b7280',
  borderRadius: 12,
  shadow: 'md',
  imageAspect: 'square',
  imageFit: 'cover',
  imageBackgroundColor: '#f3f4f6',
  buttonBackgroundColor: '#27491F',
  buttonTextColor: '#ffffff',
  buttonBorderRadius: 8,
  buttonFullWidth: true,
  showBorder: true,
  borderColor: '#e5e7eb'
};

type Props = {
  section: Section;
  onUpdate: (data: any) => void;
  onClose: () => void;
  businessId?: string;
  siteId?: string;
};

const SectionEditor = ({ section, onUpdate, onClose, businessId, siteId }: Props) => {
  const { collections, isLoading: collectionsLoading } = useCollections(businessId);
  const { products, isLoading: productsLoading } = useProducts(businessId);
  const [formData, setFormData] = useState(section.data);
  const [productSearchTerm, setProductSearchTerm] = useState('');

  useEffect(() => {
    setFormData(section.data);
  }, [section]);

  const handleChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onUpdate(newData);
  };

  const handleArrayChange = (field: string, index: number, value: any) => {
    const array = [...(formData[field] || [])];
    array[index] = { ...array[index], ...value };
    handleChange(field, array);
  };

  const handleAddArrayItem = (field: string, defaultItem: any) => {
    const array = [...(formData[field] || [])];
    array.push(defaultItem);
    handleChange(field, array);
  };

  const handleRemoveArrayItem = (field: string, index: number) => {
    const array = [...(formData[field] || [])];
    array.splice(index, 1);
    handleChange(field, array);
  };

  const renderEditor = () => {
    switch (section.type) {
      case 'navbar':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Logo Text</label>
              <input
                type="text"
                value={formData.logoText || ''}
                onChange={(e) => handleChange('logoText', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="MADAS"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Logo Image</label>
              <ImageUploader
                currentUrl={formData.logo}
                onUpload={(url) => handleChange('logo', url)}
                label=""
              />
              <input
                type="url"
                value={formData.logo || ''}
                onChange={(e) => handleChange('logo', e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Or enter logo URL manually"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-madas-text/80">Menu Items</label>
                <button
                  type="button"
                  onClick={() => handleAddArrayItem('menuItems', { label: 'New Item', link: '#', badge: '', collectionId: '', collectionName: '' })}
                  className="text-xs text-primary hover:underline"
                >
                  + Add Menu Item
                </button>
              </div>
              <div className="space-y-3">
                {(formData.menuItems || []).map((item: any, index: number) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-madas-text/70">Menu Item {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveArrayItem('menuItems', index)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="text"
                      value={item.label || ''}
                      onChange={(e) => handleArrayChange('menuItems', index, { label: e.target.value })}
                      placeholder="Label"
                      className="w-full mb-2 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <div className="mb-2">
                      <label className="block text-xs text-madas-text/60 mb-1">Collection (products to display)</label>
                      <select
                        value={item.collectionId || ''}
                        onChange={(e) => {
                          const selectedCollection = collections.find(c => c.id === e.target.value);
                          const baseUrl = siteId ? `/site/${siteId}` : '';
                          handleArrayChange('menuItems', index, {
                            collectionId: e.target.value,
                            collectionName: selectedCollection?.name || '',
                            link: e.target.value ? `${baseUrl}/products?collection=${e.target.value}` : (item.link || '#')
                          });
                        }}
                        className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-white"
                      >
                        <option value="">No collection (custom link)</option>
                        {collectionsLoading ? (
                          <option disabled>Loading collections...</option>
                        ) : collections.length === 0 ? (
                          <option disabled>No collections found</option>
                        ) : (
                          collections.map((col) => (
                            <option key={col.id} value={col.id}>
                              {col.name} ({col.productCount || 0} products){col.status !== 'active' ? ` [${col.status}]` : ''}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    {!item.collectionId && (
                    <input
                      type="text"
                      value={item.link || ''}
                      onChange={(e) => handleArrayChange('menuItems', index, { link: e.target.value })}
                        placeholder="Custom link URL"
                      className="w-full mb-2 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    )}
                    {item.collectionId && (
                      <div className="mb-2 text-xs text-madas-text/60 bg-gray-50 px-2 py-1 rounded">
                        Links to: /products?collection={item.collectionId}
                      </div>
                    )}
                    <input
                      type="text"
                      value={item.badge || ''}
                      onChange={(e) => handleArrayChange('menuItems', index, { badge: e.target.value })}
                      placeholder="Badge (optional, e.g., NEW)"
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={formData.showSearch || false}
                  onChange={(e) => handleChange('showSearch', e.target.checked)}
                  className="rounded border-gray-200"
                />
                <span className="text-sm text-madas-text/80">Show Search</span>
              </label>
              {formData.showSearch && (
                <input
                  type="text"
                  value={formData.searchPlaceholder || ''}
                  onChange={(e) => handleChange('searchPlaceholder', e.target.value)}
                  placeholder="Search placeholder text"
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={formData.showCart || false}
                  onChange={(e) => handleChange('showCart', e.target.checked)}
                  className="rounded border-gray-200"
                />
                <span className="text-sm text-madas-text/80">Show Cart Icon</span>
              </label>
              {formData.showCart && (
                <>
                <input
                    type="text"
                    value={formData.cartUrl || ''}
                    onChange={(e) => handleChange('cartUrl', e.target.value)}
                    placeholder="Cart link URL (e.g., https://mystore.com/cart)"
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                  <p className="mt-1 text-xs text-madas-text/50">Leave empty to disable click</p>
                </>
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={formData.showWishlist || false}
                  onChange={(e) => handleChange('showWishlist', e.target.checked)}
                  className="rounded border-gray-200"
                />
                <span className="text-sm text-madas-text/80">Show Wishlist Icon</span>
              </label>
              {formData.showWishlist && (
                <>
                <input
                    type="text"
                    value={formData.wishlistUrl || ''}
                    onChange={(e) => handleChange('wishlistUrl', e.target.value)}
                    placeholder="Wishlist link URL (e.g., https://mystore.com/wishlist)"
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                  <p className="mt-1 text-xs text-madas-text/50">Leave empty to disable click</p>
                </>
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={formData.showUserIcon || false}
                  onChange={(e) => handleChange('showUserIcon', e.target.checked)}
                  className="rounded border-gray-200"
                />
                <span className="text-sm text-madas-text/80">Show User Icon</span>
              </label>
              {formData.showUserIcon && (
                <>
                  <input
                    type="text"
                    value={formData.userIconUrl || ''}
                    onChange={(e) => handleChange('userIconUrl', e.target.value)}
                    placeholder="Login/Account link URL (e.g., https://mystore.com/login)"
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <p className="mt-1 text-xs text-madas-text/50">Leave empty to disable click</p>
                </>
              )}
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.sticky || false}
                  onChange={(e) => handleChange('sticky', e.target.checked)}
                  className="rounded border-gray-200"
                />
                <span className="text-sm text-madas-text/80">Sticky Navigation</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Background Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.backgroundColor || '#ffffff'}
                  onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  className="w-16 h-10 rounded border border-gray-200"
                />
                <input
                  type="text"
                  value={formData.backgroundColor || ''}
                  onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  placeholder="#ffffff"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Text Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.textColor || '#27491F'}
                  onChange={(e) => handleChange('textColor', e.target.value)}
                  className="w-16 h-10 rounded border border-gray-200"
                />
                <input
                  type="text"
                  value={formData.textColor || ''}
                  onChange={(e) => handleChange('textColor', e.target.value)}
                  placeholder="#27491F"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          </div>
        );

      case 'hero':
        const isCarousel = formData.isCarousel || false;
        
        return (
          <div className="space-y-4">
            {/* Carousel Toggle */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isCarousel}
                  onChange={(e) => handleChange('isCarousel', e.target.checked)}
                  className="rounded border-gray-200"
                />
                <span className="text-sm font-medium text-madas-text/80">Enable Carousel</span>
              </label>
            </div>

            {isCarousel ? (
              // Carousel Mode
              <div className="space-y-4">
                {/* Autoplay Settings */}
                <div className="border-t border-gray-200 pt-4">
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={formData.autoplay || false}
                      onChange={(e) => handleChange('autoplay', e.target.checked)}
                      className="rounded border-gray-200"
                    />
                    <span className="text-sm text-madas-text/80">Enable Autoplay</span>
                  </label>
                  {formData.autoplay && (
                    <div className="mt-2">
                      <label className="block text-xs text-madas-text/60 mb-1">Autoplay Interval (ms)</label>
                      <input
                        type="number"
                        value={formData.autoplayInterval || 5000}
                        onChange={(e) => handleChange('autoplayInterval', parseInt(e.target.value) || 5000)}
                        min="1000"
                        step="500"
                        className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Slides Management */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-madas-text/80">Slides</label>
                    <button
                      type="button"
                      onClick={() => handleAddArrayItem('slides', {
                        title: 'New Slide',
                        subtitle: 'Slide description',
                        buttonText: 'Learn More',
                        buttonLink: '#',
                        backgroundImage: '',
                        backgroundColor: 'linear-gradient(135deg, #27491F 0%, #F0CAE1 100%)',
                        textColor: '#FFFFFF'
                      })}
                      className="text-xs text-primary hover:underline"
                    >
                      + Add Slide
                    </button>
                  </div>
                  <div className="space-y-3">
                    {(formData.slides || []).length === 0 ? (
                      <p className="text-xs text-madas-text/60 text-center py-4">No slides yet. Add your first slide above.</p>
                    ) : (
                      (formData.slides || []).map((slide: any, index: number) => (
                        <div key={index} className="p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-madas-text/70">Slide {index + 1}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveArrayItem('slides', index)}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs text-madas-text/60 mb-1">Title</label>
                              <RichTextEditor
                                value={slide.title || ''}
                                onChange={(value) => handleArrayChange('slides', index, { title: value })}
                                placeholder="Title (select text and use color button)"
                                className="text-xs min-h-[100px]"
                              />
                              <p className="text-[10px] text-madas-text/60 mt-1">💡 Select text → Choose color → Click Apply</p>
                            </div>
                            <div>
                              <label className="block text-xs text-madas-text/60 mb-1">Subtitle</label>
                              <RichTextEditor
                                value={slide.subtitle || ''}
                                onChange={(value) => handleArrayChange('slides', index, { subtitle: value })}
                                placeholder="Subtitle (select text and use color button)"
                                className="text-xs min-h-[100px]"
                              />
                              <p className="text-[10px] text-madas-text/60 mt-1">💡 Select text → Choose color → Click Apply</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={slide.buttonText || ''}
                                onChange={(e) => handleArrayChange('slides', index, { buttonText: e.target.value })}
                                placeholder="Button Text"
                                className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                              />
                              <input
                                type="text"
                                value={slide.buttonLink || ''}
                                onChange={(e) => handleArrayChange('slides', index, { buttonLink: e.target.value })}
                                placeholder="Button Link"
                                className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-madas-text/60 mb-1">Background Image</label>
                              <ImageUploader
                                currentUrl={slide.backgroundImage}
                                onUpload={(url) => handleArrayChange('slides', index, { backgroundImage: url })}
                                label=""
                              />
                              <input
                                type="url"
                                value={slide.backgroundImage || ''}
                                onChange={(e) => handleArrayChange('slides', index, { backgroundImage: e.target.value })}
                                placeholder="Image URL"
                                className="mt-1 w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-madas-text/60 mb-1">Background Color</label>
                              <div className="flex gap-1">
                                <input
                                  type="color"
                                  value={slide.backgroundColor?.includes('#') ? (slide.backgroundColor.match(/#[0-9A-F]{6}/i)?.[0] || '#27491F') : '#27491F'}
                                  onChange={(e) => handleArrayChange('slides', index, { backgroundColor: e.target.value })}
                                  className="w-8 h-8 rounded border border-gray-200"
                                />
                                <input
                                  type="text"
                                  value={slide.backgroundColor || ''}
                                  onChange={(e) => handleArrayChange('slides', index, { backgroundColor: e.target.value })}
                                  placeholder="gradient or #color"
                                  className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                              </div>
                              <p className="text-[10px] text-madas-text/60 mt-1">Use the color button in the rich text editor above to color text</p>
                            </div>
                            
                            {/* Text Styling for this slide */}
                            <div className="border-t border-gray-100 pt-2 mt-2">
                              <h6 className="text-xs font-medium text-madas-text/70 mb-2">Text Styling (Optional)</h6>
                              <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-1">
                                  <div>
                                    <label className="block text-[10px] text-madas-text/60 mb-0.5">Title Size</label>
                                    <input
                                      type="number"
                                      value={slide.textStyle?.titleFontSize || ''}
                                      onChange={(e) => handleArrayChange('slides', index, {
                                        textStyle: {
                                          ...slide.textStyle,
                                          titleFontSize: parseInt(e.target.value) || undefined
                                        }
                                      })}
                                      placeholder="Auto"
                                      className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-madas-text/60 mb-0.5">Title Weight</label>
                                    <select
                                      value={slide.textStyle?.titleFontWeight || 'bold'}
                                      onChange={(e) => handleArrayChange('slides', index, {
                                        textStyle: {
                                          ...slide.textStyle,
                                          titleFontWeight: e.target.value
                                        }
                                      })}
                                      className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs"
                                    >
                                      <option value="bold">Bold</option>
                                      <option value="normal">Normal</option>
                                      <option value="semibold">Semi</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-madas-text/60 mb-0.5">Title Align</label>
                                    <select
                                      value={slide.textStyle?.titleAlignment || 'center'}
                                      onChange={(e) => handleArrayChange('slides', index, {
                                        textStyle: {
                                          ...slide.textStyle,
                                          titleAlignment: e.target.value
                                        }
                                      })}
                                      className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs"
                                    >
                                      <option value="left">Left</option>
                                      <option value="center">Center</option>
                                      <option value="right">Right</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-1">
                                  <div>
                                    <label className="block text-[10px] text-madas-text/60 mb-0.5">Subtitle Size</label>
                                    <input
                                      type="number"
                                      value={slide.textStyle?.subtitleFontSize || ''}
                                      onChange={(e) => handleArrayChange('slides', index, {
                                        textStyle: {
                                          ...slide.textStyle,
                                          subtitleFontSize: parseInt(e.target.value) || undefined
                                        }
                                      })}
                                      placeholder="Auto"
                                      className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-madas-text/60 mb-0.5">Button Color</label>
                                    <input
                                      type="color"
                                      value={slide.textStyle?.buttonStyle?.backgroundColor || '#ffffff'}
                                      onChange={(e) => handleArrayChange('slides', index, {
                                        textStyle: {
                                          ...slide.textStyle,
                                          buttonStyle: {
                                            ...slide.textStyle?.buttonStyle,
                                            backgroundColor: e.target.value
                                          }
                                        }
                                      })}
                                      className="w-full h-7 rounded border border-gray-200"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Single Hero Mode
              <>
                <div>
                  <label className="block text-sm font-medium text-madas-text/80 mb-2">Title</label>
                  <RichTextEditor
                    value={formData.title || ''}
                    onChange={(value) => handleChange('title', value)}
                    placeholder="Enter title (use color button to highlight text)"
                    className="text-sm"
                  />
                  <div className="mt-1 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-xs text-blue-800 font-medium mb-1">💡 How to color text:</p>
                    <ol className="text-xs text-blue-700 space-y-0.5 ml-4 list-decimal">
                      <li>Type your text (e.g., "DISCOVER LIMITED SNEAKERS")</li>
                      <li>Select the text you want to color (e.g., "DISCOVER LIMITED")</li>
                      <li>Choose a color from the color picker (e.g., green)</li>
                      <li>Click the "Apply" button with the color icon</li>
                      <li>Repeat for other parts (e.g., select "SNEAKERS" and make it pink)</li>
                    </ol>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-madas-text/80 mb-2">Subtitle</label>
                  <RichTextEditor
                    value={formData.subtitle || ''}
                    onChange={(value) => handleChange('subtitle', value)}
                    placeholder="Enter subtitle (use color button to highlight text)"
                    className="text-sm"
                  />
                  <div className="mt-1 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-xs text-blue-800 font-medium mb-1">💡 How to color text:</p>
                    <ol className="text-xs text-blue-700 space-y-0.5 ml-4 list-decimal">
                      <li>Type your text</li>
                      <li>Select the text you want to color</li>
                      <li>Choose a color from the color picker</li>
                      <li>Click the "Apply" button with the color icon</li>
                      <li>Repeat for other parts with different colors</li>
                    </ol>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-madas-text/80 mb-2">Button Text</label>
                  <input
                    type="text"
                    value={formData.buttonText || ''}
                    onChange={(e) => handleChange('buttonText', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-madas-text/80 mb-2">Button Link</label>
                  <input
                    type="text"
                    value={formData.buttonLink || ''}
                    onChange={(e) => handleChange('buttonLink', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-madas-text/80 mb-2">Background Image</label>
                  <ImageUploader
                    currentUrl={formData.backgroundImage}
                    onUpload={(url) => handleChange('backgroundImage', url)}
                    label=""
                  />
                  <input
                    type="url"
                    value={formData.backgroundImage || ''}
                    onChange={(e) => handleChange('backgroundImage', e.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Or enter image URL manually"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-madas-text/80 mb-2">Background Color/Overlay</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.backgroundColor?.includes('#') ? formData.backgroundColor : '#27491F'}
                      onChange={(e) => handleChange('backgroundColor', e.target.value)}
                      className="w-16 h-10 rounded border border-gray-200"
                    />
                    <input
                      type="text"
                      value={formData.backgroundColor || ''}
                      onChange={(e) => handleChange('backgroundColor', e.target.value)}
                      placeholder="linear-gradient(...) or #color"
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <p className="text-xs text-madas-text/60 mt-1">Used as overlay when background image is set</p>
                  <p className="text-xs text-madas-text/60 mt-1">💡 Use the color button in the rich text editor above to add colored spans to your text</p>
                </div>
                
                {/* Text Styling */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h5 className="text-sm font-semibold text-madas-text/80 mb-3">Text Styling</h5>
                  
                  {/* Title Style */}
                  <div className="space-y-3 mb-4">
                    <h6 className="text-xs font-medium text-madas-text/70">Title</h6>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-madas-text/60 mb-1">Font Size (px)</label>
                        <input
                          type="number"
                          value={formData.textStyle?.titleFontSize || ''}
                          onChange={(e) => handleChange('textStyle', {
                            ...formData.textStyle,
                            titleFontSize: parseInt(e.target.value) || undefined
                          })}
                          placeholder="Auto"
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-madas-text/60 mb-1">Font Weight</label>
                        <select
                          value={formData.textStyle?.titleFontWeight || 'bold'}
                          onChange={(e) => handleChange('textStyle', {
                            ...formData.textStyle,
                            titleFontWeight: e.target.value
                          })}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                        >
                          <option value="normal">Normal</option>
                          <option value="medium">Medium</option>
                          <option value="semibold">Semi Bold</option>
                          <option value="bold">Bold</option>
                          <option value="extrabold">Extra Bold</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-madas-text/60 mb-1">Alignment</label>
                        <select
                          value={formData.textStyle?.titleAlignment || 'center'}
                          onChange={(e) => handleChange('textStyle', {
                            ...formData.textStyle,
                            titleAlignment: e.target.value
                          })}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Subtitle Style */}
                  <div className="space-y-3 mb-4">
                    <h6 className="text-xs font-medium text-madas-text/70">Subtitle</h6>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-madas-text/60 mb-1">Font Size (px)</label>
                        <input
                          type="number"
                          value={formData.textStyle?.subtitleFontSize || ''}
                          onChange={(e) => handleChange('textStyle', {
                            ...formData.textStyle,
                            subtitleFontSize: parseInt(e.target.value) || undefined
                          })}
                          placeholder="Auto"
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-madas-text/60 mb-1">Font Weight</label>
                        <select
                          value={formData.textStyle?.subtitleFontWeight || 'normal'}
                          onChange={(e) => handleChange('textStyle', {
                            ...formData.textStyle,
                            subtitleFontWeight: e.target.value
                          })}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                        >
                          <option value="normal">Normal</option>
                          <option value="medium">Medium</option>
                          <option value="semibold">Semi Bold</option>
                          <option value="bold">Bold</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-madas-text/60 mb-1">Alignment</label>
                        <select
                          value={formData.textStyle?.subtitleAlignment || 'center'}
                          onChange={(e) => handleChange('textStyle', {
                            ...formData.textStyle,
                            subtitleAlignment: e.target.value
                          })}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Button Style */}
                  <div className="space-y-3">
                    <h6 className="text-xs font-medium text-madas-text/70">Button</h6>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="block text-xs text-madas-text/60 mb-1">Background Color</label>
                        <div className="flex gap-1">
                          <input
                            type="color"
                            value={formData.textStyle?.buttonStyle?.backgroundColor || '#ffffff'}
                            onChange={(e) => handleChange('textStyle', {
                              ...formData.textStyle,
                              buttonStyle: {
                                ...formData.textStyle?.buttonStyle,
                                backgroundColor: e.target.value
                              }
                            })}
                            className="w-10 h-8 rounded border border-gray-200"
                          />
                          <input
                            type="text"
                            value={formData.textStyle?.buttonStyle?.backgroundColor || ''}
                            onChange={(e) => handleChange('textStyle', {
                              ...formData.textStyle,
                              buttonStyle: {
                                ...formData.textStyle?.buttonStyle,
                                backgroundColor: e.target.value
                              }
                            })}
                            placeholder="#ffffff"
                            className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-madas-text/60 mb-1">Text Color</label>
                        <div className="flex gap-1">
                          <input
                            type="color"
                            value={formData.textStyle?.buttonStyle?.textColor || '#000000'}
                            onChange={(e) => handleChange('textStyle', {
                              ...formData.textStyle,
                              buttonStyle: {
                                ...formData.textStyle?.buttonStyle,
                                textColor: e.target.value
                              }
                            })}
                            className="w-10 h-8 rounded border border-gray-200"
                          />
                          <input
                            type="text"
                            value={formData.textStyle?.buttonStyle?.textColor || ''}
                            onChange={(e) => handleChange('textStyle', {
                              ...formData.textStyle,
                              buttonStyle: {
                                ...formData.textStyle?.buttonStyle,
                                textColor: e.target.value
                              }
                            })}
                            placeholder="#000000"
                            className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-madas-text/60 mb-1">Font Size (px)</label>
                        <input
                          type="number"
                          value={formData.textStyle?.buttonStyle?.fontSize || ''}
                          onChange={(e) => handleChange('textStyle', {
                            ...formData.textStyle,
                            buttonStyle: {
                              ...formData.textStyle?.buttonStyle,
                              fontSize: parseInt(e.target.value) || undefined
                            }
                          })}
                          placeholder="Auto"
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-madas-text/60 mb-1">Font Weight</label>
                        <select
                          value={formData.textStyle?.buttonStyle?.fontWeight || 'semibold'}
                          onChange={(e) => handleChange('textStyle', {
                            ...formData.textStyle,
                            buttonStyle: {
                              ...formData.textStyle?.buttonStyle,
                              fontWeight: e.target.value
                            }
                          })}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                        >
                          <option value="normal">Normal</option>
                          <option value="medium">Medium</option>
                          <option value="semibold">Semi Bold</option>
                          <option value="bold">Bold</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-madas-text/60 mb-1">Border Radius (px)</label>
                        <input
                          type="number"
                          value={formData.textStyle?.buttonStyle?.borderRadius || ''}
                          onChange={(e) => handleChange('textStyle', {
                            ...formData.textStyle,
                            buttonStyle: {
                              ...formData.textStyle?.buttonStyle,
                              borderRadius: parseInt(e.target.value) || undefined
                            }
                          })}
                          placeholder="8"
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-madas-text/60 mb-1">Padding (e.g., 12px 24px)</label>
                      <input
                        type="text"
                        value={formData.textStyle?.buttonStyle?.padding || ''}
                        onChange={(e) => handleChange('textStyle', {
                          ...formData.textStyle,
                          buttonStyle: {
                            ...formData.textStyle?.buttonStyle,
                            padding: e.target.value
                          }
                        })}
                        placeholder="12px 24px"
                        className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 'features':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Subtitle</label>
              <input
                type="text"
                value={formData.subtitle || ''}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-madas-text/80">Features</label>
                <button
                  type="button"
                  onClick={() => handleAddArrayItem('items', { icon: '⭐', title: 'New Feature', description: 'Description' })}
                  className="text-xs text-primary hover:underline"
                >
                  + Add Feature
                </button>
              </div>
              <div className="space-y-3">
                {(formData.items || []).map((item: any, index: number) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-madas-text/70">Feature {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveArrayItem('items', index)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="text"
                      value={item.icon || ''}
                      onChange={(e) => handleArrayChange('items', index, { icon: e.target.value })}
                      placeholder="Icon (emoji)"
                      className="w-full mb-2 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <input
                      type="text"
                      value={item.title || ''}
                      onChange={(e) => handleArrayChange('items', index, { title: e.target.value })}
                      placeholder="Title"
                      className="w-full mb-2 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <div>
                      <label className="block text-xs text-madas-text/70 mb-1">Description</label>
                      <RichTextEditor
                        value={item.description || ''}
                        onChange={(value) => handleArrayChange('items', index, { description: value })}
                        placeholder="Description"
                        className="text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'products':
        const selectedProductIds = (formData.selectedProducts || []).map((p: SelectedProduct) => p.id);
        const filteredProducts = products.filter(p => 
          p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
          p.sku?.toLowerCase().includes(productSearchTerm.toLowerCase())
        );
        
        const handleSelectProduct = (product: any) => {
          const selectedProducts = formData.selectedProducts || [];
          const isSelected = selectedProducts.some((p: SelectedProduct) => p.id === product.id);
          
          if (isSelected) {
            // Remove product
            handleChange('selectedProducts', selectedProducts.filter((p: SelectedProduct) => p.id !== product.id));
          } else {
            // Add product - include sale pricing fields
            const newProduct: SelectedProduct = {
              id: product.id,
              name: product.name,
              price: product.price || 0,
              sellingPrice: product.sellingPrice,
              image: product.images?.[0] || '',
              description: product.description,
              // Sale pricing fields
              onSale: product.onSale || false,
              salePrice: product.salePrice,
              compareAtPrice: product.compareAtPrice || product.sellingPrice
            };
            handleChange('selectedProducts', [...selectedProducts, newProduct]);
          }
        };

        const handleRemoveSelectedProduct = (productId: string) => {
          const selectedProducts = formData.selectedProducts || [];
          handleChange('selectedProducts', selectedProducts.filter((p: SelectedProduct) => p.id !== productId));
        };

        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Subtitle</label>
              <input
                type="text"
                value={formData.subtitle || ''}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Layout</label>
              <select
                value={formData.layout || 'grid'}
                onChange={(e) => handleChange('layout', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="grid">Grid</option>
                <option value="list">List</option>
                <option value="carousel">Carousel</option>
              </select>
            </div>
            {formData.layout === 'grid' && (
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">Columns</label>
                <select
                  value={formData.columns || 4}
                  onChange={(e) => handleChange('columns', parseInt(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value={2}>2 Columns</option>
                  <option value={3}>3 Columns</option>
                  <option value={4}>4 Columns</option>
                </select>
              </div>
            )}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.showPrice !== false}
                  onChange={(e) => handleChange('showPrice', e.target.checked)}
                  className="rounded border-gray-300"
                />
                Show Price
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.showAddToCart !== false}
                  onChange={(e) => handleChange('showAddToCart', e.target.checked)}
                  className="rounded border-gray-300"
                />
                Show Add to Cart
              </label>
            </div>
            
            {/* Selected Products */}
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">
                Selected Products ({(formData.selectedProducts || []).length})
              </label>
              {(formData.selectedProducts || []).length > 0 ? (
                <div className="space-y-2 mb-4 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {(formData.selectedProducts || []).map((product: SelectedProduct, index: number) => (
                    <div key={product.id} className="flex items-center gap-2 bg-green-50 p-2 rounded-lg">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                          <span className="material-icons text-gray-400 text-sm">image</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">${product.sellingPrice || product.price}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSelectedProduct(product.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <span className="material-icons text-sm">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-4">No products selected. Select products from the list below.</p>
              )}
            </div>

            {/* Product Selector */}
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Available Products</label>
              <input
                type="text"
                placeholder="Search products..."
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent mb-2"
              />
              {productsLoading ? (
                <p className="text-sm text-gray-500">Loading products...</p>
              ) : filteredProducts.length === 0 ? (
                <p className="text-sm text-gray-500">No products found</p>
              ) : (
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProductIds.includes(product.id);
                    return (
                      <div
                        key={product.id}
                        onClick={() => handleSelectProduct(product)}
                        className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                          isSelected ? 'bg-green-50' : ''
                        }`}
                      >
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="w-10 h-10 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                            <span className="material-icons text-gray-400 text-sm">image</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-gray-500">${product.sellingPrice || product.price}</p>
                        </div>
                        {isSelected && (
                          <span className="material-icons text-green-600 text-sm">check_circle</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Card Style Editor */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h4 className="text-sm font-semibold text-madas-text mb-3 flex items-center gap-2">
                <span className="material-icons text-sm">style</span>
                Card Design
              </h4>
              
              <div className="space-y-3">
                {/* Card Colors */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-madas-text/70 mb-1">Card Background</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={(formData.cardStyle as ProductCardStyle)?.backgroundColor || defaultCardStyle.backgroundColor}
                        onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultCardStyle), backgroundColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                      />
                      <input
                        type="text"
                        value={(formData.cardStyle as ProductCardStyle)?.backgroundColor || defaultCardStyle.backgroundColor}
                        onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultCardStyle), backgroundColor: e.target.value })}
                        className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-madas-text/70 mb-1">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={(formData.cardStyle as ProductCardStyle)?.textColor || defaultCardStyle.textColor}
                        onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultCardStyle), textColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                      />
                      <input
                        type="text"
                        value={(formData.cardStyle as ProductCardStyle)?.textColor || defaultCardStyle.textColor}
                        onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultCardStyle), textColor: e.target.value })}
                        className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-madas-text/70 mb-1">Price Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={(formData.cardStyle as ProductCardStyle)?.priceColor || defaultCardStyle.priceColor}
                        onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultCardStyle), priceColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                      />
                      <input
                        type="text"
                        value={(formData.cardStyle as ProductCardStyle)?.priceColor || defaultCardStyle.priceColor}
                        onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultCardStyle), priceColor: e.target.value })}
                        className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-madas-text/70 mb-1">Border Radius</label>
                    <input
                      type="range"
                      min="0"
                      max="24"
                      value={(formData.cardStyle as ProductCardStyle)?.borderRadius ?? defaultCardStyle.borderRadius}
                      onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultCardStyle), borderRadius: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <span className="text-xs text-gray-500">{(formData.cardStyle as ProductCardStyle)?.borderRadius ?? defaultCardStyle.borderRadius}px</span>
                  </div>
                </div>

                {/* Shadow */}
                <div>
                  <label className="block text-xs font-medium text-madas-text/70 mb-1">Shadow</label>
                  <select
                    value={(formData.cardStyle as ProductCardStyle)?.shadow || defaultCardStyle.shadow}
                    onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultCardStyle), shadow: e.target.value })}
                    className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                  >
                    <option value="none">None</option>
                    <option value="sm">Small</option>
                    <option value="md">Medium</option>
                    <option value="lg">Large</option>
                    <option value="xl">Extra Large</option>
                  </select>
                </div>

                {/* Image Aspect Ratio */}
                <div>
                  <label className="block text-xs font-medium text-madas-text/70 mb-1">Image Aspect Ratio</label>
                  <select
                    value={(formData.cardStyle as ProductCardStyle)?.imageAspect || defaultCardStyle.imageAspect}
                    onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultCardStyle), imageAspect: e.target.value })}
                    className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                  >
                    <option value="square">Square (1:1)</option>
                    <option value="portrait">Portrait (3:4)</option>
                    <option value="landscape">Landscape (4:3)</option>
                  </select>
                </div>

                {/* Image Background Color */}
                <div>
                  <label className="block text-xs font-medium text-madas-text/70 mb-1">Image Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={(formData.cardStyle as ProductCardStyle)?.imageBackgroundColor || '#f3f4f6'}
                      onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultCardStyle), imageBackgroundColor: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                    />
                    <input
                      type="text"
                      value={(formData.cardStyle as ProductCardStyle)?.imageBackgroundColor || '#f3f4f6'}
                      onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultCardStyle), imageBackgroundColor: e.target.value })}
                      className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs"
                    />
                  </div>
                </div>

                {/* Border */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={(formData.cardStyle as ProductCardStyle)?.showBorder ?? defaultCardStyle.showBorder}
                      onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultCardStyle), showBorder: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    Show Border
                  </label>
                  {(formData.cardStyle as ProductCardStyle)?.showBorder !== false && (
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={(formData.cardStyle as ProductCardStyle)?.borderColor || defaultCardStyle.borderColor}
                        onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultCardStyle), borderColor: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border border-gray-200"
                      />
                    </div>
                  )}
                </div>

                {/* Button Style */}
                <div className="border-t border-gray-100 pt-3 mt-3">
                  <label className="block text-xs font-semibold text-madas-text/80 mb-2">Button Style</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-madas-text/70 mb-1">Button Background</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={(formData.cardStyle as ProductCardStyle)?.buttonBackgroundColor || defaultCardStyle.buttonBackgroundColor}
                          onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultCardStyle), buttonBackgroundColor: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                        />
                        <input
                          type="text"
                          value={(formData.cardStyle as ProductCardStyle)?.buttonBackgroundColor || defaultCardStyle.buttonBackgroundColor}
                          onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultCardStyle), buttonBackgroundColor: e.target.value })}
                          className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-madas-text/70 mb-1">Button Text</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={(formData.cardStyle as ProductCardStyle)?.buttonTextColor || defaultCardStyle.buttonTextColor}
                          onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultCardStyle), buttonTextColor: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                        />
                        <input
                          type="text"
                          value={(formData.cardStyle as ProductCardStyle)?.buttonTextColor || defaultCardStyle.buttonTextColor}
                          onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultCardStyle), buttonTextColor: e.target.value })}
                          className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-madas-text/70 mb-1">Button Border Radius</label>
                    <input
                      type="range"
                      min="0"
                      max="24"
                      value={(formData.cardStyle as ProductCardStyle)?.buttonBorderRadius ?? defaultCardStyle.buttonBorderRadius}
                      onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultCardStyle), buttonBorderRadius: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <span className="text-xs text-gray-500">{(formData.cardStyle as ProductCardStyle)?.buttonBorderRadius ?? defaultCardStyle.buttonBorderRadius}px</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'deals':
        const dealsSelectedProductIds = (formData.selectedProducts || []).map((p: SelectedProduct) => p.id);
        const dealsFilteredProducts = products.filter(p => 
          p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
          p.sku?.toLowerCase().includes(productSearchTerm.toLowerCase())
        );
        const defaultDealsCardStyle = {
          backgroundColor: '#ffffff',
          textColor: '#1f2937',
          descriptionColor: '#6b7280',
          priceColor: '#1f2937',
          borderRadius: 8,
          showBorder: true,
          borderColor: '#e5e7eb',
          imageBackgroundColor: '#f3f4f6',
          buttonBackgroundColor: '#F0CAE1',
          buttonTextColor: '#27491F',
          buttonBorderRadius: 6
        };

        const handleDealsSelectProduct = (product: any) => {
          const currentSelected = formData.selectedProducts || [];
          const isAlreadySelected = currentSelected.some((p: SelectedProduct) => p.id === product.id);
          
          if (isAlreadySelected) {
            handleChange('selectedProducts', currentSelected.filter((p: SelectedProduct) => p.id !== product.id));
          } else {
            const newProduct: SelectedProduct = {
              id: product.id,
              name: product.name,
              price: product.price || 0,
              sellingPrice: product.sellingPrice,
              image: product.images?.[0] || '',
              description: product.description || ''
            };
            handleChange('selectedProducts', [...currentSelected, newProduct]);
          }
        };

        const handleDealsRemoveSelectedProduct = (productId: string) => {
          const currentSelected = formData.selectedProducts || [];
          handleChange('selectedProducts', currentSelected.filter((p: SelectedProduct) => p.id !== productId));
        };

        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Section Title</label>
              <input
                type="text"
                value={formData.title || 'DEAL OF THE DAY'}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">View More Text</label>
                <input
                  type="text"
                  value={formData.viewMoreText || 'VIEW MORE'}
                  onChange={(e) => handleChange('viewMoreText', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">View More Link</label>
                <input
                  type="text"
                  value={formData.viewMoreLink || '#'}
                  onChange={(e) => handleChange('viewMoreLink', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Columns</label>
              <select
                value={formData.columns || 4}
                onChange={(e) => handleChange('columns', parseInt(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value={2}>2 Columns</option>
                <option value={3}>3 Columns</option>
                <option value={4}>4 Columns</option>
              </select>
            </div>
            
            {/* Selected Products */}
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">
                Selected Products ({(formData.selectedProducts || []).length})
              </label>
              {(formData.selectedProducts || []).length > 0 ? (
                <div className="space-y-2 mb-4 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {(formData.selectedProducts || []).map((product: SelectedProduct, index: number) => (
                    <div key={product.id} className="flex items-center gap-2 bg-pink-50 p-2 rounded-lg">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                          <span className="material-icons text-gray-400 text-sm">image</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">${product.sellingPrice || product.price}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDealsRemoveSelectedProduct(product.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <span className="material-icons text-sm">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-4">No products selected. Select products below.</p>
              )}
            </div>

            {/* Product Selector */}
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Available Products</label>
              <input
                type="text"
                placeholder="Search products..."
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent mb-2"
              />
              {productsLoading ? (
                <p className="text-sm text-gray-500">Loading products...</p>
              ) : dealsFilteredProducts.length === 0 ? (
                <p className="text-sm text-gray-500">No products found</p>
              ) : (
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  {dealsFilteredProducts.map((product) => {
                    const isSelected = dealsSelectedProductIds.includes(product.id);
                    return (
                      <div
                        key={product.id}
                        onClick={() => handleDealsSelectProduct(product)}
                        className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                          isSelected ? 'bg-pink-50' : ''
                        }`}
                      >
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="w-10 h-10 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                            <span className="material-icons text-gray-400 text-sm">image</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-gray-500">${product.sellingPrice || product.price}</p>
                        </div>
                        {isSelected && (
                          <span className="material-icons text-pink-600 text-sm">check_circle</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Card Style Editor */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h4 className="text-sm font-semibold text-madas-text mb-3 flex items-center gap-2">
                <span className="material-icons text-sm">style</span>
                Card Design
              </h4>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-madas-text/70 mb-1">Card Background</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.cardStyle?.backgroundColor || defaultDealsCardStyle.backgroundColor}
                        onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultDealsCardStyle), backgroundColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                      />
                      <input
                        type="text"
                        value={formData.cardStyle?.backgroundColor || defaultDealsCardStyle.backgroundColor}
                        onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultDealsCardStyle), backgroundColor: e.target.value })}
                        className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-madas-text/70 mb-1">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.cardStyle?.textColor || defaultDealsCardStyle.textColor}
                        onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultDealsCardStyle), textColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                      />
                      <input
                        type="text"
                        value={formData.cardStyle?.textColor || defaultDealsCardStyle.textColor}
                        onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultDealsCardStyle), textColor: e.target.value })}
                        className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-madas-text/70 mb-1">Description Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.cardStyle?.descriptionColor || defaultDealsCardStyle.descriptionColor}
                        onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultDealsCardStyle), descriptionColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                      />
                      <input
                        type="text"
                        value={formData.cardStyle?.descriptionColor || defaultDealsCardStyle.descriptionColor}
                        onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultDealsCardStyle), descriptionColor: e.target.value })}
                        className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-madas-text/70 mb-1">Price Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.cardStyle?.priceColor || defaultDealsCardStyle.priceColor}
                        onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultDealsCardStyle), priceColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                      />
                      <input
                        type="text"
                        value={formData.cardStyle?.priceColor || defaultDealsCardStyle.priceColor}
                        onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultDealsCardStyle), priceColor: e.target.value })}
                        className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-madas-text/70 mb-1">Border Radius</label>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    value={formData.cardStyle?.borderRadius ?? defaultDealsCardStyle.borderRadius}
                    onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultDealsCardStyle), borderRadius: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-500">{formData.cardStyle?.borderRadius ?? defaultDealsCardStyle.borderRadius}px</span>
                </div>

                {/* Image Background Color */}
                <div>
                  <label className="block text-xs font-medium text-madas-text/70 mb-1">Image Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.cardStyle?.imageBackgroundColor || defaultDealsCardStyle.imageBackgroundColor}
                      onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultDealsCardStyle), imageBackgroundColor: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                    />
                    <input
                      type="text"
                      value={formData.cardStyle?.imageBackgroundColor || defaultDealsCardStyle.imageBackgroundColor}
                      onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultDealsCardStyle), imageBackgroundColor: e.target.value })}
                      className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.cardStyle?.showBorder ?? defaultDealsCardStyle.showBorder}
                      onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultDealsCardStyle), showBorder: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    Show Border
                  </label>
                  {(formData.cardStyle?.showBorder ?? defaultDealsCardStyle.showBorder) && (
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={formData.cardStyle?.borderColor || defaultDealsCardStyle.borderColor}
                        onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultDealsCardStyle), borderColor: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border border-gray-200"
                      />
                    </div>
                  )}
                </div>

                {/* Button Style */}
                <div className="border-t border-gray-100 pt-3 mt-3">
                  <label className="block text-xs font-semibold text-madas-text/80 mb-2">Button Style</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-madas-text/70 mb-1">Button Background</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.cardStyle?.buttonBackgroundColor || defaultDealsCardStyle.buttonBackgroundColor}
                          onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultDealsCardStyle), buttonBackgroundColor: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                        />
                        <input
                          type="text"
                          value={formData.cardStyle?.buttonBackgroundColor || defaultDealsCardStyle.buttonBackgroundColor}
                          onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultDealsCardStyle), buttonBackgroundColor: e.target.value })}
                          className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-madas-text/70 mb-1">Button Text</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.cardStyle?.buttonTextColor || defaultDealsCardStyle.buttonTextColor}
                          onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultDealsCardStyle), buttonTextColor: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                        />
                        <input
                          type="text"
                          value={formData.cardStyle?.buttonTextColor || defaultDealsCardStyle.buttonTextColor}
                          onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultDealsCardStyle), buttonTextColor: e.target.value })}
                          className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-madas-text/70 mb-1">Button Border Radius</label>
                    <input
                      type="range"
                      min="0"
                      max="24"
                      value={formData.cardStyle?.buttonBorderRadius ?? defaultDealsCardStyle.buttonBorderRadius}
                      onChange={(e) => handleChange('cardStyle', { ...(formData.cardStyle || defaultDealsCardStyle), buttonBorderRadius: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <span className="text-xs text-gray-500">{formData.cardStyle?.buttonBorderRadius ?? defaultDealsCardStyle.buttonBorderRadius}px</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'testimonials':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-madas-text/80">Testimonials</label>
                <button
                  type="button"
                  onClick={() => handleAddArrayItem('items', { name: 'John Doe', role: 'Customer', text: 'Great service!', rating: 5 })}
                  className="text-xs text-primary hover:underline"
                >
                  + Add Testimonial
                </button>
              </div>
              <div className="space-y-3">
                {(formData.items || []).map((item: any, index: number) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-madas-text/70">Testimonial {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveArrayItem('items', index)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="text"
                      value={item.name || ''}
                      onChange={(e) => handleArrayChange('items', index, { name: e.target.value })}
                      placeholder="Name"
                      className="w-full mb-2 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <input
                      type="text"
                      value={item.role || ''}
                      onChange={(e) => handleArrayChange('items', index, { role: e.target.value })}
                      placeholder="Role"
                      className="w-full mb-2 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <div>
                      <label className="block text-xs text-madas-text/70 mb-1">Testimonial Text</label>
                      <RichTextEditor
                        value={item.text || ''}
                        onChange={(value) => handleArrayChange('items', index, { text: value })}
                        placeholder="Testimonial text"
                        className="text-xs"
                      />
                    </div>
                    <ImageUploader
                      currentUrl={item.image}
                      onUpload={(url) => handleArrayChange('items', index, { image: url })}
                      label="Avatar Image"
                      className="mb-2"
                    />
                    <input
                      type="url"
                      value={item.image || ''}
                      onChange={(e) => handleArrayChange('items', index, { image: e.target.value })}
                      placeholder="Or enter image URL manually"
                      className="w-full mb-2 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={item.rating || 5}
                      onChange={(e) => handleArrayChange('items', index, { rating: parseInt(e.target.value) || 5 })}
                      placeholder="Rating (1-5)"
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'cta':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Subtitle</label>
              <input
                type="text"
                value={formData.subtitle || ''}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Button Text</label>
              <input
                type="text"
                value={formData.buttonText || ''}
                onChange={(e) => handleChange('buttonText', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Button Link</label>
              <input
                type="text"
                value={formData.buttonLink || ''}
                onChange={(e) => handleChange('buttonLink', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Background Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.backgroundColor || '#27491F'}
                  onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  className="w-16 h-10 rounded border border-gray-200"
                />
                <input
                  type="text"
                  value={formData.backgroundColor || ''}
                  onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Button Background Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.buttonBackgroundColor || '#ffffff'}
                  onChange={(e) => handleChange('buttonBackgroundColor', e.target.value)}
                  className="w-16 h-10 rounded border border-gray-200"
                />
                <input
                  type="text"
                  value={formData.buttonBackgroundColor || ''}
                  onChange={(e) => handleChange('buttonBackgroundColor', e.target.value)}
                  placeholder="#ffffff"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Button Text Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.buttonTextColor || formData.backgroundColor || '#27491F'}
                  onChange={(e) => handleChange('buttonTextColor', e.target.value)}
                  className="w-16 h-10 rounded border border-gray-200"
                />
                <input
                  type="text"
                  value={formData.buttonTextColor || ''}
                  onChange={(e) => handleChange('buttonTextColor', e.target.value)}
                  placeholder="Same as background"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          </div>
        );

      case 'about':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Content</label>
              <RichTextEditor
                value={formData.content || ''}
                onChange={(value) => handleChange('content', value)}
                placeholder="Your story here..."
              />
            </div>
            <div>
              <ImageUploader
                currentUrl={formData.image}
                onUpload={(url) => handleChange('image', url)}
                label="Image"
              />
              <input
                type="url"
                value={formData.image || ''}
                onChange={(e) => handleChange('image', e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Or enter image URL manually"
              />
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Subtitle</label>
              <input
                type="text"
                value={formData.subtitle || ''}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Address</label>
              <textarea
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>
          </div>
        );

      case 'gallery':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Subtitle</label>
              <input
                type="text"
                value={formData.subtitle || ''}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Optional subtitle"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">Layout</label>
                <select
                  value={formData.layout || 'grid'}
                  onChange={(e) => handleChange('layout', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="grid">Grid</option>
                  <option value="masonry">Masonry</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">Columns</label>
                <select
                  value={formData.columns || 4}
                  onChange={(e) => handleChange('columns', parseInt(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value={2}>2 Columns</option>
                  <option value={3}>3 Columns</option>
                  <option value={4}>4 Columns</option>
                </select>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-madas-text/80">Images</label>
                <button
                  type="button"
                  onClick={() => handleAddArrayItem('images', { url: '', alt: '', caption: '' })}
                  className="text-xs text-primary hover:underline"
                >
                  + Add Image
                </button>
              </div>
              <div className="space-y-3">
                {(formData.images || []).map((image: any, index: number) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-madas-text/70">Image {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveArrayItem('images', index)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <ImageUploader
                      currentUrl={image.url}
                      onUpload={(url) => handleArrayChange('images', index, { url })}
                      label=""
                      className="mb-2"
                    />
                    <input
                      type="url"
                      value={image.url || ''}
                      onChange={(e) => handleArrayChange('images', index, { url: e.target.value })}
                      placeholder="Or enter image URL manually"
                      className="w-full mt-2 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <input
                      type="text"
                      value={image.alt || ''}
                      onChange={(e) => handleArrayChange('images', index, { alt: e.target.value })}
                      placeholder="Alt text"
                      className="w-full mt-2 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <input
                      type="text"
                      value={image.caption || ''}
                      onChange={(e) => handleArrayChange('images', index, { caption: e.target.value })}
                      placeholder="Caption (optional)"
                      className="w-full mt-2 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'pricing':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Subtitle</label>
              <input
                type="text"
                value={formData.subtitle || ''}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">Currency Symbol</label>
                <input
                  type="text"
                  value={formData.currency || '$'}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  placeholder="$"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">Billing Period</label>
                <input
                  type="text"
                  value={formData.billingPeriod || '/month'}
                  onChange={(e) => handleChange('billingPeriod', e.target.value)}
                  placeholder="/month"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-madas-text/80">Plans</label>
                <button
                  type="button"
                  onClick={() => handleAddArrayItem('plans', { name: 'New Plan', price: 29, features: [], buttonText: 'Get Started' })}
                  className="text-xs text-primary hover:underline"
                >
                  + Add Plan
                </button>
              </div>
              <div className="space-y-3">
                {(formData.plans || []).map((plan: any, index: number) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-madas-text/70">Plan {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveArrayItem('plans', index)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="text"
                      value={plan.name || ''}
                      onChange={(e) => handleArrayChange('plans', index, { name: e.target.value })}
                      placeholder="Plan name"
                      className="w-full mb-2 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <input
                      type="number"
                      value={plan.price || 0}
                      onChange={(e) => handleArrayChange('plans', index, { price: parseFloat(e.target.value) || 0 })}
                      placeholder="Price"
                      className="w-full mb-2 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <input
                      type="text"
                      value={plan.buttonText || 'Get Started'}
                      onChange={(e) => handleArrayChange('plans', index, { buttonText: e.target.value })}
                      placeholder="Button text"
                      className="w-full mb-2 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <label className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={plan.highlighted || false}
                        onChange={(e) => handleArrayChange('plans', index, { highlighted: e.target.checked })}
                        className="rounded border-gray-200"
                      />
                      <span className="text-xs text-madas-text/70">Highlight this plan</span>
                    </label>
                    <textarea
                      value={(plan.features || []).join('\n')}
                      onChange={(e) => handleArrayChange('plans', index, { features: e.target.value.split('\n').filter(Boolean) })}
                      placeholder="Features (one per line)"
                      rows={3}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'faq':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-madas-text/80">Questions</label>
                <button
                  type="button"
                  onClick={() => handleAddArrayItem('items', { question: '', answer: '' })}
                  className="text-xs text-primary hover:underline"
                >
                  + Add Question
                </button>
              </div>
              <div className="space-y-3">
                {(formData.items || []).map((item: any, index: number) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-madas-text/70">Q {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveArrayItem('items', index)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="text"
                      value={item.question || ''}
                      onChange={(e) => handleArrayChange('items', index, { question: e.target.value })}
                      placeholder="Question"
                      className="w-full mb-2 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <div>
                      <label className="block text-xs text-madas-text/70 mb-1">Answer</label>
                      <RichTextEditor
                        value={item.answer || ''}
                        onChange={(value) => handleArrayChange('items', index, { answer: value })}
                        placeholder="Answer"
                        className="text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'footer':
        return (
          <div className="space-y-4">
            {/* Layout Selector */}
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Footer Layout</label>
              <select
                value={formData.layout || 'classic'}
                onChange={(e) => handleChange('layout', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="classic">Classic (Multi-column)</option>
                <option value="minimal">Minimal (Modern)</option>
              </select>
            </div>

            {/* Common Fields */}
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Logo Text</label>
              <input
                type="text"
                value={formData.logoText || ''}
                onChange={(e) => handleChange('logoText', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="BRAND"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Logo Image</label>
              <ImageUploader
                currentUrl={formData.logo}
                onUpload={(url) => handleChange('logo', url)}
                label=""
              />
              <input
                type="url"
                value={formData.logo || ''}
                onChange={(e) => handleChange('logo', e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Or enter logo URL manually"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Tagline</label>
              <input
                type="text"
                value={formData.tagline || ''}
                onChange={(e) => handleChange('tagline', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Sign up for exclusive offers..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Copyright Text</label>
              <input
                type="text"
                value={formData.copyrightText || ''}
                onChange={(e) => handleChange('copyrightText', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="© 2024 Brand. All rights reserved."
              />
            </div>
            
            {/* Classic Layout: Link Columns */}
            {(formData.layout || 'classic') === 'classic' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-madas-text/80">Link Columns</label>
                <button
                  type="button"
                  onClick={() => handleAddArrayItem('columns', { title: 'New Column', links: [] })}
                  className="text-xs text-primary hover:underline"
                >
                  + Add Column
                </button>
              </div>
              <div className="space-y-3">
                {(formData.columns || []).map((column: any, colIndex: number) => (
                  <div key={colIndex} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-madas-text/70">Column {colIndex + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveArrayItem('columns', colIndex)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="text"
                      value={column.title || ''}
                      onChange={(e) => handleArrayChange('columns', colIndex, { ...column, title: e.target.value })}
                      placeholder="Column Title"
                      className="w-full mb-2 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-madas-text/70">Links</label>
                        <button
                          type="button"
                          onClick={() => {
                            const newLinks = [...(column.links || []), { label: '', link: '#' }];
                            handleArrayChange('columns', colIndex, { ...column, links: newLinks });
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          + Add Link
                        </button>
                      </div>
                      {(column.links || []).map((link: any, linkIndex: number) => (
                        <div key={linkIndex} className="flex gap-2">
                          <input
                            type="text"
                            value={link.label || ''}
                            onChange={(e) => {
                              const newLinks = [...(column.links || [])];
                              newLinks[linkIndex] = { ...link, label: e.target.value };
                              handleArrayChange('columns', colIndex, { ...column, links: newLinks });
                            }}
                            placeholder="Label"
                            className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                          <input
                            type="text"
                            value={link.link || ''}
                            onChange={(e) => {
                              const newLinks = [...(column.links || [])];
                              newLinks[linkIndex] = { ...link, link: e.target.value };
                              handleArrayChange('columns', colIndex, { ...column, links: newLinks });
                            }}
                            placeholder="Link URL"
                            className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newLinks = [...(column.links || [])];
                              newLinks.splice(linkIndex, 1);
                              handleArrayChange('columns', colIndex, { ...column, links: newLinks });
                            }}
                            className="text-xs text-red-600 hover:underline px-2"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* Minimal Layout: Policy Links */}
            {formData.layout === 'minimal' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-madas-text/80">Policy Links</label>
                  <button
                    type="button"
                    onClick={() => handleAddArrayItem('policyLinks', { label: '', link: '#' })}
                    className="text-xs text-primary hover:underline"
                  >
                    + Add Link
                  </button>
                </div>
                <div className="space-y-2">
                  {(formData.policyLinks || []).map((link: any, index: number) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={link.label || ''}
                        onChange={(e) => handleArrayChange('policyLinks', index, { ...link, label: e.target.value })}
                        placeholder="Label (e.g. Privacy policy)"
                        className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <input
                        type="text"
                        value={link.link || ''}
                        onChange={(e) => handleArrayChange('policyLinks', index, { ...link, link: e.target.value })}
                        placeholder="Link URL"
                        className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveArrayItem('policyLinks', index)}
                        className="text-xs text-red-600 hover:underline px-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social Links */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-madas-text/80">Social Links</label>
                <button
                  type="button"
                  onClick={() => handleAddArrayItem('socialLinks', { platform: 'Facebook', icon: 'facebook', link: '#' })}
                  className="text-xs text-primary hover:underline"
                >
                  + Add Social Link
                </button>
              </div>
              <div className="space-y-2">
                {(formData.socialLinks || []).map((social: any, index: number) => (
                  <div key={index} className="flex gap-2 p-2 border border-gray-200 rounded">
                    <select
                      value={social.platform || 'Facebook'}
                      onChange={(e) => handleArrayChange('socialLinks', index, { ...social, platform: e.target.value })}
                      className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="Facebook">Facebook</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Twitter">Twitter (X)</option>
                      <option value="TikTok">TikTok</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="YouTube">YouTube</option>
                      <option value="Pinterest">Pinterest</option>
                      <option value="Snapchat">Snapchat</option>
                      <option value="Other">Other</option>
                    </select>
                    <input
                      type="text"
                      value={social.link || ''}
                      onChange={(e) => handleArrayChange('socialLinks', index, { ...social, link: e.target.value })}
                      placeholder="Link URL"
                      className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveArrayItem('socialLinks', index)}
                      className="text-xs text-red-600 hover:underline px-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Social Icon Colors (Classic Layout Only) */}
            {(formData.layout || 'classic') === 'classic' && (
              <>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Social Icon Background Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.socialIconBackgroundColor || '#1f2937'}
                  onChange={(e) => handleChange('socialIconBackgroundColor', e.target.value)}
                  className="w-16 h-10 rounded border border-gray-200"
                />
                <input
                  type="text"
                  value={formData.socialIconBackgroundColor || ''}
                  onChange={(e) => handleChange('socialIconBackgroundColor', e.target.value)}
                  placeholder="#1f2937"
                  className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Social Icon Hover Background Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.socialIconHoverBackgroundColor || '#27491F'}
                  onChange={(e) => handleChange('socialIconHoverBackgroundColor', e.target.value)}
                  className="w-16 h-10 rounded border border-gray-200"
                />
                <input
                  type="text"
                  value={formData.socialIconHoverBackgroundColor || ''}
                  onChange={(e) => handleChange('socialIconHoverBackgroundColor', e.target.value)}
                  placeholder="#27491F"
                  className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
              </>
            )}

            {/* Newsletter */}
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Newsletter Placeholder</label>
              <input
                type="text"
                value={formData.newsletterPlaceholder || ''}
                onChange={(e) => handleChange('newsletterPlaceholder', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Email address"
              />
            </div>

            {/* Classic Layout: Newsletter Column Toggle */}
            {(formData.layout || 'classic') === 'classic' && (
              <>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.showNewsletter || false}
                  onChange={(e) => handleChange('showNewsletter', e.target.checked)}
                  className="rounded border-gray-200"
                />
                    <span className="text-sm text-madas-text/80">Show Newsletter Column</span>
              </label>
            </div>
            {formData.showNewsletter && (
                <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Newsletter Title</label>
                  <input
                    type="text"
                    value={formData.newsletterText || ''}
                    onChange={(e) => handleChange('newsletterText', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Subscribe to our newsletter"
                  />
                </div>
                )}
              </>
            )}
          </div>
        );

      case 'stats':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Title (optional)</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Our Impact"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Subtitle (optional)</label>
              <input
                type="text"
                value={formData.subtitle || ''}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Layout</label>
              <select
                value={formData.layout || 'row'}
                onChange={(e) => handleChange('layout', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="row">Row (4 columns)</option>
                <option value="grid">Grid (2 columns)</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.animated !== false}
                  onChange={(e) => handleChange('animated', e.target.checked)}
                  className="rounded border-gray-200"
                />
                <span className="text-sm text-madas-text/80">Animate on scroll</span>
              </label>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-madas-text/80">Statistics</label>
                <button
                  type="button"
                  onClick={() => handleAddArrayItem('stats', { value: '100+', label: 'Customers', icon: '👥' })}
                  className="text-xs text-primary hover:underline"
                >
                  + Add Stat
                </button>
              </div>
              <div className="space-y-3">
                {(formData.stats || []).map((stat: any, index: number) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-madas-text/70">Stat {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveArrayItem('stats', index)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input
                        type="text"
                        value={stat.value || ''}
                        onChange={(e) => handleArrayChange('stats', index, { value: e.target.value })}
                        placeholder="Value (e.g., 10K+)"
                        className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                      />
                      <input
                        type="text"
                        value={stat.label || ''}
                        onChange={(e) => handleArrayChange('stats', index, { label: e.target.value })}
                        placeholder="Label"
                        className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                      />
                    </div>
                    <input
                      type="text"
                      value={stat.icon || ''}
                      onChange={(e) => handleArrayChange('stats', index, { icon: e.target.value })}
                      placeholder="Icon (emoji)"
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'team':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Subtitle</label>
              <input
                type="text"
                value={formData.subtitle || ''}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Layout</label>
              <select
                value={formData.layout || 'grid'}
                onChange={(e) => handleChange('layout', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="grid">Grid (4 columns)</option>
                <option value="carousel">Carousel</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-madas-text/80">Team Members</label>
                <button
                  type="button"
                  onClick={() => handleAddArrayItem('members', { name: 'New Member', role: 'Role', bio: '' })}
                  className="text-xs text-primary hover:underline"
                >
                  + Add Member
                </button>
              </div>
              <div className="space-y-3">
                {(formData.members || []).map((member: any, index: number) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-madas-text/70">Member {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveArrayItem('members', index)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="text"
                      value={member.name || ''}
                      onChange={(e) => handleArrayChange('members', index, { name: e.target.value })}
                      placeholder="Name"
                      className="w-full mb-2 rounded border border-gray-200 px-2 py-1 text-sm"
                    />
                    <input
                      type="text"
                      value={member.role || ''}
                      onChange={(e) => handleArrayChange('members', index, { role: e.target.value })}
                      placeholder="Role / Position"
                      className="w-full mb-2 rounded border border-gray-200 px-2 py-1 text-sm"
                    />
                    <ImageUploader
                      currentUrl={member.image}
                      onUpload={(url) => handleArrayChange('members', index, { image: url })}
                      label="Photo"
                      className="mb-2"
                    />
                    <textarea
                      value={member.bio || ''}
                      onChange={(e) => handleArrayChange('members', index, { bio: e.target.value })}
                      placeholder="Short bio"
                      rows={2}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'services':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Subtitle</label>
              <input
                type="text"
                value={formData.subtitle || ''}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Layout</label>
              <select
                value={formData.layout || 'grid'}
                onChange={(e) => handleChange('layout', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="grid">Grid</option>
                <option value="list">List</option>
                <option value="cards">Cards</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-madas-text/80">Services</label>
                <button
                  type="button"
                  onClick={() => handleAddArrayItem('services', { icon: '🚀', title: 'New Service', description: '' })}
                  className="text-xs text-primary hover:underline"
                >
                  + Add Service
                </button>
              </div>
              <div className="space-y-3">
                {(formData.services || []).map((service: any, index: number) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-madas-text/70">Service {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveArrayItem('services', index)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input
                        type="text"
                        value={service.icon || ''}
                        onChange={(e) => handleArrayChange('services', index, { icon: e.target.value })}
                        placeholder="Icon (emoji)"
                        className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                      />
                      <input
                        type="text"
                        value={service.price || ''}
                        onChange={(e) => handleArrayChange('services', index, { price: e.target.value })}
                        placeholder="Price (optional)"
                        className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                      />
                    </div>
                    <input
                      type="text"
                      value={service.title || ''}
                      onChange={(e) => handleArrayChange('services', index, { title: e.target.value })}
                      placeholder="Title"
                      className="w-full mb-2 rounded border border-gray-200 px-2 py-1 text-sm"
                    />
                    <textarea
                      value={service.description || ''}
                      onChange={(e) => handleArrayChange('services', index, { description: e.target.value })}
                      placeholder="Description"
                      rows={2}
                      className="w-full mb-2 rounded border border-gray-200 px-2 py-1 text-sm resize-none"
                    />
                    <input
                      type="url"
                      value={service.link || ''}
                      onChange={(e) => handleArrayChange('services', index, { link: e.target.value })}
                      placeholder="Link URL (optional)"
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Title (optional)</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Subtitle (optional)</label>
              <input
                type="text"
                value={formData.subtitle || ''}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Video Type</label>
              <select
                value={formData.videoType || 'youtube'}
                onChange={(e) => handleChange('videoType', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
                <option value="custom">Custom URL</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Video URL</label>
              <input
                type="url"
                value={formData.videoUrl || ''}
                onChange={(e) => handleChange('videoUrl', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Thumbnail Image (optional)</label>
              <ImageUploader
                currentUrl={formData.thumbnailUrl}
                onUpload={(url) => handleChange('thumbnailUrl', url)}
                label=""
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.autoplay || false}
                  onChange={(e) => handleChange('autoplay', e.target.checked)}
                  className="rounded border-gray-200"
                />
                <span className="text-sm text-madas-text/80">Autoplay</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.showControls !== false}
                  onChange={(e) => handleChange('showControls', e.target.checked)}
                  className="rounded border-gray-200"
                />
                <span className="text-sm text-madas-text/80">Show Controls</span>
              </label>
            </div>
          </div>
        );

      case 'countdown':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Subtitle</label>
              <input
                type="text"
                value={formData.subtitle || ''}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Target Date & Time</label>
              <input
                type="datetime-local"
                value={formData.targetDate ? new Date(formData.targetDate).toISOString().slice(0, 16) : ''}
                onChange={(e) => handleChange('targetDate', new Date(e.target.value).toISOString())}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Expired Message</label>
              <input
                type="text"
                value={formData.expiredMessage || ''}
                onChange={(e) => handleChange('expiredMessage', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="The wait is over!"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.showDays !== false}
                  onChange={(e) => handleChange('showDays', e.target.checked)}
                  className="rounded border-gray-200"
                />
                <span className="text-sm text-madas-text/80">Show Days</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.showHours !== false}
                  onChange={(e) => handleChange('showHours', e.target.checked)}
                  className="rounded border-gray-200"
                />
                <span className="text-sm text-madas-text/80">Show Hours</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.showMinutes !== false}
                  onChange={(e) => handleChange('showMinutes', e.target.checked)}
                  className="rounded border-gray-200"
                />
                <span className="text-sm text-madas-text/80">Show Minutes</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.showSeconds !== false}
                  onChange={(e) => handleChange('showSeconds', e.target.checked)}
                  className="rounded border-gray-200"
                />
                <span className="text-sm text-madas-text/80">Show Seconds</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Background Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.backgroundColor || '#27491F'}
                  onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  className="w-16 h-10 rounded border border-gray-200"
                />
                <input
                  type="text"
                  value={formData.backgroundColor || ''}
                  onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Text Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.textColor || '#ffffff'}
                  onChange={(e) => handleChange('textColor', e.target.value)}
                  className="w-16 h-10 rounded border border-gray-200"
                />
                <input
                  type="text"
                  value={formData.textColor || ''}
                  onChange={(e) => handleChange('textColor', e.target.value)}
                  className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        );

      case 'banner':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Banner Text</label>
              <input
                type="text"
                value={formData.text || ''}
                onChange={(e) => handleChange('text', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="🎉 Special Offer: Get 20% off!"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Icon (emoji, optional)</label>
              <input
                type="text"
                value={formData.icon || ''}
                onChange={(e) => handleChange('icon', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="🎉"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Link URL (optional)</label>
              <input
                type="url"
                value={formData.link || ''}
                onChange={(e) => handleChange('link', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Link Text</label>
              <input
                type="text"
                value={formData.linkText || ''}
                onChange={(e) => handleChange('linkText', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Shop Now"
              />
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.dismissible || false}
                  onChange={(e) => handleChange('dismissible', e.target.checked)}
                  className="rounded border-gray-200"
                />
                <span className="text-sm text-madas-text/80">Allow Dismiss</span>
              </label>
            </div>
            <div className="border-t border-gray-200 pt-4 mt-4">
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={formData.enableMarquee || false}
                  onChange={(e) => handleChange('enableMarquee', e.target.checked)}
                  className="rounded border-gray-200"
                />
                <span className="text-sm font-medium text-madas-text/80">Enable Scrolling Text</span>
              </label>
              {formData.enableMarquee && (
                <div>
                  <label className="block text-sm text-madas-text/60 mb-2">Speed (seconds for full scroll)</label>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={formData.marqueeSpeed || 30}
                    onChange={(e) => handleChange('marqueeSpeed', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-madas-text/50 mt-1">
                    <span>Fast (10s)</span>
                    <span>{formData.marqueeSpeed || 30}s</span>
                    <span>Slow (60s)</span>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Background Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.backgroundColor || '#27491F'}
                  onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  className="w-16 h-10 rounded border border-gray-200"
                />
                <input
                  type="text"
                  value={formData.backgroundColor || ''}
                  onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Text Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.textColor || '#ffffff'}
                  onChange={(e) => handleChange('textColor', e.target.value)}
                  className="w-16 h-10 rounded border border-gray-200"
                />
                <input
                  type="text"
                  value={formData.textColor || ''}
                  onChange={(e) => handleChange('textColor', e.target.value)}
                  className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        );

      case 'partners':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Trusted By"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Subtitle</label>
              <input
                type="text"
                value={formData.subtitle || ''}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.grayscale !== false}
                  onChange={(e) => handleChange('grayscale', e.target.checked)}
                  className="rounded border-gray-200"
                />
                <span className="text-sm text-madas-text/80">Grayscale logos</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.autoScroll || false}
                  onChange={(e) => handleChange('autoScroll', e.target.checked)}
                  className="rounded border-gray-200"
                />
                <span className="text-sm text-madas-text/80">Auto-scroll animation</span>
              </label>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-madas-text/80">Partners</label>
                <button
                  type="button"
                  onClick={() => handleAddArrayItem('partners', { name: 'Partner', logo: '' })}
                  className="text-xs text-primary hover:underline"
                >
                  + Add Partner
                </button>
              </div>
              <div className="space-y-3">
                {(formData.partners || []).map((partner: any, index: number) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-madas-text/70">Partner {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveArrayItem('partners', index)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="text"
                      value={partner.name || ''}
                      onChange={(e) => handleArrayChange('partners', index, { name: e.target.value })}
                      placeholder="Partner Name"
                      className="w-full mb-2 rounded border border-gray-200 px-2 py-1 text-sm"
                    />
                    <ImageUploader
                      currentUrl={partner.logo}
                      onUpload={(url) => handleArrayChange('partners', index, { logo: url })}
                      label="Logo"
                      className="mb-2"
                    />
                    <input
                      type="url"
                      value={partner.link || ''}
                      onChange={(e) => handleArrayChange('partners', index, { link: e.target.value })}
                      placeholder="Website URL (optional)"
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'newsletter':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Subtitle</label>
              <input
                type="text"
                value={formData.subtitle || ''}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Placeholder Text</label>
              <input
                type="text"
                value={formData.placeholder || ''}
                onChange={(e) => handleChange('placeholder', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Enter your email address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Button Text</label>
              <input
                type="text"
                value={formData.buttonText || ''}
                onChange={(e) => handleChange('buttonText', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Subscribe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Success Message</label>
              <input
                type="text"
                value={formData.successMessage || ''}
                onChange={(e) => handleChange('successMessage', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Thank you for subscribing!"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Background Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.backgroundColor || '#f9fafb'}
                  onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  className="w-16 h-10 rounded border border-gray-200"
                />
                <input
                  type="text"
                  value={formData.backgroundColor || ''}
                  onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        );

      case 'divider':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Divider Style</label>
              <select
                value={formData.style || 'line'}
                onChange={(e) => handleChange('style', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="line">Solid Line</option>
                <option value="dotted">Dotted</option>
                <option value="dashed">Dashed</option>
                <option value="gradient">Gradient</option>
                <option value="wave">Wave</option>
                <option value="zigzag">Zigzag</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.color || '#e5e7eb'}
                  onChange={(e) => handleChange('color', e.target.value)}
                  className="w-16 h-10 rounded border border-gray-200"
                />
                <input
                  type="text"
                  value={formData.color || ''}
                  onChange={(e) => handleChange('color', e.target.value)}
                  className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Line Height (px)</label>
              <input
                type="number"
                value={formData.height || 1}
                onChange={(e) => handleChange('height', parseInt(e.target.value) || 1)}
                min="1"
                max="10"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Width</label>
              <select
                value={formData.width || '100%'}
                onChange={(e) => handleChange('width', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="100%">Full Width</option>
                <option value="75%">75%</option>
                <option value="50%">50%</option>
                <option value="25%">25%</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Vertical Spacing (px)</label>
              <input
                type="number"
                value={formData.spacing || 40}
                onChange={(e) => handleChange('spacing', parseInt(e.target.value) || 40)}
                min="0"
                max="200"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
        );

      case 'imageComparison':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Title (Optional)</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Before & After"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Subtitle (Optional)</label>
              <input
                type="text"
                value={formData.subtitle || ''}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="See the difference"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Before Image</label>
              <ImageUploader
                currentUrl={formData.beforeImage}
                onUpload={(url) => handleChange('beforeImage', url)}
                label=""
              />
              <input
                type="url"
                value={formData.beforeImage || ''}
                onChange={(e) => handleChange('beforeImage', e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Or enter before image URL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">After Image</label>
              <ImageUploader
                currentUrl={formData.afterImage}
                onUpload={(url) => handleChange('afterImage', url)}
                label=""
              />
              <input
                type="url"
                value={formData.afterImage || ''}
                onChange={(e) => handleChange('afterImage', e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Or enter after image URL"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">Before Label</label>
                <input
                  type="text"
                  value={formData.beforeLabel || ''}
                  onChange={(e) => handleChange('beforeLabel', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Before"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">After Label</label>
                <input
                  type="text"
                  value={formData.afterLabel || ''}
                  onChange={(e) => handleChange('afterLabel', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="After"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Initial Slider Position (%)</label>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.sliderPosition || 50}
                onChange={(e) => handleChange('sliderPosition', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-madas-text/50 text-center">{formData.sliderPosition || 50}%</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Slider Line Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.sliderColor || '#FFFFFF'}
                  onChange={(e) => handleChange('sliderColor', e.target.value)}
                  className="w-16 h-10 rounded border border-gray-200"
                />
                <input
                  type="text"
                  value={formData.sliderColor || '#FFFFFF'}
                  onChange={(e) => handleChange('sliderColor', e.target.value)}
                  className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.showLabels !== false}
                  onChange={(e) => handleChange('showLabels', e.target.checked)}
                  className="rounded border-gray-200"
                />
                <span className="text-sm text-madas-text/80">Show Labels</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Orientation</label>
              <select
                value={formData.orientation || 'horizontal'}
                onChange={(e) => handleChange('orientation', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="horizontal">Horizontal (Left/Right)</option>
                <option value="vertical">Vertical (Top/Bottom)</option>
              </select>
            </div>
          </div>
        );

      default:
        return <div className="text-sm text-madas-text/60">No editor available for this section type</div>;
    }
  };

  const handleStyleChange = (field: string, value: any) => {
    const currentStyle = section.style || {};
    const newStyle = {
      ...currentStyle,
      [field]: value
    };
    onUpdate({ ...section.data, _style: newStyle });
  };

  const handlePaddingChange = (side: string, value: number) => {
    const currentStyle = section.style || {};
    const currentPadding = currentStyle.padding || {};
    handleStyleChange('padding', {
      ...currentPadding,
      [side]: value
    });
  };

  const handleMarginChange = (side: string, value: number) => {
    const currentStyle = section.style || {};
    const currentMargin = currentStyle.margin || {};
    handleStyleChange('margin', {
      ...currentMargin,
      [side]: value
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Back Button */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-madas-text/70 hover:text-primary transition-colors mb-3"
        >
          <span className="material-icons text-lg">arrow_back</span>
          <span>Back to Sections</span>
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-primary">Edit Section</h3>
            <p className="text-xs text-madas-text/60 capitalize">{section.type}</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-primary mb-4">Content</h4>
            {renderEditor()}
          </div>
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-sm font-semibold text-primary mb-4">Style & Layout</h4>
            <div className="space-y-4">
              {/* Padding */}
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">Padding (px)</label>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs text-madas-text/60 mb-1">Top</label>
                    <input
                      type="number"
                      value={section.style?.padding?.top || ''}
                      onChange={(e) => handlePaddingChange('top', parseInt(e.target.value) || 0)}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-madas-text/60 mb-1">Right</label>
                    <input
                      type="number"
                      value={section.style?.padding?.right || ''}
                      onChange={(e) => handlePaddingChange('right', parseInt(e.target.value) || 0)}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-madas-text/60 mb-1">Bottom</label>
                    <input
                      type="number"
                      value={section.style?.padding?.bottom || ''}
                      onChange={(e) => handlePaddingChange('bottom', parseInt(e.target.value) || 0)}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-madas-text/60 mb-1">Left</label>
                    <input
                      type="number"
                      value={section.style?.padding?.left || ''}
                      onChange={(e) => handlePaddingChange('left', parseInt(e.target.value) || 0)}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
              
              {/* Margin */}
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">Margin (px)</label>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs text-madas-text/60 mb-1">Top</label>
                    <input
                      type="number"
                      value={section.style?.margin?.top || ''}
                      onChange={(e) => handleMarginChange('top', parseInt(e.target.value) || 0)}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-madas-text/60 mb-1">Right</label>
                    <input
                      type="number"
                      value={section.style?.margin?.right || ''}
                      onChange={(e) => handleMarginChange('right', parseInt(e.target.value) || 0)}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-madas-text/60 mb-1">Bottom</label>
                    <input
                      type="number"
                      value={section.style?.margin?.bottom || ''}
                      onChange={(e) => handleMarginChange('bottom', parseInt(e.target.value) || 0)}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-madas-text/60 mb-1">Left</label>
                    <input
                      type="number"
                      value={section.style?.margin?.left || ''}
                      onChange={(e) => handleMarginChange('left', parseInt(e.target.value) || 0)}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Background Color */}
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">Background Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={section.style?.backgroundColor || '#ffffff'}
                    onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                    className="w-16 h-10 rounded border border-gray-200"
                  />
                  <input
                    type="text"
                    value={section.style?.backgroundColor || ''}
                    onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                    placeholder="#ffffff or transparent"
                    className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Text Color */}
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">Text Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={section.style?.textColor || '#000000'}
                    onChange={(e) => handleStyleChange('textColor', e.target.value)}
                    className="w-16 h-10 rounded border border-gray-200"
                  />
                  <input
                    type="text"
                    value={section.style?.textColor || ''}
                    onChange={(e) => handleStyleChange('textColor', e.target.value)}
                    placeholder="#000000"
                    className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Border Radius */}
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">Border Radius (px)</label>
                <input
                  type="number"
                  value={section.style?.borderRadius || ''}
                  onChange={(e) => handleStyleChange('borderRadius', parseInt(e.target.value) || 0)}
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
                  placeholder="0"
                />
              </div>

              {/* Max Width */}
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">Max Width (px)</label>
                <input
                  type="number"
                  value={section.style?.maxWidth || ''}
                  onChange={(e) => handleStyleChange('maxWidth', parseInt(e.target.value) || undefined)}
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Full width (leave empty)"
                />
                {section.style?.maxWidth && (
                  <div className="mt-2">
                    <label className="block text-xs text-madas-text/60 mb-1">Alignment</label>
                    <select
                      value={section.style?.align || 'left'}
                      onChange={(e) => handleStyleChange('align', e.target.value)}
                      className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Shadow */}
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={section.style?.shadow || false}
                    onChange={(e) => handleStyleChange('shadow', e.target.checked)}
                    className="rounded border-gray-200"
                  />
                  <span className="text-sm text-madas-text/80">Enable Shadow</span>
                </label>
              </div>

              {/* Background Image */}
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">Background Image</label>
                <ImageUploader
                  currentUrl={section.style?.backgroundImage}
                  onUpload={(url) => handleStyleChange('backgroundImage', url)}
                  label=""
                />
                <input
                  type="url"
                  value={section.style?.backgroundImage || ''}
                  onChange={(e) => handleStyleChange('backgroundImage', e.target.value)}
                  placeholder="Or enter image URL manually"
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {/* Animation */}
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">Animation</label>
                <select
                  value={section.style?.animation || 'none'}
                  onChange={(e) => handleStyleChange('animation', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="none">None</option>
                  <option value="fadeIn">Fade In</option>
                  <option value="slideUp">Slide Up</option>
                  <option value="slideDown">Slide Down</option>
                  <option value="slideLeft">Slide Left</option>
                  <option value="slideRight">Slide Right</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionEditor;

