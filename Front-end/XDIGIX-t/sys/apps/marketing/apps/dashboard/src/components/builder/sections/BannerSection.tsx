import { useState } from 'react';
import { BannerSectionData } from '../../../types/builder';

type Props = {
  data: BannerSectionData;
  style?: React.CSSProperties;
};

const BannerSection = ({ data, style }: Props) => {
  const {
    text = '🎉 Special Offer: Get 20% off your first order! Use code WELCOME20',
    link,
    linkText = 'Shop Now',
    backgroundColor = '#27491F',
    textColor = '#ffffff',
    icon,
    dismissible = false,
    enableMarquee = false,
    marqueeSpeed = 20
  } = data;

  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  // Create the marquee item with separator
  const marqueeItem = (key: number) => (
    <span key={key} className="inline-flex items-center px-4" data-edit-type="description">
      {icon && <span className="text-base sm:text-xl mr-3">{icon}</span>}
      <span className="text-xs sm:text-sm md:text-base font-medium whitespace-nowrap" style={{ color: textColor }}>
        {text}
      </span>
      <span className="ml-8 opacity-50" style={{ color: textColor }}>✦</span>
    </span>
  );

  return (
    <section
      className="banner-section w-full py-2 sm:py-3 relative overflow-hidden"
      style={{ backgroundColor, ...style }}
      data-edit-type="background"
    >
      {enableMarquee && (
        <style>{`
          @keyframes scroll-left {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
          .marquee-track {
            display: flex;
            width: fit-content;
            animation: scroll-left ${marqueeSpeed}s linear infinite;
          }
          .marquee-track:hover {
            animation-play-state: paused;
          }
        `}</style>
      )}
      
      <div className={enableMarquee ? "w-full overflow-hidden" : "max-w-6xl mx-auto flex items-center justify-center gap-2 sm:gap-4 px-3 sm:px-6"}>
        {/* Static elements on the left */}
        {!enableMarquee && icon && (
          <span className="text-base sm:text-xl flex-shrink-0" data-edit-type="description">{icon}</span>
        )}
        
        {/* Text - either static or marquee */}
        {enableMarquee ? (
          <div className="marquee-track" data-edit-type="description">
            {/* First set - visible initially */}
            {[0,1,2,3,4,5].map(i => marqueeItem(i))}
            {/* Second set - creates seamless loop */}
            {[6,7,8,9,10,11].map(i => marqueeItem(i))}
          </div>
        ) : (
          <p
            className="banner-text text-sm sm:text-base font-medium text-center cursor-pointer hover:opacity-80 transition-opacity"
          style={{ color: textColor }}
            data-edit-type="description"
        >
          {text}
        </p>
        )}

        {/* CTA Button - only show when not marquee */}
        {link && !enableMarquee && (
          <a
            href={link}
            className="banner-button inline-flex items-center gap-1 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all hover:scale-105 flex-shrink-0"
            style={{ backgroundColor: textColor, color: backgroundColor }}
            data-edit-type="button"
          >
            {linkText}
            <span className="material-icons text-sm">arrow_forward</span>
          </a>
        )}

        {dismissible && (
          <button
            onClick={() => setIsDismissed(true)}
            className="absolute right-4 sm:right-6 p-1 rounded-full hover:bg-white/20 transition-colors flex-shrink-0 z-10"
            aria-label="Dismiss"
          >
            <span className="material-icons text-base" style={{ color: textColor }}>
              close
            </span>
          </button>
        )}
      </div>
    </section>
  );
};

export default BannerSection;

