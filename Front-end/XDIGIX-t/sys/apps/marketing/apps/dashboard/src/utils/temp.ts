import { Section } from '../types/builder';

export function exportWebsiteToHTML(sections: Section[], siteName: string, settings?: any, siteId?: string): string {
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${siteName}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #171817;
        }
        ${generateCSS(sections, settings)}
    </style>
</head>
<body>
    ${generateHTML(sections, siteId)}
    <script>
        // FAQ Accordion functionality
        document.querySelectorAll('.faq-item').forEach(item => {
            const button = item.querySelector('.faq-button');
            const content = item.querySelector('.faq-content');
            if (button && content) {
                button.addEventListener('click', () => {
                    const isOpen = content.style.display === 'block';
                    content.style.display = isOpen ? 'none' : 'block';
                    button.querySelector('.faq-icon').textContent = isOpen ? 'expand_more' : 'expand_less';
                });
            }
        });
    </script>
</body>
</html>`;

  return html;
}

function generateHTML(sections: Section[], siteId?: string): string {
  return sections.map(section => {
    const style = section.style || {};
    const padding = style.padding || {};
    const margin = style.margin || {};
    
    // Build style attributes
    let sectionStyle = '';
    if (style.backgroundColor) sectionStyle += `background-color: ${style.backgroundColor}; `;
    if (style.backgroundImage) {
      sectionStyle += `background-image: url(${style.backgroundImage}); background-size: cover; background-position: center; background-repeat: no-repeat; `;
    }
    if (style.textColor) sectionStyle += `color: ${style.textColor}; `;
    if (padding.top !== undefined) sectionStyle += `padding-top: ${padding.top}px; `;
    if (padding.bottom !== undefined) sectionStyle += `padding-bottom: ${padding.bottom}px; `;
    if (padding.left !== undefined) sectionStyle += `padding-left: ${padding.left}px; `;
    if (padding.right !== undefined) sectionStyle += `padding-right: ${padding.right}px; `;
    if (margin.top !== undefined) sectionStyle += `margin-top: ${margin.top}px; `;
    if (margin.bottom !== undefined) sectionStyle += `margin-bottom: ${margin.bottom}px; `;
    if (style.borderRadius !== undefined) sectionStyle += `border-radius: ${style.borderRadius}px; `;
    if (style.shadow) sectionStyle += `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); `;
    
    let html = '';
    switch (section.type) {
      case 'navbar':
        html = generateNavbarHTML(section.data, style, siteId);
        break;
      case 'hero':
        html = generateHeroHTML(section.data, style);
        break;
      case 'features':
        html = generateFeaturesHTML(section.data);
        break;
      case 'products':
        html = generateProductsHTML(section.data);
        break;
      case 'testimonials':
        html = generateTestimonialsHTML(section.data);
        break;
      case 'cta':
        html = generateCTAHTML(section.data);
        break;
      case 'about':
        html = generateAboutHTML(section.data);
        break;
      case 'contact':
        html = generateContactHTML(section.data);
        break;
      case 'gallery':
        html = generateGalleryHTML(section.data);
        break;
      case 'pricing':
        html = generatePricingHTML(section.data);
        break;
      case 'faq':
        html = generateFAQHTML(section.data);
        break;
      case 'footer':
        html = generateFooterHTML(section.data, style);
        break;
      case 'stats':
        html = generateStatsHTML(section.data);
        break;
      case 'team':
        html = generateTeamHTML(section.data);
        break;
      case 'services':
        html = generateServicesHTML(section.data);
        break;
      case 'video':
        html = generateVideoHTML(section.data);
        break;
      case 'countdown':
        html = generateCountdownHTML(section.data);
        break;
      case 'banner':
        html = generateBannerHTML(section.data);
        break;
      case 'partners':
        html = generatePartnersHTML(section.data);
        break;
      case 'newsletter':
        html = generateNewsletterHTML(section.data);
        break;
      case 'divider':
        html = generateDividerHTML(section.data);
        break;
      default:
        html = '';
    }
    
    // All sections return their own section tags - just return the HTML directly
    return html;








  }).join('\n');
}

function generateCSS(sections: Section[], settings?: any): string {
  const primaryColor = settings?.theme?.primaryColor || '#27491F';
  const secondaryColor = settings?.theme?.secondaryColor || '#F0CAE1';
  
  return `
    :root {
        --primary-color: ${primaryColor};
        --secondary-color: ${secondaryColor};
    }
    .hero-section { min-height: 400px; }
    .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; }
    .products-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
    .testimonials-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
    .gallery-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
    .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
    @media (max-width: 768px) {
        .features-grid, .products-grid, .testimonials-grid, .pricing-grid { grid-template-columns: 1fr; }
    }
  `;
}

function generateNavbarHTML(data: any, style?: any, siteId?: string): string {
  const {
    logo = '',
    logoText = 'MADAS',
    menuItems = [],
    showSearch = true,
    searchPlaceholder = 'Search products...',
    showCart = true,
    cartCount = 0,
    showWishlist = true,
    wishlistCount = 0,
    showUserIcon = true,
    backgroundColor = '#FFFFFF',
    textColor = '#27491F',
    sticky = false
  } = data;
  
  // Get cart and favorites count from localStorage
  const getCartCount = () => {
    if (typeof window !== 'undefined' && siteId) {
      try {
        const cart = localStorage.getItem(`cart_${siteId}`);
        if (cart) {
          const items = JSON.parse(cart);
          return items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
        }
      } catch (e) {
        return 0;
      }
    }
    return cartCount;
  };

  const getWishlistCount = () => {
    if (typeof window !== 'undefined' && siteId) {
      try {
        const favorites = localStorage.getItem(`favorites_${siteId}`);
        if (favorites) {
          return JSON.parse(favorites).length;
        }
      } catch (e) {
        return 0;
      }
    }
    return wishlistCount;
  };

  const actualCartCount = typeof window !== 'undefined' ? getCartCount() : cartCount;
  const actualWishlistCount = typeof window !== 'undefined' ? getWishlistCount() : wishlistCount;
  
  // Base URL for site pages
  const baseUrl = siteId ? `/site/${siteId}` : '';
  
  // Default menu items with proper links
  const defaultMenuItems = menuItems.length === 0 
    ? [
        { label: 'Home', link: baseUrl || '#' },
        { label: 'Products', link: `${baseUrl}/products` },
        { label: 'About', link: `${baseUrl}/about` }
      ]
    : menuItems.map((item: any) => {
        // If item is a string, convert to object with proper link
        if (typeof item === 'string') {
          return { label: item, link: '#' };
        }
        // If link is relative and doesn't start with /site/, make it relative to site
        if (item.link && !item.link.startsWith('http') && !item.link.startsWith('/site/') && siteId) {
          // Check if it's a special page
          if (item.link === '/products' || item.link === 'products') {
            return { ...item, link: `${baseUrl}/products` };
          }
          if (item.link === '/about' || item.link === 'about') {
            return { ...item, link: `${baseUrl}/about` };
          }
          if (item.link === '/cart' || item.link === 'cart') {
            return { ...item, link: `${baseUrl}/cart` };
          }
          if (item.link === '/favorites' || item.link === 'favorites') {
            return { ...item, link: `${baseUrl}/favorites` };
          }
          if (item.link === '/login' || item.link === 'login') {
            return { ...item, link: `${baseUrl}/login` };
          }
          if (item.link === '/register' || item.link === 'register') {
            return { ...item, link: `${baseUrl}/register` };
          }
          // If it's just '/', make it the home page
          if (item.link === '/') {
            return { ...item, link: baseUrl || '/' };
          }
        }
        return item;
      });
  
  return `
    <nav style="background-color: ${backgroundColor}; color: ${textColor}; width: 100%; ${sticky ? 'position: sticky; top: 0; z-index: 50;' : ''}">
      <div style="max-width: 1280px; margin: 0 auto; padding: 0 1rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; height: 64px;">
          <!-- Logo -->
          <a href="${baseUrl || '#'}" style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; text-decoration: none;">
            ${logo ? 
              `<img src="${logo}" alt="${logoText}" style="height: 40px; width: auto;" />` :
              `<div style="width: 40px; height: 40px; background: var(--primary-color); border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <span style="color: white; font-weight: bold; font-size: 0.875rem;">${logoText.charAt(0)}</span>
              </div>`
            }
            <span style="font-size: 1.5rem; font-weight: bold; color: ${textColor};">${logoText}</span>
          </a>

          <!-- Desktop Menu -->
          <div class="desktop-menu" style="display: none; align-items: center; gap: 0.5rem; flex: 1; justify-content: center;">
            ${defaultMenuItems.map((item: any, index: number) => {
              const label = item.label || '';
              const link = item.link || '#';
              const badge = item.badge || '';
              
              return `
                <a href="${link}" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: ${textColor}; text-decoration: none; position: relative; ${index < defaultMenuItems.length - 1 ? 'margin-right: 0.5rem;' : ''}">
                  ${label}
                  ${badge ? `<span style="position: absolute; top: -4px; right: -8px; background: var(--secondary-color); color: white; font-size: 10px; padding: 2px 6px; border-radius: 9999px;">${badge}</span>` : ''}
                </a>
              `;
            }).join('')}
          </div>

          <!-- Right Side Actions -->
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;">
            ${showSearch ? `
              <div class="desktop-search" style="display: none; align-items: center; position: relative;">
                <span class="material-icons" style="position: absolute; left: 12px; color: ${textColor}; opacity: 0.6; font-size: 18px;">search</span>
                <input type="text" placeholder="${searchPlaceholder}" style="padding: 8px 12px 8px 36px; font-size: 0.875rem; border-radius: 8px; border: 1px solid #d1d5db; width: 200px; background: rgba(255,255,255,0.8);" />
              </div>
            ` : ''}
            ${showWishlist ? `
              <a href="${baseUrl}/favorites" style="position: relative; padding: 8px; border-radius: 8px; border: none; background: transparent; cursor: pointer; text-decoration: none; display: inline-block;">
                <span class="material-icons" style="color: ${textColor}; font-size: 18px;">favorite</span>
                ${actualWishlistCount > 0 ? `<span style="position: absolute; top: 0; right: 0; background: var(--secondary-color); color: white; font-size: 10px; width: 16px; height: 16px; border-radius: 9999px; display: flex; align-items: center; justify-content: center;">${actualWishlistCount > 9 ? '9+' : actualWishlistCount}</span>` : ''}
              </a>
            ` : ''}
            ${showCart ? `
              <a href="${baseUrl}/cart" style="position: relative; padding: 8px; border-radius: 8px; border: none; background: transparent; cursor: pointer; text-decoration: none; display: inline-block;">
                <span class="material-icons" style="color: ${textColor}; font-size: 18px;">shopping_bag</span>
                ${actualCartCount > 0 ? `<span style="position: absolute; top: 0; right: 0; background: var(--primary-color); color: white; font-size: 10px; width: 16px; height: 16px; border-radius: 9999px; display: flex; align-items: center; justify-content: center;">${actualCartCount > 9 ? '9+' : actualCartCount}</span>` : ''}
              </a>
            ` : ''}
            ${showUserIcon ? `
              <a href="${baseUrl}/login" style="padding: 8px; border-radius: 8px; border: none; background: transparent; cursor: pointer; text-decoration: none; display: inline-block;">
                <span class="material-icons" style="color: ${textColor}; font-size: 18px;">person</span>
              </a>
            ` : ''}
            <!-- Mobile Menu Toggle -->
            <button id="mobile-menu-toggle" style="padding: 8px; border-radius: 8px; border: none; background: transparent; cursor: pointer;">
              <span class="material-icons" style="color: ${textColor}; font-size: 18px;">menu</span>
            </button>
          </div>
        </div>

        <!-- Mobile Menu -->
        <div id="mobile-menu" style="display: none; padding: 1rem 0; border-top: 1px solid #e5e7eb;">
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            ${defaultMenuItems.map((item: any, index: number) => {
              const label = item.label || '';
              const link = item.link || '#';
              return `<a href="${link}" style="display: block; padding: 0.75rem 1rem; font-size: 1rem; font-weight: 500; color: ${textColor}; text-decoration: none; border-radius: 8px;">${label}</a>`;
            }).join('')}
            ${showCart ? `<a href="${baseUrl}/cart" style="display: block; padding: 0.75rem 1rem; font-size: 1rem; font-weight: 500; color: ${textColor}; text-decoration: none; border-radius: 8px;">Cart${actualCartCount > 0 ? ` (${actualCartCount})` : ''}</a>` : ''}
            ${showWishlist ? `<a href="${baseUrl}/favorites" style="display: block; padding: 0.75rem 1rem; font-size: 1rem; font-weight: 500; color: ${textColor}; text-decoration: none; border-radius: 8px;">Favorites${actualWishlistCount > 0 ? ` (${actualWishlistCount})` : ''}</a>` : ''}
            ${showUserIcon ? `<a href="${baseUrl}/login" style="display: block; padding: 0.75rem 1rem; font-size: 1rem; font-weight: 500; color: ${textColor}; text-decoration: none; border-radius: 8px;">Login</a>` : ''}
          </div>
          ${showSearch ? `
            <div style="margin-top: 1rem; padding: 0 1rem;">
              <div style="position: relative;">
                <span class="material-icons" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: ${textColor}; opacity: 0.6; font-size: 18px;">search</span>
                <input type="text" placeholder="${searchPlaceholder}" style="width: 100%; padding: 8px 12px 8px 36px; font-size: 0.875rem; border-radius: 8px; border: 1px solid #d1d5db; background: white;" />
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </nav>
    <script>
      (function() {
        const toggle = document.getElementById('mobile-menu-toggle');
        const menu = document.getElementById('mobile-menu');
        if (toggle && menu) {
          toggle.addEventListener('click', function() {
            const isOpen = menu.style.display === 'flex';
            menu.style.display = isOpen ? 'none' : 'flex';
            toggle.querySelector('.material-icons').textContent = isOpen ? 'menu' : 'close';
          });
        }
      })();
    </script>
    <style>
      @media (min-width: 1024px) {
        .desktop-menu {
          display: flex !important;
        }
        .desktop-search {
          display: flex !important;
        }
        #mobile-menu-toggle {
          display: none !important;
        }
      }
      @media (max-width: 1023px) {
        #mobile-menu {
          display: none !important;
        }
      }
    </style>
  `;
}

