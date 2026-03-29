import { memo } from 'react';
import { AboutSectionData } from '../../../types/builder';
import { sanitizeHtml } from './sanitizeHtml';
import BlockWrapper from '../BlockWrapper';

type Props = {
  data: AboutSectionData;
  style?: React.CSSProperties;
  isSelected?: boolean;
  onEditBlock?: (dataKey: string, blockIndex: number) => void;
  onDeleteBlock?: (dataKey: string, blockIndex: number) => void;
};

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=800&fit=crop';

const AboutSection = ({ data, style, isSelected = false, onEditBlock, onDeleteBlock }: Props) => {
  const d = (data ?? {}) as Record<string, any>;

  // Settings
  const image = d.image || '';
  const height = d.height ?? 'adapt';
  const desktopImageWidth = d.desktop_image_width ?? 'medium';
  const layout = d.layout ?? 'image_first';
  const contentPosition = d.desktop_content_position ?? d.content_position ?? 'middle';
  const contentAlignment = d.desktop_content_alignment ?? d.content_alignment ?? 'left';
  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;

  // Content — read from blocks array, falling back to flat fields
  const blocks: Array<Record<string, any>> = d.blocks ?? [];
  const hasBlocks = blocks.length > 0;

  // Find block indices
  const headingIdx = blocks.findIndex((b: any) => b.type === 'heading');
  const captionIdx = blocks.findIndex((b: any) => b.type === 'caption');
  const textIdx = blocks.findIndex((b: any) => b.type === 'text');
  const buttonIdx = blocks.findIndex((b: any) => b.type === 'button');

  // Resolve content from blocks or flat fields
  const heading = (headingIdx >= 0 ? blocks[headingIdx].text : null) || d.heading || d.title || 'Image with text';
  const headingSize = (headingIdx >= 0 ? blocks[headingIdx].heading_size : null) || d.heading_size || 'h1';
  const caption = (captionIdx >= 0 ? blocks[captionIdx].text : null) || d.caption || '';
  const textContent = (textIdx >= 0 ? blocks[textIdx].text : null) || d.text || d.content || 'Pair text with an image to focus on your chosen product, collection, or blog post.';

  // Button block reads both 'label'/'link' (registry) and 'button_label'/'button_link' (legacy)
  const btnBlock = buttonIdx >= 0 ? blocks[buttonIdx] : null;
  const buttonLabel = btnBlock ? (btnBlock.label || btnBlock.button_label || '') : (d.button_label || d.buttonText || '');
  const buttonLink = btnBlock ? (btnBlock.link || btnBlock.button_link || '#') : (d.button_link || d.buttonLink || '#');
  const buttonSecondary = btnBlock?.button_style_secondary ?? false;

  const imageWidthMap: Record<string, string> = {
    small: 'md:w-1/3',
    medium: 'md:w-1/2',
    large: 'md:w-2/3',
  };

  const heightMap: Record<string, string> = {
    adapt: '',
    small: 'min-h-[300px]',
    medium: 'min-h-[450px]',
    large: 'min-h-[600px]',
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

  const headingSizeMap: Record<string, string> = {
    h2: 'text-2xl md:text-3xl',
    h1: 'text-3xl md:text-4xl',
    h0: 'text-4xl md:text-5xl',
    hxl: 'text-5xl md:text-6xl',
  };

  const imageContent = (
    <div className={`${imageWidthMap[desktopImageWidth] || 'md:w-1/2'} ${heightMap[height] || ''}`}>
      <img src={image || FALLBACK_IMAGE} alt="" className={`w-full h-full object-cover ${heightMap[height] || 'min-h-[300px]'}`} />
    </div>
  );

  const wrapBlock = (blockIndex: number, blockType: string, children: React.ReactNode) => {
    if (!isSelected || blockIndex < 0) return children;
    return (
      <BlockWrapper dataKey="blocks" blockIndex={blockIndex} blockType={blockType} isSelected={isSelected} onEdit={onEditBlock ?? (() => {})} onDelete={onDeleteBlock ?? (() => {})}>
        {children}
      </BlockWrapper>
    );
  };

  const textContentEl = (
    <div className={`flex-1 flex flex-col ${contentPosMap[contentPosition] || 'justify-center'} px-6 md:px-12 py-8 ${alignMap[contentAlignment] || 'text-left'}`}>
      {caption && wrapBlock(captionIdx, 'caption',
        <p className="text-xs tracking-widest uppercase mb-3" style={{ opacity: 0.6 }}>{caption}</p>
      )}
      {wrapBlock(headingIdx, 'heading',
        <h2 className={`${headingSizeMap[headingSize] || headingSizeMap.h1} font-bold mb-4`}>{heading}</h2>
      )}
      {textContent && wrapBlock(textIdx, 'text',
        <div className="text-sm leading-relaxed mb-6 prose prose-sm max-w-none" style={{ opacity: 0.75 }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(textContent) }} />
      )}
      {buttonLabel && wrapBlock(buttonIdx, 'button',
        <div>
          <a href={buttonLink}
            className="inline-block text-sm font-medium tracking-wider uppercase transition-colors"
            style={{
              padding: 'var(--btn-padding, 0.75rem 1.5rem)',
              borderRadius: 'var(--btn-radius, 8px)',
              boxShadow: 'var(--btn-shadow, none)',
              ...(buttonSecondary
                ? { borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--scheme-outline-btn, currentColor)', color: 'var(--scheme-outline-btn, currentColor)', backgroundColor: 'transparent' }
                : { backgroundColor: 'var(--scheme-btn-bg, #121212)', color: 'var(--scheme-btn-label, #fff)' }),
            }}>
            {buttonLabel}
          </a>
        </div>
      )}
    </div>
  );

  return (
    <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className={`flex flex-col md:flex-row ${layout === 'text_first' ? 'md:flex-row-reverse' : ''} gap-0`}>
          {imageContent}
          {textContentEl}
        </div>
      </div>
    </section>
  );
};

export default memo(AboutSection);
