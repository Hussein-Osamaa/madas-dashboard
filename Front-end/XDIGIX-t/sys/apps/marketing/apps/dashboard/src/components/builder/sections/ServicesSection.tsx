import { memo } from 'react';
import { ServicesSectionData } from '../../../types/builder';
import { stripHtml } from './sanitizeHtml';
import BlockWrapper from '../BlockWrapper';

type Props = { data: ServicesSectionData; style?: React.CSSProperties; isSelected?: boolean; onEditBlock?: (dataKey: string, blockIndex: number) => void; onDeleteBlock?: (dataKey: string, blockIndex: number) => void };

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop';

const ServicesSection = ({ data, style, isSelected, onEditBlock, onDeleteBlock }: Props) => {
  const d = (data ?? {}) as Record<string, any>;

  const title = d.title || '';
  const headingSize = d.heading_size ?? 'h1';
  const imageLayout = d.image_layout ?? 'alternate-left';
  const contentPosition = d.desktop_content_position ?? 'middle';
  const contentAlignment = d.desktop_content_alignment ?? 'left';
  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;

  const services = d.services ?? [];

  const headingSizeMap: Record<string, string> = {
    h2: 'text-2xl md:text-3xl',
    h1: 'text-3xl md:text-4xl',
    h0: 'text-4xl md:text-5xl',
    hxl: 'text-5xl md:text-6xl',
  };

  const contentPosMap: Record<string, string> = {
    top: 'justify-start',
    middle: 'justify-center',
    bottom: 'justify-end',
  };

  const alignMap: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const defaultServices = [
    { title: 'Row', description: 'Pair text with an image to focus on your chosen product, collection, or blog post.', icon: '', image: '', link: '', price: '', button_label: '', button_link: '' },
    { title: 'Row', description: 'Pair text with an image to focus on your chosen product, collection, or blog post.', icon: '', image: '', link: '', price: '', button_label: '', button_link: '' },
    { title: 'Row', description: 'Pair text with an image to focus on your chosen product, collection, or blog post.', icon: '', image: '', link: '', price: '', button_label: '', button_link: '' },
  ];

  const displayServices = services.length > 0 ? services : defaultServices;

  const shouldReverseRow = (index: number) => {
    if (imageLayout === 'alternate-left') return index % 2 === 1;
    if (imageLayout === 'alternate-right') return index % 2 === 0;
    if (imageLayout === 'align-right') return true;
    return false; // align-left
  };

  return (
    <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        {title && (
          <h2 className={`${headingSizeMap[headingSize] || headingSizeMap.h1} font-bold text-center mb-10`}>
            {title}
          </h2>
        )}
        <div className="space-y-4">
          {displayServices.map((service: any, index: number) => (
            <BlockWrapper key={index} dataKey="services" blockIndex={index} blockType="row" isSelected={!!isSelected} onEdit={onEditBlock ?? ((_dk: string, _bi: number) => {})} onDelete={onDeleteBlock ?? ((_dk: string, _bi: number) => {})}>
            <div className={`flex flex-col md:flex-row gap-0 ${shouldReverseRow(index) ? 'md:flex-row-reverse' : ''}`} style={{ opacity: 0.97 }}>
              {/* Image */}
              <div className="md:w-1/2 bg-[#E8E8E8]">
                <img src={service.image || FALLBACK_IMAGE} alt={service.title} className="w-full h-full object-cover min-h-[250px]" />
              </div>
              {/* Content */}
              <div className={`md:w-1/2 flex flex-col ${contentPosMap[contentPosition] || 'justify-center'} p-8 md:p-12 ${alignMap[contentAlignment] || 'text-left'}`}>
                {service.caption && <p className="text-xs tracking-widest uppercase mb-2" style={{ opacity: 0.6 }}>{service.caption}</p>}
                <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ opacity: 0.75 }}>{stripHtml(service.description || '')}</p>
                {(service.button_label || service.link) && (
                  <a href={service.button_link || service.link || '#'}
                    className="inline-block border text-xs font-medium tracking-wider uppercase transition-colors self-start"
                    style={{ padding: 'var(--btn-padding, 0.75rem 1.5rem)', borderRadius: 'var(--btn-radius, 8px)', boxShadow: 'var(--btn-shadow, none)', borderColor: 'var(--scheme-outline-btn, currentColor)', color: 'var(--scheme-outline-btn, currentColor)' }}>
                    {service.button_label || 'Learn more'}
                  </a>
                )}
              </div>
            </div>
            </BlockWrapper>
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(ServicesSection);
