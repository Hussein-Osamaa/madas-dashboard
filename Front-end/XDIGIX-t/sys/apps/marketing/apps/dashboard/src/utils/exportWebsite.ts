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
        html = generateProductsHTML(section.data, siteId);
        break;
      case 'deals':
        html = generateDealsHTML(section.data);
        break;
      case 'collections':
        html = generateCollectionsHTML(section.data, siteId);
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
      case 'imageComparison':
        html = generateImageComparisonHTML(section.data);
        break;
      default:
        html = '';
    }
    
    // Don't wrap navbar and footer in section tags as they already return complete HTML
    if (section.type === 'navbar' || section.type === 'footer') {
      return html;
    }
    
    if (html && sectionStyle) {
      return `<section style="${sectionStyle}">${html}</section>`;
    }
    return html ? `<section>${html}</section>` : '';
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
    sticky = false,
    hoverBackgroundColor = "rgba(0,0,0,0.05)",
    hoverColor = "",
    hoverEffect = "underline"
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
  
  // Process link with collection support
  const processLink = (link: string, collectionId?: string): string => {
    if (collectionId && siteId) {
      return `${baseUrl}/products?collection=${collectionId}`;
    }
    if (link && !link.startsWith('http') && !link.startsWith('/site/') && siteId) {
      if (link === '/products' || link === 'products') return `${baseUrl}/products`;
      if (link === '/about' || link === 'about') return `${baseUrl}/about`;
      if (link === '/cart' || link === 'cart') return `${baseUrl}/cart`;
      if (link === '/favorites' || link === 'favorites') return `${baseUrl}/favorites`;
      if (link === '/login' || link === 'login') return `${baseUrl}/login`;
      if (link === '/register' || link === 'register') return `${baseUrl}/register`;
      if (link === '/') return baseUrl || '/';
      if (link.startsWith('/products?collection=')) return `${baseUrl}${link}`;
    }
    return link || '#';
  };
  
  // Default menu items with proper links
  const defaultMenuItems = menuItems.length === 0 
    ? [
        { label: 'Home', link: baseUrl || '#' },
        { label: 'Products', link: `${baseUrl}/products` },
        { label: 'About', link: `${baseUrl}/about` }
      ]
    : menuItems.map((item: any) => {
        if (typeof item === 'string') {
          return { label: item, link: '#' };
        }
        return {
          ...item,
          link: processLink(item.link, item.collectionId),
          dropdownItems: item.dropdownItems?.map((dropItem: any) => ({
            ...dropItem,
            link: processLink(dropItem.link, dropItem.collectionId)
          }))
        };
      });
  
  // Generate menu item HTML (supports dropdowns)
  const generateMenuItemHTML = (item: any, index: number): string => {
    const label = item.label || '';
    const link = item.link || '#';
    const badge = item.badge || '';
    const hasDropdown = item.type === 'dropdown' && item.dropdownItems && item.dropdownItems.length > 0;
    
    if (hasDropdown) {
      return `
        <div class="nav-dropdown" style="position: relative;">
          <button class="nav-dropdown-trigger" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: ${textColor}; background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px;">
            ${label}
            <span class="material-icons" style="font-size: 16px; transition: transform 0.2s;">expand_more</span>
            ${badge ? `<span style="position: absolute; top: -4px; right: -8px; background: var(--secondary-color); color: white; font-size: 10px; padding: 2px 6px; border-radius: 9999px;">${badge}</span>` : ''}
          </button>
          <div class="nav-dropdown-menu" style="display: none; position: absolute; top: 100%; left: 0; min-width: 200px; background: ${backgroundColor}; border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; padding: 8px 0; z-index: 100;">
            ${item.dropdownItems.map((dropItem: any) => `
              <a href="${dropItem.link}" style="display: block; padding: 10px 16px; font-size: 0.875rem; color: ${textColor}; text-decoration: none; transition: background 0.15s;">
                ${dropItem.collectionId ? '<span class="material-icons" style="font-size: 14px; opacity: 0.6; margin-right: 8px; vertical-align: middle;">category</span>' : ''}
                <span style="vertical-align: middle;">${dropItem.label}</span>
                ${dropItem.collectionName ? `<span style="display: block; font-size: 11px; opacity: 0.5; margin-top: 2px;">${dropItem.collectionName}</span>` : ''}
              </a>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    return `
      <a href="${link}" class="nav-link" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: ${textColor}; text-decoration: none; position: relative;">
        ${label}
        ${badge ? `<span style="position: absolute; top: -4px; right: -8px; background: var(--secondary-color); color: white; font-size: 10px; padding: 2px 6px; border-radius: 9999px;">${badge}</span>` : ''}
      </a>
    `;
  };

  // Generate mobile menu item HTML (supports dropdowns)
  const generateMobileMenuItemHTML = (item: any, index: number): string => {
    const label = item.label || '';
    const link = item.link || '#';
    const hasDropdown = item.type === 'dropdown' && item.dropdownItems && item.dropdownItems.length > 0;
    
    if (hasDropdown) {
      return `
        <div class="mobile-dropdown">
          <button class="mobile-dropdown-trigger" style="width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; font-size: 1rem; font-weight: 500; color: ${textColor}; background: none; border: none; cursor: pointer; border-radius: 8px; text-align: left;">
            <span>${label}</span>
            <span class="material-icons" style="font-size: 18px; transition: transform 0.2s;">expand_more</span>
          </button>
          <div class="mobile-dropdown-menu" style="display: none; padding-left: 1rem; background: rgba(0,0,0,0.02); border-radius: 8px; margin: 0 0.5rem;">
            ${item.dropdownItems.map((dropItem: any) => `
              <a href="${dropItem.link}" style="display: block; padding: 0.625rem 1rem; font-size: 0.875rem; color: ${textColor}; text-decoration: none; opacity: 0.9;">
                ${dropItem.collectionId ? '<span class="material-icons" style="font-size: 14px; opacity: 0.6; margin-right: 6px; vertical-align: middle;">category</span>' : ''}
                <span style="vertical-align: middle;">${dropItem.label}</span>
              </a>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    return `<a href="${link}" style="display: block; padding: 0.75rem 1rem; font-size: 1rem; font-weight: 500; color: ${textColor}; text-decoration: none; border-radius: 8px;">${label}</a>`;
  };
  
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
          <div class="desktop-menu" style="display: none; align-items: center; gap: 0.25rem; flex: 1; justify-content: center;">
            ${defaultMenuItems.map((item: any, index: number) => generateMenuItemHTML(item, index)).join('')}
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
              <a href="${baseUrl}/favorites" class="nav-icon-btn" style="position: relative; padding: 8px; border-radius: 8px; border: none; background: transparent; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center;">
                <span class="material-icons" style="color: ${textColor}; font-size: 18px;">favorite</span>
                ${actualWishlistCount > 0 ? `<span style="position: absolute; top: 0; right: 0; background: var(--secondary-color); color: white; font-size: 10px; width: 16px; height: 16px; border-radius: 9999px; display: flex; align-items: center; justify-content: center;">${actualWishlistCount > 9 ? '9+' : actualWishlistCount}</span>` : ''}
              </a>
            ` : ''}
            ${showCart ? `
              <a href="${baseUrl}/cart" class="nav-icon-btn" style="position: relative; padding: 8px; border-radius: 8px; border: none; background: transparent; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center;">
                <span class="material-icons" style="color: ${textColor}; font-size: 18px;">shopping_bag</span>
                ${actualCartCount > 0 ? `<span style="position: absolute; top: 0; right: 0; background: var(--primary-color); color: white; font-size: 10px; width: 16px; height: 16px; border-radius: 9999px; display: flex; align-items: center; justify-content: center;">${actualCartCount > 9 ? '9+' : actualCartCount}</span>` : ''}
              </a>
            ` : ''}
            ${showUserIcon ? `
              <a href="${baseUrl}/login" class="nav-icon-btn" style="position: relative; padding: 8px; border-radius: 8px; border: none; background: transparent; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center;">
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
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            ${defaultMenuItems.map((item: any, index: number) => generateMobileMenuItemHTML(item, index)).join('')}
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
        // Mobile menu toggle
        const toggle = document.getElementById('mobile-menu-toggle');
        const menu = document.getElementById('mobile-menu');
        if (toggle && menu) {
          toggle.addEventListener('click', function() {
            const isOpen = menu.style.display === 'flex';
            menu.style.display = isOpen ? 'none' : 'flex';
            toggle.querySelector('.material-icons').textContent = isOpen ? 'menu' : 'close';
          });
        }
        
        // Desktop dropdown menus
        document.querySelectorAll('.nav-dropdown').forEach(function(dropdown) {
          const trigger = dropdown.querySelector('.nav-dropdown-trigger');
          const dropdownMenu = dropdown.querySelector('.nav-dropdown-menu');
          
          dropdown.addEventListener('mouseenter', function() {
            dropdownMenu.style.display = 'block';
            trigger.querySelector('.material-icons').style.transform = 'rotate(180deg)';
          });
          
          dropdown.addEventListener('mouseleave', function() {
            dropdownMenu.style.display = 'none';
            trigger.querySelector('.material-icons').style.transform = 'rotate(0deg)';
          });
        });
        
        // Mobile dropdown menus
        document.querySelectorAll('.mobile-dropdown-trigger').forEach(function(trigger) {
          trigger.addEventListener('click', function() {
            const menu = this.nextElementSibling;
            const icon = this.querySelector('.material-icons');
            const isOpen = menu.style.display === 'block';
            menu.style.display = isOpen ? 'none' : 'block';
            icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
          });
        });
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
      .nav-dropdown-menu a:hover {
        background: rgba(0,0,0,0.05) !important;
      }
      
      /* Hover Effects CSS */
      :root {
        --hover-bg-color: ${hoverBackgroundColor || 'rgba(0,0,0,0.05)'};
        --hover-text-color: ${hoverColor || textColor};
      }
      
      /* Nav link base styles */
      .nav-link {
        position: relative;
        overflow: hidden;
        z-index: 1;
        transition: color 0.3s ease, transform 0.3s ease, background-color 0.3s ease;
        border-radius: 6px;
      }
      
      /* Default/None effect */
      \${!hoverEffect || hoverEffect === 'none' ? \`
      .nav-link:hover {
        color: \${hoverColor || textColor} !important;
      }
      \` : ''}
      
      /* Underline effect */
      \${hoverEffect === 'underline' ? \`
      .nav-link::after {
        content: '';
        position: absolute;
        bottom: 2px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 2px;
        background-color: \${hoverColor || textColor};
        transition: width 0.3s ease;
      }
      .nav-link:hover {
        color: \${hoverColor || textColor} !important;
      }
      .nav-link:hover::after {
        width: calc(100% - 0.5rem);
      }
      \` : ''}
      
      /* Slide effect */
      \${hoverEffect === 'slide' ? \`
      .nav-link::after {
        content: '';
        position: absolute;
        bottom: 2px;
        left: 0;
        width: 0;
        height: 2px;
        background-color: \${hoverColor || textColor};
        transition: width 0.3s ease;
      }
      .nav-link:hover {
        color: \${hoverColor || textColor} !important;
      }
      .nav-link:hover::after {
        width: 100%;
      }
      \` : ''}
      
      /* Highlight effect */
      \${hoverEffect === 'highlight' ? \`
      .nav-link:hover {
        background-color: \${hoverBackgroundColor || 'rgba(0,0,0,0.08)'} !important;
        color: \${hoverColor || textColor} !important;
      }
      \` : ''}
      
      /* Scale effect */
      \${hoverEffect === 'scale' ? \`
      .nav-link:hover {
        color: \${hoverColor || textColor} !important;
        transform: scale(1.08);
      }
      \` : ''}
      
      /* Glow effect */
      \${hoverEffect === 'glow' ? \`
      .nav-link:hover {
        color: \${hoverColor || textColor} !important;
        text-shadow: 0 0 8px \${hoverColor || textColor}, 0 0 16px \${hoverColor || textColor}50;
      }
      \` : ''}
      
      /* Fill effect */
      \${hoverEffect === 'fill' ? \`
      .nav-link::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 0;
        height: 100%;
        background: \${hoverBackgroundColor || 'rgba(0,0,0,0.1)'};
        transition: width 0.35s ease;
        z-index: -1;
        border-radius: 6px;
      }
      .nav-link:hover {
        color: \${hoverColor || textColor} !important;
      }
      .nav-link:hover::before {
        width: 100%;
      }
      \` : ''}
      
      /* Dropdown trigger hover */
      .nav-dropdown-trigger {
        transition: background-color 0.3s ease, color 0.3s ease;
        border-radius: 6px;
      }
      .nav-dropdown-trigger:hover {
        background-color: \${hoverBackgroundColor || 'rgba(0,0,0,0.05)'} !important;
        color: \${hoverColor || textColor} !important;
      }
      
      /* Dropdown menu item hover */
      .nav-dropdown-menu a:hover {
        background: \${hoverBackgroundColor || 'rgba(0,0,0,0.05)'} !important;
        color: \${hoverColor || textColor} !important;
        padding-left: 20px !important;
      }
      
      /* Icon button hover effects */
      .nav-icon-btn {
        position: relative;
        transition: all 0.3s ease;
      }
      .nav-icon-btn::before {
        content: '';
        position: absolute;
        inset: 0;
        background-color: ${hoverBackgroundColor || 'rgba(0,0,0,0.05)'};
        border-radius: 8px;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .nav-icon-btn:hover::before {
        opacity: 1;
      }
      .nav-icon-btn:hover {
        transform: translateY(-2px);
      }
      .nav-icon-btn:hover .material-icons {
        transform: scale(1.15);
        color: ${hoverColor || textColor} !important;
      }
      .nav-icon-btn .material-icons {
        position: relative;
        z-index: 1;
        transition: transform 0.3s ease, color 0.3s ease;
      }
    </style>
  `;
}

function generateHeroHTML(data: any, style?: any): string {
  const isMinimal = data.layout === 'minimal';
  const bgSize = data.backgroundSize || 'cover';
  const bgPosition = data.backgroundPosition || 'center';
  const backgroundStyle = data.backgroundImage 
    ? `background-image: url(${data.backgroundImage}); background-size: ${bgSize}; background-position: ${bgPosition}; background-repeat: no-repeat;`
    : `background: ${data.backgroundColor || '#27491F'};`;
  
  const overlayStyle = data.backgroundImage && data.backgroundColor && !isMinimal
    ? `position: absolute; inset: 0; background-color: ${data.backgroundColor}; opacity: 0.4;`
    : '';
  
  const textStyle = data.textStyle || {};
  const titleStyle = `font-size: ${textStyle.titleFontSize || 48}px; font-weight: ${textStyle.titleFontWeight || 'bold'}; text-align: ${textStyle.titleAlignment || 'center'};`;
  const subtitleStyle = `font-size: ${textStyle.subtitleFontSize || 20}px; font-weight: ${textStyle.subtitleFontWeight || 'normal'}; text-align: ${textStyle.subtitleAlignment || 'center'};`;
  const buttonStyle = textStyle.buttonStyle || {};
  const buttonVariant = buttonStyle.variant || (isMinimal ? 'outlined' : 'filled');
  
  // Generate button styles based on variant
  const getButtonStyleString = (btnStyle: any, textColor: string, bgColor: string) => {
    const baseStyles = `
      display: inline-block; 
      padding: ${btnStyle.padding || (isMinimal ? '16px 40px' : '12px 32px')}; 
      border-radius: ${btnStyle.borderRadius || 0}px; 
      text-decoration: none; 
      font-weight: ${btnStyle.fontWeight || '500'}; 
      font-size: ${btnStyle.fontSize || (isMinimal ? 14 : 16)}px;
      ${isMinimal ? 'letter-spacing: 0.1em; text-transform: uppercase;' : ''}
      transition: all 0.3s ease;
    `;
    
    if (isMinimal || buttonVariant === 'outlined' || buttonVariant === 'ghost') {
      return `${baseStyles} background: transparent; color: ${btnStyle.textColor || textColor || '#FFFFFF'}; border: 1px solid ${btnStyle.textColor || textColor || '#FFFFFF'};`;
    }
    return `${baseStyles} background: ${btnStyle.backgroundColor || 'white'}; color: ${btnStyle.textColor || bgColor || '#27491F'}; border: none; box-shadow: 0 4px 6px rgba(0,0,0,0.1);`;
  };
  
  // Handle carousel
  if (data.isCarousel && data.slides && data.slides.length > 0) {
    const globalTextStyle = data.textStyle || {};
    const slidesHTML = data.slides.map((slide: any, index: number) => {
      const slideBgSize = slide.backgroundSize || data.backgroundSize || 'cover';
      const slideBgPosition = slide.backgroundPosition || data.backgroundPosition || 'center';
      const slideBgStyle = slide.backgroundImage 
        ? `background-image: url(${slide.backgroundImage}); background-size: ${slideBgSize}; background-position: ${slideBgPosition}; background-repeat: no-repeat;`
        : `background: ${slide.backgroundColor || '#27491F'};`;
      const slideOverlayStyle = slide.backgroundImage && slide.backgroundColor && !isMinimal
        ? `position: absolute; inset: 0; background-color: ${slide.backgroundColor}; opacity: 0.4;`
        : '';
      // Fall back to global textStyle if slide doesn't have its own
      const slideTextStyle = slide.textStyle || globalTextStyle;
      const titleFontSize = slideTextStyle.titleFontSize || globalTextStyle.titleFontSize || 48;
      const titleFontWeight = slideTextStyle.titleFontWeight || globalTextStyle.titleFontWeight || 'bold';
      const subtitleFontSize = slideTextStyle.subtitleFontSize || globalTextStyle.subtitleFontSize || 20;
      const subtitleFontWeight = slideTextStyle.subtitleFontWeight || globalTextStyle.subtitleFontWeight || 'normal';
      const slideTitleStyle = `font-size: ${titleFontSize}px; font-weight: ${titleFontWeight}; text-align: ${slideTextStyle.titleAlignment || globalTextStyle.titleAlignment || 'center'};`;
      const slideSubtitleStyle = `font-size: ${subtitleFontSize}px; font-weight: ${subtitleFontWeight}; text-align: ${slideTextStyle.subtitleAlignment || globalTextStyle.subtitleAlignment || 'center'};`;
      
      const slideButtonStyle = slideTextStyle.buttonStyle || globalTextStyle.buttonStyle || {};
      const slideButtonStyleString = getButtonStyleString(slideButtonStyle, slide.textColor || '#FFFFFF', slide.backgroundColor || '#27491F');
      
      return `
        <style>
          .hero-slide-${index} .hero-title, .hero-slide-${index} .hero-title * { font-size: ${titleFontSize}px !important; font-weight: ${titleFontWeight} !important; line-height: 1.1 !important; }
          .hero-slide-${index} .hero-subtitle, .hero-slide-${index} .hero-subtitle * { font-size: ${subtitleFontSize}px !important; font-weight: ${subtitleFontWeight} !important; }
        </style>
        <div class="hero-slide hero-slide-${index}" data-slide="${index}" style="position: relative; ${isMinimal ? 'min-height: 100vh;' : 'min-height: 500px;'} ${slideBgStyle}; display: ${index === 0 ? 'flex' : 'none'}; align-items: center; justify-content: center; padding: ${isMinimal ? '0 20px' : '80px 20px'};">
          ${slideOverlayStyle ? `<div style="${slideOverlayStyle}"></div>` : ''}
          <div style="position: relative; z-index: 10; width: 100%; max-width: 1200px; margin: 0 auto; text-align: center; padding: 0 20px;">
            ${!isMinimal ? `<h1 class="hero-title" style="${slideTitleStyle}; color: ${slide.textColor || '#FFFFFF'}; margin-bottom: 1rem; white-space: pre-line; line-height: 1.1;">${slide.title || 'Welcome'}</h1>` : ''}
            ${!isMinimal ? `<p class="hero-subtitle" style="${slideSubtitleStyle}; color: ${slide.textColor || '#FFFFFF'}; margin-bottom: 2rem; opacity: 0.9; white-space: pre-line;">${slide.subtitle || ''}</p>` : ''}
            ${slide.buttonText ? `<a href="${slide.buttonLink || '#'}" class="hero-btn" style="${slideButtonStyleString}">${slide.buttonText || 'Explore Collection'}</a>` : ''}
          </div>
        </div>
      `;
    }).join('');
    
    // Navigation styles based on layout
    const navButtonStyle = isMinimal 
      ? 'position: absolute; bottom: 2rem; background: transparent; border: none; cursor: pointer; z-index: 20; padding: 0.5rem;'
      : 'position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.9); border: none; border-radius: 50%; width: 48px; height: 48px; cursor: pointer; z-index: 20; display: flex; align-items: center; justify-content: center;';
    
    const navIconStyle = isMinimal
      ? 'color: rgba(255,255,255,0.7); font-size: 24px;'
      : 'color: var(--primary-color);';
    
    return `
      <style>
        .hero-btn:hover { ${isMinimal ? 'background: rgba(255,255,255,0.1) !important;' : 'opacity: 0.9;'} }
      </style>
      <section class="hero-section" style="position: relative; ${backgroundStyle}; color: ${data.textColor || '#FFFFFF'}; ${isMinimal ? 'min-height: 100vh;' : 'min-height: 500px;'}">
        ${slidesHTML}
        ${data.slides.length > 1 ? `
          <button class="hero-prev" style="${navButtonStyle} ${isMinimal ? 'left: 1rem;' : 'left: 1rem;'}">
            <span class="material-icons" style="${navIconStyle}">chevron_left</span>
          </button>
          <button class="hero-next" style="${navButtonStyle} ${isMinimal ? 'right: 1rem;' : 'right: 1rem;'}">
            <span class="material-icons" style="${navIconStyle}">chevron_right</span>
          </button>
          <div style="position: absolute; bottom: ${isMinimal ? '2rem' : '1rem'}; left: 50%; transform: translateX(-50%); display: flex; gap: 0.5rem; z-index: 20;">
            ${data.slides.map((_: any, i: number) => `
              <button class="hero-dot" data-slide="${i}" style="width: ${isMinimal ? '8px' : (i === 0 ? '32px' : '8px')}; height: 8px; border-radius: 9999px; border: none; background: ${i === 0 ? (isMinimal ? 'white' : 'var(--primary-color)') : (isMinimal ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.5)')}; cursor: pointer; transition: all 0.3s;"></button>
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
            const isMinimal = ${isMinimal};
            
            function showSlide(index) {
              slides.forEach((s, i) => {
                s.style.display = i === index ? 'flex' : 'none';
              });
              dots.forEach((d, i) => {
                if (isMinimal) {
                  d.style.background = i === index ? 'white' : 'rgba(255,255,255,0.4)';
                } else {
                d.style.width = i === index ? '32px' : '8px';
                d.style.background = i === index ? 'var(--primary-color)' : 'rgba(255,255,255,0.5)';
                }
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
  
  const titleFontSize = textStyle.titleFontSize || 48;
  const titleFontWeight = textStyle.titleFontWeight || 'bold';
  const subtitleFontSize = textStyle.subtitleFontSize || 20;
  const subtitleFontWeight = textStyle.subtitleFontWeight || 'normal';
  const singleButtonStyleString = getButtonStyleString(buttonStyle, data.textColor || '#FFFFFF', data.backgroundColor || '#27491F');
  
  return `
    <style>
      .hero-section .hero-title, .hero-section .hero-title * { font-size: ${titleFontSize}px !important; font-weight: ${titleFontWeight} !important; line-height: 1.1 !important; }
      .hero-section .hero-subtitle, .hero-section .hero-subtitle * { font-size: ${subtitleFontSize}px !important; font-weight: ${subtitleFontWeight} !important; }
      .hero-btn:hover { ${isMinimal ? 'background: rgba(255,255,255,0.1) !important;' : 'opacity: 0.9;'} }
    </style>
    <section class="hero-section" style="position: relative; ${backgroundStyle}; color: ${data.textColor || '#FFFFFF'}; ${isMinimal ? 'min-height: 100vh;' : 'padding: 80px 20px; min-height: 500px;'} text-align: center; display: flex; align-items: center; justify-content: center;">
      ${overlayStyle ? `<div style="${overlayStyle}"></div>` : ''}
      <div style="position: relative; z-index: 10; width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 20px;">
        ${!isMinimal ? `<h1 class="hero-title" style="${titleStyle}; color: ${data.textColor || '#FFFFFF'}; margin-bottom: 1rem; white-space: pre-line; line-height: 1.1;">${data.title || 'Welcome'}</h1>` : ''}
        ${!isMinimal ? `<p class="hero-subtitle" style="${subtitleStyle}; color: ${data.textColor || '#FFFFFF'}; margin-bottom: 2rem; opacity: 0.9; white-space: pre-line;">${data.subtitle || ''}</p>` : ''}
        ${data.buttonText ? `<a href="${data.buttonLink || '#'}" class="hero-btn" style="${singleButtonStyleString}">${data.buttonText || (isMinimal ? 'Explore Collection' : 'Get Started')}</a>` : ''}
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

function generateProductsHTML(data: any, siteId?: string): string {
  const selectedProducts = data.selectedProducts || [];
  const showPrice = data.showPrice !== false;
  const showAddToCart = data.showAddToCart !== false;
  const layout = data.layout || 'grid';
  const columns = data.columns || 4;
  const baseUrl = siteId ? `/site/${siteId}` : '';
  
  // Title styling
  const titleStyle = data.titleStyle || {};
  const subtitleStyle = data.subtitleStyle || {};
  const titleCss = `
    font-size: ${titleStyle.fontSize || '2.5rem'};
    font-weight: ${titleStyle.fontWeight || '700'};
    color: ${titleStyle.color || 'inherit'};
    text-align: ${titleStyle.textAlign || 'center'};
    margin-bottom: 1rem;
  `;
  const subtitleCss = `
    font-size: ${subtitleStyle.fontSize || '1rem'};
    color: ${subtitleStyle.color || '#666'};
    text-align: ${titleStyle.textAlign || 'center'};
    margin-bottom: 3rem;
  `;
  
  // Card styling with defaults
  const cs = {
    backgroundColor: data.cardStyle?.backgroundColor || '#ffffff',
    textColor: data.cardStyle?.textColor || '#1f2937',
    priceColor: data.cardStyle?.priceColor || '#6b7280',
    borderRadius: data.cardStyle?.borderRadius ?? 12,
    shadow: data.cardStyle?.shadow || 'md',
    imageAspect: data.cardStyle?.imageAspect || 'square',
    imageFit: data.cardStyle?.imageFit || 'cover',
    imageBackgroundColor: data.cardStyle?.imageBackgroundColor || '#f3f4f6',
    buttonBackgroundColor: data.cardStyle?.buttonBackgroundColor || '#27491F',
    buttonTextColor: data.cardStyle?.buttonTextColor || '#ffffff',
    buttonBorderRadius: data.cardStyle?.buttonBorderRadius ?? 8,
    showBorder: data.cardStyle?.showBorder !== false,
    borderColor: data.cardStyle?.borderColor || '#e5e7eb'
  };

  // Shadow mapping
  const shadowMap: Record<string, string> = {
    none: 'none',
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
    lg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
    xl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
  };

  // Aspect ratio mapping
  const aspectMap: Record<string, string> = {
    square: 'aspect-ratio: 1/1;',
    portrait: 'aspect-ratio: 3/4;',
    landscape: 'aspect-ratio: 4/3;'
  };

  // Grid columns CSS
  const gridColumnsCSS = layout === 'grid' 
    ? columns === 2 ? 'repeat(2, 1fr)' 
    : columns === 3 ? 'repeat(3, 1fr)'
    : 'repeat(4, 1fr)'
    : '1fr';

  // If no products selected, show placeholder
  if (selectedProducts.length === 0) {
  return `
      <section style="padding: 60px 20px;">
      <div style="max-width: 1200px; margin: 0 auto;">
          <h2 style="${titleCss}">${data.title || 'Products'}</h2>
          ${data.subtitle ? `<p style="${subtitleCss}">${data.subtitle}</p>` : ''}
          <div style="text-align: center; padding: 60px 20px; border: 2px dashed rgba(0,0,0,0.2); border-radius: 12px;">
            <p style="opacity: 0.6;">No products selected</p>
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section style="padding: 60px 20px;">
      <div style="max-width: 1200px; margin: 0 auto;">
        <h2 style="${titleCss}">${data.title || 'Products'}</h2>
        ${data.subtitle ? `<p style="${subtitleCss}">${data.subtitle}</p>` : ''}
        <div style="display: grid; grid-template-columns: ${gridColumnsCSS}; gap: 1.5rem;">
          ${selectedProducts.map((product: any) => `
            <a href="${baseUrl}/product/${product.id}" style="
              display: block;
              text-decoration: none;
              color: inherit;
              background: ${cs.backgroundColor}; 
              border-radius: ${cs.borderRadius}px; 
              overflow: hidden; 
              box-shadow: ${shadowMap[cs.shadow] || shadowMap.md};
              ${cs.showBorder ? `border: 1px solid ${cs.borderColor};` : ''}
              transition: all 0.3s ease;
            " onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 20px 25px -5px rgba(0,0,0,0.1)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='${shadowMap[cs.shadow] || shadowMap.md}';">
              <div style="${aspectMap[cs.imageAspect] || aspectMap.square} background: ${cs.imageBackgroundColor || '#f3f4f6'}; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                ${product.image 
                  ? `<img src="${product.image}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: ${cs.imageFit}; transition: transform 0.3s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">`
                  : `<span class="material-icons" style="font-size: 4rem; color: rgba(0,0,0,0.2);">image</span>`
                }
              </div>
              <div style="padding: 1.5rem;">
                <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem; color: ${cs.textColor}; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${product.name}</h3>
                ${showPrice ? `<p style="color: ${cs.priceColor}; margin-bottom: 1rem; font-weight: 500;">$${product.sellingPrice || product.price}</p>` : ''}
                ${showAddToCart ? `<button onclick="event.preventDefault(); event.stopPropagation();" style="
                  ${cs.buttonFullWidth !== false ? 'width: 100%;' : 'padding-left: 1rem; padding-right: 1rem;'} 
                  padding: 0.75rem; 
                  background: ${cs.buttonBackgroundColor}; 
                  color: ${cs.buttonTextColor}; 
                  border: none; 
                  border-radius: ${cs.buttonBorderRadius}px; 
                  font-weight: 600; 
                  cursor: pointer;
                  transition: opacity 0.3s ease;
                " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">Add to Cart</button>` : ''}
              </div>
            </a>
          `).join('')}
        </div>
      </div>
    </section>
    <style>
      @media (max-width: 1024px) {
        .products-grid { grid-template-columns: repeat(2, 1fr) !important; }
      }
      @media (max-width: 640px) {
        .products-grid { grid-template-columns: 1fr !important; }
      }
    </style>
  `;
}

function generateDealsHTML(data: any): string {
  const {
    title = 'DEAL OF THE DAY',
    viewMoreText = '',
    viewMoreLink = '#',
    selectedProducts = [],
    columns = 4,
    showCountdown = false,
    countdownEndDate = '',
    countdownStyle = {}
  } = data;

  // Countdown styling with defaults
  const ctStyle = {
    backgroundColor: countdownStyle?.backgroundColor || '#1f2937',
    textColor: countdownStyle?.textColor || '#ffffff',
    labelColor: countdownStyle?.labelColor || '#9ca3af',
    borderRadius: countdownStyle?.borderRadius ?? 8,
    style: countdownStyle?.style || 'modern'
  };

  // Generate unique ID for this countdown
  const countdownId = 'countdown_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  // Card styling with defaults
  const cs = {
    backgroundColor: data.cardStyle?.backgroundColor || '#ffffff',
    textColor: data.cardStyle?.textColor || '#1f2937',
    descriptionColor: data.cardStyle?.descriptionColor || '#6b7280',
    priceColor: data.cardStyle?.priceColor || '#1f2937',
    borderRadius: data.cardStyle?.borderRadius ?? 8,
    showBorder: data.cardStyle?.showBorder !== false,
    borderColor: data.cardStyle?.borderColor || '#e5e7eb',
    imageBackgroundColor: data.cardStyle?.imageBackgroundColor || '#f3f4f6',
    imageFit: data.cardStyle?.imageFit || 'cover',
    buttonBackgroundColor: data.cardStyle?.buttonBackgroundColor || '#F0CAE1',
    buttonTextColor: data.cardStyle?.buttonTextColor || '#27491F',
    buttonBorderRadius: data.cardStyle?.buttonBorderRadius ?? 6
  };

  // Grid columns CSS
  const gridColumnsCSS = columns === 2 ? 'repeat(2, 1fr)' 
    : columns === 3 ? 'repeat(3, 1fr)'
    : 'repeat(4, 1fr)';

  // Placeholder products if none selected
  const placeholderProducts = [
    { id: '1', name: 'Classic Platform', price: 129, description: 'Bold floral pattern with attitude' },
    { id: '2', name: 'Retro High-Tops', price: 89, description: 'Timeless design with modern edge' },
    { id: '3', name: 'Performance Boost', price: 159, description: 'Innovation meets street style' },
    { id: '4', name: 'Premium Collection', price: 199, description: 'Elevated style with bold presence' }
  ];

  const productsToShow = selectedProducts.length > 0 ? selectedProducts : placeholderProducts;

  return `
    <section style="padding: 60px 20px;">
      <div style="max-width: 1400px; margin: 0 auto;">
        <!-- Header -->
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px;">
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 16px;">
            <h2 style="font-size: 1.75rem; font-weight: bold; font-style: italic; letter-spacing: 0.05em; margin: 0;">${title}</h2>
            
            ${showCountdown && countdownEndDate ? `
              <!-- Countdown Timer -->
              <style>
                @keyframes countdown-pulse {
                  0%, 100% { opacity: 1; transform: scale(1); }
                  50% { opacity: 0.8; transform: scale(1.02); }
                }
                .countdown-urgent { animation: countdown-pulse 1s ease-in-out infinite; }
                .countdown-box { 
                  min-width: 48px; height: 48px; 
                  display: flex; align-items: center; justify-content: center;
                  background: rgba(255,255,255,0.1);
                  border-radius: 8px;
                  transition: all 0.3s ease;
                }
                @media (max-width: 640px) {
                  .countdown-box { min-width: 40px; height: 40px; }
                }
              </style>
              <div id="${countdownId}" class="countdown-container" style="
                display: flex;
                align-items: center;
                gap: ${ctStyle.style === 'minimal' ? '4px' : '8px'};
                padding: ${ctStyle.style === 'minimal' ? '6px 12px' : '10px 16px'};
                background: ${ctStyle.style === 'minimal' ? 'transparent' : ctStyle.backgroundColor};
                border-radius: ${ctStyle.borderRadius}px;
                ${ctStyle.style === 'minimal' ? 'border: 1px solid ' + ctStyle.textColor + '30;' : ''}
              ">
                ${ctStyle.style !== 'minimal' ? '<span class="material-icons countdown-icon" style="font-size: 18px; color: ' + ctStyle.textColor + ';">timer</span>' : ''}
                <div style="display: flex; align-items: center; gap: ${ctStyle.style === 'boxed' ? '8px' : '4px'}; font-family: ui-monospace, monospace;">
                  ${ctStyle.style === 'boxed' ? `
                    <div style="text-align: center;">
                      <div class="countdown-box" style="background: ${ctStyle.textColor}15; color: ${ctStyle.textColor};">
                        <span class="countdown-days" style="font-weight: bold; font-size: 1.25rem;">00</span>
                      </div>
                      <span style="display: block; font-size: 9px; color: ${ctStyle.labelColor}; text-transform: uppercase; margin-top: 4px;">Days</span>
                    </div>
                    <span style="color: ${ctStyle.textColor}; font-weight: bold; font-size: 1.25rem; align-self: flex-start; margin-top: 12px;">:</span>
                    <div style="text-align: center;">
                      <div class="countdown-box" style="background: ${ctStyle.textColor}15; color: ${ctStyle.textColor};">
                        <span class="countdown-hours" style="font-weight: bold; font-size: 1.25rem;">00</span>
                      </div>
                      <span style="display: block; font-size: 9px; color: ${ctStyle.labelColor}; text-transform: uppercase; margin-top: 4px;">Hrs</span>
                    </div>
                    <span style="color: ${ctStyle.textColor}; font-weight: bold; font-size: 1.25rem; align-self: flex-start; margin-top: 12px;">:</span>
                    <div style="text-align: center;">
                      <div class="countdown-box" style="background: ${ctStyle.textColor}15; color: ${ctStyle.textColor};">
                        <span class="countdown-minutes" style="font-weight: bold; font-size: 1.25rem;">00</span>
                      </div>
                      <span style="display: block; font-size: 9px; color: ${ctStyle.labelColor}; text-transform: uppercase; margin-top: 4px;">Min</span>
                    </div>
                    <span style="color: ${ctStyle.textColor}; font-weight: bold; font-size: 1.25rem; align-self: flex-start; margin-top: 12px;">:</span>
                    <div style="text-align: center;">
                      <div class="countdown-box" style="background: ${ctStyle.textColor}15; color: ${ctStyle.textColor};">
                        <span class="countdown-seconds" style="font-weight: bold; font-size: 1.25rem;">00</span>
                      </div>
                      <span style="display: block; font-size: 9px; color: ${ctStyle.labelColor}; text-transform: uppercase; margin-top: 4px;">Sec</span>
                    </div>
                  ` : ctStyle.style === 'minimal' ? `
                    <span class="countdown-days" style="font-weight: bold; font-size: 1.125rem; color: ${ctStyle.textColor};">00</span>
                    <span style="font-size: 10px; color: ${ctStyle.labelColor}; text-transform: uppercase;">d</span>
                    <span style="color: ${ctStyle.textColor}; opacity: 0.5; margin: 0 2px;">·</span>
                    <span class="countdown-hours" style="font-weight: bold; font-size: 1.125rem; color: ${ctStyle.textColor};">00</span>
                    <span style="font-size: 10px; color: ${ctStyle.labelColor}; text-transform: uppercase;">h</span>
                    <span style="color: ${ctStyle.textColor}; opacity: 0.5; margin: 0 2px;">·</span>
                    <span class="countdown-minutes" style="font-weight: bold; font-size: 1.125rem; color: ${ctStyle.textColor};">00</span>
                    <span style="font-size: 10px; color: ${ctStyle.labelColor}; text-transform: uppercase;">m</span>
                    <span style="color: ${ctStyle.textColor}; opacity: 0.5; margin: 0 2px;">·</span>
                    <span class="countdown-seconds" style="font-weight: bold; font-size: 1.125rem; color: ${ctStyle.textColor};">00</span>
                    <span style="font-size: 10px; color: ${ctStyle.labelColor}; text-transform: uppercase;">s</span>
                  ` : `
                    <div style="text-align: center; min-width: 36px;">
                      <span class="countdown-days" style="font-weight: bold; font-size: 1.25rem; color: ${ctStyle.textColor};">00</span>
                      <span style="display: block; font-size: 9px; color: ${ctStyle.labelColor}; text-transform: uppercase; letter-spacing: 0.05em;">Days</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px; padding: 0 4px;">
                      <div style="width: 4px; height: 4px; border-radius: 50%; background: ${ctStyle.textColor}; opacity: 0.6;"></div>
                      <div style="width: 4px; height: 4px; border-radius: 50%; background: ${ctStyle.textColor}; opacity: 0.6;"></div>
                    </div>
                    <div style="text-align: center; min-width: 36px;">
                      <span class="countdown-hours" style="font-weight: bold; font-size: 1.25rem; color: ${ctStyle.textColor};">00</span>
                      <span style="display: block; font-size: 9px; color: ${ctStyle.labelColor}; text-transform: uppercase; letter-spacing: 0.05em;">Hrs</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px; padding: 0 4px;">
                      <div style="width: 4px; height: 4px; border-radius: 50%; background: ${ctStyle.textColor}; opacity: 0.6;"></div>
                      <div style="width: 4px; height: 4px; border-radius: 50%; background: ${ctStyle.textColor}; opacity: 0.6;"></div>
                    </div>
                    <div style="text-align: center; min-width: 36px;">
                      <span class="countdown-minutes" style="font-weight: bold; font-size: 1.25rem; color: ${ctStyle.textColor};">00</span>
                      <span style="display: block; font-size: 9px; color: ${ctStyle.labelColor}; text-transform: uppercase; letter-spacing: 0.05em;">Min</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px; padding: 0 4px;">
                      <div style="width: 4px; height: 4px; border-radius: 50%; background: ${ctStyle.textColor}; opacity: 0.6;"></div>
                      <div style="width: 4px; height: 4px; border-radius: 50%; background: ${ctStyle.textColor}; opacity: 0.6;"></div>
                    </div>
                    <div style="text-align: center; min-width: 36px;">
                      <span class="countdown-seconds" style="font-weight: bold; font-size: 1.25rem; color: ${ctStyle.textColor};">00</span>
                      <span style="display: block; font-size: 9px; color: ${ctStyle.labelColor}; text-transform: uppercase; letter-spacing: 0.05em;">Sec</span>
                    </div>
                  `}
                </div>
              </div>
              <script>
                (function() {
                  var endDate = new Date('${countdownEndDate}').getTime();
                  var container = document.getElementById('${countdownId}');
                  if (!container) return;
                  
                  function updateCountdown() {
                    var now = new Date().getTime();
                    var diff = endDate - now;
                    
                    if (diff <= 0) {
                      container.querySelector('.countdown-days').textContent = '00';
                      container.querySelector('.countdown-hours').textContent = '00';
                      container.querySelector('.countdown-minutes').textContent = '00';
                      container.querySelector('.countdown-seconds').textContent = '00';
                      return;
                    }
                    
                    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    var seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    
                    container.querySelector('.countdown-days').textContent = days.toString().padStart(2, '0');
                    container.querySelector('.countdown-hours').textContent = hours.toString().padStart(2, '0');
                    container.querySelector('.countdown-minutes').textContent = minutes.toString().padStart(2, '0');
                    container.querySelector('.countdown-seconds').textContent = seconds.toString().padStart(2, '0');
                  }
                  
                  updateCountdown();
                  setInterval(updateCountdown, 1000);
                  
                  // Check for urgency (less than 1 hour)
                  function checkUrgency() {
                    var now = new Date().getTime();
                    var diff = endDate - now;
                    var icon = container.querySelector('.countdown-icon');
                    if (diff < 3600000 && diff > 0) {
                      container.classList.add('countdown-urgent');
                      if (icon) icon.textContent = 'warning';
                      container.style.background = '${ctStyle.style === 'minimal' ? 'transparent' : '#dc2626'}';
                    }
                  }
                  checkUrgency();
                  setInterval(checkUrgency, 60000);
                })();
              </script>
            ` : ''}
          </div>
          
          ${viewMoreText && viewMoreText.trim() ? `
            <a href="${viewMoreLink || '#'}" style="
              padding: 8px 16px;
              background: #1f2937;
              color: white;
              border-radius: 4px;
              text-decoration: none;
              font-size: 0.75rem;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            ">${viewMoreText}</a>
          ` : ''}
        </div>
        
        <!-- Divider -->
        <div style="border-top: 1px solid #d1d5db; margin-bottom: 32px;"></div>
        
        <!-- Products Grid -->
        <div class="deals-grid" style="display: grid; grid-template-columns: ${gridColumnsCSS}; gap: 24px;">
          ${productsToShow.map((product: any) => `
            <div class="deal-card" style="
              background: ${cs.backgroundColor};
              border-radius: ${cs.borderRadius}px;
              overflow: hidden;
              ${cs.showBorder ? `border: 1px solid ${cs.borderColor};` : ''}
              transition: all 0.3s ease;
            ">
              <div style="aspect-ratio: 1/1; background: ${cs.imageBackgroundColor || '#f3f4f6'}; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                ${product.image 
                  ? `<img src="${product.image}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: ${cs.imageFit}; transition: transform 0.3s ease;">`
                  : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                      <span class="material-icons" style="font-size: 4rem; color: rgba(0,0,0,0.2);">image</span>
                    </div>`
                }
              </div>
              <div style="padding: 16px;">
                <h3 style="font-size: 1rem; font-weight: 600; margin: 0 0 4px 0; color: ${cs.textColor}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${product.name}</h3>
                <p style="font-size: 0.875rem; color: ${cs.descriptionColor}; margin: 0 0 12px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${product.description || 'Premium quality product'}</p>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span style="font-size: 1rem; font-weight: 600; color: ${cs.priceColor};">$${product.sellingPrice || product.price}</span>
                  <button style="
                    padding: 6px 12px;
                    background: ${cs.buttonBackgroundColor};
                    color: ${cs.buttonTextColor};
                    border: none;
                    border-radius: ${cs.buttonBorderRadius}px;
                    font-size: 0.75rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: opacity 0.3s ease;
                  ">Add to Cart</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
    <style>
      .deal-card:hover { transform: translateY(-4px); box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
      .deal-card:hover img { transform: scale(1.05); }
      .deal-card button:hover { opacity: 0.9; }
      @media (max-width: 1024px) {
        .deals-grid { grid-template-columns: repeat(2, 1fr) !important; }
      }
      @media (max-width: 640px) {
        .deals-grid { grid-template-columns: 1fr !important; }
      }
    </style>
  `;
}

function generateCollectionsHTML(data: any, siteId?: string): string {
  const {
    title = 'Shop by Collection',
    subtitle = 'Browse our curated collections',
    layout = 'grid',
    columns = 4,
    selectedCollections = []
  } = data;

  const baseUrl = siteId ? `/site/${siteId}` : '';

  // Title styling
  const titleStyle = data.titleStyle || {};
  const subtitleStyle = data.subtitleStyle || {};
  const titleCss = `
    font-size: ${titleStyle.fontSize || '2.5rem'};
    font-weight: ${titleStyle.fontWeight || '700'};
    color: ${titleStyle.color || 'inherit'};
    text-align: ${titleStyle.textAlign || 'center'};
    margin-bottom: 1rem;
  `;
  const subtitleCss = `
    font-size: ${subtitleStyle.fontSize || '1rem'};
    color: ${subtitleStyle.color || '#666'};
    text-align: ${titleStyle.textAlign || 'center'};
    margin-bottom: 3rem;
  `;

  // Card styling with defaults
  const cs = {
    backgroundColor: data.cardStyle?.backgroundColor || '#ffffff',
    textColor: data.cardStyle?.textColor || '#1f2937',
    borderRadius: data.cardStyle?.borderRadius ?? 16,
    showBorder: data.cardStyle?.showBorder || false,
    borderColor: data.cardStyle?.borderColor || '#e5e7eb',
    imageAspect: data.cardStyle?.imageAspect || 'square',
    imageFit: data.cardStyle?.imageFit || 'cover',
    overlayColor: data.cardStyle?.overlayColor || '#000000',
    overlayOpacity: data.cardStyle?.overlayOpacity ?? 0.4,
    showName: data.cardStyle?.showName !== false,
    showDescription: data.cardStyle?.showDescription || false,
    showProductCount: data.cardStyle?.showProductCount !== false,
    namePosition: data.cardStyle?.namePosition || 'overlay',
    // Button styling
    showButton: data.cardStyle?.showButton !== false,
    buttonText: data.cardStyle?.buttonText || 'EXPLORE COLLECTION',
    buttonBackgroundColor: data.cardStyle?.buttonBackgroundColor || 'rgba(255,255,255,0.2)',
    buttonTextColor: data.cardStyle?.buttonTextColor || '#ffffff',
    buttonBorderRadius: data.cardStyle?.buttonBorderRadius ?? 4,
    buttonHoverBackgroundColor: data.cardStyle?.buttonHoverBackgroundColor || '#ffffff',
    buttonHoverTextColor: data.cardStyle?.buttonHoverTextColor || '#1f2937',
    buttonHoverEffect: data.cardStyle?.buttonHoverEffect || 'fill'
  };

  // Aspect ratio mapping
  const aspectMap: Record<string, string> = {
    square: 'aspect-ratio: 1/1;',
    portrait: 'aspect-ratio: 3/4;',
    landscape: 'aspect-ratio: 4/3;',
    wide: 'aspect-ratio: 16/9;'
  };

  // Grid columns CSS
  const gridColumnsCSS = 
    columns === 2 ? 'repeat(2, 1fr)' :
    columns === 3 ? 'repeat(3, 1fr)' :
    columns === 5 ? 'repeat(5, 1fr)' :
    columns === 6 ? 'repeat(6, 1fr)' :
    'repeat(4, 1fr)';

  // Placeholder collections if none selected
  const placeholderCollections = [
    { id: '1', name: 'New Arrivals', image: '', productCount: 24 },
    { id: '2', name: 'Best Sellers', image: '', productCount: 18 },
    { id: '3', name: 'Summer Collection', image: '', productCount: 32 },
    { id: '4', name: 'Sale', image: '', productCount: 45 }
  ];

  const collectionsToShow = selectedCollections.length > 0 ? selectedCollections : placeholderCollections;

  const renderCollectionCard = (collection: any, index: number) => {
    const collectionLink = collection.id ? `${baseUrl}/products?collection=${collection.id}` : '#';
    
    return `
      <a href="${collectionLink}" class="collection-card" style="
        display: block;
        text-decoration: none;
        background: ${cs.backgroundColor};
        border-radius: ${cs.borderRadius}px;
        overflow: hidden;
        ${cs.showBorder ? `border: 1px solid ${cs.borderColor};` : ''}
        transition: all 0.3s ease;
      ">
        <div style="position: relative; ${aspectMap[cs.imageAspect] || aspectMap.square} overflow: hidden;">
          ${collection.image 
            ? `<img src="${collection.image}" alt="${collection.name}" style="width: 100%; height: 100%; object-fit: ${cs.imageFit}; transition: transform 0.5s ease;">`
            : `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, #27491F 0%, #F0CAE1 100%); display: flex; align-items: center; justify-content: center;">
                <span class="material-icons" style="font-size: 4rem; color: rgba(255,255,255,0.5);">collections</span>
              </div>`
          }
          ${cs.namePosition === 'overlay' ? `
            <div style="position: absolute; inset: 0; background: ${cs.overlayColor}; opacity: ${cs.overlayOpacity}; transition: opacity 0.3s ease;"></div>
            <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 1rem;">
              ${cs.showName ? `<h3 style="font-size: 1.5rem; font-weight: bold; color: white; margin-bottom: 0.5rem; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${collection.name}</h3>` : ''}
              ${cs.showDescription && collection.description ? `<p style="font-size: 0.875rem; color: rgba(255,255,255,0.8); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${collection.description}</p>` : ''}
              ${cs.showProductCount && collection.productCount !== undefined ? `<span style="font-size: 0.875rem; color: rgba(255,255,255,0.7); margin-top: 0.5rem; margin-bottom: 0.75rem;">${collection.productCount} Products</span>` : ''}
              ${cs.showButton && cs.buttonText ? `
                <button class="collection-btn-${index}" style="
                  margin-top: 0.75rem;
                  padding: 0.5rem 1.5rem;
                  font-size: 0.75rem;
                  font-weight: 600;
                  text-transform: uppercase;
                  letter-spacing: 0.05em;
                  background-color: ${cs.buttonBackgroundColor};
                  color: ${cs.buttonTextColor};
                  border: 1px solid rgba(255,255,255,0.3);
                  border-radius: ${cs.buttonBorderRadius}px;
                  cursor: pointer;
                  transition: all 0.3s ease;
                  position: relative;
                  overflow: hidden;
                ">${cs.buttonText}</button>
              ` : ''}
            </div>
          ` : ''}
        </div>
        ${cs.namePosition === 'below' ? `
          <div style="padding: 1rem;">
            ${cs.showName ? `<h3 style="font-size: 1.125rem; font-weight: 600; color: ${cs.textColor}; margin-bottom: 0.25rem;">${collection.name}</h3>` : ''}
            ${cs.showDescription && collection.description ? `<p style="font-size: 0.875rem; color: ${cs.textColor}; opacity: 0.7; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${collection.description}</p>` : ''}
            ${cs.showProductCount && collection.productCount !== undefined ? `<span style="font-size: 0.875rem; color: ${cs.textColor}; opacity: 0.6;">${collection.productCount} Products</span>` : ''}
          </div>
        ` : ''}
      </a>
    `;
  };

  // Grid Layout
  return `
    <section style="padding: 60px 20px;">
      <div style="max-width: 1400px; margin: 0 auto;">
        <div style="margin-bottom: 3rem; text-align: ${titleStyle.textAlign || 'center'};">
          <h2 style="${titleCss}">${title}</h2>
          ${subtitle ? `<p style="${subtitleCss}">${subtitle}</p>` : ''}
        </div>
        <div class="collections-grid" style="display: grid; grid-template-columns: ${gridColumnsCSS}; gap: 24px;">
          ${collectionsToShow.map((collection: any, i: number) => renderCollectionCard(collection, i)).join('')}
        </div>
      </div>
    </section>
    <style>
      .collection-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
      .collection-card:hover img { transform: scale(1.1); }
      .collection-card:hover div[style*="opacity: ${cs.overlayOpacity}"] { opacity: ${Math.max(0, cs.overlayOpacity - 0.1)} !important; }
      
      /* Button hover effects */
      ${cs.buttonHoverEffect === 'fill' ? `
      .collection-btn-0::before, .collection-btn-1::before, .collection-btn-2::before, .collection-btn-3::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 0%;
        height: 100%;
        background-color: ${cs.buttonHoverBackgroundColor};
        transition: width 0.3s ease;
        z-index: -1;
      }
      .collection-btn-0:hover::before, .collection-btn-1:hover::before, .collection-btn-2:hover::before, .collection-btn-3:hover::before {
        width: 100%;
      }
      [class^="collection-btn"]:hover {
        color: ${cs.buttonHoverTextColor} !important;
        border-color: ${cs.buttonHoverBackgroundColor} !important;
      }
      ` : cs.buttonHoverEffect === 'scale' ? `
      [class^="collection-btn"]:hover {
        transform: scale(1.05);
        background-color: ${cs.buttonHoverBackgroundColor} !important;
        color: ${cs.buttonHoverTextColor} !important;
      }
      ` : cs.buttonHoverEffect === 'glow' ? `
      [class^="collection-btn"]:hover {
        box-shadow: 0 0 20px ${cs.buttonHoverBackgroundColor}80, 0 0 40px ${cs.buttonHoverBackgroundColor}40;
        background-color: ${cs.buttonHoverBackgroundColor} !important;
        color: ${cs.buttonHoverTextColor} !important;
      }
      ` : `
      [class^="collection-btn"]:hover {
        background-color: ${cs.buttonHoverBackgroundColor} !important;
        color: ${cs.buttonHoverTextColor} !important;
      }
      `}
      
      @media (max-width: 1024px) {
        .collections-grid { grid-template-columns: repeat(3, 1fr) !important; }
      }
      @media (max-width: 768px) {
        .collections-grid { grid-template-columns: repeat(2, 1fr) !important; }
      }
    </style>
  `;
}

function generateImageComparisonHTML(data: any): string {
  const {
    title = '',
    subtitle = '',
    beforeImage = '',
    afterImage = '',
    beforeLabel = 'Before',
    afterLabel = 'After',
    sliderPosition = 50,
    sliderColor = '#FFFFFF',
    showLabels = true,
    orientation = 'horizontal'
  } = data || {};

  const hasImages = beforeImage && afterImage;
  const comparisonId = `img-compare-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const placeholderContent = `
    <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(39, 73, 31, 0.2) 0%, rgba(240, 202, 225, 0.1) 50%, rgba(39, 73, 31, 0.2) 100%);">
      <div style="text-align: center;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 16px;">
          <div style="width: 96px; height: 96px; background: rgba(39, 73, 31, 0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 32px;">🖼️</span>
          </div>
          <div style="width: 3px; height: 128px; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.3); border-radius: 4px;"></div>
          <div style="width: 96px; height: 96px; background: rgba(240, 202, 225, 0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 32px;">🖼️</span>
          </div>
        </div>
        <p style="font-size: 14px; color: rgba(51, 51, 51, 0.6);">Add before and after images to compare</p>
      </div>
    </div>
  `;

  const comparisonContent = hasImages ? `
    <!-- After Image (Right side - full background) -->
    <div style="position: absolute; inset: 0;">
      <img src="${afterImage}" alt="${afterLabel}" style="width: 100%; height: 100%; object-fit: cover;" draggable="false" />
    </div>
    
    <!-- Before Image (Left side - using clip-path for clean clipping) -->
    <div id="${comparisonId}-before" style="position: absolute; inset: 0; ${orientation === 'horizontal' ? `clip-path: inset(0 ${100 - sliderPosition}% 0 0);` : `clip-path: inset(0 0 ${100 - sliderPosition}% 0);`}">
      <img src="${beforeImage}" alt="${beforeLabel}" style="width: 100%; height: 100%; object-fit: cover;" draggable="false" />
    </div>
    
    <!-- Slider Line -->
    <div id="${comparisonId}-line" style="position: absolute; ${orientation === 'horizontal' ? `top: 0; bottom: 0; width: 2px; left: ${sliderPosition}%; transform: translateX(-50%);` : `left: 0; right: 0; height: 2px; top: ${sliderPosition}%; transform: translateY(-50%);`} background-color: ${sliderColor}; box-shadow: 0 0 8px rgba(0,0,0,0.4);"></div>
    
    <!-- Small Circular Handle -->
    <div id="${comparisonId}-handle" style="position: absolute; ${orientation === 'horizontal' ? `left: ${sliderPosition}%; top: 50%; transform: translate(-50%, -50%);` : `top: ${sliderPosition}%; left: 50%; transform: translate(-50%, -50%);`} width: 32px; height: 32px; border-radius: 50%; background-color: ${sliderColor}; border: 2px solid rgba(0,0,0,0.2); box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; cursor: grab; z-index: 10;">
      <span style="color: #666; font-size: 14px;">${orientation === 'horizontal' ? '↔' : '↕'}</span>
    </div>
    
    ${showLabels ? `
    <!-- Labels -->
    <div style="position: absolute; bottom: 16px; left: 16px; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; background-color: rgba(0,0,0,0.6); color: white; backdrop-filter: blur(4px); z-index: 5;">${beforeLabel}</div>
    <div style="position: absolute; bottom: 16px; right: 16px; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; background-color: rgba(0,0,0,0.6); color: white; backdrop-filter: blur(4px); z-index: 5;">${afterLabel}</div>
    ` : ''}
  ` : placeholderContent;

  const script = hasImages ? `
    <script>
    (function() {
      var container = document.getElementById('${comparisonId}');
      var beforeDiv = document.getElementById('${comparisonId}-before');
      var line = document.getElementById('${comparisonId}-line');
      var handle = document.getElementById('${comparisonId}-handle');
      var orientation = '${orientation}';
      var isDragging = false;

      function updatePosition(percentage) {
        if (orientation === 'horizontal') {
          beforeDiv.style.clipPath = 'inset(0 ' + (100 - percentage) + '% 0 0)';
          line.style.left = percentage + '%';
          handle.style.left = percentage + '%';
        } else {
          beforeDiv.style.clipPath = 'inset(0 0 ' + (100 - percentage) + '% 0)';
          line.style.top = percentage + '%';
          handle.style.top = percentage + '%';
        }
      }

      function getPercentage(e) {
        var rect = container.getBoundingClientRect();
        var pos = orientation === 'horizontal' 
          ? (e.clientX - rect.left) / rect.width * 100
          : (e.clientY - rect.top) / rect.height * 100;
        return Math.max(0, Math.min(100, pos));
      }

      container.addEventListener('mousedown', function(e) {
        isDragging = true;
        handle.style.cursor = 'grabbing';
        updatePosition(getPercentage(e));
      });

      document.addEventListener('mousemove', function(e) {
        if (isDragging) {
          updatePosition(getPercentage(e));
        }
      });

      document.addEventListener('mouseup', function() {
        isDragging = false;
        handle.style.cursor = 'grab';
      });

      container.addEventListener('touchstart', function(e) {
        isDragging = true;
        updatePosition(getPercentage(e.touches[0]));
      });

      container.addEventListener('touchmove', function(e) {
        if (isDragging) {
          e.preventDefault();
          updatePosition(getPercentage(e.touches[0]));
        }
      });

      container.addEventListener('touchend', function() {
        isDragging = false;
      });
    })();
    </script>
  ` : '';

  return `
    <section style="padding: 60px 20px;">
      <div style="max-width: 1200px; margin: 0 auto;">
        ${title ? `<h2 style="text-align: center; font-size: 2.5rem; font-weight: bold; margin-bottom: 1rem; color: var(--primary-color);">${title}</h2>` : ''}
        ${subtitle ? `<p style="text-align: center; color: #666; margin-bottom: 2rem;">${subtitle}</p>` : ''}
        <div id="${comparisonId}" style="position: relative; width: 100%; aspect-ratio: 4/5; max-width: 800px; margin: 0 auto; border-radius: 12px; overflow: hidden; cursor: ew-resize; user-select: none;">
          ${comparisonContent}
        </div>
      </div>
    </section>
    ${script}
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
  const bgColor = data.backgroundColor || '#27491F';
  const buttonBgColor = data.buttonBackgroundColor || '#ffffff';
  const buttonTextColor = data.buttonTextColor || bgColor;
  
  return `
    <section style="padding: 80px 20px; background: ${bgColor}; color: white; text-align: center;">
      <div style="max-width: 800px; margin: 0 auto;">
        <h2 style="font-size: 2.5rem; font-weight: bold; margin-bottom: 1rem;">${data.title || 'Get Started'}</h2>
        ${data.subtitle ? `<p style="font-size: 1.25rem; margin-bottom: 2rem; opacity: 0.9;">${data.subtitle}</p>` : ''}
        <a href="${data.buttonLink || '#'}" style="display: inline-block; padding: 12px 32px; background: ${buttonBgColor}; color: ${buttonTextColor}; border-radius: 8px; text-decoration: none; font-weight: 600; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">${data.buttonText || 'Get Started'}</a>
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
    layout = 'classic',
    logoText = 'BRAND',
    logo = '',
    tagline = 'Sign up for exclusive offers and be the first to know about new arrivals.',
    copyrightText = '© 2024 Brand. All rights reserved.',
    columns = [],
    policyLinks = [],
    socialLinks = [],
    socialIconBackgroundColor = '#1f2937',
    socialIconHoverBackgroundColor = '#27491F',
    showNewsletter = false,
    newsletterText = 'Subscribe to our newsletter',
    newsletterPlaceholder = 'Email address'
  } = data;
  
  const isMinimal = layout === 'minimal';
  const bgColor = style?.backgroundColor || (isMinimal ? '#ffffff' : '#111827');
  const textColor = style?.color || (isMinimal ? '#1f2937' : '#ffffff');
  const mutedTextColor = isMinimal ? '#9ca3af' : '#9ca3af';
  const linkColor = isMinimal ? '#6b7280' : '#9ca3af';
  const borderColor = isMinimal ? '#e5e7eb' : '#374151';
  
  const defaultColumns = columns.length === 0 ? [
    { title: 'Company', links: [{ label: 'About Us', link: '#' }, { label: 'Contact', link: '#' }, { label: 'Careers', link: '#' }] },
    { title: 'Support', links: [{ label: 'Help Center', link: '#' }, { label: 'Privacy Policy', link: '#' }, { label: 'Terms of Service', link: '#' }] },
    { title: 'Connect', links: [{ label: 'Facebook', link: '#' }, { label: 'Twitter', link: '#' }, { label: 'Instagram', link: '#' }] }
  ] : columns;
  
  const defaultPolicyLinks = policyLinks.length === 0 ? [
    { label: 'Privacy policy', link: '#' },
    { label: 'Refund policy', link: '#' },
    { label: 'Contact information', link: '#' },
    { label: 'Terms of service', link: '#' },
    { label: 'Shipping policy', link: '#' }
  ] : policyLinks;
  
  const defaultSocialLinks = socialLinks.length === 0 ? [
    { platform: 'Facebook', icon: 'facebook', link: '#' },
    { platform: 'Instagram', icon: 'camera_alt', link: '#' },
    { platform: 'TikTok', icon: 'music_note', link: '#' }
  ] : socialLinks;
  
  // Generate social icon SVGs
  const getSocialIconSVG = (platform: string, color: string) => {
    switch (platform) {
      case 'Facebook':
        return `<svg width="20" height="20" fill="${color}" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;
      case 'Instagram':
        return `<svg width="20" height="20" fill="${color}" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`;
      case 'TikTok':
        return `<svg width="20" height="20" fill="${color}" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>`;
      case 'Twitter':
        return `<svg width="20" height="20" fill="${color}" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
      case 'LinkedIn':
        return `<svg width="20" height="20" fill="${color}" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`;
      case 'YouTube':
        return `<svg width="20" height="20" fill="${color}" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;
      default:
        return `<span class="material-icons" style="font-size: 20px;">${data.icon || 'link'}</span>`;
    }
  };

  // Minimal Layout
  if (isMinimal) {
  return `
      <footer style="background-color: ${bgColor}; width: 100%;">
        <div style="border-top: 1px solid ${borderColor};"></div>
        <div style="max-width: 1280px; margin: 0 auto; padding: 48px 24px;">
          <div class="footer-main" style="display: flex; flex-direction: column; gap: 32px;">
            <!-- Left Side - Brand & Tagline -->
            <div style="max-width: 400px;">
              ${logo ? 
                `<img src="${logo}" alt="${logoText}" style="height: 32px; margin-bottom: 16px;" />` :
                `<h3 style="font-size: 1.75rem; font-weight: bold; margin-bottom: 16px; color: ${textColor};">${logoText}</h3>`
              }
              <p style="font-size: 0.875rem; line-height: 1.6; color: ${mutedTextColor};">${tagline}</p>
            </div>

            <!-- Right Side - Newsletter -->
            <div style="flex: 1; max-width: 500px;">
              <form style="display: flex; align-items: center;" onsubmit="event.preventDefault();">
                <input type="email" placeholder="${newsletterPlaceholder}" style="flex: 1; padding: 12px 16px; border: 1px solid ${borderColor}; border-radius: 8px 0 0 8px; font-size: 0.875rem; color: ${textColor}; background: transparent; outline: none;" />
                <button type="submit" style="padding: 12px 16px; border: 1px solid ${borderColor}; border-left: none; border-radius: 0 8px 8px 0; background: transparent; cursor: pointer; display: flex; align-items: center;">
                  <svg width="20" height="20" fill="${textColor}" viewBox="0 0 24 24"><path d="M5 12h14m-7-7l7 7-7 7" stroke="${textColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
                </button>
              </form>
            </div>
          </div>
        </div>

        <!-- Bottom Bar -->
        <div style="border-top: 1px solid ${borderColor};">
          <div style="max-width: 1280px; margin: 0 auto; padding: 24px;">
            <div class="footer-bottom" style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
              <!-- Left - Copyright & Policy Links -->
              <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 16px; font-size: 0.75rem;">
                <span style="color: ${mutedTextColor};">${copyrightText}</span>
                ${defaultPolicyLinks.map((link: any) => `
                  <a href="${link.link || '#'}" style="color: ${mutedTextColor}; text-decoration: none; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">${link.label}</a>
                `).join('')}
              </div>

              <!-- Right - Social Icons -->
              ${defaultSocialLinks.length > 0 ? `
                <div style="display: flex; align-items: center; gap: 16px;">
                  ${defaultSocialLinks.map((social: any) => `
                    <a href="${social.link || '#'}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
                      ${getSocialIconSVG(social.platform, textColor)}
                    </a>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </footer>
      
      <!-- Back to Top Button -->
      <button id="backToTop" onclick="window.scrollTo({top: 0, behavior: 'smooth'})" style="position: fixed; bottom: 24px; right: 24px; width: 48px; height: 48px; border-radius: 50%; background: ${bgColor}; border: 1px solid ${borderColor}; color: ${textColor}; cursor: pointer; display: none; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.3s ease; z-index: 1000;" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 20px rgba(0,0,0,0.2)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';">
        <span class="material-icons">keyboard_arrow_up</span>
      </button>
      <script>
        (function() {
          var backToTop = document.getElementById('backToTop');
          if (backToTop) {
            window.addEventListener('scroll', function() {
              if (window.scrollY > 300) {
                backToTop.style.display = 'flex';
              } else {
                backToTop.style.display = 'none';
              }
            });
          }
        })();
      </script>
      
      <style>
        @media (min-width: 1024px) {
          .footer-main {
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
          }
          .footer-bottom {
            flex-direction: row !important;
            justify-content: space-between !important;
          }
          .footer-bottom > div:first-child {
            justify-content: flex-start !important;
          }
        }
      </style>
    `;
  }

  // Classic Layout
  return `
    <footer style="background-color: ${bgColor}; color: ${textColor}; width: 100%; padding: 48px 24px;">
      <div style="max-width: 1152px; margin: 0 auto;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 32px; margin-bottom: 48px;">
          <!-- Logo/Brand Column -->
          <div>
            ${logo ? 
              `<img src="${logo}" alt="${logoText}" style="height: 32px; margin-bottom: 1rem;" />` :
              `<h3 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: ${textColor};">${logoText}</h3>`
            }
            <p style="font-size: 0.875rem; color: ${mutedTextColor}; margin-bottom: 1rem;">
              ${tagline}
            </p>
            ${defaultSocialLinks.length > 0 ? `
              <div style="display: flex; gap: 0.75rem;">
                ${defaultSocialLinks.map((social: any) => `
                  <a href="${social.link}" target="_blank" rel="noopener noreferrer" style="width: 36px; height: 36px; border-radius: 50%; background: ${socialIconBackgroundColor}; display: flex; align-items: center; justify-content: center; text-decoration: none; transition: background 0.3s;" onmouseover="this.style.background='${socialIconHoverBackgroundColor}'" onmouseout="this.style.background='${socialIconBackgroundColor}'">
                    <span class="material-icons" style="color: ${textColor}; font-size: 18px;">${social.icon || 'link'}</span>
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
        <div style="padding-top: 24px; border-top: 1px solid ${borderColor};">
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
    
    <!-- Back to Top Button -->
    <button id="backToTop" onclick="window.scrollTo({top: 0, behavior: 'smooth'})" style="position: fixed; bottom: 24px; right: 24px; width: 48px; height: 48px; border-radius: 50%; background: ${bgColor}; border: 1px solid ${borderColor}; color: ${textColor}; cursor: pointer; display: none; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.3s ease; z-index: 1000;" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 20px rgba(0,0,0,0.2)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';">
      <span class="material-icons">keyboard_arrow_up</span>
    </button>
    <script>
      (function() {
        var backToTop = document.getElementById('backToTop');
        if (backToTop) {
          window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
              backToTop.style.display = 'flex';
            } else {
              backToTop.style.display = 'none';
            }
          });
        }
      })();
    </script>
    
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
    dismissible = false,
    enableMarquee = false,
    marqueeSpeed = 20
  } = data;

  const bannerId = `banner_${Date.now()}`;

  // Create a single marquee item
  const marqueeItem = `
    <span class="marquee-item-${bannerId}">
      ${icon ? `<span class="icon">${icon}</span>` : ''}
      <span class="text">${text}</span>
      <span class="separator">✦</span>
    </span>
  `;

  // Repeat the item 12 times (6 for visible, 6 for seamless loop)
  const marqueeItems = Array(12).fill(marqueeItem).join('');

  const marqueeStyles = enableMarquee ? `
    <style>
      @keyframes marquee-${bannerId} {
        from { transform: translateX(0); }
        to { transform: translateX(-50%); }
      }
      .marquee-wrap-${bannerId} {
        width: 100%;
        overflow: hidden;
      }
      .marquee-track-${bannerId} {
        display: flex;
        width: fit-content;
        animation: marquee-${bannerId} ${marqueeSpeed}s linear infinite;
      }
      .marquee-track-${bannerId}:hover {
        animation-play-state: paused;
      }
      .marquee-item-${bannerId} {
        display: inline-flex;
        align-items: center;
        padding: 0 1rem;
        white-space: nowrap;
      }
      .marquee-item-${bannerId} .icon {
        font-size: 1rem;
        margin-right: 0.75rem;
      }
      .marquee-item-${bannerId} .text {
        font-size: 0.75rem;
        font-weight: 500;
        color: ${textColor};
      }
      .marquee-item-${bannerId} .separator {
        margin-left: 2rem;
        opacity: 0.5;
        color: ${textColor};
      }
      @media (min-width: 640px) {
        .marquee-item-${bannerId} .icon { font-size: 1.25rem; }
        .marquee-item-${bannerId} .text { font-size: 0.875rem; }
      }
    </style>
  ` : '';

  const marqueeContent = enableMarquee ? `
    <div class="marquee-wrap-${bannerId}">
      <div class="marquee-track-${bannerId}">
        ${marqueeItems}
      </div>
    </div>
  ` : `
    ${icon ? `<span style="font-size: 1.25rem;">${icon}</span>` : ''}
    <p style="font-size: 0.875rem; font-weight: 500; color: ${textColor}; text-align: center; margin: 0;">${text}</p>
    ${link ? `
      <a href="${link}" style="display: inline-flex; align-items: center; gap: 0.25rem; padding: 6px 16px; border-radius: 9999px; background: ${textColor}; color: ${backgroundColor}; font-size: 0.75rem; font-weight: 600; text-decoration: none;">
        ${linkText}
        <span class="material-icons" style="font-size: 14px;">arrow_forward</span>
      </a>
    ` : ''}
  `;

  return `
    ${marqueeStyles}
    <section id="${bannerId}" style="padding: 12px 24px; background: ${backgroundColor}; position: relative; overflow: hidden;">
      <div style="${enableMarquee ? 'width: 100%;' : 'max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: center; gap: 1rem;'}">
        ${marqueeContent}
        ${dismissible && !enableMarquee ? `
          <button onclick="document.getElementById('${bannerId}').style.display='none'" style="position: absolute; right: 16px; padding: 4px; border-radius: 50%; background: transparent; border: none; cursor: pointer; z-index: 10;">
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
