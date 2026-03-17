import type { ISite, ISection, ISiteSettings } from '../../../schemas/site.schema';

/* ──────────────────────────────────────────────────────────────────
   Minimal inline CSS (no CDN, no Tailwind build step needed)
   ~3 KB — covers layout primitives and the 20 section types
────────────────────────────────────────────────────────────────── */
const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --c-primary:#27491F;--c-secondary:#F0CAE1;--c-accent:#f59e0b;
  --c-bg:#ffffff;--c-text:#171817;
  --ff:Inter,system-ui,sans-serif;--br:8px;
}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{font-family:var(--ff);background:var(--c-bg);color:var(--c-text);line-height:1.6}
img{max-width:100%;height:auto;display:block}
a{color:var(--c-primary);text-decoration:none}
a:hover{text-decoration:underline}
.container{max-width:1200px;margin:0 auto;padding:0 1.25rem}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;
  padding:.75rem 1.75rem;border-radius:var(--br);font-weight:600;cursor:pointer;
  border:2px solid transparent;transition:opacity .2s,transform .1s}
.btn:active{transform:scale(.98)}
.btn-primary{background:var(--c-primary);color:#fff}
.btn-primary:hover{opacity:.88}
.btn-secondary{background:transparent;border-color:var(--c-primary);color:var(--c-primary)}
.btn-secondary:hover{background:var(--c-primary);color:#fff}
.grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:2rem}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:2rem}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem}
@media(max-width:768px){.grid2,.grid3,.grid4{grid-template-columns:1fr}}
section{padding:5rem 0}
/* announcement bar */
.announce-bar{background:var(--c-primary);color:#fff;text-align:center;padding:.6rem 1rem;font-size:.9rem;position:relative}
.announce-bar a{color:#fff;text-decoration:underline}
.announce-bar .close{position:absolute;right:1rem;top:50%;transform:translateY(-50%);background:none;border:none;color:#fff;font-size:1.2rem;cursor:pointer;line-height:1}
/* hero */
.hero{min-height:92vh;display:flex;align-items:center;position:relative;overflow:hidden}
.hero-overlay{position:absolute;inset:0;background:rgba(0,0,0,.45);z-index:1}
.hero-bg{position:absolute;inset:0;object-fit:cover;width:100%;height:100%;z-index:0}
.hero-content{position:relative;z-index:2;color:#fff;text-align:center;padding:2rem 1rem}
.hero-content h1{font-size:clamp(2rem,5vw,4rem);font-weight:800;line-height:1.15;margin-bottom:1rem}
.hero-content p{font-size:1.2rem;max-width:600px;margin:0 auto 2rem}
/* video hero */
.video-hero{position:relative;min-height:92vh;overflow:hidden;display:flex;align-items:center}
.video-hero iframe,.video-hero video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;z-index:0}
.video-hero .video-overlay{position:absolute;inset:0;background:rgba(0,0,0,.55);z-index:1}
.video-hero .video-content{position:relative;z-index:2;color:#fff;text-align:center;padding:2rem 1rem}
.video-hero .video-content h1{font-size:clamp(2rem,5vw,3.5rem);font-weight:800;margin-bottom:1rem}
/* about / split */
.split{display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center}
.split.reverse{direction:rtl}.split.reverse>*{direction:ltr}
@media(max-width:768px){.split{grid-template-columns:1fr}}
.split img{border-radius:var(--br);width:100%;aspect-ratio:4/3;object-fit:cover}
.split-text h2{font-size:2rem;font-weight:700;margin-bottom:1rem;color:var(--c-primary)}
.split-text p{margin-bottom:1.5rem;opacity:.8}
/* services / features */
.card{background:#f9f9f9;border-radius:var(--br);padding:2rem;text-align:center}
.card h3{font-size:1.2rem;font-weight:700;margin-bottom:.75rem;color:var(--c-primary)}
.card .icon{font-size:2.5rem;margin-bottom:1rem}
/* gallery */
.gallery-grid{columns:3;gap:1rem}
.gallery-grid img{width:100%;margin-bottom:1rem;border-radius:var(--br);break-inside:avoid}
@media(max-width:768px){.gallery-grid{columns:1}}
/* testimonials */
.testimonial-card{background:#f9f9f9;border-radius:var(--br);padding:2rem}
.testimonial-card blockquote{font-style:italic;margin-bottom:1rem;opacity:.8}
.testimonial-card .author{font-weight:700;color:var(--c-primary)}
.stars{color:#f59e0b;letter-spacing:.1rem;margin-bottom:.5rem}
/* pricing */
.pricing-card{border:2px solid #e5e7eb;border-radius:var(--br);padding:2.5rem;text-align:center;transition:border-color .2s}
.pricing-card.featured{border-color:var(--c-primary)}
.pricing-card .price{font-size:3rem;font-weight:800;color:var(--c-primary)}
.pricing-card .price span{font-size:1rem;font-weight:400;opacity:.6}
.pricing-card ul{list-style:none;margin:1.5rem 0;text-align:left}
.pricing-card ul li::before{content:"✓ ";color:var(--c-primary);font-weight:700}
/* FAQ */
details.faq-item{border-bottom:1px solid #e5e7eb;padding:1rem 0}
details.faq-item summary{font-weight:600;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center}
details.faq-item summary::after{content:"+";font-size:1.5rem;color:var(--c-primary)}
details.faq-item[open] summary::after{content:"−"}
details.faq-item p{margin-top:1rem;opacity:.8}
/* contact */
.contact-form{max-width:640px;margin:0 auto}
.contact-form input,.contact-form textarea{width:100%;padding:.875rem 1rem;border:1.5px solid #d1d5db;border-radius:var(--br);font-family:inherit;font-size:1rem;margin-bottom:1rem;transition:border-color .2s}
.contact-form input:focus,.contact-form textarea:focus{outline:none;border-color:var(--c-primary)}
.contact-form textarea{min-height:140px;resize:vertical}
/* countdown */
.countdown{display:flex;justify-content:center;gap:1.5rem;text-align:center}
.countdown-block{background:var(--c-primary);color:#fff;border-radius:var(--br);padding:1.5rem 2rem;min-width:100px}
.countdown-block .num{font-size:3rem;font-weight:800;line-height:1}
.countdown-block .lbl{font-size:.8rem;opacity:.7;text-transform:uppercase;letter-spacing:.1em}
/* newsletter */
.newsletter-form{display:flex;gap:.75rem;max-width:480px;margin:1.5rem auto 0}
.newsletter-form input{flex:1;padding:.875rem 1rem;border:1.5px solid #d1d5db;border-radius:var(--br);font-size:1rem}
@media(max-width:480px){.newsletter-form{flex-direction:column}}
/* social links */
.social-links{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}
.social-link{display:flex;align-items:center;gap:.5rem;padding:.6rem 1.2rem;border-radius:2rem;font-weight:600;font-size:.9rem;transition:opacity .2s;color:#fff}
.social-link:hover{opacity:.85;text-decoration:none}
.social-ig{background:linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)}
.social-tt{background:#000}
.social-fb{background:#1877f2}
.social-x{background:#000}
.social-wa{background:#25d366}
/* map */
.map-embed iframe{width:100%;height:420px;border:0;border-radius:var(--br)}
/* section headings */
.section-header{text-align:center;margin-bottom:3rem}
.section-header h2{font-size:2.25rem;font-weight:800;color:var(--c-primary);margin-bottom:.75rem}
.section-header p{opacity:.7;max-width:580px;margin:0 auto}
/* team */
.team-card img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:50%;margin-bottom:1rem}
.team-card{text-align:center}
.team-card h3{font-weight:700;margin-bottom:.25rem}
.team-card .role{opacity:.6;font-size:.9rem}
/* products */
.product-card{border:1px solid #e5e7eb;border-radius:var(--br);overflow:hidden;transition:box-shadow .2s}
.product-card:hover{box-shadow:0 4px 24px rgba(0,0,0,.1)}
.product-card img{width:100%;aspect-ratio:4/3;object-fit:cover}
.product-card-body{padding:1rem}
.product-card-body h3{font-weight:700;margin-bottom:.25rem}
.product-card-body .price{color:var(--c-primary);font-weight:800;font-size:1.1rem}
/* footer */
footer{background:var(--c-primary);color:#fff;padding:3rem 0 1.5rem}
footer a{color:rgba(255,255,255,.7)}
footer a:hover{color:#fff}
`;

/* ── Section renderers ─────────────────────────────────────────── */
/* ── Custom CSS sanitizer ──────────────────────────────────────────────
   Strips dangerous CSS constructs without requiring an external parser.
   Dangerous patterns removed:
     - expression(...)  → IE-era remote code execution
     - javascript: URLs → XSS via url()
     - @import          → cross-origin CSS injection
     - behavior:        → IE-era HTC attachment
   If input is empty or non-string, returns ''.
───────────────────────────────────────────────────────────────────── */
function sanitizeCss(raw: unknown): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/expression\s*\([^)]*\)/gi, '/* removed */')
    .replace(/javascript\s*:/gi, '/* removed */')
    .replace(/@import\b[^;]*/gi, '/* removed */')
    .replace(/behavior\s*:/gi, '/* removed: behavior */');
}

function attr(value: unknown, fallback = ''): string {
  if (value == null || value === '') return fallback;
  return String(value).replace(/"/g, '&quot;');
}
function txt(value: unknown, fallback = ''): string {
  if (value == null || value === '') return fallback;
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ── Analytics script generator ───────────────────────────────── */
function buildAnalyticsHead(analytics: ISiteSettings['analytics']): string {
  if (!analytics) return '';
  const parts: string[] = [];

  // ── Google Analytics 4 ─────────────────────────────────────────
  // Use JSON.stringify for IDs injected into JS string context to prevent
  // XSS via crafted values like  ');alert(1);//
  if (analytics.ga4MeasurementId) {
    const gid    = JSON.stringify(String(analytics.ga4MeasurementId));
    const gidUrl = attr(analytics.ga4MeasurementId); // for URL attribute
    parts.push(`<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${gidUrl}"></script>
<script>
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments)}
gtag('js',new Date());
gtag('config',${gid},{anonymize_ip:true,cookie_flags:'SameSite=None;Secure'});
</script>`);
  }

  // ── Google Ads conversion ───────────────────────────────────────
  if (analytics.googleAdsId && !analytics.ga4MeasurementId) {
    const aid    = JSON.stringify(String(analytics.googleAdsId));
    const aidUrl = attr(analytics.googleAdsId);
    parts.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${aidUrl}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config',${aid});</script>`);
  }

  // ── Meta (Facebook) Pixel ──────────────────────────────────────
  if (analytics.metaPixelId) {
    const pid    = JSON.stringify(String(analytics.metaPixelId));
    const pidRaw = attr(analytics.metaPixelId);
    parts.push(`<!-- Meta Pixel -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init',${pid});
fbq('track','PageView');
</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pidRaw}&ev=PageView&noscript=1"/></noscript>`);
  }

  // ── Snapchat Pixel ─────────────────────────────────────────────
  if (analytics.snapchatPixelId) {
    const spid = JSON.stringify(String(analytics.snapchatPixelId));
    parts.push(`<!-- Snapchat Pixel -->
<script>
(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
a.queue=[];var s='script';r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];
u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');
snaptr('init',${spid});
snaptr('track','PAGE_VIEW');
</script>`);
  }

  // ── TikTok Pixel ───────────────────────────────────────────────
  if (analytics.tiktokPixelId) {
    const ttid = JSON.stringify(String(analytics.tiktokPixelId));
    parts.push(`<!-- TikTok Pixel -->
<script>
!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie'],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i='https://analytics.tiktok.com/i18n/pixel/events.js';ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement('script');o.type='text/javascript',o.async=!0,o.src=i+'?sdkid='+e+'&lib='+t;var a=document.getElementsByTagName('script')[0];a.parentNode.insertBefore(o,a)};
ttq.load(${ttid});ttq.page();}(window,document,'ttq');
</script>`);
  }

  return parts.join('\n');
}

/* ── Storefront interaction tracker (inline, <4 KB) ─────────────────── */
const STOREFRONT_TRACKER_JS = `
(function(){
  /* ── Unified xdTrack helper ────────────────────────────────── */
  window.xdTrack = function(event, params) {
    params = params || {};
    /* GA4 */
    if (typeof gtag !== 'undefined') {
      gtag('event', event, params);
    }
    /* Meta Pixel mapping */
    if (typeof fbq !== 'undefined') {
      var pixelMap = {
        'view_item':      ['ViewContent', {content_ids:[params.item_id||''],content_type:'product',value:params.value||0,currency:params.currency||'SAR'}],
        'add_to_cart':    ['AddToCart',   {content_ids:[params.item_id||''],value:params.value||0,currency:params.currency||'SAR'}],
        'begin_checkout': ['InitiateCheckout', {value:params.value||0,currency:params.currency||'SAR'}],
        'purchase':       ['Purchase',    {value:params.value||0,currency:params.currency||'SAR'}],
        'search':         ['Search',      {search_string:params.search_term||''}]
      };
      if (pixelMap[event]) fbq('track', pixelMap[event][0], pixelMap[event][1]);
    }
    /* Snapchat */
    if (typeof snaptr !== 'undefined') {
      var snapMap = {'view_item':'VIEW_CONTENT','add_to_cart':'ADD_CART','begin_checkout':'START_CHECKOUT','purchase':'PURCHASE'};
      if (snapMap[event]) snaptr('track', snapMap[event]);
    }
    /* TikTok */
    if (typeof ttq !== 'undefined') {
      var ttMap = {'view_item':'ViewContent','add_to_cart':'AddToCart','begin_checkout':'InitiateCheckout','purchase':'CompletePayment'};
      if (ttMap[event]) ttq.track(ttMap[event]);
    }
  };

  /* ── Auto product impression via IntersectionObserver ─────── */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) {
          var el = e.target;
          window.xdTrack('view_item_list', {
            item_list_name: el.dataset.xdSection || 'section',
            currency: document.documentElement.dataset.xdCurrency || 'SAR'
          });
          io.unobserve(el);
        }
      });
    }, {threshold: 0.3});
    document.querySelectorAll('[data-xd-track="impression"]').forEach(function(el){io.observe(el);});
  }

  /* ── Add-to-cart button clicks ─────────────────────────────── */
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-xd-atc]');
    if (!btn) return;
    window.xdTrack('add_to_cart', {
      item_id: btn.dataset.xdProductId || '',
      item_name: btn.dataset.xdProductName || '',
      value: parseFloat(btn.dataset.xdPrice || '0'),
      currency: document.documentElement.dataset.xdCurrency || 'SAR'
    });
  });

  /* ── Announcement bar dismiss ──────────────────────────────── */
  document.querySelectorAll('.announce-bar .close').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var bar = btn.closest('.announce-bar');
      if (bar) { bar.style.display = 'none'; }
    });
  });

  /* ── Mobile menu toggle ────────────────────────────────────── */
  var mobileToggle = document.querySelector('.xd-mobile-menu-toggle');
  var mobileMenu   = document.querySelector('.xd-mobile-menu');
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', function() {
      var open = mobileMenu.getAttribute('aria-hidden') !== 'false';
      mobileMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
      mobileMenu.style.display = open ? 'block' : 'none';
      mobileToggle.setAttribute('aria-expanded', String(open));
    });
  }
})();
`;

function renderSection(sec: ISection): string {
  const c = sec.content as Record<string, unknown>;
  const bg = (sec.style as Record<string, unknown>).backgroundColor as string || '';
  const styleAttr = bg ? ` style="background:${attr(bg)}"` : '';

  switch (sec.type) {
    case 'announcement': {
      if (!(c.enabled as boolean)) return '';
      const link = c.link as string;
      return `
<div class="announce-bar" id="announce-bar">
  ${link ? `<a href="${attr(link)}" target="_blank" rel="noopener">` : ''}${txt(c.text, 'Welcome to our store!')}${link ? '</a>' : ''}
  ${c.dismissible !== false ? '<button class="close" onclick="this.parentElement.remove()" aria-label="Close">×</button>' : ''}
</div>`;
    }

    case 'hero': return `
<section class="hero"${styleAttr}>
  ${c.backgroundImage ? `<img class="hero-bg" src="${attr(c.backgroundImage)}" alt="" loading="eager" decoding="async">` : ''}
  <div class="hero-overlay"></div>
  <div class="hero-content container">
    <h1>${txt(c.headline, 'Welcome to Our Store')}</h1>
    <p>${txt(c.subheadline, 'Discover amazing products crafted for you.')}</p>
    <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap">
      ${c.buttonText ? `<a class="btn btn-primary" href="${attr(c.buttonLink, '#')}">${txt(c.buttonText)}</a>` : ''}
      ${c.secondaryButtonText ? `<a class="btn btn-secondary" style="border-color:#fff;color:#fff" href="${attr(c.secondaryButtonLink, '#')}">${txt(c.secondaryButtonText)}</a>` : ''}
    </div>
  </div>
</section>`;

    case 'video_hero': {
      const url = c.videoUrl as string || '';
      const embed = url.includes('youtube') || url.includes('youtu.be')
        ? `<iframe src="${url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}?autoplay=1&mute=1&loop=1&playlist=${url.split('v=')[1]}" frameborder="0" allow="autoplay" allowfullscreen loading="lazy"></iframe>`
        : url ? `<video autoplay muted loop playsinline src="${attr(url)}"></video>` : '';
      return `
<section class="video-hero"${styleAttr}>
  ${embed}
  <div class="video-overlay"></div>
  <div class="video-content container">
    <h1>${txt(c.headline, 'Experience the Difference')}</h1>
    <p>${txt(c.subheadline, '')}</p>
    ${c.buttonText ? `<a class="btn btn-primary" href="${attr(c.buttonLink, '#')}">${txt(c.buttonText)}</a>` : ''}
  </div>
</section>`;
    }

    case 'about':
    case 'split_media': {
      const reverse = c.imagePosition === 'right' ? ' reverse' : '';
      return `
<section${styleAttr}><div class="container"><div class="split${reverse}">
  <img src="${attr(c.image, 'https://placehold.co/600x450/27491F/fff?text=Image')}" alt="${attr(c.imageAlt, '')}" loading="lazy" decoding="async">
  <div class="split-text">
    <h2>${txt(c.headline, 'Our Story')}</h2>
    <p>${txt(c.body, 'Tell your story here.')}</p>
    ${c.buttonText ? `<a class="btn btn-primary" href="${attr(c.buttonLink, '#')}">${txt(c.buttonText)}</a>` : ''}
  </div>
</div></div></section>`;
    }

    case 'services':
    case 'features': {
      const items = (c.items as Array<Record<string,string>> || []);
      return `
<section${styleAttr}><div class="container">
  <div class="section-header"><h2>${txt(c.headline, 'Our Services')}</h2><p>${txt(c.subheadline, '')}</p></div>
  <div class="grid${items.length <= 2 ? '2' : items.length === 4 ? '4' : '3'}">
    ${items.map(item => `
    <div class="card">
      ${item.icon ? `<div class="icon">${txt(item.icon)}</div>` : ''}
      <h3>${txt(item.title, 'Service')}</h3>
      <p>${txt(item.description, '')}</p>
    </div>`).join('')}
  </div>
</div></section>`;
    }

    case 'gallery': {
      const images = (c.images as string[] || []);
      return `
<section${styleAttr}><div class="container">
  <div class="section-header"><h2>${txt(c.headline, 'Gallery')}</h2></div>
  <div class="gallery-grid">
    ${images.map(img => `<img src="${attr(img)}" alt="" loading="lazy" decoding="async">`).join('')}
  </div>
</div></section>`;
    }

    case 'testimonials': {
      const items = (c.items as Array<Record<string,unknown>> || []);
      return `
<section${styleAttr}><div class="container">
  <div class="section-header"><h2>${txt(c.headline, 'What Our Customers Say')}</h2></div>
  <div class="grid${items.length >= 3 ? '3' : '2'}">
    ${items.map(t => `
    <div class="testimonial-card">
      <div class="stars">${'★'.repeat(Number(t.rating) || 5)}</div>
      <blockquote>"${txt(t.text)}"</blockquote>
      <p class="author">— ${txt(t.name)}</p>
    </div>`).join('')}
  </div>
</div></section>`;
    }

    case 'pricing': {
      const plans = (c.plans as Array<Record<string,unknown>> || []);
      return `
<section${styleAttr}><div class="container">
  <div class="section-header"><h2>${txt(c.headline, 'Pricing')}</h2><p>${txt(c.subheadline, '')}</p></div>
  <div class="grid${plans.length === 2 ? '2' : '3'}" style="align-items:start">
    ${plans.map(p => `
    <div class="pricing-card${p.featured ? ' featured' : ''}">
      <h3>${txt(p.name, 'Plan')}</h3>
      <div class="price">${txt(p.price, '0')}<span>/${txt(p.period, 'mo')}</span></div>
      <p style="margin:1rem 0;opacity:.7">${txt(p.description, '')}</p>
      <ul>${(p.features as string[] || []).map(f => `<li>${txt(f)}</li>`).join('')}</ul>
      <a class="btn btn-primary" style="width:100%;margin-top:1.5rem" href="${attr(p.link, '#')}">${txt(p.cta, 'Get Started')}</a>
    </div>`).join('')}
  </div>
</div></section>`;
    }

    case 'team': {
      const members = (c.members as Array<Record<string,string>> || []);
      return `
<section${styleAttr}><div class="container">
  <div class="section-header"><h2>${txt(c.headline, 'Meet the Team')}</h2></div>
  <div class="grid${members.length <= 2 ? '2' : members.length === 4 ? '4' : '3'}">
    ${members.map(m => `
    <div class="team-card">
      <img src="${attr(m.photo, 'https://placehold.co/200/27491F/fff?text=Photo')}" alt="${attr(m.name)}" loading="lazy">
      <h3>${txt(m.name)}</h3>
      <p class="role">${txt(m.role)}</p>
    </div>`).join('')}
  </div>
</div></section>`;
    }

    case 'faq': {
      const items = (c.items as Array<Record<string,string>> || []);
      return `
<section${styleAttr}><div class="container" style="max-width:720px">
  <div class="section-header"><h2>${txt(c.headline, 'Frequently Asked Questions')}</h2></div>
  ${items.map((q, i) => `
  <details class="faq-item"${i === 0 ? ' open' : ''}>
    <summary>${txt(q.question)}</summary>
    <p>${txt(q.answer)}</p>
  </details>`).join('')}
</div></section>`;
    }

    case 'contact': return `
<section${styleAttr}><div class="container">
  <div class="section-header"><h2>${txt(c.headline, 'Get in Touch')}</h2><p>${txt(c.subheadline, '')}</p></div>
  <form class="contact-form" onsubmit="return false">
    <input type="text" name="name" placeholder="Your Name" required>
    <input type="email" name="email" placeholder="Email Address" required>
    ${c.showPhone ? `<input type="tel" name="phone" placeholder="Phone Number">` : ''}
    <textarea name="message" placeholder="${attr(c.placeholder, 'How can we help you?')}"></textarea>
    <button class="btn btn-primary" type="submit" style="width:100%">${txt(c.buttonText, 'Send Message')}</button>
  </form>
</div></section>`;

    case 'newsletter': return `
<section style="background:var(--c-primary);color:#fff${styleAttr ? ';' + styleAttr.slice(8,-1) : ''}">
  <div class="container" style="text-align:center">
    <h2 style="font-size:2rem;margin-bottom:.75rem">${txt(c.headline, 'Stay in the Loop')}</h2>
    <p style="opacity:.8;margin-bottom:1.5rem">${txt(c.subheadline, 'Subscribe for updates and exclusive offers.')}</p>
    <form class="newsletter-form" onsubmit="return false" style="margin:0 auto">
      <input type="email" placeholder="${attr(c.placeholder, 'Enter your email')}" required style="border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.1);color:#fff">
      <button class="btn" style="background:#fff;color:var(--c-primary)">${txt(c.buttonText, 'Subscribe')}</button>
    </form>
  </div>
</section>`;

    case 'countdown': {
      const target = c.targetDate as string || new Date(Date.now() + 7 * 86400000).toISOString();
      return `
<section${styleAttr}><div class="container" style="text-align:center">
  <div class="section-header"><h2>${txt(c.headline, 'Coming Soon')}</h2><p>${txt(c.subheadline, '')}</p></div>
  <div class="countdown" id="cd-${sec.id}">
    <div class="countdown-block"><div class="num" id="cd-days-${sec.id}">00</div><div class="lbl">Days</div></div>
    <div class="countdown-block"><div class="num" id="cd-hours-${sec.id}">00</div><div class="lbl">Hours</div></div>
    <div class="countdown-block"><div class="num" id="cd-mins-${sec.id}">00</div><div class="lbl">Minutes</div></div>
    <div class="countdown-block"><div class="num" id="cd-secs-${sec.id}">00</div><div class="lbl">Seconds</div></div>
  </div>
  <script>
  (function(){var t=new Date("${attr(target)}").getTime();function u(){var n=t-Date.now(),d=Math.floor(n/86400000),h=Math.floor(n%86400000/3600000),m=Math.floor(n%3600000/60000),s=Math.floor(n%60000/1000);if(n<0){clearInterval(i);return;}document.getElementById("cd-days-${sec.id}").textContent=String(d).padStart(2,"0");document.getElementById("cd-hours-${sec.id}").textContent=String(h).padStart(2,"0");document.getElementById("cd-mins-${sec.id}").textContent=String(m).padStart(2,"0");document.getElementById("cd-secs-${sec.id}").textContent=String(s).padStart(2,"0");}u();var i=setInterval(u,1000);}())
  </script>
</div></section>`;
    }

    case 'map': {
      const embed = c.embedUrl as string || '';
      const address = c.address as string || '';
      const mapSrc = embed || `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
      return `
<section${styleAttr}><div class="container">
  ${c.headline ? `<div class="section-header"><h2>${txt(c.headline)}</h2></div>` : ''}
  <div class="map-embed"><iframe src="${attr(mapSrc)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Location map"></iframe></div>
</div></section>`;
    }

    case 'social_links': {
      const links = c.links as Array<{platform:string;url:string}> || [];
      const icons: Record<string,string> = {instagram:'📷',tiktok:'🎵',facebook:'👥',x:'✕',twitter:'✕',whatsapp:'💬',youtube:'▶️',linkedin:'💼'};
      const classes: Record<string,string> = {instagram:'social-ig',tiktok:'social-tt',facebook:'social-fb',x:'social-x',twitter:'social-x',whatsapp:'social-wa'};
      return `
<section${styleAttr}><div class="container" style="text-align:center">
  ${c.headline ? `<div class="section-header"><h2>${txt(c.headline)}</h2></div>` : ''}
  <div class="social-links">
    ${links.map(l => `<a class="social-link ${classes[l.platform.toLowerCase()] || ''}" href="${attr(l.url)}" target="_blank" rel="noopener noreferrer">${icons[l.platform.toLowerCase()] || '🔗'} ${l.platform}</a>`).join('')}
  </div>
</div></section>`;
    }

    case 'products': {
      const prods = (c.products as Array<Record<string,unknown>> || []);
      return `
<section${styleAttr}><div class="container">
  <div class="section-header"><h2>${txt(c.headline, 'Featured Products')}</h2></div>
  <div class="grid${prods.length <= 2 ? '2' : '3'}">
    ${prods.map(p => `
    <div class="product-card">
      <img src="${attr(p.image as string, 'https://placehold.co/400x300/f0f0f0/888?text=Product')}" alt="${attr(p.name as string)}" loading="lazy">
      <div class="product-card-body">
        <h3>${txt(p.name)}</h3>
        <p style="opacity:.7;font-size:.9rem;margin-bottom:.5rem">${txt(p.description)}</p>
        <div class="price">${txt(p.price)}</div>
        ${p.link ? `<a class="btn btn-primary" href="${attr(p.link as string)}" style="margin-top:1rem;width:100%">${txt(p.buttonText as string, 'Buy Now')}</a>` : ''}
      </div>
    </div>`).join('')}
  </div>
</div></section>`;
    }

    default: return `<!-- section type "${txt(sec.type)}" not renderable -->`;
  }
}

/* ── Announcement section helper ─────────────────────────────── */
function findAnnouncement(sections: ISection[]): ISection | undefined {
  return sections.find(s => s.type === 'announcement');
}

/* ── Main render function ─────────────────────────────────────── */
export function renderSite(site: ISite, pageSlug?: string): string {
  const { settings, name } = site;
  const globalSeo = settings?.seo || {};
  const theme     = settings?.theme     || {};
  const analytics = settings?.analytics;
  const settingsAny = settings as unknown as Record<string, unknown>;
  const customCss   = sanitizeCss(settingsAny?.customCss);
  // customJs is intentionally NOT rendered — XSS risk; merchant JS is
  // sanitised and stored but served only via a Content Security Policy
  // compliant mechanism in a future phase.
  const customJs    = '';
  const currency  = 'SAR'; // TODO: pull from business settings

  // ── Resolve which page to render ────────────────────────────────
  // pageSlug === undefined or 'home' → use flat site.sections (legacy + default)
  // pageSlug === something → look up site.pages by slug
  let activeSections = site.sections || [];
  let pageSeo: Record<string, string> = {};

  if (pageSlug && pageSlug !== 'home' && site.pages?.length) {
    const page = site.pages.find(p => p.slug === pageSlug);
    if (page) {
      activeSections = page.sections?.length ? page.sections : site.sections;
      pageSeo = (page.seo || {}) as Record<string, string>;
    }
  }

  // Merge SEO: page-level takes priority over site-level
  const seo = {
    title:       pageSeo.title       || globalSeo.title       || '',
    description: pageSeo.description || globalSeo.description || '',
    ogImage:     pageSeo.ogImage     || globalSeo.ogImage     || '',
    keywords:    globalSeo.keywords  || [],
    canonical:   pageSeo.canonical   || '',
  };

  // ── CSS variables per merchant theme ────────────────────────────
  const themeVars = `
:root{
  --c-primary:${attr(theme.primaryColor, '#27491F')};
  --c-secondary:${attr(theme.secondaryColor, '#F0CAE1')};
  --c-accent:${attr(theme.accentColor, '#f59e0b')};
  --c-bg:${attr(theme.backgroundColor, '#ffffff')};
  --c-text:${attr(theme.textColor, '#171817')};
  --ff:${attr(theme.fontFamily, 'Inter')},system-ui,sans-serif;
  --br:${theme.borderRadius === 'sharp' ? '0px' : theme.borderRadius === 'pill' ? '9999px' : '8px'};
}`;

  // ── Google Fonts ─────────────────────────────────────────────────
  const fontFamily = (theme.fontFamily || 'Inter').replace(/ /g, '+');
  const fontLink = fontFamily !== 'Inter'
    ? `<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=${fontFamily}:wght@400;500;600;700;800&display=swap" onload="this.rel='stylesheet'">
<noscript><link href="https://fonts.googleapis.com/css2?family=${fontFamily}:wght@400;500;600;700;800&display=swap" rel="stylesheet"></noscript>`
    : '';

  // ── Sections ─────────────────────────────────────────────────────
  const annSec         = findAnnouncement(activeSections);
  const hasAnnouncement = annSec && (annSec.content as Record<string,unknown>).enabled;
  const bodySections    = activeSections
    .filter(s => !s.hidden && s.type !== 'announcement')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(renderSection)
    .join('\n');

  // ── Analytics ───────────────────────────────────────────────────
  const analyticsHead = buildAnalyticsHead(analytics);

  // ── SEO / meta ──────────────────────────────────────────────────
  const ogImage  = seo.ogImage || '';
  const pageTitle = txt(seo.title || name);
  const siteName  = txt(name);

  // ── JSON-LD structured data ─────────────────────────────────────
  const jsonLd = JSON.stringify({
    '@context':   'https://schema.org',
    '@type':      'WebSite',
    name:         siteName,
    description:  txt(seo.description || ''),
    ...(seo.keywords?.length ? { keywords: seo.keywords.join(', ') } : {}),
  });

  return `<!DOCTYPE html>
<html lang="en" data-xd-currency="${currency}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="index,follow">
<title>${pageTitle} | ${siteName}</title>
<meta name="description" content="${attr(seo.description || '')}">
${seo.keywords?.length ? `<meta name="keywords" content="${attr(seo.keywords.join(', '))}">` : ''}
<link rel="canonical" href="${attr(seo.canonical || site.publicUrl || site.url || '')}">
<!-- Open Graph -->
<meta property="og:type"        content="website">
<meta property="og:site_name"   content="${attr(name)}">
<meta property="og:title"       content="${attr(seo.title || name)}">
<meta property="og:description" content="${attr(seo.description || '')}">
${ogImage ? `<meta property="og:image" content="${attr(ogImage)}">
<meta property="og:image:width"  content="1200">
<meta property="og:image:height" content="630">` : ''}
<!-- Twitter Card -->
<meta name="twitter:card"        content="${ogImage ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title"       content="${attr(seo.title || name)}">
<meta name="twitter:description" content="${attr(seo.description || '')}">
${ogImage ? `<meta name="twitter:image" content="${attr(ogImage)}">` : ''}
<!-- Structured Data -->
<script type="application/ld+json">${jsonLd}</script>
<!-- Performance hints -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fontLink}
<!-- Analytics (head) -->
${analyticsHead}
<!-- Theme + Base Styles -->
<style>${themeVars}${BASE_CSS}${customCss ? '\n/* Merchant custom CSS */\n' + customCss : ''}</style>
</head>
<body>
${hasAnnouncement ? renderSection(annSec!) : ''}
${bodySections}
<!-- Storefront Interaction Tracker -->
<script>${STOREFRONT_TRACKER_JS}</script>
${customJs ? `<!-- Merchant custom JS -->\n<script>${customJs}</script>` : ''}
</body>
</html>`;
}
