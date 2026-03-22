import { memo } from 'react';
import { CollectionsSectionData } from '../../../types/builder';
import BlockWrapper from '../BlockWrapper';

type Props = { data: CollectionsSectionData; style?: React.CSSProperties; isSelected?: boolean; onEditBlock?: (dataKey: string, blockIndex: number) => void; onDeleteBlock?: (dataKey: string, blockIndex: number) => void };

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=600&h=600&fit=crop',
];

const CollectionsSection = ({ data, style, isSelected, onEditBlock, onDeleteBlock }: Props) => {
  const d = (data ?? {}) as Record<string, any>;

  const title = d.title || 'Collections';
  const headingSize = d.heading_size ?? 'h1';
  const imageRatio = d.image_ratio ?? 'square';
  const columnsDesktop = d.columns_desktop ?? d.columns ?? 3;
  const showViewAll = d.show_view_all ?? false;
  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;

  const collections = d.selectedCollections ?? d.collections ?? [];

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
    4: 'grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 lg:grid-cols-5',
    6: 'grid-cols-2 lg:grid-cols-6',
  };

  const ratioMap: Record<string, string> = {
    adapt: '',
    portrait: 'aspect-[3/4]',
    square: 'aspect-square',
  };

  const defaultCollections = [
    { name: 'Collection 1', image: '', id: '1' },
    { name: 'Collection 2', image: '', id: '2' },
    { name: 'Collection 3', image: '', id: '3' },
  ];

  const displayCollections = collections.length > 0 ? collections : defaultCollections;

  return (
    <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        {title && (
          <div className="flex items-baseline justify-between mb-8">
            <h2 className={`${headingSizeMap[headingSize] || headingSizeMap.h1} font-bold`}>
              {title}
            </h2>
            {showViewAll && (
              <a href="#" className="text-sm underline hover:no-underline">View all</a>
            )}
          </div>
        )}
        <div className={`grid ${colsMap[columnsDesktop] || colsMap[3]} gap-6`}>
          {displayCollections.map((col: any, index: number) => (
            <BlockWrapper key={col.id || index} dataKey="items" blockIndex={index} blockType="collection" isSelected={!!isSelected} onEdit={onEditBlock ?? ((_dk: string, _bi: number) => {})} onDelete={onDeleteBlock ?? ((_dk: string, _bi: number) => {})}>
            <a href="#" className="group block">
              <div className={`bg-[#F3F3F3] overflow-hidden mb-3 ${ratioMap[imageRatio] || 'aspect-square'}`}>
                <img src={col.image || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]} alt={col.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <h3 className="text-sm font-normal group-hover:underline">{col.name}</h3>
            </a>
            </BlockWrapper>
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(CollectionsSection);
