import { memo } from 'react';
import { GallerySectionData } from '../../../types/builder';
import BlockWrapper from '../BlockWrapper';

type Props = { data: GallerySectionData; style?: React.CSSProperties; isSelected?: boolean; onEditBlock?: (dataKey: string, blockIndex: number) => void; onDeleteBlock?: (dataKey: string, blockIndex: number) => void };

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop',
  'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&h=800&fit=crop',
];

const GallerySection = ({ data, style, isSelected, onEditBlock, onDeleteBlock }: Props) => {
  const d = (data ?? {}) as Record<string, any>;

  const heading = d.heading ?? d.title ?? '';
  const headingSize = d.heading_size ?? 'h1';
  const desktopLayout = d.desktop_layout ?? 'left';
  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;

  const images = d.images ?? [];

  const headingSizeMap: Record<string, string> = {
    h2: 'text-2xl md:text-3xl',
    h1: 'text-3xl md:text-4xl',
    h0: 'text-4xl md:text-5xl',
    hxl: 'text-5xl md:text-6xl',
  };

  const defaultImages = [
    { url: '', alt: 'Image 1', caption: '' },
    { url: '', alt: 'Image 2', caption: '' },
    { url: '', alt: 'Image 3', caption: '' },
  ];

  const displayImages = images.length > 0 ? images : defaultImages;

  // Dawn collage: first item is large, others are stacked small
  const large = displayImages[0];
  const small = displayImages.slice(1, 3);

  const renderImageCard = (img: any, isLarge: boolean, index: number) => (
    <div className={`bg-[#F3F3F3] overflow-hidden ${isLarge ? 'aspect-square' : 'aspect-square'}`}>
      <img src={img.url || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]} alt={img.alt || ''} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
    </div>
  );

  return (
    <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        {heading && (
          <h2 className={`${headingSizeMap[headingSize] || headingSizeMap.h1} font-bold mb-8`}>
            {heading}
          </h2>
        )}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${desktopLayout === 'right' ? 'direction-rtl' : ''}`}>
          {/* Large image */}
          <BlockWrapper dataKey="images" blockIndex={0} blockType="image" isSelected={!!isSelected} onEdit={onEditBlock ?? ((_dk: string, _bi: number) => {})} onDelete={onDeleteBlock ?? ((_dk: string, _bi: number) => {})}>
          <div className="md:row-span-2">
            {renderImageCard(large, true, 0)}
          </div>
          </BlockWrapper>
          {/* Small images stacked */}
          {small.map((img: any, i: number) => (
            <BlockWrapper key={i} dataKey="images" blockIndex={i + 1} blockType="image" isSelected={!!isSelected} onEdit={onEditBlock ?? ((_dk: string, _bi: number) => {})} onDelete={onDeleteBlock ?? ((_dk: string, _bi: number) => {})}>
            <div>
              {renderImageCard(img, false, i + 1)}
            </div>
            </BlockWrapper>
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(GallerySection);
