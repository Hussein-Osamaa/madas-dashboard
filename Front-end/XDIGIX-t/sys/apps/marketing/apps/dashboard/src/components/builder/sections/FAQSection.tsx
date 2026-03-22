import { useState, useMemo, memo } from 'react';
import { FAQSectionData } from '../../../types/builder';
import { sanitizeHtml } from './sanitizeHtml';
import BlockWrapper from '../BlockWrapper';

type Props = { data: FAQSectionData; style?: React.CSSProperties; isSelected?: boolean; onEditBlock?: (dataKey: string, blockIndex: number) => void; onDeleteBlock?: (dataKey: string, blockIndex: number) => void };

const FAQSection = ({ data, style, isSelected, onEditBlock, onDeleteBlock }: Props) => {
  const d = (data ?? {}) as Record<string, any>;

  // Settings
  const caption = d.caption ?? '';
  const heading = d.title ?? d.heading ?? 'Frequently Asked Questions';
  const headingSize = d.heading_size ?? 'h1';
  const headingAlignment = d.heading_alignment ?? 'center';
  const layout = d.layout ?? 'none';
  const openFirst = d.open_first ?? d.open_first_collapsible_row ?? false;
  const image = d.image ?? '';
  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;

  const items = d.items ?? [];
  const [openIndices, setOpenIndices] = useState<Set<number>>(new Set(openFirst ? [0] : []));

  const toggleIndex = (index: number) => {
    setOpenIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const headingSizeMap: Record<string, string> = {
    h2: 'text-2xl md:text-3xl',
    h1: 'text-3xl md:text-4xl',
    h0: 'text-4xl md:text-5xl',
    hxl: 'text-5xl md:text-6xl',
  };

  const alignMap: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const defaultItems = [
    { question: 'Question', answer: 'Answer content goes here.', heading: 'Question', content: 'Answer' },
    { question: 'Question', answer: 'Answer content goes here.', heading: 'Question', content: 'Answer' },
    { question: 'Question', answer: 'Answer content goes here.', heading: 'Question', content: 'Answer' },
    { question: 'Question', answer: 'Answer content goes here.', heading: 'Question', content: 'Answer' },
  ];

  const displayItems = items.length > 0 ? items : defaultItems;

  const accordionContent = (
    <div className="space-y-0">
      {displayItems.map((item: any, index: number) => {
        const isOpen = openIndices.has(index);
        const q = item.heading || item.question || 'Question';
        const a = item.content || item.answer || '';
        const safeA = sanitizeHtml(a);
        return (
          <BlockWrapper key={index} dataKey="faqs" blockIndex={index} blockType="collapsible_row" isSelected={!!isSelected} onEdit={onEditBlock ?? ((_dk: string, _bi: number) => {})} onDelete={onDeleteBlock ?? ((_dk: string, _bi: number) => {})}>
          <div className="border-b" style={{ borderColor: 'color-mix(in srgb, currentColor 10%, transparent)' }}>
            <button type="button" onClick={() => toggleIndex(index)}
              className="w-full py-4 text-left flex items-center justify-between hover:opacity-75 transition-opacity">
              <span className="text-base font-normal pr-4">{q}</span>
              <span className="material-icons flex-shrink-0 transition-transform duration-200"
                style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                expand_more
              </span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[500px] pb-4' : 'max-h-0'}`}>
              <div className="text-sm prose prose-sm max-w-none leading-relaxed" style={{ opacity: 0.75 }}
                dangerouslySetInnerHTML={{ __html: safeA }} />
            </div>
          </div>
          </BlockWrapper>
        );
      })}
    </div>
  );

  return (
    <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className={`mb-8 ${alignMap[headingAlignment] || 'text-center'}`}>
          {caption && <p className="text-xs tracking-widest uppercase mb-2" style={{ opacity: 0.6 }}>{caption}</p>}
          {heading && <h2 className={`${headingSizeMap[headingSize] || headingSizeMap.h1} font-bold`}>{heading}</h2>}
        </div>

        {/* Content with optional image */}
        {image && layout !== 'none' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {layout === 'image_first' || layout === 'row' ? (
              <>
                <div className="bg-[#F3F3F3]">
                  <img src={image} alt="" className="w-full h-auto object-cover" />
                </div>
                <div>{accordionContent}</div>
              </>
            ) : (
              <>
                <div>{accordionContent}</div>
                <div className="bg-[#F3F3F3]">
                  <img src={image} alt="" className="w-full h-auto object-cover" />
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">{accordionContent}</div>
        )}
      </div>
    </section>
  );
};

export default memo(FAQSection);
