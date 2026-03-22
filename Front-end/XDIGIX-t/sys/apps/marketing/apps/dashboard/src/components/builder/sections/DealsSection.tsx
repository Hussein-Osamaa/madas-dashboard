import { memo } from 'react';
import { DealsSectionData } from '../../../types/builder';
import BlockWrapper from '../BlockWrapper';

type Props = { data: DealsSectionData; style?: React.CSSProperties; isSelected?: boolean; onEditBlock?: (dataKey: string, blockIndex: number) => void; onDeleteBlock?: (dataKey: string, blockIndex: number) => void };

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=800&fit=crop';

const DealsSection = ({ data, style, isSelected, onEditBlock, onDeleteBlock }: Props) => {
  const d = (data ?? {}) as Record<string, any>;

  const title = d.title || 'Featured product';
  const headingSize = d.heading_size ?? 'h1';
  const mediaPosition = d.media_position ?? 'left';
  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;

  const products = d.selectedProducts ?? [];
  const product = products[0] || { name: 'Premium Leather Jacket', price: 249.99, image: '', description: 'Crafted from genuine full-grain leather, this timeless jacket features a modern slim fit with classic details. Perfect for any season and built to last a lifetime.' };

  const headingSizeMap: Record<string, string> = {
    h2: 'text-2xl md:text-3xl',
    h1: 'text-3xl md:text-4xl',
    h0: 'text-4xl md:text-5xl',
    hxl: 'text-5xl md:text-6xl',
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  };

  const imageSection = (
    <div className="md:w-1/2 bg-[#F3F3F3]">
      <img src={product.image || FALLBACK_IMAGE} alt={product.name} className="w-full aspect-square object-cover" />
    </div>
  );

  const infoSection = (
    <div className="md:w-1/2 flex flex-col justify-center px-6 md:px-12 py-8">
      <h2 className={`${headingSizeMap[headingSize] || headingSizeMap.h1} font-bold mb-2`}>
        {product.name}
      </h2>
      <p className="text-lg mb-4">
        {product.onSale || product.salePrice ? (
          <>
            <span className="text-red-600 mr-2">{formatPrice(product.salePrice ?? product.sellingPrice ?? product.price)}</span>
            <span className="line-through" style={{ opacity: 0.5 }}>{formatPrice(product.compareAtPrice ?? product.price)}</span>
          </>
        ) : (
          formatPrice(product.sellingPrice ?? product.price ?? 0)
        )}
      </p>
      {product.description && (
        <p className="text-sm mb-6 leading-relaxed" style={{ opacity: 0.75 }}>{product.description}</p>
      )}
      {/* Quantity selector */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-xs font-medium uppercase tracking-wider">Quantity</label>
        <div className="flex border" style={{ borderColor: 'currentColor', opacity: 0.2 }}>
          <button className="px-3 py-2 transition-colors">&minus;</button>
          <input type="number" defaultValue={1} min={1}
            className="w-12 text-center text-sm border-x outline-none bg-transparent" style={{ borderColor: 'inherit' }} />
          <button className="px-3 py-2 transition-colors">+</button>
        </div>
      </div>
      <button className="w-full py-3 text-sm font-medium tracking-wider uppercase transition-colors"
        style={{ backgroundColor: 'var(--scheme-btn-bg, #121212)', color: 'var(--scheme-btn-label, #fff)' }}>
        Add to cart
      </button>
    </div>
  );

  return (
    <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <BlockWrapper dataKey="contentBlocks" blockIndex={0} blockType="product_block" isSelected={!!isSelected} onEdit={onEditBlock ?? ((_dk: string, _bi: number) => {})} onDelete={onDeleteBlock ?? ((_dk: string, _bi: number) => {})}>
        <div className={`flex flex-col md:flex-row ${mediaPosition === 'right' ? 'md:flex-row-reverse' : ''}`}>
          {imageSection}
          {infoSection}
        </div>
        </BlockWrapper>
      </div>
    </section>
  );
};

export default memo(DealsSection);