function generateHeroHTML(data: any, style?: any): string {
  const backgroundStyle = data.backgroundImage 
    ? `background-image: url(${data.backgroundImage}); background-size: cover; background-position: center; background-repeat: no-repeat;`
    : `background: ${data.backgroundColor || '#27491F'};`;
  
  const overlayStyle = data.backgroundImage && data.backgroundColor
    ? `position: absolute; inset: 0; background-color: ${data.backgroundColor}; opacity: 0.4;`
    : '';
  
  const textStyle = data.textStyle || {};
  const titleStyle = `font-size: ${textStyle.titleFontSize || 48}px; font-weight: ${textStyle.titleFontWeight || 'bold'}; text-align: ${textStyle.titleAlignment || 'center'};`;
  const subtitleStyle = `font-size: ${textStyle.subtitleFontSize || 20}px; font-weight: ${textStyle.subtitleFontWeight || 'normal'}; text-align: ${textStyle.subtitleAlignment || 'center'};`;
  const buttonStyle = textStyle.buttonStyle || {};
  
  // Handle carousel
  if (data.isCarousel && data.slides && data.slides.length > 0) {
    const slidesHTML = data.slides.map((slide: any, index: number) => {
      const slideBgStyle = slide.backgroundImage 
        ? `background-image: url(${slide.backgroundImage}); background-size: cover; background-position: center; background-repeat: no-repeat;`
        : `background: ${slide.backgroundColor || '#27491F'};`;
      const slideOverlayStyle = slide.backgroundImage && slide.backgroundColor
        ? `position: absolute; inset: 0; background-color: ${slide.backgroundColor}; opacity: 0.4;`
        : '';
      const slideTextStyle = slide.textStyle || {};
      const slideTitleStyle = `font-size: ${slideTextStyle.titleFontSize || 48}px; font-weight: ${slideTextStyle.titleFontWeight || 'bold'}; text-align: ${slideTextStyle.titleAlignment || 'center'};`;
      const slideSubtitleStyle = `font-size: ${slideTextStyle.subtitleFontSize || 20}px; font-weight: ${slideTextStyle.subtitleFontWeight || 'normal'}; text-align: ${slideTextStyle.subtitleAlignment || 'center'};`;
      
      return `
        <div class="hero-slide" data-slide="${index}" style="position: relative; min-height: 500px; ${slideBgStyle}; display: ${index === 0 ? 'flex' : 'none'}; align-items: center; justify-content: center; padding: 80px 20px;">
          ${slideOverlayStyle ? `<div style="${slideOverlayStyle}"></div>` : ''}
          <div style="position: relative; z-index: 10; max-width: 800px; margin: 0 auto; text-align: center;">
            <h1 class="hero-title" style="${slideTitleStyle}; color: ${slide.textColor || '#FFFFFF'}; margin-bottom: 1rem;">${slide.title || 'Welcome'}</h1>
            <p class="hero-subtitle" style="${slideSubtitleStyle}; color: ${slide.textColor || '#FFFFFF'}; margin-bottom: 2rem; opacity: 0.9;">${slide.subtitle || ''}</p>
            <a href="${slide.buttonLink || '#'}" style="display: inline-block; padding: ${slideTextStyle.buttonStyle?.padding || '12px 32px'}; background: ${slideTextStyle.buttonStyle?.backgroundColor || 'white'}; color: ${slideTextStyle.buttonStyle?.textColor || slide.backgroundColor || '#27491F'}; border-radius: ${slideTextStyle.buttonStyle?.borderRadius || 8}px; text-decoration: none; font-weight: ${slideTextStyle.buttonStyle?.fontWeight || '600'}; font-size: ${slideTextStyle.buttonStyle?.fontSize || 16}px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">${slide.buttonText || 'Get Started'}</a>
          </div>
        </div>
      `;
    }).join('');
    
    return `
      <section class="hero-section" style="position: relative; ${backgroundStyle}; color: ${data.textColor || '#FFFFFF'}; min-height: 500px;">
        ${slidesHTML}
        ${data.slides.length > 1 ? `
          <button class="hero-prev" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.9); border: none; border-radius: 50%; width: 48px; height: 48px; cursor: pointer; z-index: 20; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: var(--primary-color);">chevron_left</span>
          </button>
          <button class="hero-next" style="position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.9); border: none; border-radius: 50%; width: 48px; height: 48px; cursor: pointer; z-index: 20; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: var(--primary-color);">chevron_right</span>
          </button>
          <div style="position: absolute; bottom: 1rem; left: 50%; transform: translateX(-50%); display: flex; gap: 0.5rem; z-index: 20;">
            ${data.slides.map((_: any, i: number) => `
              <button class="hero-dot" data-slide="${i}" style="width: ${i === 0 ? '32px' : '8px'}; height: 8px; border-radius: 9999px; border: none; background: ${i === 0 ? 'var(--primary-color)' : 'rgba(255,255,255,0.5)'}; cursor: pointer; transition: all 0.3s;"></button>
            `).join('')}
          </div>
        ` : ''}
      </section>
      ${data.slides.length > 1 ? `
        <script>
          (function() {
            let currentSlide = 0;
            const slides = document.querySelectorAll('.hero-slide');
            const dots = document.querySelectorAll('.hero-dot');
            const prevBtn = document.querySelector('.hero-prev');
            const nextBtn = document.querySelector('.hero-next');
            
            function showSlide(index) {
              slides.forEach((s, i) => {
                s.style.display = i === index ? 'flex' : 'none';
              });
              dots.forEach((d, i) => {
                d.style.width = i === index ? '32px' : '8px';
                d.style.background = i === index ? 'var(--primary-color)' : 'rgba(255,255,255,0.5)';
              });
              currentSlide = index;
            }
            
            if (prevBtn) prevBtn.addEventListener('click', () => showSlide(currentSlide === 0 ? slides.length - 1 : currentSlide - 1));
            if (nextBtn) nextBtn.addEventListener('click', () => showSlide(currentSlide === slides.length - 1 ? 0 : currentSlide + 1));
            dots.forEach((dot, i) => dot.addEventListener('click', () => showSlide(i)));
            
            ${data.autoplay ? `
              setInterval(() => {
                showSlide(currentSlide === slides.length - 1 ? 0 : currentSlide + 1);
              }, ${data.autoplayInterval || 5000});
            ` : ''}
          })();
        </script>
      ` : ''}
    `;
  }
  
  return `
    <section class="hero-section" style="position: relative; ${backgroundStyle}; color: ${data.textColor || '#FFFFFF'}; padding: 80px 20px; text-align: center; min-height: 500px; display: flex; align-items: center; justify-content: center;">
      ${overlayStyle ? `<div style="${overlayStyle}"></div>` : ''}
      <div style="position: relative; z-index: 10; max-width: 800px; margin: 0 auto;">
        <h1 class="hero-title" style="${titleStyle}; color: ${data.textColor || '#FFFFFF'}; margin-bottom: 1rem;">${data.title || 'Welcome'}</h1>
        <p class="hero-subtitle" style="${subtitleStyle}; color: ${data.textColor || '#FFFFFF'}; margin-bottom: 2rem; opacity: 0.9;">${data.subtitle || ''}</p>
        <a href="${data.buttonLink || '#'}" style="display: inline-block; padding: ${buttonStyle.padding || '12px 32px'}; background: ${buttonStyle.backgroundColor || 'white'}; color: ${buttonStyle.textColor || data.backgroundColor || '#27491F'}; border-radius: ${buttonStyle.borderRadius || 8}px; text-decoration: none; font-weight: ${buttonStyle.fontWeight || '600'}; font-size: ${buttonStyle.fontSize || 16}px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">${data.buttonText || 'Get Started'}</a>
      </div>
    </section>
  `;
}

