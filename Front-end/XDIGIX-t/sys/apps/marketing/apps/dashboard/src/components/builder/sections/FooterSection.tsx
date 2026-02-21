import React, { useState, useEffect } from 'react';
import { FooterSectionData } from '../../../types/builder';

type Props = {
  data: FooterSectionData;
  style?: React.CSSProperties;
  siteId?: string;
};

const FooterSection = ({ data, style }: Props) => {
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Handle scroll for back to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
      <>
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
      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:-translate-y-1 z-50"
          style={{
            backgroundColor,
            border: `1px solid ${borderColor}`,
            color: textColor
          }}
        >
          <span className="material-icons">keyboard_arrow_up</span>
        </button>
      )}
      </>
    );
  }

  // Classic Footer Layout
  return (
    <>
    <footer 
      data-edit-type="background"
      className="w-full py-12 px-6"
      style={{ backgroundColor }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div>
            <h3 className="text-xl font-bold mb-4" style={{ color: textColor }}>
              {logoText}
            </h3>
            <p className="text-sm mb-4" style={{ color: mutedColor }}>
              {tagline}
            </p>
            {/* Social Icons */}
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: `${textColor}20`, color: textColor }}>
                <span className="material-icons text-lg">facebook</span>
              </a>
              <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: `${textColor}20`, color: textColor }}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: `${textColor}20`, color: textColor }}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4" style={{ color: textColor }}>Quick Links</h4>
            <ul className="space-y-2 text-sm" style={{ color: mutedColor }}>
              <li><a href="#" className="hover:opacity-80 transition-opacity">Home</a></li>
              <li><a href="#" className="hover:opacity-80 transition-opacity">Shop</a></li>
              <li><a href="#" className="hover:opacity-80 transition-opacity">About Us</a></li>
              <li><a href="#" className="hover:opacity-80 transition-opacity">Contact</a></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-semibold mb-4" style={{ color: textColor }}>Customer Service</h4>
            <ul className="space-y-2 text-sm" style={{ color: mutedColor }}>
              <li><a href="#" className="hover:opacity-80 transition-opacity">FAQ</a></li>
              <li><a href="#" className="hover:opacity-80 transition-opacity">Shipping & Returns</a></li>
              <li><a href="#" className="hover:opacity-80 transition-opacity">Size Guide</a></li>
              <li><a href="#" className="hover:opacity-80 transition-opacity">Track Order</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-semibold mb-4" style={{ color: textColor }}>Newsletter</h4>
            <p className="text-sm mb-4" style={{ color: mutedColor }}>
              Subscribe to get special offers and updates.
            </p>
            <form className="flex" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 px-3 py-2 text-sm rounded-l-lg bg-transparent"
                style={{ border: `1px solid ${borderColor}`, color: textColor }}
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-r-lg font-medium"
                style={{ backgroundColor: textColor, color: backgroundColor }}
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8" style={{ borderTop: `1px solid ${borderColor}` }}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm" style={{ color: mutedColor }}>
              {copyrightText}
            </p>
            <div className="flex gap-6 text-sm" style={{ color: mutedColor }}>
              <a href="#" className="hover:opacity-80 transition-opacity">Privacy Policy</a>
              <a href="#" className="hover:opacity-80 transition-opacity">Terms of Service</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
    {/* Back to Top Button */}
    {showBackToTop && (
      <button
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:-translate-y-1 z-50"
        style={{
          backgroundColor,
          border: `1px solid ${borderColor}`,
          color: textColor
        }}
      >
        <span className="material-icons">keyboard_arrow_up</span>
      </button>
    )}
    </>
  );
};

export default FooterSection;
