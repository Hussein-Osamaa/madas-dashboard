// Deployed: 2026-02-02 17:04:02
const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const config = require('./config');

// Generate URL-friendly slug from product name
function generateSlug(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')            // Replace multiple hyphens with single
    .replace(/^-|-$/g, '');         // Remove leading/trailing hyphens
}

// Generate error page HTML
function generateErrorPage(title, message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f5f7fa 0%, #e4e9f0 100%);
      padding: 2rem;
    }
    .error-container {
      text-align: center;
      max-width: 500px;
      padding: 3rem;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.1);
    }
    .error-icon { font-size: 4rem; margin-bottom: 1.5rem; }
    h1 { font-size: 1.75rem; color: #1a1a2e; margin-bottom: 1rem; }
    p { color: #64748b; line-height: 1.6; margin-bottom: 2rem; }
    a {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background: #4f46e5;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 500;
      transition: background 0.2s;
    }
    a:hover { background: #4338ca; }
  </style>
</head>
<body>
  <div class="error-container">
    <div class="error-icon">⚠️</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/">Go Home</a>
  </div>
</body>
</html>`;
}

// Generate empty page HTML
function generateEmptyPage(siteName) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${siteName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f5f7fa 0%, #e4e9f0 100%);
      padding: 2rem;
    }
    .empty-container { text-align: center; max-width: 500px; padding: 3rem; }
    .empty-icon { font-size: 4rem; margin-bottom: 1.5rem; opacity: 0.5; }
    h1 { font-size: 1.5rem; color: #1a1a2e; margin-bottom: 1rem; }
    p { color: #64748b; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="empty-container">
    <div class="empty-icon">🚧</div>
    <h1>${siteName}</h1>
    <p>This website is under construction. Check back soon!</p>
  </div>
</body>
</html>`;
}

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Performance: Response headers helper
function setPerformanceHeaders(res, cacheTime = 300) {
  // Cache control with stale-while-revalidate for instant loads
  res.set('Cache-Control', `public, max-age=${cacheTime}, s-maxage=${cacheTime * 2}, stale-while-revalidate=${cacheTime * 6}`);
  res.set('Vary', 'Accept-Encoding, Accept');
  
  // Security headers
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  res.set('X-XSS-Protection', '1; mode=block');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Performance hints
  res.set('Accept-CH', 'DPR, Viewport-Width, Width, Save-Data, ECT');
  res.set('Critical-CH', 'Save-Data, ECT');
  
  // Preload/prefetch hints via Link header
  res.set('Link', [
    '<https://fonts.googleapis.com>; rel=preconnect; crossorigin',
    '<https://fonts.gstatic.com>; rel=preconnect; crossorigin',
    '<https://firebasestorage.googleapis.com>; rel=preconnect; crossorigin'
  ].join(', '));
}

// ============================================================================
// BUILDER HTML EXPORT (matches dashboard builder output)
// ============================================================================

function exportBuilderWebsiteToHTML(sections, siteName, settings, siteId, useCleanUrls = false, businessId = '') {
  const currencySymbol = settings?.currencySymbol || '$';
  const seo = settings?.seo || {};
  const primaryColor = settings?.theme?.primaryColor || '#27491F';
  
  // Generate meaningful SEO defaults
  const storeName = siteName || 'My Store';
  const pageTitle = seo.title || storeName;
  
  // Generate default description from site content if not set
  let pageDescription = seo.description || '';
  if (!pageDescription) {
    // Try to extract meaningful description from hero section
    const heroSection = sections.find(s => s.type === 'hero');
    if (heroSection?.data?.subtitle) {
      pageDescription = heroSection.data.subtitle;
    } else if (heroSection?.data?.title) {
      pageDescription = `Welcome to ${storeName}. ${heroSection.data.title}`;
    } else {
      // Default generic description
      pageDescription = `Shop the best products at ${storeName}. Quality items, great prices, fast delivery.`;
    }
  }
  // Ensure description is max 160 characters for SEO
  if (pageDescription.length > 160) {
    pageDescription = pageDescription.substring(0, 157) + '...';
  }
  const keywords = (seo.keywords || []).join(', ');
  const ogTitle = seo.ogTitle || pageTitle;
  const ogDescription = seo.ogDescription || pageDescription;
  // Default OG image to logo if available
  const logoSection = sections.find(s => s.type === 'navbar');
  const ogImage = seo.ogImage || logoSection?.data?.logo || '';
  const twitterCard = seo.twitterCard || 'summary_large_image';
  const canonicalUrl = seo.canonicalUrl || '';
  const robots = seo.robots || 'index, follow';
  const favicon = seo.favicon || '/favicon.png';
  // Clean up google site verification - extract just the content value if user pasted full meta tag
  let googleSiteVerification = seo.googleSiteVerification || '';
  if (googleSiteVerification.includes('content="')) {
    const match = googleSiteVerification.match(/content="([^"]+)"/);
    if (match) googleSiteVerification = match[1];
  }
  // Remove any HTML tags
  googleSiteVerification = googleSiteVerification.replace(/<[^>]*>/g, '').trim();
  const customHeadCode = settings?.customCode?.headCode || '';
  const customBodyCode = settings?.customCode?.bodyCode || '';
  
  // Generate analytics code - DEFERRED for performance (loads after user interaction)
  const gaId = settings?.analytics?.googleAnalyticsId || '';
  const fbId = settings?.analytics?.facebookPixelId || '';
  const analyticsCode = '';  // Analytics loaded via deferred script below
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    <meta name="description" content="${pageDescription}">
    ${keywords ? `<meta name="keywords" content="${keywords}">` : ''}
    <meta name="author" content="${storeName}">
    <meta name="publisher" content="${storeName}">
    <meta name="robots" content="${useCleanUrls ? robots : 'noindex, follow'}">
    ${googleSiteVerification ? `<meta name="google-site-verification" content="${googleSiteVerification}">` : ''}
    ${canonicalUrl ? `<link rel="canonical" href="${canonicalUrl}">` : ''}
    <!-- Favicon: Multiple formats for better compatibility -->
    <link rel="icon" href="${favicon}" type="${favicon.includes('.ico') ? 'image/x-icon' : favicon.includes('.svg') ? 'image/svg+xml' : (favicon.includes('.jpg') || favicon.includes('.jpeg')) ? 'image/jpeg' : 'image/png'}">
    <link rel="icon" href="${favicon}" sizes="32x32">
    <link rel="icon" href="${favicon}" sizes="16x16">
    <link rel="apple-touch-icon" href="${favicon}" sizes="180x180">
    <link rel="shortcut icon" href="${favicon}">
    <meta name="msapplication-TileImage" content="${favicon}">
    
    <!-- Structured Data for SEO - WebSite -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "${pageTitle}",
      "alternateName": "${storeName}",
      "url": "${canonicalUrl || 'https://' + (settings?.customDomain || '')}",
      "description": "${pageDescription}",
      ${ogImage ? '"image": "' + ogImage + '",' : ''}
      "potentialAction": {
        "@type": "SearchAction",
        "target": "${canonicalUrl || 'https://' + (settings?.customDomain || '')}/products?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }
    </script>
    
    <!-- Structured Data for SEO - Organization -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "${storeName}",
      "url": "${canonicalUrl || 'https://' + (settings?.customDomain || '')}",
      ${ogImage ? '"logo": "' + ogImage + '",' : ''}
      "description": "${pageDescription}"
    }
    </script>
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="${ogTitle}">
    ${ogDescription ? `<meta property="og:description" content="${ogDescription}">` : ''}
    ${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}
    ${canonicalUrl ? `<meta property="og:url" content="${canonicalUrl}">` : ''}
    
    <!-- Twitter -->
    <meta name="twitter:card" content="${twitterCard}">
    <meta name="twitter:title" content="${ogTitle}">
    ${ogDescription ? `<meta name="twitter:description" content="${ogDescription}">` : ''}
    ${ogImage ? `<meta name="twitter:image" content="${ogImage}">` : ''}
    
    <!-- Performance: Preconnect to critical origins (high priority) -->
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://firebasestorage.googleapis.com" crossorigin>
    
    <!-- Performance: DNS prefetch for third-party resources -->
    <link rel="dns-prefetch" href="https://www.googletagmanager.com">
    <link rel="dns-prefetch" href="https://connect.facebook.net">
    
    <!-- Performance: Preload critical font (LCP optimization) -->
    <link rel="preload" href="https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2" as="font" type="font/woff2" crossorigin>
    
    <!-- Fonts: Load with swap for FOUT prevention -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <noscript><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"></noscript>
    
    <!-- Material Icons: Defer loading -->
    <link rel="preload" href="https://fonts.googleapis.com/icon?family=Material+Icons" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer"></noscript>
    
    <!-- Font Awesome for custom social icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer">
    
    ${customHeadCode}
    
    <!-- Performance: Preload critical images (hero + first products) -->
    ${(() => {
      let preloads = [];
      
      // Preload hero image
      const heroSection = sections.find(s => s.type === 'hero');
      if (heroSection?.data?.backgroundImage) {
        preloads.push('<link rel="preload" as="image" href="' + heroSection.data.backgroundImage + '" fetchpriority="high">');
      } else if (heroSection?.data?.isCarousel && heroSection?.data?.slides?.[0]?.backgroundImage) {
        preloads.push('<link rel="preload" as="image" href="' + heroSection.data.slides[0].backgroundImage + '" fetchpriority="high">');
      }
      
      // Preload first 4 product images for instant display
      const productsSection = sections.find(s => s.type === 'products');
      if (productsSection?.data?.selectedProducts) {
        productsSection.data.selectedProducts.slice(0, 4).forEach((p, i) => {
          if (p.image) {
            preloads.push('<link rel="preload" as="image" href="' + p.image + '" fetchpriority="' + (i < 2 ? 'high' : 'low') + '">');
          }
        });
      }
      
      // Preload first 4 deal images
      const dealsSection = sections.find(s => s.type === 'deals');
      if (dealsSection?.data?.selectedProducts) {
        dealsSection.data.selectedProducts.slice(0, 4).forEach((p, i) => {
          if (p.image && !preloads.some(link => link.includes(p.image))) {
            preloads.push('<link rel="preload" as="image" href="' + p.image + '" fetchpriority="low">');
          }
        });
      }
      
      return preloads.join('\n    ');
    })()}
    
    <!-- Performance: Critical inline styles for instant FCP -->
    <style id="critical-css">
      *{margin:0;padding:0;box-sizing:border-box}
      html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;overflow-x:hidden}
      body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#171817;-webkit-font-smoothing:antialiased;background:#fff;overflow-x:hidden}
      img,video{max-width:100%;height:auto;display:block}
      a{text-decoration:none;color:inherit}
      button{cursor:pointer;border:none;background:none;font:inherit}
      /* Prevent CLS - reserve space for images */
      .img-container{position:relative;overflow:hidden;background:#f3f4f6}
      
      /* LCP optimization - hero visible immediately */
      .hero-section{min-height:60vh;contain:layout style paint}
      /* Above-fold navbar */
      nav{position:sticky;top:0;z-index:1000;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      /* Toast animations */
      @keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
      @keyframes slideDown{from{opacity:1;transform:translateX(-50%) translateY(0)}to{opacity:0;transform:translateX(-50%) translateY(20px)}}
    </style>
    <!-- Non-critical CSS (deferred) -->
    <style id="main-css">
      :root{--primary-color:${primaryColor};--secondary-color:${settings?.theme?.secondaryColor || '#F0CAE1'}}
      /* Content visibility for below-fold (saves rendering cost) */
      section:nth-child(n+3){content-visibility:auto;contain-intrinsic-size:auto 500px}
      /* GPU layers for smooth animations */
      .carousel-slide,.product-card,.deal-card{will-change:transform;transform:translateZ(0)}
      .products-grid .product-card,.recommendations-grid .product-card{min-width:0}
      /* Images visible immediately - no fade delay */
      img{opacity:1!important}
      /* Image container with instant background */
      .img-placeholder{background:#f3f4f6}
      /* Hover states - use transform for GPU */
      .product-card:hover,.deal-card:hover{transform:translateY(-4px) translateZ(0)}
      /* Focus states for accessibility */
      :focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}
      /* Reduce motion preference */
      @media(prefers-reduced-motion:reduce){*,::before,::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}}
      /* Print styles */
      @media print{nav,footer,.cart-count,.toast-notification{display:none!important}body{font-size:12pt}}
      ${builderGenerateCSS(sections, settings)}
    </style>
</head>
<body>
    <!-- Accessible hidden content for search engines - will be shown in snippets -->
    <div class="sr-only" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">
        <h1>${pageTitle}</h1>
        <p>${pageDescription}</p>
    </div>
    ${builderGenerateHTML(sections, siteId, currencySymbol, settings, useCleanUrls)}
    <script>
        // ===== CART MANAGEMENT =====
        const SITE_ID = '${siteId}';
        const BUSINESS_ID_STORE = ${JSON.stringify(businessId || '')};
        const TRACK_CART_URL = 'https://us-central1-${(config.FIREBASE_PROJECT_ID || 'madas-store')}.cloudfunctions.net/trackCart';
        const CART_KEY = 'cart_' + SITE_ID;
        const FAVORITES_KEY = 'favorites_' + SITE_ID;
        const USER_KEY = 'user_' + SITE_ID;
        const SESSION_KEY = 'session_' + SITE_ID;
        
        function getSessionId() {
            var sid = localStorage.getItem(SESSION_KEY);
            if (!sid) { sid = 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem(SESSION_KEY, sid); }
            return sid;
        }
        
        function getCart() {
            try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
            catch { return []; }
        }
        
        function setCart(items) {
            localStorage.setItem(CART_KEY, JSON.stringify(items));
            updateCartCount();
            syncCartToServer(items);
        }
        
        function syncCartToServer(items) {
            if (!BUSINESS_ID_STORE) return;
            try {
                var user = null;
                try { user = JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch(e) {}
                fetch(TRACK_CART_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        businessId: BUSINESS_ID_STORE,
                        sessionId: getSessionId(),
                        items: items,
                        customerName: user ? (user.name || user.displayName || 'Guest') : 'Guest',
                        customerEmail: user ? (user.email || null) : null,
                        customerPhone: user ? (user.phone || null) : null,
                        source: 'website'
                    })
                }).catch(function() {});
            } catch(e) {}
        }
        
        function addToCart(product) {
            if (!product || !product.id) return;
            
            const cart = getCart();
            const itemKey = product.id + (product.size ? '-' + product.size : '') + (product.color ? '-' + product.color : '');
            const existing = cart.find(item => item.itemKey === itemKey);
            
            if (existing) {
                existing.quantity = (existing.quantity || 1) + 1;
            } else {
                cart.push({
                    ...product,
                    itemKey: itemKey,
                    size: product.size || undefined,
                    color: product.color || undefined,
                    quantity: 1,
                    addedAt: new Date().toISOString()
                });
            }
            
            setCart(cart);
            showToast((product.name || 'Product') + ' added to cart!');
        }
        
        function updateCartCount() {
            const cart = getCart();
            const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
            document.querySelectorAll('.cart-count').forEach(el => {
                el.textContent = count > 9 ? '9+' : count;
                el.style.display = count > 0 ? 'flex' : 'none';
            });
        }
        
        function getFavorites() {
            try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); }
            catch { return []; }
        }
        
        function setFavorites(items) {
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
        }
        
        function toggleFavorite(product) {
            const favorites = getFavorites();
            const index = favorites.findIndex(f => f.id === product.id);
            if (index > -1) {
                favorites.splice(index, 1);
                showToast('Removed from favorites');
            } else {
                favorites.push({ ...product, addedAt: new Date().toISOString() });
                showToast('Added to favorites!');
            }
            setFavorites(favorites);
        }
        
        function getUser() {
            try { return JSON.parse(localStorage.getItem(USER_KEY)); }
            catch { return null; }
        }
        
        function showToast(message) {
            const existing = document.querySelector('.toast-notification');
            if (existing) existing.remove();
            
            const toast = document.createElement('div');
            toast.className = 'toast-notification';
            toast.innerHTML = '<span class="material-icons" style="font-size: 20px;">check_circle</span>' + message;
            toast.style.cssText = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #1a1a2e; color: white; padding: 12px 24px; border-radius: 8px; display: flex; align-items: center; gap: 8px; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: slideUp 0.3s ease;';
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.animation = 'slideDown 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 2500);
        }
        
        // Initialize cart count on page load
        document.addEventListener('DOMContentLoaded', function() {
            updateCartCount();
        });
        
        // FAQ Accordion functionality
        document.querySelectorAll('.faq-item').forEach(item => {
            const button = item.querySelector('.faq-button');
            const content = item.querySelector('.faq-content');
            if (button && content) {
                button.addEventListener('click', () => {
                    const isOpen = content.style.display === 'block';
                    content.style.display = isOpen ? 'none' : 'block';
                    const icon = button.querySelector('.faq-icon');
                    if (icon) icon.textContent = isOpen ? 'expand_more' : 'expand_less';
                });
            }
        });
    </script>
    ${customBodyCode}
    
    <!-- Performance: Optimized lazy loading & deferred scripts -->
    <script>
      // Instant image loading - preload visible images
      (function(){
        // Immediately decode all visible images
        document.querySelectorAll('img').forEach(img => {
          if (img.complete) return;
          // Use decode() for smoother rendering
          if (img.decode) {
            img.decode().catch(() => {});
          }
        });
        
        // Preload images in viewport immediately
        const preloadImg = (img) => {
          if (img.dataset.src) {
            const preload = new Image();
            preload.src = img.dataset.src;
            preload.onload = () => {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            };
          }
        };
        
        // Preload first 8 images immediately (above fold)
        const images = document.querySelectorAll('img[loading="lazy"]');
        images.forEach((img, i) => {
          if (i < 8) preloadImg(img);
        });
        
        // Lazy load the rest with larger margin
        if ('IntersectionObserver' in window) {
          const io = new IntersectionObserver((entries, obs) => {
            entries.forEach(e => {
              if (e.isIntersecting) {
                preloadImg(e.target);
                obs.unobserve(e.target);
              }
            });
          }, {rootMargin: '500px 0px'});
          
          images.forEach((img, i) => {
            if (i >= 8) io.observe(img);
          });
        }
      })();
      
      // Defer analytics until user interaction (improves TBT)
      const gaId = '${gaId}';
      const fbId = '${fbId}';
      let analyticsLoaded = false;
      
      function loadAnalytics() {
        if (analyticsLoaded) return;
        analyticsLoaded = true;
        
        if (gaId) {
          const gs = document.createElement('script');
          gs.src = 'https://www.googletagmanager.com/gtag/js?id=' + gaId;
          gs.async = true;
          document.head.appendChild(gs);
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', gaId, {send_page_view: true});
        }
        
        if (fbId) {
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', fbId);
          fbq('track', 'PageView');
        }
      }
      
      // Load analytics on first user interaction or after 5s
      ['click', 'scroll', 'keydown', 'touchstart'].forEach(evt => {
        document.addEventListener(evt, loadAnalytics, {once: true, passive: true});
      });
      setTimeout(loadAnalytics, 5000);
      
      // Prefetch links on hover (improves navigation)
      document.querySelectorAll('a[href^="/"]').forEach(link => {
        link.addEventListener('mouseenter', function() {
          const href = this.getAttribute('href');
          if (!document.querySelector('link[rel="prefetch"][href="' + href + '"]')) {
            const pf = document.createElement('link');
            pf.rel = 'prefetch';
            pf.href = href;
            document.head.appendChild(pf);
          }
        }, {once: true, passive: true});
      });
      
      // Connection-aware image loading
      if ('connection' in navigator) {
        const conn = navigator.connection;
        if (conn.saveData || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
          document.documentElement.classList.add('save-data');
        }
      }
      
      // Performance reporting (Core Web Vitals)
      if ('PerformanceObserver' in window) {
        try {
          // LCP
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lcp = entries[entries.length - 1];
            console.log('[Perf] LCP:', Math.round(lcp.startTime), 'ms');
          }).observe({type: 'largest-contentful-paint', buffered: true});
          
          // FID
          new PerformanceObserver((list) => {
            list.getEntries().forEach(entry => {
              console.log('[Perf] FID:', Math.round(entry.processingStart - entry.startTime), 'ms');
            });
          }).observe({type: 'first-input', buffered: true});
          
          // CLS
          let cls = 0;
          new PerformanceObserver((list) => {
            list.getEntries().forEach(entry => {
              if (!entry.hadRecentInput) cls += entry.value;
            });
            console.log('[Perf] CLS:', cls.toFixed(3));
          }).observe({type: 'layout-shift', buffered: true});
        } catch(e) {}
      }
    </script>
</body>
</html>`;
  return html;
}

function builderGenerateCSS(sections, settings) {
  const primaryColor = settings?.theme?.primaryColor || '#27491F';
  const secondaryColor = settings?.theme?.secondaryColor || '#F0CAE1';
  
  // Minified CSS with performance optimizations
  return `:root{--primary-color:${primaryColor};--secondary-color:${secondaryColor}}
.hero-section{min-height:400px;contain:layout style}
.features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:2rem}
.products-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem}
.testimonials-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:2rem}
.gallery-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem}
.pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:2rem}
@media(max-width:768px){.features-grid,.products-grid,.testimonials-grid,.pricing-grid{grid-template-columns:1fr}}
/* Smooth scrolling */
html{scroll-behavior:smooth}
/* Skeleton loading */
.skeleton{background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:skeleton 1.5s infinite}
@keyframes skeleton{0%{background-position:200% 0}100%{background-position:-200% 0}}
/* Focus visible for accessibility */
:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}
/* Reduce motion for users who prefer it */
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
/* Toast animations */
@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
@keyframes slideDown{from{opacity:1;transform:translateX(-50%) translateY(0)}to{opacity:0;transform:translateX(-50%) translateY(20px)}}`;
}

function builderGenerateHTML(sections, siteId, currencySymbol = '$', siteSettings = {}, useCleanUrls = false) {
  const sorted = Array.isArray(sections) ? [...sections].sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
  const discountColor = siteSettings?.theme?.discountColor || '#dc2626';
  return sorted
    .map((section) => {
      const style = section.style || {};
      const padding = style.padding || {};
      const margin = style.margin || {};
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
          html = builderGenerateNavbarHTML(section.data || {}, style, siteId, useCleanUrls);
          break;
        case 'hero':
          html = builderGenerateHeroHTML(section.data || {}, style);
          break;
        case 'features':
          html = builderGenerateFeaturesHTML(section.data || {}, style);
          break;
        case 'products':
          html = builderGenerateProductsHTML(section.data || {}, style, siteId, currencySymbol, discountColor, useCleanUrls);
          break;
        case 'deals':
          html = builderGenerateDealsHTML(section.data || {}, style, siteId, currencySymbol, discountColor, useCleanUrls);
          break;
        case 'collections':
          html = builderGenerateCollectionsHTML(section.data || {}, style, siteId, useCleanUrls);
          break;
        case 'testimonials':
          html = builderGenerateTestimonialsHTML(section.data || {}, style);
          break;
        case 'cta':
          html = builderGenerateCTAHTML(section.data || {}, style);
          break;
        case 'about':
          html = builderGenerateAboutHTML(section.data || {}, style);
          break;
        case 'contact':
          html = builderGenerateContactHTML(section.data || {}, style);
          break;
        case 'gallery':
          html = builderGenerateGalleryHTML(section.data || {}, style);
          break;
        case 'pricing':
          html = builderGeneratePricingHTML(section.data || {}, style);
          break;
        case 'faq':
          html = builderGenerateFAQHTML(section.data || {}, style);
          break;
        case 'footer':
          html = builderGenerateFooterHTML(section.data || {}, style, siteId, siteSettings, useCleanUrls);
          break;
        case 'stats':
          html = builderGenerateStatsHTML(section.data || {}, style);
          break;
        case 'team':
          html = builderGenerateTeamHTML(section.data || {}, style);
          break;
        case 'services':
          html = builderGenerateServicesHTML(section.data || {}, style);
          break;
        case 'video':
          html = builderGenerateVideoHTML(section.data || {}, style);
          break;
        case 'countdown':
          html = builderGenerateCountdownHTML(section.data || {}, style);
          break;
        case 'banner':
          html = builderGenerateBannerHTML(section.data || {}, style);
          break;
        case 'partners':
          html = builderGeneratePartnersHTML(section.data || {}, style);
          break;
        case 'newsletter':
          html = builderGenerateNewsletterHTML(section.data || {}, style);
          break;
        case 'divider':
          html = builderGenerateDividerHTML(section.data || {}, style);
          break;
        case 'imageComparison':
          html = builderGenerateImageComparisonHTML(section.data || {}, style);
          break;
        default:
          html = '';
      }

      // These sections return their own section tags (with embedded styles)
      const selfContainedSections = ['navbar', 'footer', 'stats', 'team', 'services', 'video', 'countdown', 'banner', 'partners', 'newsletter', 'divider', 'features', 'testimonials', 'gallery', 'pricing', 'imageComparison'];
      if (selfContainedSections.includes(section.type)) return html;
      if (!html) return '';
      if (sectionStyle) return `<section style="${sectionStyle}">${html}</section>`;
      return `<section>${html}</section>`;
    })
    .join('\n');
}

function builderGenerateNavbarHTML(data, style, siteId, useCleanUrls = false) {
  const {
    logo = '',
    logoText = 'MADAS',
    menuItems = [],
    showSearch = true,
    searchPlaceholder = 'Search products...',
    showCart = true,
    cartCount = 0,
    cartUrl = '',
    showWishlist = true,
    wishlistCount = 0,
    wishlistUrl = '',
    showUserIcon = true,
    userIconUrl = '',
    sticky = false,
    hoverBackgroundColor = 'rgba(0,0,0,0.05)',
    hoverColor = '',
    hoverEffect = 'underline',
  } = data || {};
  
  // Support colors from both data and style (style takes precedence)
  const backgroundColor = style?.backgroundColor || data?.backgroundColor || '#FFFFFF';
  const textColor = style?.textColor || data?.textColor || '#27491F';
  const hoverTextColor = hoverColor || textColor;

  const baseUrl = useCleanUrls ? '' : (siteId ? `/site/${siteId}` : '');
  
  // Default URLs for icons if not configured
  const defaultCartUrl = cartUrl || (siteId ? `${baseUrl}/cart` : '#');
  const defaultWishlistUrl = wishlistUrl || (siteId ? `${baseUrl}/favorites` : '#');
  const defaultUserIconUrl = userIconUrl || (siteId ? `${baseUrl}/profile` : '#');
  
  // Process link with collection support
  const processLink = (link, collectionId) => {
    if (collectionId && siteId) {
      return `${baseUrl}/products?collection=${collectionId}`;
    }
    if (link && !link.startsWith('http') && !link.startsWith('/site/') && siteId) {
      if (link === '/products' || link === 'products') return `${baseUrl}/products`;
      if (link === '/about' || link === 'about') return `${baseUrl}/about`;
      if (link === '/cart' || link === 'cart') return `${baseUrl}/cart`;
      if (link === '/checkout' || link === 'checkout') return `${baseUrl}/checkout`;
      if (link === '/favorites' || link === 'favorites') return `${baseUrl}/favorites`;
      if (link === '/login' || link === 'login') return `${baseUrl}/login`;
      if (link === '/register' || link === 'register') return `${baseUrl}/register`;
      if (link === '/') return baseUrl || '/';
      if (link.startsWith('/products?collection=')) return `${baseUrl}${link}`;
      // New pages - About Us, FAQ, Policies
      if (link === '/about-us' || link === 'about-us') return `${baseUrl}/about-us`;
      if (link === '/faq' || link === 'faq') return `${baseUrl}/faq`;
      if (link === '/privacy-policy' || link === 'privacy-policy') return `${baseUrl}/privacy-policy`;
      if (link === '/terms-of-service' || link === 'terms-of-service') return `${baseUrl}/terms-of-service`;
      if (link === '/shipping-policy' || link === 'shipping-policy') return `${baseUrl}/shipping-policy`;
      if (link === '/return-policy' || link === 'return-policy') return `${baseUrl}/return-policy`;
      // If it's a relative path starting with /, add baseUrl
      if (link.startsWith('/')) return `${baseUrl}${link}`;
    }
    return link || '#';
  };
  
  const defaultMenuItems =
    menuItems.length === 0
      ? [
          { label: 'Home', link: baseUrl || '#' },
          { label: 'Products', link: `${baseUrl}/products` },
          { label: 'About', link: `${baseUrl}/about` },
        ]
      : menuItems.map((item) => {
          if (typeof item === 'string') return { label: item, link: '#' };
          return {
            ...item,
            link: processLink(item.link, item.collectionId),
            dropdownItems: item.dropdownItems?.map((dropItem) => ({
              ...dropItem,
              link: processLink(dropItem.link, dropItem.collectionId)
            }))
          };
        });

  // Generate menu item HTML (supports dropdowns)
  const generateMenuItemHTML = (item) => {
    const label = item.label || '';
    const link = item.link || '#';
    const badge = item.badge || '';
    const hasDropdown = item.type === 'dropdown' && item.dropdownItems && item.dropdownItems.length > 0;
    
    if (hasDropdown) {
      return `
        <div class="nav-dropdown" style="position: relative;">
          <button class="nav-dropdown-trigger" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: ${textColor}; background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px; border-radius: 8px; transition: all 0.2s ease;">
            ${label}
            <span class="material-icons" style="font-size: 16px; transition: transform 0.2s;">expand_more</span>
            ${badge ? `<span style="position: absolute; top: -4px; right: -8px; background: var(--secondary-color); color: white; font-size: 10px; padding: 2px 6px; border-radius: 9999px;">${badge}</span>` : ''}
          </button>
          <div class="nav-dropdown-menu" style="display: none; position: absolute; top: 100%; left: 0; min-width: 200px; background: ${backgroundColor}; border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; padding: 8px 0; z-index: 100;">
            ${item.dropdownItems.map((dropItem) => `
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
      <a href="${link}" class="nav-link" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: ${textColor}; text-decoration: none; position: relative; border-radius: 8px; transition: all 0.2s ease;">
        ${label}
        ${badge ? `<span style="position: absolute; top: -4px; right: -8px; background: var(--secondary-color); color: white; font-size: 10px; padding: 2px 6px; border-radius: 9999px;">${badge}</span>` : ''}
      </a>
    `;
  };

  // Generate mobile menu item HTML (supports dropdowns)
  const generateMobileMenuItemHTML = (item, index) => {
    const label = item.label || '';
    const link = item.link || '#';
    const hasDropdown = item.type === 'dropdown' && item.dropdownItems && item.dropdownItems.length > 0;
    
    if (hasDropdown) {
      return `
        <div class="mobile-dropdown">
          <button class="mobile-dropdown-trigger" data-index="${index}" style="width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; font-size: 1rem; font-weight: 500; color: ${textColor}; background: none; border: none; cursor: pointer; border-radius: 8px; text-align: left;">
            <span>${label}</span>
            <span class="material-icons" style="font-size: 18px; transition: transform 0.2s;">expand_more</span>
          </button>
          <div class="mobile-dropdown-menu" data-index="${index}" style="display: none; padding-left: 1rem; background: rgba(0,0,0,0.02); border-radius: 8px; margin: 0 0.5rem;">
            ${item.dropdownItems.map((dropItem) => `
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
          <a href="${baseUrl || '/'}" style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; text-decoration: none;">
            ${
              logo
                ? `<img loading="lazy" decoding="async" src="${logo}" alt="${logoText}" style="height: 40px; width: auto;" />`
                : `<div style="width: 40px; height: 40px; background: var(--primary-color); border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <span style="color: white; font-weight: bold; font-size: 0.875rem;">${String(logoText).charAt(0)}</span>
              </div>`
            }
            <span style="font-size: 1.5rem; font-weight: bold; color: ${textColor};">${logoText}</span>
          </a>

          <div class="desktop-menu" style="display: none; align-items: center; gap: 0.25rem; flex: 1; justify-content: center;">
            ${defaultMenuItems.map((item) => generateMenuItemHTML(item)).join('')}
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;">
            ${
              showSearch
                ? `
              <form class="desktop-search" style="display: none; align-items: center; position: relative;" action="${baseUrl}/products" method="get" role="search">
                <span class="material-icons search-icon" style="position: absolute; left: 12px; color: ${textColor}; opacity: 0.6; font-size: 18px; pointer-events: none;">search</span>
                <input id="navbarSearchInput" name="q" type="search" placeholder="${searchPlaceholder}" autocomplete="off" aria-label="Search products" style="padding: 8px 12px 8px 36px; font-size: 0.875rem; border-radius: 8px; border: 1px solid #d1d5db; width: 200px; background: rgba(255,255,255,0.8);" />
              </form>
            `
                : ''
            }
            ${
              showWishlist
                ? `
              <a href="${defaultWishlistUrl}" class="nav-icon-btn" style="position: relative; padding: 8px; border-radius: 8px; background: transparent; text-decoration: none; display: inline-block; cursor: pointer; transition: all 0.2s ease;">
                <span class="material-icons" style="color: ${textColor}; font-size: 18px; transition: transform 0.2s ease;">favorite</span>
                ${wishlistCount > 0 ? `<span style="position: absolute; top: 0; right: 0; background: var(--secondary-color); color: white; font-size: 10px; width: 16px; height: 16px; border-radius: 9999px; display: flex; align-items: center; justify-content: center;">${wishlistCount > 9 ? '9+' : wishlistCount}</span>` : ''}
              </a>
            `
                : ''
            }
            ${
              showCart
                ? `
              <a href="${defaultCartUrl}" class="nav-icon-btn" style="position: relative; padding: 8px; border-radius: 8px; background: transparent; text-decoration: none; display: inline-block; cursor: pointer; transition: all 0.2s ease;">
                <span class="material-icons" style="color: ${textColor}; font-size: 18px; transition: transform 0.2s ease;">shopping_bag</span>
                <span class="cart-count" style="position: absolute; top: 0; right: 0; background: var(--primary-color); color: white; font-size: 10px; width: 16px; height: 16px; border-radius: 9999px; display: none; align-items: center; justify-content: center;">0</span>
              </a>
            `
                : ''
            }
            ${
              showUserIcon
                ? `
              <a href="${defaultUserIconUrl}" class="nav-icon-btn" style="padding: 8px; border-radius: 8px; background: transparent; text-decoration: none; display: inline-block; cursor: pointer; transition: all 0.2s ease;">
                <span class="material-icons" style="color: ${textColor}; font-size: 18px; transition: transform 0.2s ease;">person</span>
              </a>
            `
                : ''
            }
            <button id="mobile-menu-toggle" style="padding: 8px; border-radius: 8px; border: none; background: transparent; cursor: pointer;">
              <span class="material-icons" style="color: ${textColor}; font-size: 18px;">menu</span>
            </button>
          </div>
        </div>

        <div id="mobile-menu" style="display: none; padding: 1rem 0; border-top: 1px solid #e5e7eb;">
          ${showSearch ? `
          <form class="mobile-search" action="${baseUrl}/products" method="get" role="search" style="margin-bottom: 1rem; padding: 0 0.5rem;">
            <div style="position: relative; display: flex; align-items: center;">
              <span class="material-icons" style="position: absolute; left: 12px; color: ${textColor}; opacity: 0.6; font-size: 18px; pointer-events: none;">search</span>
              <input name="q" type="search" placeholder="${searchPlaceholder}" autocomplete="off" aria-label="Search products" style="width: 100%; padding: 10px 12px 10px 40px; font-size: 1rem; border-radius: 8px; border: 1px solid #d1d5db; background: #fff; color: #171817;" />
            </div>
          </form>
          ` : ''}
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            ${defaultMenuItems.map((item, index) => generateMobileMenuItemHTML(item, index)).join('')}
          </div>
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
            const isOpen = menu.classList.contains('open');
            menu.classList.toggle('open');
            const icon = toggle.querySelector('.material-icons');
            if (icon) icon.textContent = isOpen ? 'menu' : 'close';
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
        .desktop-menu { display: flex !important; }
        .desktop-search { display: flex !important; }
        #mobile-menu-toggle { display: none !important; }
        #mobile-menu { display: none !important; }
      }
      @media (max-width: 1023px) {
        .desktop-menu { display: none !important; }
        .desktop-search { display: none !important; }
      }
      /* Nav link hover effects - Clean implementation */
      .nav-link {
        position: relative;
        overflow: hidden;
        z-index: 1;
        transition: color 0.3s ease, transform 0.3s ease, background-color 0.3s ease;
      }
      
      /* Default/None effect */
      ${!hoverEffect || hoverEffect === 'none' ? `
      .nav-link:hover {
        color: ${hoverTextColor} !important;
      }
      ` : ''}
      
      /* Underline effect */
      ${hoverEffect === 'underline' ? `
      .nav-link::after {
        content: '';
        position: absolute;
        bottom: 2px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 2px;
        background: ${hoverTextColor};
        transition: width 0.3s ease;
      }
      .nav-link:hover {
        color: ${hoverTextColor} !important;
      }
      .nav-link:hover::after {
        width: calc(100% - 0.5rem);
      }
      ` : ''}
      
      /* Slide effect */
      ${hoverEffect === 'slide' ? `
      .nav-link::after {
        content: '';
        position: absolute;
        bottom: 2px;
        left: 0;
        width: 0;
        height: 2px;
        background: ${hoverTextColor};
        transition: width 0.3s ease;
      }
      .nav-link:hover {
        color: ${hoverTextColor} !important;
      }
      .nav-link:hover::after {
        width: 100%;
      }
      ` : ''}
      
      /* Highlight effect */
      ${hoverEffect === 'highlight' ? `
      .nav-link {
        border-radius: 6px;
      }
      .nav-link:hover {
        background-color: ${hoverBackgroundColor || 'rgba(0,0,0,0.08)'} !important;
        color: ${hoverTextColor} !important;
      }
      ` : ''}
      
      /* Scale effect */
      ${hoverEffect === 'scale' ? `
      .nav-link:hover {
        color: ${hoverTextColor} !important;
        transform: scale(1.08);
      }
      ` : ''}
      
      /* Glow effect */
      ${hoverEffect === 'glow' ? `
      .nav-link:hover {
        color: ${hoverTextColor} !important;
        text-shadow: 0 0 8px ${hoverTextColor}, 0 0 16px ${hoverTextColor}50;
      }
      ` : ''}
      
      /* Fill effect - Left to Right */
      ${hoverEffect === 'fill' ? `
      .nav-link::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 0;
        height: 100%;
        background: ${hoverBackgroundColor || hoverTextColor};
        transition: width 0.35s ease;
        z-index: -1;
        border-radius: 6px;
      }
      .nav-link:hover {
        color: ${hoverTextColor} !important;
      }
      .nav-link:hover::before {
        width: 100%;
      }
      ` : ''}
      
      /* Dropdown trigger hover */
      .nav-dropdown-trigger {
        position: relative;
        transition: color 0.3s ease, background-color 0.3s ease;
        border-radius: 6px;
      }
      .nav-dropdown-trigger:hover {
        background-color: ${hoverBackgroundColor || 'rgba(0,0,0,0.05)'} !important;
        color: ${hoverTextColor} !important;
      }
      
      /* Dropdown menu item hover */
      .nav-dropdown-menu a {
        position: relative;
        transition: all 0.2s ease;
      }
      .nav-dropdown-menu a:hover {
        background: ${hoverBackgroundColor} !important;
        padding-left: 20px !important;
        color: ${hoverTextColor} !important;
      }
      
      /* Icon button hover - contrasting background so icons stay visible */
      .nav-icon-btn {
        position: relative;
        transition: transform 0.2s ease, background-color 0.2s ease;
        border-radius: 8px;
      }
      .nav-icon-btn:hover {
        transform: translateY(-2px);
        background-color: ${backgroundColor === '#FFFFFF' || backgroundColor === '#ffffff' || !backgroundColor ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.15)'} !important;
      }
      .nav-icon-btn:hover .material-icons {
        transform: scale(1.12);
        color: ${textColor} !important;
      }
      
      /* Mobile menu item hover */
      #mobile-menu a,
      .mobile-dropdown-trigger {
        position: relative;
        transition: all 0.2s ease;
      }
      #mobile-menu a:hover,
      .mobile-dropdown-trigger:hover {
        background: ${hoverBackgroundColor} !important;
        color: ${hoverTextColor} !important;
        padding-left: 1.5rem !important;
      }
      
      #mobile-menu.open {
        display: flex !important;
        flex-direction: column;
      }
    </style>
  `;
}

function builderGenerateHeroHTML(data) {
  const isMinimal = data.layout === 'minimal';
  const bgSize = data.backgroundSize || 'cover';
  const bgPosition = data.backgroundPosition || 'center';
  const backgroundStyle = data.backgroundImage
    ? `background-image: url(${data.backgroundImage}); background-size: ${bgSize}; background-position: ${bgPosition}; background-repeat: no-repeat;`
    : `background: ${data.backgroundColor || '#27491F'};`;
  const overlayStyle =
    data.backgroundImage && data.backgroundColor && !isMinimal
      ? `position: absolute; inset: 0; background-color: ${data.backgroundColor}; opacity: 0.4;`
      : '';
  
  const textStyle = data.textStyle || {};
  const titleStyle = `font-size: ${textStyle.titleFontSize || 48}px; font-weight: ${textStyle.titleFontWeight || 'bold'}; text-align: ${textStyle.titleAlignment || 'center'};`;
  const subtitleStyle = `font-size: ${textStyle.subtitleFontSize || 20}px; font-weight: ${textStyle.subtitleFontWeight || 'normal'}; text-align: ${textStyle.subtitleAlignment || 'center'};`;
  const buttonStyle = textStyle.buttonStyle || {};
  const buttonVariant = buttonStyle.variant || (isMinimal ? 'outlined' : 'filled');
  
  // Generate button styles based on variant
  const getButtonStyleString = (btnStyle, textColor, bgColor, variant) => {
    const btnVariant = variant || btnStyle.variant || (isMinimal ? 'outlined' : 'filled');
    const baseStyles = `
      display: inline-block; 
      padding: ${btnStyle.padding || (isMinimal ? '16px 40px' : '12px 32px')}; 
      border-radius: ${btnStyle.borderRadius || 0}px; 
      text-decoration: ${btnVariant === 'ghost' ? 'underline' : 'none'}; 
      ${btnVariant === 'ghost' ? 'text-underline-offset: 4px;' : ''}
      font-weight: ${btnStyle.fontWeight || '500'}; 
      font-size: ${btnStyle.fontSize || (isMinimal ? 14 : 16)}px;
      ${isMinimal ? 'letter-spacing: 0.1em; text-transform: uppercase;' : ''}
      transition: all 0.3s ease;
    `;
    
    // Outlined variant
    if (btnVariant === 'outlined') {
      return `${baseStyles} background: transparent; color: ${btnStyle.textColor || textColor || '#FFFFFF'}; border: 1px solid ${btnStyle.textColor || textColor || '#FFFFFF'};`;
    }
    
    // Ghost variant (text only)
    if (btnVariant === 'ghost') {
      return `${baseStyles} background: transparent; color: ${btnStyle.textColor || textColor || '#FFFFFF'}; border: none;`;
    }
    
    // Filled variant (default)
    return `${baseStyles} background: ${btnStyle.backgroundColor || 'white'}; color: ${btnStyle.textColor || bgColor || '#27491F'}; border: none; box-shadow: 0 4px 6px rgba(0,0,0,0.1);`;
  };

  // Handle carousel
  if (data.isCarousel && data.slides && data.slides.length > 0) {
    const globalTextStyle = data.textStyle || {};
    const slidesHTML = data.slides.map((slide, index) => {
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
      const slideButtonVariant = slideButtonStyle.variant || (isMinimal ? 'outlined' : 'filled');
      const slideButtonStyleString = getButtonStyleString(slideButtonStyle, slide.textColor || '#FFFFFF', slide.backgroundColor || '#27491F', slideButtonVariant);
      
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
            ${slide.buttonText ? `<a href="${slide.buttonLink || '#'}" class="hero-btn hero-btn-${slideButtonVariant}" style="${slideButtonStyleString}">${slide.buttonText || 'Explore Collection'}</a>` : ''}
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
    
    // Get button text color for hover fill effect
    const btnTextColor = (data.slides[0]?.textStyle?.buttonStyle?.textColor) || data.textStyle?.buttonStyle?.textColor || '#FFFFFF';
    const btnVariant = (data.slides[0]?.textStyle?.buttonStyle?.variant) || data.textStyle?.buttonStyle?.variant || (isMinimal ? 'outlined' : 'filled');
    
    return `
      <style>
        /* Gradual fill hover effect for buttons */
        .hero-btn {
          position: relative;
          overflow: hidden;
          z-index: 1;
        }
        .hero-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 0%;
          height: 100%;
          background: ${btnTextColor};
          transition: width 0.4s ease;
          z-index: -1;
        }
        .hero-btn:hover::before {
          width: 100%;
        }
        .hero-btn-outlined {
          transition: color 0.4s ease, border-color 0.3s ease;
        }
        .hero-btn-outlined:hover { 
          color: ${isMinimal ? '#1a1a1a' : '#000'} !important; 
          border-color: ${btnTextColor} !important;
        }
        .hero-btn-ghost {
          transition: opacity 0.3s ease;
        }
        .hero-btn-ghost::before {
          display: none;
        }
        .hero-btn-ghost:hover { 
          opacity: 0.7 !important;
        }
        .hero-btn-filled {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .hero-btn-filled::before {
          background: rgba(255,255,255,0.2);
        }
        .hero-btn-filled:hover { 
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.2) !important;
        }
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
            ${data.slides.map((_, i) => `
              <button class="hero-dot" data-slide="${i}" style="width: ${isMinimal ? '8px' : (i === 0 ? '32px' : '8px')}; height: 8px; border-radius: 9999px; border: none; background: ${i === 0 ? (isMinimal ? 'white' : 'white') : (isMinimal ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.5)')}; cursor: pointer; transition: all 0.3s;"></button>
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
                  d.style.background = i === index ? 'white' : 'rgba(255,255,255,0.5)';
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

  // Non-carousel hero
  const titleFontSize = textStyle.titleFontSize || 48;
  const titleFontWeight = textStyle.titleFontWeight || 'bold';
  const subtitleFontSize = textStyle.subtitleFontSize || 20;
  const subtitleFontWeight = textStyle.subtitleFontWeight || 'normal';
  const singleButtonVariant = buttonStyle.variant || (isMinimal ? 'outlined' : 'filled');
  const singleButtonStyleString = getButtonStyleString(buttonStyle, data.textColor || '#FFFFFF', data.backgroundColor || '#27491F', singleButtonVariant);
  
  // Get button text color for hover fill effect
  const btnTextColorSingle = buttonStyle.textColor || data.textColor || '#FFFFFF';

  return `
    <style>
      .hero-section .hero-title, .hero-section .hero-title * { font-size: ${titleFontSize}px !important; font-weight: ${titleFontWeight} !important; line-height: 1.1 !important; }
      .hero-section .hero-subtitle, .hero-section .hero-subtitle * { font-size: ${subtitleFontSize}px !important; font-weight: ${subtitleFontWeight} !important; }
      .hero-btn-outlined:hover { 
        background-color: ${btnTextColorSingle} !important; 
        color: #000 !important; 
        border-color: ${btnTextColorSingle} !important;
      }
      .hero-btn-ghost:hover { 
        opacity: 0.7 !important;
      }
      .hero-btn-filled:hover { 
        opacity: 0.9 !important;
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0,0,0,0.15) !important;
      }
    </style>
    <section class="hero-section" style="position: relative; ${backgroundStyle}; color: ${data.textColor || '#FFFFFF'}; ${isMinimal ? 'min-height: 100vh;' : 'padding: 80px 20px; min-height: 500px;'} text-align: center; display: flex; align-items: center; justify-content: center;">
      ${overlayStyle ? `<div style="${overlayStyle}"></div>` : ''}
      <div style="position: relative; z-index: 10; width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 20px;">
        ${!isMinimal ? `<h1 class="hero-title" style="${titleStyle}; color: ${data.textColor || '#FFFFFF'}; margin-bottom: 1rem; white-space: pre-line; line-height: 1.1;">${data.title || 'Welcome'}</h1>` : ''}
        ${!isMinimal ? `<p class="hero-subtitle" style="${subtitleStyle}; color: ${data.textColor || '#FFFFFF'}; margin-bottom: 2rem; opacity: 0.9; white-space: pre-line;">${data.subtitle || ''}</p>` : ''}
        ${data.buttonText ? `<a href="${data.buttonLink || '#'}" class="hero-btn hero-btn-${singleButtonVariant}" style="${singleButtonStyleString}">${data.buttonText || (isMinimal ? 'Explore Collection' : 'Get Started')}</a>` : ''}
      </div>
    </section>
  `;
}

function builderGenerateFeaturesHTML(data, style) {
  const items = data.items || [];
  const columns = data.columns || 3;
  const backgroundColor = style?.backgroundColor || data.backgroundColor || '#ffffff';
  const titleColor = data.titleColor || 'var(--primary-color)';
  const cardBgColor = data.cardBackgroundColor || '#ffffff';
  const textColor = data.textColor || '#666';
  const borderRadius = data.borderRadius || 12;
  const showBorder = data.showBorder !== false;
  
  const defaultItems = items.length > 0 ? items : [
    { icon: '⭐', title: 'Feature 1', description: 'Description here' },
    { icon: '⭐', title: 'Feature 2', description: 'Description here' },
    { icon: '⭐', title: 'Feature 3', description: 'Description here' }
  ];
  
  return `
    <section style="padding: 60px 20px; background: ${backgroundColor};">
      <div style="max-width: 1200px; margin: 0 auto;">
        <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 1rem; color: ${titleColor};">${data.title || 'Our Features'}</h2>
        ${data.subtitle ? `<p style="text-align: center; color: ${textColor}; margin-bottom: 3rem;">${data.subtitle}</p>` : ''}
        <div style="display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 2rem;">
          ${defaultItems
            .map(
              (item) => `
            <div style="text-align: center; padding: 2rem; background: ${cardBgColor}; ${showBorder ? 'border: 1px solid #e5e7eb;' : ''} border-radius: ${borderRadius}px; transition: box-shadow 0.3s;" onmouseover="this.style.boxShadow='0 10px 25px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='none'">
              <div style="font-size: 3rem; margin-bottom: 1rem;">${item.icon || '⭐'}</div>
              <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: ${titleColor};">${item.title || ''}</h3>
              <p style="color: ${textColor};">${item.description || ''}</p>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    </section>
    <style>
      @media (max-width: 1024px) {
        section > div > div[style*="grid-template-columns: repeat(${columns}"] {
          grid-template-columns: repeat(2, 1fr) !important;
        }
      }
      @media (max-width: 640px) {
        section > div > div[style*="grid-template-columns: repeat(${columns}"] {
          grid-template-columns: 1fr !important;
        }
      }
    </style>
  `;
}

function builderGenerateProductsHTML(data, style, siteId, currencySymbol = '$', discountColor = '#dc2626', useCleanUrls = false) {
  const selectedProducts = data.selectedProducts || [];
  const showPrice = data.showPrice !== false;
  const showAddToCart = data.showAddToCart !== false;
  const layout = data.layout || 'grid';
  const columns = data.columns || 4;
  const baseUrl = useCleanUrls ? '' : (siteId ? `/site/${siteId}` : '');
  const saleColor = discountColor;
  
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
    buttonHoverEffect: data.cardStyle?.buttonHoverEffect || 'fill',
    buttonHoverBackgroundColor: data.cardStyle?.buttonHoverBackgroundColor || data.cardStyle?.buttonTextColor || '#ffffff',
    buttonHoverTextColor: data.cardStyle?.buttonHoverTextColor || data.cardStyle?.buttonBackgroundColor || '#27491F',
    showBorder: data.cardStyle?.showBorder !== false,
    borderColor: data.cardStyle?.borderColor || '#e5e7eb'
  };

  // Shadow mapping
  const shadowMap = {
    none: 'none',
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
    lg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
    xl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
  };

  // Aspect ratio mapping
  const aspectMap = {
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

  // Calculate discount percentage
  const getDiscountPercent = (product) => {
    if (product.onSale && product.salePrice && (product.compareAtPrice || product.sellingPrice)) {
      const originalPrice = product.compareAtPrice || product.sellingPrice;
      const discount = Math.round(((originalPrice - product.salePrice) / originalPrice) * 100);
      return discount > 0 ? discount : 0;
    }
    return 0;
  };

  return `
    <section style="padding: 60px 20px;">
      <div style="max-width: 1200px; margin: 0 auto;">
        <h2 style="${titleCss}">${data.title || 'Products'}</h2>
        ${data.subtitle ? `<p style="${subtitleCss}">${data.subtitle}</p>` : ''}
        <div class="products-section-grid" style="display: grid; grid-template-columns: ${gridColumnsCSS}; gap: 1.5rem;">
          ${selectedProducts.map((product, productIndex) => {
            const discountPercent = getDiscountPercent(product);
            const loadingAttr = productIndex < 4 ? 'eager' : 'lazy';
            return `
            <a href="${baseUrl}/products/${generateSlug(product.name)}" class="product-card" style="
              display: block;
              text-decoration: none;
              color: inherit;
              background: ${cs.backgroundColor}; 
              border-radius: ${cs.borderRadius}px; 
              overflow: hidden; 
              box-shadow: ${shadowMap[cs.shadow] || shadowMap.md};
              ${cs.showBorder ? `border: 1px solid ${cs.borderColor};` : ''}
              transition: all 0.3s ease;
              position: relative;
            ">
              ${discountPercent > 0 ? `
                <div style="
                  position: absolute;
                  top: 12px;
                  left: 12px;
                  background: ${saleColor};
                  color: white;
                  padding: 4px 10px;
                  border-radius: 4px;
                  font-size: 0.75rem;
                  font-weight: 700;
                  z-index: 10;
                ">-${discountPercent}%</div>
              ` : ''}
              <div style="${aspectMap[cs.imageAspect] || aspectMap.square} background: ${cs.imageBackgroundColor || '#f3f4f6'}; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                ${product.image 
                  ? `<img loading="${loadingAttr}" decoding="async" src="${product.image}" alt="${product.name}" width="400" height="400" style="width: 100%; height: 100%; object-fit: ${cs.imageFit}; background: ${cs.imageBackgroundColor || '#f3f4f6'};">`
                  : `<span class="material-icons" style="font-size: 4rem; color: rgba(0,0,0,0.2);">image</span>`
                }
              </div>
              <div style="padding: 1.5rem;">
                <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem; color: ${cs.textColor}; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${product.name}</h3>
                ${showPrice ? `
                  <div style="margin-bottom: 1rem; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    ${product.onSale && product.salePrice ? `
                      <span style="color: ${saleColor}; font-weight: 700; font-size: 1.125rem;">${currencySymbol}${product.salePrice}</span>
                      <span style="color: ${cs.priceColor}; text-decoration: line-through; font-size: 0.875rem; opacity: 0.6;">${currencySymbol}${product.compareAtPrice || product.sellingPrice || product.price}</span>
                    ` : `
                      <span style="color: ${cs.priceColor}; font-weight: 500;">${currencySymbol}${product.sellingPrice || product.price}</span>
                    `}
                  </div>
                ` : ''}
                ${showAddToCart ? `<button onclick="event.preventDefault(); event.stopPropagation(); addToCart({id: '${product.id}', name: '${(product.name || '').replace(/'/g, "\\'")}', image: '${product.image || ''}', price: ${product.onSale && product.salePrice ? product.salePrice : (product.sellingPrice || product.price || 0)}});" style="
                  ${cs.buttonFullWidth !== false ? 'width: 100%;' : 'padding-left: 1rem; padding-right: 1rem;'} 
                  padding: 0.75rem; 
                  background: ${cs.buttonBackgroundColor}; 
                  color: ${cs.buttonTextColor}; 
                  border: none; 
                  border-radius: ${cs.buttonBorderRadius}px; 
                  font-weight: 600; 
                  cursor: pointer;
                  transition: opacity 0.3s ease;
                ">Add to Cart</button>` : ''}
              </div>
            </a>
          `}).join('')}
        </div>
      </div>
    </section>
    <style>
      .product-card:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1) !important; }
      .product-card:hover img { transform: scale(1.05); }
      /* Product button hover effects */
      .product-add-btn {
        position: relative;
        overflow: hidden;
        z-index: 1;
      }
      ${cs.buttonHoverEffect === 'fill' ? `
      .product-add-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 0%;
        height: 100%;
        background: ${cs.buttonHoverBackgroundColor};
        transition: width 0.4s ease;
        z-index: -1;
        border-radius: inherit;
      }
      .product-add-btn:hover::before {
        width: 100%;
      }
      .product-add-btn:hover {
        color: ${cs.buttonHoverTextColor} !important;
      }
      ` : cs.buttonHoverEffect === 'scale' ? `
      .product-add-btn:hover {
        transform: scale(1.05);
        background-color: ${cs.buttonHoverBackgroundColor} !important;
        color: ${cs.buttonHoverTextColor} !important;
      }
      ` : cs.buttonHoverEffect === 'glow' ? `
      .product-add-btn:hover {
        box-shadow: 0 0 15px ${cs.buttonHoverBackgroundColor}80, 0 0 30px ${cs.buttonHoverBackgroundColor}40;
        background-color: ${cs.buttonHoverBackgroundColor} !important;
        color: ${cs.buttonHoverTextColor} !important;
      }
      ` : `
      .product-add-btn:hover {
        opacity: 0.9;
      }
      `}
      @media (max-width: 1024px) {
        .products-section-grid { grid-template-columns: repeat(2, 1fr) !important; }
      }
      @media (max-width: 640px) {
        .products-section-grid { 
          display: flex !important;
          overflow-x: auto !important;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          gap: 1rem !important;
          padding-bottom: 1rem;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .products-section-grid::-webkit-scrollbar { display: none; }
        .products-section-grid .product-card {
          flex: 0 0 75%;
          max-width: 75%;
          scroll-snap-align: start;
        }
      }
    </style>
  `;
}

function builderGenerateDealsHTML(data, style, siteId = '', currencySymbol = '$', discountColor = '#dc2626', useCleanUrls = false) {
  const {
    title = 'DEAL OF THE DAY',
    viewMoreText = '',
    viewMoreLink = '#',
    selectedProducts = [],
    columns = 4,
    showCountdown = false,
    countdownEndDate = '',
    countdownStyle = {}
  } = data || {};

  const baseUrl = useCleanUrls ? '' : (siteId ? `/site/${siteId}` : '');
  const saleColor = discountColor;

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
    backgroundColor: data?.cardStyle?.backgroundColor || '#ffffff',
    textColor: data?.cardStyle?.textColor || '#1f2937',
    descriptionColor: data?.cardStyle?.descriptionColor || '#6b7280',
    priceColor: data?.cardStyle?.priceColor || '#1f2937',
    borderRadius: data?.cardStyle?.borderRadius ?? 8,
    showBorder: data?.cardStyle?.showBorder !== false,
    borderColor: data?.cardStyle?.borderColor || '#e5e7eb',
    imageBackgroundColor: data?.cardStyle?.imageBackgroundColor || '#f3f4f6',
    imageFit: data?.cardStyle?.imageFit || 'cover',
    buttonBackgroundColor: data?.cardStyle?.buttonBackgroundColor || '#F0CAE1',
    buttonTextColor: data?.cardStyle?.buttonTextColor || '#27491F',
    buttonBorderRadius: data?.cardStyle?.buttonBorderRadius ?? 6
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

  // Calculate discount percentage
  const getDiscountPercent = (product) => {
    if (product.onSale && product.salePrice && (product.compareAtPrice || product.sellingPrice)) {
      const originalPrice = product.compareAtPrice || product.sellingPrice;
      const discount = Math.round(((originalPrice - product.salePrice) / originalPrice) * 100);
      return discount > 0 ? discount : 0;
    }
    return 0;
  };

  return `
    <section class="deals-section-container" style="padding: 60px 20px; ${style?.backgroundColor ? `background: ${style.backgroundColor};` : ''}">
      <div style="max-width: 1400px; margin: 0 auto;">
        <!-- Header -->
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px;">
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 16px;">
            <h2 style="font-size: 1.75rem; font-weight: bold; font-style: italic; letter-spacing: 0.05em; margin: 0; ${style?.textColor ? `color: ${style.textColor};` : ''}">${title}</h2>
            
            ${showCountdown && countdownEndDate ? `
              <!-- Countdown Timer -->
              <style>
                @keyframes countdown-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
                .countdown-urgent { animation: countdown-pulse 1s ease-in-out infinite; }
                .countdown-box { min-width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 8px; }
                @media (max-width: 640px) { .countdown-box { min-width: 40px; height: 40px; } }
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
                      <div class="countdown-box" style="background: ${ctStyle.textColor}15; color: ${ctStyle.textColor};"><span class="countdown-days" style="font-weight: bold; font-size: 1.25rem;">00</span></div>
                      <span style="display: block; font-size: 9px; color: ${ctStyle.labelColor}; text-transform: uppercase; margin-top: 4px;">Days</span>
                    </div>
                    <span style="color: ${ctStyle.textColor}; font-weight: bold; font-size: 1.25rem; align-self: flex-start; margin-top: 12px;">:</span>
                    <div style="text-align: center;">
                      <div class="countdown-box" style="background: ${ctStyle.textColor}15; color: ${ctStyle.textColor};"><span class="countdown-hours" style="font-weight: bold; font-size: 1.25rem;">00</span></div>
                      <span style="display: block; font-size: 9px; color: ${ctStyle.labelColor}; text-transform: uppercase; margin-top: 4px;">Hrs</span>
                    </div>
                    <span style="color: ${ctStyle.textColor}; font-weight: bold; font-size: 1.25rem; align-self: flex-start; margin-top: 12px;">:</span>
                    <div style="text-align: center;">
                      <div class="countdown-box" style="background: ${ctStyle.textColor}15; color: ${ctStyle.textColor};"><span class="countdown-minutes" style="font-weight: bold; font-size: 1.25rem;">00</span></div>
                      <span style="display: block; font-size: 9px; color: ${ctStyle.labelColor}; text-transform: uppercase; margin-top: 4px;">Min</span>
                    </div>
                    <span style="color: ${ctStyle.textColor}; font-weight: bold; font-size: 1.25rem; align-self: flex-start; margin-top: 12px;">:</span>
                    <div style="text-align: center;">
                      <div class="countdown-box" style="background: ${ctStyle.textColor}15; color: ${ctStyle.textColor};"><span class="countdown-seconds" style="font-weight: bold; font-size: 1.25rem;">00</span></div>
                      <span style="display: block; font-size: 9px; color: ${ctStyle.labelColor}; text-transform: uppercase; margin-top: 4px;">Sec</span>
                    </div>
                  ` : ctStyle.style === 'minimal' ? `
                    <span class="countdown-days" style="font-weight: bold; font-size: 1.125rem; color: ${ctStyle.textColor};">00</span>
                    <span style="font-size: 10px; color: ${ctStyle.labelColor};">d</span>
                    <span style="color: ${ctStyle.textColor}; opacity: 0.5; margin: 0 2px;">·</span>
                    <span class="countdown-hours" style="font-weight: bold; font-size: 1.125rem; color: ${ctStyle.textColor};">00</span>
                    <span style="font-size: 10px; color: ${ctStyle.labelColor};">h</span>
                    <span style="color: ${ctStyle.textColor}; opacity: 0.5; margin: 0 2px;">·</span>
                    <span class="countdown-minutes" style="font-weight: bold; font-size: 1.125rem; color: ${ctStyle.textColor};">00</span>
                    <span style="font-size: 10px; color: ${ctStyle.labelColor};">m</span>
                    <span style="color: ${ctStyle.textColor}; opacity: 0.5; margin: 0 2px;">·</span>
                    <span class="countdown-seconds" style="font-weight: bold; font-size: 1.125rem; color: ${ctStyle.textColor};">00</span>
                    <span style="font-size: 10px; color: ${ctStyle.labelColor};">s</span>
                  ` : `
                    <div style="text-align: center; min-width: 40px;">
                      <span class="countdown-days" style="font-weight: bold; font-size: 1.5rem; color: ${ctStyle.textColor};">00</span>
                      <span style="display: block; font-size: 9px; color: ${ctStyle.labelColor}; text-transform: uppercase; letter-spacing: 0.05em;">Days</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px; padding: 0 6px;">
                      <div style="width: 5px; height: 5px; border-radius: 50%; background: ${ctStyle.textColor}; opacity: 0.6;"></div>
                      <div style="width: 5px; height: 5px; border-radius: 50%; background: ${ctStyle.textColor}; opacity: 0.6;"></div>
                    </div>
                    <div style="text-align: center; min-width: 40px;">
                      <span class="countdown-hours" style="font-weight: bold; font-size: 1.5rem; color: ${ctStyle.textColor};">00</span>
                      <span style="display: block; font-size: 9px; color: ${ctStyle.labelColor}; text-transform: uppercase; letter-spacing: 0.05em;">Hrs</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px; padding: 0 6px;">
                      <div style="width: 5px; height: 5px; border-radius: 50%; background: ${ctStyle.textColor}; opacity: 0.6;"></div>
                      <div style="width: 5px; height: 5px; border-radius: 50%; background: ${ctStyle.textColor}; opacity: 0.6;"></div>
                    </div>
                    <div style="text-align: center; min-width: 40px;">
                      <span class="countdown-minutes" style="font-weight: bold; font-size: 1.5rem; color: ${ctStyle.textColor};">00</span>
                      <span style="display: block; font-size: 9px; color: ${ctStyle.labelColor}; text-transform: uppercase; letter-spacing: 0.05em;">Min</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px; padding: 0 6px;">
                      <div style="width: 5px; height: 5px; border-radius: 50%; background: ${ctStyle.textColor}; opacity: 0.6;"></div>
                      <div style="width: 5px; height: 5px; border-radius: 50%; background: ${ctStyle.textColor}; opacity: 0.6;"></div>
                    </div>
                    <div style="text-align: center; min-width: 40px;">
                      <span class="countdown-seconds" style="font-weight: bold; font-size: 1.5rem; color: ${ctStyle.textColor};">00</span>
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
                    
                    // Urgency check - turn red when less than 1 hour remaining
                    if (diff < 3600000 && diff > 0 && !container.classList.contains('countdown-urgent')) {
                      container.classList.add('countdown-urgent');
                      var icon = container.querySelector('.countdown-icon');
                      if (icon) icon.textContent = 'warning';
                      if ('${ctStyle.style}' !== 'minimal') {
                        container.style.background = '#dc2626';
                      }
                    }
                  }
                  
                  updateCountdown();
                  setInterval(updateCountdown, 1000);
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
          ${productsToShow.map((product, productIndex) => {
            const discountPercent = getDiscountPercent(product);
            const loadingAttr = productIndex < 4 ? 'eager' : 'lazy';
            const productLink = product.id && siteId ? `${baseUrl}/products/${generateSlug(product.name)}` : '#';
            
            return `
            <a href="${productLink}" class="deal-card" style="
              display: block;
              text-decoration: none;
              color: inherit;
              background: ${cs.backgroundColor};
              border-radius: ${cs.borderRadius}px;
              overflow: hidden;
              ${cs.showBorder ? `border: 1px solid ${cs.borderColor};` : ''}
              transition: all 0.3s ease;
              position: relative;
            ">
              ${discountPercent > 0 ? `
                <div style="
                  position: absolute;
                  top: 12px;
                  left: 12px;
                  background: ${saleColor};
                  color: white;
                  padding: 4px 10px;
                  border-radius: 4px;
                  font-size: 0.75rem;
                  font-weight: 700;
                  z-index: 10;
                ">-${discountPercent}%</div>
              ` : ''}
              <div style="aspect-ratio: 1/1; background: ${cs.imageBackgroundColor || '#f3f4f6'}; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                ${product.image 
                  ? `<img loading="${loadingAttr}" decoding="async" src="${product.image}" alt="${product.name}" width="400" height="400" style="width: 100%; height: 100%; object-fit: ${cs.imageFit}; background: ${cs.imageBackgroundColor || '#f3f4f6'};">`
                  : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                      <span class="material-icons" style="font-size: 4rem; color: rgba(0,0,0,0.2);">image</span>
                    </div>`
                }
              </div>
              <div style="padding: 16px;">
                <h3 style="font-size: 1rem; font-weight: 600; margin: 0 0 4px 0; color: ${cs.textColor}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${product.name}</h3>
                <p style="font-size: 0.875rem; color: ${cs.descriptionColor}; margin: 0 0 12px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${product.description || 'Premium quality product'}</p>
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    ${product.onSale && product.salePrice ? `
                      <span style="font-size: 1rem; font-weight: 700; color: ${saleColor};">${currencySymbol}${product.salePrice}</span>
                      <span style="font-size: 0.75rem; color: ${cs.priceColor}; text-decoration: line-through; opacity: 0.6;">${currencySymbol}${product.compareAtPrice || product.sellingPrice || product.price}</span>
                    ` : `
                      <span style="font-size: 1rem; font-weight: 600; color: ${cs.priceColor};">${currencySymbol}${product.sellingPrice || product.price}</span>
                    `}
                  </div>
                  <button onclick="event.preventDefault(); event.stopPropagation(); addToCart({id: '${product.id}', name: '${(product.name || '').replace(/'/g, "\\'")}', image: '${product.image || ''}', price: ${product.onSale && product.salePrice ? product.salePrice : (product.sellingPrice || product.price || 0)}});" style="
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
            </a>
          `}).join('')}
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
        .deals-section-container {
          padding: 40px 12px !important;
        }
        .deals-grid { 
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 10px !important;
        }
        .deal-card {
          border-radius: 12px !important;
        }
        .deal-card:hover { transform: none; }
        .deal-card > div:last-child {
          padding: 12px !important;
        }
        .deal-card h3 {
          font-size: 0.85rem !important;
          margin-bottom: 2px !important;
        }
        .deal-card p {
          font-size: 0.7rem !important;
          margin-bottom: 8px !important;
        }
        .deal-card button {
          padding: 5px 10px !important;
          font-size: 0.65rem !important;
        }
        .deal-card > div:last-child > div:last-child {
          flex-direction: column !important;
          align-items: flex-start !important;
          gap: 8px !important;
        }
        .deal-card > div:last-child > div:last-child > div span:first-child {
          font-size: 0.95rem !important;
        }
        .deal-card > div:last-child > div:last-child button {
          width: 100% !important;
          justify-content: center;
        }
      }
    </style>
  `;
}

function builderGenerateCollectionsHTML(data, style, siteId, useCleanUrls = false) {
  const {
    title = 'Shop by Collection',
    subtitle = 'Browse our curated collections',
    layout = 'grid',
    columns = 4,
    selectedCollections = []
  } = data || {};

  const baseUrl = useCleanUrls ? '' : (siteId ? `/site/${siteId}` : '');

  // Title styling
  const titleStyle = data?.titleStyle || {};
  const subtitleStyle = data?.subtitleStyle || {};
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
    backgroundColor: data?.cardStyle?.backgroundColor || '#ffffff',
    textColor: data?.cardStyle?.textColor || '#1f2937',
    borderRadius: data?.cardStyle?.borderRadius ?? 16,
    showBorder: data?.cardStyle?.showBorder || false,
    borderColor: data?.cardStyle?.borderColor || '#e5e7eb',
    imageAspect: data?.cardStyle?.imageAspect || 'square',
    imageFit: data?.cardStyle?.imageFit || 'cover',
    overlayColor: data?.cardStyle?.overlayColor || '#000000',
    overlayOpacity: data?.cardStyle?.overlayOpacity ?? 0.4,
    showName: data?.cardStyle?.showName !== false,
    showDescription: data?.cardStyle?.showDescription || false,
    showProductCount: data?.cardStyle?.showProductCount !== false,
    namePosition: data?.cardStyle?.namePosition || 'overlay',
    // Button styling
    showButton: data?.cardStyle?.showButton !== false,
    buttonText: data?.cardStyle?.buttonText || 'EXPLORE COLLECTION',
    buttonBackgroundColor: data?.cardStyle?.buttonBackgroundColor || 'rgba(255,255,255,0.2)',
    buttonTextColor: data?.cardStyle?.buttonTextColor || '#ffffff',
    buttonBorderRadius: data?.cardStyle?.buttonBorderRadius ?? 4,
    buttonHoverBackgroundColor: data?.cardStyle?.buttonHoverBackgroundColor || '#ffffff',
    buttonHoverTextColor: data?.cardStyle?.buttonHoverTextColor || '#1f2937',
    buttonHoverEffect: data?.cardStyle?.buttonHoverEffect || 'fill'
  };

  // Aspect ratio mapping
  const aspectMap = {
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

  const renderCollectionCard = (collection, index) => {
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
            ? `<img loading="lazy" decoding="async" src="${collection.image}" alt="${collection.name}" style="width: 100%; height: 100%; object-fit: ${cs.imageFit}; ">`
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
                <button class="collection-btn" style="
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

  // Background from style
  const bgStyle = style?.backgroundColor ? `background: ${style.backgroundColor};` : '';
  const textColorStyle = style?.textColor ? `color: ${style.textColor};` : '';

  return `
    <section style="padding: 60px 20px; ${bgStyle} ${textColorStyle}">
      <div style="max-width: 1400px; margin: 0 auto;">
        <div style="margin-bottom: 3rem; text-align: ${titleStyle.textAlign || 'center'};">
          <h2 style="${titleCss}">${title}</h2>
          ${subtitle ? `<p style="${subtitleCss}">${subtitle}</p>` : ''}
        </div>
        <div class="collections-grid" style="display: grid; grid-template-columns: ${gridColumnsCSS}; gap: 24px;">
          ${collectionsToShow.map((collection, i) => renderCollectionCard(collection, i)).join('')}
        </div>
      </div>
    </section>
    <style>
      .collection-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
      .collection-card:hover img { transform: scale(1.1); }
      
      /* Button hover effects */
      .collection-btn {
        position: relative;
        overflow: hidden;
        z-index: 1;
      }
      ${cs.buttonHoverEffect === 'fill' ? `
      .collection-btn::before {
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
      .collection-btn:hover::before {
        width: 100%;
      }
      .collection-btn:hover {
        color: ${cs.buttonHoverTextColor} !important;
        border-color: ${cs.buttonHoverBackgroundColor} !important;
      }
      ` : cs.buttonHoverEffect === 'scale' ? `
      .collection-btn:hover {
        transform: scale(1.05);
        background-color: ${cs.buttonHoverBackgroundColor} !important;
        color: ${cs.buttonHoverTextColor} !important;
      }
      ` : cs.buttonHoverEffect === 'glow' ? `
      .collection-btn:hover {
        box-shadow: 0 0 20px ${cs.buttonHoverBackgroundColor}80, 0 0 40px ${cs.buttonHoverBackgroundColor}40;
        background-color: ${cs.buttonHoverBackgroundColor} !important;
        color: ${cs.buttonHoverTextColor} !important;
      }
      ` : `
      .collection-btn:hover {
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

function builderGenerateTestimonialsHTML(data, style) {
  const items = data.items || [];
  const backgroundColor = style?.backgroundColor || data.backgroundColor || '#ffffff';
  const titleColor = data.titleColor || 'var(--primary-color)';
  const cardBgColor = data.cardBackgroundColor || '#f9fafb';
  const borderRadius = data.borderRadius || 12;
  
  const defaultItems = items.length > 0 ? items : [
    { name: 'John Doe', role: 'Customer', text: 'Great service and amazing products!', rating: 5 },
    { name: 'Jane Smith', role: 'Customer', text: 'Exceeded my expectations!', rating: 5 }
  ];
  
  return `
    <section style="padding: 60px 20px; background: ${backgroundColor};">
      <div style="max-width: 1200px; margin: 0 auto;">
        <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 3rem; color: ${titleColor};">${data.title || 'What Our Customers Say'}</h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 2rem;">
          ${defaultItems
            .map(
              (item) => `
            <div style="padding: 1.5rem; background: ${cardBgColor}; border-radius: ${borderRadius}px; border: 1px solid #e5e7eb;">
              <div style="display: flex; gap: 1rem; align-items: flex-start;">
                ${item.image 
                  ? `<img loading="lazy" decoding="async" src="${item.image}" alt="${item.name}" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />`
                  : `<div style="width: 64px; height: 64px; border-radius: 50%; background: var(--primary-color); opacity: 0.2; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                      <span style="font-size: 1.5rem; color: var(--primary-color); opacity: 1;">${(item.name || 'A').charAt(0)}</span>
                    </div>`
                }
                <div style="flex: 1;">
                  <div style="margin-bottom: 0.5rem; display: flex; gap: 2px;">${Array.from({ length: item.rating || 5 })
                    .map(() => '<span style="color: #facc15;">⭐</span>')
                    .join('')}</div>
                  <p style="font-style: italic; color: #333; margin-bottom: 0.75rem; line-height: 1.6;">"${item.text || ''}"</p>
                  <div>
                    <p style="font-weight: 600; color: var(--primary-color); margin-bottom: 0.125rem;">${item.name || ''}</p>
                    <p style="font-size: 0.875rem; color: #666;">${item.role || ''}</p>
                  </div>
                </div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    </section>
    <style>
      @media (max-width: 768px) {
        section > div > div[style*="grid-template-columns: repeat(2"] {
          grid-template-columns: 1fr !important;
        }
      }
    </style>
  `;
}

function builderGenerateCTAHTML(data, style) {
  const bgColor = style?.backgroundColor || data.backgroundColor || '#27491F';
  const textColor = data.textColor || '#ffffff';
  const buttonBgColor = data.buttonBackgroundColor || '#ffffff';
  const buttonTextColor = data.buttonTextColor || bgColor;
  const buttonRadius = data.buttonBorderRadius || 8;
  const alignment = data.alignment || 'center';
  const backgroundImage = data.backgroundImage;
  
  const bgStyle = backgroundImage 
    ? `background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${backgroundImage}) center/cover;`
    : `background: ${bgColor};`;
  
  return `
    <section style="padding: 80px 20px; ${bgStyle} text-align: ${alignment};">
      <div style="max-width: 800px; margin: 0 auto; ${alignment === 'left' ? 'text-align: left;' : alignment === 'right' ? 'text-align: right;' : ''}">
        <h2 style="font-size: 2.5rem; font-weight: bold; margin-bottom: 1rem; color: ${textColor};">${data.title || 'Ready to Get Started?'}</h2>
        ${data.subtitle ? `<p style="font-size: 1.25rem; margin-bottom: 2rem; color: ${textColor}; opacity: 0.9;">${data.subtitle}</p>` : ''}
        <a href="${data.buttonLink || '#'}" style="display: inline-block; padding: 14px 36px; background: ${buttonBgColor}; color: ${buttonTextColor}; border-radius: ${buttonRadius}px; text-decoration: none; font-weight: 600; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.2s, opacity 0.2s;" onmouseover="this.style.opacity='0.9'; this.style.transform='translateY(-2px)'" onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)'">${data.buttonText || 'Get Started'}</a>
      </div>
    </section>
  `;
}

function builderGenerateAboutHTML(data, style) {
  const backgroundColor = style?.backgroundColor || data.backgroundColor || '#ffffff';
  const textColor = data.textColor || '#666';
  const imagePosition = data.imagePosition || 'right';
  const imageRadius = data.imageRadius || 12;
  const aboutId = `about_${Date.now()}`;
  
  const imageContent = data.image
    ? `<img loading="lazy" decoding="async" src="${data.image}" alt="${data.title || 'About'}" style="width: 100%; height: 400px; object-fit: cover; border-radius: ${imageRadius}px;">`
    : `<div style="width: 100%; height: 400px; background: linear-gradient(135deg, rgba(39,73,31,0.2), rgba(240,202,225,0.2)); border-radius: ${imageRadius}px; display: flex; align-items: center; justify-content: center;"><span class="material-icons" style="font-size: 4rem; color: rgba(0,0,0,0.2);">image</span></div>`;
  
  const textContent = `
    <div>
      <h2 style="font-size: 2.5rem; font-weight: bold; margin-bottom: 1.5rem; color: var(--primary-color);">${data.title || 'About Us'}</h2>
      <div style="color: ${textColor}; line-height: 1.8;">${data.content || 'Your story here...'}</div>
      ${data.buttonText ? `
        <a href="${data.buttonLink || '#'}" style="display: inline-block; margin-top: 2rem; padding: 12px 28px; background: var(--primary-color); color: white; border-radius: 8px; text-decoration: none; font-weight: 600; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">${data.buttonText}</a>
      ` : ''}
    </div>
  `;
  
  return `
    <section style="padding: 60px 20px; background: ${backgroundColor};">
      <div style="max-width: 1200px; margin: 0 auto;">
        <div id="${aboutId}" style="display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center;">
          ${imagePosition === 'left' ? `<div>${imageContent}</div>${textContent}` : `${textContent}<div>${imageContent}</div>`}
        </div>
      </div>
    </section>
    <style>
      @media (max-width: 768px) {
        #${aboutId} {
          grid-template-columns: 1fr !important;
        }
        #${aboutId} > div:first-child {
          order: ${imagePosition === 'left' ? '1' : '2'};
        }
        #${aboutId} > div:last-child {
          order: ${imagePosition === 'left' ? '2' : '1'};
        }
      }
    </style>
  `;
}

function builderGenerateContactHTML(data, style) {
  const backgroundColor = style?.backgroundColor || data.backgroundColor || '#f9fafb';
  const showForm = data.showForm !== false;
  const submitButtonText = data.submitButtonText || 'Send Message';
  const contactId = `contact_${Date.now()}`;
  
  const contactCards = `
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: ${showForm ? '3rem' : '0'};">
      ${data.email ? `
        <div style="text-align: center; padding: 2rem; background: white; border-radius: 12px; border: 1px solid #e5e7eb; transition: box-shadow 0.3s, transform 0.3s;" onmouseover="this.style.boxShadow='0 10px 25px rgba(0,0,0,0.1)'; this.style.transform='translateY(-4px)'" onmouseout="this.style.boxShadow='none'; this.style.transform='translateY(0)'">
          <span class="material-icons" style="font-size: 2.5rem; color: var(--primary-color); margin-bottom: 1rem; display: block;">email</span>
          <h3 style="font-weight: 600; margin-bottom: 0.5rem; color: var(--primary-color);">Email</h3>
          <a href="mailto:${data.email}" style="color: #666; text-decoration: none;">${data.email}</a>
        </div>
      ` : ''}
      ${data.phone ? `
        <div style="text-align: center; padding: 2rem; background: white; border-radius: 12px; border: 1px solid #e5e7eb; transition: box-shadow 0.3s, transform 0.3s;" onmouseover="this.style.boxShadow='0 10px 25px rgba(0,0,0,0.1)'; this.style.transform='translateY(-4px)'" onmouseout="this.style.boxShadow='none'; this.style.transform='translateY(0)'">
          <span class="material-icons" style="font-size: 2.5rem; color: var(--primary-color); margin-bottom: 1rem; display: block;">phone</span>
          <h3 style="font-weight: 600; margin-bottom: 0.5rem; color: var(--primary-color);">Phone</h3>
          <a href="tel:${data.phone}" style="color: #666; text-decoration: none;">${data.phone}</a>
        </div>
      ` : ''}
      ${data.address ? `
        <div style="text-align: center; padding: 2rem; background: white; border-radius: 12px; border: 1px solid #e5e7eb; transition: box-shadow 0.3s, transform 0.3s;" onmouseover="this.style.boxShadow='0 10px 25px rgba(0,0,0,0.1)'; this.style.transform='translateY(-4px)'" onmouseout="this.style.boxShadow='none'; this.style.transform='translateY(0)'">
          <span class="material-icons" style="font-size: 2.5rem; color: var(--primary-color); margin-bottom: 1rem; display: block;">location_on</span>
          <h3 style="font-weight: 600; margin-bottom: 0.5rem; color: var(--primary-color);">Address</h3>
          <p style="color: #666;">${data.address}</p>
        </div>
      ` : ''}
    </div>
  `;
  
  const contactForm = showForm ? `
    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 2rem; border-radius: 12px; border: 1px solid #e5e7eb;">
      <form onsubmit="event.preventDefault(); alert('Thank you for your message! We will get back to you soon.');">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <input type="text" placeholder="Your Name" required style="padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 1rem;" />
          <input type="email" placeholder="Your Email" required style="padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 1rem;" />
        </div>
        <input type="text" placeholder="Subject" style="width: 100%; padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 1rem; margin-bottom: 1rem;" />
        <textarea placeholder="Your Message" rows="5" required style="width: 100%; padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 1rem; resize: vertical; margin-bottom: 1rem;"></textarea>
        <button type="submit" style="width: 100%; padding: 14px; background: var(--primary-color); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">${submitButtonText}</button>
      </form>
    </div>
  ` : '';
  
  return `
    <section style="padding: 60px 20px; background: ${backgroundColor};">
      <div id="${contactId}" style="max-width: 1200px; margin: 0 auto;">
        <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 1rem; color: var(--primary-color);">${data.title || 'Contact Us'}</h2>
        ${data.subtitle ? `<p style="text-align: center; color: #666; margin-bottom: 3rem;">${data.subtitle}</p>` : '<div style="margin-bottom: 3rem;"></div>'}
        ${contactCards}
        ${contactForm}
      </div>
    </section>
    <style>
      @media (max-width: 768px) {
        #${contactId} > div:first-of-type {
          grid-template-columns: 1fr !important;
        }
        #${contactId} form > div:first-child {
          grid-template-columns: 1fr !important;
        }
      }
    </style>
  `;
}

function builderGenerateGalleryHTML(data, style) {
  const images = data.images || [];
  const columns = data.columns || 4;
  const layout = data.layout || 'grid';
  const gap = data.gap || 16;
  const imageRadius = data.imageRadius || 8;
  const backgroundColor = style?.backgroundColor || data.backgroundColor || '#ffffff';
  const galleryId = `gallery_${Date.now()}`;
  
  return `
    <section style="padding: 60px 20px; background: ${backgroundColor};">
      <div style="max-width: 1200px; margin: 0 auto;">
        <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 1rem; color: var(--primary-color);">${data.title || 'Our Gallery'}</h2>
        ${data.subtitle ? `<p style="text-align: center; color: #666; margin-bottom: 3rem;">${data.subtitle}</p>` : '<div style="margin-bottom: 3rem;"></div>'}
        <div id="${galleryId}" style="display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: ${gap}px; ${layout === 'masonry' ? 'grid-auto-rows: 10px;' : ''}">
          ${
            images.length > 0
              ? images
                  .map(
                    (img, index) => `
            <div class="gallery-item" style="aspect-ratio: ${layout === 'masonry' ? (index % 3 === 0 ? '4/5' : index % 3 === 1 ? '1/1' : '4/3') : '1/1'}; overflow: hidden; border-radius: ${imageRadius}px; cursor: pointer; position: relative;" onclick="openGalleryLightbox('${img.url || ''}', '${(img.caption || img.alt || '').replace(/'/g, "\\'")}')">
              <img loading="lazy" decoding="async" src="${img.url || img || ''}" alt="${img.alt || ''}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s, filter 0.3s;" onmouseover="this.style.transform='scale(1.05)'; this.style.filter='brightness(1.1)'" onmouseout="this.style.transform='scale(1)'; this.style.filter='brightness(1)'">
              <div style="position: absolute; inset: 0; background: rgba(0,0,0,0); transition: background 0.3s; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0;" onmouseover="this.style.background='rgba(0,0,0,0.3)'; this.style.opacity='1'" onmouseout="this.style.background='rgba(0,0,0,0)'; this.style.opacity='0'">
                <span class="material-icons" style="color: white; font-size: 2rem; margin-bottom: 0.5rem;">zoom_in</span>
                ${img.caption ? `<p style="color: white; font-size: 0.875rem; padding: 0 1rem; text-align: center;">${img.caption}</p>` : ''}
              </div>
            </div>
          `
                  )
                  .join('')
              : Array.from({ length: 8 })
                  .map(
                    () => `
            <div style="aspect-ratio: 1; background: linear-gradient(135deg, rgba(39,73,31,0.2), rgba(240,202,225,0.2)); border-radius: ${imageRadius}px; display: flex; align-items: center; justify-content: center;">
              <span class="material-icons" style="font-size: 3rem; color: rgba(0,0,0,0.2);">image</span>
            </div>
          `
                  )
                  .join('')
          }
        </div>
      </div>
    </section>
    <!-- Gallery Lightbox -->
    <div id="gallery-lightbox" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 1000; cursor: pointer;" onclick="closeGalleryLightbox()">
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); max-width: 90vw; max-height: 90vh;" onclick="event.stopPropagation()">
        <img id="lightbox-img" src="" alt="" style="max-width: 100%; max-height: 85vh; object-fit: contain; border-radius: 8px;">
        <p id="lightbox-caption" style="color: white; text-align: center; margin-top: 1rem; font-size: 1rem;"></p>
      </div>
      <button onclick="closeGalleryLightbox()" style="position: absolute; top: 1rem; right: 1rem; background: rgba(0,0,0,0.5); border: none; border-radius: 50%; width: 48px; height: 48px; cursor: pointer; color: white; display: flex; align-items: center; justify-content: center;">
        <span class="material-icons">close</span>
      </button>
    </div>
    <script>
      function openGalleryLightbox(url, caption) {
        document.getElementById('lightbox-img').src = url;
        document.getElementById('lightbox-caption').textContent = caption;
        document.getElementById('gallery-lightbox').style.display = 'block';
        document.body.style.overflow = 'hidden';
      }
      function closeGalleryLightbox() {
        document.getElementById('gallery-lightbox').style.display = 'none';
        document.body.style.overflow = 'auto';
      }
    </script>
    <style>
      @media (max-width: 1024px) {
        #${galleryId} { grid-template-columns: repeat(3, 1fr) !important; }
      }
      @media (max-width: 768px) {
        #${galleryId} { grid-template-columns: repeat(2, 1fr) !important; }
      }
    </style>
  `;
}

function builderGeneratePricingHTML(data, style) {
  const plans = data.plans || [];
  const currency = data.currency || '$';
  const billingPeriod = data.billingPeriod || '/month';
  const backgroundColor = style?.backgroundColor || data.backgroundColor || '#f9fafb';
  const cardBgColor = data.cardBackgroundColor || '#ffffff';
  const highlightColor = data.highlightColor || 'var(--primary-color)';
  const borderRadius = data.borderRadius || 12;
  
  const defaultPlans = plans.length > 0 ? plans : [
    { name: 'Basic', price: 29, features: ['5 Products', 'Basic Analytics', 'Email Support'], highlighted: false },
    { name: 'Pro', price: 79, features: ['50 Products', 'Advanced Analytics', 'Priority Support', 'Custom Domain'], highlighted: true },
    { name: 'Enterprise', price: 199, features: ['Unlimited Products', 'Full Analytics', '24/7 Support', 'Custom Domain', 'API Access'], highlighted: false }
  ];
  
  return `
    <section style="padding: 60px 20px; background: ${backgroundColor};">
      <div style="max-width: 1200px; margin: 0 auto;">
        <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 1rem; color: var(--primary-color);">${data.title || 'Pricing Plans'}</h2>
        ${data.subtitle ? `<p style="text-align: center; color: #666; margin-bottom: 3rem;">${data.subtitle}</p>` : '<div style="margin-bottom: 3rem;"></div>'}
        <div style="display: grid; grid-template-columns: repeat(${defaultPlans.length > 3 ? 4 : defaultPlans.length}, 1fr); gap: 2rem; align-items: stretch;">
          ${defaultPlans
            .map(
              (plan) => `
            <div style="background: ${cardBgColor}; padding: 2rem; border-radius: ${borderRadius}px; border: ${plan.highlighted ? `2px solid ${highlightColor}` : '1px solid #e5e7eb'}; box-shadow: ${plan.highlighted ? '0 8px 30px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.1)'}; position: relative; ${plan.highlighted ? 'transform: scale(1.05);' : ''}">
              ${plan.highlighted ? `<div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: ${highlightColor}; color: white; padding: 4px 16px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">POPULAR</div>` : ''}
              <h3 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem; color: var(--primary-color);">${plan.name || ''}</h3>
              <div style="margin-bottom: 1.5rem;">
                <span style="font-size: 2.5rem; font-weight: bold; color: var(--primary-color);">${currency}${plan.price || 0}</span>
                <span style="color: #666;">${billingPeriod}</span>
              </div>
              <ul style="list-style: none; margin-bottom: 2rem; padding: 0;">
                ${(plan.features || [])
                  .map(
                    (feature) => `
                  <li style="padding: 0.5rem 0; display: flex; align-items: center; gap: 0.5rem;">
                    <span class="material-icons" style="color: #10b981; font-size: 1.25rem;">check_circle</span>
                    <span style="color: #666;">${feature}</span>
                  </li>
                `
                  )
                  .join('')}
              </ul>
              <button style="width: 100%; padding: 0.75rem; background: ${plan.highlighted ? highlightColor : 'var(--primary-color)'}; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">${plan.buttonText || 'Get Started'}</button>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    </section>
    <style>
      @media (max-width: 1024px) {
        section > div > div[style*="grid-template-columns: repeat"] {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        section > div > div[style*="grid-template-columns: repeat"] > div[style*="transform: scale"] {
          transform: none !important;
        }
      }
      @media (max-width: 640px) {
        section > div > div[style*="grid-template-columns: repeat"] {
          grid-template-columns: 1fr !important;
        }
      }
    </style>
  `;
}

function builderGenerateFAQHTML(data) {
  const items = data.items || [];
  return `
    <section style="padding: 60px 20px; background: white;">
      <div style="max-width: 800px; margin: 0 auto;">
        <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 3rem; color: var(--primary-color);">${data.title || 'FAQ'}</h2>
        <div>
          ${
            items.length > 0
              ? items
                  .map(
                    (item) => `
            <div class="faq-item" style="border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 1rem; overflow: hidden;">
              <button class="faq-button" style="width: 100%; padding: 1.25rem; text-align: left; background: #f9fafb; border: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 600; color: var(--primary-color);">${item.question || ''}</span>
                <span class="material-icons faq-icon" style="color: var(--primary-color);">expand_more</span>
              </button>
              <div class="faq-content" style="display: none; padding: 1.25rem; color: #666;">${item.answer || ''}</div>
            </div>
          `
                  )
                  .join('')
              : ''
          }
        </div>
      </div>
    </section>
  `;
}

function builderGenerateFooterHTML(data, style, siteId = '', siteSettings = {}, useCleanUrls = false) {
  const {
    layout = 'classic',
    logoText = 'BRAND',
    logo = '',
    tagline = 'Sign up for exclusive offers and be the first to know about new arrivals.',
    copyrightText = `© ${new Date().getFullYear()} Brand. All rights reserved.`,
    columns = [],
    policyLinks = [],
    socialLinks = [],
    socialIconBackgroundColor = '#1f2937',
    socialIconHoverBackgroundColor = '#27491F',
    newsletterText = 'Subscribe to get special offers and updates.',
    newsletterPlaceholder = 'Your email'
  } = data || {};

  // Always show newsletter - override saved data (sites built before had showNewsletter: false)
  const showNewsletter = true;

  const isMinimal = layout === 'minimal';
  const bgColor = style?.backgroundColor || (isMinimal ? '#ffffff' : '#111827');
  const textColor = style?.color || (isMinimal ? '#1f2937' : '#ffffff');
  const mutedTextColor = isMinimal ? '#9ca3af' : '#9ca3af';
  const linkColor = isMinimal ? '#6b7280' : '#9ca3af';
  const borderColor = isMinimal ? '#e5e7eb' : '#374151';
  
  const baseUrl = useCleanUrls ? '' : (siteId ? `/site/${siteId}` : '');
  const pages = siteSettings?.pages || {};

  // Generate policy links based on enabled pages
  const generatePolicyLinks = () => {
    const links = [];
    if (pages.privacyPolicy?.enabled) links.push({ label: 'Privacy Policy', link: `${baseUrl}/privacy-policy` });
    if (pages.returnPolicy?.enabled) links.push({ label: 'Return Policy', link: `${baseUrl}/return-policy` });
    if (pages.termsOfService?.enabled) links.push({ label: 'Terms of Service', link: `${baseUrl}/terms-of-service` });
    if (pages.shippingPolicy?.enabled) links.push({ label: 'Shipping Policy', link: `${baseUrl}/shipping-policy` });
    return links;
  };

  // Generate company links based on enabled pages  
  const generateCompanyLinks = () => {
    const links = [];
    if (pages.aboutUs?.enabled) links.push({ label: 'About Us', link: `${baseUrl}/about-us` });
    if (pages.faq?.enabled) links.push({ label: 'FAQ', link: `${baseUrl}/faq` });
    links.push({ label: 'Products', link: `${baseUrl}/products` });
    return links;
  };

  // Process footer link to add baseUrl if needed
  const processFooterLink = (link) => {
    if (!link || link === '#') return link || '#';
    if (link.startsWith('http')) return link;
    if (link.startsWith('/site/')) return link;
    if (siteId && link.startsWith('/')) return `${baseUrl}${link}`;
    return link;
  };

  const defaultColumns = columns.length === 0 ? [
    { title: 'Company', links: generateCompanyLinks() },
    { title: 'Support', links: generatePolicyLinks().length > 0 ? generatePolicyLinks() : [{ label: 'Help Center', link: '#' }] },
    { title: 'Connect', links: [{ label: 'Facebook', link: '#' }, { label: 'Twitter', link: '#' }, { label: 'Instagram', link: '#' }] }
  ] : columns.map(col => ({
    ...col,
    links: col.links?.map(link => ({
      ...link,
      link: processFooterLink(link.link)
    }))
  }));

  const defaultPolicyLinks = policyLinks.length === 0 ? generatePolicyLinks() : policyLinks.map(link => ({
    ...link,
    link: processFooterLink(link.link)
  }));

  // Build social links from siteSettings.socialLinks
  const buildSocialLinksFromSettings = () => {
    const links = [];
    const settingsSocial = siteSettings?.socialLinks || {};
    
    // Add default platforms if they have URLs
    if (settingsSocial.facebook) links.push({ platform: 'Facebook', icon: 'facebook', link: settingsSocial.facebook });
    if (settingsSocial.instagram) links.push({ platform: 'Instagram', icon: 'camera_alt', link: settingsSocial.instagram });
    if (settingsSocial.twitter) links.push({ platform: 'Twitter', icon: 'tag', link: settingsSocial.twitter });
    if (settingsSocial.tiktok) links.push({ platform: 'TikTok', icon: 'music_note', link: settingsSocial.tiktok });
    if (settingsSocial.youtube) links.push({ platform: 'YouTube', icon: 'play_circle', link: settingsSocial.youtube });
    if (settingsSocial.linkedin) links.push({ platform: 'LinkedIn', icon: 'work', link: settingsSocial.linkedin });
    
    // Add custom social links
    if (settingsSocial.custom && settingsSocial.custom.length > 0) {
      settingsSocial.custom.forEach(customLink => {
        if (customLink.url) {
          links.push({
            platform: customLink.name || 'Custom',
            icon: customLink.icon || 'link',
            link: customLink.url,
            isCustom: true,
            fontAwesomeIcon: customLink.icon
          });
        }
      });
    }
    
    return links;
  };

  // Use social links from siteSettings if available, otherwise use section data
  const socialLinksFromSettings = buildSocialLinksFromSettings();
  const defaultSocialLinks = socialLinksFromSettings.length > 0 
    ? socialLinksFromSettings 
    : (socialLinks.length === 0 ? [
        { platform: 'Facebook', icon: 'facebook', link: '#' },
        { platform: 'Instagram', icon: 'camera_alt', link: '#' },
        { platform: 'TikTok', icon: 'music_note', link: '#' }
      ] : socialLinks);

  // Generate social icon (SVG for known platforms, Font Awesome for custom)
  const getSocialIcon = (social, color) => {
    // If it's a custom social link with Font Awesome icon
    if (social.isCustom && social.fontAwesomeIcon && social.fontAwesomeIcon.includes('fa-')) {
      return `<i class="${social.fontAwesomeIcon}" style="font-size: 20px; color: ${color};"></i>`;
    }
    
    // Built-in platform icons as SVG
    switch (social.platform) {
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
      case 'Snapchat':
        return `<svg width="20" height="20" fill="${color}" viewBox="0 0 24 24"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/></svg>`;
      case 'WhatsApp':
        return `<svg width="20" height="20" fill="${color}" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
      case 'Pinterest':
        return `<svg width="20" height="20" fill="${color}" viewBox="0 0 24 24"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/></svg>`;
      case 'Discord':
        return `<svg width="20" height="20" fill="${color}" viewBox="0 0 24 24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/></svg>`;
      default:
        // For custom links, try to use Font Awesome if specified
        if (social.fontAwesomeIcon && social.fontAwesomeIcon.includes('fa-')) {
          return `<i class="${social.fontAwesomeIcon}" style="font-size: 20px; color: ${color};"></i>`;
        }
        return `<span class="material-icons" style="font-size: 20px; color: ${color};">link</span>`;
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
                `<img loading="lazy" decoding="async" src="${logo}" alt="${logoText}" style="height: 32px; margin-bottom: 16px;" />` :
                `<h3 style="font-size: 1.75rem; font-weight: bold; margin-bottom: 16px; color: ${textColor};">${logoText}</h3>`
              }
              <p style="font-size: 0.875rem; line-height: 1.6; color: ${mutedTextColor};">${tagline}</p>
            </div>

            <!-- Right Side - Newsletter -->
            <div style="flex: 1; max-width: 500px;">
              <h4 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.75rem; color: ${textColor};">Newsletter</h4>
              <p style="font-size: 0.875rem; color: ${mutedTextColor}; margin-bottom: 12px;">${newsletterText}</p>
              <form class="newsletter-form footer-newsletter-inline" onsubmit="return window.newsletterSubscribe && window.newsletterSubscribe(event, this);">
                <input type="email" name="email" placeholder="${newsletterPlaceholder}" required />
                <button type="submit" class="newsletter-submit-btn">Subscribe</button>
              </form>
              <p class="newsletter-message" style="font-size: 0.8rem; margin-top: 8px; display: none;"></p>
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
                ${defaultPolicyLinks.map(link => `
                  <a href="${link.link || '#'}" style="color: ${mutedTextColor}; text-decoration: none; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">${link.label}</a>
                `).join('')}
              </div>

              <!-- Right - Social Icons -->
              ${defaultSocialLinks.length > 0 ? `
                <div style="display: flex; align-items: center; gap: 16px;">
                  ${defaultSocialLinks.map(social => `
                    <a href="${social.link || '#'}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
                      ${getSocialIcon(social, textColor)}
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
        window.newsletterSubscribe = function(e, form) {
          e.preventDefault();
          var emailInput = form.querySelector('input[name="email"]');
          var btn = form.querySelector('.newsletter-submit-btn');
          var msgEl = form.querySelector('.newsletter-message');
          if (!emailInput || !emailInput.value.trim()) return false;
          var email = emailInput.value.trim();
          if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }
          if (msgEl) { msgEl.style.display = 'none'; msgEl.textContent = ''; }
          fetch('https://us-central1-${(config.FIREBASE_PROJECT_ID || 'madas-store')}.cloudfunctions.net/api/api/newsletter/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
          }).then(function(r) { return r.json().then(function(data) { return { ok: r.ok, data: data }; }); }).then(function(result) {
            if (msgEl) {
              msgEl.textContent = result.ok ? (result.data.message || 'Thanks for subscribing!') : (result.data.message || 'Something went wrong. Please try again.');
              msgEl.style.display = 'block';
              msgEl.style.color = result.ok ? '' : '#dc2626';
            }
            if (result.ok) form.reset();
          }).catch(function() {
            if (msgEl) { msgEl.textContent = 'Something went wrong. Please try again.'; msgEl.style.display = 'block'; msgEl.style.color = '#dc2626'; }
          }).finally(function() {
            if (btn) { btn.disabled = false; btn.textContent = 'Subscribe'; }
          });
          return false;
        };
      </script>
      
      <style>
        .footer-newsletter-inline { display: flex; align-items: center; flex-wrap: wrap; }
        .footer-newsletter-inline input { flex: 1; min-width: 160px; padding: 12px 16px; border: 1px solid ${borderColor}; border-radius: 8px 0 0 8px; font-size: 0.875rem; color: ${textColor}; background: transparent; outline: none; }
        .footer-newsletter-inline button { padding: 12px 16px; border: 1px solid ${borderColor}; border-left: none; border-radius: 0 8px 8px 0; background: var(--primary-color, #27491F); color: white; cursor: pointer; font-weight: 600; font-size: 0.875rem; }
        @media (max-width: 639px) {
          .footer-newsletter-inline { flex-direction: column; }
          .footer-newsletter-inline input { border-radius: 8px 8px 0 0; min-width: 100%; }
          .footer-newsletter-inline button { border-radius: 0 0 8px 8px; border-left: 1px solid ${borderColor}; border-top: none; width: 100%; }
        }
        @media (min-width: 1024px) {
          .footer-main { flex-direction: row !important; justify-content: space-between !important; align-items: flex-start !important; }
          .footer-bottom { flex-direction: row !important; justify-content: space-between !important; }
          .footer-bottom > div:first-child { justify-content: flex-start !important; }
        }
      </style>
    `;
  }

  // Classic Layout (responsive like web builder: 1 col mobile, 2 at 768px, 4 at 1024px)
  return `
    <footer class="footer-responsive" style="background-color: ${bgColor}; color: ${textColor}; width: 100%;">
      <div style="max-width: 1280px; margin: 0 auto; padding: 48px 24px;">
        <div class="footer-grid" style="display: grid; grid-template-columns: 1fr; gap: 32px; margin-bottom: 0;">
          <!-- Logo/Brand Column -->
          <div>
            ${logo ? 
              `<img loading="lazy" decoding="async" src="${logo}" alt="${logoText}" style="height: 32px; margin-bottom: 1rem;" />` :
              `<h3 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: ${textColor};">${logoText}</h3>`
            }
            <p style="font-size: 0.875rem; color: ${mutedTextColor}; margin-bottom: 1rem;">
              ${tagline}
            </p>
            ${defaultSocialLinks.length > 0 ? `
              <div style="display: flex; gap: 0.75rem;">
                ${defaultSocialLinks.map(social => `
                  <a href="${social.link}" target="_blank" rel="noopener noreferrer" style="width: 36px; height: 36px; border-radius: 50%; background: ${socialIconBackgroundColor}; display: flex; align-items: center; justify-content: center; text-decoration: none; transition: background 0.3s;" onmouseover="this.style.background='${socialIconHoverBackgroundColor}'" onmouseout="this.style.background='${socialIconBackgroundColor}'">
                    <span class="material-icons" style="color: ${textColor}; font-size: 18px;">${social.icon || 'link'}</span>
                  </a>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <!-- Link Columns (max 2 so Newsletter stays as 4th column like web builder) -->
          ${defaultColumns.slice(0, 2).map(column => `
            <div>
              <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 1rem; color: ${textColor};">${column.title || ''}</h4>
              <ul style="list-style: none; padding: 0; margin: 0;">
                ${(column.links || []).map(link => `
                  <li style="margin-bottom: 0.5rem;">
                    <a href="${link.link || '#'}" style="font-size: 0.875rem; color: ${linkColor}; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='${textColor}'" onmouseout="this.style.color='${linkColor}'">${link.label || ''}</a>
                  </li>
                `).join('')}
              </ul>
            </div>
          `).join('')}

          <!-- Newsletter Column (4th position - rightmost on desktop, last on mobile) -->
          ${showNewsletter ? `
            <div class="footer-newsletter">
              <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; color: ${textColor};">Newsletter</h4>
              <p style="font-size: 0.875rem; color: ${mutedTextColor}; margin-bottom: 1rem;">${newsletterText}</p>
              <form class="newsletter-form" onsubmit="return window.newsletterSubscribe && window.newsletterSubscribe(event, this);">
                <input type="email" name="email" placeholder="${newsletterPlaceholder}" required />
                <button type="submit" class="newsletter-submit-btn">Subscribe</button>
                <p class="newsletter-message"></p>
              </form>
            </div>
          ` : ''}
        </div>

        <!-- Bottom Bar -->
        <div class="footer-bottom-bar" style="margin-top: 48px; padding-top: 32px; border-top: 1px solid ${borderColor};">
          <div class="footer-bottom-inner" style="display: flex; flex-direction: column; gap: 1rem; align-items: center; text-align: center;">
            <p style="font-size: 0.875rem; color: ${mutedTextColor}; margin: 0;">
              ${copyrightText}
            </p>
            <div class="footer-policy-links" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; font-size: 0.875rem;">
              <a href="${(defaultPolicyLinks.find(l => /privacy/i.test(l.label || '')) || defaultPolicyLinks[0])?.link || baseUrl + '/privacy-policy' || '#'}" style="color: ${mutedTextColor}; text-decoration: none; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">Privacy Policy</a>
              <a href="${(defaultPolicyLinks.find(l => /terms/i.test(l.label || '')) || defaultPolicyLinks[1])?.link || baseUrl + '/terms-of-service' || '#'}" style="color: ${mutedTextColor}; text-decoration: none; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">Terms of Service</a>
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
      window.newsletterSubscribe = function(e, form) {
        e.preventDefault();
        var emailInput = form.querySelector('input[name="email"]');
        var btn = form.querySelector('.newsletter-submit-btn');
        var msgEl = form.querySelector('.newsletter-message');
        if (!emailInput || !emailInput.value.trim()) return false;
        var email = emailInput.value.trim();
        if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }
        if (msgEl) { msgEl.style.display = 'none'; msgEl.textContent = ''; }
        fetch('https://us-central1-${(config.FIREBASE_PROJECT_ID || 'madas-store')}.cloudfunctions.net/api/api/newsletter/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email })
        }).then(function(r) { return r.json().then(function(data) { return { ok: r.ok, data: data }; }); }).then(function(result) {
          if (msgEl) {
            msgEl.textContent = result.ok ? (result.data.message || 'Thanks for subscribing!') : (result.data.message || 'Something went wrong. Please try again.');
            msgEl.style.display = 'block';
            msgEl.style.color = result.ok ? '' : '#dc2626';
          }
          if (result.ok) form.reset();
        }).catch(function() {
          if (msgEl) { msgEl.textContent = 'Something went wrong. Please try again.'; msgEl.style.display = 'block'; msgEl.style.color = '#dc2626'; }
        }).finally(function() {
          if (btn) { btn.disabled = false; btn.textContent = 'Subscribe'; }
        });
        return false;
      };
    </script>
    
    <style>
      .footer-responsive { box-sizing: border-box; width: 100%; max-width: 100%; overflow-x: hidden; }
      .footer-responsive * { box-sizing: border-box; }
      .footer-grid { min-width: 0; }
      .footer-newsletter .newsletter-form {
        display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: stretch; width: 100%;
      }
      .footer-newsletter .newsletter-form input {
        flex: 1; min-width: 0; padding: 12px 16px; border-radius: 8px 0 0 8px;
        background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2);
        color: ${textColor}; font-size: 0.875rem; outline: none;
      }
      .footer-newsletter .newsletter-form input::placeholder { color: ${mutedTextColor}; opacity: 0.8; }
      .footer-newsletter .newsletter-form button {
        padding: 12px 20px; background: white; color: ${bgColor}; border: none;
        border-radius: 0 8px 8px 0; font-weight: 600; font-size: 0.875rem; cursor: pointer;
        flex-shrink: 0;
      }
      .footer-newsletter .newsletter-message {
        font-size: 0.8rem; margin-top: 8px; display: none; color: ${mutedTextColor}; flex-basis: 100%;
      }
      .footer-bottom-inner p { word-wrap: break-word; max-width: 100%; }
      .footer-policy-links { flex-wrap: wrap; justify-content: center; gap: 12px; }
      @media (max-width: 639px) {
        .footer-responsive > div { padding: 32px 16px !important; }
        .footer-grid { gap: 24px !important; }
        .footer-bottom-bar { margin-top: 32px !important; padding-top: 24px !important; }
        .footer-newsletter .newsletter-form { flex-direction: column; }
        .footer-newsletter .newsletter-form input { border-radius: 8px 8px 0 0; min-width: 100%; }
        .footer-newsletter .newsletter-form button { border-radius: 0 0 8px 8px; width: 100%; border-left: 1px solid rgba(255,255,255,0.2); border-top: none; }
        #backToTop { bottom: 16px !important; right: 16px !important; width: 44px !important; height: 44px !important; }
      }
      @media (max-width: 479px) {
        .footer-responsive > div { padding: 24px 12px !important; }
        .footer-grid { gap: 20px !important; }
        .footer-bottom-inner { gap: 0.75rem !important; }
      }
      @media (min-width: 768px) {
        .footer-grid { grid-template-columns: repeat(2, 1fr) !important; }
        .footer-bottom-inner { flex-direction: row !important; justify-content: space-between !important; text-align: left !important; align-items: center !important; }
        .footer-policy-links { flex-wrap: nowrap; justify-content: flex-end; }
      }
      @media (min-width: 1024px) {
        .footer-grid { grid-template-columns: repeat(4, 1fr) !important; }
      }
    </style>
  `;
}

function builderGenerateStatsHTML(data, style) {
  const { title, subtitle, stats = [], animated = true } = data || {};
  const backgroundColor = style?.backgroundColor || data.backgroundColor || 'linear-gradient(135deg, var(--primary-color), rgba(39, 73, 31, 0.8))';
  const valueColor = data.valueColor || '#ffffff';
  const labelColor = data.labelColor || 'rgba(255,255,255,0.8)';
  const statsId = `stats_${Date.now()}`;
  
  const defaultStats = stats.length > 0 ? stats : [
    { value: '10K+', label: 'Happy Customers', icon: '😊' },
    { value: '500+', label: 'Products Sold', icon: '📦' },
    { value: '99%', label: 'Satisfaction Rate', icon: '⭐' },
    { value: '24/7', label: 'Support Available', icon: '💬' }
  ];
  
  const columns = defaultStats.length > 4 ? 4 : defaultStats.length;
  
  return `
    <section style="padding: 60px 20px; background: ${backgroundColor};">
      <div style="max-width: 1200px; margin: 0 auto;">
        ${title || subtitle ? `
          <div style="text-align: center; margin-bottom: 48px;">
            ${title ? `<h2 style="font-size: 2.5rem; font-weight: bold; color: ${valueColor}; margin-bottom: 1rem;">${title}</h2>` : ''}
            ${subtitle ? `<p style="font-size: 1.125rem; color: ${labelColor};">${subtitle}</p>` : ''}
          </div>
        ` : ''}
        <div id="${statsId}" style="display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 2rem;">
          ${defaultStats.map((stat, index) => `
            <div style="text-align: center; padding: 2rem; border-radius: 16px; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);">
              ${stat.icon ? `<div style="font-size: 2.5rem; margin-bottom: 0.75rem;">${stat.icon}</div>` : ''}
              <div class="stat-value" data-value="${stat.value}" style="font-size: 3rem; font-weight: bold; color: ${valueColor}; margin-bottom: 0.5rem;">${stat.prefix || ''}${animated ? '0' : stat.value}${stat.suffix || ''}</div>
              <div style="font-size: 1rem; color: ${labelColor}; font-weight: 500;">${stat.label}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
    ${animated ? `
    <script>
      (function() {
        const statsSection = document.getElementById('${statsId}');
        const statValues = statsSection.querySelectorAll('.stat-value');
        let animated = false;
        
        function animateStats() {
          if (animated) return;
          animated = true;
          
          statValues.forEach(el => {
            const finalValue = el.dataset.value;
            const numMatch = finalValue.match(/([\\d,]+)/);
            if (numMatch) {
              const num = parseInt(numMatch[1].replace(/,/g, ''));
              const prefix = finalValue.slice(0, finalValue.indexOf(numMatch[1]));
              const suffix = finalValue.slice(finalValue.indexOf(numMatch[1]) + numMatch[1].length);
              let current = 0;
              const step = num / 50;
              const interval = setInterval(() => {
                current += step;
                if (current >= num) {
                  current = num;
                  clearInterval(interval);
                }
                el.textContent = prefix + Math.floor(current).toLocaleString() + suffix;
              }, 30);
            } else {
              el.textContent = finalValue;
            }
          });
        }
        
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              animateStats();
            }
          });
        }, { threshold: 0.3 });
        
        observer.observe(statsSection);
      })();
    </script>
    ` : ''}
    <style>
      @media (max-width: 1024px) {
        #${statsId} { grid-template-columns: repeat(2, 1fr) !important; }
      }
      @media (max-width: 640px) {
        #${statsId} { grid-template-columns: 1fr !important; }
        #${statsId} > div { padding: 1.5rem !important; }
        #${statsId} .stat-value { font-size: 2.5rem !important; }
      }
    </style>
  `;
}

function builderGenerateTeamHTML(data, style) {
  const { title = 'Meet Our Team', subtitle = '', members = [], columns = 4 } = data || {};
  const backgroundColor = style?.backgroundColor || data.backgroundColor || '#ffffff';
  const teamId = `team_${Date.now()}`;
  
  const defaultMembers = members.length > 0 ? members : [
    { name: 'John Doe', role: 'CEO & Founder', bio: 'Visionary leader' },
    { name: 'Jane Smith', role: 'CTO', bio: 'Tech innovator' },
    { name: 'Mike Johnson', role: 'Lead Designer', bio: 'Creative mind' },
    { name: 'Sarah Wilson', role: 'Marketing Head', bio: 'Growth expert' }
  ];
  
  const gridColumns = members.length > 0 ? Math.min(columns, members.length) : Math.min(4, defaultMembers.length);
  
  return `
    <section style="padding: 60px 20px; background: ${backgroundColor};">
      <div style="max-width: 1200px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 48px;">
          <h2 style="font-size: 2.5rem; font-weight: bold; color: var(--primary-color); margin-bottom: 1rem;">${title}</h2>
          ${subtitle ? `<p style="font-size: 1.125rem; color: #666;">${subtitle}</p>` : ''}
        </div>
        <div id="${teamId}" style="display: grid; grid-template-columns: repeat(${gridColumns}, 1fr); gap: 2rem;">
          ${defaultMembers.map(member => `
            <div style="text-align: center; padding: 1.5rem; border-radius: 16px; border: 1px solid #e5e7eb; transition: box-shadow 0.3s, transform 0.3s;" onmouseover="this.style.boxShadow='0 10px 30px rgba(0,0,0,0.1)'; this.style.transform='translateY(-4px)'" onmouseout="this.style.boxShadow='none'; this.style.transform='translateY(0)'">
              <div style="width: 128px; height: 128px; margin: 0 auto 1rem; border-radius: 50%; overflow: hidden; border: 4px solid rgba(39, 73, 31, 0.2);">
                ${member.image ? 
                  `<img loading="lazy" decoding="async" src="${member.image}" alt="${member.name}" style="width: 100%; height: 100%; object-fit: cover;" />` :
                  `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, rgba(39, 73, 31, 0.2), rgba(240, 202, 225, 0.2)); display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 3rem; font-weight: bold; color: var(--primary-color);">${(member.name || 'T').charAt(0)}</span>
                  </div>`
                }
              </div>
              <h3 style="font-size: 1.25rem; font-weight: bold; color: var(--primary-color); margin-bottom: 0.25rem;">${member.name}</h3>
              <p style="font-size: 0.875rem; color: var(--secondary-color); font-weight: 500; margin-bottom: 0.75rem;">${member.role}</p>
              ${member.bio ? `<p style="font-size: 0.875rem; color: #666;">${member.bio}</p>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </section>
    <style>
      @media (max-width: 1024px) {
        #${teamId} { grid-template-columns: repeat(2, 1fr) !important; }
      }
      @media (max-width: 640px) {
        #${teamId} { grid-template-columns: 1fr !important; }
      }
    </style>
  `;
}

function builderGenerateServicesHTML(data, style) {
  const { title = 'Our Services', subtitle = '', services = [], layout = 'grid' } = data || {};
  const backgroundColor = style?.backgroundColor || data.backgroundColor || '#f9fafb';
  const servicesId = `services_${Date.now()}`;
  
  const defaultServices = services.length > 0 ? services : [
    { icon: '🚀', title: 'Fast Delivery', description: 'Get your products delivered within 24-48 hours', price: 'Free' },
    { icon: '🛡️', title: 'Secure Payment', description: 'Multiple secure payment options available' },
    { icon: '🔄', title: 'Easy Returns', description: '30-day hassle-free return policy' }
  ];
  
  const columns = Math.min(defaultServices.length, layout === 'list' ? 1 : 3);
  
  if (layout === 'list') {
    return `
      <section style="padding: 60px 20px; background: ${backgroundColor};">
        <div style="max-width: 800px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 48px;">
            <h2 style="font-size: 2.5rem; font-weight: bold; color: var(--primary-color); margin-bottom: 1rem;">${title}</h2>
            ${subtitle ? `<p style="font-size: 1.125rem; color: #666;">${subtitle}</p>` : ''}
          </div>
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            ${defaultServices.map(service => `
              <div style="display: flex; gap: 1.5rem; padding: 1.5rem; background: white; border-radius: 12px; border: 1px solid #e5e7eb; align-items: center;">
                <div style="width: 64px; height: 64px; border-radius: 12px; background: rgba(39, 73, 31, 0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <span style="font-size: 2rem;">${service.icon}</span>
                </div>
                <div style="flex: 1;">
                  <h3 style="font-size: 1.125rem; font-weight: bold; color: var(--primary-color); margin-bottom: 0.25rem;">${service.title}</h3>
                  <p style="font-size: 0.875rem; color: #666;">${service.description}</p>
                </div>
                ${service.price ? `<div style="font-size: 1.125rem; font-weight: bold; color: var(--secondary-color);">${service.price}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    `;
  }
  
  return `
    <section style="padding: 60px 20px; background: ${backgroundColor};">
      <div style="max-width: 1200px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 48px;">
          <h2 style="font-size: 2.5rem; font-weight: bold; color: var(--primary-color); margin-bottom: 1rem;">${title}</h2>
          ${subtitle ? `<p style="font-size: 1.125rem; color: #666;">${subtitle}</p>` : ''}
        </div>
        <div id="${servicesId}" style="display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 2rem;">
          ${defaultServices.map(service => `
            <div style="text-align: center; padding: 2rem; background: white; border-radius: 16px; border: 1px solid #e5e7eb; transition: box-shadow 0.3s, transform 0.3s;" onmouseover="this.style.boxShadow='0 10px 30px rgba(0,0,0,0.1)'; this.style.transform='translateY(-4px)'" onmouseout="this.style.boxShadow='none'; this.style.transform='translateY(0)'">
              <div style="width: 80px; height: 80px; margin: 0 auto 1rem; border-radius: 16px; background: rgba(39, 73, 31, 0.1); display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 2.5rem;">${service.icon}</span>
              </div>
              <h3 style="font-size: 1.25rem; font-weight: bold; color: var(--primary-color); margin-bottom: 0.75rem;">${service.title}</h3>
              <p style="font-size: 0.875rem; color: #666; margin-bottom: 1rem;">${service.description}</p>
              ${service.price ? `<div style="font-size: 1.25rem; font-weight: bold; color: var(--secondary-color);">${service.price}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </section>
    <style>
      @media (max-width: 1024px) {
        #${servicesId} { grid-template-columns: repeat(2, 1fr) !important; }
      }
      @media (max-width: 640px) {
        #${servicesId} { grid-template-columns: 1fr !important; }
      }
    </style>
  `;
}

function builderGenerateVideoHTML(data, style) {
  const { title, subtitle, videoUrl = '', videoType = 'youtube', showControls = true, autoplay = false, loop = false, muted = false, thumbnailUrl } = data || {};
  const backgroundColor = style?.backgroundColor || data.backgroundColor || '#111827';
  const textColor = data.textColor || '#ffffff';
  
  const getEmbedUrl = () => {
    if (!videoUrl) return '';
    if (videoType === 'youtube') {
      const match = videoUrl.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^&?\/\s]{11})/);
      const videoId = match ? match[1] : videoUrl;
      return `https://www.youtube.com/embed/${videoId}?controls=${showControls ? 1 : 0}&rel=0${autoplay ? '&autoplay=1' : ''}${loop ? '&loop=1' : ''}${muted ? '&mute=1' : ''}`;
    }
    if (videoType === 'vimeo') {
      const match = videoUrl.match(/vimeo\.com\/(\d+)/);
      const videoId = match ? match[1] : videoUrl;
      return `https://player.vimeo.com/video/${videoId}?controls=${showControls ? 1 : 0}${autoplay ? '&autoplay=1' : ''}${loop ? '&loop=1' : ''}${muted ? '&muted=1' : ''}`;
    }
    return videoUrl;
  };
  
  return `
    <section style="padding: 60px 20px; background: ${backgroundColor};">
      <div style="max-width: 1024px; margin: 0 auto;">
        ${title || subtitle ? `
          <div style="text-align: center; margin-bottom: 48px;">
            ${title ? `<h2 style="font-size: 2.5rem; font-weight: bold; color: ${textColor}; margin-bottom: 1rem;">${title}</h2>` : ''}
            ${subtitle ? `<p style="font-size: 1.125rem; color: ${textColor}; opacity: 0.7;">${subtitle}</p>` : ''}
          </div>
        ` : ''}
        <div style="position: relative; aspect-ratio: 16/9; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
          ${videoUrl ? 
            (videoType === 'custom' ? 
              `<video src="${videoUrl}" style="width: 100%; height: 100%; object-fit: cover;" ${showControls ? 'controls' : ''} ${autoplay ? 'autoplay' : ''} ${loop ? 'loop' : ''} ${muted ? 'muted' : ''} playsinline ${thumbnailUrl ? `poster="${thumbnailUrl}"` : ''}></video>` :
              `<iframe src="${getEmbedUrl()}" style="width: 100%; height: 100%; border: none;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
            ) :
            `<div style="width: 100%; height: 100%; background: ${thumbnailUrl ? `url(${thumbnailUrl}) center/cover` : 'linear-gradient(135deg, rgba(39, 73, 31, 0.2), rgba(240, 202, 225, 0.2))'}; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <span class="material-icons" style="font-size: 5rem; color: rgba(255,255,255,0.5); margin-bottom: 1rem;">play_circle</span>
              <p style="color: rgba(255,255,255,0.6);">Add a video URL to display</p>
            </div>`
          }
        </div>
      </div>
    </section>
  `;
}

function builderGenerateCountdownHTML(data, style) {
  const {
    title = 'Coming Soon',
    subtitle = 'Something amazing is on its way',
    targetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    showDays = true, showHours = true, showMinutes = true, showSeconds = true,
    expiredMessage = 'The wait is over!'
  } = data || {};
  // Support colors from both data and style (style takes precedence)
  const backgroundColor = style?.backgroundColor || data?.backgroundColor || '#27491F';
  const textColor = style?.textColor || data?.textColor || '#ffffff';
  const countdownId = `countdown_${Date.now()}`;
  return `
    <section style="padding: 80px 20px; background: ${backgroundColor}; position: relative; overflow: hidden;">
      <div style="max-width: 800px; margin: 0 auto; text-align: center; position: relative; z-index: 10;">
        <h2 style="font-size: 3rem; font-weight: bold; color: ${textColor}; margin-bottom: 1rem;">${title}</h2>
        ${subtitle ? `<p style="font-size: 1.25rem; color: ${textColor}; opacity: 0.8; margin-bottom: 3rem;">${subtitle}</p>` : ''}
        <div id="${countdownId}" style="display: flex; justify-content: center; gap: 1.5rem; margin-bottom: 3rem;">
          ${showDays ? `<div style="text-align: center;"><div style="width: 80px; height: 80px; border-radius: 16px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold; color: ${textColor}; margin-bottom: 0.5rem;" data-unit="days">00</div><div style="font-size: 0.75rem; text-transform: uppercase; color: ${textColor}; opacity: 0.8;">Days</div></div>` : ''}
          ${showHours ? `<div style="text-align: center;"><div style="width: 80px; height: 80px; border-radius: 16px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold; color: ${textColor}; margin-bottom: 0.5rem;" data-unit="hours">00</div><div style="font-size: 0.75rem; text-transform: uppercase; color: ${textColor}; opacity: 0.8;">Hours</div></div>` : ''}
          ${showMinutes ? `<div style="text-align: center;"><div style="width: 80px; height: 80px; border-radius: 16px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold; color: ${textColor}; margin-bottom: 0.5rem;" data-unit="minutes">00</div><div style="font-size: 0.75rem; text-transform: uppercase; color: ${textColor}; opacity: 0.8;">Minutes</div></div>` : ''}
          ${showSeconds ? `<div style="text-align: center;"><div style="width: 80px; height: 80px; border-radius: 16px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold; color: ${textColor}; margin-bottom: 0.5rem;" data-unit="seconds">00</div><div style="font-size: 0.75rem; text-transform: uppercase; color: ${textColor}; opacity: 0.8;">Seconds</div></div>` : ''}
        </div>
      </div>
    </section>
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

function builderGenerateBannerHTML(data, style) {
  const {
    text = '🎉 Special Offer: Get 20% off your first order! Use code WELCOME20',
    link, linkText = 'Shop Now',
    icon, dismissible = false,
    enableMarquee = false,
    marqueeSpeed = 20
  } = data || {};
  // Support colors from both data and style (style takes precedence)
  const backgroundColor = style?.backgroundColor || data?.backgroundColor || '#27491F';
  const textColor = style?.textColor || data?.textColor || '#ffffff';
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
    <section id="${bannerId}" data-nosnippet style="padding: 12px 24px; background: ${backgroundColor}; position: relative; overflow: hidden;" role="banner" aria-label="Promotional banner">
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

function builderGeneratePartnersHTML(data, style) {
  const { title = 'Trusted By', subtitle, partners = [], grayscale = true, autoScroll = false } = data || {};
  const backgroundColor = style?.backgroundColor || data.backgroundColor || '#ffffff';
  const partnersId = `partners_${Date.now()}`;
  
  const defaultPartners = partners.length > 0 ? partners : [
    { name: 'Company 1' }, { name: 'Company 2' }, { name: 'Company 3' },
    { name: 'Company 4' }, { name: 'Company 5' }, { name: 'Company 6' }
  ];
  
  const columns = Math.min(defaultPartners.length, 6);
  
  return `
    <section style="padding: 48px 24px; background: ${backgroundColor};">
      <div style="max-width: 1200px; margin: 0 auto;">
        ${title || subtitle ? `
          <div style="text-align: center; margin-bottom: 40px;">
            ${title ? `<h2 style="font-size: 1.5rem; font-weight: bold; color: var(--primary-color); margin-bottom: 0.5rem;">${title}</h2>` : ''}
            ${subtitle ? `<p style="font-size: 1rem; color: #666;">${subtitle}</p>` : ''}
          </div>
        ` : ''}
        <div id="${partnersId}" style="display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 1.5rem; align-items: center;">
          ${defaultPartners.map(partner => `
            ${partner.link ? `<a href="${partner.link}" target="_blank" rel="noopener noreferrer" style="text-decoration: none;">` : ''}
            <div style="display: flex; align-items: center; justify-content: center; padding: 1rem; ${grayscale ? 'filter: grayscale(100%); opacity: 0.6;' : ''} transition: filter 0.3s, opacity 0.3s;" ${grayscale ? 'onmouseover="this.style.filter=\'grayscale(0%)\'; this.style.opacity=\'1\'" onmouseout="this.style.filter=\'grayscale(100%)\'; this.style.opacity=\'0.6\'"' : ''}>
              ${partner.logo ? 
                `<img loading="lazy" decoding="async" src="${partner.logo}" alt="${partner.name}" style="height: 48px; width: auto; max-width: 100%;" />` :
                `<div style="height: 48px; padding: 0 24px; background: #e5e7eb; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: #666; font-weight: 600; font-size: 0.875rem;">${partner.name}</span>
                </div>`
              }
            </div>
            ${partner.link ? `</a>` : ''}
          `).join('')}
        </div>
      </div>
    </section>
    <style>
      @media (max-width: 1024px) {
        #${partnersId} { grid-template-columns: repeat(3, 1fr) !important; }
      }
      @media (max-width: 640px) {
        #${partnersId} { grid-template-columns: repeat(2, 1fr) !important; }
      }
    </style>
  `;
}

function builderGenerateNewsletterHTML(data, style) {
  const {
    title = 'Stay Updated',
    subtitle = 'Subscribe to our newsletter for the latest updates and exclusive offers',
    placeholder = 'Enter your email address',
    buttonText = 'Subscribe',
    successMessage = 'Thank you for subscribing!'
  } = data || {};
  // Support colors from both data and style (style takes precedence)
  const backgroundColor = style?.backgroundColor || data?.backgroundColor || '#f9fafb';
  return `
    <section style="padding: 60px 20px; background: ${backgroundColor};">
      <div style="max-width: 600px; margin: 0 auto; text-align: center;">
        <div style="width: 64px; height: 64px; margin: 0 auto 1.5rem; border-radius: 16px; background: rgba(39, 73, 31, 0.1); display: flex; align-items: center; justify-content: center;">
          <span class="material-icons" style="font-size: 2rem; color: var(--primary-color);">mail</span>
        </div>
        <h2 style="font-size: 2.5rem; font-weight: bold; color: var(--primary-color); margin-bottom: 1rem;">${title}</h2>
        ${subtitle ? `<p style="font-size: 1.125rem; color: #666; margin-bottom: 2.5rem;">${subtitle}</p>` : ''}
        <form style="display: flex; gap: 0.75rem; max-width: 500px; margin: 0 auto;" onsubmit="event.preventDefault(); this.innerHTML = '<p style=\\'color: #16a34a; font-weight: 600;\\'>${successMessage}</p>';">
          <input type="email" placeholder="${placeholder}" required style="flex: 1; padding: 16px; border-radius: 12px; border: 1px solid #d1d5db; font-size: 1rem;" />
          <button type="submit" style="padding: 16px 32px; background: var(--primary-color); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer;">${buttonText}</button>
        </form>
        <p style="margin-top: 1.5rem; font-size: 0.75rem; color: #9ca3af;">We respect your privacy. Unsubscribe at any time.</p>
      </div>
    </section>
  `;
}

function builderGenerateDividerHTML(data, style) {
  const { style: dividerStyle = 'line', color = '#e5e7eb', secondaryColor = '#27491F', height = 1, width = '100%', spacing = 40 } = data || {};
  const backgroundColor = style?.backgroundColor || data.backgroundColor || 'transparent';
  
  let dividerElement = '';
  switch (dividerStyle) {
    case 'dotted':
      dividerElement = `<div style="width: ${width}; border-top: ${height}px dotted ${color}; margin: 0 auto;"></div>`;
      break;
    case 'dashed':
      dividerElement = `<div style="width: ${width}; border-top: ${height}px dashed ${color}; margin: 0 auto;"></div>`;
      break;
    case 'gradient':
      dividerElement = `<div style="width: ${width}; height: ${height}px; background: linear-gradient(90deg, transparent, ${color}, ${secondaryColor}, transparent); margin: 0 auto; border-radius: 9999px;"></div>`;
      break;
    case 'wave':
      dividerElement = `<svg viewBox="0 0 1200 120" preserveAspectRatio="none" style="width: 100%; height: ${Math.max(height * 20, 40)}px; display: block;">
        <path d="M0,60 C200,120 400,0 600,60 C800,120 1000,0 1200,60 L1200,120 L0,120 Z" fill="${color}"></path>
      </svg>`;
      break;
    case 'zigzag':
      dividerElement = `<svg viewBox="0 0 1200 40" preserveAspectRatio="none" style="width: 100%; height: ${Math.max(height * 10, 20)}px; display: block;">
        <path d="M0,20 L60,0 L120,20 L180,0 L240,20 L300,0 L360,20 L420,0 L480,20 L540,0 L600,20 L660,0 L720,20 L780,0 L840,20 L900,0 L960,20 L1020,0 L1080,20 L1140,0 L1200,20" fill="none" stroke="${color}" stroke-width="${height}"></path>
      </svg>`;
      break;
    case 'line':
    default:
      dividerElement = `<div style="width: ${width}; height: ${height}px; background-color: ${color}; margin: 0 auto;"></div>`;
  }
  return `
    <section style="padding: ${spacing}px 24px; background: ${backgroundColor};">
      <div style="max-width: 1200px; margin: 0 auto;">
        ${dividerElement}
      </div>
    </section>
  `;
}

function builderGenerateImageComparisonHTML(data, style) {
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
  const backgroundColor = style?.backgroundColor || data.backgroundColor || '#ffffff';

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
      <img loading="lazy" decoding="async" src="${afterImage}" alt="${afterLabel}" style="width: 100%; height: 100%; object-fit: cover;" draggable="false" />
    </div>
    
    <!-- Before Image (Left side - using clip-path for clean clipping) -->
    <div id="${comparisonId}-before" style="position: absolute; inset: 0; ${orientation === 'horizontal' ? `clip-path: inset(0 ${100 - sliderPosition}% 0 0);` : `clip-path: inset(0 0 ${100 - sliderPosition}% 0);`}">
      <img loading="lazy" decoding="async" src="${beforeImage}" alt="${beforeLabel}" style="width: 100%; height: 100%; object-fit: cover;" draggable="false" />
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
          // Use clip-path to clip from the right side
          beforeDiv.style.clipPath = 'inset(0 ' + (100 - percentage) + '% 0 0)';
          line.style.left = percentage + '%';
          handle.style.left = percentage + '%';
        } else {
          // Use clip-path to clip from the bottom
          beforeDiv.style.clipPath = 'inset(0 0 ' + (100 - percentage) + '% 0)';
          line.style.top = percentage + '%';
          handle.style.top = percentage + '%';
        }
      }

      function handleMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        var rect = container.getBoundingClientRect();
        var clientX = e.touches ? e.touches[0].clientX : e.clientX;
        var clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        var percentage;
        if (orientation === 'horizontal') {
          percentage = ((clientX - rect.left) / rect.width) * 100;
        } else {
          percentage = ((clientY - rect.top) / rect.height) * 100;
        }
        percentage = Math.min(Math.max(percentage, 0), 100);
        updatePosition(percentage);
      }

      function startDrag(e) {
        isDragging = true;
        // Update position immediately on click
        var rect = container.getBoundingClientRect();
        var clientX = e.touches ? e.touches[0].clientX : e.clientX;
        var clientY = e.touches ? e.touches[0].clientY : e.clientY;
        var percentage;
        if (orientation === 'horizontal') {
          percentage = ((clientX - rect.left) / rect.width) * 100;
        } else {
          percentage = ((clientY - rect.top) / rect.height) * 100;
        }
        percentage = Math.min(Math.max(percentage, 0), 100);
        updatePosition(percentage);
      }

      function endDrag() {
        isDragging = false;
      }

      container.addEventListener('mousedown', startDrag);
      container.addEventListener('touchstart', startDrag);
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('mouseup', endDrag);
      document.addEventListener('touchend', endDrag);
    })();
    </script>
  ` : '';

  return `
    <section style="padding: 48px 24px; background-color: ${backgroundColor};">
      <div style="max-width: 896px; margin: 0 auto;">
        ${(title || subtitle) ? `
        <div style="text-align: center; margin-bottom: 32px;">
          ${title ? `<h2 style="font-size: 32px; font-weight: bold; color: var(--primary-color); margin-bottom: 12px;">${title}</h2>` : ''}
          ${subtitle ? `<p style="font-size: 18px; color: rgba(51, 51, 51, 0.7);">${subtitle}</p>` : ''}
        </div>
        ` : ''}
        
        <div id="${comparisonId}" style="position: relative; overflow: hidden; border-radius: 12px; aspect-ratio: 4/5; cursor: ${orientation === 'horizontal' ? 'ew-resize' : 'ns-resize'}; user-select: none;">
          ${comparisonContent}
        </div>
      </div>
    </section>
    ${script}
  `;
}

// ============================================================================
// SUB-PAGE HTML GENERATORS (Cart, Favorites, Profile, etc.)
// ============================================================================

async function generateSubPageHTML(pageType, siteId, siteName, settings, sections, businessId = null, queryParams = {}, useCleanUrls = false) {
  const theme = settings?.theme || {};
  const primaryColor = theme.primaryColor || '#27491F';
  const secondaryColor = theme.secondaryColor || '#F0CAE1';
  const backgroundColor = theme.backgroundColor || '#FFFFFF';
  const textColor = theme.textColor || '#171817';
  const discountColor = theme.discountColor || '#dc2626';
  const currencySymbol = settings?.currencySymbol || '$';
  
  // Get navbar and footer sections
  const navbarSection = sections.find(s => s.type === 'navbar');
  const footerSection = sections.find(s => s.type === 'footer');
  
  const baseUrl = useCleanUrls ? '' : `/site/${siteId}`;
  
  // Resolve favicon for all pages
  const faviconUrl = settings?.seo?.favicon || '/favicon.png';
  const faviconType = faviconUrl.includes('.ico') ? 'image/x-icon' : faviconUrl.includes('.svg') ? 'image/svg+xml' : (faviconUrl.includes('.jpg') || faviconUrl.includes('.jpeg')) ? 'image/jpeg' : 'image/png';

  // Common page wrapper
  const wrapPage = (title, content) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - ${siteName}</title>
    <link rel="icon" href="${faviconUrl}" type="${faviconType}">
    <link rel="icon" href="${faviconUrl}" sizes="32x32">
    <link rel="icon" href="${faviconUrl}" sizes="16x16">
    <link rel="apple-touch-icon" href="${faviconUrl}" sizes="180x180">
    <link rel="shortcut icon" href="${faviconUrl}">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: ${textColor};
            background-color: ${backgroundColor};
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            overflow-x: hidden;
        }
        :root {
            --primary-color: ${primaryColor};
            --secondary-color: ${secondaryColor};
            --bg-color: ${backgroundColor};
            --text-color: ${textColor};
        }
        main { flex: 1; }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade { animation: fadeIn 0.4s ease-out; }
        .btn-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 1rem 2rem;
            background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%);
            color: #FFFFFF;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 700;
            font-size: 1rem;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 16px ${primaryColor}40;
            transition: all 0.2s ease;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px ${primaryColor}50;
        }
        .btn-secondary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 1rem 2rem;
            background: transparent;
            color: ${primaryColor};
            text-decoration: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 1rem;
            border: 2px solid ${primaryColor}40;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .btn-secondary:hover {
            background: ${primaryColor}08;
        }
        .card {
            background: #FFFFFF;
            border-radius: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            border: 1px solid rgba(0,0,0,0.05);
        }
        .page-header {
            background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%);
            color: #FFFFFF;
            padding: 3rem 1rem;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .page-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle at 20% 50%, ${secondaryColor}30 0%, transparent 50%);
            pointer-events: none;
        }
        .page-header h1 {
            position: relative;
            z-index: 1;
            font-size: clamp(2rem, 5vw, 3rem);
            font-weight: 800;
            letter-spacing: -0.02em;
        }
        .page-header p {
            position: relative;
            z-index: 1;
            margin-top: 0.75rem;
            font-size: 1.125rem;
            opacity: 0.95;
            font-weight: 300;
        }
        .empty-state {
            text-align: center;
            padding: 6rem 1rem;
            background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
            border-radius: 24px;
            border: 2px dashed ${primaryColor}40;
        }
        .empty-state-icon {
            width: 120px;
            height: 120px;
            margin: 0 auto 2rem;
            border-radius: 50%;
            background: linear-gradient(135deg, ${primaryColor}20 0%, ${secondaryColor}20 100%);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .empty-state-icon .material-icons {
            font-size: 4rem;
            color: ${primaryColor};
            opacity: 0.5;
        }
        .input-field {
            width: 100%;
            padding: 0.875rem 1rem;
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            font-size: 1rem;
            transition: all 0.2s ease;
        }
        .input-field:focus {
            border-color: ${primaryColor};
            outline: none;
            box-shadow: 0 0 0 3px ${primaryColor}20;
        }
        @media (min-width: 1024px) {
            .grid-responsive {
                grid-template-columns: 1fr 400px !important;
            }
        }
    </style>
</head>
<body>
    ${navbarSection ? builderGenerateNavbarHTML(navbarSection.data || {}, navbarSection.style || {}, siteId, useCleanUrls) : ''}
    ${content}
    ${footerSection ? builderGenerateFooterHTML(footerSection.data || {}, footerSection.style || {}, siteId, settings, useCleanUrls) : ''}
    <script>
        // Currency symbol, site id, and base URL (safe for script injection)
        const CURRENCY_SYMBOL = ${JSON.stringify(currencySymbol || '$')};
        const SITE_ID_SAFE = ${JSON.stringify(siteId || '')};
        const BUSINESS_ID_SUB = ${JSON.stringify(businessId || '')};
        const TRACK_CART_URL_SUB = 'https://us-central1-${(config.FIREBASE_PROJECT_ID || 'madas-store')}.cloudfunctions.net/trackCart';
        const SESSION_KEY_SUB = 'session_' + SITE_ID_SAFE;
        const USER_KEY_SUB = 'user_' + SITE_ID_SAFE;
        var BASE_URL = ${JSON.stringify(useCleanUrls ? '' : (siteId ? `/site/${siteId}` : ''))};
        function getSessionIdSub() {
            var sid = localStorage.getItem(SESSION_KEY_SUB);
            if (!sid) { sid = 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem(SESSION_KEY_SUB, sid); }
            return sid;
        }
        function syncCartSub(items) {
            if (!BUSINESS_ID_SUB) return;
            try {
                var user = null;
                try { user = JSON.parse(localStorage.getItem(USER_KEY_SUB) || 'null'); } catch(e) {}
                fetch(TRACK_CART_URL_SUB, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        businessId: BUSINESS_ID_SUB,
                        sessionId: getSessionIdSub(),
                        items: items,
                        customerName: user ? (user.name || user.displayName || 'Guest') : 'Guest',
                        customerEmail: user ? (user.email || null) : null,
                        customerPhone: user ? (user.phone || null) : null,
                        source: 'website'
                    })
                }).catch(function() {});
            } catch(e) {}
        }
        function getCart() {
            try { return JSON.parse(localStorage.getItem('cart_' + SITE_ID_SAFE) || '[]'); }
            catch(e) { return []; }
        }
        function setCart(items) {
            localStorage.setItem('cart_' + SITE_ID_SAFE, JSON.stringify(items));
            updateCartCount();
            syncCartSub(items);
        }
        function getFavorites() {
            try { return JSON.parse(localStorage.getItem('favorites_' + SITE_ID_SAFE) || '[]'); }
            catch(e) { return []; }
        }
        function setFavorites(items) {
            localStorage.setItem('favorites_' + SITE_ID_SAFE, JSON.stringify(items));
            updateFavoritesCount();
        }
        function getUser() {
            try { return JSON.parse(localStorage.getItem('user_' + SITE_ID_SAFE) || 'null'); }
            catch(e) { return null; }
        }
        function setUser(user) {
            localStorage.setItem('user_' + SITE_ID_SAFE, JSON.stringify(user));
        }
        function updateCartCount() {
            const cart = getCart();
            const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
            document.querySelectorAll('.cart-count').forEach(el => {
                el.textContent = count;
                el.style.display = count > 0 ? 'flex' : 'none';
            });
        }
        function updateFavoritesCount() {
            const favorites = getFavorites();
            document.querySelectorAll('.favorites-count').forEach(el => {
                el.textContent = favorites.length;
                el.style.display = favorites.length > 0 ? 'flex' : 'none';
            });
        }
        // Initialize counts on page load
        document.addEventListener('DOMContentLoaded', () => {
            updateCartCount();
            updateFavoritesCount();
        });
        
        // FAQ Accordion Toggle Function
        function toggleFAQ(button) {
            const item = button.closest('.faq-accordion-item');
            if (!item) return;
            const wasActive = item.classList.contains('active');
            
            // Close all items
            document.querySelectorAll('.faq-accordion-item').forEach(i => i.classList.remove('active'));
            
            // Open clicked item if it wasn't active
            if (!wasActive) {
                item.classList.add('active');
            }
        }
    </script>
</body>
</html>`;

  switch(pageType) {
    case 'cart':
      return wrapPage('Shopping Cart', generateCartPageContent(siteId, primaryColor, secondaryColor, textColor, useCleanUrls, businessId));
    case 'favorites':
      return wrapPage('My Favorites', generateFavoritesPageContent(siteId, primaryColor, secondaryColor, textColor, useCleanUrls));
    case 'profile':
      return wrapPage('My Profile', generateProfilePageContent(siteId, primaryColor, secondaryColor, textColor, useCleanUrls));
    case 'checkout': {
      // Fetch enabled payment methods from Firestore
      let paymentMethods = null;
      if (businessId) {
        try {
          const pmSnap = await db.collection('tenants').doc(businessId).collection('settings').doc('payments').get();
          if (pmSnap.exists) {
            paymentMethods = pmSnap.data();
            console.log(`[checkout] Loaded payment settings for business ${businessId}:`, Object.keys(paymentMethods).filter(k => paymentMethods[k]?.enabled).join(', '));
          } else {
            console.log(`[checkout] No payment settings found for business ${businessId}, using fallback`);
          }
        } catch (e) { console.error('[checkout] Error fetching payment settings:', e); }
      }
      return wrapPage('Checkout', generateCheckoutPageContent(siteId, primaryColor, secondaryColor, textColor, businessId, useCleanUrls, paymentMethods));
    }
    case 'login':
      return wrapPage('Sign In', generateLoginPageContent(siteId, primaryColor, secondaryColor, textColor, useCleanUrls, businessId));
    case 'register':
      return wrapPage('Create Account', generateRegisterPageContent(siteId, primaryColor, secondaryColor, textColor, useCleanUrls, businessId));
    case 'order-success':
      return wrapPage('Order Confirmed', generateOrderSuccessPageContent(siteId, primaryColor, secondaryColor, textColor, useCleanUrls, businessId));
    case 'products':
      const productsContent = await generateProductsPageContent(siteId, primaryColor, secondaryColor, textColor, backgroundColor, businessId, queryParams, currencySymbol, discountColor, useCleanUrls);
      return wrapPage('Products', productsContent);
    case 'about-us':
      return wrapPage(settings?.pages?.aboutUs?.title || 'About Us', generateStaticPageContent(settings?.pages?.aboutUs, primaryColor, textColor, siteId, false, useCleanUrls));
    case 'privacy-policy':
      return wrapPage(settings?.pages?.privacyPolicy?.title || 'Privacy Policy', generateStaticPageContent(settings?.pages?.privacyPolicy, primaryColor, textColor, siteId, false, useCleanUrls));
    case 'terms-of-service':
      return wrapPage(settings?.pages?.termsOfService?.title || 'Terms of Service', generateStaticPageContent(settings?.pages?.termsOfService, primaryColor, textColor, siteId, false, useCleanUrls));
    case 'faq':
      return wrapPage(settings?.pages?.faq?.title || 'FAQ', generateStaticPageContent(settings?.pages?.faq, primaryColor, textColor, siteId, true, useCleanUrls));
    case 'shipping-policy':
      return wrapPage(settings?.pages?.shippingPolicy?.title || 'Shipping Policy', generateStaticPageContent(settings?.pages?.shippingPolicy, primaryColor, textColor, siteId, false, useCleanUrls));
    case 'return-policy':
      return wrapPage(settings?.pages?.returnPolicy?.title || 'Return Policy', generateStaticPageContent(settings?.pages?.returnPolicy, primaryColor, textColor, siteId, false, useCleanUrls));
    default: {
      const baseUrl = useCleanUrls ? '' : (siteId ? `/site/${siteId}` : '');
      const homeUrl = baseUrl || '/';
      return wrapPage('Page', `
        <main class="page-header" style="min-height: 50vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 1.5rem;">
          <span class="material-icons" style="font-size: 4rem; opacity: 0.9; margin-bottom: 1rem;">construction</span>
          <h1 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 0.5rem;">Page not found</h1>
          <p style="opacity: 0.9; margin-bottom: 2rem;">This page doesn't exist or isn't available yet.</p>
          <a href="${homeUrl}" class="btn-primary">Go to Home</a>
        </main>
      `);
    }
  }
}

// Generate static page content (About, Policy, FAQ, etc.)
function generateStaticPageContent(pageData, primaryColor, textColor, siteId, isFAQ = false, useCleanUrls = false) {
  const baseUrl = useCleanUrls ? '' : (siteId ? `/site/${siteId}` : '');
  const title = pageData?.title || 'Page';
  const content = pageData?.content || '<p>Content coming soon...</p>';
  const enabled = pageData?.enabled;
  const faqItems = pageData?.faqItems || [];
  
  if (!enabled) {
    return `
      <main style="padding: 4rem 1rem; text-align: center; min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <span class="material-icons" style="font-size: 4rem; color: #d1d5db; margin-bottom: 1rem;">block</span>
        <h1 style="font-size: 1.5rem; font-weight: 600; color: ${textColor}; margin-bottom: 0.5rem;">Page Not Available</h1>
        <p style="color: #6b7280;">This page is currently not available.</p>
        <a href="${baseUrl || '/'}" style="display: inline-block; margin-top: 2rem; padding: 0.75rem 2rem; background: ${primaryColor}; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">Go Home</a>
      </main>
    `;
  }
  
  // FAQ Page - Render as accordion
  if (isFAQ && faqItems.length > 0) {
    const faqItemsHTML = faqItems.map((item, index) => `
      <div class="faq-accordion-item" style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 1rem;">
        <button 
          class="faq-accordion-button" 
          onclick="toggleFAQ(this)"
          style="width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; background: #f9fafb; border: none; cursor: pointer; text-align: left; transition: all 0.2s ease;"
        >
          <span style="font-weight: 600; font-size: 1rem; color: ${textColor}; padding-right: 1rem;">${safeHtml(item.question || 'Question')}</span>
          <span class="faq-icon material-icons" style="color: ${primaryColor}; ">expand_more</span>
        </button>
        <div class="faq-accordion-content" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
          <div style="padding: 1.25rem 1.5rem; background: white; color: ${textColor}; line-height: 1.7; border-top: 1px solid #e5e7eb;">
            ${safeHtml(item.answer || 'Answer coming soon...')}
          </div>
        </div>
      </div>
    `).join('');
    
    return `
      <main style="max-width: 800px; margin: 0 auto; padding: 4rem 1.5rem; min-height: 60vh;">
        <h1 style="font-size: 2.5rem; font-weight: 700; color: ${primaryColor}; margin-bottom: 0.5rem; text-align: center;">${safeHtml(title)}</h1>
        <p style="text-align: center; color: #6b7280; margin-bottom: 3rem;">Find answers to commonly asked questions</p>
        <div class="faq-accordion">
          ${faqItemsHTML}
        </div>
      </main>
      <style>
        .faq-accordion-button:hover { background: #f3f4f6 !important; }
        .faq-accordion-item.active .faq-accordion-button { background: ${primaryColor}10 !important; }
        .faq-accordion-item.active .faq-icon { transform: rotate(180deg); }
        .faq-accordion-item.active .faq-accordion-content { max-height: 500px !important; }
      </style>
    `;
  }
  
  // Standard page content (title escaped; content may contain safe HTML from editor)
  return `
    <main style="max-width: 800px; margin: 0 auto; padding: 4rem 1.5rem; min-height: 60vh;">
      <h1 style="font-size: 2.5rem; font-weight: 700; color: ${primaryColor}; margin-bottom: 2rem; text-align: center;">${safeHtml(title)}</h1>
      <div class="page-content" style="color: ${textColor}; line-height: 1.8;">
        ${content}
      </div>
    </main>
    <style>
      .page-content h2 { font-size: 1.75rem; font-weight: 600; color: ${primaryColor}; margin: 2rem 0 1rem; }
      .page-content h3 { font-size: 1.25rem; font-weight: 600; color: ${primaryColor}; margin: 1.5rem 0 0.75rem; }
      .page-content p { margin-bottom: 1rem; }
      .page-content ul, .page-content ol { margin: 1rem 0; padding-left: 1.5rem; }
      .page-content li { margin-bottom: 0.5rem; }
      .page-content a { color: ${primaryColor}; text-decoration: underline; }
      .page-content strong { font-weight: 600; }
      .page-content em { font-style: italic; }
      .page-content blockquote { border-left: 4px solid ${primaryColor}; padding-left: 1rem; margin: 1rem 0; color: #6b7280; font-style: italic; }
    </style>
  `;
}

// ============================================================================
// PRODUCT DETAIL PAGE GENERATOR
// ============================================================================

async function generateProductDetailPageHTML(productId, siteId, siteName, settings, sections, businessId, useCleanUrls = false) {
  const theme = settings?.theme || {};
  const primaryColor = theme.primaryColor || '#000000';
  const secondaryColor = theme.secondaryColor || '#F0CAE1';
  const backgroundColor = theme.backgroundColor || '#FFFFFF';
  const textColor = theme.textColor || '#000000';
  const discountColor = theme.discountColor || '#dc2626';
  const currencySymbol = settings?.currencySymbol || '$';
  
  // Get navbar and footer sections
  const navbarSection = sections.find(s => s.type === 'navbar');
  const footerSection = sections.find(s => s.type === 'footer');
  
  const baseUrl = useCleanUrls ? '' : `/site/${siteId}`;
  
  // Fetch product from Firestore
  let product = null;
  let relatedProducts = [];
  let othersBought = [];
  let pricingChanges = {}; // Initialize outside the if block
  
  if (businessId && productId) {
    try {
      // Fetch pricing changes first
      try {
        const pricingRef = db.collection('businesses').doc(businessId).collection('pricingChanges');
        const pricingSnapshot = await pricingRef.get();
        pricingSnapshot.docs.forEach(doc => {
          const pricingData = doc.data();
          const key = pricingData.productId + (pricingData.size ? '-' + pricingData.size : '');
          pricingChanges[key] = pricingData;
        });
      } catch (pricingError) {
        console.error('[generateProductDetailPageHTML] Error fetching pricing changes:', pricingError);
      }
      
      const productsRef = db.collection('businesses').doc(businessId).collection('products');
      const productsSnapshot = await productsRef.get()
      
      const searchSlug = productId.toLowerCase().replace(/[^a-z0-9-]/g, '');
      for (const doc of productsSnapshot.docs) {
        const data = doc.data();
        const productSlug = generateSlug(data.name);
        if (productSlug === searchSlug || doc.id === productId) {
          product = { id: doc.id, ...data };
          
          // Apply pricing changes for base product
          const baseKey = product.id;
          if (pricingChanges[baseKey]) {
            const pricing = pricingChanges[baseKey];
            if (pricing.discountType === 'percentage') {
              const originalPrice = product.sellingPrice || product.price || 0;
              product.salePrice = Math.round(originalPrice * (1 - pricing.discountValue / 100));
              product.onSale = true;
            } else if (pricing.discountType === 'fixed') {
              const originalPrice = product.sellingPrice || product.price || 0;
              product.salePrice = Math.max(0, originalPrice - pricing.discountValue);
              product.onSale = true;
            }
          }
          
          break;
        }
      }
      
      if (product) {
        const allOther = productsSnapshot.docs.filter(doc => doc.id !== product.id).map(doc => ({ id: doc.id, ...doc.data() }));
        relatedProducts = allOther.slice(0, 8);
        othersBought = allOther.slice(4, 12);
      }
    } catch (error) {
      console.error('[generateProductDetailPageHTML] Error fetching product:', error);
    }
  }
  
  // Fetch approved reviews for this product (from Dashboard Reviews page)
  let productReviews = [];
  let reviewStats = { averageRating: 0, count: 0 };
  if (businessId && product?.id) {
    try {
      const reviewsSnapshot = await db.collection('businesses').doc(businessId).collection('reviews')
        .where('productId', '==', product.id)
        .get();
      productReviews = reviewsSnapshot.docs
        .map(doc => {
          const d = doc.data();
          const ts = d.createdAt?.toDate ? d.createdAt.toDate() : (d.createdAt ? new Date(d.createdAt) : null);
          return {
            id: doc.id,
            customerName: d.customerName || 'Anonymous',
            rating: d.rating || 0,
            title: d.title || '',
            comment: d.comment || '',
            status: d.status || 'pending',
            reply: d.reply || '',
            createdAt: ts
          };
        })
        .filter(r => r.status === 'approved')
        .sort((a, b) => (b.createdAt ? b.createdAt.getTime() : 0) - (a.createdAt ? a.createdAt.getTime() : 0))
        .slice(0, 50);
      if (productReviews.length > 0) {
        const sum = productReviews.reduce((acc, r) => acc + (r.rating || 0), 0);
        reviewStats = { averageRating: sum / productReviews.length, count: productReviews.length };
      }
    } catch (err) {
      console.log('[generateProductDetailPageHTML] Could not fetch reviews:', err.message);
    }
  }
  
  const productNotFound = !product;
  const productImages = product?.images || [];
  const productName = product?.name || 'Product Not Found';
  const productDescription = product?.description || '';
  // Calculate price with size-specific discounts
  const calculatePriceForSize = (size) => {
    if (!product) {
      return { price: 0, original: 0, onSale: false };
    }
    
    const basePrice = product.sellingPrice || product.price || 0;
    const baseComparePrice = product.compareAtPrice || basePrice;
    
    // Check for size-specific pricing change
    if (size && pricingChanges && product.id && pricingChanges[product.id + '-' + size]) {
      const pricing = pricingChanges[product.id + '-' + size];
      if (pricing.discountType === 'percentage') {
        const discountedPrice = Math.round(basePrice * (1 - pricing.discountValue / 100));
        return { price: discountedPrice, original: basePrice, onSale: true };
      } else if (pricing.discountType === 'fixed') {
        const discountedPrice = Math.max(0, basePrice - pricing.discountValue);
        return { price: discountedPrice, original: basePrice, onSale: true };
      }
    }
    
    // Check for base product pricing change
    if (pricingChanges && product.id && pricingChanges[product.id]) {
      const pricing = pricingChanges[product.id];
      if (pricing.discountType === 'percentage') {
        const discountedPrice = Math.round(basePrice * (1 - pricing.discountValue / 100));
        return { price: discountedPrice, original: basePrice, onSale: true };
      } else if (pricing.discountType === 'fixed') {
        const discountedPrice = Math.max(0, basePrice - pricing.discountValue);
        return { price: discountedPrice, original: basePrice, onSale: true };
      }
    }
    
    // Use product's own sale price if set
    if (product.onSale && product.salePrice) {
      return { price: product.salePrice, original: baseComparePrice, onSale: true };
    }
    
    return { price: basePrice, original: baseComparePrice, onSale: false };
  };
  
  const defaultPrice = calculatePriceForSize(null);
  const productOnSale = defaultPrice.onSale;
  const productSalePrice = defaultPrice.onSale ? defaultPrice.price : null;
  const productOriginalPrice = defaultPrice.original;
  const productPrice = defaultPrice.price;
  const compareAtPrice = defaultPrice.original;
  // Handle stock - can be number or object with size-based stock
  const productStockObj = product?.stock || {};
  const productStock = typeof productStockObj === 'number' ? productStockObj : 0;
  const stockBySize = typeof productStockObj === 'object' && !Array.isArray(productStockObj) ? productStockObj : {};
  const productSubVariants = product?.subVariants || {};
  const hasSubVariants = productSubVariants && typeof productSubVariants === 'object' && Object.keys(productSubVariants).length > 0;
  const parentVariantKeys = hasSubVariants ? Object.keys(productSubVariants) : [];
  // Flat sizes: stock keys that don't contain '|' and aren't sub-variant parents
  const subVariantParentSet = new Set(parentVariantKeys);
  const flatSizeKeys = Object.keys(stockBySize).filter(k => !k.includes('|') && !subVariantParentSet.has(k)).sort();
  // Get sizes from sizes array or from stock object keys
  let productSizes = product?.sizes || [];
  if (productSizes.length === 0 && flatSizeKeys.length > 0) {
    productSizes = flatSizeKeys;
  } else if (productSizes.length === 0 && Object.keys(stockBySize).length > 0 && !hasSubVariants) {
    productSizes = Object.keys(stockBySize).filter(k => !k.includes('|')).sort();
  }
  const productColors = product?.colors || [];
  const productVariants = product?.variants || [];
  // Compute initial add-to-bag stock
  let initialAddToBagStock = productStock;
  if (hasSubVariants && parentVariantKeys[0]) {
    const firstSub = (productSubVariants[parentVariantKeys[0]] || [])[0];
    initialAddToBagStock = firstSub ? (stockBySize[parentVariantKeys[0] + '|' + (firstSub.name || '')] || 0) : 0;
  } else if (productSizes.length > 0) {
    initialAddToBagStock = stockBySize[productSizes[0]] !== undefined ? stockBySize[productSizes[0]] : productStock;
  }
  const productCategory = product?.category || 'Products';
  const productBrand = product?.brand || siteName;
  
  const pdpFavicon = settings?.seo?.favicon || '/favicon.png';
  const pdpFaviconType = pdpFavicon.includes('.ico') ? 'image/x-icon' : pdpFavicon.includes('.svg') ? 'image/svg+xml' : (pdpFavicon.includes('.jpg') || pdpFavicon.includes('.jpeg')) ? 'image/jpeg' : 'image/png';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${productName} - ${siteName}</title>
    <meta name="description" content="${productDescription.substring(0, 160)}">
    <link rel="icon" href="${pdpFavicon}" type="${pdpFaviconType}">
    <link rel="icon" href="${pdpFavicon}" sizes="32x32">
    <link rel="icon" href="${pdpFavicon}" sizes="16x16">
    <link rel="apple-touch-icon" href="${pdpFavicon}" sizes="180x180">
    <link rel="shortcut icon" href="${pdpFavicon}">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
            line-height: 1.5; 
            color: ${textColor};
            background-color: ${backgroundColor};
            overflow-x: hidden;
            -webkit-text-size-adjust: 100%;
        }
        a { color: inherit; text-decoration: none; }
        button { color: inherit; }
        :root {
            --primary: ${primaryColor};
            --secondary: ${secondaryColor};
            --bg: ${backgroundColor};
            --text: ${textColor};
            --discount: ${discountColor};
        }
        
        /* Layout */
        .container { max-width: 1440px; width: 100%; margin: 0 auto; padding: 0 24px; box-sizing: border-box; }
        .product-page { display: grid; grid-template-columns: 1fr 450px; gap: 48px; padding: 24px 0; }
        
        /* Breadcrumb */
        .breadcrumb { 
            display: flex; align-items: center; gap: 8px; 
            font-size: 13px; color: var(--text); opacity: 0.85; margin-bottom: 16px; 
            text-transform: uppercase; letter-spacing: 0.5px;
        }
        .breadcrumb a { color: var(--text); opacity: 0.85; text-decoration: underline; }
        .breadcrumb a:hover { color: var(--primary); opacity: 1; }
        .breadcrumb span { color: var(--text); }
        
        /* Image Gallery */
        .gallery { position: relative; }
        .gallery-grid { 
            display: grid; 
            grid-template-columns: repeat(2, 1fr); 
            gap: 4px; 
            max-height: 700px;
            overflow: hidden;
            transition: max-height 0.5s ease;
        }
        .gallery-grid.expanded { max-height: none; }
        .gallery-img { 
            width: 100%; 
            aspect-ratio: 1; 
            object-fit: cover; 
            background: #f5f5f5;
            cursor: zoom-in;
        }
        .gallery-img:first-child { grid-column: 1; grid-row: 1; }
        .gallery-img:nth-child(2) { grid-column: 2; grid-row: 1 / span 2; }
        .show-more-btn {
            display: flex; align-items: center; justify-content: center; gap: 8px;
            margin: 0 auto; padding: 14px 28px;
            background: white; border: 1px solid var(--primary);
            font-size: 13px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 2px; cursor: pointer;
            transition: all 0.2s;
            margin-top: -24px;
            position: relative;
            z-index: 10;
        }
        .show-more-btn:hover { background: var(--primary); color: white; }
        .show-more-btn .material-icons { font-size: 18px; transition: transform 0.3s; }
        .show-more-btn.expanded .material-icons { transform: rotate(180deg); }
        
        /* Product Info */
        .product-info { position: sticky; top: 24px; color: var(--text); }
        .product-info, .product-info * { -webkit-text-fill-color: initial; }
        .rating { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .rating-link:hover .review-count { text-decoration: underline; }
        .stars { color: var(--primary); font-size: 14px; letter-spacing: 2px; }
        .review-count { font-size: 13px; color: var(--text); opacity: 0.8; }
        .product-title { 
            font-size: 28px; font-weight: 900; 
            text-transform: uppercase; letter-spacing: -0.5px;
            margin-bottom: 8px; line-height: 1.1;
            color: var(--text);
        }
        .product-price { 
            font-size: 18px; font-weight: 700; 
            margin-bottom: 24px; 
            display: flex; align-items: center; gap: 12px;
            color: var(--text);
        }
        .price-sale { color: var(--discount); }
        .price-original { text-decoration: line-through; color: var(--text); opacity: 0.65; font-size: 14px; }
        
        /* Color Variants */
        .color-section { margin-bottom: 24px; color: var(--text); }
        .color-label { font-size: 13px; font-weight: 700; margin-bottom: 12px; color: var(--text); }
        .color-options { display: flex; gap: 8px; }
        .color-option { 
            width: 52px; height: 52px; 
            border: 2px solid transparent; 
            padding: 2px; cursor: pointer;
            transition: border-color 0.2s;
        }
        .color-option:hover, .color-option.active { border-color: var(--primary); }
        .color-option img { width: 100%; height: 100%; object-fit: cover; }
        .color-name { font-size: 13px; color: var(--text); opacity: 0.75; margin-top: 8px; }
        .promo-notice { 
            font-size: 12px; color: var(--text); opacity: 0.8; 
            margin-bottom: 24px; padding: 12px;
            background: rgba(0,0,0,0.04);
        }
        
        /* Size Selector */
        .size-section { margin-bottom: 24px; color: var(--text); }
        .size-header { 
            display: flex; justify-content: space-between; 
            align-items: center; margin-bottom: 12px;
        }
        .size-label { font-size: 13px; font-weight: 700; color: var(--text); }
        .size-chart { font-size: 13px; color: var(--primary); text-decoration: underline; cursor: pointer; }
        .size-grid { 
            display: grid; 
            grid-template-columns: repeat(5, 1fr); 
            gap: 8px;
        }
        .size-btn {
            padding: 12px 8px; 
            border: 1px solid #e5e5e5; 
            background: white;
            font-size: 13px; font-weight: 500;
            cursor: pointer; transition: all 0.2s;
            text-align: center;
            color: var(--text);
        }
        .size-btn:hover:not(:disabled) { border-color: var(--primary); }
        .size-btn.active { border-color: var(--primary); border-width: 2px; }
        .size-btn:disabled { 
            color: #ccc; cursor: not-allowed; 
            text-decoration: line-through;
            opacity: 0.5;
        }
        .size-btn.low-stock {
            border-color: #f59e0b;
        }
        .size-stock-badge {
            display: block;
            font-size: 9px;
            font-weight: 700;
            margin-top: 2px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .size-stock-badge.out {
            color: #dc2626;
        }
        .size-stock-badge.low {
            color: #f59e0b;
        }
        .size-advice {
            display: flex; align-items: flex-start; gap: 8px;
            margin-top: 16px; padding: 16px;
            border: 1px solid #e5e5e5;
            font-size: 13px;
        }
        .size-advice .material-icons { font-size: 18px; flex-shrink: 0; }
        
        /* Add to Bag */
        .add-to-bag-section { 
            display: flex; gap: 12px; 
            margin-bottom: 24px; margin-top: 24px;
            min-width: 0; max-width: 100%;
        }
        .add-to-bag-btn {
            flex: 1; min-width: 0; max-width: 100%;
            display: flex; align-items: center; justify-content: space-between;
            padding: 16px 20px;
            background: var(--primary); color: white;
            border: none; font-size: 13px; font-weight: 700;
            text-transform: uppercase; letter-spacing: 2px;
            cursor: pointer; transition: background 0.2s;
            box-sizing: border-box;
        }
        .add-to-bag-btn:hover { opacity: 0.9; filter: brightness(0.95); }
        .add-to-bag-btn:disabled { background: #9ca3af; color: #fff; cursor: not-allowed; opacity: 1; filter: none; }
        .add-to-bag-btn .material-icons { font-size: 20px; }
        .wishlist-btn {
            width: 56px; height: 56px;
            display: flex; align-items: center; justify-content: center;
            border: 1px solid #e5e5e5; background: white;
            cursor: pointer; transition: all 0.2s;
        }
        .wishlist-btn:hover { border-color: var(--primary); }
        .wishlist-btn .material-icons { font-size: 24px; }
        .wishlist-btn.active .material-icons { color: #e53935; }
        
        /* Delivery Info */
        .delivery-info { margin-bottom: 24px; }
        .delivery-item {
            display: flex; align-items: flex-start; gap: 12px;
            padding: 12px 0;
            border-bottom: 1px solid #e5e5e5;
            font-size: 13px;
        }
        .delivery-item:last-child { border-bottom: none; }
        .delivery-item .material-icons { font-size: 20px; color: var(--text); opacity: 0.75; }
        .delivery-item a { color: var(--primary); text-decoration: underline; }
        
        /* Secure Badge */
        .secure-badge { 
            font-size: 13px; color: var(--text); opacity: 0.8; 
            margin-bottom: 16px;
        }
        
        
        /* Payment Options */
        .payment-option {
            display: flex; align-items: center; justify-content: space-between;
            padding: 16px;
            border: 1px solid #e5e5e5;
            margin-bottom: 24px;
        }
        .payment-text { font-size: 13px; }
        .payment-text strong { font-weight: 700; }
        .payment-logo { height: 24px; }
        
        /* Accordion Sections */
        .accordion { border-top: 1px solid #e5e5e5; margin-top: 48px; }
        .accordion-item { border-bottom: 1px solid #e5e5e5; }
        .accordion-header {
            display: flex; justify-content: space-between; align-items: center;
            padding: 20px 0; cursor: pointer;
            color: var(--text);
            font-size: 14px; font-weight: 700;
            color: var(--text);
        }
        .accordion-header .material-icons { transition: transform 0.3s; }
        .accordion-item.open .accordion-header .material-icons { transform: rotate(180deg); }
        .accordion-content {
            max-height: 0; overflow: hidden;
            transition: max-height 0.3s ease;
        }
        .accordion-item.open .accordion-content { max-height: 500px; }
        .accordion-body { padding: 0 0 20px; font-size: 14px; line-height: 1.7; color: var(--text); opacity: 0.85; }
        .accordion-body .review-item:last-child { border-bottom: none !important; }
        .review-comment-text, .review-reply-text { color: var(--text); opacity: 0.9; line-height: 1.5; margin: 0; font-size: 14px; }
        .review-form-wrap { 
            background: var(--bg); border-radius: 12px; padding: 20px; 
            border: 1px solid rgba(0,0,0,0.08); 
            max-width: 100%; overflow: hidden; box-sizing: border-box;
        }
        .review-form-wrap .review-field { margin-bottom: 16px; }
        .review-form-wrap .review-field:last-of-type { margin-bottom: 0; }
        .review-form-wrap .review-label { display: block; font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
        .review-form-wrap .review-input { width: 100%; max-width: 100%; padding: 12px 14px; border: 1px solid rgba(0,0,0,0.12); border-radius: 8px; font-size: 14px; color: var(--text); background: var(--bg); transition: border-color 0.2s; box-sizing: border-box; }
        .review-form-wrap .review-input:focus { border-color: var(--primary); outline: none; }
        .review-form-wrap .review-input::placeholder { color: var(--text); opacity: 0.5; }
        .review-form-wrap textarea.review-input { resize: vertical; min-height: 90px; }
        .review-form-wrap .review-stars { display: flex; gap: 2px; align-items: center; }
        .review-star-btn { background: none; border: none; cursor: pointer; padding: 2px; transition: transform 0.15s; }
        .review-star-btn:hover { transform: scale(1.08); }
        .review-star-btn .material-icons { font-size: 28px; color: rgba(0,0,0,0.2); transition: color 0.2s; }
        .review-star-btn.active .material-icons { color: var(--primary) !important; }
        .review-form-wrap .review-submit { 
            margin-top: 20px; width: 100%; max-width: 100%; padding: 14px 20px; 
            font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; 
            border-radius: 8px; background: var(--primary); color: white; border: none; 
            cursor: pointer; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;
            box-sizing: border-box;
        }
        .review-form-wrap .review-submit:hover:not(:disabled) { opacity: 0.92; }
        .review-form-wrap .review-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .review-form-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; color: var(--text); }
        
        /* Related Products Section */
        .related-section { 
            margin-top: 64px; 
            padding-top: 32px; 
            border-top: 1px solid #e5e5e5;
        }
        .section-title { 
            font-size: 22px; font-weight: 900; 
            text-transform: uppercase; letter-spacing: -0.5px;
            margin-bottom: 24px;
        }
        .products-carousel {
            display: flex; gap: 16px;
            overflow-x: auto; scroll-snap-type: x mandatory;
            padding-bottom: 16px;
            scrollbar-width: none;
            -ms-overflow-style: none;
        }
        .products-carousel::-webkit-scrollbar { display: none; }
        .product-card {
            flex: 0 0 calc(25% - 12px);
            min-width: 200px;
            scroll-snap-align: start;
            position: relative;
            text-decoration: none;
            color: inherit;
        }
        .product-card-img {
            width: 100%; aspect-ratio: 1;
            object-fit: cover; background: #f5f5f5;
            margin-bottom: 12px;
        }
        .product-card-badge {
            position: absolute; top: 8px; left: 8px;
            background: white; padding: 4px 8px;
            font-size: 11px; font-weight: 700;
        }
        .carousel-wishlist-btn {
            position: absolute; top: 8px; right: 8px; z-index: 5;
            width: 36px; height: 36px;
            background: white; border: none; border-radius: 50%;
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            padding: 0;
        }
        .carousel-wishlist-btn:hover { background: #f5f5f5; }
        .carousel-wishlist-btn .material-icons { font-size: 20px; color: #333; }
        .carousel-wishlist-btn.active .material-icons { color: #e53935; }
        .product-card-discount {
            position: absolute; bottom: 60px; left: 8px;
            background: var(--discount); color: white;
            padding: 4px 8px; font-size: 11px; font-weight: 700;
        }
        .product-card-title {
            font-size: 13px; font-weight: 500;
            margin-bottom: 4px;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .product-card-price { font-size: 13px; font-weight: 700; }
        .product-card-price-sale { color: var(--discount); margin-right: 8px; }
        .product-card-price-original { 
            color: #767677; text-decoration: line-through; 
            font-weight: 400;
        }
        .product-card-brand { font-size: 11px; color: #767677; margin-top: 2px; }
        
        /* Carousel Navigation */
        .carousel-container { position: relative; }
        .carousel-nav {
            position: absolute; top: 50%; transform: translateY(-100%);
            width: 40px; height: 40px;
            background: white; border: 1px solid #e5e5e5;
            border-radius: 50%; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            z-index: 10; transition: all 0.2s;
        }
        .carousel-nav:hover { background: #f5f5f5; }
        .carousel-nav.prev { left: -20px; }
        .carousel-nav.next { right: -20px; }
        @media (max-width: 640px) {
            .carousel-nav.prev { left: 8px; }
            .carousel-nav.next { right: 8px; }
            .carousel-nav { width: 36px; height: 36px; }
        }
        
        /* Pagination Dots */
        .carousel-dots {
            display: flex; justify-content: center; gap: 8px;
            margin-top: 16px;
        }
        .carousel-dot {
            width: 24px; height: 3px;
            background: #e5e5e5; border: none;
            cursor: pointer; transition: background 0.2s;
        }
        .carousel-dot.active { background: var(--primary); }
        
        /* Membership CTA */
        .membership-cta {
            background: #eceff1;
            padding: 48px 24px;
            margin-top: 64px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 32px;
        }
        .membership-text {
            font-size: 24px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: -0.5px;
            color: var(--text);
        }
        .membership-btn {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 32px;
            background: var(--primary);
            color: white;
            border: none;
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            cursor: pointer;
            text-decoration: none;
        }
        .membership-btn:hover { opacity: 0.9; filter: brightness(0.95); }
        
        /* Zoom Modal */
        .zoom-modal {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.9);
            z-index: 10000;
            cursor: zoom-out;
        }
        .zoom-modal.active { display: flex; align-items: center; justify-content: center; }
        .zoom-modal img { max-width: 90%; max-height: 90%; object-fit: contain; }
        .zoom-close {
            position: absolute;
            top: 24px;
            right: 24px;
            background: white;
            border: none;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        /* Responsive */
        @media (max-width: 1024px) {
            .product-page { grid-template-columns: 1fr; gap: 32px; }
            .product-info { position: static; }
            .gallery-grid { max-height: 500px; }
            .product-card { flex: 0 0 calc(50% - 8px); }
        }
        @media (max-width: 640px) {
            .container { padding: 0 16px; }
            .product-page { padding: 16px 0; }
            .gallery-grid { grid-template-columns: 1fr; max-height: 400px; }
            .gallery-img:nth-child(2) { grid-column: 1; grid-row: 2; }
            .size-grid { grid-template-columns: repeat(4, 1fr); }
            .product-title { font-size: 22px; }
            .add-to-bag-section { gap: 8px; margin-bottom: 20px; margin-top: 20px; }
            .add-to-bag-btn { padding: 14px 16px; font-size: 12px; letter-spacing: 1px; }
            .wishlist-btn { width: 48px; height: 48px; flex-shrink: 0; }
            .review-form-wrap { padding: 16px; }
            .accordion { margin-top: 32px; }
            .membership-cta { flex-direction: column; text-align: center; }
            .membership-text { font-size: 18px; }
        }
        
        /* Toast Notification */
        .toast {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: var(--primary);
            color: white;
            padding: 16px 32px;
            font-size: 14px;
            font-weight: 600;
            z-index: 10001;
            opacity: 0;
            transition: all 0.3s ease;
        }
        .toast.show {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
    </style>
</head>
<body>
    ${navbarSection ? builderGenerateNavbarHTML(navbarSection.data || {}, navbarSection.style || {}, siteId, useCleanUrls) : ''}
    
    <main class="container">
        ${productNotFound ? `
            <div style="text-align: center; padding: 100px 24px;">
                <span class="material-icons" style="font-size: 80px; color: #ccc; margin-bottom: 24px;">search_off</span>
                <h1 style="font-size: 32px; font-weight: 900; margin-bottom: 16px;">PRODUCT NOT FOUND</h1>
                <p style="font-size: 16px; color: #767677; margin-bottom: 32px;">The product you're looking for doesn't exist or has been removed.</p>
                <a href="${baseUrl}/products" class="add-to-bag-btn" style="display: inline-flex; text-decoration: none;">
                    CONTINUE SHOPPING
                    <span class="material-icons">arrow_forward</span>
                </a>
            </div>
        ` : `
            <div class="product-page">
                <!-- Gallery Section -->
                <div class="gallery">
                    <div class="gallery-grid" id="galleryGrid">
                        ${productImages.length > 0 
                            ? productImages.slice(0, 6).map((img, i) => `
                                <img src="${img}" alt="${productName}" class="gallery-img" onclick="openZoom('${img}')">
                            `).join('')
                            : `<div class="gallery-img" style="display: flex; align-items: center; justify-content: center; background: #f5f5f5;">
                                <span class="material-icons" style="font-size: 80px; color: #ccc;">image</span>
                            </div>`
                        }
                    </div>
                    ${productImages.length > 4 ? `
                        <button class="show-more-btn" onclick="toggleGallery(this)">
                            <span class="show-more-label">SHOW MORE</span>
                            <span class="material-icons">expand_more</span>
                        </button>
                    ` : ''}
                    
                    <!-- Accordion Sections -->
                    <div class="accordion">
                        <div class="accordion-item">
                            <div class="accordion-header" onclick="toggleAccordion(this)">
                                Product Description
                                <span class="material-icons">expand_more</span>
                            </div>
                            <div class="accordion-content">
                                <div class="accordion-body">
                                    ${safeHtml(productDescription || 'No description available for this product.')}
                                </div>
                            </div>
                        </div>
                        <div class="accordion-item">
                            <div class="accordion-header" onclick="toggleAccordion(this)">
                                Product Details
                                <span class="material-icons">expand_more</span>
                            </div>
                            <div class="accordion-content">
                                <div class="accordion-body">
                                    <ul style="list-style: disc; padding-left: 20px;">
                                        <li>SKU: ${safeHtml(product?.sku || product?.id || 'N/A')}</li>
                                        <li>Category: ${safeHtml(productCategory)}</li>
                                        <li>Brand: ${safeHtml(productBrand)}</li>
                                        ${productColors.length > 0 ? `<li>Colors: ${safeHtml(productColors.join(', '))}</li>` : ''}
                                        ${productSizes.length > 0 ? `<li>Available Sizes: ${safeHtml(productSizes.join(', '))}</li>` : ''}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="accordion-item" id="reviews">
                            <div class="accordion-header" onclick="toggleAccordion(this)">
                                Reviews (${reviewStats.count})
                                <span class="material-icons">expand_more</span>
                            </div>
                            <div class="accordion-content">
                                <div class="accordion-body">
                                    ${productReviews.length > 0 ? productReviews.map(r => {
                                        const stars = '★'.repeat(r.rating || 0) + '☆'.repeat(5 - (r.rating || 0));
                                        const dateStr = r.createdAt ? r.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
                                        return `
                                        <div class="review-item" style="padding: 16px 0; border-bottom: 1px solid rgba(0,0,0,0.08);">
                                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                                <div>
                                                    <strong style="color: var(--primary);">${safeHtml(r.customerName)}</strong>
                                                    <span style="color: var(--primary); letter-spacing: 2px; margin-left: 8px;">${stars}</span>
                                                </div>
                                                ${dateStr ? `<span style="font-size: 13px; color: var(--text); opacity: 0.7;">${dateStr}</span>` : ''}
                                            </div>
                                            ${r.title ? `<p style="font-weight: 600; margin-bottom: 6px; color: var(--text);">${safeHtml(r.title)}</p>` : ''}
                                            <p class="review-comment-text">${safeHtml(r.comment)}</p>
                                            ${r.reply ? `
                                            <div style="margin-top: 12px; padding: 12px; background: rgba(0,0,0,0.04); border-left: 4px solid var(--primary);">
                                                <p style="font-size: 12px; font-weight: 600; color: var(--primary); margin-bottom: 4px;">Store Response</p>
                                                <p class="review-reply-text">${safeHtml(r.reply)}</p>
                                            </div>
                                            ` : ''}
                                        </div>
                                        `;
                                    }).join('') : '<p class="review-comment-text">No reviews yet. Be the first to review this product!</p>'}
                                    
                                    <div class="review-form-wrap" style="margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(0,0,0,0.08);">
                                        <h4 class="review-form-title">Write a Review</h4>
                                        <form id="reviewForm" onsubmit="submitReview(event)">
                                            <div class="review-field">
                                                <label class="review-label">Rating <span style="color: var(--discount);">*</span></label>
                                                <div class="review-stars">
                                                    ${[1,2,3,4,5].map(i => `<button type="button" class="review-star-btn" data-rating="${i}" onclick="setReviewRating(${i})" aria-label="${i} star"><span class="material-icons">star_border</span></button>`).join('')}
                                                </div>
                                                <input type="hidden" id="reviewRating" value="0">
                                            </div>
                                            <div class="review-field">
                                                <label class="review-label">Review Title <span style="opacity: 0.6; font-weight: 500;">(optional)</span></label>
                                                <input type="text" id="reviewTitle" class="review-input" placeholder="Summarize your experience">
                                            </div>
                                            <div class="review-field">
                                                <label class="review-label">Your Review <span style="color: var(--discount);">*</span></label>
                                                <textarea id="reviewComment" required rows="4" class="review-input" placeholder="Share your thoughts about this product..."></textarea>
                                            </div>
                                            <button type="submit" id="reviewSubmitBtn" class="review-submit">
                                                <span class="material-icons" style="vertical-align: middle; font-size: 18px; margin-right: 8px;">send</span> Submit Comment
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Product Info Section -->
                <div class="product-info">
                    <div class="breadcrumb">
                        <a href="${baseUrl}">Home</a> /
                        <a href="${baseUrl}/products">Products</a> /
                        ${productCategory !== 'Products' ? `<a href="${baseUrl}/products?category=${encodeURIComponent(productCategory)}">${productCategory}</a> /` : ''}
                        <span>${productName}</span>
                    </div>
                    
                    <a href="#reviews" class="rating rating-link" onclick="event.preventDefault(); scrollToReviews();" style="text-decoration: none; color: inherit; display: inline-flex; align-items: center; gap: 8px; margin-bottom: 12px; cursor: pointer;">
                        <span class="stars">${reviewStats.count > 0 ? '★'.repeat(Math.round(reviewStats.averageRating)) + '☆'.repeat(5 - Math.round(reviewStats.averageRating)) : '★★★★★'}</span>
                        <span class="review-count">${reviewStats.count > 0 ? reviewStats.averageRating.toFixed(1) + ' (' + reviewStats.count + ')' : 'No reviews yet'}</span>
                    </a>
                    
                    <h1 class="product-title">${productName}</h1>
                    
                    <div class="product-price">
                        ${productOnSale && productSalePrice ? `
                            <span class="price-sale">${currencySymbol}${productPrice.toLocaleString()}</span>
                            <span class="price-original">${currencySymbol}${compareAtPrice.toLocaleString()}</span>
                        ` : `
                            <span>${currencySymbol}${productPrice.toLocaleString()}</span>
                        `}
                    </div>
                    
                    ${productColors.length > 1 ? `
                        <div class="color-section">
                            <div class="color-label">${productColors.length} colours available</div>
                            <div class="color-options">
                                ${productColors.map((color, i) => `
                                    <button class="color-option ${i === 0 ? 'active' : ''}" onclick="selectColor(this, '${color.replace(/'/g, "\\'")}')" title="${color.replace(/"/g, '&quot;')}">
                                        <div style="width: 100%; height: 100%; background: ${color};"></div>
                                    </button>
                                `).join('')}
                            </div>
                            <div class="color-name" id="selectedColorName">${(productColors[0] || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                        </div>
                    ` : ''}
                    
                    ${(hasSubVariants || productSizes.length > 0) ? `
                        <div class="size-section">
                            <div class="size-header">
                                <span class="size-label">Select Size</span>
                                <span class="size-chart">Size Chart</span>
                            </div>
                            <div class="size-grid">
                                ${(() => {
                                  // Build a unified list: sub-variant parents + flat sizes
                                  const allVariantButtons = [];
                                  // First: variants that have sub-variants
                                  if (hasSubVariants) {
                                    parentVariantKeys.forEach((parentKey, i) => {
                                      const subs = productSubVariants[parentKey] || [];
                                      const totalStock = subs.reduce((sum, s) => sum + (s.stock || 0), 0);
                                      const isOutOfStock = totalStock === 0;
                                      const isLowStock = totalStock > 0 && totalStock <= 5;
                                      allVariantButtons.push(`
                                        <button class="size-btn all-variant-btn ${i === 0 ? 'active' : ''} ${isOutOfStock ? 'disabled' : ''} ${isLowStock ? 'low-stock' : ''}" 
                                                data-has-subs="true"
                                                data-variant-key="${String(parentKey).replace(/"/g, '&quot;')}"
                                                onclick="selectMainVariant(this, '${String(parentKey).replace(/'/g, "\\'")}')" 
                                                ${isOutOfStock ? 'disabled' : ''}
                                                title="${isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock (' + totalStock + ' left)' : 'In Stock'}">
                                            ${safeHtml(parentKey)}
                                            ${isOutOfStock ? '<span class="size-stock-badge out">OUT</span>' : isLowStock ? '<span class="size-stock-badge low">' + totalStock + '</span>' : ''}
                                        </button>
                                      `);
                                    });
                                  }
                                  // Then: flat sizes (no sub-variants)
                                  productSizes.forEach((size) => {
                                    const sizeStock = stockBySize[size] !== undefined ? stockBySize[size] : (productStock > 0 ? productStock : 0);
                                    const isOutOfStock = sizeStock === 0;
                                    const isLowStock = sizeStock > 0 && sizeStock <= 5;
                                    const isFirstActive = allVariantButtons.length === 0;
                                    allVariantButtons.push(`
                                      <button class="size-btn all-variant-btn ${isFirstActive ? 'active' : ''} ${isOutOfStock ? 'disabled' : ''} ${isLowStock ? 'low-stock' : ''}" 
                                              data-has-subs="false"
                                              data-variant-key="${(size || '').replace(/"/g, '&quot;')}"
                                              onclick="selectMainVariant(this, '${(size || '').replace(/'/g, "\\'")}')" 
                                              ${isOutOfStock ? 'disabled' : ''}
                                              title="${isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock (' + sizeStock + ' left)' : 'In Stock'}">
                                          ${safeHtml(size)}
                                          ${isOutOfStock ? '<span class="size-stock-badge out">OUT</span>' : isLowStock ? '<span class="size-stock-badge low">' + sizeStock + '</span>' : ''}
                                      </button>
                                    `);
                                  });
                                  return allVariantButtons.join('');
                                })()}
                            </div>
                        </div>
                        <div class="size-section subvariant-section" id="subvariantSection" style="display: ${hasSubVariants && parentVariantKeys.length > 0 ? 'block' : 'none'};">
                            <div class="size-header">
                                <span class="size-label">Select Sub Size</span>
                            </div>
                            <div class="size-grid" id="subvariantGrid">
                                ${(() => {
                                  if (!hasSubVariants || parentVariantKeys.length === 0) return '';
                                  const firstParent = parentVariantKeys[0];
                                  const firstSubs = productSubVariants[firstParent] || [];
                                  return firstSubs.map((sub, i) => {
                                    const compoundKey = firstParent + '|' + sub.name;
                                    const sizeStock = stockBySize[compoundKey] !== undefined ? stockBySize[compoundKey] : (sub.stock || 0);
                                    const isOutOfStock = sizeStock === 0;
                                    const isLowStock = sizeStock > 0 && sizeStock <= 5;
                                    return `
                                        <button class="size-btn sub-variant-btn ${i === 0 ? 'active' : ''} ${isOutOfStock ? 'disabled' : ''} ${isLowStock ? 'low-stock' : ''}" 
                                                data-parent="${firstParent.replace(/"/g, '&quot;')}" data-sub="${(sub.name || '').replace(/"/g, '&quot;')}"
                                                onclick="selectSubVariant(this, '${firstParent.replace(/'/g, "\\'")}', '${(sub.name || '').replace(/'/g, "\\'")}')" 
                                                ${isOutOfStock ? 'disabled' : ''}
                                                title="${isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock (' + sizeStock + ' left)' : 'In Stock'}">
                                            ${safeHtml(sub.name || '')}
                                            ${isOutOfStock ? '<span class="size-stock-badge out">OUT</span>' : isLowStock ? '<span class="size-stock-badge low">' + sizeStock + '</span>' : ''}
                                        </button>
                                    `;
                                  }).join('');
                                })()}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="add-to-bag-section">
                        <button class="add-to-bag-btn" onclick="addProductToCart()" id="addToBagBtn" ${initialAddToBagStock === 0 ? 'disabled' : ''}>
                            ${initialAddToBagStock === 0 ? 'OUT OF STOCK' : 'ADD TO BAG'}
                            <span class="material-icons">arrow_forward</span>
                        </button>
                        <button class="wishlist-btn" onclick="toggleWishlist(this)">
                            <span class="material-icons">favorite_border</span>
                        </button>
                    </div>
                    
                    <div class="delivery-info">
                        ${(() => {
                          const di = settings?.deliveryInfo || {};
                          const freeText = (di.freeDeliveryText || 'Free Delivery over {amount}').replace('{amount}', currencySymbol + (di.freeDeliveryThreshold ?? 500));
                          const freeLink = di.freeDeliveryLink || '#';
                          const stdText = di.standardDeliveryText || 'Standard Delivery: within 2-5 Business Days';
                          const stdLink = di.standardDeliveryLink || '#';
                          return `
                        <div class="delivery-item">
                            <span class="material-icons">local_shipping</span>
                            <div>
                                <a href="${freeLink}">${safeHtml(freeText)}</a>
                            </div>
                        </div>
                        <div class="delivery-item">
                            <span class="material-icons">schedule</span>
                            <div>
                                <a href="${stdLink}">${safeHtml(stdText)}</a>
                            </div>
                        </div>
                          `;
                        })()}
                    </div>
                    
                    <div class="secure-badge">
                        ${safeHtml((settings?.deliveryInfo?.returnsText || 'Secure transactions with hassle free 14 days returns.'))}
                    </div>
                </div>
            </div>
            
            <!-- You Might Also Like -->
            ${relatedProducts.length > 0 ? `
                <div class="related-section">
                    <h2 class="section-title">YOU MIGHT ALSO LIKE</h2>
                    <div class="carousel-container">
                        <button class="carousel-nav prev" onclick="scrollCarousel('related', -1)">
                            <span class="material-icons">chevron_left</span>
                        </button>
                        <div class="products-carousel" id="relatedCarousel">
                            ${relatedProducts.map(p => {
                                const pOnSale = p.onSale && p.salePrice;
                                const pPrice = pOnSale ? p.salePrice : (p.sellingPrice || p.price || 0);
                                const pOriginal = p.compareAtPrice || p.sellingPrice || p.price || 0;
                                const discount = pOnSale ? Math.round((1 - pPrice / pOriginal) * 100) : 0;
                                const pSlug = generateSlug(p.name || '');
                                return `
                                    <a href="${baseUrl}/products/${pSlug}" class="product-card" data-product-id="${p.id}">
                                        <button type="button" class="carousel-wishlist-btn" onclick="event.preventDefault();event.stopPropagation();toggleCarouselWishlist('${p.id}', this)" title="Wishlist">
                                            <span class="material-icons">favorite_border</span>
                                        </button>
                                        ${discount > 0 ? `<div class="product-card-discount">-${discount}%</div>` : ''}
                                        ${p.images && p.images[0] 
                                            ? `<img src="${p.images[0]}" alt="${p.name}" class="product-card-img">`
                                            : `<div class="product-card-img" style="display: flex; align-items: center; justify-content: center;">
                                                <span class="material-icons" style="font-size: 48px; color: #ccc;">image</span>
                                            </div>`
                                        }
                                        <div class="product-card-title">${p.name}</div>
                                        <div class="product-card-price">
                                            ${pOnSale ? `
                                                <span class="product-card-price-sale">${currencySymbol}${pPrice.toLocaleString()}</span>
                                                <span class="product-card-price-original">${currencySymbol}${pOriginal.toLocaleString()}</span>
                                            ` : `
                                                ${currencySymbol}${pPrice.toLocaleString()}
                                            `}
                                        </div>
                                        <div class="product-card-brand">${p.brand || siteName}</div>
                                    </a>
                                `;
                            }).join('')}
                        </div>
                        <button class="carousel-nav next" onclick="scrollCarousel('related', 1)">
                            <span class="material-icons">chevron_right</span>
                        </button>
                    </div>
                    <div class="carousel-dots" id="relatedDots"></div>
                </div>
            ` : ''}
            
            <!-- Others Also Bought -->
            ${othersBought.length > 0 ? `
                <div class="related-section">
                    <h2 class="section-title">OTHERS ALSO BOUGHT</h2>
                    <div class="carousel-container">
                        <button class="carousel-nav prev" onclick="scrollCarousel('others', -1)">
                            <span class="material-icons">chevron_left</span>
                        </button>
                        <div class="products-carousel" id="othersCarousel">
                            ${othersBought.map(p => {
                                const pOnSale = p.onSale && p.salePrice;
                                const pPrice = pOnSale ? p.salePrice : (p.sellingPrice || p.price || 0);
                                const pOriginal = p.compareAtPrice || p.sellingPrice || p.price || 0;
                                const discount = pOnSale ? Math.round((1 - pPrice / pOriginal) * 100) : 0;
                                const pSlug = generateSlug(p.name || '');
                                return `
                                    <a href="${baseUrl}/products/${pSlug}" class="product-card" data-product-id="${p.id}">
                                        <button type="button" class="carousel-wishlist-btn" onclick="event.preventDefault();event.stopPropagation();toggleCarouselWishlist('${p.id}', this)" title="Wishlist">
                                            <span class="material-icons">favorite_border</span>
                                        </button>
                                        ${discount > 0 ? `<div class="product-card-discount">-${discount}%</div>` : ''}
                                        ${p.images && p.images[0] 
                                            ? `<img src="${p.images[0]}" alt="${p.name}" class="product-card-img">`
                                            : `<div class="product-card-img" style="display: flex; align-items: center; justify-content: center;">
                                                <span class="material-icons" style="font-size: 48px; color: #ccc;">image</span>
                                            </div>`
                                        }
                                        <div class="product-card-title">${p.name}</div>
                                        <div class="product-card-price">
                                            ${pOnSale ? `
                                                <span class="product-card-price-sale">${currencySymbol}${pPrice.toLocaleString()}</span>
                                                <span class="product-card-price-original">${currencySymbol}${pOriginal.toLocaleString()}</span>
                                            ` : `
                                                ${currencySymbol}${pPrice.toLocaleString()}
                                            `}
                                        </div>
                                        <div class="product-card-brand">${p.brand || siteName}</div>
                                    </a>
                                `;
                            }).join('')}
                        </div>
                        <button class="carousel-nav next" onclick="scrollCarousel('others', 1)">
                            <span class="material-icons">chevron_right</span>
                        </button>
                    </div>
                    <div class="carousel-dots" id="othersDots"></div>
                </div>
            ` : ''}
            
            <!-- Membership CTA -->
            <div class="membership-cta">
                <span class="membership-text">JOIN US & GET 10% OFF YOUR FIRST ORDER</span>
                <a href="${baseUrl}/register" class="membership-btn">
                    SIGN UP FOR FREE
                    <span class="material-icons">arrow_forward</span>
                </a>
            </div>
        `}
    </main>
    
    ${footerSection ? builderGenerateFooterHTML(footerSection.data || {}, footerSection.style || {}, siteId, settings, useCleanUrls) : ''}
    
    <!-- Zoom Modal -->
    <div class="zoom-modal" id="zoomModal" onclick="closeZoom()">
        <button class="zoom-close" onclick="closeZoom()">
            <span class="material-icons">close</span>
        </button>
        <img id="zoomImage" src="" alt="Zoomed Image">
    </div>
    
    <!-- Toast -->
    <div class="toast" id="toast"></div>
    
    <script>
        const CURRENCY_SYMBOL = '${currencySymbol}';
        const SITE_ID = '${siteId}';
        const BUSINESS_ID = ${JSON.stringify(businessId || '')};
        const SUBMIT_REVIEW_URL = 'https://us-central1-${(config.FIREBASE_PROJECT_ID || 'madas-store')}.cloudfunctions.net/submitProductReview';
        const TRACK_CART_URL_PDP = 'https://us-central1-${(config.FIREBASE_PROJECT_ID || 'madas-store')}.cloudfunctions.net/trackCart';
        const BUSINESS_ID_PDP = ${JSON.stringify(businessId || '')};
        const SESSION_KEY_PDP = 'session_' + SITE_ID;
        const USER_KEY_PDP = 'user_' + SITE_ID;
        
        function getSessionIdPDP() {
            var sid = localStorage.getItem(SESSION_KEY_PDP);
            if (!sid) { sid = 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem(SESSION_KEY_PDP, sid); }
            return sid;
        }
        function syncCartPDP(items) {
            if (!BUSINESS_ID_PDP) return;
            try {
                var user = null;
                try { user = JSON.parse(localStorage.getItem(USER_KEY_PDP) || 'null'); } catch(e) {}
                fetch(TRACK_CART_URL_PDP, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        businessId: BUSINESS_ID_PDP,
                        sessionId: getSessionIdPDP(),
                        items: items,
                        customerName: user ? (user.name || user.displayName || 'Guest') : 'Guest',
                        customerEmail: user ? (user.email || null) : null,
                        customerPhone: user ? (user.phone || null) : null,
                        source: 'website'
                    })
                }).catch(function() {});
            } catch(e) {}
        }
        
        const stockBySize = ${JSON.stringify(stockBySize)};
        
        const currentProduct = ${JSON.stringify(product ? {
          id: product.id,
          name: productName,
          price: productPrice,
          image: productImages[0] || null,
          description: productDescription,
          stock: productStock,
          stockBySize: stockBySize,
          subVariants: productSubVariants,
          hasSubVariants: hasSubVariants
        } : null)};
        
        const relatedProductsData = ${JSON.stringify(relatedProducts.map(p => ({
          id: p.id,
          name: p.name,
          slug: generateSlug(p.name || ''),
          price: p.onSale && p.salePrice ? p.salePrice : (p.sellingPrice || p.price || 0),
          image: (p.images && p.images[0]) || null
        })))};
        const othersProductsData = ${JSON.stringify(othersBought.map(p => ({
          id: p.id,
          name: p.name,
          slug: generateSlug(p.name || ''),
          price: p.onSale && p.salePrice ? p.salePrice : (p.sellingPrice || p.price || 0),
          image: (p.images && p.images[0]) || null
        })))};
        
        let selectedSize = ${JSON.stringify(productSizes[0] || '')};
        let selectedColor = ${JSON.stringify(productColors[0] || '')};
        let selectedParentVariant = ${JSON.stringify(hasSubVariants && parentVariantKeys[0] ? parentVariantKeys[0] : '')};
        let selectedSubVariant = ${JSON.stringify(hasSubVariants && parentVariantKeys[0] ? ((productSubVariants[parentVariantKeys[0]] || [])[0]?.name || '') : '')};
        
        // LocalStorage helpers
        function getCart() {
            try { return JSON.parse(localStorage.getItem('cart_' + SITE_ID) || '[]'); }
            catch(e) { return []; }
        }
        function setCart(items) {
            localStorage.setItem('cart_' + SITE_ID, JSON.stringify(items));
            updateCartCount();
            syncCartPDP(items);
        }
        function getFavorites() {
            try { return JSON.parse(localStorage.getItem('favorites_' + SITE_ID) || '[]'); }
            catch(e) { return []; }
        }
        function setFavorites(items) {
            localStorage.setItem('favorites_' + SITE_ID, JSON.stringify(items));
            updateFavoritesCount();
        }
        function getUser() {
            try { return JSON.parse(localStorage.getItem('user_' + SITE_ID) || 'null'); }
            catch(e) { return null; }
        }
        function updateFavoritesCount() {
            var favorites = getFavorites();
            document.querySelectorAll('.favorites-count').forEach(function(el) {
                el.textContent = favorites.length;
                el.style.display = favorites.length > 0 ? 'flex' : 'none';
            });
        }
        function updateCartCount() {
            const cart = getCart();
            const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
            document.querySelectorAll('.cart-count').forEach(el => {
                el.textContent = count;
                el.style.display = count > 0 ? 'flex' : 'none';
            });
        }
        
        // Toast notification
        function showToast(message) {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
        
        // Gallery functions
        function toggleGallery(btn) {
            var grid = document.getElementById('galleryGrid');
            if (!grid) return;
            grid.classList.toggle('expanded');
            btn.classList.toggle('expanded');
            var label = btn.querySelector('.show-more-label');
            var icon = btn.querySelector('.material-icons');
            if (label) label.textContent = grid.classList.contains('expanded') ? 'SHOW LESS' : 'SHOW MORE';
            if (icon) icon.textContent = grid.classList.contains('expanded') ? 'expand_less' : 'expand_more';
        }
        
        function openZoom(src) {
            document.getElementById('zoomImage').src = src;
            document.getElementById('zoomModal').classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        
        function closeZoom() {
            document.getElementById('zoomModal').classList.remove('active');
            document.body.style.overflow = '';
        }
        
        // Accordion
        function toggleAccordion(header) {
            const item = header.parentElement;
            item.classList.toggle('open');
        }
        
        function scrollToReviews() {
            const el = document.getElementById('reviews');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                var header = el.querySelector('.accordion-header');
                if (header && !el.classList.contains('open')) toggleAccordion(header);
            }
        }
        
        var selectedReviewRating = 0;
        function setReviewRating(r) {
            selectedReviewRating = r;
            var inp = document.getElementById('reviewRating');
            if (inp) inp.value = r;
            document.querySelectorAll('.review-star-btn').forEach(function(btn, i) {
                btn.classList.toggle('active', i < r);
                var icon = btn.querySelector('.material-icons');
                if (icon) icon.textContent = i < r ? 'star' : 'star_border';
            });
        }
        
        function submitReview(e) {
            e.preventDefault();
            if (!currentProduct || !BUSINESS_ID) return;
            var commentEl = document.getElementById('reviewComment');
            var rating = parseInt(document.getElementById('reviewRating').value, 10);
            if (!commentEl || !commentEl.value.trim()) {
                showToast('Please write your review');
                return;
            }
            if (isNaN(rating) || rating < 1 || rating > 5) {
                showToast('Please select a rating (1-5 stars)');
                return;
            }
            var user = getUser();
            var customerName = (user && user.name && user.name.trim()) ? user.name.trim() : ((user && user.email) ? user.email.split('@')[0] : 'Anonymous');
            var customerEmail = (user && user.email) ? user.email : '';
            var btn = document.getElementById('reviewSubmitBtn');
            if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-icons" style="vertical-align: middle; font-size: 18px; margin-right: 8px;">hourglass_empty</span> Submitting...'; }
            fetch(SUBMIT_REVIEW_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessId: BUSINESS_ID,
                    productId: currentProduct.id,
                    productName: currentProduct.name,
                    customerName: customerName,
                    customerEmail: customerEmail,
                    rating: rating,
                    title: (document.getElementById('reviewTitle') || {}).value ? document.getElementById('reviewTitle').value.trim() : '',
                    comment: commentEl.value.trim()
                })
            }).then(function(res) { return res.json(); })
            .then(function(data) {
                showToast(data.message || 'Thank you! Your review has been submitted.');
                document.getElementById('reviewForm').reset();
                setReviewRating(0);
            })
            .catch(function(err) {
                showToast(err.message || 'Failed to submit. Please try again.');
            })
            .finally(function() {
                if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons" style="vertical-align: middle; font-size: 18px; margin-right: 8px;">send</span> Submit Comment'; }
            });
        }
        
        // Size & Color selection
        function selectMainVariant(btn, variantKey) {
            if (btn.disabled) {
                showToast('This size is out of stock');
                return;
            }
            // Deactivate all main variant buttons
            document.querySelectorAll('.all-variant-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            
            var hasSubs = btn.getAttribute('data-has-subs') === 'true';
            var subSection = document.getElementById('subvariantSection');
            var grid = document.getElementById('subvariantGrid');
            
            if (hasSubs) {
                // This variant has sub-variants: show sub-variant section
                selectedParentVariant = variantKey;
                selectedSubVariant = '';
                selectedSize = '';
                var subs = currentProduct && currentProduct.subVariants && currentProduct.subVariants[variantKey] ? currentProduct.subVariants[variantKey] : [];
                if (subSection) subSection.style.display = 'block';
                if (grid) {
                    grid.innerHTML = '';
                    subs.forEach(function(sub, i) {
                        var compoundKey = variantKey + '|' + (sub.name || '');
                        var sizeStock = stockBySize[compoundKey] !== undefined ? stockBySize[compoundKey] : (sub.stock || 0);
                        var isOutOfStock = sizeStock === 0;
                        var isLowStock = sizeStock > 0 && sizeStock <= 5;
                        var b = document.createElement('button');
                        b.className = 'size-btn sub-variant-btn' + (i === 0 ? ' active' : '') + (isOutOfStock ? ' disabled' : '') + (isLowStock ? ' low-stock' : '');
                        b.setAttribute('data-parent', variantKey);
                        b.setAttribute('data-sub', sub.name || '');
                        b.disabled = isOutOfStock;
                        b.title = isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock (' + sizeStock + ' left)' : 'In Stock';
                        b.appendChild(document.createTextNode(sub.name || ''));
                        if (isOutOfStock) {
                            var badge = document.createElement('span');
                            badge.className = 'size-stock-badge out';
                            badge.textContent = 'OUT';
                            b.appendChild(badge);
                        } else if (isLowStock) {
                            var badge = document.createElement('span');
                            badge.className = 'size-stock-badge low';
                            badge.textContent = String(sizeStock);
                            b.appendChild(badge);
                        }
                        b.addEventListener('click', function() { selectSubVariant(b, variantKey, sub.name || ''); });
                        grid.appendChild(b);
                    });
                    var firstSub = subs[0];
                    selectedSubVariant = firstSub ? (firstSub.name || '') : '';
                    var firstStock = firstSub ? (stockBySize[variantKey + '|' + (firstSub.name || '')] !== undefined ? stockBySize[variantKey + '|' + (firstSub.name || '')] : (firstSub.stock || 0)) : 0;
                    updateAddToBagButton(firstStock);
                }
            } else {
                // Flat variant (no sub-variants): hide sub-variant section
                selectedSize = variantKey;
                selectedParentVariant = '';
                selectedSubVariant = '';
                if (subSection) subSection.style.display = 'none';
                var sizeStock = stockBySize[variantKey] !== undefined ? stockBySize[variantKey] : (productStock > 0 ? productStock : 0);
                updateAddToBagButton(sizeStock);
            }
        }
        
        function selectColor(btn, color) {
            selectedColor = color;
            document.querySelectorAll('.color-option').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            var nameEl = document.getElementById('selectedColorName');
            if (nameEl) nameEl.textContent = color;
        }
        
        function selectSubVariant(btn, parentKey, subName) {
            if (btn.disabled) {
                showToast('This size is out of stock');
                return;
            }
            selectedSubVariant = subName;
            document.querySelectorAll('.sub-variant-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            var compoundKey = parentKey + '|' + subName;
            var sizeStock = stockBySize[compoundKey] !== undefined ? stockBySize[compoundKey] : 0;
            updateAddToBagButton(sizeStock);
        }
        
        function updateAddToBagButton(availableStock) {
            var addToBagBtn = document.querySelector('.add-to-bag-btn');
            if (!addToBagBtn) return;
            if (availableStock === 0) {
                addToBagBtn.disabled = true;
                addToBagBtn.innerHTML = 'OUT OF STOCK <span class="material-icons">arrow_forward</span>';
            } else {
                addToBagBtn.disabled = false;
                addToBagBtn.innerHTML = 'ADD TO BAG <span class="material-icons">arrow_forward</span>';
            }
        }
        
        // Cart functions
        function addProductToCart() {
            if (!currentProduct) return;
            
            var effectiveSize = selectedParentVariant && selectedSubVariant
                ? (selectedParentVariant + '|' + selectedSubVariant)
                : selectedSize;
            
            var availableStock = 0;
            if (effectiveSize && stockBySize[effectiveSize] !== undefined) {
                availableStock = stockBySize[effectiveSize];
            } else if (typeof currentProduct.stock === 'number') {
                availableStock = currentProduct.stock;
            } else {
                availableStock = Object.keys(stockBySize).reduce(function(sum, k) { return sum + (stockBySize[k] || 0); }, 0);
            }
            
            if (availableStock === 0) {
                showToast('This size is out of stock');
                return;
            }
            
            var finalPrice = currentProduct.price || currentProduct.sellingPrice || currentProduct.originalPrice || 0;
            
            var cart = getCart();
            var itemKey = currentProduct.id + (effectiveSize ? '-' + effectiveSize : '') + (selectedColor ? '-' + selectedColor : '');
            var existing = cart.find(function(item) { return item.itemKey === itemKey; });
            
            if (existing) {
                var currentQuantity = existing.quantity || 1;
                if (currentQuantity + 1 > availableStock) {
                    showToast('Only ' + availableStock + ' available in this size');
                    return;
                }
                existing.quantity = currentQuantity + 1;
            } else {
                var item = Object.assign({}, currentProduct, {
                    itemKey: itemKey,
                    size: effectiveSize || undefined,
                    color: selectedColor || undefined,
                    price: finalPrice,
                    quantity: 1
                });
                cart.push(item);
            }
            
            setCart(cart);
            showToast('Added to bag!');
        }
        
        // Wishlist
        function toggleWishlist(btn) {
            if (!currentProduct) return;
            
            const favorites = getFavorites();
            const index = favorites.findIndex(item => item.id === currentProduct.id);
            
            if (index > -1) {
                favorites.splice(index, 1);
                btn.classList.remove('active');
                btn.querySelector('.material-icons').textContent = 'favorite_border';
                showToast('Removed from wishlist');
            } else {
                favorites.push(currentProduct);
                btn.classList.add('active');
                btn.querySelector('.material-icons').textContent = 'favorite';
                showToast('Added to wishlist!');
            }
            
            setFavorites(favorites);
        }
        
        // Carousel
        function scrollCarousel(type, direction) {
            const carousel = document.getElementById(type === 'related' ? 'relatedCarousel' : 'othersCarousel');
            if (!carousel) return;
            const pageWidth = carousel.clientWidth;
            carousel.scrollBy({ left: pageWidth * direction, behavior: 'smooth' });
        }
        
        function goToCarouselPage(type, pageIndex) {
            const carousel = document.getElementById(type === 'related' ? 'relatedCarousel' : 'othersCarousel');
            if (!carousel) return;
            const pageWidth = carousel.clientWidth;
            carousel.scrollTo({ left: pageWidth * pageIndex, behavior: 'smooth' });
        }
        
        function initCarouselDots() {
            function setupDots(carouselId, dotsId, type) {
                const carousel = document.getElementById(carouselId);
                const dotsContainer = document.getElementById(dotsId);
                if (!carousel || !dotsContainer) return;
                const cardCount = carousel.querySelectorAll('.product-card').length;
                const cardsPerPage = Math.max(1, Math.floor(carousel.clientWidth / (200 + 16)));
                const pageCount = Math.max(1, Math.ceil(cardCount / cardsPerPage));
                dotsContainer.innerHTML = '';
                for (let i = 0; i < pageCount; i++) {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'carousel-dot' + (i === 0 ? ' active' : '');
                    btn.setAttribute('aria-label', 'Slide ' + (i + 1));
                    btn.onclick = function() { goToCarouselPage(type, i); };
                    dotsContainer.appendChild(btn);
                }
                carousel.addEventListener('scroll', function() {
                    const page = Math.round(carousel.scrollLeft / carousel.clientWidth);
                    dotsContainer.querySelectorAll('.carousel-dot').forEach(function(dot, i) {
                        dot.classList.toggle('active', i === page);
                    });
                });
            }
            setupDots('relatedCarousel', 'relatedDots', 'related');
            setupDots('othersCarousel', 'othersDots', 'others');
        }
        
        function toggleCarouselWishlist(productId, btn) {
            const allData = (relatedProductsData || []).concat(othersProductsData || []);
            const product = allData.find(function(p) { return p.id === productId; });
            if (!product) return;
            const favorites = getFavorites();
            const index = favorites.findIndex(function(item) { return item.id === productId; });
            var icon = btn.querySelector('.material-icons');
            if (index > -1) {
                favorites.splice(index, 1);
                btn.classList.remove('active');
                if (icon) icon.textContent = 'favorite_border';
                showToast('Removed from wishlist');
            } else {
                favorites.push({ id: product.id, name: product.name, slug: product.slug, price: product.price, image: product.image });
                btn.classList.add('active');
                if (icon) icon.textContent = 'favorite';
                showToast('Added to wishlist!');
            }
            setFavorites(favorites);
        }
        
        function syncCarouselWishlistButtons() {
            const favorites = getFavorites();
            document.querySelectorAll('.carousel-wishlist-btn').forEach(function(btn) {
                var card = btn.closest('.product-card');
                var id = card ? card.getAttribute('data-product-id') : null;
                if (!id) return;
                var inFav = favorites.some(function(item) { return item.id === id; });
                btn.classList.toggle('active', inFav);
                var icon = btn.querySelector('.material-icons');
                if (icon) icon.textContent = inFav ? 'favorite' : 'favorite_border';
            });
        }
        
        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            updateCartCount();
            
            var favorites = getFavorites();
            if (currentProduct && favorites.find(function(item) { return item.id === currentProduct.id; })) {
                var btn = document.querySelector('.wishlist-btn');
                if (btn) {
                    btn.classList.add('active');
                    var icon = btn.querySelector('.material-icons');
                    if (icon) icon.textContent = 'favorite';
                }
            }
            
            syncCarouselWishlistButtons();
            initCarouselDots();
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeZoom();
        });
    </script>
</body>
</html>`;
}

function generateCartPageContent(siteId, primaryColor, secondaryColor, textColor, useCleanUrls = false, businessId = '') {
  const baseUrl = useCleanUrls ? '' : (siteId ? `/site/${siteId}` : '');
  const primary = primaryColor || '#27491F';
  return `
    <style>
        .cart-page { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }
        .cart-header { margin-bottom: 40px; }
        .cart-title { font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; margin-bottom: 8px; color: ${primary}; }
        .cart-subtitle { font-size: 14px; color: #767677; }
        .cart-layout { display: grid; grid-template-columns: 1fr 380px; gap: 48px; }
        .cart-items { display: flex; flex-direction: column; }
        .cart-item { display: flex; gap: 24px; padding: 24px 0; border-bottom: 1px solid #e5e5e5; }
        .cart-item:first-child { border-top: 1px solid #e5e5e5; }
        .item-image { width: 150px; height: 150px; background: #f5f5f5; flex-shrink: 0; }
        .item-image img { width: 100%; height: 100%; object-fit: cover; }
        .item-details { flex: 1; display: flex; flex-direction: column; }
        .item-name { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
        .item-meta { font-size: 13px; color: #767677; margin-bottom: 8px; }
        .item-price { font-size: 16px; font-weight: 700; margin-bottom: auto; }
        .item-actions { display: flex; align-items: center; gap: 24px; margin-top: 16px; }
        .quantity-selector { display: flex; align-items: center; border: 1px solid #e5e5e5; }
        .qty-btn { width: 40px; height: 40px; border: none; background: white; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; }
        .qty-btn:hover { background: #f5f5f5; }
        .qty-value { width: 50px; text-align: center; font-size: 14px; font-weight: 600; border-left: 1px solid #e5e5e5; border-right: 1px solid #e5e5e5; height: 40px; display: flex; align-items: center; justify-content: center; }
        .remove-btn { font-size: 13px; color: #767677; text-decoration: underline; cursor: pointer; background: none; border: none; }
        .remove-btn:hover { color: ${primary}; }
        .item-total { text-align: right; min-width: 100px; }
        .item-total-price { font-size: 16px; font-weight: 700; }
        
        .cart-summary { position: sticky; top: 24px; }
        .summary-card { border: 1px solid #e5e5e5; padding: 24px; }
        .summary-title { font-size: 18px; font-weight: 900; text-transform: uppercase; margin-bottom: 24px; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 14px; }
        .summary-row.total { border-top: 1px solid #e5e5e5; padding-top: 16px; margin-top: 16px; font-size: 16px; font-weight: 700; }
        .promo-section { margin: 24px 0; padding: 16px 0; border-top: 1px solid #e5e5e5; border-bottom: 1px solid #e5e5e5; }
        .promo-toggle { display: flex; justify-content: space-between; align-items: center; cursor: pointer; font-size: 14px; font-weight: 600; }
        .promo-form { margin-top: 16px; display: none; }
        .promo-form.active { display: flex; gap: 8px; }
        .promo-input { flex: 1; padding: 12px; border: 1px solid #e5e5e5; font-size: 14px; }
        .promo-apply { padding: 12px 24px; background: ${primary}; color: white; border: none; font-size: 13px; font-weight: 700; text-transform: uppercase; cursor: pointer; }
        
        .checkout-btn { width: 100%; padding: 18px; background: ${primary}; color: white; border: none; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 16px; }
        .checkout-btn:hover { opacity: 0.9; filter: brightness(0.95); }
        .checkout-btn .material-icons { font-size: 20px; }
        
        .payment-methods { display: flex; gap: 8px; justify-content: center; margin-top: 16px; }
        .payment-icon { width: 40px; height: 24px; background: #f5f5f5; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #767677; }
        
        .continue-shopping { display: block; text-align: center; margin-top: 16px; font-size: 13px; color: ${primary}; text-decoration: underline; }
        
        .empty-cart { text-align: center; padding: 80px 24px; }
        .empty-icon { font-size: 80px; color: #e5e5e5; margin-bottom: 24px; }
        .empty-title { font-size: 24px; font-weight: 900; text-transform: uppercase; margin-bottom: 8px; color: ${primary}; }
        .empty-text { font-size: 14px; color: #767677; margin-bottom: 32px; }
        .shop-btn { display: inline-flex; align-items: center; gap: 12px; padding: 16px 32px; background: ${primary}; color: white; text-decoration: none; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }
        .shop-btn:hover { opacity: 0.9; filter: brightness(0.95); }
        
        .delivery-info { margin-top: 24px; padding: 16px; background: #f5f5f5; font-size: 13px; }
        .delivery-info .material-icons { font-size: 18px; vertical-align: middle; margin-right: 8px; }
        
        @media (max-width: 900px) {
            .cart-layout { grid-template-columns: 1fr; }
            .cart-summary { position: static; }
            .cart-item { flex-wrap: wrap; }
            .item-image { width: 120px; height: 120px; }
            .item-total { width: 100%; text-align: left; margin-top: 16px; padding-top: 16px; border-top: 1px dashed #e5e5e5; }
        }
    </style>
    
    <div class="cart-page">
        <div class="cart-header">
            <h1 class="cart-title">YOUR BAG</h1>
            <p class="cart-subtitle" id="cart-subtitle">Loading...</p>
        </div>
        
        <div id="cart-content"></div>
    </div>
    
    <script>
        function renderCart() {
            const cart = getCart();
            const subtitle = document.getElementById('cart-subtitle');
            const content = document.getElementById('cart-content');
            
            const itemText = cart.length === 1 ? 'ITEM' : 'ITEMS';
            const totalQty = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
            subtitle.textContent = totalQty + ' ' + itemText + ' | ' + CURRENCY_SYMBOL + cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0).toFixed(2);
            
            if (cart.length === 0) {
                content.innerHTML = \`
                    <div class="empty-cart">
                        <span class="material-icons empty-icon">shopping_bag</span>
                        <h2 class="empty-title">YOUR BAG IS EMPTY</h2>
                        <p class="empty-text">Once you add something to your bag, it will appear here. Ready to get started?</p>
                        <a href="${baseUrl}/products" class="shop-btn">
                            START SHOPPING
                            <span class="material-icons">arrow_forward</span>
                        </a>
                    </div>
                \`;
                return;
            }
            
            const subtotal = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
            const shipping = subtotal >= 500 ? 0 : 50;
            const total = subtotal + shipping;
            
            content.innerHTML = \`
                <div class="cart-layout">
                    <div class="cart-items">
                        \${cart.map(item => \`
                            <div class="cart-item">
                                <div class="item-image">
                                    \${item.image 
                                        ? \`<img src="\${item.image}" alt="\${item.name}">\`
                                        : \`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><span class="material-icons" style="font-size:48px;color:#ccc;">image</span></div>\`
                                    }
                                </div>
                                <div class="item-details">
                                    <div class="item-name">\${item.name}</div>
                                    <div class="item-meta">
                                        \${item.size ? \`Size: \${item.size}\` : ''}
                                        \${item.color ? \` | Color: \${item.color}\` : ''}
                                    </div>
                                    <div class="item-price">\${CURRENCY_SYMBOL}\${(item.price || 0).toFixed(2)}</div>
                                    <div class="item-actions">
                                        <div class="quantity-selector">
                                            <button class="qty-btn" onclick="updateQuantity('\${item.itemKey || item.id}', -1)">−</button>
                                            <span class="qty-value">\${item.quantity || 1}</span>
                                            <button class="qty-btn" onclick="updateQuantity('\${item.itemKey || item.id}', 1)">+</button>
                                        </div>
                                        <button class="remove-btn" onclick="removeFromCart('\${item.itemKey || item.id}')">Remove</button>
                                    </div>
                                </div>
                                <div class="item-total">
                                    <div class="item-total-price">\${CURRENCY_SYMBOL}\${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</div>
                                </div>
                            </div>
                        \`).join('')}
                    </div>
                    
                    <div class="cart-summary">
                        <div class="summary-card">
                            <h2 class="summary-title">ORDER SUMMARY</h2>
                            
                            <div class="summary-row">
                                <span>\${totalQty} \${itemText}</span>
                                <span>\${CURRENCY_SYMBOL}\${subtotal.toFixed(2)}</span>
                            </div>
                            <div class="summary-row">
                                <span>Delivery</span>
                                <span>\${shipping === 0 ? 'FREE' : CURRENCY_SYMBOL + shipping.toFixed(2)}</span>
                            </div>
                            
                            <div class="promo-section">
                                <div class="promo-toggle" onclick="togglePromo()">
                                    <span>Do you have a Promo Code?</span>
                                    <span class="material-icons">expand_more</span>
                                </div>
                                <div class="promo-form" id="promoForm">
                                    <input type="text" class="promo-input" placeholder="Enter promo code">
                                    <button class="promo-apply">APPLY</button>
                                </div>
                            </div>
                            
                            <div class="summary-row total">
                                <span>Total</span>
                                <span>\${CURRENCY_SYMBOL}\${total.toFixed(2)}</span>
                            </div>
                            
                            <button class="checkout-btn" onclick="proceedToCheckout()">
                                CHECKOUT
                                <span class="material-icons">arrow_forward</span>
                            </button>
                            
                            <div class="payment-methods">
                                <div class="payment-icon">VISA</div>
                                <div class="payment-icon">MC</div>
                                <div class="payment-icon">AMEX</div>
                                <div class="payment-icon">COD</div>
                            </div>
                            
                            <a href="${baseUrl}/products" class="continue-shopping">Continue Shopping</a>
                            
                            <div class="delivery-info">
                                <span class="material-icons">local_shipping</span>
                                Free delivery on orders over \${CURRENCY_SYMBOL}500
                            </div>
                        </div>
                    </div>
                </div>
            \`;
        }
        
        function togglePromo() {
            document.getElementById('promoForm').classList.toggle('active');
        }
        
        function updateQuantity(id, delta) {
            const cart = getCart();
            const item = cart.find(i => (i.itemKey || i.id) === id);
            if (item) {
                item.quantity = Math.max(1, (item.quantity || 1) + delta);
                setCart(cart);
                renderCart();
            }
        }
        
        function removeFromCart(id) {
            const cart = getCart().filter(i => (i.itemKey || i.id) !== id);
            setCart(cart);
            renderCart();
            showToast('Item removed from bag');
        }
        
        function proceedToCheckout() {
            window.location.href = '${baseUrl}/checkout';
        }
        
        function showToast(message) {
            const existing = document.querySelector('.toast-notification');
            if (existing) existing.remove();
            
            const toast = document.createElement('div');
            toast.className = 'toast-notification';
            toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:' + (document.documentElement.style.getPropertyValue('--primary-color') || '#27491F') + ';color:white;padding:16px 32px;font-size:14px;font-weight:600;z-index:10000;';
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
        
        document.addEventListener('DOMContentLoaded', renderCart);
    </script>
  `;
}

function generateFavoritesPageContent(siteId, primaryColor, secondaryColor, textColor, useCleanUrls = false) {
  const baseUrl = useCleanUrls ? '' : (siteId ? `/site/${siteId}` : '');
  const primary = primaryColor || '#27491F';
  const text = textColor || '#171817';
  return `
    <style>
        .favorites-page { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }
        .favorites-header { margin-bottom: 40px; }
        .favorites-title { font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; margin-bottom: 8px; color: ${primary}; }
        .favorites-subtitle { font-size: 14px; color: #767677; }
        
        .favorites-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        
        .fav-product-card { position: relative; color: ${text}; display: block; text-decoration: none; }
        .fav-product-card-image {
            position: relative; aspect-ratio: 1; background: #f5f5f5; overflow: hidden;
            margin-bottom: 12px; border-radius: 12px;
        }
        .fav-product-card-image img {
            width: 100%; height: 100%; object-fit: cover; object-position: center;
            transition: transform 0.5s ease;
        }
        .fav-product-card:hover .fav-product-card-image img { transform: scale(1.05); }
        .fav-product-card-placeholder {
            width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
        }
        .fav-product-card-placeholder .material-icons { font-size: 64px; color: #e5e5e5; }
        
        .fav-remove-btn {
            position: absolute; top: 12px; right: 12px; width: 40px; height: 40px;
            background: white; border: none; border-radius: 50%; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 5;
        }
        .fav-remove-btn .material-icons { font-size: 20px; color: #e53935; }
        .fav-remove-btn:hover { background: #f5f5f5; }
        
        .fav-add-cart {
            position: absolute; bottom: 12px; left: 12px; right: 12px;
            padding: 12px; background: white; color: ${primary}; border: 2px solid ${primary};
            font-size: 13px; font-weight: 700; text-transform: uppercase; cursor: pointer;
            opacity: 0; transform: translateY(10px); transition: all 0.2s; border-radius: 8px;
            display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .fav-product-card:hover .fav-add-cart { opacity: 1; transform: translateY(0); }
        .fav-add-cart:hover { background: ${primary}; color: white; }
        
        .fav-product-card-info { padding: 0 4px; }
        .fav-product-card-name {
            font-size: 14px; font-weight: 500; margin-bottom: 4px;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${text};
        }
        .fav-product-card-price { font-size: 14px; font-weight: 700; color: ${text}; }
        .fav-product-card-brand { font-size: 12px; opacity: 0.7; margin-top: 4px; }
        
        .empty-favorites { text-align: center; padding: 80px 24px; }
        .empty-icon { font-size: 80px; color: #e5e5e5; margin-bottom: 24px; }
        .empty-title { font-size: 24px; font-weight: 900; text-transform: uppercase; margin-bottom: 8px; color: ${primary}; }
        .empty-text { font-size: 14px; color: #767677; margin-bottom: 32px; max-width: 400px; margin-left: auto; margin-right: auto; }
        .shop-btn { display: inline-flex; align-items: center; gap: 12px; padding: 16px 32px; background: ${primary}; color: white; text-decoration: none; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; border-radius: 12px; }
        .shop-btn:hover { opacity: 0.9; filter: brightness(0.95); }
        
        .move-all-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: ${primary}; color: white; border: none; font-size: 13px; font-weight: 700; text-transform: uppercase; cursor: pointer; margin-bottom: 24px; border-radius: 12px; }
        .move-all-btn:hover { opacity: 0.9; filter: brightness(0.95); }
        
        @media (max-width: 900px) { .favorites-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .favorites-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; } }
    </style>
    
    <div class="favorites-page">
        <div class="favorites-header">
            <h1 class="favorites-title">WISHLIST</h1>
            <p class="favorites-subtitle" id="favorites-subtitle">Loading...</p>
        </div>
        
        <div id="favorites-actions"></div>
        <div id="favorites-content"></div>
    </div>
    
    <script>
        function slugify(s) {
            if (!s) return '';
            return String(s).toLowerCase().trim().replace(/[^a-z0-9\\s-]/g, '').replace(/\\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        }
        function renderFavorites() {
            const favorites = getFavorites();
            const subtitle = document.getElementById('favorites-subtitle');
            const content = document.getElementById('favorites-content');
            const actions = document.getElementById('favorites-actions');
            
            const itemText = favorites.length === 1 ? 'ITEM' : 'ITEMS';
            subtitle.textContent = favorites.length + ' ' + itemText + ' SAVED';
            
            if (favorites.length === 0) {
                actions.innerHTML = '';
                content.innerHTML = \`
                    <div class="empty-favorites">
                        <span class="material-icons empty-icon">favorite_border</span>
                        <h2 class="empty-title">YOUR WISHLIST IS EMPTY</h2>
                        <p class="empty-text">You haven't saved any items to your wishlist yet. Start browsing and click the heart icon on products you love.</p>
                        <a href="${baseUrl}/products" class="shop-btn">
                            START SHOPPING
                            <span class="material-icons">arrow_forward</span>
                        </a>
                    </div>
                \`;
                return;
            }
            
            actions.innerHTML = \`
                <button class="move-all-btn" onclick="moveAllToCart()">
                    <span class="material-icons">shopping_bag</span>
                    MOVE ALL TO BAG
                </button>
            \`;
            
            content.innerHTML = \`
                <div class="favorites-grid">
                    \${favorites.map(item => \`
                        <div class="fav-product-card">
                            <div class="fav-product-card-image">
                                \${item.image 
                                    ? \`<img src="\${item.image}" alt="\${item.name}" loading="lazy">\`
                                    : \`<div class="fav-product-card-placeholder"><span class="material-icons">image</span></div>\`
                                }
                                <button type="button" class="fav-remove-btn" onclick="event.preventDefault();event.stopPropagation();removeFavorite('\${item.id}')" title="Remove from wishlist">
                                    <span class="material-icons">favorite</span>
                                </button>
                                <button type="button" class="fav-add-cart" onclick="event.preventDefault();event.stopPropagation();addToCartFromFavorites('\${item.id}')" title="Add to bag">
                                    <span class="material-icons">shopping_bag</span> Add to Bag
                                </button>
                            </div>
                            <a href="${baseUrl}/products/\${item.slug || slugify(item.name) || item.id}" class="fav-product-card-info" style="text-decoration: none; color: inherit;">
                                <div class="fav-product-card-name">\${item.name}</div>
                                <div class="fav-product-card-price">\${CURRENCY_SYMBOL}\${(item.price || 0).toFixed(2)}</div>
                                \${item.brand ? \`<div class="fav-product-card-brand">\${item.brand}</div>\` : ''}
                            </a>
                        </div>
                    \`).join('')}
                </div>
            \`;
        }
        
        function removeFavorite(id) {
            const favorites = getFavorites().filter(i => i.id !== id);
            setFavorites(favorites);
            renderFavorites();
            showToast('Removed from wishlist');
        }
        
        function addToCartFromFavorites(id) {
            const favorites = getFavorites();
            const item = favorites.find(i => i.id === id);
            if (item) {
                const cart = getCart();
                const existing = cart.find(i => i.id === id);
                if (existing) {
                    existing.quantity = (existing.quantity || 1) + 1;
                } else {
                    cart.push({ ...item, quantity: 1 });
                }
                setCart(cart);
                showToast('Added to bag!');
            }
        }
        
        function moveAllToCart() {
            const favorites = getFavorites();
            const cart = getCart();
            
            favorites.forEach(item => {
                const existing = cart.find(i => i.id === item.id);
                if (existing) {
                    existing.quantity = (existing.quantity || 1) + 1;
                } else {
                    cart.push({ ...item, quantity: 1 });
                }
            });
            
            setCart(cart);
            setFavorites([]);
            renderFavorites();
            showToast('All items moved to bag!');
        }
        
        function showToast(message) {
            const existing = document.querySelector('.toast-notification');
            if (existing) existing.remove();
            
            const toast = document.createElement('div');
            toast.className = 'toast-notification';
            toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:' + (document.documentElement.style.getPropertyValue('--primary-color') || '#27491F') + ';color:white;padding:16px 32px;font-size:14px;font-weight:600;z-index:10000;';
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
        
        document.addEventListener('DOMContentLoaded', renderFavorites);
    </script>
  `;
}

function generateProfilePageContent(siteId, primaryColor, secondaryColor, textColor, useCleanUrls = false) {
  const baseUrl = useCleanUrls ? '' : (siteId ? `/site/${siteId}` : '');
  const primary = primaryColor || '#27491F';
  return `
    <style>
        .profile-page { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }
        .profile-header { margin-bottom: 40px; }
        .profile-title { font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; margin-bottom: 8px; color: ${primary}; }
        
        .profile-layout { display: grid; grid-template-columns: 280px 1fr; gap: 48px; }
        
        /* Sidebar */
        .profile-sidebar { }
        .profile-card {
            text-align: center;
            padding: 32px 24px;
            border: 1px solid #e5e5e5;
            margin-bottom: 24px;
        }
        .profile-avatar {
            width: 100px; height: 100px;
            border-radius: 50%;
            background: #f5f5f5;
            margin: 0 auto 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }
        .profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .profile-avatar .material-icons { font-size: 48px; color: #ccc; }
        .profile-name { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
        .profile-email { font-size: 14px; color: #767677; }
        
        .profile-nav { border: 1px solid #e5e5e5; }
        .profile-nav-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 20px;
            border-bottom: 1px solid #e5e5e5;
            text-decoration: none;
            color: inherit;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            background: white;
            border: none;
            width: 100%;
            text-align: left;
        }
        .profile-nav-item:last-child { border-bottom: none; }
        .profile-nav-item:hover { background: #f5f5f5; }
        .profile-nav-item.active { background: ${primary}; color: white; }
        .profile-nav-item .material-icons { font-size: 20px; }
        .nav-count {
            margin-left: auto;
            background: #f5f5f5;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 700;
        }
        .profile-nav-item.active .nav-count { background: rgba(255,255,255,0.2); }
        
        /* Content */
        .profile-content { }
        .content-section { 
            border: 1px solid #e5e5e5; 
            padding: 32px;
            margin-bottom: 24px;
        }
        .section-title {
            font-size: 18px;
            font-weight: 900;
            text-transform: uppercase;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid #e5e5e5;
        }
        
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        .info-item label {
            display: block;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            color: #767677;
            margin-bottom: 8px;
        }
        .info-item p { font-size: 14px; margin: 0; }
        
        .form-row { margin-bottom: 20px; }
        .form-label {
            display: block;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 8px;
        }
        .form-input {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #e5e5e5;
            font-size: 14px;
        }
        .form-input:focus { border-color: ${primary}; outline: none; }
        
        .btn-save {
            padding: 14px 32px;
            background: ${primary};
            color: white;
            border: none;
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            cursor: pointer;
        }
        .btn-save:hover { opacity: 0.9; filter: brightness(0.95); }
        
        .btn-logout {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 14px 24px;
            background: white;
            color: #dc2626;
            border: 1px solid #dc2626;
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            cursor: pointer;
            width: 100%;
            justify-content: center;
            margin-top: 24px;
        }
        .btn-logout:hover { background: #dc2626; color: white; }
        
        /* Sign in required */
        .sign-in-required {
            text-align: center;
            padding: 80px 24px;
        }
        .sign-in-icon { font-size: 80px; color: #e5e5e5; margin-bottom: 24px; }
        .sign-in-title { font-size: 24px; font-weight: 900; text-transform: uppercase; margin-bottom: 8px; }
        .sign-in-text { font-size: 14px; color: #767677; margin-bottom: 32px; }
        .sign-in-btn {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            padding: 16px 32px;
            background: ${primary};
            color: white;
            text-decoration: none;
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 0 8px;
        }
        .sign-in-btn:hover { opacity: 0.9; filter: brightness(0.95); }
        .sign-in-btn.secondary { background: white; color: ${primary}; border: 1px solid ${primary}; }
        .sign-in-btn.secondary:hover { background: ${primary}10; }
        
        /* Orders */
        .order-card {
            border: 1px solid #e5e5e5;
            padding: 20px;
            margin-bottom: 16px;
        }
        .order-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 16px;
            border-bottom: 1px solid #e5e5e5;
        }
        .order-id { font-size: 14px; font-weight: 700; }
        .order-date { font-size: 13px; color: #767677; }
        .order-status {
            padding: 4px 12px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            background: #f5f5f5;
        }
        .order-status.delivered { background: #dcfce7; color: #166534; }
        .order-status.processing { background: #fef3c7; color: #92400e; }
        .order-status.shipped { background: #dbeafe; color: #1e40af; }
        
        .empty-orders {
            text-align: center;
            padding: 48px;
            color: #767677;
        }
        .empty-orders .material-icons { font-size: 48px; color: #e5e5e5; margin-bottom: 16px; }
        
        @media (max-width: 900px) {
            .profile-layout { grid-template-columns: 1fr; gap: 24px; }
            .profile-sidebar { order: -1; }
            .profile-nav { display: flex; overflow-x: auto; }
            .profile-nav-item { white-space: nowrap; border-bottom: none; border-right: 1px solid #e5e5e5; }
            .info-grid { grid-template-columns: 1fr; }
        }
    </style>
    
    <div class="profile-page">
        <div class="profile-header">
            <h1 class="profile-title">MY ACCOUNT</h1>
        </div>
        
        <div id="profile-content"></div>
    </div>
    
    <script>
        function renderProfile() {
            const user = getUser();
            const content = document.getElementById('profile-content');
            const cart = getCart();
            const favorites = getFavorites();
            
            if (!user) {
                content.innerHTML = \`
                    <div class="sign-in-required">
                        <span class="material-icons sign-in-icon">account_circle</span>
                        <h2 class="sign-in-title">SIGN IN REQUIRED</h2>
                        <p class="sign-in-text">Please sign in to view your profile, order history, and account settings.</p>
                        <div>
                            <a href="${baseUrl}/login" class="sign-in-btn">
                                SIGN IN
                                <span class="material-icons">arrow_forward</span>
                            </a>
                            <a href="${baseUrl}/register" class="sign-in-btn secondary">
                                CREATE ACCOUNT
                            </a>
                        </div>
                    </div>
                \`;
                return;
            }
            
            content.innerHTML = \`
                <div class="profile-layout">
                    <div class="profile-sidebar">
                        <div class="profile-card">
                            <div class="profile-avatar">
                                \${user.avatar 
                                    ? \`<img src="\${user.avatar}" alt="\${user.name}">\`
                                    : \`<span class="material-icons">person</span>\`
                                }
                            </div>
                            <div class="profile-name">\${user.name || 'Guest'}</div>
                            <div class="profile-email">\${user.email || ''}</div>
                        </div>
                        
                        <nav class="profile-nav">
                            <a href="${baseUrl}/profile" class="profile-nav-item active">
                                <span class="material-icons">person</span>
                                Account Details
                            </a>
                            <a href="${baseUrl}/cart" class="profile-nav-item">
                                <span class="material-icons">shopping_bag</span>
                                Shopping Bag
                                <span class="nav-count">\${cart.length}</span>
                            </a>
                            <a href="${baseUrl}/favorites" class="profile-nav-item">
                                <span class="material-icons">favorite</span>
                                Wishlist
                                <span class="nav-count">\${favorites.length}</span>
                            </a>
                            <a href="${baseUrl}/products" class="profile-nav-item">
                                <span class="material-icons">storefront</span>
                                Continue Shopping
                            </a>
                        </nav>
                    </div>
                    
                    <div class="profile-content">
                        <div class="content-section">
                            <h2 class="section-title">Account Details</h2>
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>Full Name</label>
                                    <p>\${user.name || '-'}</p>
                                </div>
                                <div class="info-item">
                                    <label>Email Address</label>
                                    <p>\${user.email || '-'}</p>
                                </div>
                                <div class="info-item">
                                    <label>Phone Number</label>
                                    <p>\${user.phone || '-'}</p>
                                </div>
                                <div class="info-item">
                                    <label>Member Since</label>
                                    <p>\${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</p>
                                </div>
                                \${typeof user.orderCount === 'number' ? \`
                                <div class="info-item">
                                    <label>Orders</label>
                                    <p>\${user.orderCount}</p>
                                </div>\` : ''}
                            </div>
                        </div>
                        
                        <div class="content-section">
                            <h2 class="section-title">Shipping Address</h2>
                            \${user.addressDetails ? \`
                            <div class="info-grid">
                                <div class="info-item" style="grid-column: 1 / -1;">
                                    <label>Street Address</label>
                                    <p>\${user.addressDetails.line || 'Not provided'}\${user.addressDetails.apartment ? ', Apt ' + user.addressDetails.apartment : ''}\${user.addressDetails.floor ? ', Floor ' + user.addressDetails.floor : ''}\${user.addressDetails.building ? ', Bldg ' + user.addressDetails.building : ''}</p>
                                </div>
                                <div class="info-item">
                                    <label>Governorate / State</label>
                                    <p>\${user.addressDetails.governorate || '-'}</p>
                                </div>
                                <div class="info-item">
                                    <label>Neighborhood</label>
                                    <p>\${user.addressDetails.neighborhood || '-'}</p>
                                </div>
                                <div class="info-item">
                                    <label>District</label>
                                    <p>\${user.addressDetails.district || '-'}</p>
                                </div>
                                <div class="info-item">
                                    <label>Country</label>
                                    <p>\${user.addressDetails.country || '-'}</p>
                                </div>
                            </div>
                            \` : \`
                            <p style="color: #767677; font-size: 14px;">No saved address yet. Your address will be saved automatically after your first order.</p>
                            \`}
                        </div>
                        
                        <button class="btn-logout" onclick="handleLogout()">
                            <span class="material-icons">logout</span>
                            SIGN OUT
                        </button>
                    </div>
                </div>
            \`;
        }
        
        function handleLogout() {
            localStorage.removeItem('user_${siteId}');
            localStorage.removeItem('auth_${siteId}');
            showToast('Signed out successfully');
            setTimeout(() => window.location.href = '${baseUrl}/login', 1000);
        }
        
        function showToast(message) {
            const existing = document.querySelector('.toast-notification');
            if (existing) existing.remove();
            
            const toast = document.createElement('div');
            toast.className = 'toast-notification';
            toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:' + (document.documentElement.style.getPropertyValue('--primary-color') || getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#27491F') + ';color:white;padding:16px 32px;font-size:14px;font-weight:600;z-index:10000;';
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
        
        document.addEventListener('DOMContentLoaded', renderProfile);
    </script>
  `;
}

function generateCheckoutPageContent(siteId, primaryColor, secondaryColor, textColor, businessId = null, useCleanUrls = false, paymentSettings = null) {
  const baseUrl = useCleanUrls ? '' : (siteId ? `/site/${siteId}` : '');
  const primary = primaryColor || '#27491F';

  // Build enabled payment methods list
  const pm = paymentSettings || {};
  const enabledPayments = [];
  // Payment method definitions with display info
  const paymentDefs = [
    { key: 'cod', jsKey: 'cod', name: 'Cash on Delivery', desc: 'Pay when you receive your order', icons: ['COD'], paymentStatus: 'unpaid' },
    { key: 'stripe', jsKey: 'card', name: 'Credit / Debit Card', desc: 'Secure payment with card', icons: ['VISA', 'MC'], paymentStatus: 'paid' },
    { key: 'paymob', jsKey: 'paymob', name: 'Paymob', desc: 'Pay online via Paymob', icons: ['VISA', 'MC'], paymentStatus: 'paid' },
    { key: 'fawry', jsKey: 'fawry', name: 'Fawry', desc: 'Pay at any Fawry outlet', icons: ['FAWRY'], paymentStatus: 'unpaid' },
    { key: 'instapay', jsKey: 'instapay', name: 'InstaPay', desc: 'Instant bank transfer via InstaPay', icons: ['BANK'], paymentStatus: 'unpaid' },
    { key: 'vodafone_cash', jsKey: 'vodafone_cash', name: 'Vodafone Cash', desc: 'Mobile wallet payment', icons: ['VCASH'], paymentStatus: 'unpaid' },
    { key: 'bank_transfer', jsKey: 'bank_transfer', name: 'Bank Transfer', desc: 'Direct bank wire transfer', icons: ['BANK'], paymentStatus: 'unpaid' }
  ];
  for (const def of paymentDefs) {
    const providerData = pm[def.key];
    if (providerData && providerData.enabled) {
      enabledPayments.push({
        ...def,
        // Carry all provider details for display
        accountName: providerData.accountName || '',
        accountNumber: providerData.accountNumber || '',
        phoneNumber: providerData.phoneNumber || '',
        bankName: providerData.bankName || '',
        iban: providerData.iban || '',
        swiftCode: providerData.swiftCode || '',
        instructions: providerData.instructions || ''
      });
    }
  }
  // Fallback: if no payment settings configured at all, show COD
  if (enabledPayments.length === 0) {
    enabledPayments.push({ key: 'cod', jsKey: 'cod', name: 'Cash on Delivery', desc: 'Pay when you receive your order', icons: ['COD'], paymentStatus: 'unpaid', instructions: '' });
  }
  const defaultPayment = enabledPayments[0].jsKey;
  
  // Location data for address dropdowns (same as customer modal)
  const LOCATION_DATA = {
    'Egypt': {
      governorates: ['Cairo', 'Giza', 'Alexandria', 'Qalyubia', 'Dakahlia', 'Sharqia', 'Monufia', 'Gharbia', 'Kafr El Sheikh', 'Beheira', 'Ismailia', 'Port Said', 'Suez', 'North Sinai', 'South Sinai', 'Damietta', 'Matruh', 'Luxor', 'Aswan', 'Red Sea', 'New Valley', 'Qena', 'Sohag', 'Assiut', 'Minya', 'Beni Suef', 'Faiyum'],
      neighborhoods: {
        'Cairo': ['Downtown', 'Zamalek', 'Maadi', 'Heliopolis', 'Nasr City', 'New Cairo', '6th of October', 'Sheikh Zayed', 'Madinaty', 'El Shorouk'],
        'Giza': ['Dokki', 'Agouza', 'Mohandessin', '6th of October', 'Sheikh Zayed', 'Haram', 'Faisal', 'Imbaba', 'Boulaq El Dakrour'],
        'Alexandria': ['Montaza', 'Sidi Bishr', 'Stanley', 'Smouha', 'Sidi Gaber', 'Roushdy', 'Gleem', 'San Stefano', 'Miami', 'Mandara']
      },
      districts: {
        'Cairo': {
          'Downtown': ['Tahrir Square', 'Abdeen', 'Kasr El Nil', 'Garden City', 'Zamalek'],
          'Zamalek': ['15th May', '26th July', 'Hassan Sabry', 'Abu El Feda'],
          'Maadi': ['Degla', 'Sarayat', 'Zahraa', 'New Maadi', 'Old Maadi']
        }
      }
    },
    'Saudi Arabia': {
      governorates: ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar', 'Dhahran', 'Taif', 'Abha', 'Tabuk'],
      neighborhoods: {
        'Riyadh': ['Al Olaya', 'Al Malaz', 'Al Naseem', 'Al Wurud', 'Al Murabba'],
        'Jeddah': ['Al Balad', 'Al Hamra', 'Al Shati', 'Al Rawdah', 'Al Andalus']
      },
      districts: {}
    },
    'United Arab Emirates': {
      governorates: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'],
      neighborhoods: {
        'Dubai': ['Downtown', 'Marina', 'JBR', 'Business Bay', 'Palm Jumeirah'],
        'Abu Dhabi': ['Al Markaziyah', 'Al Khalidiyah', 'Al Zahiyah', 'Al Bateen']
      },
      districts: {}
    }
  };

  return `
    <style>
        .checkout-page { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }
        .checkout-header { margin-bottom: 32px; }
        .checkout-title { font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; }
        
        .checkout-layout { display: grid; grid-template-columns: 1fr 420px; gap: 48px; }
        
        /* Steps */
        .checkout-steps {
            display: flex;
            gap: 8px;
            margin-bottom: 32px;
        }
        .step {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            border: 1px solid #e5e5e5;
            background: white;
        }
        .step.active { border-color: ${primary}; }
        .step.completed { background: #f5f5f5; }
        .step-number {
            width: 28px; height: 28px;
            border-radius: 50%;
            background: #e5e5e5;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 700;
        }
        .step.active .step-number { background: ${primary}; color: white; }
        .step.completed .step-number { background: #16a34a; color: white; }
        .step-label { font-size: 13px; font-weight: 600; text-transform: uppercase; }
        
        /* Form Sections */
        .checkout-section {
            border: 1px solid #e5e5e5;
            padding: 32px;
            margin-bottom: 24px;
        }
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid #e5e5e5;
        }
        .section-title {
            font-size: 16px;
            font-weight: 900;
            text-transform: uppercase;
        }
        
        .form-row { margin-bottom: 20px; }
        .form-row.half { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-row.third { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        .form-label {
            display: block;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 8px;
        }
        .form-label span { color: #dc2626; }
        .form-input, .form-select {
            width: 100%;
            padding: 14px 16px;
            border: 1px solid #e5e5e5;
            font-size: 14px;
            background: white;
            appearance: none;
        }
        .form-select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%2327491F' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 8px center; padding-right: 40px; }
        .form-input:focus, .form-select:focus { border-color: ${primary}; outline: none; }
        .form-input::placeholder { color: #999; }
        
        /* Payment Methods */
        .payment-methods { display: flex; flex-direction: column; gap: 12px; }
        .payment-option {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px 20px;
            border: 1px solid #e5e5e5;
            cursor: pointer;
        }
        .payment-option:hover { border-color: ${primary}; }
        .payment-option.selected { border-color: ${primary}; background: ${primary}08; }
        .payment-radio {
            width: 20px; height: 20px;
            border: 2px solid #e5e5e5;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .payment-option.selected .payment-radio {
            border-color: ${primary};
        }
        .payment-option.selected .payment-radio::after {
            content: '';
            width: 10px; height: 10px;
            background: ${primary};
            border-radius: 50%;
        }
        .payment-info { flex: 1; }
        .payment-name { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
        .payment-desc { font-size: 12px; color: #767677; }
        .payment-icons { display: flex; gap: 4px; }
        .payment-icon {
            width: 36px; height: 24px;
            background: #f5f5f5;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            color: #767677;
        }
        
        /* Card Form */
        .card-form { display: none; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e5e5; }
        .card-form.active { display: block; }

        /* Payment Details Panel */
        .payment-details-panel {
            display: none;
            margin-top: 16px;
            padding: 20px;
            background: #fafaf8;
            border: 1px solid #e5e5e5;
            border-radius: 4px;
            animation: fadeSlideDown 0.25s ease;
        }
        .payment-details-panel.active { display: block; }
        @keyframes fadeSlideDown { 0% { opacity: 0; transform: translateY(-8px); } 100% { opacity: 1; transform: translateY(0); } }
        .pd-title {
            font-size: 13px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.5px; margin-bottom: 16px; padding-bottom: 10px;
            border-bottom: 1px solid #e5e5e5; display: flex; align-items: center; gap: 8px;
        }
        .pd-title .material-icons { font-size: 18px; color: ${primary}; }
        .pd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
        .pd-field label {
            display: block; font-size: 11px; font-weight: 600;
            text-transform: uppercase; color: #767677; margin-bottom: 4px; letter-spacing: 0.3px;
        }
        .pd-field .pd-value {
            font-size: 14px; font-weight: 600; color: inherit;
            padding: 8px 12px; background: #fff; border: 1px solid #eee;
            border-radius: 4px; display: flex; align-items: center; justify-content: space-between;
            word-break: break-all;
        }
        .pd-field .pd-value .pd-copy {
            cursor: pointer; color: ${primary}; font-size: 16px; flex-shrink: 0; margin-left: 8px;
            opacity: 0.7; transition: opacity 0.2s;
        }
        .pd-field .pd-value .pd-copy:hover { opacity: 1; }
        .pd-instructions {
            grid-column: 1 / -1; margin-top: 4px; padding: 12px 14px;
            background: ${primary}08; border-left: 3px solid ${primary};
            border-radius: 0 4px 4px 0; font-size: 13px; line-height: 1.5; color: inherit;
        }
        .pd-instructions strong { font-weight: 700; display: block; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; }
        @media (max-width: 600px) { .pd-grid { grid-template-columns: 1fr; } }
        
        /* Order Summary */
        .order-summary {
            position: sticky;
            top: 24px;
            border: 1px solid #e5e5e5;
            padding: 24px;
        }
        .summary-title {
            font-size: 16px;
            font-weight: 900;
            text-transform: uppercase;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid #e5e5e5;
        }
        
        .summary-items { margin-bottom: 24px; }
        .summary-item {
            display: flex;
            gap: 16px;
            padding: 12px 0;
            border-bottom: 1px solid #e5e5e5;
        }
        .summary-item:last-child { border-bottom: none; }
        .summary-item-image {
            width: 64px; height: 64px;
            background: #f5f5f5;
            flex-shrink: 0;
        }
        .summary-item-image img { width: 100%; height: 100%; object-fit: cover; }
        .summary-item-info { flex: 1; }
        .summary-item-name { font-size: 13px; font-weight: 500; margin-bottom: 4px; }
        .summary-item-meta { font-size: 12px; color: #767677; }
        .summary-item-price { font-size: 13px; font-weight: 700; text-align: right; }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 14px;
        }
        .summary-row.total {
            font-size: 16px;
            font-weight: 700;
            padding-top: 12px;
            margin-top: 12px;
            border-top: 2px solid ${primary};
        }
        
        .promo-form {
            display: flex;
            gap: 8px;
            margin-bottom: 24px;
        }
        .promo-form input {
            flex: 1;
            padding: 12px;
            border: 1px solid #e5e5e5;
            font-size: 13px;
        }
        .promo-form button {
            padding: 12px 20px;
            background: ${primary};
            color: white;
            border: none;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            cursor: pointer;
        }
        
        .place-order-btn {
            width: 100%;
            padding: 18px;
            background: ${primary};
            color: white;
            border: none;
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
        }
        .place-order-btn:hover { opacity: 0.9; filter: brightness(0.95); }
        .place-order-btn:disabled { background: #ccc; cursor: not-allowed; }
        
        .secure-badge {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-top: 16px;
            font-size: 12px;
            color: #767677;
        }
        .secure-badge .material-icons { font-size: 16px; }
        
        /* Empty Cart */
        .empty-checkout {
            text-align: center;
            padding: 80px 24px;
            grid-column: 1 / -1;
        }
        .empty-icon { font-size: 80px; color: #e5e5e5; margin-bottom: 24px; }
        .empty-title { font-size: 24px; font-weight: 900; text-transform: uppercase; margin-bottom: 8px; }
        .empty-text { font-size: 14px; color: #767677; margin-bottom: 32px; }
        .shop-btn {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            padding: 16px 32px;
            background: ${primary};
            color: white;
            text-decoration: none;
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
        }
        
        /* Toast */
        .toast {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: ${primary};
            color: white;
            padding: 16px 32px;
            font-size: 14px;
            font-weight: 600;
            z-index: 10000;
            opacity: 0;
            transition: all 0.3s ease;
        }
        .toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }
        
        @media (max-width: 900px) {
            .checkout-layout { grid-template-columns: 1fr; }
            .order-summary { position: static; order: -1; }
            .checkout-steps { flex-direction: column; }
            .form-row.half, .form-row.third { grid-template-columns: 1fr; }
        }
    </style>
    
    <div class="checkout-page">
        <div class="checkout-header">
            <h1 class="checkout-title">CHECKOUT</h1>
        </div>
        
        <div id="checkout-content"></div>
    </div>
    
    <div class="toast" id="toast"></div>
    
    <script>
        const LOCATION_DATA = ${JSON.stringify(LOCATION_DATA)};
        const SITE_ID = '${siteId}';
        let selectedPayment = ${JSON.stringify(defaultPayment)};
        const BUSINESS_ID = '${businessId || ''}';
        const PAYMENT_STATUS_MAP = ${JSON.stringify(enabledPayments.reduce((acc, p) => { acc[p.jsKey] = p.paymentStatus; return acc; }, {}))};
        const PAYMENT_DETAILS = ${JSON.stringify(enabledPayments.reduce((acc, p) => { acc[p.jsKey] = { name: p.name, accountName: p.accountName || '', accountNumber: p.accountNumber || '', phoneNumber: p.phoneNumber || '', bankName: p.bankName || '', iban: p.iban || '', swiftCode: p.swiftCode || '', instructions: p.instructions || '' }; return acc; }, {}))};
        let appliedDiscount = null;
        let discountAmount = 0;
        
        // Helper function to remove undefined values
        function removeUndefined(obj) {
            if (Array.isArray(obj)) {
                return obj.map(item => removeUndefined(item));
            } else if (obj !== null && typeof obj === 'object') {
                const cleaned = {};
                for (const key in obj) {
                    if (obj[key] !== undefined) {
                        cleaned[key] = removeUndefined(obj[key]);
                    }
                }
                return cleaned;
            }
            return obj;
        }
        
        function renderCheckout() {
            const cart = getCart();
            const content = document.getElementById('checkout-content');
            
            if (cart.length === 0) {
                content.innerHTML = \`
                    <div class="empty-checkout">
                        <span class="material-icons empty-icon">shopping_cart</span>
                        <h2 class="empty-title">YOUR BAG IS EMPTY</h2>
                        <p class="empty-text">Add items to your bag to proceed with checkout</p>
                        <a href="${baseUrl}/products" class="shop-btn">
                            START SHOPPING
                            <span class="material-icons">arrow_forward</span>
                        </a>
                    </div>
                \`;
                return;
            }
            
            const subtotal = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
            const shipping = subtotal >= 500 ? 0 : 50;
            const total = subtotal + shipping;
            
            content.innerHTML = \`
                <div class="checkout-steps">
                    <div class="step active">
                        <span class="step-number">1</span>
                        <span class="step-label">Shipping</span>
                    </div>
                    <div class="step">
                        <span class="step-number">2</span>
                        <span class="step-label">Payment</span>
                    </div>
                    <div class="step">
                        <span class="step-number">3</span>
                        <span class="step-label">Review</span>
                    </div>
                </div>
                
                <div class="checkout-layout">
                    <div class="checkout-form">
                        <div class="checkout-section">
                            <div class="section-header">
                                <h2 class="section-title">Contact Information</h2>
                            </div>
                            <div class="form-row">
                                <label class="form-label">Email Address <span>*</span></label>
                                <input type="email" class="form-input" id="email" placeholder="your@email.com" required>
                            </div>
                            <div class="form-row">
                                <label class="form-label">Phone Number <span>*</span></label>
                                <input type="tel" class="form-input" id="phone" placeholder="+20 123 456 7890" required>
                            </div>
                        </div>
                        
                        <div class="checkout-section">
                            <div class="section-header">
                                <h2 class="section-title">Shipping Address</h2>
                            </div>
                            <div class="form-row half">
                                <div>
                                    <label class="form-label">First Name <span>*</span></label>
                                    <input type="text" class="form-input" id="firstName" placeholder="First name" required>
                                </div>
                                <div>
                                    <label class="form-label">Last Name <span>*</span></label>
                                    <input type="text" class="form-input" id="lastName" placeholder="Last name" required>
                                </div>
                            </div>
                            <div class="form-row">
                                <label class="form-label">Street Address <span>*</span></label>
                                <input type="text" class="form-input" id="address" placeholder="Street address" required>
                            </div>
                            <div class="form-row third">
                                <div>
                                    <label class="form-label">Apartment</label>
                                    <input type="text" class="form-input" id="apartment" placeholder="Apt">
                                </div>
                                <div>
                                    <label class="form-label">Floor</label>
                                    <input type="text" class="form-input" id="floor" placeholder="Floor">
                                </div>
                                <div>
                                    <label class="form-label">Building</label>
                                    <input type="text" class="form-input" id="building" placeholder="Building">
                                </div>
                            </div>
                            <div class="form-row half">
                                <div>
                                    <label class="form-label">Country <span>*</span></label>
                                    <select class="form-select" id="country" onchange="updateAddressDropdowns()" required>
                                        <option value="">Select country</option>
                                        \${Object.keys(LOCATION_DATA).map(c => \`<option value="\${c}" \${c === 'Egypt' ? 'selected' : ''}>\${c}</option>\`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="form-label">Governorate / State <span>*</span></label>
                                    <select class="form-select" id="governorate" onchange="updateNeighborhoods()" required>
                                        <option value="">Select governorate</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row half">
                                <div>
                                    <label class="form-label">Neighborhood</label>
                                    <select class="form-select" id="neighborhood" onchange="updateDistricts()">
                                        <option value="">Select neighborhood</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="form-label">District</label>
                                    <select class="form-select" id="district">
                                        <option value="">Select district</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="checkout-section">
                            <div class="section-header">
                                <h2 class="section-title">Payment Method</h2>
                            </div>
                            <div class="payment-methods">
                                ${enabledPayments.map((p, i) => `
                                <div class="payment-option${i === 0 ? ' selected' : ''}" onclick="selectPayment('${p.jsKey}', this)">
                                    <div class="payment-radio"></div>
                                    <div class="payment-info">
                                        <div class="payment-name">${safeHtml(p.name)}</div>
                                        <div class="payment-desc">${safeHtml(p.desc)}</div>
                                    </div>
                                    <div class="payment-icons">
                                        ${p.icons.map(ic => `<div class="payment-icon">${safeHtml(ic)}</div>`).join('')}
                                    </div>
                                </div>`).join('')}
                            </div>
                            
                            ${enabledPayments.some(p => p.jsKey === 'card') ? `
                            <div class="card-form" id="cardForm">
                                <div class="form-row">
                                    <label class="form-label">Card Number <span>*</span></label>
                                    <input type="text" class="form-input" id="cardNumber" placeholder="1234 5678 9012 3456" maxlength="19">
                                </div>
                                <div class="form-row half">
                                    <div>
                                        <label class="form-label">Expiry Date <span>*</span></label>
                                        <input type="text" class="form-input" id="cardExpiry" placeholder="MM/YY" maxlength="5">
                                    </div>
                                    <div>
                                        <label class="form-label">CVV <span>*</span></label>
                                        <input type="text" class="form-input" id="cardCvv" placeholder="123" maxlength="4">
                                    </div>
                                </div>
                                <div class="form-row">
                                    <label class="form-label">Name on Card <span>*</span></label>
                                    <input type="text" class="form-input" id="cardName" placeholder="Name as shown on card">
                                </div>
                            </div>` : ''}

                            <div class="payment-details-panel${enabledPayments[0] && enabledPayments[0].jsKey !== 'cod' && enabledPayments[0].jsKey !== 'card' ? ' active' : ''}" id="paymentDetailsPanel">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <label style="display: flex; align-items: flex-start; gap: 12px; cursor: pointer;">
                                <input type="checkbox" id="saveInfo" style="margin-top: 4px;">
                                <span style="font-size: 13px; color: #767677;">Save my information for faster checkout next time</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="order-summary">
                        <h2 class="summary-title">Order Summary</h2>
                        
                        <div class="summary-items">
                            \${cart.map(item => \`
                                <div class="summary-item">
                                    <div class="summary-item-image">
                                        \${item.image 
                                            ? \`<img src="\${item.image}" alt="\${item.name}">\`
                                            : \`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><span class="material-icons" style="color:#ccc;">image</span></div>\`
                                        }
                                    </div>
                                    <div class="summary-item-info">
                                        <div class="summary-item-name">\${item.name}</div>
                                        <div class="summary-item-meta">
                                            Qty: \${item.quantity || 1}
                                            \${item.size ? \` | Size: \${item.size}\` : ''}
                                        </div>
                                    </div>
                                    <div class="summary-item-price">\${CURRENCY_SYMBOL}\${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</div>
                                </div>
                            \`).join('')}
                        </div>
                        
                        <div class="promo-form">
                            <input type="text" placeholder="Promo code" id="promoCode" style="text-transform: uppercase;">
                            <button onclick="applyPromo()" id="promoBtn">Apply</button>
                        </div>
                        <div id="appliedPromo" style="display: none; margin-top: 8px; padding: 8px 12px; background: #dcfce7; border-radius: 4px; font-size: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span>
                                    <span style="font-weight: 600;">Applied:</span> 
                                    <span id="appliedCode"></span>
                                    <span id="discountInfo" style="color: #16a34a; margin-left: 8px;"></span>
                                </span>
                                <button onclick="removePromo()" style="background: none; border: none; color: #dc2626; cursor: pointer; font-size: 14px;">Remove</button>
                            </div>
                        </div>
                        
                        <div class="summary-row">
                            <span>Subtotal</span>
                            <span>\${CURRENCY_SYMBOL}\${subtotal.toFixed(2)}</span>
                        </div>
                        <div class="summary-row" id="discountRow" style="display: none; color: #16a34a;">
                            <span>Discount</span>
                            <span>-\${CURRENCY_SYMBOL}0.00</span>
                        </div>
                        <div class="summary-row">
                            <span>Shipping</span>
                            <span>\${shipping === 0 ? 'FREE' : CURRENCY_SYMBOL + shipping.toFixed(2)}</span>
                        </div>
                        <div class="summary-row total">
                            <span>Total</span>
                            <span>\${CURRENCY_SYMBOL}\${total.toFixed(2)}</span>
                        </div>
                        
                        <button class="place-order-btn" onclick="placeOrder()">
                            PLACE ORDER
                            <span class="material-icons">arrow_forward</span>
                        </button>
                        
                        <div class="secure-badge">
                            <span class="material-icons">lock</span>
                            Secure checkout - SSL encrypted
                        </div>
                    </div>
                </div>
            \`;
            
            // Initialize address dropdowns
            updateAddressDropdowns();

            // Pre-fill form from saved user data (signed-in customers)
            var savedUser = getUser();
            if (savedUser) {
                if (savedUser.email) { var el = document.getElementById('email'); if (el) el.value = savedUser.email; }
                if (savedUser.phone) { var el = document.getElementById('phone'); if (el) el.value = savedUser.phone; }
                if (savedUser.firstName) { var el = document.getElementById('firstName'); if (el) el.value = savedUser.firstName; }
                if (savedUser.lastName) { var el = document.getElementById('lastName'); if (el) el.value = savedUser.lastName; }
                if (!savedUser.firstName && savedUser.name) {
                    var parts = savedUser.name.split(' ');
                    var el1 = document.getElementById('firstName');
                    var el2 = document.getElementById('lastName');
                    if (el1 && !el1.value) el1.value = parts[0] || '';
                    if (el2 && !el2.value) el2.value = parts.slice(1).join(' ') || '';
                }
                if (savedUser.addressDetails) {
                    var addr = savedUser.addressDetails;
                    if (addr.line) { var el = document.getElementById('address'); if (el) el.value = addr.line; }
                    if (addr.apartment) { var el = document.getElementById('apartment'); if (el) el.value = addr.apartment; }
                    if (addr.floor) { var el = document.getElementById('floor'); if (el) el.value = addr.floor; }
                    if (addr.building) { var el = document.getElementById('building'); if (el) el.value = addr.building; }
                    if (addr.country) {
                        var el = document.getElementById('country');
                        if (el) { el.value = addr.country; updateAddressDropdowns(); }
                    }
                    if (addr.governorate) {
                        var el = document.getElementById('governorate');
                        if (el) { el.value = addr.governorate; updateNeighborhoods(); }
                    }
                    if (addr.neighborhood) {
                        var el = document.getElementById('neighborhood');
                        if (el) { el.value = addr.neighborhood; updateDistricts(); }
                    }
                    if (addr.district) {
                        var el = document.getElementById('district');
                        if (el) el.value = addr.district;
                    }
                }
                // Auto-check "save info" for logged-in users
                var saveInfoEl = document.getElementById('saveInfo');
                if (saveInfoEl) saveInfoEl.checked = true;
            }

            // Show payment details for the initially selected payment method
            var initialSelected = document.querySelector('.payment-option.selected');
            if (initialSelected && selectedPayment) {
                selectPayment(selectedPayment, initialSelected);
            }
        }
        
        function updateAddressDropdowns() {
            const country = document.getElementById('country').value;
            const governorateSelect = document.getElementById('governorate');
            const neighborhoodSelect = document.getElementById('neighborhood');
            const districtSelect = document.getElementById('district');
            
            // Clear dependent dropdowns
            governorateSelect.innerHTML = '<option value="">Select governorate</option>';
            neighborhoodSelect.innerHTML = '<option value="">Select neighborhood</option>';
            districtSelect.innerHTML = '<option value="">Select district</option>';
            
            if (!country || !LOCATION_DATA[country]) return;
            
            // Populate governorates
            const governorates = LOCATION_DATA[country].governorates || [];
            governorates.forEach(gov => {
                const option = document.createElement('option');
                option.value = gov;
                option.textContent = gov;
                governorateSelect.appendChild(option);
            });
        }
        
        function updateNeighborhoods() {
            const country = document.getElementById('country').value;
            const governorate = document.getElementById('governorate').value;
            const neighborhoodSelect = document.getElementById('neighborhood');
            const districtSelect = document.getElementById('district');
            
            // Clear dependent dropdowns
            neighborhoodSelect.innerHTML = '<option value="">Select neighborhood</option>';
            districtSelect.innerHTML = '<option value="">Select district</option>';
            
            if (!country || !governorate || !LOCATION_DATA[country]?.neighborhoods?.[governorate]) return;
            
            // Populate neighborhoods
            const neighborhoods = LOCATION_DATA[country].neighborhoods[governorate] || [];
            neighborhoods.forEach(neighborhood => {
                const option = document.createElement('option');
                option.value = neighborhood;
                option.textContent = neighborhood;
                neighborhoodSelect.appendChild(option);
            });
        }
        
        function updateDistricts() {
            const country = document.getElementById('country').value;
            const governorate = document.getElementById('governorate').value;
            const neighborhood = document.getElementById('neighborhood').value;
            const districtSelect = document.getElementById('district');
            
            // Clear districts
            districtSelect.innerHTML = '<option value="">Select district</option>';
            
            if (!country || !governorate || !neighborhood || !LOCATION_DATA[country]?.districts?.[governorate]?.[neighborhood]) return;
            
            // Populate districts
            const districts = LOCATION_DATA[country].districts[governorate][neighborhood] || [];
            districts.forEach(district => {
                const option = document.createElement('option');
                option.value = district;
                option.textContent = district;
                districtSelect.appendChild(option);
            });
        }
        
        function selectPayment(method, element) {
            selectedPayment = method;
            document.querySelectorAll('.payment-option').forEach(el => el.classList.remove('selected'));
            element.classList.add('selected');
            
            var cardForm = document.getElementById('cardForm');
            if (cardForm) {
                if (method === 'card') {
                    cardForm.classList.add('active');
                } else {
                    cardForm.classList.remove('active');
                }
            }

            // Show payment details panel for methods that have details
            var panel = document.getElementById('paymentDetailsPanel');
            if (panel) {
                var details = PAYMENT_DETAILS[method];
                // COD and card don't show the details panel (card has its own form)
                if (!details || method === 'cod' || method === 'card') {
                    panel.classList.remove('active');
                    panel.innerHTML = '';
                    return;
                }

                var hasDetails = details.accountName || details.accountNumber || details.phoneNumber || details.bankName || details.iban || details.instructions;
                if (!hasDetails) {
                    panel.classList.remove('active');
                    panel.innerHTML = '';
                    return;
                }

                var html = '<div class="pd-title"><span class="material-icons">info_outline</span> ' + details.name + ' Details</div>';
                html += '<div class="pd-grid">';

                if (details.bankName) {
                    html += buildDetailField('Bank', details.bankName);
                }
                if (details.accountName) {
                    html += buildDetailField('Account Name', details.accountName);
                }
                if (details.accountNumber) {
                    var label = method === 'instapay' ? 'InstaPay Address / IPA' : 'Account Number';
                    html += buildDetailField(label, details.accountNumber, true);
                }
                if (details.phoneNumber) {
                    html += buildDetailField('Phone Number', details.phoneNumber, true);
                }
                if (details.iban) {
                    html += buildDetailField('IBAN', details.iban, true);
                }
                if (details.swiftCode) {
                    html += buildDetailField('SWIFT / BIC', details.swiftCode, true);
                }
                if (details.instructions) {
                    html += '<div class="pd-instructions"><strong>Instructions</strong>' + escHtml(details.instructions).replace(/\\n/g, '<br>') + '</div>';
                }

                html += '</div>';
                panel.innerHTML = html;
                panel.classList.add('active');
            }
        }

        function escHtml(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
        function buildDetailField(label, value, copyable) {
            var safe = escHtml(value);
            var copyBtn = copyable ? '<span class="material-icons pd-copy" data-copy="' + safe.replace(/"/g, '&quot;') + '" onclick="copyToClipboard(this)" title="Copy">content_copy</span>' : '';
            return '<div class="pd-field"><label>' + escHtml(label) + '</label><div class="pd-value"><span>' + safe + '</span>' + copyBtn + '</div></div>';
        }

        function copyToClipboard(btn) {
            var text = btn.getAttribute('data-copy') || '';
            navigator.clipboard.writeText(text).then(function() {
                btn.textContent = 'check';
                btn.style.color = '#16a34a';
                setTimeout(function() { btn.textContent = 'content_copy'; btn.style.color = ''; }, 1500);
            }).catch(function() {
                var ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                btn.textContent = 'check';
                btn.style.color = '#16a34a';
                setTimeout(function() { btn.textContent = 'content_copy'; btn.style.color = ''; }, 1500);
            });
        }
        
        async function applyPromo() {
            const codeInput = document.getElementById('promoCode');
            const code = codeInput.value.trim().toUpperCase();
            
            if (!code) {
                showToast('Please enter a promo code');
                return;
            }
            
            if (!BUSINESS_ID) {
                showToast('Business ID not found');
                return;
            }
            
            try {
                // Fetch discount code from Firestore
                const response = await fetch('https://us-central1-madas-store.cloudfunctions.net/validateDiscountCode', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        businessId: BUSINESS_ID,
                        code: code,
                        cartTotal: getCartTotal()
                    })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to validate discount code');
                }
                
                const result = await response.json();
                
                if (result.valid) {
                    appliedDiscount = result.discount;
                    discountAmount = result.discountAmount;
                    codeInput.style.borderColor = '#16a34a';
                    codeInput.disabled = true;
                    updateOrderSummary();
                    showToast('Promo code applied successfully!');
                } else {
                    appliedDiscount = null;
                    discountAmount = 0;
                    codeInput.style.borderColor = '#dc2626';
                    showToast(result.message || 'Invalid promo code');
                }
            } catch (error) {
                console.error('Error applying promo:', error);
                appliedDiscount = null;
                discountAmount = 0;
                codeInput.style.borderColor = '#dc2626';
                showToast(error.message || 'Error applying promo code');
            }
        }
        
        function removePromo() {
            appliedDiscount = null;
            discountAmount = 0;
            const codeInput = document.getElementById('promoCode');
            codeInput.value = '';
            codeInput.disabled = false;
            codeInput.style.borderColor = '#e5e5e5';
            updateOrderSummary();
            showToast('Promo code removed');
        }
        
        function getCartTotal() {
            const cart = getCart();
            return cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        }
        
        function updateOrderSummary() {
            const cart = getCart();
            const subtotal = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
            const shipping = subtotal >= 500 ? 0 : 50;
            const total = Math.max(0, subtotal - discountAmount + shipping);
            
            // Update discount row
            const discountRow = document.getElementById('discountRow');
            if (discountRow) {
                if (appliedDiscount) {
                    discountRow.style.display = 'flex';
                    discountRow.querySelector('span:last-child').textContent = '-' + CURRENCY_SYMBOL + discountAmount.toFixed(2);
                } else {
                    discountRow.style.display = 'none';
                }
            }
            
            // Update applied promo display
            const appliedPromoDiv = document.getElementById('appliedPromo');
            const appliedCodeSpan = document.getElementById('appliedCode');
            const discountInfoSpan = document.getElementById('discountInfo');
            
            if (appliedDiscount && appliedPromoDiv) {
                appliedPromoDiv.style.display = 'block';
                if (appliedCodeSpan) {
                    appliedCodeSpan.textContent = appliedDiscount.code;
                }
                if (discountInfoSpan) {
                    if (appliedDiscount.type === 'percentage') {
                        discountInfoSpan.textContent = '(' + appliedDiscount.value + '% off)';
                    } else if (appliedDiscount.type === 'fixed') {
                        discountInfoSpan.textContent = '(' + CURRENCY_SYMBOL + appliedDiscount.value + ' off)';
                    } else if (appliedDiscount.type === 'freeShipping') {
                        discountInfoSpan.textContent = '(Free Shipping)';
                    }
                }
            } else if (appliedPromoDiv) {
                appliedPromoDiv.style.display = 'none';
            }
            
            // Update total
            const totalRow = document.querySelector('.summary-row.total span:last-child');
            if (totalRow) {
                totalRow.textContent = CURRENCY_SYMBOL + total.toFixed(2);
            }
        }
        
        async function placeOrder() {
            // Validate required fields
            const required = ['email', 'phone', 'firstName', 'lastName', 'address', 'country', 'governorate'];
            let isValid = true;
            
            required.forEach(field => {
                const input = document.getElementById(field);
                if (!input || !input.value.trim()) {
                    if (input) input.style.borderColor = '#dc2626';
                    isValid = false;
                } else {
                    if (input) input.style.borderColor = '#e5e5e5';
                }
            });
            
            if (selectedPayment === 'card') {
                const cardFields = ['cardNumber', 'cardExpiry', 'cardCvv', 'cardName'];
                cardFields.forEach(field => {
                    const input = document.getElementById(field);
                    if (!input || !input.value.trim()) {
                        if (input) input.style.borderColor = '#dc2626';
                        isValid = false;
                    } else {
                        if (input) input.style.borderColor = '#e5e5e5';
                    }
                });
            }
            
            if (!isValid) {
                showToast('Please fill in all required fields');
                return;
            }
            
            if (!BUSINESS_ID) {
                showToast('Business ID not found. Please refresh the page.');
                return;
            }
            
            // Disable button
            const btn = document.querySelector('.place-order-btn');
            btn.disabled = true;
            btn.textContent = 'PROCESSING...';
            
            try {
                const cart = getCart();
                const subtotal = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
                let shipping = subtotal >= 500 ? 0 : 50;
                // Apply free shipping if discount type is freeShipping
                if (appliedDiscount && appliedDiscount.type === 'freeShipping') {
                    shipping = 0;
                }
                const total = Math.max(0, subtotal - discountAmount + shipping);
                
                // Collect form data
                const orderData = {
                    customerName: document.getElementById('firstName').value + ' ' + document.getElementById('lastName').value,
                    firstName: document.getElementById('firstName').value,
                    lastName: document.getElementById('lastName').value,
                    email: document.getElementById('email').value,
                    phone: document.getElementById('phone').value,
                    addressDetails: {
                        line: document.getElementById('address').value,
                        apartment: document.getElementById('apartment').value || '',
                        floor: document.getElementById('floor').value || '',
                        building: document.getElementById('building').value || '',
                        country: document.getElementById('country').value,
                        governorate: document.getElementById('governorate').value,
                        neighborhood: document.getElementById('neighborhood').value || '',
                        district: document.getElementById('district').value || ''
                    },
                    discount: appliedDiscount ? {
                        code: appliedDiscount.code,
                        type: appliedDiscount.type,
                        value: appliedDiscount.value,
                        amount: discountAmount
                    } : null,
                    items: cart.map(item => {
                        const mappedItem = {
                            productId: item.id,
                            name: item.name,
                            quantity: item.quantity || 1,
                            price: item.price
                        };
                        // Only add size and image if they exist
                        if (item.size) mappedItem.size = item.size;
                        if (item.image) mappedItem.image = item.image;
                        return mappedItem;
                    }),
                    total: total,
                    subtotal: subtotal,
                    shippingFees: shipping,
                    paymentStatus: PAYMENT_STATUS_MAP[selectedPayment] || 'unpaid',
                    paymentMethod: selectedPayment,
                    status: 'pending',
                    channel: 'website',
                    date: new Date().toISOString(),
                    saveCustomer: document.getElementById('saveInfo').checked
                };
                
                // Create order via Cloud Function
                let response;
                try {
                    response = await fetch('https://us-central1-madas-store.cloudfunctions.net/createWebsiteOrder', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            businessId: BUSINESS_ID,
                            siteId: SITE_ID,
                            orderData: removeUndefined(orderData)
                        })
                    });
                } catch (networkError) {
                    console.error('Network error:', networkError);
                    throw new Error('Network error: Unable to connect to server. Please check your internet connection and try again.');
                }
                
                if (!response.ok) {
                    let errorData;
                    try {
                        errorData = await response.json();
                    } catch (parseError) {
                        errorData = { 
                            error: 'Server error', 
                            message: 'Server returned error ' + response.status + ': ' + response.statusText,
                            details: response.statusText 
                        };
                    }
                    throw new Error(errorData.message || errorData.error || 'Failed to create order (' + response.status + ')');
                }
                
                const result = await response.json();
                
                // Save address to user data for next checkout pre-fill
                var currentUser = getUser();
                if (currentUser) {
                    currentUser.firstName = orderData.firstName;
                    currentUser.lastName = orderData.lastName;
                    currentUser.name = orderData.customerName;
                    currentUser.phone = orderData.phone;
                    currentUser.email = orderData.email;
                    currentUser.addressDetails = orderData.addressDetails;
                    if (result.customerId) currentUser.customerId = result.customerId;
                    setUser(currentUser);
                }

                // Mark abandoned cart as recovered before clearing
                if (typeof BUSINESS_ID_SUB !== 'undefined' && BUSINESS_ID_SUB && typeof TRACK_CART_URL_SUB !== 'undefined') {
                    try {
                        fetch(TRACK_CART_URL_SUB, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                businessId: BUSINESS_ID_SUB,
                                sessionId: typeof getSessionIdSub === 'function' ? getSessionIdSub() : '',
                                action: 'recovered'
                            })
                        }).catch(function() {});
                    } catch(e) {}
                }
                
                // Store order summary for the confirmation page
                try {
                    localStorage.setItem('lastOrder_' + SITE_ID, JSON.stringify({
                        orderId: result.orderId,
                        items: cart,
                        total: total,
                        subtotal: subtotal,
                        shipping: shipping,
                        discount: appliedDiscount,
                        discountAmount: discountAmount,
                        customerName: orderData.customerName,
                        email: orderData.email,
                        phone: orderData.phone,
                        addressDetails: orderData.addressDetails,
                        paymentMethod: selectedPayment,
                        date: new Date().toISOString()
                    }));
                } catch(e) {}

                // Clear cart locally (don't sync empty cart — we already marked as recovered)
                localStorage.setItem('cart_' + SITE_ID_SAFE, JSON.stringify([]));
                updateCartCount();
                
                // Redirect to order success page
                window.location.href = '${baseUrl}/order-success?orderId=' + encodeURIComponent(result.orderId);
                
            } catch (error) {
                console.error('Error placing order:', error);
                const errorMessage = error.message || 'Error placing order. Please try again.';
                showToast(errorMessage);
                btn.disabled = false;
                btn.innerHTML = 'PLACE ORDER <span class="material-icons">arrow_forward</span>';
            }
        }
        
        function showToast(message) {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            try { renderCheckout(); } catch(err) {
                console.error('Checkout render error:', err);
                var c = document.getElementById('checkout-content');
                if (c) c.innerHTML = '<div style="padding:40px;text-align:center;"><p style="color:#dc2626;font-weight:600;">Something went wrong loading checkout.</p><p style="font-size:13px;color:#767677;margin-top:8px;">' + (err.message || '') + '</p><button onclick="location.reload()" style="margin-top:16px;padding:10px 24px;background:#333;color:#fff;border:none;cursor:pointer;">Reload</button></div>';
            }
        });
    </script>
    <script>
        // Fallback: if main script had a syntax error, show error after 2s
        setTimeout(function() {
            var el = document.getElementById('checkout-content');
            if (el && !el.innerHTML.trim()) {
                el.innerHTML = '<div style="padding:40px;text-align:center;"><p style="color:#dc2626;font-weight:600;">Checkout failed to load.</p><p style="font-size:13px;color:#767677;margin-top:8px;">Please try refreshing the page or clearing your browser cache.</p><button onclick="location.reload()" style="margin-top:16px;padding:10px 24px;background:#333;color:#fff;border:none;cursor:pointer;">Reload Page</button></div>';
            }
        }, 2000);
    </script>
  `;
}

function generateLoginPageContent(siteId, primaryColor, secondaryColor, textColor, useCleanUrls = false, businessId = null) {
  const baseUrl = useCleanUrls ? '' : (siteId ? `/site/${siteId}` : '');
  return `
    <style>
        .login-error { background: #fef2f2; color: #dc2626; padding: 12px 16px; border-radius: 8px; font-size: 13px; display: none; margin-bottom: 8px; }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    </style>
    <main style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 3rem 1rem; min-height: 80vh; background: linear-gradient(135deg, ${primaryColor}05 0%, ${secondaryColor}10 100%);">
        <div class="card animate-fade" style="max-width: 450px; width: 100%; padding: 3rem;">
            <div style="text-align: center; margin-bottom: 2.5rem;">
                <div style="width: 80px; height: 80px; margin: 0 auto 1.5rem; border-radius: 20px; background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%); display: flex; align-items: center; justify-content: center;">
                    <span class="material-icons" style="font-size: 2.5rem; color: #FFFFFF;">login</span>
                </div>
                <h1 style="font-size: 1.75rem; font-weight: 800; color: ${primaryColor}; margin-bottom: 0.5rem;">Welcome Back</h1>
                <p style="color: ${textColor}; opacity: 0.6;">Sign in to your account</p>
            </div>
            
            <div class="login-error" id="loginError"></div>
            
            <form onsubmit="handleLogin(event)" style="display: flex; flex-direction: column; gap: 1.25rem;">
                <div>
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Email</label>
                    <input type="email" id="login-email" placeholder="Enter your email" required class="input-field">
                </div>
                <div>
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Password</label>
                    <input type="password" id="login-password" placeholder="Enter your password" required class="input-field">
                </div>
                <button type="submit" id="loginBtn" class="btn-primary login-btn" style="width: 100%; margin-top: 0.5rem;">Sign In</button>
            </form>
            
            <p style="text-align: center; margin-top: 2rem; color: ${textColor}; opacity: 0.7;">
                Don't have an account? 
                <a href="${baseUrl}/register" style="color: ${primaryColor}; font-weight: 600; text-decoration: none;">Sign Up</a>
            </p>
        </div>
    </main>
    <script>
        var LOGIN_BUSINESS_ID = ${JSON.stringify(businessId || '')};
        var LOGIN_API_URL = 'https://us-central1-${(config.FIREBASE_PROJECT_ID || 'madas-store')}.cloudfunctions.net/loginWebsiteCustomer';

        async function handleLogin(e) {
            e.preventDefault();
            var errorDiv = document.getElementById('loginError');
            var btn = document.getElementById('loginBtn');
            errorDiv.style.display = 'none';

            var email = document.getElementById('login-email').value.trim();
            var password = document.getElementById('login-password').value;

            if (!email || !password) {
                errorDiv.textContent = 'Please enter your email and password.';
                errorDiv.style.display = 'block';
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Signing in...';

            try {
                var response = await fetch(LOGIN_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        businessId: LOGIN_BUSINESS_ID,
                        email: email,
                        password: password
                    })
                });

                var data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Login failed');
                }

                // Save customer data to localStorage (includes address for checkout pre-fill)
                setUser(data.customer);

                var base = (typeof BASE_URL !== 'undefined' && BASE_URL) ? BASE_URL : '';
                window.location.href = (base || '') + '/profile';
            } catch (err) {
                errorDiv.textContent = err.message || 'Login failed. Please try again.';
                errorDiv.style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'Sign In';
            }
        }
    </script>
  `;
}

function generateRegisterPageContent(siteId, primaryColor, secondaryColor, textColor, useCleanUrls = false, businessId = null) {
  const baseUrl = useCleanUrls ? '' : (siteId ? `/site/${siteId}` : '');
  return `
    <style>
        .register-error { background: #fef2f2; color: #dc2626; padding: 12px 16px; border-radius: 8px; font-size: 13px; display: none; margin-bottom: 8px; }
        .register-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    </style>
    <main style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 3rem 1rem; min-height: 80vh; background: linear-gradient(135deg, ${primaryColor}05 0%, ${secondaryColor}10 100%);">
        <div class="card animate-fade" style="max-width: 450px; width: 100%; padding: 3rem;">
            <div style="text-align: center; margin-bottom: 2.5rem;">
                <div style="width: 80px; height: 80px; margin: 0 auto 1.5rem; border-radius: 20px; background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%); display: flex; align-items: center; justify-content: center;">
                    <span class="material-icons" style="font-size: 2.5rem; color: #FFFFFF;">person_add</span>
                </div>
                <h1 style="font-size: 1.75rem; font-weight: 800; color: ${primaryColor}; margin-bottom: 0.5rem;">Create Account</h1>
                <p style="color: ${textColor}; opacity: 0.6;">Join us and start shopping</p>
            </div>
            
            <div class="register-error" id="registerError"></div>
            
            <form onsubmit="handleRegister(event)" style="display: flex; flex-direction: column; gap: 1.25rem;">
                <div>
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Full Name <span style="color: #dc2626;">*</span></label>
                    <input type="text" id="register-name" placeholder="Enter your full name" required class="input-field">
                </div>
                <div>
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Email <span style="color: #dc2626;">*</span></label>
                    <input type="email" id="register-email" placeholder="Enter your email" required class="input-field">
                </div>
                <div>
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Phone Number</label>
                    <input type="tel" id="register-phone" placeholder="+20 123 456 7890" class="input-field">
                </div>
                <div>
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Password <span style="color: #dc2626;">*</span></label>
                    <input type="password" id="register-password" placeholder="Create a password" required minlength="6" class="input-field">
                </div>
                <div>
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Confirm Password <span style="color: #dc2626;">*</span></label>
                    <input type="password" id="register-confirm" placeholder="Confirm your password" required class="input-field">
                </div>
                <button type="submit" id="registerBtn" class="btn-primary register-btn" style="width: 100%; margin-top: 0.5rem;">Create Account</button>
            </form>
            
            <p style="text-align: center; margin-top: 2rem; color: ${textColor}; opacity: 0.7;">
                Already have an account? 
                <a href="${baseUrl}/login" style="color: ${primaryColor}; font-weight: 600; text-decoration: none;">Sign In</a>
            </p>
        </div>
    </main>
    <script>
        var REGISTER_BUSINESS_ID = ${JSON.stringify(businessId || '')};
        var REGISTER_API_URL = 'https://us-central1-${(config.FIREBASE_PROJECT_ID || 'madas-store')}.cloudfunctions.net/registerWebsiteCustomer';

        async function handleRegister(e) {
            e.preventDefault();
            var errorDiv = document.getElementById('registerError');
            var btn = document.getElementById('registerBtn');
            errorDiv.style.display = 'none';

            var name = document.getElementById('register-name').value.trim();
            var email = document.getElementById('register-email').value.trim();
            var phone = document.getElementById('register-phone').value.trim();
            var password = document.getElementById('register-password').value;
            var confirm = document.getElementById('register-confirm').value;

            if (!name || !email || !password) {
                errorDiv.textContent = 'Please fill in all required fields.';
                errorDiv.style.display = 'block';
                return;
            }

            if (password.length < 6) {
                errorDiv.textContent = 'Password must be at least 6 characters.';
                errorDiv.style.display = 'block';
                return;
            }

            if (password !== confirm) {
                errorDiv.textContent = 'Passwords do not match.';
                errorDiv.style.display = 'block';
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Creating account...';

            try {
                var response = await fetch(REGISTER_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        businessId: REGISTER_BUSINESS_ID,
                        name: name,
                        email: email,
                        phone: phone,
                        password: password
                    })
                });

                var data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Registration failed');
                }

                // Save customer data to localStorage
                setUser(data.customer);

                var base = (typeof BASE_URL !== 'undefined' && BASE_URL) ? BASE_URL : '';
                window.location.href = (base || '') + '/profile';
            } catch (err) {
                errorDiv.textContent = err.message || 'Registration failed. Please try again.';
                errorDiv.style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'Create Account';
            }
        }
    </script>
  `;
}

function generateOrderSuccessPageContent(siteId, primaryColor, secondaryColor, textColor, useCleanUrls = false, businessId = null) {
  const baseUrl = useCleanUrls ? '' : (siteId ? `/site/${siteId}` : '');
  const primary = primaryColor || '#27491F';
  const text = textColor || '#171817';
  return `
    <style>
        .success-page { max-width: 800px; margin: 0 auto; padding: 40px 24px; }
        .success-hero { text-align: center; padding: 48px 24px; margin-bottom: 32px; }
        .success-checkmark {
            width: 100px; height: 100px; border-radius: 50%;
            background: linear-gradient(135deg, #22c55e, #16a34a);
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 24px; animation: scaleIn 0.5s ease;
        }
        @keyframes scaleIn { 0% { transform: scale(0); } 60% { transform: scale(1.2); } 100% { transform: scale(1); } }
        .success-checkmark .material-icons { font-size: 56px; color: #fff; }
        .success-title { font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; margin-bottom: 8px; color: ${primary}; }
        .success-subtitle { font-size: 15px; color: ${text}; opacity: 0.6; margin-bottom: 24px; }
        .order-id-badge {
            display: inline-block; padding: 8px 20px;
            background: ${primary}10; border: 1px solid ${primary}30;
            border-radius: 8px; font-size: 14px; font-weight: 700;
            color: ${primary}; letter-spacing: 1px;
        }
        .order-id-badge span { font-weight: 400; opacity: 0.7; margin-right: 4px; }

        .order-detail-card {
            border: 1px solid #e5e5e5; margin-bottom: 24px; overflow: hidden;
        }
        .order-detail-header {
            background: #fafafa; padding: 16px 20px;
            font-size: 13px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.5px; border-bottom: 1px solid #e5e5e5;
            display: flex; align-items: center; gap: 8px; color: ${text};
        }
        .order-detail-header .material-icons { font-size: 18px; color: ${primary}; }
        .order-detail-body { padding: 20px; }

        .order-item {
            display: flex; gap: 16px; padding: 12px 0;
            border-bottom: 1px solid #f0f0f0; align-items: center;
        }
        .order-item:last-child { border-bottom: none; }
        .order-item-img {
            width: 56px; height: 56px; border-radius: 8px;
            background: #f5f5f5; overflow: hidden; flex-shrink: 0;
        }
        .order-item-img img { width: 100%; height: 100%; object-fit: cover; }
        .order-item-name { font-size: 14px; font-weight: 600; color: ${text}; }
        .order-item-meta { font-size: 12px; color: ${text}; opacity: 0.5; margin-top: 2px; }
        .order-item-price { margin-left: auto; font-size: 14px; font-weight: 700; white-space: nowrap; color: ${text}; }

        .summary-line { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: ${text}; }
        .summary-line.total { font-weight: 900; font-size: 16px; padding-top: 12px; margin-top: 8px; border-top: 2px solid #e5e5e5; }
        .summary-line.discount { color: #16a34a; }

        .info-grid-success { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .info-block label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${text}; opacity: 0.5; margin-bottom: 4px; }
        .info-block p { font-size: 14px; margin: 0; color: ${text}; }

        .success-actions { display: flex; gap: 12px; justify-content: center; margin-top: 32px; flex-wrap: wrap; }
        .success-btn {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 14px 28px; font-size: 13px; font-weight: 700;
            text-transform: uppercase; letter-spacing: 1px;
            text-decoration: none; cursor: pointer; border: none;
            transition: all 0.2s;
        }
        .success-btn.primary { background: ${primary}; color: #fff; }
        .success-btn.primary:hover { opacity: 0.9; }
        .success-btn.secondary { background: #fff; color: ${primary}; border: 1px solid ${primary}; }
        .success-btn.secondary:hover { background: ${primary}10; }
        .success-btn .material-icons { font-size: 18px; }

        @media (max-width: 600px) {
            .success-hero { padding: 32px 16px; }
            .success-title { font-size: 22px; }
            .info-grid-success { grid-template-columns: 1fr; }
            .success-actions { flex-direction: column; align-items: stretch; }
        }
    </style>

    <div class="success-page">
        <div class="success-hero">
            <div class="success-checkmark">
                <span class="material-icons">check</span>
            </div>
            <h1 class="success-title">Order Confirmed!</h1>
            <p class="success-subtitle">Thank you for your order. We'll send you a confirmation email shortly.</p>
            <div class="order-id-badge" id="orderIdBadge">
                <span>Order ID:</span> <span id="orderIdText">Loading...</span>
            </div>
        </div>

        <div id="orderDetails"></div>

        <div class="success-actions">
            <a href="${baseUrl}/products" class="success-btn primary">
                <span class="material-icons">storefront</span>
                Continue Shopping
            </a>
            <a href="${baseUrl}/profile" class="success-btn secondary">
                <span class="material-icons">person</span>
                My Account
            </a>
        </div>
    </div>

    <script>
        (function() {
            var SITE_ID_LOCAL = ${JSON.stringify(siteId || '')};
            var params = new URLSearchParams(window.location.search);
            var orderId = params.get('orderId') || '';

            // Display order ID
            var orderIdText = document.getElementById('orderIdText');
            if (orderIdText) orderIdText.textContent = orderId ? '#' + orderId.slice(-8).toUpperCase() : 'N/A';

            // Try to load order details from localStorage
            var order = null;
            try {
                var raw = localStorage.getItem('lastOrder_' + SITE_ID_LOCAL);
                if (raw) order = JSON.parse(raw);
            } catch(e) {}

            var container = document.getElementById('orderDetails');
            if (!order || !container) return;

            // Get currency symbol
            var CURR = (typeof CURRENCY_SYMBOL !== 'undefined') ? CURRENCY_SYMBOL : '$';

            // Build items HTML
            var itemsHtml = '';
            if (order.items && order.items.length > 0) {
                order.items.forEach(function(item) {
                    var imgHtml = item.image
                        ? '<img src="' + item.image + '" alt="">'
                        : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><span class="material-icons" style="color:#ccc;font-size:24px;">image</span></div>';
                    var qty = item.quantity || 1;
                    var lineTotal = (item.price || 0) * qty;
                    itemsHtml += '<div class="order-item">'
                        + '<div class="order-item-img">' + imgHtml + '</div>'
                        + '<div>'
                        + '<div class="order-item-name">' + (item.name || '') + '</div>'
                        + '<div class="order-item-meta">Qty: ' + qty + (item.size ? ' | Size: ' + item.size : '') + '</div>'
                        + '</div>'
                        + '<div class="order-item-price">' + CURR + lineTotal.toFixed(2) + '</div>'
                        + '</div>';
                });
            }

            // Payment method label
            var paymentLabels = { cod: 'Cash on Delivery', card: 'Credit/Debit Card', instapay: 'InstaPay', paymob: 'Paymob', fawry: 'Fawry', vodafone_cash: 'Vodafone Cash', bank_transfer: 'Bank Transfer' };
            var payLabel = paymentLabels[order.paymentMethod] || order.paymentMethod || 'N/A';

            // Build summary
            var summaryHtml = '<div class="summary-line"><span>Subtotal</span><span>' + CURR + (order.subtotal || 0).toFixed(2) + '</span></div>';
            if (order.discountAmount && order.discountAmount > 0) {
                summaryHtml += '<div class="summary-line discount"><span>Discount</span><span>-' + CURR + order.discountAmount.toFixed(2) + '</span></div>';
            }
            summaryHtml += '<div class="summary-line"><span>Shipping</span><span>' + (order.shipping === 0 ? 'FREE' : CURR + (order.shipping || 0).toFixed(2)) + '</span></div>';
            summaryHtml += '<div class="summary-line total"><span>Total</span><span>' + CURR + (order.total || 0).toFixed(2) + '</span></div>';

            // Address string
            var addr = order.addressDetails || {};
            var addrParts = [addr.line, addr.apartment ? 'Apt ' + addr.apartment : '', addr.floor ? 'Floor ' + addr.floor : '', addr.building ? 'Bldg ' + addr.building : ''].filter(Boolean);
            var addrLine1 = addrParts.join(', ');
            var addrLine2 = [addr.neighborhood, addr.district, addr.governorate, addr.country].filter(Boolean).join(', ');

            // Date
            var dateStr = 'Just now';
            try {
                if (order.date) {
                    var d = new Date(order.date);
                    dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                }
            } catch(e) {}

            container.innerHTML = ''
                + '<div class="order-detail-card">'
                + '  <div class="order-detail-header"><span class="material-icons">shopping_bag</span> Order Items</div>'
                + '  <div class="order-detail-body">' + itemsHtml + '</div>'
                + '</div>'
                + '<div class="order-detail-card">'
                + '  <div class="order-detail-header"><span class="material-icons">receipt</span> Order Summary</div>'
                + '  <div class="order-detail-body">' + summaryHtml + '</div>'
                + '</div>'
                + '<div class="order-detail-card">'
                + '  <div class="order-detail-header"><span class="material-icons">info</span> Order Details</div>'
                + '  <div class="order-detail-body">'
                + '    <div class="info-grid-success">'
                + '      <div class="info-block"><label>Customer</label><p>' + (order.customerName || 'N/A') + '</p></div>'
                + '      <div class="info-block"><label>Email</label><p>' + (order.email || 'N/A') + '</p></div>'
                + '      <div class="info-block"><label>Phone</label><p>' + (order.phone || 'N/A') + '</p></div>'
                + '      <div class="info-block"><label>Payment</label><p>' + payLabel + '</p></div>'
                + '      <div class="info-block"><label>Date</label><p>' + dateStr + '</p></div>'
                + '      <div class="info-block"><label>Status</label><p style="color: #f59e0b; font-weight: 700;">Pending</p></div>'
                + '    </div>'
                + '    <div style="margin-top: 16px;">'
                + '      <div class="info-block"><label>Shipping Address</label><p>' + addrLine1 + (addrLine2 ? '<br>' + addrLine2 : '') + '</p></div>'
                + '    </div>'
                + '  </div>'
                + '</div>';

            // Clean up localStorage (one-time display)
            try { localStorage.removeItem('lastOrder_' + SITE_ID_LOCAL); } catch(e) {}
        })();
    </script>
  `;
}

// Escape for use inside a JS string in HTML onclick/onchange (prevents SyntaxError and XSS)
function safeJsStr(s) {
  if (s == null) return '';
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}
// Escape for HTML text/attributes so </script> or quotes don't break the page
function safeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function generateProductsPageContent(siteId, primaryColor, secondaryColor, textColor, backgroundColor, businessId, queryParams, currencySymbol = '$', discountColor = '#dc2626', useCleanUrls = false) {
  const baseUrl = useCleanUrls ? '' : (siteId ? `/site/${siteId}` : '');
  const bg = backgroundColor || '#FFFFFF';
  const primary = primaryColor || '#27491F';
  const secondary = secondaryColor || '#F0CAE1';
  const text = textColor || '#171817';
  const discount = discountColor || '#dc2626';
  const primaryEncoded = encodeURIComponent(primary);
  try {
    const collectionId = queryParams.collection || '';
    const sortBy = queryParams.sort || 'newest';
    const searchQuery = queryParams.q || '';
    let products = [];
    let collections = [];
    let collectionName = '';
    let allProductsForRecs = [];

    // Fetch products and collections from Firestore
    if (businessId) {
      const productsRef = db.collection('businesses').doc(businessId).collection('products');
      const collectionsRef = db.collection('businesses').doc(businessId).collection('collections');
      
      // Fetch pricing changes
      let pricingChanges = {};
      try {
        const pricingRef = db.collection('businesses').doc(businessId).collection('pricingChanges');
        const pricingSnapshot = await pricingRef.get();
        pricingSnapshot.docs.forEach(doc => {
          const pricingData = doc.data();
          const key = pricingData.productId + (pricingData.size ? '-' + pricingData.size : '');
          pricingChanges[key] = pricingData;
        });
      } catch (pricingError) {
        console.error('[generateProductsPageContent] Error fetching pricing changes:', pricingError);
      }
      
      const [productsSnapshot, collectionsSnapshot] = await Promise.all([
        productsRef.get(),
        collectionsRef.get()
      ]);
      
      products = productsSnapshot.docs.map(doc => {
        const productData = { id: doc.id, ...doc.data() };
        
        // Apply pricing changes for base product
        const baseKey = productData.id;
        if (pricingChanges[baseKey]) {
          const pricing = pricingChanges[baseKey];
          const basePrice = productData.sellingPrice || productData.price || 0;
          
          if (pricing.discountType === 'percentage') {
            productData.salePrice = Math.round(basePrice * (1 - pricing.discountValue / 100));
            productData.onSale = true;
          } else if (pricing.discountType === 'fixed') {
            productData.salePrice = Math.max(0, basePrice - pricing.discountValue);
            productData.onSale = true;
          }
        }
        
        return productData;
      });
      const allProductsForRecs = [...products];
      
      collections = collectionsSnapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          slug: generateSlug(d.name || '')
        };
      });

      // Filter by collection if specified
      if (collectionId) {
        const collection = collections.find(c => c.id === collectionId);
        if (collection) {
          collectionName = collection.name || '';
          const productIds = collection.productIds || [];
          if (productIds.length > 0) {
            products = products.filter(p => productIds.includes(p.id));
          } else {
            products = [];
          }
        }
      }
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        products = products.filter(p => 
          (p.name && p.name.toLowerCase().includes(query)) ||
          (p.description && p.description.toLowerCase().includes(query))
        );
      }
      
      // Sort products
      switch (sortBy) {
        case 'price-low':
          products.sort((a, b) => (a.sellingPrice || a.price || 0) - (b.sellingPrice || b.price || 0));
          break;
        case 'price-high':
          products.sort((a, b) => (b.sellingPrice || b.price || 0) - (a.sellingPrice || a.price || 0));
          break;
        case 'name':
          products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          break;
        case 'newest':
        default:
          products.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
          break;
      }
    }

    const hasStock = (p) => {
      const s = p.stock;
      if (typeof s === 'number') return s > 0;
      if (p.stockBySize && typeof p.stockBySize === 'object') return Object.values(p.stockBySize).some(v => (v || 0) > 0);
      return false;
    };
    const allOutOfStock = products.length > 0 && products.every(p => !hasStock(p));
    const showRecommendations = (products.length === 0 || allOutOfStock) && businessId && allProductsForRecs && allProductsForRecs.length > 0;
    const recommendations = showRecommendations
      ? allProductsForRecs.filter(p => hasStock(p) && !products.some(x => x.id === p.id)).slice(0, 8)
      : [];

    const pageTitle = collectionName || (searchQuery ? `Search: "${searchQuery}"` : 'All Products');
    
    const payloadProducts = [...products];
    recommendations.forEach(r => { if (!payloadProducts.some(p => p.id === r.id)) payloadProducts.push(r); });
    
    // Generate productsData JSON string safely before template literal
    const productsDataJSONRaw = JSON.stringify(payloadProducts.map(p => {
      const pOnSale = p.onSale && p.salePrice;
      const pPrice = pOnSale ? p.salePrice : (p.sellingPrice || p.price || 0);
      const pOriginal = p.compareAtPrice || p.sellingPrice || p.price || 0;
      return {
        id: p.id || '',
        name: p.name || '',
        slug: generateSlug(p.name || ''),
        price: pPrice,
        originalPrice: pOriginal,
        onSale: pOnSale || false,
        image: (p.images && p.images[0]) ? p.images[0] : null,
        stock: typeof p.stock === 'number' ? p.stock : 0,
        sizes: Array.isArray(p.sizes) ? p.sizes : [],
        stockBySize: (typeof p.stock === 'object' && !Array.isArray(p.stock) && p.stock !== null) ? p.stock : {}
      };
    }));
    // Encode JSON as Base64 so no product data (e.g. </script>, quotes) can break the HTML or script.
    const productsDataBase64 = Buffer.from(productsDataJSONRaw, 'utf8').toString('base64');
    return `
    <style>
        .products-page { max-width: 1440px; margin: 0 auto; padding: 0 24px; background: ${bg}; color: ${text}; }
        .products-page a { color: inherit; }
        
        /* Header - theme colors */
        .products-header { 
            padding: 40px 0 24px; 
            border-bottom: 1px solid ${primary}30; 
            margin-bottom: 24px;
        }
        .products-breadcrumb { 
            font-size: 13px; color: ${text}; opacity: 0.8;
            margin-bottom: 16px; 
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .products-breadcrumb a { color: ${primary}; text-decoration: underline; }
        .products-breadcrumb a:hover { opacity: 0.9; }
        .products-title { 
            font-size: 40px; font-weight: 900; 
            text-transform: uppercase; 
            letter-spacing: -1px;
            margin-bottom: 8px;
            color: ${text};
        }
        .products-count { font-size: 14px; color: ${text}; opacity: 0.7; }
        
        /* Toolbar - theme */
        .products-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 0;
            border-bottom: 1px solid ${primary}30;
            margin-bottom: 24px;
            flex-wrap: wrap;
            gap: 16px;
        }
        .toolbar-left { display: flex; align-items: center; gap: 16px; }
        .toolbar-right { display: flex; align-items: center; gap: 16px; }
        
        .filters-dropdown-wrap { position: relative; }
        .filter-toggle {
            display: flex; align-items: center; gap: 8px;
            padding: 10px 16px;
            border: 1px solid ${primary}50;
            background: ${bg};
            color: ${text};
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: border-color 0.2s, background 0.2s;
        }
        .filter-toggle:hover { border-color: ${primary}; background: ${primary}08; }
        .filter-toggle .material-icons { font-size: 18px; }
        .filter-toggle .material-icons.dropdown-arrow { font-size: 16px; margin-left: 4px; transition: transform 0.2s; }
        .filters-dropdown-wrap.open .filter-toggle .material-icons.dropdown-arrow { transform: rotate(180deg); }
        .filters-dropdown-panel {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            margin-top: 8px;
            min-width: 280px;
            max-width: 90vw;
            max-height: 70vh;
            overflow-y: auto;
            background: ${bg};
            border: 1px solid ${primary}30;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            z-index: 100;
            padding: 16px;
        }
        .filters-dropdown-wrap.open .filters-dropdown-panel { display: block; }
        .filters-dropdown-panel .filter-section { padding: 12px 0; border-bottom: 1px solid ${primary}20; }
        .filters-dropdown-panel .filter-section:last-of-type { border-bottom: none; }
        .filters-dropdown-panel .filter-title { margin-bottom: 10px; font-size: 12px; }
        .filters-dropdown-panel .filter-option { padding: 6px 0; }
        
        .sort-select {
            padding: 10px 40px 10px 16px;
            border: 1px solid ${primary}50;
            background: ${bg};
            color: ${text};
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            appearance: none;
            min-width: 180px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='${primaryEncoded}' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 8px center;
        }
        .sort-select:hover { border-color: ${primary}; }
        
        .view-toggle { display: flex; border: 1px solid ${primary}50; border-radius: 0; overflow: hidden; }
        .view-btn {
            width: 40px; height: 40px;
            border: none; background: ${bg};
            color: ${text};
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: background 0.2s, color 0.2s;
        }
        .view-btn:first-child { border-right: 1px solid ${primary}50; }
        .view-btn.active { background: ${primary}; color: #fff; }
        .view-btn:hover:not(.active) { background: ${primary}15; }
        .view-btn .material-icons { font-size: 20px; }
        
        .search-bar {
            display: flex;
            border: 1px solid ${primary}50;
            background: ${bg};
            max-width: 300px;
            transition: border-color 0.2s;
        }
        .search-bar:focus-within { border-color: ${primary}; }
        .search-bar input {
            flex: 1;
            padding: 10px 16px;
            border: none;
            font-size: 14px;
            outline: none;
            background: transparent;
            color: ${text};
        }
        .search-bar input::placeholder { color: ${text}; opacity: 0.5; }
        .search-bar button {
            padding: 10px 16px;
            border: none;
            background: transparent;
            cursor: pointer;
            color: ${primary};
        }
        .search-bar button:hover { opacity: 0.8; }
        
        .products-layout { display: flex; gap: 32px; }
        
        .filters-sidebar {
            width: 260px;
            flex-shrink: 0;
            display: block;
            background: ${bg};
            border: 1px solid ${primary}20;
            border-radius: 12px;
            padding: 20px;
        }
        
        .filter-section { 
            border-bottom: 1px solid ${primary}20; 
            padding: 20px 0;
        }
        .filter-section:first-child { padding-top: 0; }
        .filter-title {
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            color: ${text};
        }
        .filter-title .material-icons { font-size: 20px; transition: transform 0.2s; color: ${primary}; }
        .filter-section.collapsed .filter-title .material-icons { transform: rotate(-90deg); }
        .filter-section.collapsed .filter-content { display: none; }
        
        .filter-option {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 0;
            font-size: 14px;
            cursor: pointer;
            color: ${text};
        }
        .filter-option:hover { color: ${primary}; }
        .filter-option input { display: none; }
        .filter-checkbox {
            width: 20px; height: 20px;
            border: 1px solid ${primary}50;
            border-radius: 4px;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
        }
        .filter-option input:checked + .filter-checkbox { background: ${primary}; border-color: ${primary}; }
        .filter-option input:checked + .filter-checkbox::after { content: '✓'; color: white; font-size: 12px; font-weight: bold; }
        .filter-count { opacity: 0.7; margin-left: auto; font-size: 13px; }
        
        .clear-filters {
            margin-top: 16px;
            font-size: 13px;
            color: ${primary};
            text-decoration: underline;
            cursor: pointer;
            background: none;
            border: none;
        }
        .clear-filters:hover { opacity: 0.9; }
        
        .products-content { flex: 1; min-width: 0; }
        
        .products-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
        }
        .products-grid.large { grid-template-columns: repeat(2, 1fr); gap: 24px; }
        
        .product-card {
            position: relative;
            text-decoration: none;
            color: ${text};
            display: block;
        }
        .product-card-image {
            position: relative;
            aspect-ratio: 1;
            background: ${primary}08;
            overflow: hidden;
            margin-bottom: 12px;
            border-radius: 12px;
        }
        .product-card-image img {
            width: 100%; height: 100%;
            object-fit: cover;
            transition: transform 0.5s ease;
        }
        .product-card:hover .product-card-image img { transform: scale(1.05); }
        
        .product-card-badge {
            position: absolute;
            top: 12px; left: 12px;
            padding: 6px 12px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-radius: 6px;
        }
        .badge-sale { background: ${discount}; color: white; }
        .badge-new { background: ${primary}; color: white; }
        .badge-out { background: ${text}; opacity: 0.5; color: white; }
        
        .product-card-actions {
            position: absolute;
            top: 12px; right: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            opacity: 0;
            transition: opacity 0.2s;
        }
        .product-card:hover .product-card-actions { opacity: 1; }
        
        .action-btn {
            width: 40px; height: 40px;
            background: ${bg};
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: all 0.2s;
            color: ${text};
        }
        .action-btn:hover { background: ${primary}; color: #fff; }
        .action-btn .material-icons { font-size: 20px; transition: transform 0.2s ease; }
        .action-btn.wishlist-btn.active { color: ${discount}; }
        .action-btn.wishlist-btn.active .material-icons { color: ${discount}; transform: scale(1.1); }
        .action-btn.wishlist-btn:hover .material-icons { transform: scale(1.1); }
        .action-btn.wishlist-btn.active:hover .material-icons { transform: scale(1.15); }
        
        .quick-add {
            position: absolute;
            bottom: 12px; left: 12px; right: 12px;
            padding: 12px;
            background: ${bg};
            color: ${primary};
            border: 2px solid ${primary};
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            cursor: pointer;
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.2s;
            border-radius: 8px;
        }
        .product-card:hover .quick-add { opacity: 1; transform: translateY(0); }
        .quick-add:hover { background: ${primary}; color: #fff; }
        .quick-add:disabled { background: ${text}; opacity: 0.3; border-color: transparent; cursor: not-allowed; color: #fff; }
        
        .product-card-info { padding: 0 4px; }
        .product-card-name {
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: ${text};
        }
        .product-card-price { font-size: 14px; font-weight: 700; color: ${text}; }
        .price-sale { color: ${discount}; margin-right: 8px; }
        .price-original { color: ${text}; opacity: 0.6; text-decoration: line-through; font-weight: 400; }
        .product-card-brand { font-size: 12px; opacity: 0.7; margin-top: 4px; }
        
        .empty-products {
            text-align: center;
            padding: 80px 24px;
            color: ${text};
        }
        .empty-icon { font-size: 80px; color: ${primary}; opacity: 0.3; margin-bottom: 24px; }
        .empty-title { font-size: 24px; font-weight: 900; text-transform: uppercase; margin-bottom: 8px; color: ${text}; }
        .empty-text { font-size: 14px; opacity: 0.7; margin-bottom: 32px; }
        .shop-btn {
            display: inline-flex; align-items: center; gap: 12px;
            padding: 16px 32px;
            background: ${primary}; color: #fff;
            text-decoration: none;
            font-size: 13px; font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            border-radius: 12px;
            transition: opacity 0.2s, transform 0.2s;
        }
        .shop-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        
        .recommendations-section {
            margin-top: 48px;
            padding-top: 32px;
            border-top: 1px solid ${primary}30;
        }
        .recommendations-title {
            font-size: 18px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 8px;
            color: ${text};
        }
        .recommendations-subtitle {
            font-size: 14px;
            opacity: 0.8;
            margin-bottom: 24px;
            color: ${text};
        }
        .recommendations-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 24px;
        }
        .recommendations-section .product-card { height: 100%; }
        @media (max-width: 1200px) {
            .recommendations-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 900px) {
            .recommendations-grid { grid-template-columns: repeat(2, 1fr); }
        }
        
        .toast {
            position: fixed;
            bottom: 24px; left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: ${primary};
            color: white;
            padding: 16px 32px;
            font-size: 14px; font-weight: 600;
            z-index: 10000;
            opacity: 0;
            transition: all 0.3s ease;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        .toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }
        
        @media (max-width: 1200px) {
            .products-grid { grid-template-columns: repeat(3, 1fr); }
            .products-grid.large { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 900px) {
            .filters-sidebar { display: none !important; position: fixed; top: 0; left: 0; bottom: 0; z-index: 1000; width: 280px; max-width: 85vw; overflow-y: auto; box-shadow: 4px 0 20px rgba(0,0,0,0.15); }
            .filters-sidebar.active { display: block !important; }
            .products-grid { grid-template-columns: repeat(2, 1fr); }
            .products-grid.large { grid-template-columns: repeat(2, 1fr); }
            .products-title { font-size: 28px; }
        }
        @media (max-width: 600px) {
            .products-page { padding: 0 12px; }
            .products-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
            .toolbar-left, .toolbar-right { width: 100%; justify-content: space-between; }
            .search-bar { max-width: 100%; flex: 1; }
            .product-card-actions { opacity: 1; }
            .quick-add { opacity: 1; transform: translateY(0); }
        }
    </style>
    
    <div class="products-page">
        <div class="products-header">
            <div class="products-breadcrumb">
                <a href="${baseUrl}">Home</a> / 
                ${collectionId ? `<a href="${baseUrl}/products">Products</a> / <span>${collectionName}</span>` : '<span>Products</span>'}
            </div>
            <h1 class="products-title">${pageTitle}</h1>
            <p class="products-count">${products.length} Product${products.length !== 1 ? 's' : ''}</p>
        </div>
        
        <div class="products-toolbar">
            <div class="toolbar-left">
                <div class="filters-dropdown-wrap" id="filtersDropdownWrap">
                    <button type="button" class="filter-toggle" onclick="toggleFiltersDropdown()" aria-expanded="false" aria-haspopup="true" id="filtersDropdownBtn">
                        <span class="material-icons">tune</span>
                        Filters
                        <span class="material-icons dropdown-arrow">expand_more</span>
                    </button>
                    <div class="filters-dropdown-panel" id="filtersDropdownPanel">
                        ${collections.length > 0 ? `
                        <div class="filter-section">
                            <div class="filter-title">Collections</div>
                            <div class="filter-content">
                                <label class="filter-option" onclick="filterByCollection(''); closeFiltersDropdown();">
                                    <input type="radio" name="collection" ${!collectionId ? 'checked' : ''}>
                                    <span class="filter-checkbox"></span>
                                    All Products
                                </label>
                                ${collections.map(c => `
                                    <label class="filter-option" onclick="filterByCollection('${safeJsStr(c.id)}'); closeFiltersDropdown();">
                                        <input type="radio" name="collection" ${collectionId === c.id ? 'checked' : ''}>
                                        <span class="filter-checkbox"></span>
                                        ${safeHtml(c.name)}
                                        <span class="filter-count">${(c.productIds || []).length}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}
                        <div class="filter-section">
                            <div class="filter-title">Price Range</div>
                            <div class="filter-content">
                                <label class="filter-option">
                                    <input type="radio" name="priceRange" value="all" onchange="filterByPrice('all')" checked>
                                    <span class="filter-checkbox"></span>
                                    All Prices
                                </label>
                                <label class="filter-option">
                                    <input type="radio" name="priceRange" value="0-100" onchange="filterByPrice('0-100')">
                                    <span class="filter-checkbox"></span>
                                    Under ${currencySymbol}100
                                </label>
                                <label class="filter-option">
                                    <input type="radio" name="priceRange" value="100-500" onchange="filterByPrice('100-500')">
                                    <span class="filter-checkbox"></span>
                                    ${currencySymbol}100 - ${currencySymbol}500
                                </label>
                                <label class="filter-option">
                                    <input type="radio" name="priceRange" value="500+" onchange="filterByPrice('500+')">
                                    <span class="filter-checkbox"></span>
                                    Over ${currencySymbol}500
                                </label>
                            </div>
                        </div>
                        <button type="button" class="clear-filters" onclick="clearFilters(); closeFiltersDropdown();">Clear All Filters</button>
                    </div>
                </div>
                <div class="search-bar">
                    <input type="text" placeholder="Search products..." id="searchInput" value="${(searchQuery || '').replace(/"/g, '&quot;')}" onkeydown="if(event.key==='Enter')searchProducts()">
                    <button onclick="searchProducts()">
                        <span class="material-icons">search</span>
                    </button>
                </div>
            </div>
            <div class="toolbar-right">
                <select class="sort-select" onchange="sortProducts(this.value)">
                    <option value="newest" ${sortBy === 'newest' ? 'selected' : ''}>Newest</option>
                    <option value="price-low" ${sortBy === 'price-low' ? 'selected' : ''}>Price: Low to High</option>
                    <option value="price-high" ${sortBy === 'price-high' ? 'selected' : ''}>Price: High to Low</option>
                    <option value="name" ${sortBy === 'name' ? 'selected' : ''}>Name A-Z</option>
                </select>
                <div class="view-toggle">
                    <button class="view-btn active" onclick="setView('normal', this)" title="Grid view">
                        <span class="material-icons">grid_view</span>
                    </button>
                    <button class="view-btn" onclick="setView('large', this)" title="Large view">
                        <span class="material-icons">view_module</span>
                    </button>
                </div>
            </div>
        </div>
        
        <div class="products-layout">
            <div class="products-content">
                ${products.length === 0 ? `
                    <div class="empty-products">
                        <span class="material-icons empty-icon">inventory_2</span>
                        <h2 class="empty-title">NO PRODUCTS FOUND</h2>
                        <p class="empty-text">${searchQuery ? 'Try adjusting your search or filters' : 'Check back soon for new arrivals'}</p>
                        <a href="${baseUrl}/products" class="shop-btn">
                            VIEW ALL PRODUCTS
                            <span class="material-icons">arrow_forward</span>
                        </a>
                        ${recommendations.length > 0 ? `
                        <div class="recommendations-section">
                            <h3 class="recommendations-title">YOU MIGHT ALSO LIKE</h3>
                            <div class="recommendations-grid">
                                ${recommendations.map(product => {
                                  const productPrice = product.onSale && product.salePrice ? product.salePrice : (product.sellingPrice || product.price || 0);
                                  const originalPrice = product.compareAtPrice || product.sellingPrice || product.price || 0;
                                  const discount = product.onSale ? Math.round((1 - productPrice / originalPrice) * 100) : 0;
                                  return `
                                    <a href="${baseUrl}/products/${generateSlug(product.name)}" class="product-card" data-id="${safeHtml(product.id)}">
                                        <div class="product-card-image">
                                            ${product.images && product.images[0] 
                                                ? `<img src="${product.images[0].replace(/"/g, '&quot;')}" alt="${safeHtml(product.name)}" loading="lazy">`
                                                : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><span class="material-icons" style="font-size:64px;color:#ccc;">image</span></div>`
                                            }
                                            ${product.onSale ? `<span class="product-card-badge badge-sale">-${discount}%</span>` : ''}
                                            <div class="product-card-actions">
                                                <button type="button" class="action-btn wishlist-btn" data-product-id="${safeJsStr(product.id)}" onclick="event.preventDefault();event.stopPropagation();toggleWishlist('${safeJsStr(product.id)}', this)" title="Wishlist">
                                                    <span class="material-icons">favorite_border</span>
                                                </button>
                                            </div>
                                            <button class="quick-add" onclick="event.preventDefault();event.stopPropagation();addToCart('${safeJsStr(product.id)}')">Quick Add</button>
                                        </div>
                                        <div class="product-card-info">
                                            <div class="product-card-name">${safeHtml(product.name || 'Product')}</div>
                                            <div class="product-card-price">
                                                ${product.onSale && product.salePrice ? `
                                                    <span class="price-sale">${currencySymbol}${productPrice.toLocaleString()}</span>
                                                    <span class="price-original">${currencySymbol}${originalPrice.toLocaleString()}</span>
                                                ` : `${currencySymbol}${productPrice.toLocaleString()}`}
                                            </div>
                                        </div>
                                    </a>
                                  `;
                                }).join('')}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                ` : `
                    <div class="products-grid" id="productsGrid">
                        ${products.map(product => {
                          const productPrice = product.onSale && product.salePrice ? product.salePrice : (product.sellingPrice || product.price || 0);
                          const originalPrice = product.compareAtPrice || product.sellingPrice || product.price || 0;
                          const discount = product.onSale ? Math.round((1 - productPrice / originalPrice) * 100) : 0;
                          return `
                            <a href="${baseUrl}/products/${generateSlug(product.name)}" class="product-card" data-id="${safeHtml(product.id)}">
                                <div class="product-card-image">
                                    ${product.images && product.images[0] 
                                        ? `<img src="${product.images[0].replace(/"/g, '&quot;')}" alt="${safeHtml(product.name)}" loading="lazy">`
                                        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><span class="material-icons" style="font-size:64px;color:#ccc;">image</span></div>`
                                    }
                                    ${product.stock === 0 ? '<span class="product-card-badge badge-out">Sold Out</span>' : 
                                      product.onSale ? `<span class="product-card-badge badge-sale">-${discount}%</span>` : ''}
                                    <div class="product-card-actions">
                                        <button type="button" class="action-btn wishlist-btn" data-product-id="${safeJsStr(product.id)}" onclick="event.preventDefault();event.stopPropagation();toggleWishlist('${safeJsStr(product.id)}', this)" title="Wishlist">
                                            <span class="material-icons">favorite_border</span>
                                        </button>
                                    </div>
                                    <button class="quick-add" onclick="event.preventDefault();event.stopPropagation();addToCart('${safeJsStr(product.id)}')" ${product.stock === 0 ? 'disabled' : ''}>
                                        ${product.stock === 0 ? 'Sold Out' : 'Quick Add'}
                                    </button>
                                </div>
                                <div class="product-card-info">
                                    <div class="product-card-name">${safeHtml(product.name || 'Product')}</div>
                                    <div class="product-card-price">
                                        ${product.onSale && product.salePrice ? `
                                            <span class="price-sale">${currencySymbol}${productPrice.toLocaleString()}</span>
                                            <span class="price-original">${currencySymbol}${originalPrice.toLocaleString()}</span>
                                        ` : `${currencySymbol}${productPrice.toLocaleString()}`}
                                    </div>
                                </div>
                            </a>
                          `;
                        }).join('')}
                    </div>
                    ${allOutOfStock && recommendations.length > 0 ? `
                    <div class="recommendations-section recommendations-out-of-stock">
                        <h3 class="recommendations-title">IN STOCK ALTERNATIVES</h3>
                        <p class="recommendations-subtitle">The items you searched for are currently sold out. Here are some similar products you might like:</p>
                        <div class="recommendations-grid" id="recsGrid">
                            ${recommendations.map(product => {
                              const productPrice = product.onSale && product.salePrice ? product.salePrice : (product.sellingPrice || product.price || 0);
                              const originalPrice = product.compareAtPrice || product.sellingPrice || product.price || 0;
                              const discount = product.onSale ? Math.round((1 - productPrice / originalPrice) * 100) : 0;
                              return `
                                <a href="${baseUrl}/products/${generateSlug(product.name)}" class="product-card" data-id="${safeHtml(product.id)}">
                                    <div class="product-card-image">
                                        ${product.images && product.images[0] 
                                            ? `<img src="${product.images[0].replace(/"/g, '&quot;')}" alt="${safeHtml(product.name)}" loading="lazy">`
                                            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><span class="material-icons" style="font-size:64px;color:#ccc;">image</span></div>`
                                        }
                                        ${product.onSale ? `<span class="product-card-badge badge-sale">-${discount}%</span>` : ''}
                                        <div class="product-card-actions">
                                            <button type="button" class="action-btn wishlist-btn" data-product-id="${safeJsStr(product.id)}" onclick="event.preventDefault();event.stopPropagation();toggleWishlist('${safeJsStr(product.id)}', this)" title="Wishlist">
                                                <span class="material-icons">favorite_border</span>
                                            </button>
                                        </div>
                                        <button class="quick-add" onclick="event.preventDefault();event.stopPropagation();addToCart('${safeJsStr(product.id)}')">Quick Add</button>
                                    </div>
                                    <div class="product-card-info">
                                        <div class="product-card-name">${safeHtml(product.name || 'Product')}</div>
                                        <div class="product-card-price">
                                            ${product.onSale && product.salePrice ? `
                                                <span class="price-sale">${currencySymbol}${productPrice.toLocaleString()}</span>
                                                <span class="price-original">${currencySymbol}${originalPrice.toLocaleString()}</span>
                                            ` : `${currencySymbol}${productPrice.toLocaleString()}`}
                                        </div>
                                    </div>
                                </a>
                              `;
                            }).join('')}
                        </div>
                    </div>
                    ` : ''}
                `}
            </div>
        </div>
    </div>
    
    <div class="toast" id="toast"></div>
    <div id="products-data-base64" data-payload="${productsDataBase64}" style="display:none" aria-hidden="true"></div>
    <script>
        var CART_KEY = ${JSON.stringify('cart_' + (siteId || ''))};
        var FAVORITES_KEY = ${JSON.stringify('favorites_' + (siteId || ''))};
        var BUSINESS_ID_PROD = ${JSON.stringify(businessId || '')};
        var TRACK_CART_URL_PROD = 'https://us-central1-${(config.FIREBASE_PROJECT_ID || 'madas-store')}.cloudfunctions.net/trackCart';
        var SESSION_KEY_PROD = 'session_' + ${JSON.stringify(siteId || '')};
        var USER_KEY_PROD = 'user_' + ${JSON.stringify(siteId || '')};
        var BASE_URL = ${JSON.stringify(baseUrl || '')};
        var USE_COLLECTION_PATHS = ${useCleanUrls ? 'true' : 'false'};
        var COLLECTION_SLUGS = ${useCleanUrls && collections.length ? JSON.stringify(collections.reduce(function(acc, c) { if (c.slug) acc[c.id] = c.slug; return acc; }, {})) : '{}'};
        var productsData = [];
        try {
            var el = document.getElementById('products-data-base64');
            if (el && el.getAttribute('data-payload')) {
                productsData = JSON.parse(atob(el.getAttribute('data-payload')));
            }
        } catch (e) {
            console.error('Error parsing productsData:', e);
        }
        
        // Expose handlers on window first so inline onclick/onchange always resolve
        window.toggleFiltersDropdown = function() {
            var wrap = document.getElementById('filtersDropdownWrap');
            var btn = document.getElementById('filtersDropdownBtn');
            if (wrap) wrap.classList.toggle('open');
            if (btn) btn.setAttribute('aria-expanded', wrap && wrap.classList.contains('open') ? 'true' : 'false');
        };
        window.closeFiltersDropdown = function() {
            var wrap = document.getElementById('filtersDropdownWrap');
            var btn = document.getElementById('filtersDropdownBtn');
            if (wrap) wrap.classList.remove('open');
            if (btn) btn.setAttribute('aria-expanded', 'false');
        };
        document.addEventListener('click', function(e) {
            var wrap = document.getElementById('filtersDropdownWrap');
            if (!wrap || !wrap.classList.contains('open')) return;
            if (!wrap.contains(e.target)) closeFiltersDropdown();
        });
        window.setView = function(view, btn) {
            var grid = document.getElementById('productsGrid');
            if (!grid) return;
            grid.classList.remove('large');
            if (view === 'large') grid.classList.add('large');
            document.querySelectorAll('.view-btn').forEach(function(b) { b.classList.remove('active'); });
            if (btn) btn.classList.add('active');
        };
        window.sortProducts = function(sort) {
            var url = new URL(window.location);
            url.searchParams.set('sort', sort);
            window.location.href = url.toString();
        };
        window.searchProducts = function() {
            var inp = document.getElementById('searchInput');
            var query = inp ? inp.value.trim() : '';
            var url = new URL(window.location);
            if (query) url.searchParams.set('q', query);
            else url.searchParams.delete('q');
            window.location.href = url.toString();
        };
        window.toggleFilterSection = function(el) {
            if (el && el.parentElement) el.parentElement.classList.toggle('collapsed');
        };
        window.filterByCollection = function(collectionId) {
            if (typeof USE_COLLECTION_PATHS !== 'undefined' && USE_COLLECTION_PATHS) {
                var base = (typeof BASE_URL === 'string' && BASE_URL) ? BASE_URL : '';
                if (collectionId && typeof COLLECTION_SLUGS !== 'undefined' && COLLECTION_SLUGS && COLLECTION_SLUGS[collectionId]) {
                    window.location.href = base + '/' + COLLECTION_SLUGS[collectionId];
                    return;
                }
                window.location.href = base + '/products';
                return;
            }
            var url = new URL(window.location);
            if (collectionId) url.searchParams.set('collection', collectionId);
            else url.searchParams.delete('collection');
            window.location.href = url.toString();
        };
        window.filterByPrice = function(range) {
            try {
                var radios = document.querySelectorAll('input[name="priceRange"]');
                for (var r = 0; r < radios.length; r++) {
                    radios[r].checked = (radios[r].value === range);
                }
                if (!range || range === 'all') {
                    document.querySelectorAll('.product-card').forEach(function(p) { if (p) p.style.display = ''; });
                    return;
                }
                var minPrice = 0, maxPrice = Infinity;
                if (range.indexOf('+') !== -1) {
                    minPrice = parseFloat(range.replace('+', '')) || 0;
                } else if (range.indexOf('-') !== -1) {
                    var parts = range.split('-');
                    minPrice = parseFloat(parts[0]) || 0;
                    maxPrice = parseFloat(parts[1]) || Infinity;
                }
                var cards = document.querySelectorAll('.product-card');
                if (!productsData || !cards.length) return;
                cards.forEach(function(card) {
                    if (!card) return;
                    var productId = card.getAttribute('data-id');
                    var product = productsData.find(function(p) { return p && p.id === productId; });
                    if (!product) { card.style.display = 'none'; return; }
                    var price = product.price || product.originalPrice || 0;
                    card.style.display = (price >= minPrice && price <= maxPrice) ? '' : 'none';
                });
            } catch (err) { console.error(err); }
        };
        window.clearFilters = function() {
            var base = (typeof BASE_URL === 'string' && BASE_URL) ? BASE_URL : '';
            window.location.href = base + '/products';
        };
        window.showToast = function(message) {
            var toast = document.getElementById('toast');
            if (toast) { toast.textContent = message; toast.classList.add('show'); setTimeout(function() { toast.classList.remove('show'); }, 3000); }
        };
        window.addToCart = function(productId) {
            var product = productsData.find(function(p) { return p.id === productId; });
            if (!product) return;
            var hasSizes = product.sizes && product.sizes.length > 0;
            var selectedSize = '';
            if (hasSizes) {
                var availableSizes = product.sizes.filter(function(size) {
                    var sizeStock = product.stockBySize && product.stockBySize[size] !== undefined ? product.stockBySize[size] : (typeof product.stock === 'number' ? product.stock : 0);
                    return sizeStock > 0;
                });
                if (availableSizes.length === 0) { window.showToast('This product is out of stock'); return; }
                if (availableSizes.length === 1) selectedSize = availableSizes[0];
                else {
                    var sizeOptions = availableSizes.map(function(s) {
                        var st = product.stockBySize && product.stockBySize[s] !== undefined ? product.stockBySize[s] : (typeof product.stock === 'number' ? product.stock : 0);
                        return s + (st <= 5 ? ' (Low Stock: ' + st + ')' : '');
                    }).join('\\n');
                    selectedSize = prompt('Select size:\\n' + sizeOptions, availableSizes[0]);
                    if (!selectedSize || availableSizes.indexOf(selectedSize) === -1) return;
                }
            } else {
                var totalStock = typeof product.stock === 'number' ? product.stock : (product.stockBySize ? Object.keys(product.stockBySize).reduce(function(sum, k) { return sum + (product.stockBySize[k] || 0); }, 0) : 0);
                if (totalStock === 0) { window.showToast('This product is out of stock'); return; }
            }
            var availableStock = (selectedSize && product.stockBySize && product.stockBySize[selectedSize] !== undefined) ? product.stockBySize[selectedSize] : (typeof product.stock === 'number' ? product.stock : 0);
            if (availableStock === 0) { window.showToast('This size is out of stock'); return; }
            var cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
            var itemKey = product.id + (selectedSize ? '-' + selectedSize : '');
            var existing = cart.find(function(item) { return item.itemKey === itemKey; });
            if (existing) {
                if ((existing.quantity || 1) + 1 > availableStock) { window.showToast('Only ' + availableStock + ' available'); return; }
                existing.quantity = (existing.quantity || 1) + 1;
            } else {
                cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, itemKey: itemKey, size: selectedSize || undefined, quantity: 1 });
            }
            localStorage.setItem(CART_KEY, JSON.stringify(cart));
            window.showToast('Added to bag!');
            document.querySelectorAll('.cart-count').forEach(function(el) {
                var count = cart.reduce(function(sum, item) { return sum + (item.quantity || 1); }, 0);
                el.textContent = count > 9 ? '9+' : count;
                el.style.display = count > 0 ? 'flex' : 'none';
            });
        };
        window.toggleWishlist = function(productId, btnEl) {
            var product = productsData.find(function(p) { return p.id === productId; });
            if (!product) return;
            var favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
            var idx = -1;
            for (var i = 0; i < favorites.length; i++) { if (favorites[i].id === productId) { idx = i; break; } }
            var icon = btnEl && btnEl.querySelector ? btnEl.querySelector('.material-icons') : null;
            if (idx >= 0) {
                favorites.splice(idx, 1);
                localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
                if (btnEl) { btnEl.classList.remove('active'); if (icon) icon.textContent = 'favorite_border'; }
                window.showToast('Removed from wishlist');
            } else {
                favorites.push(product);
                localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
                if (btnEl) { btnEl.classList.add('active'); if (icon) icon.textContent = 'favorite'; }
                window.showToast('Added to wishlist!');
            }
        };
        window.addToFavorites = function(productId) {
            var btns = document.querySelectorAll('.wishlist-btn');
            var btn = null;
            for (var i = 0; i < btns.length; i++) {
                var c = btns[i].closest ? btns[i].closest('.product-card') : null;
                if (c && c.getAttribute('data-id') === productId) { btn = btns[i]; break; }
            }
            window.toggleWishlist(productId, btn);
        };
        function syncWishlistButtons() {
            var favorites = [];
            try { favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); } catch (e) {}
            var cards = document.querySelectorAll('.product-card');
            for (var i = 0; i < cards.length; i++) {
                var card = cards[i];
                var pid = card.getAttribute('data-id');
                if (!pid) continue;
                var inFav = false;
                for (var j = 0; j < favorites.length; j++) { if (favorites[j].id === pid) { inFav = true; break; } }
                var btn = card.querySelector('.wishlist-btn');
                var icon = btn ? btn.querySelector('.material-icons') : null;
                if (btn) {
                    if (inFav) { btn.classList.add('active'); if (icon) icon.textContent = 'favorite'; }
                    else { btn.classList.remove('active'); if (icon) icon.textContent = 'favorite_border'; }
                }
            }
        }
        
        // Cart helper functions
        function getSessionIdProd() {
            var sid = localStorage.getItem(SESSION_KEY_PROD);
            if (!sid) { sid = 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem(SESSION_KEY_PROD, sid); }
            return sid;
        }
        function syncCartProd(items) {
            if (!BUSINESS_ID_PROD) return;
            try {
                var user = null;
                try { user = JSON.parse(localStorage.getItem(USER_KEY_PROD) || 'null'); } catch(e) {}
                fetch(TRACK_CART_URL_PROD, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        businessId: BUSINESS_ID_PROD,
                        sessionId: getSessionIdProd(),
                        items: items,
                        customerName: user ? (user.name || user.displayName || 'Guest') : 'Guest',
                        customerEmail: user ? (user.email || null) : null,
                        customerPhone: user ? (user.phone || null) : null,
                        source: 'website'
                    })
                }).catch(function() {});
            } catch(e) {}
        }
        function getCart() {
            try {
                return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
            } catch {
                return [];
            }
        }
        
        function setCart(items) {
            localStorage.setItem(CART_KEY, JSON.stringify(items));
            updateCartCount();
            syncCartProd(items);
        }
        
        function updateCartCount() {
            var cart = getCart();
            var count = 0;
            try {
                for (var i = 0; i < cart.length; i++) { count += (cart[i].quantity || 1); }
            } catch (e) { count = 0; }
            document.querySelectorAll('.cart-count').forEach(function(el) {
                el.textContent = count > 9 ? '9+' : String(count);
                el.style.display = count > 0 ? 'flex' : 'none';
            });
        }
        
        function getFavorites() {
            try {
                return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
            } catch (e) {
                return [];
            }
        }
        
        function setFavorites(items) {
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            updateCartCount();
            syncWishlistButtons();
        });
    </script>
    `;
  } catch (error) {
    console.error('[generateProductsPageContent] Error:', error);
    const baseUrl = useCleanUrls ? '' : (siteId ? `/site/${siteId}` : '');
    const errPrimary = primaryColor || '#27491F';
    const errText = textColor || '#171817';
    return `
        <div style="text-align: center; padding: 80px 24px; background: ${backgroundColor || '#FFFFFF'}; color: ${errText};">
            <span class="material-icons" style="font-size: 80px; color: ${errPrimary}; opacity: 0.3; margin-bottom: 24px;">error_outline</span>
            <h2 style="font-size: 24px; font-weight: 900; text-transform: uppercase; margin-bottom: 8px;">ERROR LOADING PRODUCTS</h2>
            <p style="font-size: 14px; opacity: 0.8; margin-bottom: 32px;">Please try again later</p>
            <a href="${baseUrl || '/'}" style="display: inline-flex; align-items: center; gap: 12px; padding: 16px 32px; background: ${errPrimary}; color: white; text-decoration: none; font-size: 13px; font-weight: 700; text-transform: uppercase; border-radius: 12px;">
                BACK TO HOME
                <span class="material-icons">arrow_forward</span>
            </a>
        </div>
    `;
  }
}

/**
 * Cloud Function to serve published websites with custom domain support
 * This handles:
 * 1. Custom domain routing (e.g., mystore.com)
 * 2. Site ID based routing (e.g., /site/abc123)
 * 3. Short URL routing (e.g., /s/abc123)
 */
exports.serveWebsite = onRequest(
  { 
    cors: true, 
    maxInstances: 100,
    timeoutSeconds: 60,
    memory: '256MiB'
  },
  async (req, res) => {
  try {
    // Get hostname - check x-forwarded-host first (set by Firebase Hosting), then fall back to host header
    const forwardedHost = req.get('x-forwarded-host');
    const hostHeader = req.get('host') || '';
    const hostname = (forwardedHost || hostHeader).toLowerCase();
    const path = req.path;
    
    // Log all host-related headers for debugging
    console.log(`[serveWebsite] Request: hostname=${hostname}, path=${path}`);
    
    // Handle favicon.ico and other common static asset requests
    if (path === '/favicon.ico') {
      // Return a simple SVG favicon
      res.set('Content-Type', 'image/svg+xml');
      res.set('Cache-Control', 'public, max-age=86400');
      res.status(200).send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#2d4a27"/><text x="50" y="70" font-size="60" font-family="Arial" fill="white" text-anchor="middle">X</text></svg>`);
      return;
    }
    
    // Handle robots.txt with proper SEO rules
    console.log(`[serveWebsite] Checking path for robots.txt: ${path}`);
    if (path === '/robots.txt') {
      console.log('[serveWebsite] Serving robots.txt');
      const robotsTxt = `User-agent: *
Allow: /
Disallow: /site/
Disallow: /s/
Disallow: /*?*

# Sitemap
Sitemap: https://${hostname}/sitemap.xml

# Crawl-delay for politeness
Crawl-delay: 1
`;
      res.set('Content-Type', 'text/plain');
      res.set('Cache-Control', 'public, max-age=86400');
      res.status(200).send(robotsTxt);
      return;
    }
    
    // Handle sitemap.xml
    if (path === '/sitemap.xml') {
      // Generate basic sitemap
      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${hostname}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://${hostname}/products</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://${hostname}/about-us</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://${hostname}/faq</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://${hostname}/privacy-policy</loc>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://${hostname}/terms-of-service</loc>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>`;
      res.set('Content-Type', 'application/xml');
      res.set('Cache-Control', 'public, max-age=86400');
      res.status(200).send(sitemapXml);
      return;
    }
    
    console.log(`[serveWebsite] Request: hostname=${hostname}, path=${path}`);
    
    let siteId = null;
    let siteData = null;
    let businessId = null;

    // Method 1: Try to find site by custom domain first
    // This is the primary method for custom domains
    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
    const isKnownDomain = config.isDefaultDomain(hostname);
    const isCustomDomainAccess = !isKnownDomain && !isLocalhost;
    
    if (!isLocalhost && !isKnownDomain) {
      console.log(`[serveWebsite] Looking up custom domain: ${hostname}`);
      
      // First, check the customDomains collection directly (more reliable)
      const hostWithoutWww = hostname.replace(/^www\./, '');
      // Allow all statuses except 'none' - serve the site even during DNS setup
      const domainQuery = await db
        .collection('customDomains')
        .where('domain', '==', hostWithoutWww)
        .limit(1)
        .get();
      
      if (!domainQuery.empty) {
        const domainData = domainQuery.docs[0].data();
        console.log(`[serveWebsite] Found domain in customDomains: ${domainData.domain}, status: ${domainData.status}`);
        
        // Fetch the associated site
        const siteDoc = await db
          .collection('businesses')
          .doc(domainData.tenantId)
          .collection('published_sites')
          .doc(domainData.siteId)
          .get();
        
        if (siteDoc.exists) {
          const data = siteDoc.data();
          // Only serve if site is published
          if (data.status === 'published') {
            siteId = siteDoc.id;
            siteData = data;
            businessId = domainData.tenantId;
            console.log(`[serveWebsite] Found site by custom domain: ${siteId}, domain status: ${domainData.status}`);
          } else {
            console.log(`[serveWebsite] Site ${siteDoc.id} exists but status is ${data.status}, not published`);
          }
        }
      }
      
      // Fallback: Search sites directly if customDomains lookup failed
    if (!siteId) {
        console.log(`[serveWebsite] Fallback: searching published_sites directly`);
      const businessesSnapshot = await db.collection('businesses').get();
      
      for (const businessDoc of businessesSnapshot.docs) {
        const sitesSnapshot = await db
          .collection('businesses')
          .doc(businessDoc.id)
          .collection('published_sites')
            .where('customDomain', '==', hostWithoutWww)
            .limit(1)
          .get();

          if (!sitesSnapshot.empty) {
            const siteDoc = sitesSnapshot.docs[0];
            siteId = siteDoc.id;
            siteData = siteDoc.data();
            businessId = businessDoc.id;
            console.log(`[serveWebsite] Found site by published_sites lookup: ${siteId}`);
            break;
          }
        }
      }
    }

    // Method 2a: Resolve by brand slug (e.g. /my-store or /my-store/products/...) when on default domain
    if (!siteId && isKnownDomain) {
      const slugMatch = path.match(/^\/([a-z0-9-]+)(\/.*)?$/);
      const segment = slugMatch && slugMatch[1] ? slugMatch[1] : '';
      const reserved = ['site', 's'];
      if (segment && !reserved.includes(segment)) {
        try {
          const slugQuery = await db.collectionGroup('published_sites')
            .where('slug', '==', segment)
            .where('status', '==', 'published')
            .limit(1)
            .get();
          if (!slugQuery.empty) {
            const slugDoc = slugQuery.docs[0];
            siteId = slugDoc.id;
            businessId = slugDoc.ref.parent.parent.id;
            siteData = slugDoc.data();
            // Strip leading /segment so path becomes / or /products/... etc.
            path = (path.slice(segment.length + 1) || '/');
            console.log(`[serveWebsite] Resolved by slug "${segment}": siteId=${siteId}, path=${path}`);
          }
        } catch (slugErr) {
          console.log('[serveWebsite] Slug lookup failed:', slugErr.message);
        }
      }
    }

    // Method 2b: Extract siteId from path /site/xxx or /s/xxx if not found by slug
    if (!siteId) {
      const siteIdMatch = path.match(/^\/(site|s)\/([^\/]+)/);
      if (siteIdMatch) {
        siteId = siteIdMatch[2];
        console.log(`[serveWebsite] Extracted siteId from path: ${siteId}`);
      }
    }

    // Method 3: If still no siteId and on default domain, redirect to main site
    if (!siteId && !siteData) {
      // Could redirect to main marketing site or show a directory
      res.redirect(302, config.getDashboardUrl());
      return;
    }

    // Fetch site data if we have siteId but not siteData
    if (siteId && !siteData) {
      console.log(`[serveWebsite] Fetching site data for: ${siteId}`);
      const businessesSnapshot = await db.collection('businesses').get();
      
      for (const businessDoc of businessesSnapshot.docs) {
        try {
          const siteDoc = await db
            .collection('businesses')
            .doc(businessDoc.id)
            .collection('published_sites')
            .doc(siteId)
            .get();

          if (siteDoc.exists) {
            const data = siteDoc.data();
            if (data.status === 'published') {
              siteData = data;
              businessId = businessDoc.id;
              console.log(`[serveWebsite] Found site: ${siteId} in business: ${businessId}`);
              break;
            }
          }
        } catch (err) {
          continue;
        }
      }
    }

    // Site not found
    if (!siteData || !siteId) {
      console.log(`[serveWebsite] Site not found`);
      res.status(404).send(generateErrorPage('Website Not Found', 
        'The website you\'re looking for doesn\'t exist or isn\'t published yet.'));
      return;
    }

    // Check if site has a custom domain but is accessed via default URL
    // Redirect to custom domain for SEO
    if (siteData.customDomain && 
        siteData.domainStatus === 'active' && 
        (isKnownDomain || isLocalhost) &&
        path.includes('/site/')) {
      const redirectUrl = `https://${siteData.customDomain}${path.replace(/^\/site\/[^\/]+/, '')}`;
      console.log(`[serveWebsite] Redirecting to custom domain: ${redirectUrl}`);
      res.redirect(301, redirectUrl);
      return;
    }
    
    // IMPORTANT: If accessing custom domain with /site/xxx path, redirect to clean URL
    if (isCustomDomainAccess && path.includes('/site/')) {
      const cleanPath = path.replace(/^\/site\/[^\/]+/, '') || '/';
      console.log(`[serveWebsite] Redirecting /site/ path to clean URL: ${cleanPath}`);
      res.redirect(301, cleanPath);
      return;
    }

    // Get sections and generate HTML
    const sections = siteData.sections || [];
    const siteName = siteData.name || 'My Store';
    const settings = siteData.settings || {};
    
    // Fetch business currency for price formatting
    let currency = 'USD';
    let currencySymbol = '$';
    if (businessId) {
      try {
        const businessDoc = await db.collection('businesses').doc(businessId).get();
        if (businessDoc.exists) {
          const businessData = businessDoc.data();
          currency = businessData.currency || businessData.plan?.currency || 'USD';
          // Get currency symbol
          const currencySymbols = {
            'USD': '$', 'EUR': '€', 'GBP': '£', 'EGP': 'E£', 'AED': 'د.إ',
            'SAR': '﷼', 'KWD': 'د.ك', 'BHD': '.د.ب', 'QAR': 'ر.ق', 'OMR': 'ر.ع.'
          };
          currencySymbol = currencySymbols[currency] || currency + ' ';
        }
      } catch (err) {
        console.log('[serveWebsite] Could not fetch business currency, using default');
      }
    }
    settings.currency = currency;
    settings.currencySymbol = currencySymbol;

    // Check for individual product detail page first
    const productDetailMatch = path.match(/^\/(?:site\/[^\/]+\/)?products\/([^\/\?]+)(?:\/|\?|$)/i);
    if (productDetailMatch) {
      const productId = productDetailMatch[1];
      console.log(`[serveWebsite] Serving product detail page: ${productId} for site: ${siteId}`);
      
      const pageHtml = await generateProductDetailPageHTML(productId, siteId, siteName, settings, sections, businessId, isCustomDomainAccess);
      
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=300');
      res.set('Vary', 'Accept-Encoding');
      res.status(200).send(pageHtml);
      return;
    }

    // Check for sub-pages (cart, favorites, profile, policies, etc.)
    const subPageMatch = path.match(/\/(?:site\/[^\/]+)?\/?(cart|checkout|favorites|profile|products|login|register|order-success|about|about-us|privacy-policy|terms-of-service|faq|shipping-policy|return-policy)(?:\/|$)/i);
    if (subPageMatch) {
      let pageType = subPageMatch[1].toLowerCase();
      if (pageType === 'about') pageType = 'about-us';
      console.log(`[serveWebsite] Serving sub-page: ${pageType} for site: ${siteId}`);
      
      let queryParams = req.query || {};
      // Clean products URL: redirect if empty query params (e.g. ?collection=&sort=price-high -> ?sort=price-high)
      if (pageType === 'products' && queryParams.collection === '') {
        const cleaned = { ...queryParams };
        delete cleaned.collection;
        const search = new URLSearchParams(cleaned).toString();
        const redirectPath = path.replace(/\?.*$/, '') + (search ? '?' + search : '');
        res.redirect(302, redirectPath);
        return;
      }
      // On custom domain: redirect /products?collection=ID to /collection-slug for clean URL
      if (pageType === 'products' && queryParams.collection && isCustomDomainAccess && businessId) {
        try {
          const collDoc = await db.collection('businesses').doc(businessId).collection('collections').doc(queryParams.collection).get();
          if (collDoc.exists) {
            const name = (collDoc.data() || {}).name || '';
            const slug = generateSlug(name);
            if (slug) {
              const cleaned = { ...queryParams };
              delete cleaned.collection;
              const search = new URLSearchParams(cleaned).toString();
              const redirectPath = '/' + slug + (search ? '?' + search : '');
              res.redirect(302, redirectPath);
              return;
            }
          }
        } catch (err) {
          console.log('[serveWebsite] Collection lookup for redirect failed:', err.message);
        }
      }
      const pageHtml = await generateSubPageHTML(pageType, siteId, siteName, settings, sections, businessId, queryParams, isCustomDomainAccess);
      
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=300');
      res.set('Vary', 'Accept-Encoding');
      res.status(200).send(pageHtml);
      return;
    }

    // On custom domain: single path segment may be a collection slug (e.g. /summer-collection)
    const reservedPages = ['cart', 'checkout', 'favorites', 'profile', 'products', 'login', 'register', 'about-us', 'privacy-policy', 'terms-of-service', 'faq', 'shipping-policy', 'return-policy'];
    const pathOnly = path.replace(/\?.*$/, '').replace(/^\/+/, '') || '';
    const pathSegments = pathOnly.split('/').filter(Boolean);
    if (isCustomDomainAccess && pathSegments.length === 1 && businessId && !reservedPages.includes(pathSegments[0].toLowerCase())) {
      const segment = pathSegments[0];
      try {
        const collectionsSnapshot = await db.collection('businesses').doc(businessId).collection('collections').get();
        let collectionIdBySlug = null;
        collectionsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const name = data.name || '';
          if (generateSlug(name) === segment) {
            collectionIdBySlug = doc.id;
          }
        });
        if (collectionIdBySlug) {
          const queryParams = { ...(req.query || {}), collection: collectionIdBySlug };
          const pageHtml = await generateSubPageHTML('products', siteId, siteName, settings, sections, businessId, queryParams, true);
          res.set('Content-Type', 'text/html; charset=utf-8');
          res.set('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=300');
          res.set('Vary', 'Accept-Encoding');
          res.status(200).send(pageHtml);
          return;
        }
      } catch (err) {
        console.log('[serveWebsite] Collection-by-slug lookup failed:', err.message);
      }
    }

    if (sections.length === 0) {
      res.status(200).send(generateEmptyPage(siteName));
      return;
    }

    // Fetch fresh product data to enrich sections with current pricing
    let enrichedSections = sections;
    if (businessId) {
      try {
        const productsSnapshot = await db.collection('businesses').doc(businessId).collection('products').get();
        const productsMap = {};
        productsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          productsMap[doc.id] = {
            id: doc.id,
            name: data.name,
            price: data.price,
            sellingPrice: data.sellingPrice || data.price,
            onSale: data.onSale || false,
            salePrice: data.salePrice,
            compareAtPrice: data.compareAtPrice || data.sellingPrice || data.price,
            image: data.images?.[0] || data.image || '',
            description: data.description || ''
          };
        });
        
        // Enrich sections that have selectedProducts
        enrichedSections = sections.map(section => {
          if ((section.type === 'products' || section.type === 'deals') && section.data?.selectedProducts) {
            const enrichedProducts = section.data.selectedProducts.map(product => {
              const freshData = productsMap[product.id];
              if (freshData) {
                return {
                  ...product,
                  sellingPrice: freshData.sellingPrice,
                  onSale: freshData.onSale,
                  salePrice: freshData.salePrice,
                  compareAtPrice: freshData.compareAtPrice
                };
              }
              return product;
            });
            return {
              ...section,
              data: {
                ...section.data,
                selectedProducts: enrichedProducts
              }
            };
          }
          return section;
        });
        console.log('[serveWebsite] Enriched sections with fresh product pricing');
      } catch (err) {
        console.log('[serveWebsite] Could not enrich product pricing, using stored data:', err.message);
      }
    }

    // Generate the website HTML
    // Use the actual hostname when accessed via custom domain, otherwise use stored customDomain
    // isCustomDomainAccess defined earlier
    const resolvedCustomDomain = isCustomDomainAccess ? hostname : siteData.customDomain;
    // IMPORTANT: Support the builder schema (sections use {data/style/order}) as well as legacy schemas.
    const looksLikeBuilderSchema =
      Array.isArray(enrichedSections) &&
      enrichedSections.length > 0 &&
      typeof enrichedSections[0] === 'object' &&
      enrichedSections[0] !== null &&
      ('data' in enrichedSections[0] || 'style' in enrichedSections[0] || 'order' in enrichedSections[0]);

    const html = looksLikeBuilderSchema
      ? exportBuilderWebsiteToHTML(enrichedSections, siteName, settings, siteId, isCustomDomainAccess, businessId)
      : generateWebsiteHTML(enrichedSections, siteName, settings, siteId, businessId, resolvedCustomDomain, hostname);

    // Set appropriate headers - NO CACHE for instant updates
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'SAMEORIGIN');
    
    setPerformanceHeaders(res, 300); // Cache for 5 minutes
    res.status(200).send(html);
    
  } catch (error) {
    console.error('[serveWebsite] Error:', error);
    res.status(500).send(generateErrorPage('Error Loading Website', 
      'An error occurred while loading the website. Please try again later.'));
  }
});