function generateFeaturesHTML(data: any): string {
  const items = data.items || [];
  return `
    <section style="padding: 60px 20px; background: white;">
      <div style="max-width: 1200px; margin: 0 auto;">
        <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 1rem; color: var(--primary-color);">${data.title || 'Features'}</h2>
        ${data.subtitle ? `<p style="text-align: center; color: #666; margin-bottom: 3rem;">${data.subtitle}</p>` : ''}
        <div class="features-grid">
          ${items.map((item: any) => `
            <div style="text-align: center; padding: 2rem; border: 1px solid #e5e7eb; border-radius: 12px;">
              <div style="font-size: 3rem; margin-bottom: 1rem;">${item.icon || '⭐'}</div>
              <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--primary-color);">${item.title || ''}</h3>
              <p style="color: #666;">${item.description || ''}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function generateProductsHTML(data: any): string {
  const count = data.productCount || 6;
  return `
    <section style="padding: 60px 20px; background: #f9fafb;">
      <div style="max-width: 1200px; margin: 0 auto;">
        <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 1rem; color: var(--primary-color);">${data.title || 'Products'}</h2>
        ${data.subtitle ? `<p style="text-align: center; color: #666; margin-bottom: 3rem;">${data.subtitle}</p>` : ''}
        <div class="products-grid">
          ${Array.from({ length: count }).map((_, i) => `
            <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="height: 200px; background: linear-gradient(135deg, var(--primary-color)20, var(--secondary-color)20); display: flex; align-items: center; justify-content: center;">
                <span class="material-icons" style="font-size: 4rem; color: rgba(0,0,0,0.2);">image</span>
              </div>
              <div style="padding: 1.5rem;">
                <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--primary-color);">Product ${i + 1}</h3>
                <p style="color: #666; margin-bottom: 1rem;">$29.99</p>
                <button style="width: 100%; padding: 0.75rem; background: var(--primary-color); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Add to Cart</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function generateTestimonialsHTML(data: any): string {
  const items = data.items || [];
  return `
    <section style="padding: 60px 20px; background: white;">
      <div style="max-width: 1200px; margin: 0 auto;">
        <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 3rem; color: var(--primary-color);">${data.title || 'Testimonials'}</h2>
        <div class="testimonials-grid">
          ${items.map((item: any) => `
            <div style="padding: 2rem; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
              <div style="margin-bottom: 1rem;">
                ${Array.from({ length: item.rating || 5 }).map(() => '⭐').join('')}
              </div>
              <p style="font-style: italic; color: #333; margin-bottom: 1rem;">"${item.text || ''}"</p>
              <div>
                <p style="font-weight: 600; color: var(--primary-color);">${item.name || ''}</p>
                <p style="font-size: 0.875rem; color: #666;">${item.role || ''}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function generateCTAHTML(data: any): string {
  return `
    <section style="padding: 80px 20px; background: ${data.backgroundColor || '#27491F'}; color: white; text-align: center;">
      <div style="max-width: 800px; margin: 0 auto;">
        <h2 style="font-size: 2.5rem; font-weight: bold; margin-bottom: 1rem;">${data.title || 'Get Started'}</h2>
        ${data.subtitle ? `<p style="font-size: 1.25rem; margin-bottom: 2rem; opacity: 0.9;">${data.subtitle}</p>` : ''}
        <a href="${data.buttonLink || '#'}" style="display: inline-block; padding: 12px 32px; background: white; color: ${data.backgroundColor || '#27491F'}; border-radius: 8px; text-decoration: none; font-weight: 600; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">${data.buttonText || 'Get Started'}</a>
      </div>
    </section>
  `;
}

