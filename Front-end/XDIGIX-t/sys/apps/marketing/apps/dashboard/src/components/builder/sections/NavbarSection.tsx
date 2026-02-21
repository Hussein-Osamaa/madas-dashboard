import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { NavbarSectionData, NavbarMenuItem } from '../../../types/builder';

type Props = {
  data: NavbarSectionData;
  style?: React.CSSProperties;
  siteId?: string;
};

const NavbarSection = ({ data, style, siteId: propSiteId }: Props) => {
  const { siteId: paramSiteId } = useParams<{ siteId?: string }>();
  const [searchParams] = useSearchParams();
  const querySiteId = searchParams.get('siteId');
  
  const siteId = propSiteId || paramSiteId || querySiteId || undefined;
  
  const [cartCount, setCartCount] = useState(data.cartCount || 0);
  const [wishlistCount, setWishlistCount] = useState(data.wishlistCount || 0);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  
  const {
    logo = '',
    logoText = 'MADAS',
    menuItems = [],
    showSearch = true,
    searchPlaceholder = 'Search products...',
    showCart = true,
    cartUrl = '',
    showWishlist = true,
    wishlistUrl = '',
    showUserIcon = true,
    userIconUrl = '',
    backgroundColor = '#FFFFFF',
    textColor = '#27491F',
    sticky = false,
    hoverBackgroundColor = 'rgba(0,0,0,0.05)',
    hoverColor = '',
    hoverEffect = 'underline'
  } = data;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileOpenDropdown, setMobileOpenDropdown] = useState<number | null>(null);

  useEffect(() => {
    if (siteId) {
      try {
        const savedCart = localStorage.getItem(`cart_${siteId}`);
        if (savedCart) {
          const items = JSON.parse(savedCart);
          const count = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
          setCartCount(count);
        }
      } catch (e) {}

      try {
        const savedFavorites = localStorage.getItem(`favorites_${siteId}`);
        if (savedFavorites) {
          const items = JSON.parse(savedFavorites);
          setWishlistCount(items.length);
        }
      } catch (e) {}
    }
  }, [siteId]);

  const baseUrl = siteId ? `/site/${siteId}` : '#';
  const defaultCartUrl = cartUrl || (siteId ? `${baseUrl}/cart` : '#');
  const defaultWishlistUrl = wishlistUrl || (siteId ? `${baseUrl}/favorites` : '#');
  const defaultUserIconUrl = userIconUrl || (siteId ? `${baseUrl}/profile` : '#');
  
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
      if (link === '/') return baseUrl;
      if (link.startsWith('/products?collection=')) return `${baseUrl}${link}`;
    }
    return link || '#';
  };
  
  const processedMenuItems: NavbarMenuItem[] = data.menuItems.length === 0 
    ? [
        { label: 'Home', link: baseUrl },
        { label: 'Products', link: `${baseUrl}/products` },
        { label: 'About', link: `${baseUrl}/about` }
      ]
    : data.menuItems.map((item) => ({
        ...item,
        link: processLink(item.link, item.collectionId),
        dropdownItems: item.dropdownItems?.map((dropItem) => ({
          ...dropItem,
          link: processLink(dropItem.link, dropItem.collectionId)
        }))
      }));

  // Generate CSS based on hover effect
  const getHoverCSS = () => {
    const hc = hoverColor || textColor;
    const hbg = hoverBackgroundColor || 'rgba(0,0,0,0.08)';
    
    // Base styles for all nav links
    let baseCSS = `
      .nav-link-builder {
        position: relative;
        overflow: hidden;
        transition: color 0.3s ease, transform 0.3s ease, background-color 0.3s ease;
        border-radius: 6px;
        z-index: 1;
      }
    `;
    
    let effectCSS = '';
    
    switch (hoverEffect) {
      case 'underline':
        effectCSS = `
          .nav-link-builder::after {
            content: '';
            position: absolute;
            bottom: 2px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 2px;
            background-color: ${hc};
            transition: width 0.3s ease;
          }
          .nav-link-builder:hover {
            color: ${hc} !important;
          }
          .nav-link-builder:hover::after {
            width: calc(100% - 0.5rem);
          }
        `;
        break;
      case 'slide':
        effectCSS = `
          .nav-link-builder::after {
            content: '';
            position: absolute;
            bottom: 2px;
            left: 0;
            width: 0;
            height: 2px;
            background-color: ${hc};
            transition: width 0.3s ease;
          }
          .nav-link-builder:hover {
            color: ${hc} !important;
          }
          .nav-link-builder:hover::after {
            width: 100%;
          }
        `;
        break;
      case 'highlight':
        effectCSS = `
          .nav-link-builder:hover {
            background-color: ${hbg} !important;
            color: ${hc} !important;
          }
        `;
        break;
      case 'scale':
        effectCSS = `
          .nav-link-builder:hover {
            transform: scale(1.08);
            color: ${hc} !important;
          }
        `;
        break;
      case 'glow':
        effectCSS = `
          .nav-link-builder:hover {
            color: ${hc} !important;
            text-shadow: 0 0 8px ${hc}80, 0 0 16px ${hc}40;
          }
        `;
        break;
      case 'fill':
        effectCSS = `
          .nav-link-builder::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 0;
            height: 100%;
            background-color: ${hbg};
            border-radius: 6px;
            transition: width 0.35s ease;
            z-index: -1;
          }
          .nav-link-builder:hover::before {
            width: 100%;
          }
          .nav-link-builder:hover {
            color: ${hc} !important;
          }
        `;
        break;
      default:
        effectCSS = `
          .nav-link-builder:hover {
            color: ${hc} !important;
          }
        `;
    }
    
    return `
      ${baseCSS}
      ${effectCSS}
      .nav-icon-btn-builder {
        position: relative;
        transition: transform 0.3s ease, background-color 0.3s ease;
        border-radius: 8px;
      }
      .nav-icon-btn-builder:hover {
        transform: translateY(-2px);
        background-color: ${hbg};
      }
      .nav-icon-btn-builder:hover .material-icons {
        color: ${hc} !important;
      }
      .nav-dropdown-trigger-builder {
        transition: background-color 0.3s ease, color 0.3s ease;
        border-radius: 6px;
      }
      .nav-dropdown-trigger-builder:hover {
        background-color: ${hbg} !important;
        color: ${hc} !important;
      }
      .nav-dropdown-menu-builder a:hover {
        background: ${hbg} !important;
        color: ${hc} !important;
        padding-left: 20px !important;
      }
    `;
  };

  return (
    <nav
      className={`w-full transition-all duration-300 ${sticky ? 'sticky top-0 z-50' : ''}`}
      style={{ backgroundColor, color: textColor, ...style }}
    >
      <style key={`hover-${hoverEffect}`}>{getHoverCSS()}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <a href={baseUrl} className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0" style={{ textDecoration: 'none' }}>
            {logo ? (
              <img src={logo} alt={logoText} className="h-8 sm:h-10 w-auto" />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm sm:text-base">{logoText.charAt(0)}</span>
              </div>
            )}
            <span className="text-lg sm:text-xl md:text-2xl font-bold" style={{ color: textColor }}>
              {logoText}
            </span>
          </a>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-1 xl:space-x-2 flex-1 justify-center">
            {processedMenuItems.map((item, index) => (
              <div
                key={index}
                className="relative"
                onMouseEnter={() => item.type === 'dropdown' && item.dropdownItems?.length ? setOpenDropdown(index) : null}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                {item.type === 'dropdown' && item.dropdownItems && item.dropdownItems.length > 0 ? (
                  <>
                    <button
                      type="button"
                      className="nav-dropdown-trigger-builder px-3 xl:px-4 py-2 text-sm xl:text-base font-medium transition-opacity relative flex items-center gap-1 rounded-lg"
                      style={{ color: textColor }}
                    >
                      {item.label}
                      <span className="material-icons text-sm transition-transform duration-200" style={{ transform: openDropdown === index ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        expand_more
                      </span>
                      {item.badge && (
                        <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] px-1.5 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </button>
                    {openDropdown === index && (
                      <div
                        className="absolute top-full left-0 mt-1 min-w-[200px] rounded-lg shadow-xl border overflow-hidden z-50"
                        style={{ backgroundColor, borderColor: 'rgba(0,0,0,0.1)' }}
                      >
                        {item.dropdownItems.map((dropItem, dropIndex) => (
                          <a
                            key={dropIndex}
                            href={dropItem.link || '#'}
                            className="block px-4 py-3 text-sm hover:bg-black/5 transition-colors"
                            style={{ color: textColor }}
                          >
                            {dropItem.collectionId && (
                              <span className="material-icons text-xs mr-2 opacity-50">category</span>
                            )}
                            {dropItem.label}
                            {dropItem.collectionName && (
                              <span className="block text-xs opacity-50 mt-0.5">{dropItem.collectionName}</span>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <a
                    href={item.link || '#'}
                    className="nav-link-builder px-3 xl:px-4 py-2 text-sm xl:text-base font-medium relative"
                    style={{ color: textColor }}
                  >
                    {item.label}
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {showSearch && (
              <div className="hidden lg:flex items-center relative">
                <span className="material-icons absolute left-3 text-gray-400" style={{ fontSize: '18px' }}>search</span>
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-sm rounded-lg border bg-transparent"
                  style={{ borderColor: 'rgba(0,0,0,0.1)', color: textColor, width: '160px' }}
                />
              </div>
            )}
            
            {showWishlist && (
              <a
                href={defaultWishlistUrl}
                className="nav-icon-btn-builder relative p-2 rounded-lg"
                style={{ color: textColor }}
              >
                <span className="material-icons" style={{ fontSize: '20px' }}>favorite_border</span>
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </span>
                )}
              </a>
            )}
            
            {showCart && (
              <a
                href={defaultCartUrl}
                className="nav-icon-btn-builder relative p-2 rounded-lg"
                style={{ color: textColor }}
              >
                <span className="material-icons" style={{ fontSize: '20px' }}>shopping_bag</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </a>
            )}
            
            {showUserIcon && (
              <a
                href={defaultUserIconUrl}
                className="nav-icon-btn-builder p-2 rounded-lg"
                style={{ color: textColor }}
              >
                <span className="material-icons" style={{ fontSize: '20px' }}>person_outline</span>
              </a>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-black/5 transition-colors"
              style={{ color: textColor }}
            >
              <span className="material-icons">{isMobileMenuOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
            <div className="flex flex-col gap-1">
              {processedMenuItems.map((item, index) => (
                <div key={index}>
                  {item.type === 'dropdown' && item.dropdownItems && item.dropdownItems.length > 0 ? (
                    <div>
                      <button
                        onClick={() => setMobileOpenDropdown(mobileOpenDropdown === index ? null : index)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-black/5 transition-colors"
                        style={{ color: textColor }}
                      >
                        <span className="font-medium">{item.label}</span>
                        <span className="material-icons text-sm transition-transform duration-200" style={{ transform: mobileOpenDropdown === index ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          expand_more
                        </span>
                      </button>
                      {mobileOpenDropdown === index && (
                        <div className="pl-4 py-2 bg-black/5 rounded-lg mx-2">
                          {item.dropdownItems.map((dropItem, dropIndex) => (
                            <a
                              key={dropIndex}
                              href={dropItem.link || '#'}
                              className="block px-4 py-2 text-sm hover:bg-black/5 rounded transition-colors"
                              style={{ color: textColor }}
                            >
                              {dropItem.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <a
                      href={item.link || '#'}
                      className="block px-4 py-3 font-medium rounded-lg hover:bg-black/5 transition-colors"
                      style={{ color: textColor }}
                    >
                      {item.label}
                    </a>
                  )}
                </div>
              ))}
            </div>
            
            {showSearch && (
              <div className="mt-4 px-4">
                <div className="relative">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: '18px' }}>search</span>
                  <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border"
                    style={{ borderColor: 'rgba(0,0,0,0.1)', backgroundColor: 'transparent', color: textColor }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavbarSection;
