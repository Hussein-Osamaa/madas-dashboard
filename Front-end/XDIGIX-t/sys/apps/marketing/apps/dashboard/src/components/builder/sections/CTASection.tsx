import { memo } from 'react';
import { CTASectionData } from '../../../types/builder';
import { sanitizeHtml } from './sanitizeHtml';
import BlockWrapper from '../BlockWrapper';

type Props = {
  data: CTASectionData;
  style?: React.CSSProperties;
  isSelected?: boolean;
  onEditBlock?: (dataKey: string, blockIndex: number) => void;
  onDeleteBlock?: (dataKey: string, blockIndex: number) => void;
};

const CTASection = ({ data, style, isSelected = false, onEditBlock, onDeleteBlock }: Props) => {
  const d = (data ?? {}) as Record<string, any>;

  // Settings
  const contentPosition = d.desktop_content_position ?? 'center';
  const contentAlignment = d.content_alignment ?? 'center';
  const fullWidth = d.full_width ?? true;
  const paddingTop = d.padding_top ?? 40;
  const paddingBottom = d.padding_bottom ?? 52;

  // Blocks data (Dawn-style) or legacy fields
  const blocks = d.blocks ?? [];
  const heading = blocks.find((b: any) => b.type === 'heading')?.text || d.title || 'Talk about your brand';
  const headingSize = blocks.find((b: any) => b.type === 'heading')?.heading_size || 'h1';
  const textContent = blocks.find((b: any) => b.type === 'text')?.text || d.subtitle || 'Share information about your brand with your customers.';
  const buttonBlock = blocks.find((b: any) => b.type === 'button');
  const buttonLabel = buttonBlock?.button_label || d.buttonText || '';
  const buttonLink = buttonBlock?.button_link || d.buttonLink || '#';
  const buttonSecondary = buttonBlock?.button_style_secondary ?? false;

  const headingSizeMap: Record<string, string> = {
    h2: 'text-2xl md:text-3xl',
    h1: 'text-3xl md:text-4xl',
    h0: 'text-4xl md:text-5xl',
    hxl: 'text-5xl md:text-6xl',
  };

  const positionMap: Record<string, string> = {
    left: 'mr-auto',
    center: 'mx-auto',
    right: 'ml-auto',
  };

  const alignMap: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  // Sanitize text content via DOMPurify (sanitizeHtml helper)
  const sanitizedTextContent = sanitizeHtml(textContent);

  // Block indices for BlockWrapper
  const headingIdx = blocks.findIndex((b: any) => b.type === 'heading');
  const textIdx = blocks.findIndex((b: any) => b.type === 'text');
  const buttonIdx = blocks.findIndex((b: any) => b.type === 'button');

  const wrapBlock = (blockIndex: number, blockType: string, children: React.ReactNode) => {
    if (!isSelected) return children;
    const safeIndex = blockIndex >= 0 ? blockIndex : 0;
    return (
      <BlockWrapper dataKey="blocks" blockIndex={safeIndex} blockType={blockType} isSelected={isSelected} onEdit={onEditBlock ?? ((_dk: string, _bi: number) => {})} onDelete={onDeleteBlock ?? ((_dk: string, _bi: number) => {})}>
        {children}
      </BlockWrapper>
    );
  };

  return (
    <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
      <div className={`${fullWidth ? 'max-w-[1200px]' : 'max-w-3xl'} ${positionMap[contentPosition] || 'mx-auto'} px-4 sm:px-6 ${alignMap[contentAlignment] || 'text-center'}`}>
        {heading && wrapBlock(headingIdx, 'heading',
          <h2 className={`${headingSizeMap[headingSize] || headingSizeMap.h1} font-bold mb-4`}>
            {heading}
          </h2>
        )}
        {textContent && wrapBlock(textIdx, 'text',
          <div className="text-base md:text-lg opacity-75 mb-6 max-w-2xl mx-auto leading-relaxed"
            dangerouslySetInnerHTML={{ __html: sanitizedTextContent }} />
        )}
        {buttonLabel && wrapBlock(buttonIdx, 'button',
          <a href={buttonLink}
            className="inline-block text-sm font-medium tracking-wider uppercase transition-colors border"
            style={{
              padding: 'var(--btn-padding, 0.75rem 1.5rem)',
              borderRadius: 'var(--btn-radius, 8px)',
              boxShadow: 'var(--btn-shadow, none)',
              ...(buttonSecondary
                ? { borderColor: 'var(--scheme-outline-btn, #121212)', color: 'var(--scheme-outline-btn, #121212)', backgroundColor: 'transparent' }
                : { backgroundColor: 'var(--scheme-btn-bg, #121212)', color: 'var(--scheme-btn-label, #fff)', borderColor: 'var(--scheme-btn-bg, #121212)' }),
            }}>
            {buttonLabel}
          </a>
        )}
      </div>
    </section>
  );
};

export default memo(CTASection);