function generateAboutHTML(data: any): string {
  return `
    <section style="padding: 60px 20px; background: white;">
      <div style="max-width: 1200px; margin: 0 auto;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center;">
          <div>
            <h2 style="font-size: 2.5rem; font-weight: bold; margin-bottom: 1.5rem; color: var(--primary-color);">${data.title || 'About Us'}</h2>
            <p style="color: #666; line-height: 1.8; white-space: pre-line;">${data.content || ''}</p>
          </div>
          <div>
            ${data.image ? `<img src="${data.image}" alt="${data.title}" style="width: 100%; height: 400px; object-fit: cover; border-radius: 12px;">` : '<div style="width: 100%; height: 400px; background: linear-gradient(135deg, var(--primary-color)20, var(--secondary-color)20); border-radius: 12px; display: flex; align-items: center; justify-content: center;"><span class="material-icons" style="font-size: 4rem; color: rgba(0,0,0,0.2);">image</span></div>'}
          </div>
        </div>
      </div>
    </section>
  `;
}

function generateContactHTML(data: any): string {
  return `
    <section style="padding: 60px 20px; background: #f9fafb;">
      <div style="max-width: 1200px; margin: 0 auto;">
        <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 1rem; color: var(--primary-color);">${data.title || 'Contact Us'}</h2>
        ${data.subtitle ? `<p style="text-align: center; color: #666; margin-bottom: 3rem;">${data.subtitle}</p>` : ''}
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem;">
          <div style="text-align: center; padding: 2rem; background: white; border-radius: 12px; border: 1px solid #e5e7eb;">
            <span class="material-icons" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;">email</span>
            <h3 style="font-weight: 600; margin-bottom: 0.5rem; color: var(--primary-color);">Email</h3>
            <p style="color: #666;">${data.email || ''}</p>
          </div>
          <div style="text-align: center; padding: 2rem; background: white; border-radius: 12px; border: 1px solid #e5e7eb;">
            <span class="material-icons" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;">phone</span>
            <h3 style="font-weight: 600; margin-bottom: 0.5rem; color: var(--primary-color);">Phone</h3>
            <p style="color: #666;">${data.phone || ''}</p>
          </div>
          <div style="text-align: center; padding: 2rem; background: white; border-radius: 12px; border: 1px solid #e5e7eb;">
            <span class="material-icons" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;">location_on</span>
            <h3 style="font-weight: 600; margin-bottom: 0.5rem; color: var(--primary-color);">Address</h3>
            <p style="color: #666;">${data.address || ''}</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

function generateGalleryHTML(data: any): string {
  const images = data.images || [];
  return `
    <section style="padding: 60px 20px; background: white;">
      <div style="max-width: 1200px; margin: 0 auto;">
        <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 3rem; color: var(--primary-color);">${data.title || 'Gallery'}</h2>
        <div class="gallery-grid">
          ${images.length > 0 ? images.map((img: any) => `
            <div style="aspect-ratio: 1; overflow: hidden; border-radius: 8px;">
              <img src="${img.url || ''}" alt="${img.alt || ''}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
          `).join('') : Array.from({ length: 8 }).map(() => `
            <div style="aspect-ratio: 1; background: linear-gradient(135deg, var(--primary-color)20, var(--secondary-color)20); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
              <span class="material-icons" style="font-size: 3rem; color: rgba(0,0,0,0.2);">image</span>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function generatePricingHTML(data: any): string {
  const plans = data.plans || [];
  return `
    <section style="padding: 60px 20px; background: #f9fafb;">
      <div style="max-width: 1200px; margin: 0 auto;">
        <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 1rem; color: var(--primary-color);">${data.title || 'Pricing'}</h2>
        ${data.subtitle ? `<p style="text-align: center; color: #666; margin-bottom: 3rem;">${data.subtitle}</p>` : ''}
        <div class="pricing-grid">
          ${plans.length > 0 ? plans.map((plan: any) => `
            <div style="background: white; padding: 2rem; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h3 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem; color: var(--primary-color);">${plan.name || ''}</h3>
              <div style="margin-bottom: 1.5rem;">
                <span style="font-size: 2.5rem; font-weight: bold; color: var(--primary-color);">$${plan.price || 0}</span>
                <span style="color: #666;">/month</span>
              </div>
              <ul style="list-style: none; margin-bottom: 2rem;">
                ${(plan.features || []).map((feature: string) => `
                  <li style="padding: 0.5rem 0; display: flex; align-items: center; gap: 0.5rem;">
                    <span class="material-icons" style="color: #10b981; font-size: 1.25rem;">check_circle</span>
                    <span style="color: #666;">${feature}</span>
                  </li>
                `).join('')}
              </ul>
              <button style="width: 100%; padding: 0.75rem; background: var(--primary-color); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Get Started</button>
            </div>
          `).join('') : ['Basic', 'Pro', 'Enterprise'].map((name, i) => `
            <div style="background: white; padding: 2rem; border-radius: 12px; border: 1px solid #e5e7eb;">
              <h3 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem; color: var(--primary-color);">${name}</h3>
              <div style="margin-bottom: 1.5rem;">
                <span style="font-size: 2.5rem; font-weight: bold; color: var(--primary-color);">$${(i + 1) * 29}</span>
                <span style="color: #666;">/month</span>
              </div>
              <button style="width: 100%; padding: 0.75rem; background: var(--primary-color); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Get Started</button>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function generateFAQHTML(data: any): string {
  const items = data.items || [];
  return `
    <section style="padding: 60px 20px; background: white;">
      <div style="max-width: 800px; margin: 0 auto;">
        <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 3rem; color: var(--primary-color);">${data.title || 'FAQ'}</h2>
        <div>
          ${items.length > 0 ? items.map((item: any, index: number) => `
            <div class="faq-item" style="border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 1rem; overflow: hidden;">
              <button class="faq-button" style="width: 100%; padding: 1.25rem; text-align: left; background: #f9fafb; border: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 600; color: var(--primary-color);">${item.question || ''}</span>
                <span class="material-icons faq-icon" style="color: var(--primary-color);">expand_more</span>
              </button>
              <div class="faq-content" style="display: none; padding: 1.25rem; color: #666;">${item.answer || ''}</div>
            </div>
          `).join('') : Array.from({ length: 4 }).map((_, i) => `
            <div class="faq-item" style="border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 1rem; overflow: hidden;">
              <button class="faq-button" style="width: 100%; padding: 1.25rem; text-align: left; background: #f9fafb; border: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 600; color: var(--primary-color);">Question ${i + 1}?</span>
                <span class="material-icons faq-icon" style="color: var(--primary-color);">expand_more</span>
              </button>
              <div class="faq-content" style="display: none; padding: 1.25rem; color: #666;">Answer to question ${i + 1} goes here...</div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function generateFooterHTML(data: any, style?: any): string {
  const {
    logoText = 'DIGIX',
    logo = '',
    copyrightText = '© 2024 DIGIX. All rights reserved.',
    columns = [],
    socialLinks = [],
    socialIconBackgroundColor = '#1f2937',
    socialIconHoverBackgroundColor = '#27491F',
    showNewsletter = false,
    newsletterText = 'Subscribe to our newsletter',
    newsletterPlaceholder = 'Enter your email'
  } = data;
  
  const defaultColumns = columns.length === 0 ? [
    { title: 'Company', links: [{ label: 'About Us', link: '#' }, { label: 'Contact', link: '#' }, { label: 'Careers', link: '#' }] },
    { title: 'Support', links: [{ label: 'Help Center', link: '#' }, { label: 'Privacy Policy', link: '#' }, { label: 'Terms of Service', link: '#' }] },
    { title: 'Connect', links: [{ label: 'Facebook', link: '#' }, { label: 'Twitter', link: '#' }, { label: 'Instagram', link: '#' }] }
  ] : columns;
  
  const defaultSocialLinks = socialLinks.length === 0 ? [
    { platform: 'Facebook', icon: 'facebook', link: '#' },
    { platform: 'Twitter', icon: 'chat', link: '#' },
    { platform: 'Instagram', icon: 'camera_alt', link: '#' },
    { platform: 'LinkedIn', icon: 'business', link: '#' }
  ] : socialLinks;
  
  const textColor = style?.color || '#ffffff';
  const mutedTextColor = '#9ca3af';
  const linkColor = '#9ca3af';
  
  return `
    <footer style="background-color: ${style?.backgroundColor || '#111827'}; color: ${textColor}; width: 100%; padding: 48px 24px;">
      <div style="max-width: 1152px; margin: 0 auto;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 32px; margin-bottom: 48px;">
          <!-- Logo/Brand Column -->
          <div>
            ${logo ? 
              `<img src="${logo}" alt="${logoText}" style="height: 32px; margin-bottom: 1rem;" />` :
              `<h3 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: ${textColor};">${logoText}</h3>`
            }
            <p style="font-size: 0.875rem; color: ${mutedTextColor}; margin-bottom: 1rem;">
              Building amazing experiences for your business.
            </p>
            ${defaultSocialLinks.length > 0 ? `
              <div style="display: flex; gap: 0.75rem;">
                ${defaultSocialLinks.map((social: any) => `
                  <a href="${social.link}" target="_blank" rel="noopener noreferrer" style="width: 36px; height: 36px; border-radius: 50%; background: ${socialIconBackgroundColor}; display: flex; align-items: center; justify-content: center; text-decoration: none; transition: background 0.3s;" onmouseover="this.style.background='${socialIconHoverBackgroundColor}'" onmouseout="this.style.background='${socialIconBackgroundColor}'">
                    <span class="material-icons" style="color: ${textColor}; font-size: 18px;">${social.icon}</span>
                  </a>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <!-- Link Columns -->
          ${defaultColumns.map((column: any) => `
            <div>
              <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 1rem; color: ${textColor};">${column.title || ''}</h4>
              <ul style="list-style: none; padding: 0; margin: 0;">
                ${(column.links || []).map((link: any) => `
                  <li style="margin-bottom: 0.5rem;">
                    <a href="${link.link || '#'}" style="font-size: 0.875rem; color: ${linkColor}; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='${textColor}'" onmouseout="this.style.color='${linkColor}'">${link.label || ''}</a>
                  </li>
                `).join('')}
              </ul>
            </div>
          `).join('')}

          <!-- Newsletter Column -->
          ${showNewsletter ? `
            <div>
              <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 1rem; color: ${textColor};">${newsletterText}</h4>
              <form style="display: flex; flex-direction: column; gap: 0.75rem;" onsubmit="event.preventDefault();">
                <input type="email" placeholder="${newsletterPlaceholder}" style="width: 100%; padding: 12px; border-radius: 8px; background: #1f2937; border: 1px solid #374151; color: white; font-size: 0.875rem;" />
                <button type="submit" style="width: 100%; padding: 12px; background: var(--primary-color); color: white; border: none; border-radius: 8px; font-weight: 500; font-size: 0.875rem; cursor: pointer;">Subscribe</button>
              </form>
            </div>
          ` : ''}
        </div>

        <!-- Bottom Bar -->
        <div style="padding-top: 24px; border-top: 1px solid #374151;">
          <div style="display: flex; flex-direction: column; gap: 1rem; align-items: center; justify-content: space-between;">
            <p style="font-size: 0.75rem; color: ${mutedTextColor}; text-align: center;">
              ${copyrightText}
            </p>
            <div style="display: flex; gap: 1rem; font-size: 0.75rem;">
              <a href="#" style="color: ${mutedTextColor}; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='${textColor}'" onmouseout="this.style.color='${mutedTextColor}'">Privacy</a>
              <a href="#" style="color: ${mutedTextColor}; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='${textColor}'" onmouseout="this.style.color='${mutedTextColor}'">Terms</a>
              <a href="#" style="color: ${mutedTextColor}; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='${textColor}'" onmouseout="this.style.color='${mutedTextColor}'">Cookies</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
    <style>
      @media (min-width: 640px) {
        footer > div > div:first-child {
          grid-template-columns: repeat(2, 1fr) !important;
        }
      }
      @media (min-width: 1024px) {
        footer > div > div:first-child {
          grid-template-columns: repeat(4, 1fr) !important;
        }
        footer > div > div:last-child > div {
          flex-direction: row !important;
        }
        footer > div > div:last-child > div > p {
          text-align: left !important;
        }
      }
    </style>
  `;
}

function generateStatsHTML(data: any): string {
  const {
    title,
    subtitle,
    stats = [],
    layout = 'row'
  } = data;

  const defaultStats = stats.length > 0 ? stats : [
    { value: '10K+', label: 'Happy Customers', icon: '😊' },
    { value: '500+', label: 'Products Sold', icon: '📦' },
    { value: '99%', label: 'Satisfaction Rate', icon: '⭐' },
    { value: '24/7', label: 'Support Available', icon: '💬' }
  ];

  return `
    <section style="padding: 60px 20px; background: linear-gradient(135deg, var(--primary-color), rgba(39, 73, 31, 0.8));">
      <div style="max-width: 1200px; margin: 0 auto;">
        ${title || subtitle ? `
          <div style="text-align: center; margin-bottom: 48px;">
            ${title ? `<h2 style="font-size: 2.5rem; font-weight: bold; color: white; margin-bottom: 1rem;">${title}</h2>` : ''}
            ${subtitle ? `<p style="font-size: 1.125rem; color: rgba(255,255,255,0.8);">${subtitle}</p>` : ''}
          </div>
        ` : ''}
        <div style="display: grid; grid-template-columns: repeat(${layout === 'row' ? 4 : 2}, 1fr); gap: 2rem;">
          ${defaultStats.map((stat: any) => `
            <div style="text-align: center; padding: 2rem; border-radius: 16px; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);">
              ${stat.icon ? `<div style="font-size: 2.5rem; margin-bottom: 0.75rem;">${stat.icon}</div>` : ''}
              <div style="font-size: 3rem; font-weight: bold; color: white; margin-bottom: 0.5rem;">
                ${stat.prefix || ''}${stat.value}${stat.suffix || ''}
              </div>
              <div style="font-size: 1rem; color: rgba(255,255,255,0.8); font-weight: 500;">${stat.label}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
    <style>
      @media (max-width: 768px) {
        .stats-section > div > div:last-child {
          grid-template-columns: repeat(2, 1fr) !important;
        }
      }
      @media (max-width: 480px) {
        .stats-section > div > div:last-child {
          grid-template-columns: 1fr !important;
        }
      }
    </style>
  `;
}

function generateTeamHTML(data: any): string {
  const {
    title = 'Meet Our Team',
    subtitle = 'The people behind our success',
    members = [],
    layout = 'grid'
  } = data;

  const defaultMembers = members.length > 0 ? members : [
    { name: 'John Doe', role: 'CEO & Founder', bio: 'Visionary leader with 10+ years experience' },
    { name: 'Jane Smith', role: 'CTO', bio: 'Tech innovator and problem solver' },
    { name: 'Mike Johnson', role: 'Lead Designer', bio: 'Creative mind behind our designs' },
    { name: 'Sarah Wilson', role: 'Marketing Head', bio: 'Growth strategist and brand expert' }
  ];

  return `
    <section style="padding: 60px 20px; background: white;">
      <div style="max-width: 1200px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 48px;">
          <h2 style="font-size: 2.5rem; font-weight: bold; color: var(--primary-color); margin-bottom: 1rem;">${title}</h2>
          ${subtitle ? `<p style="font-size: 1.125rem; color: #666;">${subtitle}</p>` : ''}
        </div>
        <div style="display: grid; grid-template-columns: repeat(${layout === 'grid' ? 4 : 2}, 1fr); gap: 2rem;">
          ${defaultMembers.map((member: any) => `
            <div style="text-align: center; padding: 1.5rem; border-radius: 16px; border: 1px solid #e5e7eb; transition: all 0.3s;">
              <div style="width: 128px; height: 128px; margin: 0 auto 1rem; border-radius: 50%; overflow: hidden; border: 4px solid rgba(39, 73, 31, 0.2);">
                ${member.image ? 
                  `<img src="${member.image}" alt="${member.name}" style="width: 100%; height: 100%; object-fit: cover;" />` :
                  `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, rgba(39, 73, 31, 0.2), rgba(240, 202, 225, 0.2)); display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 3rem; font-weight: bold; color: var(--primary-color);">${member.name?.charAt(0) || 'T'}</span>
                  </div>`
                }
              </div>
              <h3 style="font-size: 1.25rem; font-weight: bold; color: var(--primary-color); margin-bottom: 0.25rem;">${member.name}</h3>
              <p style="font-size: 0.875rem; color: var(--secondary-color); font-weight: 500; margin-bottom: 0.75rem;">${member.role}</p>
              ${member.bio ? `<p style="font-size: 0.875rem; color: #666; line-height: 1.5;">${member.bio}</p>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </section>
    <style>
      @media (max-width: 1024px) {
        .team-section > div > div:last-child {
          grid-template-columns: repeat(2, 1fr) !important;
        }
      }
      @media (max-width: 640px) {
        .team-section > div > div:last-child {
          grid-template-columns: 1fr !important;
        }
      }
    </style>
  `;
}

function generateServicesHTML(data: any): string {
  const {
    title = 'Our Services',
    subtitle = 'What we offer',
    services = [],
    layout = 'grid'
  } = data;

  const defaultServices = services.length > 0 ? services : [
    { icon: '🚀', title: 'Fast Delivery', description: 'Get your products delivered within 24-48 hours', price: 'Free' },
    { icon: '🛡️', title: 'Secure Payment', description: 'Multiple secure payment options available' },
    { icon: '🔄', title: 'Easy Returns', description: '30-day hassle-free return policy' },
    { icon: '💬', title: '24/7 Support', description: 'Round the clock customer support' },
    { icon: '🎁', title: 'Gift Wrapping', description: 'Beautiful gift wrapping service', price: '$5' },
    { icon: '📦', title: 'Track Orders', description: 'Real-time order tracking', price: 'Free' }
  ];

  return `
    <section style="padding: 60px 20px; background: #f9fafb;">
      <div style="max-width: 1200px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 48px;">
          <h2 style="font-size: 2.5rem; font-weight: bold; color: var(--primary-color); margin-bottom: 1rem;">${title}</h2>
          ${subtitle ? `<p style="font-size: 1.125rem; color: #666;">${subtitle}</p>` : ''}
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem;">
          ${defaultServices.map((service: any) => `
            <div style="text-align: center; padding: 2rem; background: white; border-radius: 16px; border: 1px solid #e5e7eb; transition: all 0.3s;">
              <div style="width: 80px; height: 80px; margin: 0 auto 1rem; border-radius: 16px; background: rgba(39, 73, 31, 0.1); display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 2.5rem;">${service.icon}</span>
              </div>
              <h3 style="font-size: 1.25rem; font-weight: bold; color: var(--primary-color); margin-bottom: 0.75rem;">${service.title}</h3>
              <p style="font-size: 0.875rem; color: #666; margin-bottom: 1rem;">${service.description}</p>
              ${service.price ? `<div style="font-size: 1.25rem; font-weight: bold; color: var(--secondary-color);">${service.price}</div>` : ''}
              ${service.link ? `<a href="${service.link}" style="display: inline-flex; align-items: center; gap: 0.25rem; margin-top: 0.5rem; color: var(--primary-color); font-size: 0.875rem; font-weight: 500; text-decoration: none;">Learn More <span class="material-icons" style="font-size: 14px;">arrow_forward</span></a>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </section>
    <style>
      @media (max-width: 1024px) {
        .services-section > div > div:last-child {
          grid-template-columns: repeat(2, 1fr) !important;
        }
      }
      @media (max-width: 640px) {
        .services-section > div > div:last-child {
          grid-template-columns: 1fr !important;
        }
      }
    </style>
  `;
}

function generateVideoHTML(data: any): string {
  const {
    title,
    subtitle,
    videoUrl = '',
    videoType = 'youtube',
    thumbnailUrl,
    showControls = true
  } = data;

  const getEmbedUrl = () => {
    if (!videoUrl) return '';
    if (videoType === 'youtube') {
      const match = videoUrl.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^&?\/\s]{11})/);
      const videoId = match ? match[1] : videoUrl;
      return `https://www.youtube.com/embed/${videoId}?controls=${showControls ? 1 : 0}&rel=0`;
    }
    if (videoType === 'vimeo') {
      const match = videoUrl.match(/vimeo\.com\/(\d+)/);
      const videoId = match ? match[1] : videoUrl;
      return `https://player.vimeo.com/video/${videoId}?controls=${showControls ? 1 : 0}`;
    }
    return videoUrl;
  };

  return `
    <section style="padding: 60px 20px; background: #111827;">
      <div style="max-width: 1024px; margin: 0 auto;">
        ${title || subtitle ? `
          <div style="text-align: center; margin-bottom: 48px;">
            ${title ? `<h2 style="font-size: 2.5rem; font-weight: bold; color: white; margin-bottom: 1rem;">${title}</h2>` : ''}
            ${subtitle ? `<p style="font-size: 1.125rem; color: rgba(255,255,255,0.7);">${subtitle}</p>` : ''}
          </div>
        ` : ''}
        <div style="position: relative; aspect-ratio: 16/9; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
          ${videoUrl ? 
            (videoType === 'custom' ? 
              `<video src="${videoUrl}" style="width: 100%; height: 100%; object-fit: cover;" ${showControls ? 'controls' : ''} playsinline></video>` :
              `<iframe src="${getEmbedUrl()}" style="width: 100%; height: 100%; border: none;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
            ) :
            `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, rgba(39, 73, 31, 0.2), rgba(240, 202, 225, 0.2)); display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <span class="material-icons" style="font-size: 5rem; color: rgba(255,255,255,0.3); margin-bottom: 1rem;">play_circle</span>
              <p style="color: rgba(255,255,255,0.5);">Add a video URL to display</p>
            </div>`
          }
        </div>
      </div>
    </section>
  `;
}

function generateCountdownHTML(data: any): string {
  const {
    title = 'Coming Soon',
    subtitle = 'Something amazing is on its way',
    targetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    showDays = true,
    showHours = true,
    showMinutes = true,
    showSeconds = true,
    expiredMessage = 'The wait is over!',
    backgroundColor = '#27491F',
    textColor = '#ffffff'
  } = data;

  const countdownId = `countdown_${Date.now()}`;

  return `
    <section style="padding: 80px 20px; background: ${backgroundColor}; position: relative; overflow: hidden;">
      <div style="position: absolute; inset: 0; opacity: 0.1;">
        <div style="position: absolute; top: 0; left: 25%; width: 256px; height: 256px; background: white; border-radius: 50%; filter: blur(60px);"></div>
        <div style="position: absolute; bottom: 0; right: 25%; width: 384px; height: 384px; background: white; border-radius: 50%; filter: blur(60px);"></div>
      </div>
      <div style="max-width: 800px; margin: 0 auto; text-align: center; position: relative; z-index: 10;">
        <h2 style="font-size: 3rem; font-weight: bold; color: ${textColor}; margin-bottom: 1rem;">${title}</h2>
        ${subtitle ? `<p style="font-size: 1.25rem; color: ${textColor}; opacity: 0.8; margin-bottom: 3rem;">${subtitle}</p>` : ''}
        <div id="${countdownId}" style="display: flex; justify-content: center; gap: 1.5rem; margin-bottom: 3rem;">
          ${showDays ? `<div class="countdown-unit"><div class="countdown-value" data-unit="days">00</div><div class="countdown-label">Days</div></div>` : ''}
          ${showHours ? `<div class="countdown-unit"><div class="countdown-value" data-unit="hours">00</div><div class="countdown-label">Hours</div></div>` : ''}
          ${showMinutes ? `<div class="countdown-unit"><div class="countdown-value" data-unit="minutes">00</div><div class="countdown-label">Minutes</div></div>` : ''}
          ${showSeconds ? `<div class="countdown-unit"><div class="countdown-value" data-unit="seconds">00</div><div class="countdown-label">Seconds</div></div>` : ''}
        </div>
        <div style="max-width: 400px; margin: 0 auto;">
          <p style="font-size: 0.875rem; color: ${textColor}; opacity: 0.7; margin-bottom: 1rem;">Get notified when we launch</p>
          <form style="display: flex; gap: 0.75rem;" onsubmit="event.preventDefault(); alert('Thank you for subscribing!');">
            <input type="email" placeholder="Enter your email" style="flex: 1; padding: 12px 16px; border-radius: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: ${textColor}; font-size: 0.875rem;" required />
            <button type="submit" style="padding: 12px 24px; border-radius: 8px; background: ${textColor}; color: ${backgroundColor}; border: none; font-weight: 600; cursor: pointer;">Notify Me</button>
          </form>
        </div>
      </div>
    </section>
    <style>
      #${countdownId} .countdown-unit {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      #${countdownId} .countdown-value {
        width: 80px;
        height: 80px;
        border-radius: 16px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        font-weight: bold;
        color: ${textColor};
        margin-bottom: 0.5rem;
      }
      #${countdownId} .countdown-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: ${textColor};
        opacity: 0.8;
      }
      @media (max-width: 640px) {
        #${countdownId} .countdown-value {
          width: 60px;
          height: 60px;
          font-size: 1.5rem;
        }
      }
    </style>
    <script>
      (function() {
        const targetDate = new Date('${targetDate}').getTime();
        const container = document.getElementById('${countdownId}');
        
        function updateCountdown() {
          const now = new Date().getTime();
          const diff = targetDate - now;
          
          if (diff <= 0) {
            container.innerHTML = '<div style="font-size: 2rem; font-weight: bold; color: ${textColor};">${expiredMessage}</div>';
            return;
          }
          
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          
          const daysEl = container.querySelector('[data-unit="days"]');
          const hoursEl = container.querySelector('[data-unit="hours"]');
          const minutesEl = container.querySelector('[data-unit="minutes"]');
          const secondsEl = container.querySelector('[data-unit="seconds"]');
          
          if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
          if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
          if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
          if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
        }
        
        updateCountdown();
        setInterval(updateCountdown, 1000);
      })();
    </script>
  `;
}

function generateBannerHTML(data: any): string {
  const {
    text = '🎉 Special Offer: Get 20% off your first order! Use code WELCOME20',
    link,
    linkText = 'Shop Now',
    backgroundColor = '#27491F',
    textColor = '#ffffff',
    icon,
    dismissible = false
  } = data;

  const bannerId = `banner_${Date.now()}`;

  return `
    <section id="${bannerId}" style="padding: 12px 24px; background: ${backgroundColor}; position: relative;">
      <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: center; gap: 1rem;">
        ${icon ? `<span style="font-size: 1.25rem;">${icon}</span>` : ''}
        <p style="font-size: 0.875rem; font-weight: 500; color: ${textColor}; text-align: center;">${text}</p>
        ${link ? `
          <a href="${link}" style="display: inline-flex; align-items: center; gap: 0.25rem; padding: 6px 16px; border-radius: 9999px; background: ${textColor}; color: ${backgroundColor}; font-size: 0.75rem; font-weight: 600; text-decoration: none;">
            ${linkText}
            <span class="material-icons" style="font-size: 14px;">arrow_forward</span>
          </a>
        ` : ''}
        ${dismissible ? `
          <button onclick="document.getElementById('${bannerId}').style.display='none'" style="position: absolute; right: 16px; padding: 4px; border-radius: 50%; background: transparent; border: none; cursor: pointer;">
            <span class="material-icons" style="color: ${textColor}; font-size: 18px;">close</span>
          </button>
        ` : ''}
      </div>
    </section>
  `;
}

function generatePartnersHTML(data: any): string {
  const {
    title = 'Trusted By',
    subtitle,
    partners = [],
    grayscale = true,
    autoScroll = false
  } = data;

  const defaultPartners = partners.length > 0 ? partners : [
    { name: 'Company 1' },
    { name: 'Company 2' },
    { name: 'Company 3' },
    { name: 'Company 4' },
    { name: 'Company 5' },
    { name: 'Company 6' }
  ];

  return `
    <section style="padding: 48px 24px; background: white; ${autoScroll ? 'overflow: hidden;' : ''}">
      <div style="max-width: 1200px; margin: 0 auto;">
        ${title || subtitle ? `
          <div style="text-align: center; margin-bottom: 40px;">
            ${title ? `<h2 style="font-size: 1.5rem; font-weight: bold; color: var(--primary-color); margin-bottom: 0.5rem;">${title}</h2>` : ''}
            ${subtitle ? `<p style="font-size: 1rem; color: #666;">${subtitle}</p>` : ''}
          </div>
        ` : ''}
        ${autoScroll ? `
          <div style="display: flex; animation: scroll 30s linear infinite;">
            ${[...defaultPartners, ...defaultPartners].map((partner: any, index: number) => `
              <div style="flex-shrink: 0; margin: 0 2rem; ${grayscale ? 'filter: grayscale(100%); opacity: 0.6;' : ''} transition: all 0.3s;" onmouseover="this.style.filter='grayscale(0%)'; this.style.opacity='1';" onmouseout="this.style.filter='${grayscale ? 'grayscale(100%)' : 'grayscale(0%)'}'; this.style.opacity='${grayscale ? '0.6' : '1'}';">
                ${partner.logo ? 
                  `<img src="${partner.logo}" alt="${partner.name}" style="height: 48px; width: auto;" />` :
                  `<div style="height: 48px; padding: 0 24px; background: #e5e7eb; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                    <span style="color: #666; font-weight: 600;">${partner.name}</span>
                  </div>`
                }
              </div>
            `).join('')}
          </div>
          <style>
            @keyframes scroll {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          </style>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 1.5rem; align-items: center;">
            ${defaultPartners.map((partner: any) => `
              <div style="display: flex; align-items: center; justify-content: center; padding: 1rem; ${grayscale ? 'filter: grayscale(100%); opacity: 0.6;' : ''} transition: all 0.3s;" onmouseover="this.style.filter='grayscale(0%)'; this.style.opacity='1';" onmouseout="this.style.filter='${grayscale ? 'grayscale(100%)' : 'grayscale(0%)'}'; this.style.opacity='${grayscale ? '0.6' : '1'}';">
                ${partner.logo ? 
                  `<a href="${partner.link || '#'}" target="${partner.link ? '_blank' : '_self'}" rel="noopener noreferrer">
                    <img src="${partner.logo}" alt="${partner.name}" style="height: 48px; width: auto;" />
                  </a>` :
                  `<div style="height: 48px; padding: 0 24px; background: #e5e7eb; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                    <span style="color: #666; font-weight: 600; font-size: 0.875rem;">${partner.name}</span>
                  </div>`
                }
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </section>
    <style>
      @media (max-width: 1024px) {
        .partners-grid {
          grid-template-columns: repeat(3, 1fr) !important;
        }
      }
      @media (max-width: 640px) {
        .partners-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }
      }
    </style>
  `;
}

function generateNewsletterHTML(data: any): string {
  const {
    title = 'Stay Updated',
    subtitle = 'Subscribe to our newsletter for the latest updates and exclusive offers',
    placeholder = 'Enter your email address',
    buttonText = 'Subscribe',
    backgroundColor = '#f9fafb',
    successMessage = 'Thank you for subscribing!'
  } = data;

  const formId = `newsletter_${Date.now()}`;

  return `
    <section style="padding: 60px 20px; background: ${backgroundColor};">
      <div style="max-width: 600px; margin: 0 auto; text-align: center;">
        <div style="width: 64px; height: 64px; margin: 0 auto 1.5rem; border-radius: 16px; background: rgba(39, 73, 31, 0.1); display: flex; align-items: center; justify-content: center;">
          <span class="material-icons" style="font-size: 2rem; color: var(--primary-color);">mail</span>
        </div>
        <h2 style="font-size: 2.5rem; font-weight: bold; color: var(--primary-color); margin-bottom: 1rem;">${title}</h2>
        ${subtitle ? `<p style="font-size: 1.125rem; color: #666; margin-bottom: 2.5rem;">${subtitle}</p>` : ''}
        <form id="${formId}" style="display: flex; gap: 0.75rem; max-width: 500px; margin: 0 auto;" onsubmit="event.preventDefault(); this.innerHTML = '<div style=\\'padding: 1rem; text-align: center;\\'><div style=\\'width: 64px; height: 64px; margin: 0 auto 1rem; border-radius: 50%; background: #dcfce7; display: flex; align-items: center; justify-content: center;\\'><span class=\\'material-icons\\' style=\\'font-size: 2rem; color: #16a34a;\\'>check</span></div><p style=\\'font-size: 1.125rem; font-weight: 600; color: #16a34a;\\'>${successMessage}</p></div>';">
          <div style="position: relative; flex: 1;">
            <span class="material-icons" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #9ca3af;">email</span>
            <input type="email" placeholder="${placeholder}" required style="width: 100%; padding: 16px 16px 16px 48px; border-radius: 12px; border: 1px solid #d1d5db; font-size: 1rem;" />
          </div>
          <button type="submit" style="padding: 16px 32px; background: var(--primary-color); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;">${buttonText}</button>
        </form>
        <p style="margin-top: 1.5rem; font-size: 0.75rem; color: #9ca3af;">We respect your privacy. Unsubscribe at any time.</p>
      </div>
    </section>
    <style>
      @media (max-width: 640px) {
        #${formId} {
          flex-direction: column !important;
        }
      }
    </style>
  `;
}

function generateDividerHTML(data: any): string {
  const {
    style: dividerStyle = 'line',
    color = '#e5e7eb',
    height = 1,
    width = '100%',
    spacing = 40
  } = data;

  let dividerElement = '';
  
  switch (dividerStyle) {
    case 'dotted':
      dividerElement = `<div style="width: ${width}; border-top: ${height}px dotted ${color}; margin: 0 auto;"></div>`;
      break;
    case 'dashed':
      dividerElement = `<div style="width: ${width}; border-top: ${height}px dashed ${color}; margin: 0 auto;"></div>`;
      break;
    case 'gradient':
      dividerElement = `<div style="width: ${width}; height: ${height}px; background: linear-gradient(90deg, transparent, ${color}, transparent); margin: 0 auto; border-radius: 9999px;"></div>`;
      break;
    case 'wave':
      dividerElement = `
        <svg viewBox="0 0 1200 40" style="width: 100%; max-width: ${width}; height: ${Math.max(height * 20, 20)}px; margin: 0 auto; display: block;" preserveAspectRatio="none">
          <path d="M0,20 C200,40 400,0 600,20 C800,40 1000,0 1200,20" fill="none" stroke="${color}" stroke-width="${height}" />
        </svg>
      `;
      break;
    case 'zigzag':
      dividerElement = `
        <svg viewBox="0 0 1200 40" style="width: 100%; max-width: ${width}; height: ${Math.max(height * 20, 20)}px; margin: 0 auto; display: block;" preserveAspectRatio="none">
          <path d="M0,20 L60,5 L120,20 L180,5 L240,20 L300,5 L360,20 L420,5 L480,20 L540,5 L600,20 L660,5 L720,20 L780,5 L840,20 L900,5 L960,20 L1020,5 L1080,20 L1140,5 L1200,20" fill="none" stroke="${color}" stroke-width="${height}" />
        </svg>
      `;
      break;
    case 'line':
    default:
      dividerElement = `<div style="width: ${width}; height: ${height}px; background-color: ${color}; margin: 0 auto;"></div>`;
  }

  return `
    <section style="padding: ${spacing}px 24px;">
      <div style="max-width: 1200px; margin: 0 auto;">
        ${dividerElement}
      </div>
    </section>
  `;
}
