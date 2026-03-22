import { memo, useState, Fragment } from 'react';
import BlockWrapper from '../BlockWrapper';

type Props = {
  data: Record<string, any>;
  style?: React.CSSProperties;
  isSelected?: boolean;
  onEditBlock?: (dataKey: string, blockIndex: number) => void;
  onDeleteBlock?: (dataKey: string, blockIndex: number) => void;
};

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop';

const ProductInfoSection = ({ data, style, isSelected = false, onEditBlock, onDeleteBlock }: Props) => {
  const d = (data ?? {}) as Record<string, any>;
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Product data (from preview product or defaults)
  const productName = d.product_name || 'Sample Product';
  const productVendor = d.product_vendor || 'Vendor';
  const productPrice = d.product_price ?? 99.99;
  const productComparePrice = d.product_compare_price ?? 0;
  const productDescription = d.product_description || 'This is a sample product description. Add details about materials, care instructions, sizing, and other important information.';
  const productImages = d.product_images?.length ? d.product_images : [FALLBACK_IMAGE];
  const productAvailable = d.product_available ?? true;
  const productSku = d.product_sku || 'SKU-001';
  const productInventory = d.product_inventory ?? 25;

  // Layout settings
  const mediaWidth = d.media_width ?? 'medium';
  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;

  // Blocks
  const blocks: any[] = d.blocks ?? [];

  const mediaWidthMap: Record<string, string> = {
    small: 'md:w-5/12',
    medium: 'md:w-1/2',
    large: 'md:w-7/12',
  };

  const wrapBlock = (blockIndex: number, blockType: string, children: React.ReactNode) => {
    if (!isSelected) return <Fragment key={`block-${blockIndex}`}>{children}</Fragment>;
    return (
      <BlockWrapper key={`block-${blockIndex}`} dataKey="blocks" blockIndex={blockIndex} blockType={blockType} isSelected={isSelected} onEdit={onEditBlock ?? (() => {})} onDelete={onDeleteBlock ?? (() => {})}>
        {children}
      </BlockWrapper>
    );
  };

  const renderBlock = (block: any, idx: number) => {
    switch (block.type) {
      case 'title':
        return wrapBlock(idx, 'title',
          <h1 className="text-2xl md:text-3xl font-bold mb-1">{productName}</h1>
        );

      case 'price':
        return wrapBlock(idx, 'price',
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-xl font-semibold">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(productPrice)}
            </span>
            {productComparePrice > 0 && productComparePrice > productPrice && (
              <span className="text-sm line-through opacity-50">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(productComparePrice)}
              </span>
            )}
            {productComparePrice > productPrice && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                Sale
              </span>
            )}
          </div>
        );

      case 'vendor':
        return wrapBlock(idx, 'vendor',
          <p className="text-sm opacity-60 uppercase tracking-wider mb-3">{productVendor}</p>
        );

      case 'description':
        return wrapBlock(idx, 'description',
          <div className="prose prose-sm max-w-none mb-6 text-sm leading-relaxed opacity-80">
            <p>{productDescription}</p>
          </div>
        );

      case 'variant_picker': {
        const variantStyle = block.picker_type || 'dropdown';
        const sampleOptions = (d.product_variants as any[]) ?? [
          { name: 'Size', values: ['S', 'M', 'L', 'XL'] },
          { name: 'Color', values: ['Black', 'White', 'Navy'] },
        ];
        return wrapBlock(idx, 'variant_picker',
          <div className="mb-4 space-y-3">
            {sampleOptions.map((opt: any, oi: number) => (
              <div key={oi}>
                <label className="text-sm font-medium mb-1.5 block">{opt.name}</label>
                {variantStyle === 'pills' ? (
                  <div className="flex flex-wrap gap-2">
                    {(opt.values ?? []).map((v: string, vi: number) => (
                      <button
                        key={vi}
                        className={`px-3 py-1.5 text-sm border rounded-full transition-colors ${vi === 0 ? 'border-current bg-[#121212] text-white' : 'border-gray-300 hover:border-current'}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                ) : variantStyle === 'color_swatches' && opt.name.toLowerCase() === 'color' ? (
                  <div className="flex flex-wrap gap-2">
                    {(opt.values ?? []).map((v: string, vi: number) => {
                      const colorMap: Record<string, string> = { Black: '#000', White: '#fff', Navy: '#1e3a5f', Red: '#dc2626', Blue: '#2563eb', Green: '#16a34a', Pink: '#ec4899', Gray: '#6b7280', Brown: '#92400e', Beige: '#d4b896' };
                      return (
                        <button
                          key={vi}
                          title={v}
                          className={`w-8 h-8 rounded-full border-2 transition-colors ${vi === 0 ? 'border-current ring-2 ring-offset-1 ring-[#121212]' : 'border-gray-200 hover:border-current'}`}
                          style={{ backgroundColor: colorMap[v] || '#ccc' }}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <select className="w-full border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-current">
                    {(opt.values ?? []).map((v: string, vi: number) => (
                      <option key={vi}>{v}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        );
      }

      case 'quantity_selector':
        return wrapBlock(idx, 'quantity_selector',
          <div className="mb-4">
            <label className="text-sm font-medium mb-2 block">Quantity</label>
            <div className="flex items-center border rounded-lg w-fit">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 flex items-center justify-center text-lg hover:bg-gray-50 transition-colors"
              >
                -
              </button>
              <span className="w-12 h-10 flex items-center justify-center text-sm font-medium border-x">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 flex items-center justify-center text-lg hover:bg-gray-50 transition-colors"
              >
                +
              </button>
            </div>
          </div>
        );

      case 'buy_buttons':
        return wrapBlock(idx, 'buy_buttons',
          <div className="flex flex-col gap-2 mb-6">
            {productAvailable ? (
              <>
                <button className="w-full py-3 px-6 border border-current text-sm font-medium tracking-wider uppercase transition-colors hover:opacity-80">
                  Add to cart
                </button>
                <button className="w-full py-3 px-6 text-sm font-medium tracking-wider uppercase transition-colors text-white"
                  style={{ backgroundColor: 'var(--scheme-btn-bg, #121212)' }}>
                  Buy it now
                </button>
              </>
            ) : (
              <button className="w-full py-3 px-6 bg-gray-200 text-gray-500 text-sm font-medium tracking-wider uppercase cursor-not-allowed" disabled>
                Sold out
              </button>
            )}
          </div>
        );

      case 'sku':
        return wrapBlock(idx, 'sku',
          <p className="text-xs opacity-50 mb-2">SKU: {productSku}</p>
        );

      case 'inventory_status':
        return wrapBlock(idx, 'inventory_status',
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-2 h-2 rounded-full ${productInventory > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">
              {productInventory > 0 ? `${productInventory} in stock` : 'Out of stock'}
            </span>
          </div>
        );

      case 'share':
        return wrapBlock(idx, 'share',
          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
            <span className="material-icons text-lg opacity-60">share</span>
            <span className="text-sm">Share</span>
          </div>
        );

      case 'collapsible_tab':
        return wrapBlock(idx, 'collapsible_tab',
          <details className="border-t py-3 group mb-1">
            <summary className="flex items-center justify-between cursor-pointer text-sm font-medium">
              <span>{block.heading || 'Details'}</span>
              <span className="material-icons text-sm transition-transform group-open:rotate-180">expand_more</span>
            </summary>
            <div className="pt-3 text-sm opacity-75 leading-relaxed">
              {block.content || 'Add content for this tab.'}
            </div>
          </details>
        );

      case 'custom_text':
        return wrapBlock(idx, 'custom_text',
          <div className="text-sm leading-relaxed mb-4 opacity-80">
            {block.text || 'Custom text block'}
          </div>
        );

      case 'rating':
        return wrapBlock(idx, 'rating',
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map(star => (
              <span key={star} className="material-icons text-base" style={{ color: star <= 4 ? '#f59e0b' : '#d1d5db' }}>star</span>
            ))}
            <span className="text-sm opacity-60 ml-1">(12 reviews)</span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* Product Media */}
          <div className={`${mediaWidthMap[mediaWidth] || 'md:w-1/2'} flex-shrink-0`}>
            {/* Main image */}
            <div className="aspect-square bg-[#f5f5f5] rounded-lg overflow-hidden mb-3">
              <img
                src={productImages[selectedImage] || FALLBACK_IMAGE}
                alt={productName}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Thumbnails */}
            {productImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {productImages.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 rounded-md overflow-hidden flex-shrink-0 border-2 transition-colors ${
                      i === selectedImage ? 'border-[#121212]' : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info — blocks rendered in order */}
          <div className="flex-1 min-w-0">
            {blocks.length > 0 ? (
              blocks.map((block: any, idx: number) => renderBlock(block, idx))
            ) : (
              /* Fallback when no blocks exist */
              <>
                <p className="text-sm opacity-60 uppercase tracking-wider mb-3">{productVendor}</p>
                <h1 className="text-2xl md:text-3xl font-bold mb-1">{productName}</h1>
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-xl font-semibold">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(productPrice)}
                  </span>
                </div>
                <div className="prose prose-sm max-w-none mb-6 text-sm leading-relaxed opacity-80">
                  <p>{productDescription}</p>
                </div>
                <button className="w-full py-3 px-6 border border-current text-sm font-medium tracking-wider uppercase">
                  Add to cart
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default memo(ProductInfoSection);
