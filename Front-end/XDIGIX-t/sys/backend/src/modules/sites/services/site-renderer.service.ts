import type { ISite, ISection, ISiteSettings } from '../../../schemas/site.schema';
import { STOREFRONT_RUNTIME_JS } from '../storefront-runtime';
import { buildSectionManifestEntry } from '../../../registry/serverSectionRegistry';

/**
 * Set by renderSite before rendering sections — gives sub-functions access to the
 * storefront base path (e.g. "/my-store" or "/site/abc123") without threading it
 * through every render-function signature.
 */
let _sfBase = '';
let _themeData: Record<string, unknown> = {};

/* ── Color Scheme support ────────────────────────────────────────── */
interface ColorScheme {
  id: string;
  name: string;
  background: string;
  backgroundGradient: string;
  text: string;
  solidButtonBg: string;
  solidButtonLabel: string;
  outlineButton: string;
  shadow: string;
}

const DEFAULT_COLOR_SCHEMES: ColorScheme[] = [
  { id: 'scheme-1', name: 'Scheme 1', background: '#FFFFFF', backgroundGradient: '', text: '#121212', solidButtonBg: '#121212', solidButtonLabel: '#FFFFFF', outlineButton: '#121212', shadow: '#121212' },
  { id: 'scheme-2', name: 'Scheme 2', background: '#F3F3F3', backgroundGradient: '', text: '#121212', solidButtonBg: '#121212', solidButtonLabel: '#FFFFFF', outlineButton: '#121212', shadow: '#121212' },
  { id: 'scheme-3', name: 'Scheme 3', background: '#242833', backgroundGradient: '', text: '#FFFFFF', solidButtonBg: '#FFFFFF', solidButtonLabel: '#000000', outlineButton: '#FFFFFF', shadow: '#121212' },
  { id: 'scheme-4', name: 'Scheme 4', background: '#121212', backgroundGradient: '', text: '#FFFFFF', solidButtonBg: '#FFFFFF', solidButtonLabel: '#121212', outlineButton: '#FFFFFF', shadow: '#121212' },
  { id: 'scheme-5', name: 'Scheme 5', background: '#3B3F8C', backgroundGradient: '', text: '#FFFFFF', solidButtonBg: '#FFFFFF', solidButtonLabel: '#3B3F8C', outlineButton: '#FFFFFF', shadow: '#121212' },
];

/** Set by renderSite — resolved color schemes for the current site */
let _colorSchemes: ColorScheme[] = DEFAULT_COLOR_SCHEMES;
/** Set by renderSite — button border-radius from theme */
let _btnRadius = '8px';

/* ─────────────────────────────────────────────────────────────────────
   UTILITY HELPERS
───────────────────────────────────────────────────────────────────── */

/** Escape a value for use inside an HTML attribute. */
function attr(value: unknown, fallback = ''): string {
  if (value == null || value === '') return fallback;
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Escape a value for safe HTML text content. */
function txt(value: unknown, fallback = ''): string {
  if (value == null || value === '') return fallback;
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Sanitize merchant-supplied CSS — strips known XSS vectors. */
function sanitizeCss(raw: unknown): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/expression\s*\([^)]*\)/gi, '/* removed */')
    .replace(/javascript\s*:/gi,          '/* removed */')
    .replace(/@import\b[^;]*/gi,          '/* removed */')
    .replace(/behavior\s*:/gi,            '/* removed: behavior */');
}

/**
 * Resolve section payload.
 * Prefers the new `data` field (written by the React builder),
 * falls back to the legacy `content` field.
 */
function getSectionData(sec: ISection): Record<string, unknown> {
  const d = sec.data as Record<string, unknown> | undefined | null;
  if (d && typeof d === 'object' && Object.keys(d).length > 0) return d;
  const c = (sec as unknown as Record<string, unknown>).content as Record<string, unknown> | undefined | null;
  if (c && typeof c === 'object') return c;
  return {};
}

/** Build star SVGs for ratings (1–5). */
function stars(count: number): string {
  const n = Math.min(5, Math.max(0, Math.round(count)));
  return Array.from({ length: 5 }, (_, i) =>
    `<svg class="star${i < n ? ' star--filled' : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`
  ).join('');
}

/** Convert a YouTube / Vimeo URL to a privacy-enhanced embed URL. */
function buildEmbedUrl(url: string, autoplay = false): string {
  if (!url) return '';
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  if (ytMatch) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0${autoplay ? '&autoplay=1&mute=1' : ''}`;
  }
  const vmMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vmMatch) {
    return `https://player.vimeo.com/video/${vmMatch[1]}?dnt=1${autoplay ? '&autoplay=1&muted=1' : ''}`;
  }
  return url;
}

/* ─────────────────────────────────────────────────────────────────────
   ANALYTICS SNIPPETS
───────────────────────────────────────────────────────────────────── */
function buildAnalyticsHead(analytics: ISiteSettings['analytics']): string {
  if (!analytics) return '';
  const parts: string[] = [];

  if (analytics.ga4MeasurementId) {
    const gid    = JSON.stringify(String(analytics.ga4MeasurementId));
    const gidUrl = attr(analytics.ga4MeasurementId);
    parts.push(`<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${gidUrl}"></script>
<script>
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments)}
gtag('js',new Date());
gtag('config',${gid},{anonymize_ip:true,cookie_flags:'SameSite=None;Secure'});
</script>`);
  }

  if (analytics.googleAdsId && !analytics.ga4MeasurementId) {
    const aid    = JSON.stringify(String(analytics.googleAdsId));
    const aidUrl = attr(analytics.googleAdsId);
    parts.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${aidUrl}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config',${aid});</script>`);
  }

  if (analytics.metaPixelId) {
    const pid    = JSON.stringify(String(analytics.metaPixelId));
    const pidRaw = attr(analytics.metaPixelId);
    parts.push(`<!-- Meta Pixel -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init',${pid});fbq('track','PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id=${pidRaw}&ev=PageView&noscript=1"/></noscript>`);
  }

  if (analytics.snapchatPixelId) {
    const spid = JSON.stringify(String(analytics.snapchatPixelId));
    parts.push(`<!-- Snapchat Pixel -->
<script>
(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
a.queue=[];var s='script';r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];
u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');
snaptr('init',${spid});snaptr('track','PAGE_VIEW');
</script>`);
  }

  if (analytics.tiktokPixelId) {
    const ttid = JSON.stringify(String(analytics.tiktokPixelId));
    parts.push(`<!-- TikTok Pixel -->
<script>
!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie'];
ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
ttq.load=function(e){var i='https://analytics.tiktok.com/i18n/pixel/events.js';ttq._i=ttq._i||{},ttq._i[e]=[],ttq._t=ttq._t||{},ttq._t[e]=+new Date;
var o=document.createElement('script');o.async=!0;o.src=i+'?sdkid='+e+'&lib='+t;var a=document.getElementsByTagName('script')[0];a.parentNode.insertBefore(o,a)};
ttq.load(${ttid});ttq.page();}(window,document,'ttq');
</script>`);
  }

  return parts.join('\n');
}

/* ─────────────────────────────────────────────────────────────────────
   BASE CSS  — mobile-first, zero external dependencies, ~5 KB inline
───────────────────────────────────────────────────────────────────── */
const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{font-family:var(--ff);background:var(--c-bg);color:var(--c-text);line-height:1.65;-webkit-font-smoothing:antialiased}
img,video{max-width:100%;height:auto;display:block}
a{color:inherit;text-decoration:none}
button{cursor:pointer;font-family:inherit}
ul,ol{list-style:none}
:focus-visible{outline:3px solid var(--c-primary);outline-offset:3px}
.xd-container{max-width:1200px;margin-inline:auto;padding-inline:clamp(1rem,4vw,2rem)}
.xd-section{padding-block:clamp(3rem,7vw,6rem)}
.xd-grid-2{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,380px),1fr));gap:2rem}
.xd-grid-3{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:2rem}
.xd-grid-4{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr));gap:1.5rem}
.xd-flex{display:flex;gap:1rem;flex-wrap:wrap;align-items:center}
.xd-flex-center{display:flex;gap:1rem;flex-wrap:wrap;align-items:center;justify-content:center}
.xd-h1{font-size:clamp(2rem,5vw,3.75rem);font-weight:800;line-height:1.15;letter-spacing:-.02em}
.xd-h2{font-size:clamp(1.6rem,3.5vw,2.5rem);font-weight:700;line-height:1.2;color:var(--c-primary)}
.xd-h3{font-size:clamp(1.1rem,2vw,1.4rem);font-weight:700;line-height:1.3}
.xd-lead{font-size:clamp(1rem,2vw,1.2rem);opacity:.8;max-width:620px}
.xd-section-head{text-align:center;margin-bottom:clamp(2rem,5vw,4rem)}
.xd-section-head .xd-h2{margin-bottom:.75rem}
.xd-section-head .xd-lead{margin-inline:auto}
.xd-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;
  padding:var(--btn-padding,.75rem 1.5rem);border-radius:var(--br);font-weight:600;font-size:1rem;
  box-shadow:var(--btn-shadow,none);border:2px solid transparent;transition:all .25s;text-decoration:none;white-space:nowrap;cursor:pointer}
