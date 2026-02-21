/**
 * Multi-Tenant Request Routing Service
 * 
 * Handles incoming requests and routes them to the correct tenant's website.
 * Supports custom domains, default subdomains, and direct site URLs.
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { CustomDomain, DomainStatus, PublishedSite, SiteSection } from './types';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ============================================
// Configuration
// ============================================

const config = {
  platformName: process.env.PLATFORM_NAME || 'MADAS',
  platformDomain: process.env.PLATFORM_DOMAIN || 'madas-sites-c3c5e.web.app',
  dashboardDomain: process.env.DASHBOARD_DOMAIN || 'madas-store.web.app',
  
  // Cache settings
  cacheTTL: 300, // 5 minutes for HTML
  staticCacheTTL: 86400, // 24 hours for static assets
  
  // Error page settings
  errorPageBranding: true,
};

// In-memory cache for domain lookups (reduces Firestore reads)
const domainCache = new Map<string, {
  data: { tenantId: string; siteId: string; site: PublishedSite } | null;
  expiry: number;
}>();

const CACHE_TTL = 60000; // 1 minute cache

// ============================================
// Utility Functions
// ============================================

/**
 * Check if hostname is a known platform domain
 */
function isPlatformDomain(hostname: string): boolean {
  const platformDomains = [
    config.platformDomain,
    config.dashboardDomain,
    'localhost',
    '127.0.0.1',
  ];
  return platformDomains.some(d => hostname.includes(d));
}

/**
 * Get cached domain data or fetch from Firestore
 */
async function getCachedDomainData(domain: string): Promise<{
  tenantId: string;
  siteId: string;
  site: PublishedSite;
} | null> {
  const cached = domainCache.get(domain);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  
  // Fetch from Firestore
  const result = await lookupDomainData(domain);
  
  // Cache the result
  domainCache.set(domain, {
    data: result,
    expiry: Date.now() + CACHE_TTL,
  });
  
  return result;
}

/**
 * Lookup domain data from Firestore
 */
async function lookupDomainData(domain: string): Promise<{
  tenantId: string;
  siteId: string;
  site: PublishedSite;
} | null> {
  try {
    // Query customDomains collection
    const domainQuery = await db
      .collection('customDomains')
      .where('domain', '==', domain.toLowerCase())
      .where('status', 'in', ['active', 'ssl_pending', 'verified'])
      .limit(1)
      .get();
    
    if (domainQuery.empty) {
      return null;
    }
    
    const domainData = domainQuery.docs[0].data() as CustomDomain;
    
    // Fetch the site data
    const siteDoc = await db
      .collection('businesses')
      .doc(domainData.tenantId)
      .collection('published_sites')
      .doc(domainData.siteId)
      .get();
    
    if (!siteDoc.exists) {
      return null;
    }
    
    return {
      tenantId: domainData.tenantId,
      siteId: domainData.siteId,
      site: { id: siteDoc.id, ...siteDoc.data() } as PublishedSite,
    };
  } catch (error) {
    console.error(`[lookupDomainData] Error for ${domain}:`, error);
    return null;
  }
}

/**
 * Lookup site by ID (for /site/:id URLs)
 */
