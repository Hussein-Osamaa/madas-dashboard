import { FooterSectionData } from '../../../types/builder';

type Props = {
  data: FooterSectionData;
  style?: React.CSSProperties;
  siteId?: string;
};

const FooterSection = ({ data, style }: Props) => {
  // Get colors directly from data with fallbacks
  const layout = data.layout || 'classic';
  const isMinimal = layout === 'minimal';
  
  // Colors - read directly from data first, then style, then defaults
  const backgroundColor = data.backgroundColor || style?.backgroundColor || (isMinimal ? '#ffffff' : '#1f2937');
  const textColor = data.textColor || style?.color || (isMinimal ? '#1f2937' : '#ffffff');
  const borderColor = data.borderColor || (isMinimal ? '#e5e7eb' : 'rgba(255,255,255,0.2)');
  
  // Content
  const logoText = data.logoText || 'BRAND';
  const tagline = data.tagline || 'Sign up for exclusive offers and be the first to know about new arrivals.';
  const copyrightText = data.copyrightText || '© 2024 Brand. All rights reserved.';
  
  // Computed colors
  const mutedColor = isMinimal ? 'rgba(31,41,55,0.6)' : 'rgba(255,255,255,0.6)';

  // Minimal Footer Layout
  if (isMinimal) {
    return (
      <footer 
        data-edit-type="background"
        className="w-full"
        style={{ backgroundColor }}
      >
        <div style={{ borderTop: `1px solid ${borderColor}` }} />
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="lg:max-w-md">
              <h3 className="text-2xl font-bold mb-3" style={{ color: textColor }}>
                {logoText}
              </h3>
              <p className="text-sm" style={{ color: mutedColor }}>
                {tagline}
              </p>
            </div>
            <div className="flex-1 lg:max-w-md">
              <form className="flex" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 border rounded-l-lg text-sm bg-transparent"
                  style={{ borderColor, color: textColor }}
                />
                <button
                  type="submit"
                  className="px-4 py-3 border border-l-0 rounded-r-lg"
                  style={{ borderColor }}
                >
                  <span className="material-icons" style={{ color: textColor }}>arrow_forward</span>
                </button>
              </form>
            </div>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${borderColor}` }}>
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs" style={{ color: mutedColor }}>
              <span>{copyrightText}</span>
              <a href="#" className="hover:opacity-80">Privacy policy</a>
              <a href="#" className="hover:opacity-80">Terms of service</a>
              <a href="#" className="hover:opacity-80">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  // Classic Footer Layout
  return (
    <footer 
      data-edit-type="background"
      className="w-full py-12 px-6"
      style={{ backgroundColor }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          <div>
            <h3 className="text-xl font-bold mb-4" style={{ color: textColor }}>
              {logoText}
            </h3>
            <p className="text-sm mb-4" style={{ color: mutedColor }}>
              {tagline}
            </p>
            <div className="flex gap-3">
              {['facebook', 'camera_alt', 'music_note'].map((icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-700 hover:bg-primary transition-colors"
                >
                  <span className="material-icons text-white text-lg">{icon}</span>
                </a>
              ))}
            </div>
          </div>
          
          {['Company', 'Support', 'Connect'].map((title, colIndex) => (
            <div key={colIndex}>
              <h4 className="font-semibold mb-4" style={{ color: textColor }}>{title}</h4>
              <ul className="space-y-2">
                {['Link 1', 'Link 2', 'Link 3'].map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a href="#" className="text-sm hover:opacity-80" style={{ color: mutedColor }}>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="pt-8" style={{ borderTop: `1px solid ${borderColor}` }}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm" style={{ color: mutedColor }}>
              {copyrightText}
            </p>
            <div className="flex gap-6 text-sm" style={{ color: mutedColor }}>
              <a href="#" className="hover:opacity-80">Privacy</a>
              <a href="#" className="hover:opacity-80">Terms</a>
              <a href="#" className="hover:opacity-80">Cookies</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