.xd-btn:active{transform:scale(.97)}
.xd-btn-primary{background:var(--c-primary);color:#fff;border-color:var(--c-primary)}
.xd-btn-primary:hover{filter:brightness(1.12)}
.xd-btn-secondary{background:transparent;border-color:var(--c-primary);color:var(--c-primary)}
.xd-btn-secondary:hover{background:var(--c-primary);color:#fff}
.xd-btn-white{background:#fff;color:var(--c-primary)}
.xd-btn-white:hover{background:rgba(255,255,255,.88)}
.xd-btn-outline-white{background:transparent;color:#fff;border-color:rgba(255,255,255,.7)}
.xd-btn-outline-white:hover{background:#fff;color:var(--c-primary)}
.xd-btn-sm{padding:.5rem 1.25rem;font-size:.875rem}
.xd-btn-full{width:100%;display:flex}
.xd-announce{background:var(--scheme-bg,var(--c-primary));color:var(--scheme-text,#fff);text-align:center;
  padding:.6rem 3rem;font-size:.9rem;font-weight:500;position:relative;z-index:100}
.xd-announce a{color:inherit;text-decoration:underline}
.xd-announce-close{position:absolute;right:1rem;top:50%;translate:0 -50%;
  background:none;border:none;color:inherit;font-size:1.4rem;line-height:1;padding:.25rem .5rem}
.xd-nav{position:relative;z-index:90;display:flex;align-items:center;
  justify-content:space-between;gap:1rem;padding:.875rem clamp(1rem,4vw,2rem)}
.xd-nav-sticky{position:sticky;top:0;backdrop-filter:blur(12px)}
.xd-nav-logo{font-size:1.25rem;font-weight:800;display:flex;align-items:center;gap:.5rem;flex-shrink:0}
.xd-nav-logo img{height:40px;width:auto;object-fit:contain}
.xd-nav-menu{display:flex;align-items:center;gap:.25rem}
.xd-nav-menu a{padding:.5rem .875rem;border-radius:6px;font-size:.95rem;font-weight:500;
  transition:background .2s;display:block;white-space:nowrap}
.xd-nav-menu a:hover{background:rgba(0,0,0,.07)}
.xd-nav-actions{display:flex;align-items:center;gap:.5rem}
.xd-nav-icon{background:none;border:none;padding:.5rem;border-radius:6px;
  display:flex;align-items:center;gap:.375rem;font-size:.875rem;font-weight:600;
  transition:background .2s;position:relative;text-decoration:none}
.xd-nav-icon:hover{background:rgba(0,0,0,.07)}
.xd-nav-badge{position:absolute;top:2px;right:2px;min-width:18px;height:18px;
  border-radius:9px;background:var(--c-primary);color:#fff;font-size:.7rem;
  font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px}
.xd-mobile-toggle{display:none;background:none;border:none;padding:.5rem;font-size:1.5rem}
.xd-mobile-menu{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200}
.xd-mobile-menu-inner{position:absolute;right:0;top:0;bottom:0;width:min(320px,85vw);
  background:#fff;overflow-y:auto;padding:1.5rem}
.xd-mobile-menu-close{float:right;background:none;border:none;font-size:1.75rem;line-height:1}
.xd-mobile-nav-links{margin-top:2.5rem;display:flex;flex-direction:column}
.xd-mobile-nav-links a{display:block;padding:.875rem 0;border-bottom:1px solid #f0f0f0;
  font-size:1.05rem;font-weight:500;color:#171817}
@media(max-width:768px){.xd-nav-menu{display:none}.xd-mobile-toggle{display:flex}}
.xd-hero{position:relative;overflow:hidden;display:flex;align-items:center}
.xd-hero-full{min-height:100svh}
.xd-hero-large{min-height:min(92vh,780px)}
.xd-hero-medium{min-height:min(70vh,560px)}
.xd-hero-compact{min-height:min(48vh,380px)}
.xd-hero-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
.xd-hero-overlay{position:absolute;inset:0;z-index:1}
.xd-hero-content{position:relative;z-index:2;width:100%;padding:clamp(2rem,6vw,5rem) 0}
.xd-hero-inner{max-width:700px}
.xd-hero-center .xd-hero-inner{margin-inline:auto;text-align:center}
.xd-hero-inner .xd-h1{margin-bottom:1.25rem}
.xd-hero-inner .xd-lead{margin-bottom:2rem}
.xd-hero-split{display:grid;grid-template-columns:1fr 1fr;align-items:center}
.xd-hero-split-text{padding:clamp(2rem,6vw,5rem) clamp(1rem,4vw,2rem)}
.xd-hero-split-img{overflow:hidden;height:100%;min-height:min(80vh,680px)}
.xd-hero-split-img img{width:100%;height:100%;object-fit:cover}
@media(max-width:768px){.xd-hero-split{grid-template-columns:1fr}.xd-hero-split-img{aspect-ratio:16/9;min-height:unset}}
.xd-feature-card{background:#fff;border-radius:var(--br);border:1px solid #e5e7eb;
  padding:2rem;text-align:center;transition:box-shadow .25s,translate .25s}
.xd-feature-card:hover{box-shadow:0 8px 24px rgba(0,0,0,.08);translate:0 -2px}
.xd-feature-icon{width:56px;height:56px;border-radius:12px;
  background:color-mix(in srgb,var(--c-primary) 12%,transparent);
  display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;font-size:1.75rem}
.xd-feature-icon .material-icons{font-size:1.75rem;color:var(--c-primary)}
.xd-feature-card h3{font-size:1.1rem;font-weight:700;color:var(--c-primary);margin-bottom:.5rem}
.xd-feature-card p{font-size:.95rem;opacity:.75;line-height:1.6}
.xd-product-card{background:#fff;border-radius:var(--br);border:1px solid #e5e7eb;overflow:hidden;
  display:flex;flex-direction:column;transition:box-shadow .25s,translate .25s}
.xd-product-card:hover{box-shadow:0 12px 32px rgba(0,0,0,.1);translate:0 -3px}
.xd-product-img-wrap{position:relative;overflow:hidden;background:#f9f9f9}
.xd-product-img-wrap img{width:100%;aspect-ratio:1;object-fit:cover;transition:scale .4s}
.xd-product-card:hover .xd-product-img-wrap img{scale:1.05}
.xd-product-badge{position:absolute;top:.75rem;left:.75rem;background:#ef4444;color:#fff;
  font-size:.75rem;font-weight:700;padding:.25rem .625rem;border-radius:999px}
.xd-badge-sold-out{background:#6b7280}
.xd-btn-disabled{background:#d1d5db;color:#6b7280;cursor:not-allowed}
.xd-product-body{padding:1rem;flex:1;display:flex;flex-direction:column;gap:.5rem}
.xd-product-name{font-weight:600;font-size:.95rem;line-height:1.4;flex:1}
.xd-product-price{font-weight:800;color:var(--c-primary);font-size:1.1rem}
.xd-product-compare{text-decoration:line-through;opacity:.5;font-size:.875rem;margin-left:.5rem}
.xd-product-btn{margin-top:.5rem;padding:.625rem;font-size:.875rem;border-radius:8px}
@keyframes xd-pulse{0%,100%{opacity:1}50%{opacity:.45}}
.xd-skel{pointer-events:none}
.xd-skel-img{aspect-ratio:1;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200%;animation:xd-pulse 1.5s ease-in-out infinite}
.xd-skel-line{height:.85rem;background:#f0f0f0;border-radius:4px;margin-bottom:.5rem;animation:xd-pulse 1.5s ease-in-out infinite}
.xd-skel-btn{height:2.2rem;background:#f0f0f0;border-radius:8px;margin-top:.5rem;animation:xd-pulse 1.5s ease-in-out infinite}
.xd-testimonial-card{background:#fff;border-radius:var(--br);border:1px solid #e5e7eb;
  padding:1.75rem;display:flex;flex-direction:column;gap:1rem}
.xd-stars{display:flex;gap:2px}
.star{width:18px;height:18px;fill:none;stroke:#d1d5db;stroke-width:1.5}
.star--filled{fill:#f59e0b;stroke:#f59e0b}
.xd-testimonial-text{font-style:italic;opacity:.8;flex:1;line-height:1.7}
.xd-testimonial-author{display:flex;align-items:center;gap:.75rem}
.xd-testimonial-author img{width:44px;height:44px;border-radius:50%;object-fit:cover}
.xd-testimonial-author-info strong{display:block;font-weight:700;font-size:.95rem}
.xd-testimonial-author-info span{font-size:.8rem;opacity:.6}
.xd-gallery-grid{columns:3 240px;gap:1rem}
.xd-gallery-item{break-inside:avoid;margin-bottom:1rem;border-radius:var(--br);overflow:hidden;cursor:pointer}
.xd-gallery-item img{width:100%;display:block;transition:scale .4s}
.xd-gallery-item:hover img{scale:1.04}
.xd-lightbox{display:none;position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:1000;
  align-items:center;justify-content:center;padding:1rem}
.xd-lightbox.xd-open{display:flex}
.xd-lightbox img{max-width:90vw;max-height:90vh;border-radius:var(--br);object-fit:contain}
.xd-lightbox-close{position:absolute;top:1rem;right:1rem;background:rgba(255,255,255,.15);
  border:none;color:#fff;font-size:2rem;width:48px;height:48px;border-radius:50%;
  display:flex;align-items:center;justify-content:center}
.xd-pricing-card{border:2px solid #e5e7eb;border-radius:var(--br);padding:2.25rem;
  text-align:center;display:flex;flex-direction:column;gap:1rem;
  transition:border-color .25s,box-shadow .25s}
.xd-pricing-card.featured{border-color:var(--c-primary);
  box-shadow:0 0 0 4px color-mix(in srgb,var(--c-primary) 10%,transparent)}
.xd-pricing-badge{background:var(--c-primary);color:#fff;font-size:.75rem;font-weight:700;
  padding:.25rem .875rem;border-radius:999px;display:inline-block;margin-bottom:.5rem}
.xd-pricing-price{font-size:3rem;font-weight:800;color:var(--c-primary);line-height:1}
.xd-pricing-period{font-size:.95rem;opacity:.6;font-weight:400}
.xd-pricing-features{list-style:none;text-align:left;display:flex;flex-direction:column;gap:.625rem;flex:1}
.xd-pricing-features li{display:flex;align-items:flex-start;gap:.5rem;font-size:.95rem;line-height:1.4}
.xd-pricing-features li::before{content:"\u2713";color:var(--c-primary);font-weight:800;flex-shrink:0;margin-top:.1em}
.xd-faq-item{border-bottom:1px solid #e5e7eb}
.xd-faq-item summary{list-style:none;display:flex;justify-content:space-between;align-items:center;
  padding:1.25rem 0;font-weight:600;cursor:pointer;gap:1rem;font-size:1rem}
.xd-faq-item summary::-webkit-details-marker{display:none}
.xd-faq-chevron{flex-shrink:0;width:24px;height:24px;border-radius:50%;
  background:color-mix(in srgb,var(--c-primary) 10%,transparent);
  display:flex;align-items:center;justify-content:center;transition:rotate .3s}
.xd-faq-item[open] .xd-faq-chevron{rotate:180deg;background:var(--c-primary)}
.xd-faq-item[open] .xd-faq-chevron svg{stroke:#fff}
.xd-faq-answer{padding-bottom:1.25rem;opacity:.8;line-height:1.7;font-size:.97rem}
.xd-stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:2rem}
.xd-stat-card{text-align:center;padding:1.75rem 1rem}
.xd-stat-icon .material-icons{font-size:2rem;color:var(--c-primary);margin-bottom:.75rem;display:block}
.xd-stat-value{font-size:clamp(2rem,4vw,3rem);font-weight:800;color:var(--c-primary);line-height:1}
.xd-stat-label{font-size:.9rem;opacity:.7;margin-top:.375rem}
.xd-team-card{text-align:center}
.xd-team-img{width:130px;height:130px;border-radius:50%;object-fit:cover;
  margin:0 auto 1.25rem;border:4px solid color-mix(in srgb,var(--c-primary) 15%,transparent)}
.xd-service-card{display:flex;gap:1.25rem;align-items:flex-start;padding:1.5rem;
  border-radius:var(--br);border:1px solid #e5e7eb;transition:box-shadow .25s}
.xd-service-card:hover{box-shadow:0 8px 24px rgba(0,0,0,.08)}
.xd-service-icon{width:48px;height:48px;border-radius:10px;flex-shrink:0;
  background:color-mix(in srgb,var(--c-primary) 12%,transparent);
  display:flex;align-items:center;justify-content:center}
.xd-service-icon .material-icons{font-size:1.5rem;color:var(--c-primary)}
.xd-service-body h3{font-weight:700;margin-bottom:.375rem}
.xd-service-body p{font-size:.9rem;opacity:.75}
.xd-video-wrap{position:relative;padding-bottom:56.25%;height:0;overflow:hidden;
  border-radius:var(--br);background:#000}
.xd-video-wrap iframe,.xd-video-wrap video{position:absolute;inset:0;width:100%;height:100%;border:0}
.xd-video-thumb{position:absolute;inset:0;cursor:pointer;display:flex;align-items:center;justify-content:center}
.xd-video-thumb img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}
.xd-video-play-btn{position:relative;z-index:1;width:72px;height:72px;border-radius:50%;
  background:rgba(255,255,255,.92);border:none;display:flex;align-items:center;
  justify-content:center;transition:scale .2s,background .2s}
.xd-video-play-btn:hover{scale:1.1;background:#fff}
.xd-video-play-btn svg{fill:var(--c-primary);margin-left:4px}
.xd-countdown{display:flex;gap:clamp(.75rem,2vw,1.5rem);justify-content:center;flex-wrap:wrap}
.xd-countdown-block{background:rgba(255,255,255,.12);border-radius:var(--br);
  padding:clamp(1rem,3vw,1.75rem) clamp(1.25rem,4vw,2.5rem);text-align:center;min-width:90px}
.xd-countdown-num{font-size:clamp(2rem,5vw,3.5rem);font-weight:800;line-height:1;display:block}
.xd-countdown-lbl{font-size:.75rem;opacity:.7;text-transform:uppercase;letter-spacing:.08em;margin-top:.375rem;display:block}
.xd-newsletter-form{display:flex;gap:.75rem;max-width:480px;margin:2rem auto 0;flex-wrap:wrap}
.xd-newsletter-input{flex:1 1 200px;padding:.875rem 1rem;border:none;border-radius:var(--br);
  font-size:1rem;font-family:inherit;min-width:0}
.xd-newsletter-input:focus{outline:3px solid rgba(255,255,255,.5)}
.xd-newsletter-success{font-weight:600;font-size:1.1rem;margin-top:1.5rem}
.xd-partners-wrap{display:flex;flex-wrap:wrap;gap:3rem;align-items:center;justify-content:center}
.xd-partner-logo{max-height:50px;max-width:140px;object-fit:contain;
  opacity:.6;filter:grayscale(100%);transition:opacity .2s,filter .2s}
.xd-partner-logo:hover{opacity:1;filter:none}
.xd-input{padding:.875rem 1rem;border:1.5px solid #d1d5db;border-radius:var(--br);
  font-size:1rem;font-family:inherit;width:100%;transition:border-color .2s;background:#fff}
.xd-input:focus{outline:none;border-color:var(--c-primary)}
.xd-textarea{min-height:140px;resize:vertical}
.xd-contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:start}
@media(max-width:768px){.xd-contact-grid{grid-template-columns:1fr}}
.xd-contact-info{display:flex;flex-direction:column;gap:1.25rem}
.xd-contact-info-item{display:flex;gap:.875rem;align-items:flex-start}
.xd-contact-info-icon{width:40px;height:40px;border-radius:8px;flex-shrink:0;
  background:color-mix(in srgb,var(--c-primary) 10%,transparent);
  display:flex;align-items:center;justify-content:center}
.xd-contact-info-icon .material-icons{font-size:1.2rem;color:var(--c-primary)}
.xd-form-success{color:var(--c-primary);font-weight:600;font-size:1.05rem;display:none}
.xd-form-success.xd-show{display:block}
.xd-comparison{position:relative;overflow:hidden;border-radius:var(--br);cursor:ew-resize;user-select:none}
.xd-comparison-before,.xd-comparison-clip{position:absolute;inset:0}
.xd-comparison-before img,.xd-comparison-clip img{width:100%;height:100%;object-fit:cover}
.xd-comparison-clip{overflow:hidden}
.xd-comparison-handle{position:absolute;top:0;bottom:0;width:3px;background:#fff;
  cursor:ew-resize;z-index:10;translate:-50% 0}
.xd-comparison-handle::after{content:'';position:absolute;top:50%;left:50%;
  translate:-50% -50%;width:36px;height:36px;border-radius:50%;background:#fff;
  box-shadow:0 2px 8px rgba(0,0,0,.25)}
.xd-comparison-label{position:absolute;top:.75rem;padding:.25rem .75rem;
  border-radius:999px;font-size:.8rem;font-weight:700;background:rgba(0,0,0,.55);color:#fff;z-index:5}
.xd-cta{padding:clamp(3rem,7vw,5rem) 0;text-align:center}
.xd-cta .xd-h2{margin-bottom:.75rem}
.xd-split{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2rem,6vw,5rem);align-items:center}
.xd-split.reverse{direction:rtl}.xd-split.reverse>*{direction:ltr}
@media(max-width:768px){.xd-split{grid-template-columns:1fr}}
.xd-split-img{border-radius:var(--br);width:100%;aspect-ratio:4/3;object-fit:cover}
.xd-footer{padding:clamp(2.5rem,6vw,5rem) 0 1.5rem}
.xd-footer-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:2.5rem;
  margin-bottom:clamp(2rem,4vw,3rem)}
.xd-footer-col-title{font-weight:700;font-size:.8rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:1rem;opacity:.45}
.xd-footer-links{display:flex;flex-direction:column;gap:.625rem}
.xd-footer-links a{font-size:.9rem;opacity:.7;transition:opacity .2s}
.xd-footer-links a:hover{opacity:1}
.xd-footer-bottom{border-top:1px solid rgba(255,255,255,.1);padding-top:1.5rem;
  display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem}
.xd-footer-social{display:flex;gap:.625rem}
.xd-footer-social-btn{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;transition:opacity .2s;opacity:.75;font-size:.75rem;font-weight:700;text-decoration:none}
.xd-footer-social-btn:hover{opacity:1}
.xd-footer-minimal{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:1.5rem;padding:1.5rem 0}
.xd-footer-policy{display:flex;flex-wrap:wrap;gap:1.25rem}
.xd-footer-policy a{font-size:.875rem;opacity:.7;transition:opacity .2s}
.xd-footer-policy a:hover{opacity:1}
@media(prefers-reduced-motion:no-preference){
  .xd-reveal{opacity:0;translate:0 24px;transition:opacity .6s ease,translate .6s ease}
  .xd-reveal.xd-visible{opacity:1;translate:0 0}
  .xd-reveal-fade-in{opacity:0;transition:opacity .6s ease}
  .xd-reveal-fade-in.xd-visible{opacity:1}
  .xd-reveal-slide-left{opacity:0;translate:-40px 0;transition:opacity .6s ease,translate .6s ease}
  .xd-reveal-slide-left.xd-visible{opacity:1;translate:0 0}
  .xd-reveal-slide-right{opacity:0;translate:40px 0;transition:opacity .6s ease,translate .6s ease}
  .xd-reveal-slide-right.xd-visible{opacity:1;translate:0 0}
  .xd-reveal-zoom-in{opacity:0;scale:.92;transition:opacity .6s ease,scale .6s ease}
  .xd-reveal-zoom-in.xd-visible{opacity:1;scale:1}
}
`;

/* ─────────────────────────────────────────────────────────────────────
   RUNTIME JS — imported from storefront-runtime.ts
   (live data hydration, analytics auto-wiring, cart management)
───────────────────────────────────────────────────────────────────── */
// STOREFRONT_RUNTIME_JS is imported at the top of this file

/* ─────────────────────────────────────────────────────────────────────
   SECTION RENDERERS
───────────────────────────────────────────────────────────────────── */

function renderBanner(c: Record<string, unknown>): string {
  // Support both flat text and blocks (items array) with multiple announcements
  const items = (c.items as Array<Record<string, unknown>>) || [];
  const announcements: Array<{ text: string; link?: string }> = [];

  if (items.length > 0) {
    for (const item of items) {
      const t = (item.text as string) || '';
      if (t) announcements.push({ text: t, link: item.link as string });
    }
  }
  if (announcements.length === 0 && c.text) {
    announcements.push({ text: c.text as string, link: c.link as string });
  }
  if (announcements.length === 0) return '';

  const dismissBtn = c.dismissible !== false ? `<button class="xd-announce-close" aria-label="Dismiss">×</button>` : '';

  if (announcements.length === 1) {
    const a = announcements[0];
    return `
<div class="xd-announce" role="alert">
  ${a.link
    ? `<a href="${attr(a.link)}">${txt(a.text)}${c.linkText ? ` &nbsp;→&nbsp; ${txt(c.linkText as string)}` : ''}</a>`
    : txt(a.text)}
  ${dismissBtn}
</div>`;
  }

  // Multiple announcements — render as marquee-like or cycling
  const inner = announcements.map(a => a.link
    ? `<a href="${attr(a.link)}">${txt(a.text)}</a>`
    : `<span>${txt(a.text)}</span>`
  ).join('<span style="margin:0 2rem;opacity:.3">•</span>');
  return `
<div class="xd-announce" role="alert">
  <div class="xd-announce-scroll">${inner}</div>
  ${dismissBtn}
</div>`;
}

function renderNavbar(c: Record<string, unknown>): string {
  const menuItems = (c.menuItems as Array<Record<string, unknown>>) || [];
  // Navbar keeps its own bg/text colors (not purely scheme-driven) since it's a unique section
  const bgColor   = attr(c.backgroundColor as string || '');
  const txtColor  = attr(c.textColor        as string || '');
  const sticky    = c.sticky !== false;

  const clrAttr = txtColor ? ` style="color:${txtColor}"` : '';
  const menuHtml = menuItems.map(item => {
    const href = attr((item.url as string) || (item.link as string) || '#');
    return `<li><a href="${href}"${clrAttr}>${txt(item.label as string)}${item.badge ? ` <span style="background:var(--c-primary);color:#fff;font-size:.7rem;padding:.1rem .4rem;border-radius:999px">${txt(item.badge as string)}</span>` : ''}</a></li>`;
  }).join('');

  const mobileHtml = menuItems.map(item => {
    const href = attr((item.url as string) || (item.link as string) || '#');
    return `<a href="${href}">${txt(item.label as string)}</a>`;
  }).join('');

  // Icon URLs — default to storefront-relative paths (using _sfBase for /site/:id prefix)
  const cartUrl     = attr(c.cartUrl as string || `${_sfBase}/cart`);
  const wishlistUrl = attr(c.wishlistUrl as string || `${_sfBase}/favorites`);
  const userIconUrl = attr(c.userIconUrl as string || `${_sfBase}/account`);

  // SVG icons
  const searchSvg   = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>';
  const cartSvg     = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
  const wishlistSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  const userSvg     = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const menuSvg     = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';

  return `
<header${bgColor ? ` style="background:${bgColor}"` : ''}>
<nav class="xd-nav${sticky ? ' xd-nav-sticky' : ''}"${bgColor ? ` style="background:${bgColor}"` : ''}>
  <a href="/" class="xd-nav-logo"${txtColor ? ` style="color:${txtColor}"` : ''}>
    ${c.logo ? `<img src="${attr(c.logo as string)}" alt="${attr(c.logoText as string || 'Logo')}" loading="eager" height="40">` : ''}
    <span>${txt(c.logoText as string || 'Store')}</span>
  </a>
  <ul class="xd-nav-menu" role="list">${menuHtml}</ul>
  <div class="xd-nav-actions">
    ${c.showSearch ? `<button class="xd-nav-icon" aria-label="Search"${clrAttr}>${searchSvg}</button>` : ''}
    ${c.showWishlist ? `<a href="${wishlistUrl}" class="xd-nav-icon" aria-label="Wishlist"${clrAttr}>${wishlistSvg}</a>` : ''}
    ${c.showCart !== false ? `<a href="${cartUrl}" class="xd-nav-icon xd-cart-icon" aria-label="Cart"${clrAttr}>${cartSvg}<span class="xd-nav-badge" style="display:none"></span></a>` : ''}
    ${c.showUserIcon ? `<a href="${_sfBase}/signin" class="xd-nav-icon xd-account-toggle xd-when-logged-out" aria-label="Sign in"${clrAttr} style="font-size:.875rem;font-weight:600;white-space:nowrap;text-decoration:none">Sign in</a><a href="${userIconUrl}" class="xd-nav-icon xd-account-toggle xd-when-logged-in" aria-label="Account"${clrAttr} style="display:none">${userSvg}</a>` : ''}
    <button class="xd-mobile-toggle" aria-label="Open menu"${clrAttr}>${menuSvg}</button>
  </div>
</nav>
<div id="xd-mobile-menu" class="xd-mobile-menu" role="dialog" aria-modal="true" aria-label="Navigation menu">
  <div class="xd-mobile-menu-inner">
    <button class="xd-mobile-menu-close" aria-label="Close menu">×</button>
    <nav class="xd-mobile-nav-links">${mobileHtml}</nav>
  </div>
</div>
</header>`;
}

function renderHero(c: Record<string, unknown>): string {
  // ── Support both Dawn blocks format AND legacy flat fields ──────
  const blocks = (c.blocks as Array<Record<string, unknown>>) || [];
  const hasDawnData = blocks.length > 0 || c.image || c.image_height;

  // Image: Dawn uses `image`, legacy uses `backgroundImage`
  const bgImg     = (c.image as string) || (c.backgroundImage as string) || '';
  // Height: Dawn uses `image_height`, legacy uses `height`
  const height    = (c.image_height as string) || (c.height as string) || 'large';
  const heightCls = height === 'full' ? 'xd-hero-full' : height === 'medium' ? 'xd-hero-medium' : height === 'compact' ? 'xd-hero-compact' : 'xd-hero-large';
  // Overlay
  const overlayOpacity = (c.image_overlay_opacity as number) ?? 0;
  // Text color — scheme sets it via wrapper, default white for hero
  const txtColor  = (c.textColor as string) || '#ffffff';
  // Background color fallback
  const bgColor   = (c.backgroundColor as string) || '#121212';
  const bgStyle   = bgImg ? `background:url('${attr(bgImg)}') center/cover no-repeat` : `background:${attr(bgColor)}`;

  // Content positioning (Dawn format)
  const pos = (c.desktop_content_position as string) || 'middle-center';
  const align = (c.desktop_content_alignment as string) || 'center';
  const showTextBox = c.show_text_box === true;

  // Map position to flexbox
  const [vPos, hPos] = pos.includes('-') ? pos.split('-') : ['middle', 'center'];
  const justifyMap: Record<string, string> = { top: 'flex-start', middle: 'center', bottom: 'flex-end' };
  const alignMap: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };
  const textAlignMap: Record<string, string> = { left: 'left', center: 'center', right: 'right' };
  const containerAlign = `display:flex;flex-direction:column;justify-content:${justifyMap[vPos] || 'center'};align-items:${alignMap[hPos] || 'center'};text-align:${textAlignMap[align] || 'center'};`;

  // ── Extract content from blocks (Dawn format) ──────────────────
  let title = '';
  let subtitle = '';
  let btn1Text = '', btn1Link = '#', btn2Text = '', btn2Link = '#';
  let headingSize = 'h1';

  if (hasDawnData && blocks.length > 0) {
    for (const block of blocks) {
      if (block.type === 'heading') {
        title = (block.text as string) || '';
        headingSize = (block.heading_size as string) || 'h1';
      } else if (block.type === 'text') {
        subtitle = (block.text as string) || '';
      } else if (block.type === 'buttons') {
        btn1Text = (block.button_label_1 as string) || '';
        btn1Link = (block.button_link_1 as string) || '#';
        btn2Text = (block.button_label_2 as string) || '';
        btn2Link = (block.button_link_2 as string) || '#';
      }
    }
  } else {
    // Legacy flat fields
    title    = (c.title as string) || 'Welcome to Our Store';
    subtitle = (c.subtitle as string) || '';
    btn1Text = (c.buttonText as string) || '';
    btn1Link = (c.buttonLink as string) || '#';
    btn2Text = (c.secondaryButtonText as string) || '';
    btn2Link = (c.secondaryButtonLink as string) || '#';
  }

  // Heading size class
  const hSizeMap: Record<string, string> = {
    h0: 'font-size:3.5rem', h1: 'font-size:3rem', h2: 'font-size:2.25rem',
    h3: 'font-size:1.875rem', h4: 'font-size:1.5rem', h5: 'font-size:1.25rem',
  };
  const headingStyle = hSizeMap[headingSize] || hSizeMap.h1;

  // Layout: split vs default
  const layout = (c.layout as string) || 'default';

  if (layout === 'split') {
    const imgUrl = (c.imageUrl as string) || (c.image_2 as string) || bgImg;
    const rev    = (c.imagePosition as string) === 'left' ? ' style="direction:rtl"' : '';
    return `
<section class="xd-hero-split"${rev}>
  <div class="xd-hero-split-text" style="color:${attr(txtColor)};background:${bgImg ? '' : attr(bgColor)};direction:ltr">
    <h1 class="xd-h1 xd-reveal" style="${headingStyle}">${txt(title)}</h1>
    ${subtitle ? `<p class="xd-lead xd-reveal" style="margin-top:1rem;margin-bottom:1.75rem">${txt(subtitle)}</p>` : ''}
    <div class="xd-flex xd-reveal">
      ${btn1Text ? `<a href="${attr(btn1Link)}" class="xd-btn xd-btn-primary" style="border-radius:var(--btn-radius,0);text-transform:uppercase;letter-spacing:.05em;font-size:.875rem;font-weight:500">${txt(btn1Text)}</a>` : ''}
      ${btn2Text ? `<a href="${attr(btn2Link)}" class="xd-btn xd-btn-outline-white" style="border-radius:var(--btn-radius,0);text-transform:uppercase;letter-spacing:.05em;font-size:.875rem;font-weight:500">${txt(btn2Text)}</a>` : ''}
    </div>
  </div>
  <div class="xd-hero-split-img">
    ${imgUrl ? `<img src="${attr(imgUrl)}" alt="${attr(title)}" loading="eager" fetchpriority="high" decoding="async">` : `<div style="height:100%;background:${attr(bgColor)}"></div>`}
  </div>
</section>`;
  }

  const textBoxStyle = showTextBox ? 'background:rgba(255,255,255,0.9);backdrop-filter:blur(8px);padding:1.5rem;color:#121212;' : '';
  const contentColor = showTextBox ? '#121212' : txtColor;

  return `
<section class="xd-hero ${heightCls}" style="${bgStyle};color:${attr(txtColor)};position:relative;overflow:hidden">
  ${bgImg ? `<img class="xd-hero-bg" src="${attr(bgImg)}" alt="" loading="eager" fetchpriority="high" decoding="async">` : ''}
  ${overlayOpacity > 0 ? `<div class="xd-hero-overlay" style="position:absolute;inset:0;background:rgba(0,0,0,${(overlayOpacity / 100).toFixed(2)});z-index:1"></div>` : ''}
  <div class="xd-hero-content xd-container" style="${containerAlign}padding:3rem 2rem;position:relative;z-index:2;min-height:inherit;height:100%">
    <div style="max-width:42rem;${textBoxStyle}">
      ${title ? `<h1 class="xd-h1 xd-reveal" style="${headingStyle};font-weight:bold;line-height:1.15;margin-bottom:.75rem;color:${attr(contentColor)}">${txt(title)}</h1>` : ''}
      ${subtitle ? `<p class="xd-lead xd-reveal" style="margin-bottom:1.5rem;opacity:.85;color:${attr(contentColor)}">${txt(subtitle)}</p>` : ''}
      <div class="xd-flex-center xd-reveal" style="display:flex;gap:.75rem;flex-wrap:wrap;justify-content:${textAlignMap[align] === 'center' ? 'center' : textAlignMap[align] === 'right' ? 'flex-end' : 'flex-start'}">
        ${btn1Text ? `<a href="${attr(btn1Link)}" class="xd-btn xd-btn-white" style="display:inline-block;padding:.75rem 2rem;font-size:.875rem;font-weight:500;text-transform:uppercase;letter-spacing:.05em;text-decoration:none;background:${showTextBox ? '#121212' : '#fff'};color:${showTextBox ? '#fff' : '#121212'};border-radius:var(--btn-radius,0)">${txt(btn1Text)}</a>` : ''}
        ${btn2Text ? `<a href="${attr(btn2Link)}" class="xd-btn xd-btn-outline-white" style="display:inline-block;padding:.75rem 2rem;font-size:.875rem;font-weight:500;text-transform:uppercase;letter-spacing:.05em;text-decoration:none;background:transparent;color:${attr(contentColor)};border:1px solid currentColor;border-radius:var(--btn-radius,0)">${txt(btn2Text)}</a>` : ''}
      </div>
    </div>
  </div>
</section>`;
}

function renderFeatures(c: Record<string, unknown>): string {
  const items   = (c.items as Array<Record<string, unknown>>) || [];
  const colsN   = Number(c.columns_desktop || c.columns) || (items.length <= 2 ? 2 : items.length === 4 ? 4 : 3);
  const colsCls = colsN === 4 ? 'xd-grid-4' : colsN === 2 ? 'xd-grid-2' : 'xd-grid-3';
  const colAlign = (c.column_alignment as string) || 'center';
  const imgWidth = (c.image_width as string) || 'full';
  const imgRatio = (c.image_ratio as string) || 'adapt';
  const ratioStyle = imgRatio === 'square' ? 'aspect-ratio:1;object-fit:cover;' : imgRatio === 'portrait' ? 'aspect-ratio:2/3;object-fit:cover;' : '';
  const imgMaxW = imgWidth === 'small' ? 'max-width:120px;' : imgWidth === 'medium' ? 'max-width:200px;' : '';
  return `
<section class="xd-section">
<div class="xd-container">
  <div class="xd-section-head">
    <h2 class="xd-h2 xd-reveal">${txt(c.title as string || 'Features')}</h2>
    ${c.subtitle ? `<p class="xd-lead xd-reveal">${txt(c.subtitle as string)}</p>` : ''}
  </div>
  <div class="${colsCls}">
    ${items.map(item => {
      const desc = (item.text as string) || (item.description as string) || '';
      const hasImage = !!(item.image as string);
      const linkLabel = item.link_label as string || '';
      const link = item.link as string || '#';
      return `
    <div class="xd-feature-card xd-reveal" style="text-align:${colAlign}">
      ${hasImage ? `<img src="${attr(item.image as string)}" alt="${attr(item.title as string || '')}" loading="lazy" decoding="async" style="width:100%;${imgMaxW}${ratioStyle}border-radius:var(--br);margin-bottom:1rem${colAlign === 'center' ? ';margin-inline:auto' : ''}">` : (item.icon ? `<div class="xd-feature-icon"><span class="material-icons" aria-hidden="true">${txt(item.icon as string)}</span></div>` : '')}
      <h3>${txt(item.title as string)}</h3>
      <p>${txt(desc)}</p>
      ${linkLabel ? `<a href="${attr(link)}" style="font-weight:600;color:var(--c-primary);margin-top:.5rem;display:inline-block">${txt(linkLabel)}</a>` : ''}
    </div>`;
    }).join('')}
  </div>
</div>
</section>`;
}

function productCard(p: Record<string, unknown>, ctaLabel: string): string {
  const onSale  = p.onSale || (p.salePrice && Number(p.salePrice) < Number(p.price));
  const display = p.sellingPrice || p.salePrice || p.price;
  const detailHref = `${_sfBase}/products/${attr(p.id as string)}`;
  // Stock check: available = physical stock - reserved
  const stockMap = (p.stock ?? {}) as Record<string, number>;
  const reservedMap = (p.reservedStock ?? {}) as Record<string, number>;
  const totalAvailable = Object.keys(stockMap).reduce((s, k) => s + Math.max(0, (Number(stockMap[k]) || 0) - (Number(reservedMap[k]) || 0)), 0);
  const outOfStock = totalAvailable <= 0;
  const badgeHtml = outOfStock
    ? '<span class="xd-product-badge xd-badge-sold-out">Sold Out</span>'
    : onSale ? '<span class="xd-product-badge">Sale</span>' : '';
  const btnHtml = outOfStock
    ? `<span class="xd-btn xd-btn-sm xd-product-btn xd-btn-full xd-btn-disabled" style="opacity:.5;pointer-events:none;cursor:not-allowed">Sold Out</span>`
    : `<a href="${attr(p.link as string, detailHref)}" class="xd-btn xd-btn-primary xd-btn-sm xd-product-btn xd-btn-full"
           data-xd-atc data-xd-product-id="${attr(p.id as string)}"
           data-xd-product-name="${attr(p.name as string)}"
           data-xd-price="${attr(String(p.price || 0))}">${ctaLabel}</a>`;
  return `
    <div class="xd-product-card xd-reveal" data-item-id="${attr(p.id as string)}">
      <a href="${detailHref}" class="xd-product-img-wrap" style="text-decoration:none;display:block">
        <img src="${attr(p.image as string, 'https://placehold.co/400/f5f5f5/999?text=Product')}" alt="${attr(p.name as string)}" loading="lazy" decoding="async" width="400" height="400">
        ${badgeHtml}
      </a>
      <div class="xd-product-body">
        <a href="${detailHref}" class="xd-product-name" style="text-decoration:none;color:inherit">${txt(p.name as string)}</a>
        ${display ? `<div><span class="xd-product-price">${txt(display)} SAR</span>${onSale && !outOfStock ? `<span class="xd-product-compare">${txt(p.price)} SAR</span>` : ''}</div>` : ''}
        ${btnHtml}
      </div>
    </div>`;
}

function skeletonCard(): string {
  return `
    <div class="xd-product-card xd-skel">
      <div class="xd-product-img-wrap xd-skel-img"></div>
      <div class="xd-product-body">
        <div class="xd-skel-line" style="width:80%"></div>
        <div class="xd-skel-line" style="width:50%"></div>
        <div class="xd-skel-btn"></div>
      </div>
    </div>`;
}

function renderProducts(c: Record<string, unknown>): string {
  const prods   = (c.selectedProducts as Array<Record<string, unknown>>) || [];
  const colsN   = Number(c.columns_desktop || c.columns) || 3;
  const colsCls = colsN === 4 ? 'xd-grid-4' : colsN === 2 ? 'xd-grid-2' : 'xd-grid-3';
  // If no products selected, show skeleton cards — runtime will hydrate with live data
  const cards = prods.length > 0
    ? prods.map(p => productCard(p, 'Add to Cart')).join('')
    : Array.from({ length: colsN }, () => skeletonCard()).join('');
  return `
<section class="xd-section">
<div class="xd-container">
  <div class="xd-section-head">
    <h2 class="xd-h2 xd-reveal">${txt((c.heading as string) || (c.title as string) || 'Products')}</h2>
    ${(c.description || c.subtitle) ? `<p class="xd-lead xd-reveal">${txt((c.description as string) || (c.subtitle as string))}</p>` : ''}
  </div>
  <div class="${colsCls}" data-xd-grid>${cards}
  </div>
</div>
</section>`;
}

function renderDeals(c: Record<string, unknown>, sectionId: string): string {
  const prods   = (c.selectedProducts as Array<Record<string, unknown>>) || [];
  const colsN   = Number(c.columns) || 3;
  const colsCls = colsN === 4 ? 'xd-grid-4' : colsN === 2 ? 'xd-grid-2' : 'xd-grid-3';
  const cdId    = `xd-cd-${sectionId}`;
  const endDate = attr(c.countdownEndDate as string || c.endDate as string || '');
  const cards = prods.length > 0
    ? prods.map(p => {
        const detailHref = `${_sfBase}/products/${attr(p.id as string)}`;
        return `
    <div class="xd-product-card xd-reveal" data-item-id="${attr(p.id as string)}">
      <a href="${detailHref}" class="xd-product-img-wrap" style="text-decoration:none;display:block">
        <img src="${attr(p.image as string, 'https://placehold.co/400/f5f5f5/999?text=Deal')}" alt="${attr(p.name as string)}" loading="lazy" decoding="async" width="400" height="400">
        <span class="xd-product-badge">Sale</span>
      </a>
      <div class="xd-product-body">
        <a href="${detailHref}" class="xd-product-name" style="text-decoration:none;color:inherit">${txt(p.name as string)}</a>
        <div>
          <span class="xd-product-price">${txt(p.salePrice || p.sellingPrice || p.price)} SAR</span>
          ${p.compareAtPrice || (p.salePrice && p.price) ? `<span class="xd-product-compare">${txt(p.compareAtPrice || p.price)} SAR</span>` : ''}
        </div>
        <a href="${detailHref}" class="xd-btn xd-btn-primary xd-btn-sm xd-product-btn xd-btn-full"
           data-xd-atc data-xd-product-id="${attr(p.id as string)}"
           data-xd-product-name="${attr(p.name as string)}"
           data-xd-price="${attr(String(p.salePrice || p.price || 0))}">Shop Now</a>
      </div>
    </div>`;
      }).join('')
    : Array.from({ length: colsN }, () => skeletonCard()).join('');

  const countdown = (c.showCountdown !== false && endDate) ? `
  <div class="xd-countdown xd-reveal" id="${cdId}"
       data-xd-countdown="${endDate}"
       data-xd-expired="${attr(c.countdownExpiredMessage as string || 'Deal has ended.')}">
    <div class="xd-countdown-block"><span class="xd-countdown-num" id="${cdId}-d">00</span><span class="xd-countdown-lbl">Days</span></div>
    <div class="xd-countdown-block"><span class="xd-countdown-num" id="${cdId}-h">00</span><span class="xd-countdown-lbl">Hours</span></div>
    <div class="xd-countdown-block"><span class="xd-countdown-num" id="${cdId}-m">00</span><span class="xd-countdown-lbl">Mins</span></div>
    <div class="xd-countdown-block"><span class="xd-countdown-num" id="${cdId}-s">00</span><span class="xd-countdown-lbl">Secs</span></div>
  </div>` : '';

  return `
<section class="xd-section">
<div class="xd-container">
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:${countdown ? '1.5rem' : '2rem'}">
    <h2 class="xd-h2 xd-reveal">${txt(c.title as string || 'Hot Deals')}</h2>
    ${c.viewMoreText ? `<a href="${attr(c.viewMoreLink as string, _sfBase + '/products')}" class="xd-btn xd-btn-secondary xd-btn-sm">${txt(c.viewMoreText as string)}</a>` : ''}
  </div>
  ${countdown}
  <div class="${colsCls}" style="${countdown ? 'margin-top:2rem' : ''}" data-xd-grid>${cards}
  </div>
</div>
</section>`;
}

function renderCollections(c: Record<string, unknown>): string {
  const cols    = (c.selectedCollections as Array<Record<string, unknown>>) || (c.items as Array<Record<string, unknown>>) || [];
  const colsN   = Number(c.columns_desktop || c.columns) || 3;
  const colsCls = colsN === 4 ? 'xd-grid-4' : colsN === 2 ? 'xd-grid-2' : 'xd-grid-3';
  return `
<section class="xd-section">
<div class="xd-container">
  <div class="xd-section-head">
    <h2 class="xd-h2 xd-reveal">${txt(c.title as string || 'Collections')}</h2>
    ${c.subtitle ? `<p class="xd-lead xd-reveal">${txt(c.subtitle as string)}</p>` : ''}
  </div>
  <div class="${colsCls}" data-xd-grid>
    ${cols.map(col => `
    <a href="${attr(col.url as string || col.link as string || '#')}" class="xd-reveal" data-item-id="${attr(col.id as string || col.slug as string)}" style="display:block;text-decoration:none;color:inherit">
      <div style="position:relative;aspect-ratio:1;overflow:hidden;border-radius:var(--br);background:#f5f5f5">
        <img src="${attr(col.image as string, 'https://placehold.co/400/27491F/fff?text=Collection')}" alt="${attr((col.name as string) || (col.collection as string) || '')}"
             loading="lazy" decoding="async" width="400" height="400"
             style="width:100%;height:100%;object-fit:cover;transition:scale .4s">
        <div style="position:absolute;inset:0;background:rgba(0,0,0,.38);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center;padding:1rem">
          <strong style="font-size:1.2rem;font-weight:700">${txt((col.name as string) || (col.collection as string) || '')}</strong>
          ${col.productCount ? `<span style="font-size:.85rem;opacity:.85;margin-top:.25rem">${txt(col.productCount)} items</span>` : ''}
        </div>
      </div>
    </a>`).join('')}
  </div>
</div>
</section>`;
}

function renderTestimonials(c: Record<string, unknown>): string {
  const items   = (c.items as Array<Record<string, unknown>>) || [];
  const colsCls = items.length <= 2 ? 'xd-grid-2' : 'xd-grid-3';
  return `
<section class="xd-section">
<div class="xd-container">
  <div class="xd-section-head">
    <h2 class="xd-h2 xd-reveal">${txt((c.heading as string) || (c.title as string) || 'What Customers Say')}</h2>
  </div>
  <div class="${colsCls}">
    ${items.map(t => `
    <div class="xd-testimonial-card xd-reveal">
      <div class="xd-stars" role="img" aria-label="${Number(t.rating) || 5} out of 5 stars">${stars(Number(t.rating) || 5)}</div>
      <p class="xd-testimonial-text">"${txt(t.text as string)}"</p>
      <div class="xd-testimonial-author">
        ${t.image ? `<img src="${attr(t.image as string)}" alt="${attr(t.name as string)}" loading="lazy" width="44" height="44">` : ''}
        <div class="xd-testimonial-author-info"><strong>${txt(t.name as string)}</strong><span>${txt(t.role as string)}</span></div>
      </div>
    </div>`).join('')}
  </div>
</div>
</section>`;
}

function renderCTA(c: Record<string, unknown>): string {
  // Support both blocks format and flat fields
  const blocks = (c.blocks as Array<Record<string, unknown>>) || [];
  let title = (c.heading as string) || (c.title as string) || '';
  let sub = (c.text as string) || (c.subtitle as string) || '';
  let btn1 = (c.button_label as string) || (c.buttonText as string) || '';
  let btn1L = (c.button_link as string) || (c.buttonLink as string) || '#';
  let btn2 = (c.button_label_2 as string) || (c.secondaryButtonText as string) || '';
  let btn2L = (c.button_link_2 as string) || (c.secondaryButtonLink as string) || '#';
  for (const block of blocks) {
    if (block.type === 'heading') title = title || (block.text as string) || '';
    if (block.type === 'text') sub = sub || (block.text as string) || '';
    if (block.type === 'button' || block.type === 'buttons') {
      btn1 = btn1 || (block.button_label_1 as string) || (block.label as string) || '';
      btn1L = (block.button_link_1 as string) || (block.link as string) || btn1L;
    }
  }
  if (!title) title = 'Ready to Get Started?';
  return `
<section class="xd-cta">
<div class="xd-container">
  <h2 class="xd-h2 xd-reveal">${txt(title)}</h2>
  ${sub ? `<p class="xd-lead xd-reveal" style="opacity:.9;margin-inline:auto;margin-bottom:2rem">${txt(sub)}</p>` : ''}
  <div class="xd-flex-center xd-reveal">
    ${btn1 ? `<a href="${attr(btn1L)}" class="xd-btn" style="display:inline-block;padding:.75rem 2rem;font-weight:500;text-decoration:none;border-radius:var(--btn-radius,8px);background:var(--scheme-btn-bg,#fff);color:var(--scheme-btn-label,#121212)">${txt(btn1)}</a>` : ''}
    ${btn2 ? `<a href="${attr(btn2L)}" class="xd-btn" style="display:inline-block;padding:.75rem 2rem;font-weight:500;text-decoration:none;border-radius:var(--btn-radius,8px);background:transparent;color:var(--scheme-outline-btn,currentColor);border:1px solid currentColor">${txt(btn2)}</a>` : ''}
  </div>
</div>
</section>`;
}

function renderAbout(c: Record<string, unknown>): string {
  // Dawn uses layout: 'image_first' | 'text_first'; legacy uses imagePosition: 'left'/'right'
  const layout = (c.layout as string) || '';
  const isTextFirst = layout === 'text_first' || (c.imagePosition as string) === 'left';
  const rev = isTextFirst ? ' reverse' : '';

  // Support both blocks format and flat fields
  const blocks = (c.blocks as Array<Record<string, unknown>>) || [];
  let title = (c.heading as string) || (c.title as string) || '';
  let caption = (c.caption as string) || '';
  let body = (c.text as string) || (c.content as string) || '';
  let btn = (c.button_label as string) || (c.buttonText as string) || '';
  let btnLink = (c.button_link as string) || (c.buttonLink as string) || '#';
  for (const block of blocks) {
    if (block.type === 'heading') title = title || (block.text as string) || '';
    if (block.type === 'caption') caption = caption || (block.text as string) || '';
    if (block.type === 'text') body = body || (block.text as string) || '';
    if (block.type === 'button') {
      btn = btn || (block.label as string) || (block.button_label as string) || '';
      btnLink = (block.link as string) || (block.button_link as string) || btnLink;
    }
  }
  const headingSize = (c.heading_size as string) || 'h1';
  const hSizeMap: Record<string, string> = { h0: '3.5rem', h1: '3rem', h2: '2.25rem', h3: '1.875rem', h4: '1.5rem', h5: '1.25rem' };
  const hSize = hSizeMap[headingSize] || hSizeMap.h1;
  const contentAlign = (c.content_alignment as string) || 'left';
  return `
<section class="xd-section">
<div class="xd-container">
  <div class="xd-split${rev}">
    ${c.image ? `<img class="xd-split-img xd-reveal" src="${attr(c.image as string)}" alt="${attr(c.imageAlt as string || title || '')}" loading="lazy" decoding="async">` : ''}
    <div class="xd-reveal" style="text-align:${contentAlign}">
      ${caption ? `<p style="font-size:.85rem;opacity:.6;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.5rem">${txt(caption)}</p>` : ''}
      ${title ? `<h2 class="xd-h2" style="margin-bottom:1rem;font-size:${hSize}">${txt(title)}</h2>` : ''}
      ${body ? `<p style="opacity:.8;line-height:1.8;margin-bottom:1.5rem">${txt(body)}</p>` : ''}
      ${btn ? `<a href="${attr(btnLink)}" class="xd-btn xd-btn-primary" style="border-radius:var(--btn-radius,8px)">${txt(btn)}</a>` : ''}
    </div>
  </div>
</div>
</section>`;
}

function renderContact(c: Record<string, unknown>): string {
  const hasInfo = c.email || c.phone || c.address;
  const successMsg = txt(c.successMessage as string || "Thank you! We'll be in touch soon.");
  return `
<section class="xd-section">
<div class="xd-container">
  <div class="xd-section-head">
    <h2 class="xd-h2 xd-reveal">${txt((c.heading as string) || (c.title as string) || 'Contact Us')}</h2>
    ${(c.text || c.subtitle) ? `<p class="xd-lead xd-reveal">${txt((c.text as string) || (c.subtitle as string))}</p>` : ''}
  </div>
  <div class="${hasInfo ? 'xd-contact-grid' : ''}">
    <div>
      <form class="xd-contact-form xd-reveal" novalidate>
        <input class="xd-input" type="text"  name="name"    placeholder="Your Name"     required autocomplete="name">
        <input class="xd-input" type="email" name="email"   placeholder="Email Address" required autocomplete="email">
        ${c.showPhone !== false ? `<input class="xd-input" type="tel" name="phone" placeholder="Phone Number" autocomplete="tel">` : ''}
        <textarea class="xd-input xd-textarea" name="message" placeholder="${attr(c.placeholder as string || 'How can we help you?')}" required></textarea>
        <button class="xd-btn xd-btn-primary xd-btn-full" type="submit">${txt(c.buttonText as string || 'Send Message')}</button>
      </form>
      <p class="xd-form-success">${successMsg}</p>
    </div>
    ${hasInfo ? `
    <div class="xd-contact-info xd-reveal">
      ${c.email ? `<div class="xd-contact-info-item"><div class="xd-contact-info-icon"><span class="material-icons" aria-hidden="true">email</span></div><div><strong>Email</strong><br><a href="mailto:${attr(c.email as string)}">${txt(c.email as string)}</a></div></div>` : ''}
      ${c.phone ? `<div class="xd-contact-info-item"><div class="xd-contact-info-icon"><span class="material-icons" aria-hidden="true">phone</span></div><div><strong>Phone</strong><br><a href="tel:${attr(c.phone as string)}">${txt(c.phone as string)}</a></div></div>` : ''}
      ${c.address ? `<div class="xd-contact-info-item"><div class="xd-contact-info-icon"><span class="material-icons" aria-hidden="true">location_on</span></div><div><strong>Address</strong><br>${txt(c.address as string)}</div></div>` : ''}
    </div>` : ''}
  </div>
</div>
</section>`;
}

function renderGallery(c: Record<string, unknown>): string {
  const images = (c.images as Array<Record<string, unknown>>) || [];
  const heading = (c.heading as string) || (c.title as string) || '';
  return `
<section class="xd-section">
<div class="xd-container">
  ${heading ? `<div class="xd-section-head"><h2 class="xd-h2 xd-reveal">${txt(heading)}</h2>${(c.text || c.subtitle) ? `<p class="xd-lead xd-reveal">${txt((c.text as string) || (c.subtitle as string))}</p>` : ''}</div>` : ''}
  <div class="xd-gallery-grid">
    ${images.map(img => `
    <div class="xd-gallery-item xd-reveal">
      <img src="${attr((img.image as string) || (img.url as string))}" alt="${attr(img.alt as string || img.caption as string || '')}" loading="lazy" decoding="async">
    </div>`).join('')}
  </div>
</div>
</section>
<div id="xd-lightbox" class="xd-lightbox" role="dialog" aria-modal="true" aria-label="Image viewer">
  <img src="" alt="">
  <button class="xd-lightbox-close" aria-label="Close lightbox">×</button>
</div>`;
}

function renderPricing(c: Record<string, unknown>): string {
  const plans   = (c.plans as Array<Record<string, unknown>>) || [];
  const colsCls = plans.length <= 2 ? 'xd-grid-2' : 'xd-grid-3';
  return `
<section class="xd-section">
<div class="xd-container">
  <div class="xd-section-head">
    <h2 class="xd-h2 xd-reveal">${txt(c.title as string || 'Pricing')}</h2>
    ${c.subtitle ? `<p class="xd-lead xd-reveal">${txt(c.subtitle as string)}</p>` : ''}
  </div>
  <div class="${colsCls}">
    ${plans.map(p => `
    <div class="xd-pricing-card${p.highlighted ? ' featured' : ''} xd-reveal">
      ${p.highlighted ? '<div class="xd-pricing-badge">Most Popular</div>' : ''}
      <h3 class="xd-h3">${txt(p.name as string)}</h3>
      <div><span class="xd-pricing-price">${txt(c.currency as string)}${txt(p.price as string)}</span><span class="xd-pricing-period">${(() => { const bp = (c.billingPeriod as string) || 'month'; return bp.startsWith('/') ? txt(bp) : '/' + txt(bp); })()}</span></div>
      <ul class="xd-pricing-features">
        ${(() => {
          const f = p.features;
          if (Array.isArray(f)) return f.map((item: string) => `<li>${txt(item)}</li>`).join('');
          if (typeof f === 'string') return f.split('\n').filter(Boolean).map(line => `<li>${txt(line)}</li>`).join('');
          return '';
        })()}
      </ul>
      <a href="#" class="xd-btn ${p.highlighted ? 'xd-btn-primary' : 'xd-btn-secondary'} xd-btn-full">${txt(p.buttonText as string || 'Get Started')}</a>
    </div>`).join('')}
  </div>
</div>
</section>`;
}

function renderFAQ(c: Record<string, unknown>): string {
  const items = (c.faqs as Array<Record<string, unknown>>) || (c.items as Array<Record<string, unknown>>) || [];
  const heading = (c.heading as string) || (c.title as string) || 'FAQ';
  return `
<section class="xd-section">
<div class="xd-container" style="max-width:780px">
  <div class="xd-section-head"><h2 class="xd-h2 xd-reveal">${txt(heading)}</h2></div>
  ${items.map((q, i) => {
    const question = (q.heading as string) || (q.question as string) || '';
    const answer = (q.content as string) || (q.answer as string) || '';
    return `
  <details class="xd-faq-item xd-reveal"${i === 0 ? ' open' : ''}>
    <summary>${txt(question)}<span class="xd-faq-chevron"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg></span></summary>
    <p class="xd-faq-answer">${txt(answer)}</p>
  </details>`;
  }).join('')}
</div>
</section>`;
}

function renderStats(c: Record<string, unknown>): string {
  const statItems = (c.stats as Array<Record<string, unknown>>) || [];
  return `
<section class="xd-section">
<div class="xd-container">
  ${(c.heading || c.title) ? `<div class="xd-section-head"><h2 class="xd-h2 xd-reveal">${txt((c.heading as string) || (c.title as string))}</h2></div>` : ''}
  <div class="xd-stats-grid">
    ${statItems.map(s => `
    <div class="xd-stat-card xd-reveal">
      ${s.icon ? `<div><span class="material-icons xd-stat-icon" aria-hidden="true">${txt(s.icon as string)}</span></div>` : ''}
      <div class="xd-stat-value">${txt(s.prefix as string)}${txt(s.value as string)}${txt(s.suffix as string)}</div>
      <div class="xd-stat-label">${txt(s.label as string)}</div>
    </div>`).join('')}
  </div>
</div>
</section>`;
}

function renderTeam(c: Record<string, unknown>): string {
  const members = (c.members as Array<Record<string, unknown>>) || [];
  const colsCls = members.length >= 4 ? 'xd-grid-4' : members.length <= 2 ? 'xd-grid-2' : 'xd-grid-3';
  return `
<section class="xd-section">
<div class="xd-container">
  <div class="xd-section-head">
    <h2 class="xd-h2 xd-reveal">${txt(c.title as string || 'Our Team')}</h2>
    ${c.subtitle ? `<p class="xd-lead xd-reveal">${txt(c.subtitle as string)}</p>` : ''}
  </div>
  <div class="${colsCls}">
    ${members.map(m => `
    <div class="xd-team-card xd-reveal">
      <img class="xd-team-img" src="${attr(m.image as string, 'https://placehold.co/200/27491F/fff?text=Photo')}" alt="${attr(m.name as string)}" loading="lazy" width="130" height="130">
      <div style="font-weight:700;font-size:1.05rem">${txt(m.name as string)}</div>
      <div style="font-size:.875rem;opacity:.6;margin-top:.25rem">${txt(m.role as string)}</div>
      ${m.bio ? `<p style="font-size:.875rem;opacity:.7;margin-top:.625rem">${txt(m.bio as string)}</p>` : ''}
    </div>`).join('')}
  </div>
</div>
</section>`;
}

function renderServices(c: Record<string, unknown>): string {
  const services = (c.services as Array<Record<string, unknown>>) || [];
  const heading = (c.heading as string) || (c.title as string) || 'Our Services';
  return `
<section class="xd-section">
<div class="xd-container">
  <div class="xd-section-head">
    <h2 class="xd-h2 xd-reveal">${txt(heading)}</h2>
    ${(c.text || c.subtitle) ? `<p class="xd-lead xd-reveal">${txt((c.text as string) || (c.subtitle as string))}</p>` : ''}
  </div>
  <div class="xd-grid-3">
    ${services.map(s => {
      const sTitle = (s.heading as string) || (s.title as string) || '';
      const sDesc = (s.text as string) || (s.description as string) || '';
      const sImg = s.image as string || '';
      const sCap = s.caption as string || '';
      const sBtn = (s.button_label as string) || '';
      const sBtnLink = (s.button_link as string) || (s.link as string) || '#';
      return `
    <div class="xd-service-card xd-reveal">
      ${sImg ? `<img src="${attr(sImg)}" alt="${attr(sTitle)}" loading="lazy" decoding="async" style="width:100%;border-radius:var(--br);margin-bottom:1rem">` : (s.icon ? `<div class="xd-service-icon"><span class="material-icons" aria-hidden="true">${txt(s.icon as string)}</span></div>` : '')}
      <div class="xd-service-body">
        ${sCap ? `<p style="font-size:.85rem;opacity:.6;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.25rem">${txt(sCap)}</p>` : ''}
        <h3>${txt(sTitle)}</h3>
        <p>${txt(sDesc)}</p>
        ${sBtn ? `<a href="${attr(sBtnLink)}" style="font-weight:600;color:var(--c-primary);margin-top:.5rem;display:inline-block">${txt(sBtn)}</a>` : (s.link ? `<a href="${attr(sBtnLink)}" style="font-weight:600;color:var(--c-primary);margin-top:.5rem;display:inline-block">Learn more →</a>` : '')}
      </div>
    </div>`;
    }).join('')}
  </div>
</div>
</section>`;
}

function renderVideo(c: Record<string, unknown>): string {
  const url      = (c.video_url as string) || (c.videoUrl as string) || '';
  const thumb    = (c.cover_image as string) || (c.thumbnailUrl as string) || '';
  const autoplay = !!c.autoplay;
  const embedUrl = buildEmbedUrl(url, autoplay);
  const showThumb = thumb && !autoplay;
  const heading  = (c.heading as string) || (c.title as string) || '';

  return `
<section class="xd-section">
<div class="xd-container">
  ${heading ? `<div class="xd-section-head"><h2 class="xd-h2 xd-reveal">${txt(heading)}</h2>${(c.text || c.subtitle) ? `<p class="xd-lead xd-reveal">${txt((c.text as string) || (c.subtitle as string))}</p>` : ''}</div>` : ''}
  <div class="xd-video-wrap xd-reveal">
    ${showThumb
      ? `<div class="xd-video-thumb" data-src="${attr(embedUrl)}" role="button" tabindex="0" aria-label="Play video">
        <img src="${attr(thumb)}" alt="Video thumbnail" loading="lazy" decoding="async">
        <button class="xd-video-play-btn" aria-label="Play video">
          <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
        </button>
      </div>`
      : embedUrl
        ? `<iframe src="${attr(embedUrl)}" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen loading="lazy" title="${attr(c.title as string || 'Video')}"></iframe>`
        : ''}
  </div>
</div>
</section>`;
}

function renderCountdown(c: Record<string, unknown>, sectionId: string): string {
  const cdId  = `xd-cd-${sectionId}`;
  return `
<section class="xd-section" style="text-align:center">
<div class="xd-container xd-countdown-wrap">
  <div class="xd-section-head">
    <h2 class="xd-h2 xd-reveal">${txt((c.heading as string) || (c.title as string) || 'Sale Ends In')}</h2>
    ${c.subtitle ? `<p class="xd-lead xd-reveal" style="opacity:.85">${txt(c.subtitle as string)}</p>` : ''}
  </div>
  <div class="xd-countdown xd-reveal" id="${cdId}"
       data-xd-countdown="${attr(c.targetDate as string)}"
       data-xd-expired="${attr(c.expiredMessage as string || 'Sale has ended.')}">
    ${c.showDays !== false ? `<div class="xd-countdown-block"><span class="xd-countdown-num" id="${cdId}-d">00</span><span class="xd-countdown-lbl">Days</span></div>` : ''}
    ${c.showHours !== false ? `<div class="xd-countdown-block"><span class="xd-countdown-num" id="${cdId}-h">00</span><span class="xd-countdown-lbl">Hours</span></div>` : ''}
    ${c.showMinutes !== false ? `<div class="xd-countdown-block"><span class="xd-countdown-num" id="${cdId}-m">00</span><span class="xd-countdown-lbl">Minutes</span></div>` : ''}
    ${c.showSeconds !== false ? `<div class="xd-countdown-block"><span class="xd-countdown-num" id="${cdId}-s">00</span><span class="xd-countdown-lbl">Seconds</span></div>` : ''}
  </div>
</div>
</section>`;
}

function renderPartners(c: Record<string, unknown>): string {
  const partners = (c.partners as Array<Record<string, unknown>>) || [];
  return `
<section class="xd-section" style="padding-block:clamp(2rem,4vw,3rem)">
<div class="xd-container">
  ${c.title ? `<div class="xd-section-head" style="margin-bottom:2rem"><p class="xd-reveal" style="font-weight:600;font-size:.9rem;text-transform:uppercase;letter-spacing:.08em;opacity:.5">${txt(c.title as string)}</p></div>` : ''}
  <div class="xd-partners-wrap">
    ${partners.map(p => `${p.link ? `<a href="${attr(p.link as string)}" target="_blank" rel="noopener noreferrer">` : ''}<img class="xd-partner-logo" src="${attr(p.logo as string)}" alt="${attr(p.name as string)}" loading="lazy" decoding="async">${p.link ? '</a>' : ''}`).join('')}
  </div>
</div>
</section>`;
}

function renderSlideshow(c: Record<string, unknown>): string {
  const slides = (c.slides as Array<Record<string, unknown>>) || [];
  if (slides.length === 0) return '<!-- slideshow: no slides -->';
  const height = (c.slide_height as string) || 'medium';
  const heightCls = height === 'full' ? 'min-height:100vh' : height === 'large' ? 'min-height:600px' : height === 'small' ? 'min-height:300px' : 'min-height:450px';
  const autoplay = c.autoplay !== false;
  const speed = Number(c.autoplay_speed) || 5;
  const showArrows = c.show_arrows !== false;
  const showDots = c.show_dots !== false;

  const slidesHtml = slides.map((slide, i) => {
    const bgImg = slide.image as string || '';
    const heading = slide.heading as string || '';
    const sub = slide.subheading as string || '';
    const btnText = slide.button_label as string || '';
    const btnLink = slide.button_link as string || '#';
    const overlay = Number(slide.overlay_opacity) || 0;
    const pos = (slide.content_position as string) || 'middle-center';
    const align = (slide.text_alignment as string) || 'center';
    const [vPos, hPos] = pos.includes('-') ? pos.split('-') : ['middle', 'center'];
    const justifyMap: Record<string, string> = { top: 'flex-start', middle: 'center', bottom: 'flex-end' };
    const alignMap: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };
    return `
    <div class="xd-slide${i === 0 ? ' active' : ''}" style="${heightCls};position:relative;overflow:hidden;${i > 0 ? 'display:none;' : ''}">
      ${bgImg ? `<img src="${attr(bgImg)}" alt="${attr(heading)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async">` : ''}
      ${overlay > 0 ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,${(overlay / 100).toFixed(2)})"></div>` : ''}
      <div style="position:relative;z-index:2;display:flex;flex-direction:column;justify-content:${justifyMap[vPos] || 'center'};align-items:${alignMap[hPos] || 'center'};text-align:${align};${heightCls};padding:3rem 2rem;color:#fff">
        ${heading ? `<h2 class="xd-h1" style="font-weight:bold;margin-bottom:.75rem">${txt(heading)}</h2>` : ''}
        ${sub ? `<p style="font-size:1.125rem;opacity:.85;margin-bottom:1.5rem;max-width:36rem">${txt(sub)}</p>` : ''}
        ${btnText ? `<a href="${attr(btnLink)}" class="xd-btn xd-btn-primary" style="border-radius:var(--btn-radius,8px)">${txt(btnText)}</a>` : ''}
      </div>
    </div>`;
  }).join('');

  return `
<section class="xd-slideshow" data-autoplay="${autoplay}" data-speed="${speed}">
  <div class="xd-slides">${slidesHtml}</div>
  ${showArrows ? `<button class="xd-slide-prev" aria-label="Previous slide">‹</button><button class="xd-slide-next" aria-label="Next slide">›</button>` : ''}
  ${showDots ? `<div class="xd-slide-dots">${slides.map((_, i) => `<button class="xd-slide-dot${i === 0 ? ' active' : ''}" data-slide="${i}" aria-label="Slide ${i + 1}"></button>`).join('')}</div>` : ''}
</section>`;
}

function renderNewsletter(c: Record<string, unknown>): string {
  const successMsg = txt(c.successMessage as string || "You're subscribed!");
  const heading = (c.heading as string) || (c.title as string) || 'Stay in the Loop';
  const sub = (c.paragraph as string) || (c.subtitle as string) || '';
  return `
<section class="xd-section" style="text-align:center">
<div class="xd-container">
  <h2 class="xd-h2 xd-reveal">${txt(heading)}</h2>
  ${sub ? `<p class="xd-lead xd-reveal" style="opacity:.85;margin-inline:auto">${txt(sub)}</p>` : ''}
  <form class="xd-newsletter-form xd-reveal" novalidate>
    <input class="xd-newsletter-input" type="email" placeholder="${attr(c.placeholder as string || 'Enter your email')}" required autocomplete="email">
    <button class="xd-btn xd-btn-primary" type="submit">${txt(c.buttonText as string || 'Subscribe')}</button>
  </form>
  <p class="xd-form-success">${successMsg}</p>
</div>
</section>`;
}

function renderDivider(c: Record<string, unknown>): string {
  const spacing     = Number(c.spacing) || 48;
  const h           = Number(c.height)  || 1;
  const color       = attr(c.color as string || '#e5e7eb');
  const divStyle    = c.style as string || 'line';
  if (divStyle === 'gradient') {
    return `<div style="padding-top:${spacing}px"><div style="height:${h}px;background:linear-gradient(90deg,transparent,var(--c-primary),transparent)"></div></div>`;
  }
  const bStyle = divStyle === 'dotted' ? 'dotted' : divStyle === 'dashed' ? 'dashed' : 'solid';
  return `<div style="padding-top:${spacing}px"><hr style="border:none;border-top:${h}px ${bStyle} ${color};margin:0"></div>`;
}

function renderImageComparison(c: Record<string, unknown>): string {
  const pos = Number(c.sliderPosition) || 50;
  return `
<section class="xd-section">
<div class="xd-container">
  ${c.title ? `<div class="xd-section-head"><h2 class="xd-h2 xd-reveal">${txt(c.title as string)}</h2>${c.subtitle ? `<p class="xd-lead xd-reveal">${txt(c.subtitle as string)}</p>` : ''}</div>` : ''}
  <div class="xd-comparison xd-reveal" style="aspect-ratio:16/7" role="img" aria-label="Before and after comparison">
    <div class="xd-comparison-before">
      <img src="${attr(c.beforeImage as string)}" alt="${attr(c.beforeLabel as string || 'Before')}" loading="lazy" draggable="false">
    </div>
    <div class="xd-comparison-clip" style="width:${pos}%">
      <img src="${attr(c.afterImage as string)}" alt="${attr(c.afterLabel as string || 'After')}" loading="lazy" draggable="false" style="min-width:100vw">
    </div>
    <div class="xd-comparison-handle" style="left:${pos}%"></div>
    ${c.showLabels !== false ? `
    <span class="xd-comparison-label" style="left:.75rem">${txt(c.beforeLabel as string || 'Before')}</span>
    <span class="xd-comparison-label" style="right:.75rem">${txt(c.afterLabel as string || 'After')}</span>` : ''}
  </div>
</div>
</section>`;
}

function renderFooter(c: Record<string, unknown>, siteName: string, themeData?: Record<string, unknown>): string {
  const layout  = c.layout   as string || 'classic';
  const columns = (c.columns as Array<Record<string, unknown>>) || [];
  const copyright = txt((c.copyrightText as string) || (c.copyright as string) || `\u00A9 ${new Date().getFullYear()} ${siteName}`);

  // Social media SVG icons
  const socialSvgs: Record<string, string> = {
    instagram: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>',
    twitter: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    tiktok: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 005.58 2.17V2.44a4.85 4.85 0 01-.01 4.25z"/></svg>',
    facebook: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    youtube: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    snapchat: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12.959-.289.276-.155.515-.126.63-.068.156.076.373.263.373.544 0 .303-.193.584-.882.807-.67.214-1.308.345-1.636.466-.18.067-.306.183-.354.358-.048.176-.006.364.098.528.648 1.023 1.45 1.885 2.382 2.564.407.296.839.512 1.282.64.296.087.462.201.528.396.065.186-.024.422-.263.638-.435.398-1.168.48-1.545.522-.12.014-.21.019-.312.029-.023.002-.046.003-.07.005-.058.07-.17.217-.357.46l-.045.063c-.116.16-.157.345-.115.535.044.196.225.396.553.492 1.07.318 2.198.738 2.3 1.58.02.18-.035.336-.17.472a1.11 1.11 0 01-.543.276c-.485.148-1.076.227-1.76.234-.286.003-.604.026-.804.072-.199.045-.39.16-.574.405-.292.39-.545.88-1.015 1.14-.45.247-.933.237-1.29.237-.037 0-.072 0-.108-.002a3.09 3.09 0 01-.435-.055c-.39-.067-.778-.194-1.2-.33a4.57 4.57 0 00-1.143-.312c-.086-.009-.179-.013-.282-.013-.37 0-.671.078-1.06.189-.39.11-.84.254-1.425.34-.177.027-.338.04-.478.04-.35 0-.66-.064-.93-.16-.44-.156-.776-.399-.951-.654-.135-.196-.286-.36-.48-.42-.2-.06-.52-.08-.82-.08-.694-.01-1.285-.086-1.76-.234a1.11 1.11 0 01-.543-.276c-.135-.136-.192-.293-.17-.472.1-.843 1.228-1.263 2.3-1.58.327-.097.508-.297.552-.492.042-.19.001-.375-.115-.535l-.045-.063c-.187-.243-.3-.39-.357-.46-.024-.002-.046-.003-.07-.005-.102-.01-.192-.015-.312-.029-.376-.042-1.11-.124-1.545-.522-.24-.216-.328-.452-.263-.638.066-.195.232-.31.528-.396.443-.128.875-.344 1.282-.64.932-.68 1.734-1.541 2.382-2.564.104-.164.146-.352.098-.528-.048-.175-.174-.291-.354-.358-.328-.12-.966-.252-1.636-.466-.69-.223-.882-.504-.882-.807 0-.281.217-.468.373-.544.116-.058.354-.087.63.068.3.17.659.273.959.29.199 0 .326-.046.401-.091-.008-.165-.018-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.3-4.847C7.853 1.07 11.21.793 12.2.793h.006z"/></svg>',
  };

  // Build social HTML from theme settings (only show icons that have links)
  const themeSocials: Array<{ platform: string; url: string }> = [];
  if (themeData) {
    if (themeData.socialInstagram) themeSocials.push({ platform: 'instagram', url: String(themeData.socialInstagram) });
    if (themeData.socialTwitter)   themeSocials.push({ platform: 'twitter', url: String(themeData.socialTwitter) });
    if (themeData.socialTiktok)    themeSocials.push({ platform: 'tiktok', url: String(themeData.socialTiktok) });
    if (themeData.socialFacebook)  themeSocials.push({ platform: 'facebook', url: String(themeData.socialFacebook) });
    if (themeData.socialYoutube)   themeSocials.push({ platform: 'youtube', url: String(themeData.socialYoutube) });
    if (themeData.socialSnapchat)  themeSocials.push({ platform: 'snapchat', url: String(themeData.socialSnapchat) });
  }
  // Also support legacy socialLinks from section data
  const legacySocial = (c.socialLinks as Array<Record<string, unknown>>) || [];
  for (const s of legacySocial) {
    const p = String(s.platform || '').toLowerCase();
    const url = String(s.link || s.url || '');
    if (url && !themeSocials.some(ts => ts.platform === p)) {
      themeSocials.push({ platform: p, url });
    }
  }

  const socialHtml = themeSocials.map(s => {
    const svg = socialSvgs[s.platform] || '';
    return `<a href="${attr(s.url)}" class="xd-footer-social-btn" target="_blank" rel="noopener noreferrer" aria-label="${attr(s.platform)}" style="opacity:.7;transition:opacity .2s" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='.7'">${svg}</a>`;
  }).join('');

  if (layout === 'minimal') {
    const policyLinks = (c.policyLinks as Array<Record<string, unknown>>) || [];
    return `
<footer
<div class="xd-container xd-footer-minimal">
  <strong style="font-size:1.1rem">${txt(c.logoText as string || siteName)}</strong>
  <nav class="xd-footer-policy">${policyLinks.map(l => `<a href="${attr(l.link as string, '#')}">${txt(l.label as string)}</a>`).join('')}</nav>
  <div class="xd-footer-social">${socialHtml}</div>
  <span style="font-size:.8rem;opacity:.45">${copyright}</span>
</div>
</footer>`;
  }

  return `
<footer
<div class="xd-container xd-footer">
  <div class="xd-footer-grid" style="border-bottom:1px solid color-mix(in srgb, currentColor 15%, transparent);padding-bottom:2.5rem;margin-bottom:2rem">
    <div>
      ${c.logo ? `<img src="${attr(c.logo as string)}" alt="${attr(c.logoText as string || siteName)}" style="max-height:48px;max-width:160px;object-fit:contain;margin-bottom:.75rem" loading="lazy">` : ''}
      <strong style="font-size:1.2rem;display:block;margin-bottom:.5rem">${txt(c.logoText as string || siteName)}</strong>
      ${c.tagline ? `<p style="opacity:.6;font-size:.9rem;line-height:1.6;max-width:280px">${txt(c.tagline as string)}</p>` : ''}
    </div>
    ${columns.map(col => {
      const colTitle = (col.title as string) || (col.heading as string) || '';
      // Support both links array (legacy) and menu textarea (registry: "Label | url\nLabel | url")
      let linksHtml = '';
      const linksArr = col.links as Array<Record<string, unknown>> | undefined;
      if (linksArr && Array.isArray(linksArr)) {
        linksHtml = linksArr.map(l => `<a href="${attr(l.link as string || l.url as string, '#')}">${txt(l.label as string)}</a>`).join('');
      } else if (col.menu && typeof col.menu === 'string') {
        linksHtml = (col.menu as string).split('\n').filter(Boolean).map(line => {
          const [label, url] = line.split('|').map(s => s.trim());
          return `<a href="${attr(url || '#')}">${txt(label || '')}</a>`;
        }).join('');
      }
      return `
    <div>
      <p class="xd-footer-col-title">${txt(colTitle)}</p>
      <nav class="xd-footer-links">${linksHtml}</nav>
    </div>`;
    }).join('')}
  </div>
  <div class="xd-footer-bottom">
    <span style="font-size:.85rem;opacity:.45">${copyright}</span>
    <div class="xd-footer-social">${socialHtml}</div>
  </div>
</div>
</footer>`;
}

/* ─────────────────────────────────────────────────────────────────────
   SECTION DISPATCH
───────────────────────────────────────────────────────────────────── */

/**
 * Inject data-xd-section-id and data-xd-type into the first HTML tag of
 * a rendered section so the storefront runtime can target it by ID.
 */
function addSectionAttrs(html: string, secId: string, secType: string): string {
  const id   = attr(secId);
  const type = attr(secType);
  return html.replace(/^(\s*<[a-zA-Z][a-zA-Z0-9]*)/, `$1 data-xd-section-id="${id}" data-xd-type="${type}"`);
}

function renderSection(sec: ISection, siteName: string): string {
  const c = getSectionData(sec);

  let html: string;
  switch (sec.type) {
    case 'banner':
    case 'announcement': html = renderBanner(c);       break;
    case 'navbar':       html = renderNavbar(c);       break;
    case 'hero':         html = renderHero(c);         break;
    case 'features':     html = renderFeatures(c);     break;
    case 'products':     html = renderProducts(c);     break;
    case 'deals':        html = renderDeals(c, sec.id); break;
    case 'collections':  html = renderCollections(c);  break;
    case 'testimonials': html = renderTestimonials(c); break;
    case 'cta':          html = renderCTA(c);          break;
    case 'about':
    case 'split_media':  html = renderAbout(c);        break;
    case 'contact':      html = renderContact(c);      break;
    case 'gallery':      html = renderGallery(c);      break;
    case 'pricing':      html = renderPricing(c);      break;
    case 'faq':          html = renderFAQ(c);          break;
    case 'stats':        html = renderStats(c);        break;
    case 'team':         html = renderTeam(c);         break;
    case 'services':     html = renderServices(c);     break;
    case 'video':
    case 'video_hero':   html = renderVideo(c);        break;
    case 'countdown':    html = renderCountdown(c, sec.id); break;
    case 'partners':     html = renderPartners(c);     break;
    case 'newsletter':   html = renderNewsletter(c);   break;
    case 'divider':      html = renderDivider(c);      break;
    case 'imageComparison': html = renderImageComparison(c); break;
    case 'slideshow':    html = renderSlideshow(c); break;
    case 'footer':       html = renderFooter(c, siteName, _themeData); break;
    default:             return `<!-- section "${attr(sec.type)}" not rendered -->`;
  }

  // ── Apply padding ──────────────────────────────────────────────
  const padTop = c.padding_top as number | undefined;
  const padBot = c.padding_bottom as number | undefined;
  const padStyle = [
    padTop != null ? `padding-top:${padTop}px` : '',
    padBot != null ? `padding-bottom:${padBot}px` : '',
  ].filter(Boolean).join(';');

  // ── Apply color scheme styling ──────────────────────────────────
  // Sections that have their own bg handling (hero has image, divider is transparent)
  const skipSchemeBg = ['hero', 'divider', 'slideshow'].includes(sec.type);
  const schemeId = c.color_scheme as string | undefined;
  if (schemeId) {
    const scheme = _colorSchemes.find(s => s.id === schemeId);
    if (scheme) {
      // Build CSS custom properties for scheme colors
      const cssVars = [
        `--scheme-bg:${attr(scheme.background)}`,
        `--scheme-text:${attr(scheme.text)}`,
        `--scheme-btn-bg:${attr(scheme.solidButtonBg)}`,
        `--scheme-btn-label:${attr(scheme.solidButtonLabel)}`,
        `--scheme-outline-btn:${attr(scheme.outlineButton)}`,
        `--scheme-shadow:${attr(scheme.shadow)}`,
        `--btn-radius:${_btnRadius}`,
      ].join(';');

      // Apply scheme background and text color
      const sectionStyle = sec.style as Record<string, unknown> | undefined;
      const hasManualBg = sectionStyle?.backgroundColor || sectionStyle?.backgroundImage;
      const bgStyle = (!skipSchemeBg && !hasManualBg)
        ? (scheme.backgroundGradient
            ? `background:${attr(scheme.backgroundGradient)};`
            : `background-color:${attr(scheme.background)};`)
        : '';
      const textStyle = `color:${attr(scheme.text)};`;

      // Wrap the section HTML in a div with scheme + padding styles
      html = `<div style="${cssVars};${bgStyle}${textStyle}${padStyle ? padStyle + ';' : ''}">${html}</div>`;
    }
  } else if (padStyle) {
    // No scheme but padding specified — wrap with padding only
    html = `<div style="${padStyle}">${html}</div>`;
  }

  return addSectionAttrs(html, sec.id, sec.type);
}

/* ─────────────────────────────────────────────────────────────────────
   STOREFRONT SPECIAL PAGES (Cart, Wishlist, Account)
───────────────────────────────────────────────────────────────────── */
function renderStorefrontPage(pageSlug: string, siteName: string): string {
  if (pageSlug === 'cart') {
    return `
<section style="max-width:900px;margin:0 auto;padding:clamp(2rem,5vw,4rem) 1rem;min-height:60vh">
  <h1 style="font-size:clamp(1.5rem,3vw,2rem);font-weight:800;margin-bottom:1.5rem">Shopping Cart</h1>
  <div id="xd-cart-container">
    <div style="text-align:center;padding:3rem 0;opacity:.6">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 1rem"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      <p style="font-size:1.1rem">Your cart is empty</p>
      <a href="/" class="xd-btn" style="margin-top:1rem;display:inline-block">Continue Shopping</a>
    </div>
  </div>
</section>`;
  }
  if (pageSlug === 'favorites') {
    return `
<section style="max-width:900px;margin:0 auto;padding:clamp(2rem,5vw,4rem) 1rem;min-height:60vh">
  <h1 style="font-size:clamp(1.5rem,3vw,2rem);font-weight:800;margin-bottom:1.5rem">Wishlist</h1>
  <div id="xd-wishlist-container">
    <div style="text-align:center;padding:3rem 0;opacity:.6">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 1rem"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      <p style="font-size:1.1rem">Your wishlist is empty</p>
      <a href="/" class="xd-btn" style="margin-top:1rem;display:inline-block">Browse Products</a>
    </div>
  </div>
</section>`;
  }
  if (pageSlug === 'account') {
    return `
<section style="max-width:600px;margin:0 auto;padding:clamp(2rem,5vw,4rem) 1rem;min-height:60vh">
  <h1 style="font-size:clamp(1.5rem,3vw,2rem);font-weight:800;margin-bottom:1.5rem">My Account</h1>
  <div id="xd-account-container">
    <div style="background:#f9fafb;border-radius:var(--br,8px);padding:2rem;text-align:center">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 1rem"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <p style="font-size:1.1rem;margin-bottom:1rem">Sign in to view your orders and manage your account</p>
      <a href="/signin" class="xd-btn" style="display:inline-block">Sign In</a>
    </div>
  </div>
</section>`;
  }
  if (pageSlug === 'signin') {
    return `
<section style="max-width:440px;margin:0 auto;padding:clamp(2rem,5vw,4rem) 1rem;min-height:60vh">
  <div style="text-align:center;margin-bottom:2rem">
    <h1 style="font-size:clamp(1.5rem,3vw,2rem);font-weight:800;margin-bottom:.5rem">Welcome Back</h1>
    <p style="opacity:.6;font-size:.95rem">Sign in to your account</p>
  </div>
  <form id="xd-signin-form" style="display:flex;flex-direction:column;gap:1rem" onsubmit="return false">
    <div id="xd-signin-error" style="display:none;background:#fef2f2;color:#dc2626;padding:.75rem 1rem;border-radius:var(--br,8px);font-size:.875rem"></div>
    <div style="display:flex;flex-direction:column;gap:.35rem">
      <label for="xd-signin-email" style="font-size:.875rem;font-weight:600">Email</label>
      <input id="xd-signin-email" type="email" required placeholder="you@example.com"
        style="padding:.75rem 1rem;border:1px solid #e5e7eb;border-radius:var(--br,8px);font-size:1rem;font-family:inherit;outline:none;transition:border-color .2s"
        onfocus="this.style.borderColor='var(--c-primary)';this.style.boxShadow='0 0 0 3px color-mix(in srgb,var(--c-primary) 15%,transparent)'"
        onblur="this.style.borderColor='#e5e7eb';this.style.boxShadow='none'">
    </div>
    <div style="display:flex;flex-direction:column;gap:.35rem">
      <label for="xd-signin-password" style="font-size:.875rem;font-weight:600">Password</label>
      <input id="xd-signin-password" type="password" required placeholder="Enter your password" minlength="6"
        style="padding:.75rem 1rem;border:1px solid #e5e7eb;border-radius:var(--br,8px);font-size:1rem;font-family:inherit;outline:none;transition:border-color .2s"
        onfocus="this.style.borderColor='var(--c-primary)';this.style.boxShadow='0 0 0 3px color-mix(in srgb,var(--c-primary) 15%,transparent)'"
        onblur="this.style.borderColor='#e5e7eb';this.style.boxShadow='none'">
    </div>
    <button type="submit" class="xd-btn" style="width:100%;padding:.85rem;font-size:1rem;font-weight:700;cursor:pointer;margin-top:.5rem">Sign In</button>
    <p style="text-align:center;font-size:.9rem;opacity:.7;margin-top:.5rem">
      Don&rsquo;t have an account? <a href="/signup" style="color:var(--c-primary);font-weight:600;text-decoration:none">Create one</a>
    </p>
  </form>
</section>`;
  }
  if (pageSlug === 'signup') {
    return `
<section style="max-width:440px;margin:0 auto;padding:clamp(2rem,5vw,4rem) 1rem;min-height:60vh">
  <div style="text-align:center;margin-bottom:2rem">
    <h1 style="font-size:clamp(1.5rem,3vw,2rem);font-weight:800;margin-bottom:.5rem">Create Account</h1>
    <p style="opacity:.6;font-size:.95rem">Join ${siteName} today</p>
  </div>
  <form id="xd-signup-form" style="display:flex;flex-direction:column;gap:1rem" onsubmit="return false">
    <div id="xd-signup-error" style="display:none;background:#fef2f2;color:#dc2626;padding:.75rem 1rem;border-radius:var(--br,8px);font-size:.875rem"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <div style="display:flex;flex-direction:column;gap:.35rem">
        <label for="xd-signup-first" style="font-size:.875rem;font-weight:600">First Name</label>
        <input id="xd-signup-first" type="text" required placeholder="First name"
          style="padding:.75rem 1rem;border:1px solid #e5e7eb;border-radius:var(--br,8px);font-size:1rem;font-family:inherit;outline:none;transition:border-color .2s"
          onfocus="this.style.borderColor='var(--c-primary)';this.style.boxShadow='0 0 0 3px color-mix(in srgb,var(--c-primary) 15%,transparent)'"
          onblur="this.style.borderColor='#e5e7eb';this.style.boxShadow='none'">
      </div>
      <div style="display:flex;flex-direction:column;gap:.35rem">
        <label for="xd-signup-last" style="font-size:.875rem;font-weight:600">Last Name</label>
        <input id="xd-signup-last" type="text" required placeholder="Last name"
          style="padding:.75rem 1rem;border:1px solid #e5e7eb;border-radius:var(--br,8px);font-size:1rem;font-family:inherit;outline:none;transition:border-color .2s"
          onfocus="this.style.borderColor='var(--c-primary)';this.style.boxShadow='0 0 0 3px color-mix(in srgb,var(--c-primary) 15%,transparent)'"
          onblur="this.style.borderColor='#e5e7eb';this.style.boxShadow='none'">
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:.35rem">
      <label for="xd-signup-email" style="font-size:.875rem;font-weight:600">Email</label>
      <input id="xd-signup-email" type="email" required placeholder="you@example.com"
        style="padding:.75rem 1rem;border:1px solid #e5e7eb;border-radius:var(--br,8px);font-size:1rem;font-family:inherit;outline:none;transition:border-color .2s"
        onfocus="this.style.borderColor='var(--c-primary)';this.style.boxShadow='0 0 0 3px color-mix(in srgb,var(--c-primary) 15%,transparent)'"
        onblur="this.style.borderColor='#e5e7eb';this.style.boxShadow='none'">
    </div>
    <div style="display:flex;flex-direction:column;gap:.35rem">
      <label for="xd-signup-phone" style="font-size:.875rem;font-weight:600">Phone Number</label>
      <input id="xd-signup-phone" type="tel" placeholder="+20 XXX XXX XXXX"
        style="padding:.75rem 1rem;border:1px solid #e5e7eb;border-radius:var(--br,8px);font-size:1rem;font-family:inherit;outline:none;transition:border-color .2s"
        onfocus="this.style.borderColor='var(--c-primary)';this.style.boxShadow='0 0 0 3px color-mix(in srgb,var(--c-primary) 15%,transparent)'"
        onblur="this.style.borderColor='#e5e7eb';this.style.boxShadow='none'">
    </div>
    <div style="display:flex;flex-direction:column;gap:.35rem">
      <label for="xd-signup-password" style="font-size:.875rem;font-weight:600">Password</label>
      <input id="xd-signup-password" type="password" required placeholder="At least 6 characters" minlength="6"
        style="padding:.75rem 1rem;border:1px solid #e5e7eb;border-radius:var(--br,8px);font-size:1rem;font-family:inherit;outline:none;transition:border-color .2s"
        onfocus="this.style.borderColor='var(--c-primary)';this.style.boxShadow='0 0 0 3px color-mix(in srgb,var(--c-primary) 15%,transparent)'"
        onblur="this.style.borderColor='#e5e7eb';this.style.boxShadow='none'">
    </div>
    <div style="display:flex;flex-direction:column;gap:.35rem">
      <label for="xd-signup-confirm" style="font-size:.875rem;font-weight:600">Confirm Password</label>
      <input id="xd-signup-confirm" type="password" required placeholder="Confirm your password" minlength="6"
        style="padding:.75rem 1rem;border:1px solid #e5e7eb;border-radius:var(--br,8px);font-size:1rem;font-family:inherit;outline:none;transition:border-color .2s"
        onfocus="this.style.borderColor='var(--c-primary)';this.style.boxShadow='0 0 0 3px color-mix(in srgb,var(--c-primary) 15%,transparent)'"
        onblur="this.style.borderColor='#e5e7eb';this.style.boxShadow='none'">
    </div>
    <button type="submit" class="xd-btn" style="width:100%;padding:.85rem;font-size:1rem;font-weight:700;cursor:pointer;margin-top:.5rem">Create Account</button>
    <p style="text-align:center;font-size:.9rem;opacity:.7;margin-top:.5rem">
      Already have an account? <a href="/signin" style="color:var(--c-primary);font-weight:600;text-decoration:none">Sign in</a>
    </p>
  </form>
</section>`;
  }
  return '<section style="min-height:60vh;padding:4rem;text-align:center"><h1>Page not found</h1></section>';
}

/* ─────────────────────────────────────────────────────────────────────
   MAIN RENDER FUNCTION
───────────────────────────────────────────────────────────────────── */
export function renderSite(site: ISite, pageSlug?: string, opts?: { subdomain?: boolean }): string {
  const { settings, name } = site;
  const globalSeo   = (settings?.seo as Record<string, unknown>) || {};
  const theme       = (settings?.theme as Record<string, unknown>) || {};
  _themeData = theme;
  const analytics   = settings?.analytics;
  const settingsAny = settings as unknown as Record<string, unknown>;
  const customCss   = sanitizeCss(settingsAny?.customCss);
  const currency    = 'SAR';

  // ── Storefront special pages (cart, account, favorites) ────────
  const STOREFRONT_PAGES = new Set(['cart', 'favorites', 'account', 'signin', 'signup']);
  if (pageSlug && STOREFRONT_PAGES.has(pageSlug)) {
    // Set _sfBase for navbar links
    const storefrontBase = opts?.subdomain
      ? ''
      : (site as unknown as Record<string, unknown>).slug
        ? `/${(site as unknown as Record<string, unknown>).slug}`
        : `/site/${(site as unknown as Record<string, unknown>)._id ?? ''}`;
    _sfBase = storefrontBase;
    // Resolve color schemes for navbar/footer rendering
    const rawSchemes = theme.colorSchemes;
    if (rawSchemes) {
      let parsed: unknown = rawSchemes;
      if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch { parsed = null; } }
      if (Array.isArray(parsed) && parsed.length > 0) { _colorSchemes = parsed as ColorScheme[]; }
      else { _colorSchemes = DEFAULT_COLOR_SCHEMES; }
    } else { _colorSchemes = DEFAULT_COLOR_SCHEMES; }
    _btnRadius = theme.borderRadius === 'sharp' ? '0px' : theme.borderRadius === 'pill' ? '9999px' : '8px';

    const pageTitle = pageSlug === 'cart' ? 'Cart' : pageSlug === 'favorites' ? 'Wishlist' : 'Account';
    const bodyHtml = renderStorefrontPage(pageSlug, txt(name));
    return pageShell(site, pageTitle, bodyHtml, '', opts);
  }

  // ── Resolve page ────────────────────────────────────────────────
  let activeSections = site.sections || [];
  let pageSeo: Record<string, unknown> = {};

  if (pageSlug && pageSlug !== 'home' && site.pages?.length) {
    const page = site.pages.find(p => p.slug === pageSlug);
    if (page) {
      activeSections = page.sections?.length ? page.sections : site.sections;
      pageSeo = (page.seo || {}) as Record<string, unknown>;
    }
  }

  const seo = {
    title:       (pageSeo.title       || globalSeo.title       || '') as string,
    description: (pageSeo.description || globalSeo.description || '') as string,
    ogImage:     (pageSeo.ogImage     || globalSeo.ogImage     || '') as string,
    keywords:    (globalSeo.keywords  || []) as string[],
    canonical:   (pageSeo.canonical   || '') as string,
  };

  // ── Resolve color schemes from theme ────────────────────────────
  const rawSchemes = theme.colorSchemes;
  if (rawSchemes) {
    let parsed: unknown = rawSchemes;
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch { parsed = null; }
    }
    if (Array.isArray(parsed) && parsed.length > 0) {
      _colorSchemes = parsed as ColorScheme[];
    } else {
      _colorSchemes = DEFAULT_COLOR_SCHEMES;
    }
  } else {
    _colorSchemes = DEFAULT_COLOR_SCHEMES;
  }
  _btnRadius = theme.borderRadius === 'sharp' ? '0px' : theme.borderRadius === 'pill' ? '9999px' : '8px';
  const btnShadowMap: Record<string, string> = { none: 'none', small: '0 1px 2px rgba(0,0,0,.08)', medium: '0 2px 8px rgba(0,0,0,.12)', large: '0 4px 16px rgba(0,0,0,.16)' };
  const btnPadMap: Record<string, string> = { small: '0.5rem 1rem', medium: '0.75rem 1.5rem', large: '1rem 2rem' };
  const _btnShadow = btnShadowMap[(theme.buttonShadow as string) || 'none'] || 'none';
  const _btnPadding = btnPadMap[(theme.buttonPadding as string) || 'medium'] || '0.75rem 1.5rem';

  // ── Animation style from theme ─────────────────────────────────
  const animStyle = (theme.animationStyle as string) || 'fade-up';
  const animDuration = Number(theme.animationDuration) || 400;
  const revealOnScroll = theme.revealOnScroll !== false && theme.revealOnScroll !== 'false';
  // Build animation override CSS: if not fade-up (default), override .xd-reveal
  let animOverrideCss = '';
  if (!revealOnScroll || animStyle === 'none') {
    animOverrideCss = '.xd-reveal{opacity:1!important;translate:none!important;scale:1!important;transition:none!important}';
  } else if (animStyle !== 'fade-up') {
    const animMap: Record<string, string> = {
      'fade-in': `opacity:0;transition:opacity ${animDuration}ms ease`,
      'slide-left': `opacity:0;translate:-40px 0;transition:opacity ${animDuration}ms ease,translate ${animDuration}ms ease`,
      'slide-right': `opacity:0;translate:40px 0;transition:opacity ${animDuration}ms ease,translate ${animDuration}ms ease`,
      'zoom-in': `opacity:0;scale:.92;transition:opacity ${animDuration}ms ease,scale ${animDuration}ms ease`,
    };
    if (animMap[animStyle]) {
      animOverrideCss = `@media(prefers-reduced-motion:no-preference){.xd-reveal{${animMap[animStyle]}}.xd-reveal.xd-visible{opacity:1;translate:0 0;scale:1}}`;
    }
  } else if (animDuration !== 600) {
    // Custom duration for default fade-up
    animOverrideCss = `@media(prefers-reduced-motion:no-preference){.xd-reveal{transition-duration:${animDuration}ms}}`;
  }

  // ── CSS variables from theme ─────────────────────────────────────
  // Support both the old key names (theme.*Color) and new ThemeContext names (theme.color*)
  const themeVars = `:root{
  --c-primary:${attr((theme.primaryColor   || theme.colorPrimary   || '#27491F') as string)};
  --c-secondary:${attr((theme.secondaryColor || theme.colorSecondary || '#F0CAE1') as string)};
  --c-accent:${attr((theme.accentColor    || theme.colorAccent    || '#FFD300') as string)};
  --c-bg:${attr((theme.backgroundColor   || theme.colorBg        || '#ffffff') as string)};
  --c-text:${attr((theme.textColor        || theme.colorText      || '#171817') as string)};
  --ff:"${attr((theme.fontFamily || theme.fontHeading || 'Inter') as string)}",system-ui,sans-serif;
  --br:${_btnRadius};
  --btn-radius:${_btnRadius};
  --btn-shadow:${_btnShadow};
  --btn-padding:${_btnPadding};
}
/* Color scheme buttons — inherit scheme CSS vars when set */
[style*="--scheme-btn-bg"] .xd-btn,
[style*="--scheme-btn-bg"] .xd-cta-btn,
[style*="--scheme-btn-bg"] button[class*="btn"],
[style*="--scheme-btn-bg"] a[class*="btn"] {
  background-color: var(--scheme-btn-bg, var(--c-primary)) !important;
  color: var(--scheme-btn-label, #fff) !important;
  border-radius: var(--btn-radius, 8px) !important;
}
[style*="--scheme-outline-btn"] .xd-btn-outline,
[style*="--scheme-outline-btn"] a[class*="outline"] {
  background: transparent !important;
  color: var(--scheme-outline-btn, var(--c-primary)) !important;
  border-color: var(--scheme-outline-btn, var(--c-primary)) !important;
  border-radius: var(--btn-radius, 8px) !important;
}`;

  // ── Font loading ─────────────────────────────────────────────────
  const fontFamily  = ((theme.fontFamily || theme.fontHeading || 'Inter') as string).replace(/ /g, '+');
  const fontLink    = fontFamily !== 'Inter'
    ? `<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=${fontFamily}:wght@400;500;600;700;800&display=swap" onload="this.rel='stylesheet'">
<noscript><link href="https://fonts.googleapis.com/css2?family=${fontFamily}:wght@400;500;600;700;800&display=swap" rel="stylesheet"></noscript>`
    : '';

  // Material Icons — loaded async so it never blocks render
  const materialIconsLink = `<link rel="preload" as="style" href="https://fonts.googleapis.com/icon?family=Material+Icons" onload="this.rel='stylesheet'">
<noscript><link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet"></noscript>`;

  // ── Sections ─────────────────────────────────────────────────────
  const sortedSections = [...activeSections]
    .filter(s => !s.hidden)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const bodySections = sortedSections
    .map(s => renderSection(s, txt(name)))
    .join('\n');

  // ── xd-manifest (storefront runtime reads this for live hydration) ──
  const apiBase = (process.env.PUBLIC_API_BASE ?? '/api/public').replace(/\/$/, '');
  const storefrontBase = opts?.subdomain
    ? ''
    : (site as unknown as Record<string, unknown>).slug
      ? `/${(site as unknown as Record<string, unknown>).slug}`
      : `/site/${(site as unknown as Record<string, unknown>)._id ?? ''}`;
  _sfBase = storefrontBase;

  const manifestSections = sortedSections.flatMap(s => {
    const entry = buildSectionManifestEntry(s.id, s.type);
    if (!entry) return [];
    const secData = getSectionData(s);
    const mEntry: Record<string, unknown> = { ...entry };
    // For product-type sections, embed selected IDs so runtime fetches only those
    if (s.type === 'products' || s.type === 'deals') {
      const sel = (secData.selectedProducts as Array<Record<string, unknown>> | undefined) ?? [];
      const selIds = sel.map((p) => String(p.id ?? p.docId ?? '')).filter(Boolean);
      if (selIds.length > 0) mEntry.selectedProductIds = selIds;
    }
    return [mEntry];
  });
  // safeJson: escape </script> so the HTML parser never closes the tag early
  const safeJson = (obj: unknown) =>
    JSON.stringify(obj).replace(/<\/(script)/gi, '<\\/$1');

  const xdManifest = safeJson({
    tenantId: site.tenantId ?? '',
    apiBase,
    storefrontBase,
    currency,
    sections: manifestSections,
  });

  // ── Analytics ───────────────────────────────────────────────────
  const analyticsHead = buildAnalyticsHead(analytics);

  // ── JSON-LD ─────────────────────────────────────────────────────
  const pageTitle = txt(seo.title || name);
  const siteName2 = txt(name);
  const jsonLd    = safeJson({
    '@context': 'https://schema.org',
    '@type':    'WebSite',
    name:       siteName2,
    description: txt(seo.description),
    ...(seo.keywords?.length ? { keywords: seo.keywords.join(', ') } : {}),
  });

  return `<!DOCTYPE html>
<html lang="en" data-xd-currency="${currency}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="index,follow">
<title>${pageTitle}${pageTitle !== siteName2 ? ` | ${siteName2}` : ''}</title>
<meta name="description" content="${attr(seo.description)}">
${seo.keywords?.length ? `<meta name="keywords" content="${attr(seo.keywords.join(', '))}">` : ''}
<link rel="canonical" href="${attr(seo.canonical || site.publicUrl || site.url || '')}">
<meta property="og:type"        content="website">
<meta property="og:site_name"   content="${attr(name)}">
<meta property="og:title"       content="${attr(seo.title || name)}">
<meta property="og:description" content="${attr(seo.description)}">
${seo.ogImage ? `<meta property="og:image" content="${attr(seo.ogImage)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">` : ''}
<meta name="twitter:card"        content="${seo.ogImage ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title"       content="${attr(seo.title || name)}">
<meta name="twitter:description" content="${attr(seo.description)}">
${seo.ogImage ? `<meta name="twitter:image" content="${attr(seo.ogImage)}">` : ''}
<script type="application/ld+json">${jsonLd}</script>
<script id="xd-manifest" type="application/json">${xdManifest}</script>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fontLink}
${materialIconsLink}
${analyticsHead}
<style>${themeVars}${BASE_CSS}${animOverrideCss ? '\n' + animOverrideCss : ''}${customCss ? '\n/* Custom CSS */\n' + customCss : ''}</style>
</head>
<body>
${bodySections}
<script defer>${STOREFRONT_RUNTIME_JS}</script>
</body>
</html>`;
}

/* ─────────────────────────────────────────────────────────────────────
   AI LAYOUT RENDERER
   Converts a validated AiLayout object into a full ISite and renders it.
   Used by POST /api/ai/render-preview and POST /api/sites/:id/apply-ai
───────────────────────────────────────────────────────────────────── */
import type { AiLayout } from '../../../schemas/ai-layout.schema';

/**
 * Strip any HTML tags from AI-supplied string values to prevent XSS.
 * Only applied to string leaves; arrays and objects are recursed.
 */
function stripHtml(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/<[^>]*>/g, '');
  }
  if (Array.isArray(value)) {
    return value.map(stripHtml);
  }
  if (value !== null && typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      cleaned[k] = stripHtml(v);
    }
    return cleaned;
  }
  return value;
}

/**
 * Render a preview HTML page from an AI-generated layout.
 *
 * @param layout   Validated AiLayout (from AiLayoutSchema.parse)
 * @param tenantId Merchant's tenantId (for manifest injection)
 * @param siteName Display name shown in title / footer
 */
export function renderFromLayout(
  layout:   AiLayout,
  tenantId: string,
  siteName  = 'Preview',
): string {
  /* Build a minimal ISite-like object to reuse renderSite() */
  const sections: ISection[] = layout.sections.map((s, i) => ({
    id:      `ai-${i}-${s.type}`,
    type:    s.type,
    data:    (stripHtml(s.data ?? {}) as Record<string, unknown>),
    content: {},
    style:   {},
    hidden:  s.hidden ?? false,
    order:   s.order ?? i,
  }));

  const theme = layout.theme ?? {};

  const fakeSite: Partial<ISite> & { tenantId: string; name: string; sections: ISection[]; pages: []; settings: ISiteSettings } = {
    tenantId,
    businessId: tenantId,
    name:       layout.name ?? siteName,
    sections,
    pages:      [],
    settings: {
      theme: {
        primaryColor:    (theme.primaryColor    ?? '#27491F') as string,
        secondaryColor:  (theme.secondaryColor  ?? '#F0CAE1') as string,
        accentColor:     (theme.accentColor     ?? '#FFD300') as string,
        backgroundColor: (theme.backgroundColor ?? '#ffffff') as string,
        textColor:       (theme.textColor       ?? '#171817') as string,
        fontFamily:      (theme.fontFamily      ?? 'Inter')   as string,
        borderRadius:    (theme.borderRadius    ?? 'rounded') as 'sharp' | 'rounded' | 'pill',
      },
      seo: {
        title:       (layout.seo?.title       ?? siteName),
        description: (layout.seo?.description ?? ''),
        keywords:    (layout.seo?.keywords    ?? []),
      },
    } as ISiteSettings,
  };

  return renderSite(fakeSite as ISite);
}

/* ─────────────────────────────────────────────────────────────────────
   STOREFRONT EXTRA PAGES
   All-products listing and single product detail page.
   Both pages reuse the site's theme, navbar, and footer.
───────────────────────────────────────────────────────────────────── */

type ProductData = Record<string, unknown>;

/** Extract navbar + footer HTML from a site's sections */
function extractShell(site: ISite): { navbar: string; footer: string } {
  const siteName = txt(site.name);
  let navbar = '';
  let footer = '';
  const sections = site.sections || [];
  for (const s of sections) {
    if (s.type === 'banner') {
      navbar += addSectionAttrs(renderBanner(getSectionData(s)), s.id, s.type);
    } else if (s.type === 'navbar') {
      navbar += addSectionAttrs(renderNavbar(getSectionData(s)), s.id, s.type);
    }
    if (s.type === 'footer') {
      footer += addSectionAttrs(renderFooter(getSectionData(s), siteName, _themeData), s.id, s.type);
    }
  }
  return { navbar, footer };
}

/** Shared page shell HTML (head + theme + runtime) */
function pageShell(
  site: ISite,
  title: string,
  bodyHtml: string,
  extraMeta = '',
  opts?: { subdomain?: boolean },
): string {
  const { settings, name } = site;
  const theme   = (settings?.theme as Record<string, unknown>) || {};
  _themeData = theme;
  const themeVars = `:root{
  --c-primary:${attr((theme.primaryColor   || theme.colorPrimary   || '#27491F') as string)};
  --c-secondary:${attr((theme.secondaryColor || theme.colorSecondary || '#F0CAE1') as string)};
  --c-accent:${attr((theme.accentColor    || theme.colorAccent    || '#FFD300') as string)};
  --c-bg:${attr((theme.backgroundColor   || theme.colorBg        || '#ffffff') as string)};
  --c-text:${attr((theme.textColor        || theme.colorText      || '#171817') as string)};
  --ff:"${attr((theme.fontFamily || theme.fontHeading || 'Inter') as string)}",system-ui,sans-serif;
  --br:${theme.borderRadius === 'sharp' ? '0px' : theme.borderRadius === 'pill' ? '9999px' : '8px'};
}`;
  const storefrontBase = opts?.subdomain
    ? ''
    : (site as unknown as Record<string, unknown>).slug
      ? `/${(site as unknown as Record<string, unknown>).slug}`
      : `/site/${(site as unknown as Record<string, unknown>)._id ?? ''}`;
  _sfBase = storefrontBase;
  const safeJson  = (obj: unknown) => JSON.stringify(obj).replace(/<\/(script)/gi, '<\\/$1');
  const apiBase   = (process.env.PUBLIC_API_BASE ?? '/api/public').replace(/\/$/, '');
  const manifest  = safeJson({ tenantId: site.tenantId ?? '', apiBase, storefrontBase, currency: 'SAR', sections: [] });
  const { navbar, footer } = extractShell(site);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${txt(title)} | ${txt(name)}</title>
${extraMeta}
<script id="xd-manifest" type="application/json">${manifest}</script>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/icon?family=Material+Icons" onload="this.rel='stylesheet'">
<noscript><link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet"></noscript>
<style>${themeVars}${BASE_CSS}
.xd-page-hero{padding:clamp(2rem,5vw,4rem) 0;text-align:center;background:color-mix(in srgb,var(--c-primary) 6%,transparent)}
.xd-search-bar{display:flex;gap:.75rem;max-width:560px;margin:1.5rem auto 0;padding:0 1rem}
.xd-search-input{flex:1;padding:.75rem 1rem;border:1px solid #e5e7eb;border-radius:var(--br);font-size:1rem;font-family:inherit;outline:none}
.xd-search-input:focus{border-color:var(--c-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--c-primary) 15%,transparent)}
.xd-breadcrumb{display:flex;align-items:center;gap:.5rem;font-size:.875rem;opacity:.65;margin-bottom:1.5rem;flex-wrap:wrap}
.xd-breadcrumb a{color:inherit;text-decoration:none}.xd-breadcrumb a:hover{text-decoration:underline}
.xd-pd-grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2rem,5vw,4rem);align-items:start}
@media(max-width:768px){.xd-pd-grid{grid-template-columns:1fr}}
.xd-pd-images{display:flex;flex-direction:column;gap:.75rem}
.xd-pd-main-img{aspect-ratio:1;width:100%;object-fit:cover;border-radius:var(--br);background:#f9f9f9}
.xd-pd-thumbs{display:flex;gap:.5rem;flex-wrap:wrap}
.xd-pd-thumb{width:72px;height:72px;object-fit:cover;border-radius:6px;cursor:pointer;border:2px solid transparent;transition:border-color .2s}
.xd-pd-thumb:hover,.xd-pd-thumb.active{border-color:var(--c-primary)}
.xd-pd-info{display:flex;flex-direction:column;gap:1.25rem}
.xd-pd-name{font-size:clamp(1.5rem,3vw,2rem);font-weight:800;line-height:1.2}
.xd-pd-price-row{display:flex;align-items:center;gap:.75rem}
.xd-pd-price{font-size:1.75rem;font-weight:800;color:var(--c-primary)}
.xd-pd-compare{font-size:1.1rem;text-decoration:line-through;opacity:.45}
.xd-pd-badge{background:#ef4444;color:#fff;font-size:.75rem;font-weight:700;padding:.2rem .6rem;border-radius:999px}
.xd-pd-desc{font-size:.975rem;line-height:1.75;opacity:.8}
.xd-pd-variants{display:flex;flex-direction:column;gap:.75rem}
.xd-pd-variants-label{font-weight:600;font-size:.9rem}
.xd-pd-variant-grid{display:flex;gap:.5rem;flex-wrap:wrap}
.xd-pd-variant{padding:.4rem .9rem;border:1px solid #e5e7eb;border-radius:6px;font-size:.875rem;cursor:pointer;transition:all .2s}
.xd-pd-variant:hover{border-color:var(--c-primary)}
.xd-pd-variant.selected{background:var(--c-primary);color:#fff;border-color:var(--c-primary)}
.xd-pd-variant.oos{opacity:.4;cursor:not-allowed;text-decoration:line-through}
.xd-pd-qty{display:flex;align-items:center;gap:.75rem}
.xd-pd-qty-btn{width:36px;height:36px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;font-size:1.25rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
.xd-pd-qty-btn:hover{border-color:var(--c-primary);color:var(--c-primary)}
.xd-pd-qty-val{font-weight:700;font-size:1.1rem;min-width:1.5rem;text-align:center}
.xd-pd-atc{width:100%;padding:1rem;font-size:1.05rem;margin-top:.5rem}
.xd-pd-meta{font-size:.85rem;opacity:.55;display:flex;flex-direction:column;gap:.3rem}
</style>
</head>
<body style="display:flex;flex-direction:column;min-height:100vh;margin:0">
${navbar}
<main style="flex:1">${bodyHtml}</main>
${footer}
<script defer>${STOREFRONT_RUNTIME_JS}</script>
</body>
</html>`;
}

/**
 * Render the "All Products" storefront page.
 * Shows a searchable, filterable grid of products from the tenant's inventory.
 */
export function renderAllProductsPage(
  site: ISite,
  products: ProductData[],
  total = 0,
  page  = 1,
  opts?: { subdomain?: boolean },
): string {
  const sfBase = opts?.subdomain
    ? ''
    : (site as unknown as Record<string, unknown>).slug
      ? `/${(site as unknown as Record<string, unknown>).slug}`
      : `/site/${(site as unknown as Record<string, unknown>)._id ?? ''}`;

  const cards = products.map(p => {
    const onSale  = p.onSale || (p.salePrice && Number(p.salePrice) < Number(p.price));
    const display = p.sellingPrice || p.salePrice || p.price;
    const detailHref = `${sfBase}/products/${attr(p.id as string)}`;
    return `
    <div class="xd-product-card xd-reveal" data-item-id="${attr(p.id as string)}">
      <a href="${detailHref}" class="xd-product-img-wrap" style="text-decoration:none;display:block">
        <img src="${attr(p.image as string, 'https://placehold.co/400/f5f5f5/999?text=Product')}" alt="${attr(p.name as string)}" loading="lazy" decoding="async" width="400" height="400">
        ${onSale ? '<span class="xd-product-badge">Sale</span>' : ''}
      </a>
      <div class="xd-product-body">
        <a href="${detailHref}" class="xd-product-name" style="text-decoration:none;color:inherit">${txt(p.name as string)}</a>
        ${display ? `<div><span class="xd-product-price">${txt(display)} SAR</span>${onSale ? `<span class="xd-product-compare">${txt(p.price)} SAR</span>` : ''}</div>` : ''}
        <a href="${detailHref}" class="xd-btn xd-btn-primary xd-btn-sm xd-product-btn xd-btn-full"
           data-xd-atc data-xd-product-id="${attr(p.id as string)}"
           data-xd-product-name="${attr(p.name as string)}"
           data-xd-price="${attr(String(p.price || 0))}">Add to Cart</a>
      </div>
    </div>`;
  }).join('');

  const limit = 20;
  const totalPages = Math.ceil(total / limit);
  const paginationLinks = totalPages > 1 ? `
    <div style="display:flex;justify-content:center;gap:.5rem;margin-top:3rem;flex-wrap:wrap">
      ${Array.from({ length: totalPages }, (_, i) => {
        const p2 = i + 1;
        const active = p2 === page;
        return `<a href="${sfBase}/products?page=${p2}" class="xd-btn xd-btn-sm ${active ? 'xd-btn-primary' : 'xd-btn-secondary'}">${p2}</a>`;
      }).join('')}
    </div>` : '';

  const emptyState = products.length === 0
    ? `<div style="text-align:center;padding:4rem 0;opacity:.5">
         <span class="material-icons" style="font-size:4rem;display:block;margin-bottom:1rem">inventory_2</span>
         <p style="font-size:1.1rem">No products found</p>
       </div>` : '';

  const body = `
<div class="xd-page-hero">
  <div class="xd-container">
    <h1 class="xd-h2">All Products</h1>
    <p class="xd-lead" style="opacity:.7;margin-inline:auto">${txt(total)} products available</p>
    <form class="xd-search-bar" action="${sfBase}/products" method="get">
      <input class="xd-search-input" type="search" name="search" placeholder="Search products…" autocomplete="off">
      <button class="xd-btn xd-btn-primary" type="submit">Search</button>
    </form>
  </div>
</div>
<section class="xd-section">
<div class="xd-container">
  <nav class="xd-breadcrumb" aria-label="Breadcrumb">
    <a href="${sfBase}">Home</a><span>›</span><span>All Products</span>
  </nav>
  <div class="xd-grid-3" data-xd-grid>
    ${cards}
    ${emptyState}
  </div>
  ${paginationLinks}
</div>
</section>`;

  return pageShell(site, 'All Products', body, '', opts);
}

/**
 * Render a single product detail page.
 */
export function renderProductDetailPage(site: ISite, product: ProductData, opts?: { subdomain?: boolean }): string {
  const sfBase = opts?.subdomain
    ? ''
    : (site as unknown as Record<string, unknown>).slug
      ? `/${(site as unknown as Record<string, unknown>).slug}`
      : `/site/${(site as unknown as Record<string, unknown>)._id ?? ''}`;

  const name      = txt(product.name as string || 'Product');
  const price     = product.sellingPrice || product.salePrice || product.price;
  const compare   = product.compareAtPrice || (product.onSale ? product.price : null);
  const onSale    = product.onSale || (product.salePrice && Number(product.salePrice) < Number(product.price));
  const images    = (product.images as string[]) || (product.image ? [product.image as string] : []);
  const mainImg   = images[0] || 'https://placehold.co/600/f5f5f5/999?text=Product';
  const stock     = (product.stock as Record<string, number>) || {};
  const variants  = Object.keys(stock);
  const desc      = txt(product.description as string || '');
  const pid       = attr(product.id as string || product.docId as string || '');
  const sku       = product.sku ? `<span>SKU: ${txt(product.sku as string)}</span>` : '';

  const thumbs = images.length > 1
    ? `<div class="xd-pd-thumbs">
        ${images.map((img, i) =>
          `<img src="${attr(img)}" alt="${name} image ${i + 1}" class="xd-pd-thumb${i === 0 ? ' active' : ''}"
               loading="lazy" onclick="
                 document.getElementById('xd-pd-main').src=this.src;
                 document.querySelectorAll('.xd-pd-thumb').forEach(function(t){t.classList.remove('active')});
                 this.classList.add('active');">`
        ).join('')}
      </div>` : '';

  const variantHtml = variants.length > 0 ? `
    <div class="xd-pd-variants">
      <span class="xd-pd-variants-label">Select Size</span>
      <div class="xd-pd-variant-grid">
        ${variants.map(v => {
          const qty = stock[v] || 0;
          return `<button type="button" class="xd-pd-variant${qty <= 0 ? ' oos' : ''}"
            onclick="if(!this.classList.contains('oos')){document.querySelectorAll('.xd-pd-variant').forEach(function(b){b.classList.remove('selected')});this.classList.add('selected');document.getElementById('xd-pd-atc').setAttribute('data-xd-variant',this.textContent.trim());}"
            ${qty <= 0 ? 'disabled' : ''}>${txt(v)}${qty <= 0 ? ' (OOS)' : ''}</button>`;
        }).join('')}
      </div>
    </div>` : '';

  const safeJson = (obj: unknown) => JSON.stringify(obj).replace(/<\/(script)/gi, '<\\/$1');
  const ldJson = safeJson({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: String(product.name || ''),
    description: String(product.description || ''),
    image: images,
    offers: {
      '@type': 'Offer',
      price: String(price || 0),
      priceCurrency: 'SAR',
      availability: variants.length === 0 || Object.values(stock).some(q => q > 0)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  });

  const body = `
<script type="application/ld+json">${ldJson}</script>
<section class="xd-section">
<div class="xd-container">
  <nav class="xd-breadcrumb" aria-label="Breadcrumb">
    <a href="${sfBase}">Home</a><span>›</span>
    <a href="${sfBase}/products">Products</a><span>›</span>
    <span>${name}</span>
  </nav>
  <div class="xd-pd-grid">
    <!-- Images -->
    <div class="xd-pd-images">
      <img id="xd-pd-main" src="${attr(mainImg)}" alt="${name}" class="xd-pd-main-img" width="600" height="600">
      ${thumbs}
    </div>
    <!-- Info -->
    <div class="xd-pd-info">
      <h1 class="xd-pd-name">${name}</h1>
      <div class="xd-pd-price-row">
        <span class="xd-pd-price">${txt(price)} SAR</span>
        ${onSale && compare ? `<span class="xd-pd-compare">${txt(compare)} SAR</span><span class="xd-pd-badge">Sale</span>` : ''}
      </div>
      ${desc ? `<p class="xd-pd-desc">${desc}</p>` : ''}
      ${variantHtml}
      <div class="xd-pd-qty" id="xd-pd-qty">
        <button type="button" class="xd-pd-qty-btn" aria-label="Decrease" onclick="var v=document.getElementById('xd-pd-qty-val');v.textContent=Math.max(1,parseInt(v.textContent)-1)">−</button>
        <span id="xd-pd-qty-val" class="xd-pd-qty-val">1</span>
        <button type="button" class="xd-pd-qty-btn" aria-label="Increase" onclick="var v=document.getElementById('xd-pd-qty-val');v.textContent=parseInt(v.textContent)+1">+</button>
      </div>
      <a id="xd-pd-atc" href="#"
         class="xd-btn xd-btn-primary xd-pd-atc"
         data-xd-atc
         data-xd-product-id="${pid}"
         data-xd-product-name="${attr(product.name as string)}"
         data-xd-price="${attr(String(price || 0))}">
        <span class="material-icons" aria-hidden="true" style="font-size:1.2rem">shopping_cart</span>
        Add to Cart
      </a>
      <div class="xd-pd-meta">
        ${sku}
        ${product.collectionId ? `<span>Collection: ${txt(product.collectionId as string)}</span>` : ''}
      </div>
    </div>
  </div>
</div>
</section>`;

  return pageShell(site, String(product.name || 'Product'), body,
    `<meta name="description" content="${attr(String(product.description || '').slice(0, 160))}">
<meta property="og:type" content="product">
<meta property="og:title" content="${attr(String(product.name || ''))}">
${mainImg ? `<meta property="og:image" content="${attr(mainImg)}">` : ''}`, opts);
}
