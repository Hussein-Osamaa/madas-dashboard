import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { NavbarSectionData, NavbarMenuItem } from '../../../types/builder';
import { useTheme } from '../../../contexts/ThemeContext';

type Props = {
  data: NavbarSectionData;
  style?: React.CSSProperties;
  siteId?: string;
  onEditBlock?: (dataKey: string, blockIndex: number) => void;
};

const NavbarSection = ({ data, style, siteId: propSiteId, onEditBlock }: Props) => {
  const { siteId: paramSiteId } = useParams<{ siteId?: string }>();
  const [searchParams] = useSearchParams();
  const querySiteId = searchParams.get('siteId');

  const siteId = propSiteId || paramSiteId || querySiteId || undefined;

  // Get theme logo — fallback to section-level logo
  let themeLogoUrl = '';
  let themeLogoWidth = 120;
  try {
    const themeCtx = useTheme();
    themeLogoUrl = themeCtx.theme.logoUrl || '';
    themeLogoWidth = themeCtx.theme.logoWidth || 120;
  } catch {
    // ThemeProvider may not be available in published storefront
  }

  const [cartCount, setCartCount] = useState(data.cartCount || 0);
  const [wishlistCount, setWishlistCount] = useState(data.wishlistCount || 0);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  const {
    logo = '',
    logoText = 'MADAS',
    logoPosition = 'middle-left',
    mobileLogoPosition = 'center',
    menuType = 'dropdown',
    menuItems = [],
    stickyMode = 'on-scroll-up',
    separatorLine = false,
    showSearch = true,
    searchPlaceholder = 'Search products...',
    showCart = true,
    cartUrl = '',
    showWishlist = true,
    wishlistUrl = '',
    showUserIcon = true,
    userIconUrl = '',
    backgroundColor: _bgIgnored = 'inherit',
    textColor: _tcIgnored = 'inherit',
    sticky = false,
    hoverBackgroundColor = 'rgba(0,0,0,0.05)',
    hoverColor = '',
    hoverEffect = 'underline',
    padding_top = 0,
    padding_bottom = 0,
    bottomMargin = 0,
  } = data ?? {};

  // Colors come from scheme (applied by SectionRenderer wrapper) — ignore saved data values
  const backgroundColor = 'inherit';
  const textColor = 'inherit';

  // Resolve logo: theme logo takes priority, then section logo
  const resolvedLogo = themeLogoUrl || logo;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileOpenDropdown, setMobileOpenDropdown] = useState<number | null>(null);

  // ── Scroll-aware sticky state ──────────────────────────────────────
  const navRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);
  const [navVisible, setNavVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (stickyMode === 'none') return;
    if (stickyMode === 'always') return; // always visible, no scroll logic needed

    const handleScroll = () => {
      const currentY = window.scrollY;
      const isScrollingDown = currentY > lastScrollY.current;
      const pastThreshold = currentY > 80;

      if (stickyMode === 'on-scroll-up') {
        if (isScrollingDown && pastThreshold) {
          setNavVisible(false);
        } else {
          setNavVisible(true);
        }
      }

      if (stickyMode === 'reduce-logo') {
        setScrolled(currentY > 40);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [stickyMode]);

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

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDrawerOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const baseUrl = siteId ? `/site/${siteId}` : '#';
  const defaultCartUrl = (cartUrl && cartUrl !== '#') ? cartUrl : (siteId ? `${baseUrl}/cart` : '#');
  const defaultWishlistUrl = (wishlistUrl && wishlistUrl !== '#') ? wishlistUrl : (siteId ? `${baseUrl}/favorites` : '#');
  const defaultUserIconUrl = (userIconUrl && userIconUrl !== '#') ? userIconUrl : (siteId ? `${baseUrl}/account` : '#');

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
      /* Drawer overlay + panel */
      .xd-drawer-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.4);
        z-index: 100;
        opacity: 0;
        animation: xd-fade-in 0.2s ease forwards;
      }
      @keyframes xd-fade-in { to { opacity: 1; } }
      .xd-drawer-panel {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 300px;
        max-width: 85vw;
        z-index: 101;
        transform: translateX(-100%);
        animation: xd-slide-in 0.25s ease forwards;
        overflow-y: auto;
      }
      @keyframes xd-slide-in { to { transform: translateX(0); } }
      /* Mega menu */
      .xd-mega-menu {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        z-index: 50;
        padding: 1.5rem 2rem;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 1rem;
        border-top: 1px solid rgba(0,0,0,0.06);
        box-shadow: 0 8px 24px rgba(0,0,0,0.1);
      }
    `;
  };

  // Determine sticky behavior
  const isSticky = stickyMode !== 'none' || sticky;
  const stickyClasses = isSticky ? 'sticky top-0 z-50' : '';
  const hiddenOnScroll = stickyMode === 'on-scroll-up' && !navVisible;

  // Logo size (shrinks when scrolled + reduce-logo mode)
  const logoMaxHeight = stickyMode === 'reduce-logo' && scrolled ? 28 : 40;
  const logoMaxWidth = stickyMode === 'reduce-logo' && scrolled ? Math.round(themeLogoWidth * 0.7) : themeLogoWidth;

  // ── Layout: top-* puts logo on its own row above menu ─────────────
  const isTopLayout = logoPosition === 'top-left' || logoPosition === 'top-center';
  const isCenterLogo = logoPosition === 'middle-center' || logoPosition === 'top-center';

  // ── Shared menu item renderer ─────────────────────────────────────
  const renderDesktopMenuItem = useCallback((item: NavbarMenuItem, index: number) => {
    const hasDropdown = item.type === 'dropdown' && item.dropdownItems && item.dropdownItems.length > 0;

    if (!hasDropdown) {
      return (
        <a
          key={index}
          href={item.link || '#'}
          className="nav-link-builder px-3 xl:px-4 py-2 text-sm xl:text-base font-medium relative"
          style={{ color: textColor }}
          onClick={(e) => {
            if (onEditBlock) {
              e.preventDefault();
              e.stopPropagation();
              onEditBlock('menuItems', index);
            }
          }}
        >
          {item.label}
          {item.badge && (
            <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {item.badge}
            </span>
          )}
        </a>
      );
    }

    // Dropdown or Mega
    if (menuType === 'mega') {
      return (
        <div
          key={index}
          className="relative static"
          onMouseEnter={() => setOpenDropdown(index)}
          onMouseLeave={() => setOpenDropdown(null)}
        >
          <button
            type="button"
            className="nav-dropdown-trigger-builder px-3 xl:px-4 py-2 text-sm xl:text-base font-medium flex items-center gap-1 rounded-lg"
            style={{ color: textColor }}
          >
            {item.label}
            <span className="material-icons text-sm transition-transform duration-200" style={{ transform: openDropdown === index ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              expand_more
            </span>
          </button>
          {openDropdown === index && (
            <div className="xd-mega-menu" style={{ backgroundColor }}>
              {item.dropdownItems!.map((dropItem, di) => (
                <a
                  key={di}
                  href={dropItem.link || '#'}
                  className="block px-3 py-2 text-sm rounded-lg hover:bg-black/5 transition-colors"
                  style={{ color: textColor }}
                >
                  {dropItem.collectionId && (
                    <span className="material-icons text-xs mr-2 opacity-50">category</span>
                  )}
                  <span className="font-medium">{dropItem.label}</span>
                  {dropItem.collectionName && (
                    <span className="block text-xs opacity-50 mt-0.5">{dropItem.collectionName}</span>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Standard dropdown
    return (
      <div
        key={index}
        className="relative"
        onMouseEnter={() => setOpenDropdown(index)}
        onMouseLeave={() => setOpenDropdown(null)}
      >
        <button
          type="button"
          className="nav-dropdown-trigger-builder px-3 xl:px-4 py-2 text-sm xl:text-base font-medium transition-opacity relative flex items-center gap-1 rounded-lg"
          style={{ color: textColor }}
          onClick={(e) => {
            if (onEditBlock) {
              e.preventDefault();
              e.stopPropagation();
              onEditBlock('menuItems', index);
            }
          }}
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
            {item.dropdownItems!.map((dropItem, dropIndex) => (
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
      </div>
    );
  }, [openDropdown, textColor, backgroundColor, menuType, onEditBlock]);

  // ── Right-side action icons ────────────────────────────────────────
  const renderActionIcons = () => (
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

      {/* Mobile / Drawer toggle */}
      <button
        onClick={() => {
          if (menuType === 'drawer') {
            setIsDrawerOpen(!isDrawerOpen);
          } else {
            setIsMobileMenuOpen(!isMobileMenuOpen);
          }
        }}
        className={`${menuType === 'drawer' ? '' : 'lg:hidden'} p-2 rounded-lg hover:bg-black/5 transition-colors`}
        style={{ color: textColor }}
      >
        <span className="material-icons">{(isMobileMenuOpen || isDrawerOpen) ? 'close' : 'menu'}</span>
      </button>
    </div>
  );

  // ── Drawer menu panel (for menuType === 'drawer') ──────────────────
  const renderDrawer = () => {
    if (!isDrawerOpen) return null;
    return (
      <>
        <div className="xd-drawer-overlay" onClick={() => setIsDrawerOpen(false)} />
        <div className="xd-drawer-panel" style={{ backgroundColor }}>
          {/* Drawer header */}
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
            {resolvedLogo ? (
              <img src={resolvedLogo} alt={logoText} className="h-8 w-auto object-contain" />
            ) : (
              <span className="text-lg font-bold" style={{ color: textColor }}>{logoText}</span>
            )}
            <button onClick={() => setIsDrawerOpen(false)} className="p-1.5 rounded-lg hover:bg-black/5" style={{ color: textColor }}>
              <span className="material-icons">close</span>
            </button>
          </div>
          {/* Drawer menu items */}
          <div className="flex flex-col py-2">
            {processedMenuItems.map((item, index) => (
              <div key={index}>
                {item.type === 'dropdown' && item.dropdownItems && item.dropdownItems.length > 0 ? (
                  <div>
                    <button
                      onClick={() => setMobileOpenDropdown(mobileOpenDropdown === index ? null : index)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-black/5 transition-colors"
                      style={{ color: textColor }}
                    >
                      <span className="font-medium">{item.label}</span>
                      <span className="material-icons text-sm transition-transform duration-200" style={{ transform: mobileOpenDropdown === index ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        expand_more
                      </span>
                    </button>
                    {mobileOpenDropdown === index && (
                      <div className="bg-black/5">
                        {item.dropdownItems.map((dropItem, di) => (
                          <a
                            key={di}
                            href={dropItem.link || '#'}
                            className="block px-8 py-2.5 text-sm hover:bg-black/5 transition-colors"
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
                    className="block px-5 py-3 font-medium hover:bg-black/5 transition-colors"
                    style={{ color: textColor }}
                  >
                    {item.label}
                  </a>
                )}
              </div>
            ))}
          </div>
          {/* Drawer search */}
          {showSearch && (
            <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
              <div className="relative">
                <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: '18px' }}>search</span>
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border bg-transparent"
                  style={{ borderColor: 'rgba(0,0,0,0.1)', color: textColor }}
                />
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  // ── Mobile dropdown menu (for dropdown/mega types on mobile) ───────
  const renderMobileMenu = () => {
    if (!isMobileMenuOpen) return null;
    return (
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
    );
  };

  // ── Logo element ───────────────────────────────────────────────────
  const renderLogo = () => (
    <a
      href={baseUrl}
      className={`flex items-center gap-2 sm:gap-3 flex-shrink-0 ${
        isCenterLogo ? 'justify-center' : ''
      } ${mobileLogoPosition === 'center' ? 'max-lg:justify-center' : 'max-lg:justify-start'}`}
      style={{ textDecoration: 'none' }}
    >
      {resolvedLogo ? (
        <img
          src={resolvedLogo}
          alt={logoText}
          className="w-auto object-contain transition-all duration-300"
          style={{ height: 'auto', maxHeight: `${logoMaxHeight}px`, maxWidth: `${logoMaxWidth}px` }}
        />
      ) : null}
      <span className="text-lg sm:text-xl md:text-2xl font-bold" style={{ color: textColor }}>
        {logoText}
      </span>
    </a>
  );

  // ── Render: "top" layouts (logo row + menu row) ────────────────────
  if (isTopLayout) {
    return (
      <nav
        ref={navRef}
        className={`w-full transition-all duration-300 ${stickyClasses}`}
        style={{
          backgroundColor,
          color: textColor,
          paddingTop: padding_top ? `${padding_top}px` : undefined,
          paddingBottom: padding_bottom ? `${padding_bottom}px` : undefined,
          marginBottom: bottomMargin ? `${bottomMargin}px` : undefined,
          borderBottom: separatorLine ? '1px solid rgba(0,0,0,0.1)' : undefined,
          transform: hiddenOnScroll ? 'translateY(-100%)' : 'translateY(0)',
          ...style,
        }}
      >
        <style key={`hover-${hoverEffect}`}>{getHoverCSS()}</style>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Row 1: Logo + action icons */}
          <div className={`flex items-center py-2 ${isCenterLogo ? 'justify-center' : 'justify-between'}`} style={{ minHeight: '48px' }}>
            {isCenterLogo ? (
              <>
                <div className="flex-1" />
                {renderLogo()}
                <div className="flex-1 flex justify-end">
                  {renderActionIcons()}
                </div>
              </>
            ) : (
              <>
                {renderLogo()}
                {renderActionIcons()}
              </>
            )}
          </div>
          {/* Row 2: Menu (desktop) */}
          {menuType !== 'drawer' && (
            <div className={`hidden lg:flex items-center gap-1 pb-2 ${isCenterLogo ? 'justify-center' : 'justify-start'}`}>
              {processedMenuItems.map((item, index) => renderDesktopMenuItem(item, index))}
            </div>
          )}
          {/* Mobile menu */}
          {menuType !== 'drawer' && renderMobileMenu()}
        </div>
        {menuType === 'drawer' && renderDrawer()}
      </nav>
    );
  }

  // ── Render: "middle" layouts (single row) ──────────────────────────
  return (
    <nav
      ref={navRef}
      className={`w-full transition-all duration-300 ${stickyClasses}`}
      style={{
        backgroundColor,
        color: textColor,
        paddingTop: padding_top ? `${padding_top}px` : undefined,
        paddingBottom: padding_bottom ? `${padding_bottom}px` : undefined,
        marginBottom: bottomMargin ? `${bottomMargin}px` : undefined,
        borderBottom: separatorLine ? '1px solid rgba(0,0,0,0.1)' : undefined,
        transform: hiddenOnScroll ? 'translateY(-100%)' : 'translateY(0)',
        ...style,
      }}
    >
      <style key={`hover-${hoverEffect}`}>{getHoverCSS()}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between ${isCenterLogo ? 'flex-wrap' : ''}`} style={{ minHeight: '48px' }}>
          {/* Logo */}
          <div className={isCenterLogo ? 'w-full flex justify-center mb-2 lg:w-auto lg:mb-0 order-1 lg:order-none' : ''}>
            {renderLogo()}
          </div>

          {/* Desktop Menu (hidden when drawer mode) */}
          {menuType !== 'drawer' && (
            <div className={`hidden lg:flex items-center space-x-1 xl:space-x-2 flex-1 justify-center ${isCenterLogo ? 'order-3 w-full lg:w-auto lg:order-none' : ''}`}>
              {processedMenuItems.map((item, index) => renderDesktopMenuItem(item, index))}
            </div>
          )}

          {/* Right Side Actions */}
          <div className={isCenterLogo ? 'order-2 lg:order-none' : ''}>
            {renderActionIcons()}
          </div>
        </div>

        {/* Mobile Menu (dropdown/mega on mobile) */}
        {menuType !== 'drawer' && renderMobileMenu()}
      </div>
      {/* Drawer (full overlay for drawer mode) */}
      {menuType === 'drawer' && renderDrawer()}
    </nav>
  );
};

export default memo(NavbarSection);
