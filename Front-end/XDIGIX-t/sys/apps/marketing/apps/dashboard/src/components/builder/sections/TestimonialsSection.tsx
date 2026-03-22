import { memo } from 'react';
import { TestimonialsSectionData } from '../../../types/builder';
import BlockWrapper from '../BlockWrapper';

type Props = { data: TestimonialsSectionData; style?: React.CSSProperties; isSelected?: boolean; onEditBlock?: (dataKey: string, blockIndex: number) => void; onDeleteBlock?: (dataKey: string, blockIndex: number) => void };

const FALLBACK_AVATARS = [
  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
];

const TestimonialsSection = ({ data, style, isSelected, onEditBlock, onDeleteBlock }: Props) => {
  const d = (data ?? {}) as Record<string, any>;

  const title = d.title || 'Testimonials';
  const headingSize = d.heading_size ?? 'h1';
  const columns = d.columns ?? 3;
  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;

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
  };

  const defaultItems = [
    { name: 'Customer', role: '', text: 'Share what your customers are saying about your products, customer service, or brand.', rating: 5, image: '' },
    { name: 'Customer', role: '', text: 'Share what your customers are saying about your products, customer service, or brand.', rating: 5, image: '' },
    { name: 'Customer', role: '', text: 'Share what your customers are saying about your products, customer service, or brand.', rating: 5, image: '' },
  ];

  const displayItems = items.length > 0 ? items : defaultItems;

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className="text-sm" style={{ opacity: i <= rating ? 1 : 0.2 }}>&#9733;</span>
      ))}
    </div>
  );

  return (
    <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        {title && (
          <h2 className={`${headingSizeMap[headingSize] || headingSizeMap.h1} font-bold text-center mb-10`}>
            {title}
          </h2>
        )}
        <div className={`grid ${colsMap[columns] || colsMap[3]} gap-8`}>
          {displayItems.map((item: any, index: number) => (
            <BlockWrapper key={index} dataKey="items" blockIndex={index} blockType="testimonial" isSelected={!!isSelected} onEdit={onEditBlock ?? ((_dk: string, _bi: number) => {})} onDelete={onDeleteBlock ?? ((_dk: string, _bi: number) => {})}>
            <div className="text-center">
              {item.rating > 0 && (
                <div className="flex justify-center mb-4">{renderStars(item.rating)}</div>
              )}
              <blockquote className="text-sm leading-relaxed mb-4 italic" style={{ opacity: 0.75 }}>
                "{item.text}"
              </blockquote>
              <div className="flex items-center justify-center gap-3">
                <img src={item.image || FALLBACK_AVATARS[index % FALLBACK_AVATARS.length]} alt={item.name} className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  {item.role && <p className="text-xs" style={{ opacity: 0.6 }}>{item.role}</p>}
                </div>
              </div>
            </div>
            </BlockWrapper>
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(TestimonialsSection);
