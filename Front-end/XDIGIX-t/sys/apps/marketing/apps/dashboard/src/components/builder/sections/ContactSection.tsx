import { memo } from 'react';
import { ContactSectionData } from '../../../types/builder';

type Props = { data: ContactSectionData; style?: React.CSSProperties };

const ContactSection = ({ data, style }: Props) => {
  const d = (data ?? {}) as Record<string, any>;

  const heading = d.heading ?? d.title ?? 'Contact form';
  const headingSize = d.heading_size ?? 'h1';
  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;

  const headingSizeMap: Record<string, string> = {
    h2: 'text-2xl md:text-3xl',
    h1: 'text-3xl md:text-4xl',
    h0: 'text-4xl md:text-5xl',
    hxl: 'text-5xl md:text-6xl',
  };

  return (
    <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <h2 className={`${headingSizeMap[headingSize] || headingSizeMap.h1} font-bold text-center mb-8`}>
          {heading}
        </h2>
        <form onSubmit={(e) => e.preventDefault()} className="max-w-2xl mx-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <input type="text" placeholder="Name"
                className="w-full px-4 py-3 border text-sm bg-transparent outline-none transition-colors" style={{ borderColor: 'currentColor', opacity: 0.2 }} />
            </div>
            <div>
              <input type="email" placeholder="Email *" required
                className="w-full px-4 py-3 border text-sm bg-transparent outline-none transition-colors" style={{ borderColor: 'currentColor', opacity: 0.2 }} />
            </div>
          </div>
          <div>
            <input type="tel" placeholder="Phone number"
              className="w-full px-4 py-3 border text-sm bg-transparent outline-none transition-colors" style={{ borderColor: 'currentColor', opacity: 0.2 }} />
          </div>
          <div>
            <textarea placeholder="Comment" rows={6}
              className="w-full px-4 py-3 border text-sm bg-transparent outline-none transition-colors resize-none" style={{ borderColor: 'currentColor', opacity: 0.2 }} />
          </div>
          <div className="text-center">
            <button type="submit"
              className="inline-block text-sm font-medium tracking-wider uppercase transition-colors"
              style={{ padding: 'var(--btn-padding, 0.75rem 1.5rem)', borderRadius: 'var(--btn-radius, 8px)', boxShadow: 'var(--btn-shadow, none)', backgroundColor: 'var(--scheme-btn-bg, #121212)', color: 'var(--scheme-btn-label, #fff)' }}>
              Send
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default memo(ContactSection);
