import { useState, memo } from 'react';
import { BannerSectionData } from '../../../types/builder';
import BlockWrapper from '../BlockWrapper';

type Props = { data: BannerSectionData; style?: React.CSSProperties; isSelected?: boolean; onEditBlock?: (dataKey: string, blockIndex: number) => void; onDeleteBlock?: (dataKey: string, blockIndex: number) => void };

const BannerSection = ({ data, style, isSelected, onEditBlock, onDeleteBlock }: Props) => {
  const d = (data ?? {}) as Record<string, any>;
  const text = d.text || 'Welcome to our store';
  const link = d.link || '';
  const linkText = d.linkText || '';
  const dismissible = d.dismissible ?? false;
  const enableMarquee = d.enableMarquee ?? false;
  const marqueeSpeed = d.marqueeSpeed ?? 30;
  const icon = d.icon || '';

  // Blocks-based announcements
  const announcements = d.announcements ?? [];
  const [dismissed, setDismissed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (dismissed) return null;

  const items = announcements.length > 0
    ? announcements
    : [{ text, link, linkText }];

  const currentItem = items[currentIndex] || items[0];

  return (
    <section className="relative w-full" style={{ ...style }}>
      <div className="flex items-center justify-center min-h-[40px] px-4 py-2">
        {items.length > 1 && (
          <button onClick={() => setCurrentIndex((currentIndex - 1 + items.length) % items.length)}
            className="p-1 opacity-70 hover:opacity-100 transition-opacity mr-2">
            <span className="material-icons text-sm" style={{}}>chevron_left</span>
          </button>
        )}

        <BlockWrapper dataKey="items" blockIndex={currentIndex} blockType="announcement" isSelected={!!isSelected} onEdit={onEditBlock ?? ((_dk: string, _bi: number) => {})} onDelete={onDeleteBlock ?? ((_dk: string, _bi: number) => {})}>
        <div className="flex items-center gap-2 text-sm tracking-wide">
          {icon && <span className="material-icons text-sm">{icon}</span>}
          {enableMarquee ? (
            <div className="overflow-hidden max-w-md">
              <div className="whitespace-nowrap animate-marquee" style={{ animationDuration: `${marqueeSpeed}s` }}>
                <span>{currentItem.text}</span>
                {currentItem.link && currentItem.linkText && (
                  <a href={currentItem.link} className="underline ml-2 hover:no-underline">{currentItem.linkText}</a>
                )}
              </div>
            </div>
          ) : (
            <>
              <span>{currentItem.text}</span>
              {currentItem.link && currentItem.linkText && (
                <a href={currentItem.link} className="underline ml-1 hover:no-underline" style={{}}>
                  {currentItem.linkText}
                </a>
              )}
            </>
          )}
        </div>
        </BlockWrapper>

        {items.length > 1 && (
          <button onClick={() => setCurrentIndex((currentIndex + 1) % items.length)}
            className="p-1 opacity-70 hover:opacity-100 transition-opacity ml-2">
            <span className="material-icons text-sm" style={{}}>chevron_right</span>
          </button>
        )}

        {dismissible && (
          <button onClick={() => setDismissed(true)}
            className="absolute right-3 p-1 opacity-70 hover:opacity-100 transition-opacity">
            <span className="material-icons text-sm" style={{}}>close</span>
          </button>
        )}
      </div>
    </section>
  );
};

export default memo(BannerSection);
