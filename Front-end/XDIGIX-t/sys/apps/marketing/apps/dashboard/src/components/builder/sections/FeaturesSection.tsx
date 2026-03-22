import { memo } from 'react';
import { FeaturesSectionData } from '../../../types/builder';
import { stripHtml } from './sanitizeHtml';
import BlockWrapper from '../BlockWrapper';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=600&fit=crop';

type Props = { data: FeaturesSectionData; style?: React.CSSProperties; isSelected?: boolean; onEditBlock?: (dataKey: string, blockIndex: number) => void; onDeleteBlock?: (dataKey: string, blockIndex: number) => void };

const FeaturesSection = ({ data, style, isSelected, onEditBlock, onDeleteBlock }: Props) => {
  const d = (data ?? {}) as Record<string, any>;

  // Settings
  const title = d.title || '';
  const headingSize = d.heading_size ?? 'h1';
  const columnsDesktop = d.columns_desktop ?? d.columns ?? 3;
  const columnAlignment = d.column_alignment ?? 'left';
  const imageWidth = d.image_width ?? 'full';
  const imageRatio = d.image_ratio ?? 'adapt';
  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;

  // Blocks (items array)
  const items = d.items ?? [];

  const headingSizeMap: Record<string, string> = {
    h2: 'text-2xl md:text-3xl',
    h1: 'text-3xl md:text-4xl',
    h0: 'text-4xl md:text-5xl',
    hxl: 'text-5xl md:text-6xl',
  };

  const colsMap: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  const imageRatioMap: Record<string, string> = {
    adapt: '',
    portrait: 'aspect-[3/4]',
    square: 'aspect-square',
    circle: 'aspect-square rounded-full',
  };

  const imageWidthMap: Record<string, string> = {
    third: 'w-1/3',
    half: 'w-1/2',
    full: 'w-full',
  };

  const alignMap: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
  };

  const defaultItems = [
    { title: 'Column', text: 'Pair text with an image to focus on your chosen product, collection, or blog post.', image: '', icon: '', link_label: '', link: '' },
    { title: 'Column', text: 'Pair text with an image to focus on your chosen product, collection, or blog post.', image: '', icon: '', link_label: '', link: '' },
    { title: 'Column', text: 'Pair text with an image to focus on your chosen product, collection, or blog post.', image: '', icon: '', link_label: '', link: '' },
  ];

  const displayItems = items.length > 0 ? items : defaultItems;

  return (
    <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        {title && (
          <h2 className={`${headingSizeMap[headingSize] || headingSizeMap.h1} font-bold mb-8 ${alignMap[columnAlignment] || 'text-left'}`}>
            {title}
          </h2>
        )}
        <div className={`grid ${colsMap[columnsDesktop] || colsMap[3]} gap-6 sm:gap-8`}>
          {displayItems.map((item: any, index: number) => (
            <BlockWrapper key={index} dataKey="items" blockIndex={index} blockType="column" isSelected={!!isSelected} onEdit={onEditBlock ?? ((_dk: string, _bi: number) => {})} onDelete={onDeleteBlock ?? ((_dk: string, _bi: number) => {})}>
            <div className={`${alignMap[columnAlignment] || 'text-left'}`}>
              {/* Image or Icon */}
              {item.image ? (
                <div className={`${imageWidthMap[imageWidth] || 'w-full'} mb-4 overflow-hidden bg-[#F3F3F3] ${columnAlignment === 'center' ? 'mx-auto' : ''}`}>
                  <img src={item.image} alt={item.title || ''}
                    className={`w-full object-cover ${imageRatioMap[imageRatio] || ''}`} />
                </div>
              ) : item.icon ? (
                <div className="text-3xl mb-4">
                  <span className="material-icons text-4xl">{item.icon}</span>
                </div>
              ) : (
                <div className={`${imageWidthMap[imageWidth] || 'w-full'} mb-4 overflow-hidden bg-[#F3F3F3] ${columnAlignment === 'center' ? 'mx-auto' : ''}`}>
                  <img src={FALLBACK_IMAGE} alt={item.title || ''}
                    className={`w-full object-cover ${imageRatioMap[imageRatio] || ''}`} />
                </div>
              )}
              {item.title && (
                <h3 className="text-base font-bold mb-2">{item.title}</h3>
              )}
              {item.text && (
                <p className="text-sm leading-relaxed" style={{ opacity: 0.75 }}>{stripHtml(item.text || item.description || '')}</p>
              )}
              {item.link_label && item.link && (
                <a href={item.link} className="inline-block mt-3 text-sm underline hover:no-underline">
                  {item.link_label}
                </a>
              )}
            </div>
            </BlockWrapper>
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(FeaturesSection);
