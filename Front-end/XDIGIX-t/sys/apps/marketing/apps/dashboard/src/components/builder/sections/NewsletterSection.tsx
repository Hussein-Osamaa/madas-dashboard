import { memo } from 'react';
import { NewsletterSectionData } from '../../../types/builder';
import BlockWrapper from '../BlockWrapper';

type Props = { data: NewsletterSectionData; style?: React.CSSProperties; isSelected?: boolean; onEditBlock?: (dataKey: string, blockIndex: number) => void; onDeleteBlock?: (dataKey: string, blockIndex: number) => void };

const NewsletterSection = ({ data, style, isSelected, onEditBlock, onDeleteBlock }: Props) => {
  const d = (data ?? {}) as Record<string, any>;

  const title = d.title || 'Subscribe to our emails';
  const subtitle = d.subtitle || '';
  const placeholder = d.placeholder || 'Email';
  const buttonText = d.buttonText || 'Subscribe';
  const fullWidth = d.full_width ?? true;
  const paddingTop = d.padding_top ?? 40;
  const paddingBottom = d.padding_bottom ?? 52;
  const headingSize = d.heading_size ?? 'h1';
  const headingSizeMap: Record<string, string> = {
    h2: 'text-2xl md:text-3xl',
    h1: 'text-3xl md:text-4xl',
    h0: 'text-4xl md:text-5xl',
    hxl: 'text-5xl md:text-6xl',
  };

  return (
    <section className="w-full text-center" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
      <div className={`${fullWidth ? 'max-w-[1200px]' : 'max-w-xl'} mx-auto px-4 sm:px-6`}>
        <BlockWrapper dataKey="headingBlocks" blockIndex={0} blockType="heading" isSelected={!!isSelected} onEdit={onEditBlock ?? ((_dk: string, _bi: number) => {})} onDelete={onDeleteBlock ?? ((_dk: string, _bi: number) => {})}>
        <h2 className={`${headingSizeMap[headingSize] || headingSizeMap.h1} font-bold mb-3`}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm mb-6 max-w-lg mx-auto" style={{ opacity: 0.75 }}>{subtitle}</p>
        )}
        </BlockWrapper>
        <BlockWrapper dataKey="emailFormBlocks" blockIndex={1} blockType="email_form" isSelected={!!isSelected} onEdit={onEditBlock ?? ((_dk: string, _bi: number) => {})} onDelete={onDeleteBlock ?? ((_dk: string, _bi: number) => {})}>
        <form onSubmit={(e) => e.preventDefault()} className="flex max-w-md mx-auto">
          <input type="email" placeholder={placeholder}
            className="flex-1 px-4 py-3 border text-sm bg-transparent outline-none min-w-0"
            style={{ borderColor: 'currentColor', color: 'inherit', opacity: 1 }} />
          <button type="submit"
            className="text-sm tracking-wider transition-colors flex-shrink-0 flex items-center gap-1"
            style={{ padding: 'var(--btn-padding, 0.75rem 1.5rem)', borderRadius: 'var(--btn-radius, 8px)', boxShadow: 'var(--btn-shadow, none)', backgroundColor: 'var(--scheme-btn-bg, #121212)', color: 'var(--scheme-btn-label, #fff)' }}>
            <span className="material-icons text-sm">arrow_forward</span>
          </button>
        </form>
        </BlockWrapper>
      </div>
    </section>
  );
};

export default memo(NewsletterSection);