async function lookupSiteById(siteId: string): Promise<{
  tenantId: string;
  siteId: string;
  site: PublishedSite;
} | null> {
  try {
    // Search across all businesses for the site
    const businessesSnapshot = await db.collection('businesses').get();
    
    for (const businessDoc of businessesSnapshot.docs) {
      const siteDoc = await db
        .collection('businesses')
        .doc(businessDoc.id)
        .collection('published_sites')
        .doc(siteId)
        .get();
      
      if (siteDoc.exists) {
        return {
          tenantId: businessDoc.id,
          siteId: siteDoc.id,
          site: { id: siteDoc.id, ...siteDoc.data() } as PublishedSite,
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`[lookupSiteById] Error for ${siteId}:`, error);
    return null;
  }
}

/**
 * Lookup site by tenant subdomain
 */
async function lookupSiteBySubdomain(subdomain: string): Promise<{
  tenantId: string;
  siteId: string;
  site: PublishedSite;
} | null> {
  try {
    // Find business with this subdomain/slug
    const businessQuery = await db
      .collection('businesses')
      .where('slug', '==', subdomain.toLowerCase())
      .limit(1)
      .get();
    
    if (businessQuery.empty) {
      return null;
    }
    
    const businessId = businessQuery.docs[0].id;
    
    // Get the first published site (or primary site)
    const sitesQuery = await db
      .collection('businesses')
      .doc(businessId)
      .collection('published_sites')
      .orderBy('publishedAt', 'desc')
      .limit(1)
      .get();
    
    if (sitesQuery.empty) {
      return null;
    }
    
    const siteDoc = sitesQuery.docs[0];
    
    return {
      tenantId: businessId,
      siteId: siteDoc.id,
      site: { id: siteDoc.id, ...siteDoc.data() } as PublishedSite,
    };
  } catch (error) {
    console.error(`[lookupSiteBySubdomain] Error for ${subdomain}:`, error);
    return null;
  }
}

// ============================================
// HTML Generation
// ============================================

/**
 * Generate the HTML for a published site
 */
function generateSiteHTML(site: PublishedSite, baseUrl: string): string {
  const metadata = site.metadata || { title: site.name };
  const sections = site.sections || [];
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(metadata.description || '')}">
  <title>${escapeHtml(metadata.title || site.name)}</title>
  
  <!-- Open Graph -->
  <meta property="og:title" content="${escapeHtml(metadata.title || site.name)}">
  <meta property="og:description" content="${escapeHtml(metadata.description || '')}">
  ${metadata.ogImage ? `<meta property="og:image" content="${escapeHtml(metadata.ogImage)}">` : ''}
  <meta property="og:type" content="website">
  <meta property="og:url" content="${baseUrl}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  
  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/favicon.ico">
  ${metadata.favicon ? `<link rel="icon" href="${escapeHtml(metadata.favicon)}">` : ''}
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- Base Styles -->
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1a1a2e;
      background: #ffffff;
      -webkit-font-smoothing: antialiased;
    }
    img { max-width: 100%; height: auto; display: block; }
    a { text-decoration: none; color: inherit; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    
    /* Section Base Styles */
    section { padding: 80px 0; }
    
    /* Hero Section */
    .hero {
      min-height: 90vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .hero h1 { font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 700; margin-bottom: 1rem; }
    .hero p { font-size: 1.25rem; opacity: 0.9; max-width: 600px; margin: 0 auto 2rem; }
    .hero-button {
      display: inline-block;
      padding: 16px 32px;
      background: white;
      color: #667eea;
      border-radius: 8px;
      font-weight: 600;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .hero-button:hover { transform: translateY(-2px); box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
    
    /* Features Section */
    .features { background: #f8f9fa; }
    .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 32px; }
    .feature-card {
      background: white;
      padding: 32px;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    }
    .feature-icon { font-size: 2.5rem; margin-bottom: 16px; }
    .feature-card h3 { font-size: 1.25rem; margin-bottom: 12px; }
    .feature-card p { color: #666; }
    
    /* Gallery Section */
    .gallery-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; }
    .gallery-item { border-radius: 12px; overflow: hidden; aspect-ratio: 1; }
    .gallery-item img { width: 100%; height: 100%; object-fit: cover; }
    
    /* Testimonials */
    .testimonials { background: #1a1a2e; color: white; }
    .testimonial-card { background: rgba(255,255,255,0.05); padding: 32px; border-radius: 16px; }
    .testimonial-card blockquote { font-size: 1.125rem; margin-bottom: 16px; font-style: italic; }
    .testimonial-author { display: flex; align-items: center; gap: 12px; }
    .testimonial-author img { width: 48px; height: 48px; border-radius: 50%; }
    
    /* CTA Section */
    .cta {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
    }
    .cta h2 { font-size: 2.5rem; margin-bottom: 16px; }
    .cta p { font-size: 1.25rem; opacity: 0.9; margin-bottom: 32px; }
    
    /* Contact Section */
    .contact-form { max-width: 600px; margin: 0 auto; }
    .form-group { margin-bottom: 24px; }
    .form-group label { display: block; margin-bottom: 8px; font-weight: 500; }
    .form-group input, .form-group textarea {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }
    .form-group input:focus, .form-group textarea:focus {
      outline: none;
      border-color: #667eea;
    }
    .submit-button {
      width: 100%;
      padding: 16px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .submit-button:hover { background: #5a67d8; }
    
    /* Footer */
    footer { background: #1a1a2e; color: white; padding: 48px 0 24px; }
    .footer-content { text-align: center; }
    .footer-links { display: flex; justify-content: center; gap: 24px; margin-bottom: 24px; flex-wrap: wrap; }
    .footer-links a { opacity: 0.7; transition: opacity 0.2s; }
    .footer-links a:hover { opacity: 1; }
    .footer-copyright { opacity: 0.5; font-size: 0.875rem; }
    
    /* Products Grid */
    .products-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    .product-card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .product-image { aspect-ratio: 1; overflow: hidden; }
    .product-image img { width: 100%; height: 100%; object-fit: cover; }
    .product-info { padding: 20px; }
    .product-name { font-weight: 600; margin-bottom: 8px; }
    .product-price { color: #667eea; font-weight: 700; font-size: 1.25rem; }
    
    /* Responsive */
    @media (max-width: 768px) {
      section { padding: 60px 0; }
      .hero { min-height: 80vh; }
    }
  </style>
  
  <!-- Custom Styles -->
  ${(metadata.styles || []).map(s => `<style>${s}</style>`).join('\n')}
</head>
<body>
  ${renderSections(sections)}
  
  <!-- Footer -->
  <footer>
    <div class="container">
      <div class="footer-content">
        <div class="footer-links">
          <a href="#">Home</a>
          <a href="#">About</a>
          <a href="#">Contact</a>
          <a href="#">Privacy Policy</a>
        </div>
        <p class="footer-copyright">© ${new Date().getFullYear()} ${escapeHtml(site.name)}. All rights reserved.</p>
      </div>
    </div>
  </footer>
  
  <!-- Scripts -->
  ${(metadata.scripts || []).map(s => `<script>${s}</script>`).join('\n')}
</body>
</html>`;
}

/**
 * Render all sections
 */
function renderSections(sections: SiteSection[]): string {
  return sections
    .sort((a, b) => a.order - b.order)
    .map(section => renderSection(section))
    .join('\n');
}

/**
 * Render a single section based on its type
 */
function renderSection(section: SiteSection): string {
  const data = section.data || {};
  const style = section.style || {};
  
  switch (section.type) {
    case 'hero':
      return renderHeroSection(data, style);
    case 'features':
      return renderFeaturesSection(data, style);
    case 'gallery':
      return renderGallerySection(data, style);
    case 'testimonials':
      return renderTestimonialsSection(data, style);
    case 'cta':
      return renderCtaSection(data, style);
    case 'contact':
      return renderContactSection(data, style);
    case 'products':
      return renderProductsSection(data, style);
    case 'text':
      return renderTextSection(data, style);
    case 'image':
      return renderImageSection(data, style);
    case 'video':
      return renderVideoSection(data, style);
    case 'divider':
      return renderDividerSection(data, style);
    case 'html':
      return data.content as string || '';
    default:
      return `<!-- Unknown section type: ${section.type} -->`;
  }
}

function renderHeroSection(data: Record<string, unknown>, style: Record<string, unknown>): string {
  const bgStyle = style.backgroundImage 
    ? `background-image: url('${style.backgroundImage}'); background-size: cover; background-position: center;`
    : style.backgroundColor
      ? `background: ${style.backgroundColor};`
      : '';
  
  return `
  <section class="hero" style="${bgStyle}">
    <div class="container">
      <h1>${escapeHtml(data.title as string || 'Welcome')}</h1>
      <p>${escapeHtml(data.subtitle as string || '')}</p>
      ${data.buttonText ? `<a href="${escapeHtml(data.buttonLink as string || '#')}" class="hero-button">${escapeHtml(data.buttonText as string)}</a>` : ''}
    </div>
  </section>`;
}

function renderFeaturesSection(data: Record<string, unknown>, style: Record<string, unknown>): string {
  const features = (data.features as Array<{ icon: string; title: string; description: string }>) || [];
  return `
  <section class="features" style="${style.backgroundColor ? `background: ${style.backgroundColor};` : ''}">
    <div class="container">
      ${data.title ? `<h2 style="text-align: center; margin-bottom: 48px; font-size: 2rem;">${escapeHtml(data.title as string)}</h2>` : ''}
      <div class="features-grid">
        ${features.map(f => `
          <div class="feature-card">
            <div class="feature-icon">${f.icon || '✨'}</div>
            <h3>${escapeHtml(f.title)}</h3>
            <p>${escapeHtml(f.description)}</p>
          </div>
        `).join('')}
      </div>
    </div>
  </section>`;
}

function renderGallerySection(data: Record<string, unknown>, style: Record<string, unknown>): string {
  const images = (data.images as string[]) || [];
  return `
  <section class="gallery" style="${style.backgroundColor ? `background: ${style.backgroundColor};` : ''}">
    <div class="container">
      ${data.title ? `<h2 style="text-align: center; margin-bottom: 48px; font-size: 2rem;">${escapeHtml(data.title as string)}</h2>` : ''}
      <div class="gallery-grid">
        ${images.map(img => `
          <div class="gallery-item">
            <img src="${escapeHtml(img)}" alt="Gallery image" loading="lazy">
          </div>
        `).join('')}
      </div>
    </div>
  </section>`;
}

function renderTestimonialsSection(data: Record<string, unknown>, style: Record<string, unknown>): string {
  const testimonials = (data.testimonials as Array<{ quote: string; name: string; title: string; image?: string }>) || [];
  return `
  <section class="testimonials" style="${style.backgroundColor ? `background: ${style.backgroundColor};` : ''}">
    <div class="container">
      ${data.title ? `<h2 style="text-align: center; margin-bottom: 48px; font-size: 2rem;">${escapeHtml(data.title as string)}</h2>` : ''}
      <div class="features-grid">
        ${testimonials.map(t => `
          <div class="testimonial-card">
            <blockquote>"${escapeHtml(t.quote)}"</blockquote>
            <div class="testimonial-author">
              ${t.image ? `<img src="${escapeHtml(t.image)}" alt="${escapeHtml(t.name)}">` : ''}
              <div>
                <strong>${escapeHtml(t.name)}</strong>
                ${t.title ? `<div style="opacity: 0.7; font-size: 0.875rem;">${escapeHtml(t.title)}</div>` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>`;
}

function renderCtaSection(data: Record<string, unknown>, style: Record<string, unknown>): string {
  return `
  <section class="cta" style="${style.backgroundColor ? `background: ${style.backgroundColor};` : ''}">
    <div class="container">
      <h2>${escapeHtml(data.title as string || 'Ready to get started?')}</h2>
      <p>${escapeHtml(data.description as string || '')}</p>
      ${data.buttonText ? `<a href="${escapeHtml(data.buttonLink as string || '#')}" class="hero-button">${escapeHtml(data.buttonText as string)}</a>` : ''}
    </div>
  </section>`;
}

function renderContactSection(data: Record<string, unknown>, style: Record<string, unknown>): string {
  return `
  <section class="contact" style="${style.backgroundColor ? `background: ${style.backgroundColor};` : ''}">
    <div class="container">
      ${data.title ? `<h2 style="text-align: center; margin-bottom: 48px; font-size: 2rem;">${escapeHtml(data.title as string)}</h2>` : ''}
      <form class="contact-form" action="${escapeHtml(data.formAction as string || '#')}" method="POST">
        <div class="form-group">
          <label for="name">Name</label>
          <input type="text" id="name" name="name" required>
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required>
        </div>
        <div class="form-group">
          <label for="message">Message</label>
          <textarea id="message" name="message" rows="5" required></textarea>
        </div>
        <button type="submit" class="submit-button">${escapeHtml(data.buttonText as string || 'Send Message')}</button>
      </form>
    </div>
  </section>`;
}

function renderProductsSection(data: Record<string, unknown>, style: Record<string, unknown>): string {
  const products = (data.products as Array<{ name: string; price: string; image: string; link?: string }>) || [];
  return `
  <section class="products" style="${style.backgroundColor ? `background: ${style.backgroundColor};` : ''}">
    <div class="container">
      ${data.title ? `<h2 style="text-align: center; margin-bottom: 48px; font-size: 2rem;">${escapeHtml(data.title as string)}</h2>` : ''}
      <div class="products-grid">
        ${products.map(p => `
          <div class="product-card">
            <div class="product-image">
              <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">
            </div>
            <div class="product-info">
              <div class="product-name">${escapeHtml(p.name)}</div>
              <div class="product-price">${escapeHtml(p.price)}</div>
              ${p.link ? `<a href="${escapeHtml(p.link)}" class="hero-button" style="margin-top: 16px; display: block; text-align: center;">View</a>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>`;
}

function renderTextSection(data: Record<string, unknown>, style: Record<string, unknown>): string {
  return `
  <section style="${style.backgroundColor ? `background: ${style.backgroundColor};` : ''}">
    <div class="container">
      ${data.title ? `<h2 style="margin-bottom: 24px; font-size: 2rem;">${escapeHtml(data.title as string)}</h2>` : ''}
      <div style="max-width: 800px; ${style.textAlign ? `text-align: ${style.textAlign};` : ''}">${data.content as string || ''}</div>
    </div>
  </section>`;
}

function renderImageSection(data: Record<string, unknown>, style: Record<string, unknown>): string {
  return `
  <section style="${style.backgroundColor ? `background: ${style.backgroundColor};` : ''}">
    <div class="container" style="text-align: center;">
      <img src="${escapeHtml(data.src as string || '')}" alt="${escapeHtml(data.alt as string || '')}" style="border-radius: 16px; max-width: ${style.maxWidth || '100%'};">
      ${data.caption ? `<p style="margin-top: 16px; opacity: 0.7;">${escapeHtml(data.caption as string)}</p>` : ''}
    </div>
  </section>`;
}

function renderVideoSection(data: Record<string, unknown>, style: Record<string, unknown>): string {
  const videoUrl = data.url as string || '';
  const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
  const isVimeo = videoUrl.includes('vimeo.com');
  
  let embedUrl = videoUrl;
  if (isYouTube) {
    const videoId = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
    embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : videoUrl;
  } else if (isVimeo) {
    const videoId = videoUrl.match(/vimeo\.com\/(\d+)/)?.[1];
    embedUrl = videoId ? `https://player.vimeo.com/video/${videoId}` : videoUrl;
  }
  
  return `
  <section style="${style.backgroundColor ? `background: ${style.backgroundColor};` : ''}">
    <div class="container">
      ${data.title ? `<h2 style="text-align: center; margin-bottom: 32px; font-size: 2rem;">${escapeHtml(data.title as string)}</h2>` : ''}
      <div style="aspect-ratio: 16/9; border-radius: 16px; overflow: hidden;">
        <iframe src="${escapeHtml(embedUrl)}" style="width: 100%; height: 100%; border: none;" allowfullscreen></iframe>
      </div>
    </div>
  </section>`;
}

function renderDividerSection(data: Record<string, unknown>, style: Record<string, unknown>): string {
  return `<hr style="border: none; border-top: 1px solid ${style.color || '#e0e0e0'}; margin: ${style.margin || '48px auto'}; max-width: ${style.width || '100%'};">`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================
// Error Pages
// ============================================

function generateErrorPage(
  statusCode: number,
  title: string,
  message: string,
  suggestion?: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${statusCode} - ${escapeHtml(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      padding: 24px;
    }
    .error-container { text-align: center; max-width: 500px; }
    .error-code {
      font-size: 8rem;
      font-weight: 700;
      opacity: 0.1;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 0;
    }
    .error-content { position: relative; z-index: 1; }
    .error-icon { font-size: 4rem; margin-bottom: 24px; }
    h1 { font-size: 2rem; margin-bottom: 16px; }
    p { opacity: 0.7; line-height: 1.6; margin-bottom: 24px; }
    .suggestion { background: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px; font-size: 0.875rem; }
    .home-link {
      display: inline-block;
      margin-top: 32px;
      padding: 12px 24px;
      background: white;
      color: #1a1a2e;
      border-radius: 8px;
      font-weight: 600;
      transition: transform 0.2s;
    }
    .home-link:hover { transform: translateY(-2px); }
  </style>
</head>
<body>
  <div class="error-code">${statusCode}</div>
  <div class="error-container">
    <div class="error-content">
      <div class="error-icon">${statusCode === 404 ? '🔍' : statusCode === 503 ? '🔧' : '⚠️'}</div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      ${suggestion ? `<div class="suggestion">${escapeHtml(suggestion)}</div>` : ''}
      <a href="/" class="home-link">Go Home</a>
    </div>
  </div>
</body>
</html>`;
}

// ============================================
// Main Request Handler
// ============================================

/**
 * Main request routing function
 * Handles all incoming requests and routes to the correct tenant website
 */
export const serveWebsite = functions.https.onRequest(
  { 
    cors: true, 
    maxInstances: 100,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (req, res) => {
    try {
      const hostname = (req.get('host') || '').toLowerCase();
      const path = req.path;
      const method = req.method;
      
      console.log(`[serveWebsite] ${method} ${hostname}${path}`);
      
      // ============================================
      // Handle Static Assets
      // ============================================
      
      if (path === '/favicon.ico') {
        res.set('Content-Type', 'image/svg+xml');
        res.set('Cache-Control', `public, max-age=${config.staticCacheTTL}`);
        res.status(200).send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#667eea"/><text x="50" y="70" font-size="50" font-family="Arial" fill="white" text-anchor="middle">M</text></svg>`);
        return;
      }
      
      if (path === '/robots.txt') {
        res.set('Content-Type', 'text/plain');
        res.set('Cache-Control', `public, max-age=${config.staticCacheTTL}`);
        res.status(200).send('User-agent: *\nAllow: /\nSitemap: /sitemap.xml');
        return;
      }
      
      // ============================================
      // Route Resolution
      // ============================================
      
      let siteData: { tenantId: string; siteId: string; site: PublishedSite } | null = null;
      let baseUrl = `https://${hostname}`;
      
      // Method 1: Custom Domain Routing
      if (!isPlatformDomain(hostname)) {
        console.log(`[serveWebsite] Custom domain lookup: ${hostname}`);
        siteData = await getCachedDomainData(hostname);
        
        if (!siteData) {
          // Check if domain exists but is not active
          const domainDoc = await db
            .collection('customDomains')
            .where('domain', '==', hostname)
            .limit(1)
            .get();
          
          if (!domainDoc.empty) {
            const status = domainDoc.docs[0].data().status as DomainStatus;
            
            if (status === 'pending_dns') {
              res.status(503).send(generateErrorPage(
                503,
                'Domain Not Configured',
                'This domain has been registered but DNS is not yet configured.',
                'Please configure your DNS records and wait for propagation (up to 48 hours).'
              ));
              return;
            }
            
            if (status === 'ssl_pending') {
              res.status(503).send(generateErrorPage(
                503,
                'SSL Certificate Pending',
                'Your domain is configured and SSL certificate is being provisioned.',
                'This usually takes a few minutes. Please try again shortly.'
              ));
              return;
            }
            
            if (status === 'broken') {
              res.status(503).send(generateErrorPage(
                503,
                'Domain Configuration Issue',
                'There is an issue with this domain\'s configuration.',
                'Please check your DNS settings or contact support.'
              ));
              return;
            }
          }
          
          // Domain not found at all
          res.status(404).send(generateErrorPage(
            404,
            'Domain Not Found',
            'This domain is not connected to any website on our platform.',
            'If you own this domain, please configure it in your dashboard.'
          ));
          return;
        }
      }
      
      // Method 2: Site ID Routing (/site/:id)
      if (!siteData && path.startsWith('/site/')) {
        const siteId = path.split('/')[2];
        if (siteId) {
          console.log(`[serveWebsite] Site ID lookup: ${siteId}`);
          siteData = await lookupSiteById(siteId);
          baseUrl = `https://${hostname}/site/${siteId}`;
        }
      }
      
      // Method 3: Subdomain Routing (tenant.platform-domain.com)
      if (!siteData && isPlatformDomain(hostname)) {
        const subdomain = hostname.split('.')[0];
        if (subdomain && subdomain !== 'www' && subdomain !== 'madas-sites-c3c5e' && subdomain !== 'madas-store') {
          console.log(`[serveWebsite] Subdomain lookup: ${subdomain}`);
          siteData = await lookupSiteBySubdomain(subdomain);
          baseUrl = `https://${hostname}`;
        }
      }
      
      // ============================================
      // No Site Found
      // ============================================
      
      if (!siteData) {
        console.log(`[serveWebsite] No site found for ${hostname}${path}`);
        res.status(404).send(generateErrorPage(
          404,
          'Site Not Found',
          'The website you are looking for does not exist or has been removed.',
          `Make sure the URL is correct: ${hostname}${path}`
        ));
        return;
      }
      
      // ============================================
      // Serve the Website
      // ============================================
      
      console.log(`[serveWebsite] Serving site ${siteData.siteId} for tenant ${siteData.tenantId}`);
      
      // Set cache headers
      res.set('Cache-Control', `public, max-age=${config.cacheTTL}`);
      res.set('X-Tenant-ID', siteData.tenantId);
      res.set('X-Site-ID', siteData.siteId);
      
      // Generate and send HTML
      const html = generateSiteHTML(siteData.site, baseUrl);
      res.status(200).send(html);
      
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[serveWebsite] Error:', err);
      
      res.status(500).send(generateErrorPage(
        500,
        'Internal Server Error',
        'Something went wrong while loading this website.',
        'Please try again later or contact support if the problem persists.'
      ));
    }
  }
);

