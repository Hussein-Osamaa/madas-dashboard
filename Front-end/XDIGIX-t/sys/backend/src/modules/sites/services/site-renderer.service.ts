import type { ISite, ISection } from '../../../schemas/site.schema';

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
function attr(value: unknown, fallback = ''): string {
  if (value == null || value === '') return fallback;
  return String(value).replace(/"/g, '&quot;');
}
function txt(value: unknown, fallback = ''): string {
  if (value == null || value === '') return fallback;
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

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
export function renderSite(site: ISite): string {
  const { settings, name } = site;
  const seo = settings?.seo || {};
  const theme = settings?.theme || {};

  // Override CSS variables per site theme
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

  // Google Fonts link if custom font
  const fontFamily = (theme.fontFamily || 'Inter').replace(/ /g, '+');
  const fontLink = fontFamily !== 'Inter'
    ? `<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=${fontFamily}:wght@400;600;700;800&display=swap" rel="stylesheet">`
    : '';

  // Announcement bar (if any)
  const annSec = findAnnouncement(site.sections);
  const hasAnnouncement = annSec && (annSec.content as Record<string,unknown>).enabled;

  // All sections except announcement (rendered separately at top)
  const bodySections = site.sections
    .filter(s => !s.hidden && s.type !== 'announcement')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(renderSection)
    .join('\n');

  const ogImage = seo.ogImage || '';
  const pageTitle = `${txt(seo.title || name)} | ${txt(name)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${pageTitle}</title>
<meta name="description" content="${attr(seo.description || '')}">
${seo.keywords?.length ? `<meta name="keywords" content="${attr(seo.keywords.join(', '))}">` : ''}
<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:title" content="${attr(seo.title || name)}">
<meta property="og:description" content="${attr(seo.description || '')}">
${ogImage ? `<meta property="og:image" content="${attr(ogImage)}">` : ''}
<!-- Twitter Card -->
<meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${attr(seo.title || name)}">
<meta name="twitter:description" content="${attr(seo.description || '')}">
${ogImage ? `<meta name="twitter:image" content="${attr(ogImage)}">` : ''}
<!-- JSON-LD -->
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"${attr(name)}","description":"${attr(seo.description || '')}"}</script>
${fontLink}
<style>${themeVars}${BASE_CSS}</style>
</head>
<body>
${hasAnnouncement ? renderSection(annSec!) : ''}
${bodySections}
</body>
</html>`;
}
