export interface PixelItem {
  id: string;
  name?: string;
  pixelId: string;
  enabled?: boolean;
  createdAt?: Date;
}

export interface CustomScriptItem {
  id: string;
  name?: string;
  script: string;
  enabled?: boolean;
  createdAt?: Date;
}

export interface PixelData {
  metaPixels?: PixelItem[];
  googleTags?: PixelItem[];
  tiktokPixels?: PixelItem[];
  snapchatPixels?: PixelItem[];
  pinterestTags?: PixelItem[];
  customScripts?: CustomScriptItem[];
}

/**
 * Generates Meta Pixel script
 */
function generateMetaPixelScript(pixelId: string, name?: string): string {
  return `
<!-- Meta Pixel Code${name ? ` - ${name}` : ''} -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->`.trim();
}

/**
 * Generates Google Tag (GA4) script
 */
function generateGoogleTagScript(tagId: string, name?: string): string {
  return `
<!-- Google tag (gtag.js)${name ? ` - ${name}` : ''} -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${tagId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${tagId}');
</script>
<!-- End Google tag -->`.trim();
}

/**
 * Generates TikTok Pixel script
 */
function generateTikTokPixelScript(pixelId: string, name?: string): string {
  return `
<!-- TikTok Pixel Code${name ? ` - ${name}` : ''} -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
  ttq.load('${pixelId}');
  ttq.page();
}(window, document, 'ttq');
</script>
<!-- End TikTok Pixel Code -->`.trim();
}

/**
 * Generates Snapchat Pixel script
 */
function generateSnapchatPixelScript(pixelId: string, name?: string): string {
  return `
<!-- Snapchat Pixel Code${name ? ` - ${name}` : ''} -->
<script type="text/javascript">
(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function()
{a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
a.queue=[];var s='script';r=t.createElement(s);r.async=!0;
r.src=n;var u=t.getElementsByTagName(s)[0];
u.parentNode.insertBefore(r,u);})(window,document,
'https://sc-static.net/scevent.min.js');
snaptr('init', '${pixelId}', {
'user_email': ''
});
snaptr('track', 'PAGE_VIEW');
</script>
<!-- End Snapchat Pixel Code -->`.trim();
}

/**
 * Generates Pinterest Tag script
 */
function generatePinterestTagScript(tagId: string, name?: string): string {
  return `
<!-- Pinterest Tag${name ? ` - ${name}` : ''} -->
<script>
!function(e){if(!window.pintrk){window.pintrk = function () {
window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var
  n=window.pintrk;n.queue=[],n.version="3.0";var
  t=document.createElement("script");t.async=!0,t.src=e;var
  r=document.getElementsByTagName("script")[0];
  r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
pintrk('load', '${tagId}', {em: ''});
pintrk('page');
</script>
<noscript>
<img height="1" width="1" style="display:none;" alt=""
src="https://ct.pinterest.com/v3/?tid=${tagId}&event=init&noscript=1" />
</noscript>
<!-- End Pinterest Tag -->`.trim();
}

/**
 * Generates script tags for all configured pixels
 * @param pixels - Pixel configuration data
 * @returns Array of script tag strings ready to inject into HTML
 */
export function generatePixelScripts(pixels: PixelData): string[] {
  const scripts: string[] = [];

  // Meta Pixels
  if (pixels.metaPixels && pixels.metaPixels.length > 0) {
    pixels.metaPixels
      .filter(pixel => pixel.enabled !== false && pixel.pixelId)
      .forEach(pixel => {
        scripts.push(generateMetaPixelScript(pixel.pixelId, pixel.name));
      });
  }

  // Google Tags
  if (pixels.googleTags && pixels.googleTags.length > 0) {
    pixels.googleTags
      .filter(tag => tag.enabled !== false && tag.pixelId)
      .forEach(tag => {
        scripts.push(generateGoogleTagScript(tag.pixelId, tag.name));
      });
  }

  // TikTok Pixels
  if (pixels.tiktokPixels && pixels.tiktokPixels.length > 0) {
    pixels.tiktokPixels
      .filter(pixel => pixel.enabled !== false && pixel.pixelId)
      .forEach(pixel => {
        scripts.push(generateTikTokPixelScript(pixel.pixelId, pixel.name));
      });
  }

  // Snapchat Pixels
  if (pixels.snapchatPixels && pixels.snapchatPixels.length > 0) {
    pixels.snapchatPixels
      .filter(pixel => pixel.enabled !== false && pixel.pixelId)
      .forEach(pixel => {
        scripts.push(generateSnapchatPixelScript(pixel.pixelId, pixel.name));
      });
  }

  // Pinterest Tags
  if (pixels.pinterestTags && pixels.pinterestTags.length > 0) {
    pixels.pinterestTags
      .filter(tag => tag.enabled !== false && tag.pixelId)
      .forEach(tag => {
        scripts.push(generatePinterestTagScript(tag.pixelId, tag.name));
      });
  }

  // Custom Scripts
  if (pixels.customScripts && pixels.customScripts.length > 0) {
    pixels.customScripts
      .filter(script => script.enabled !== false && script.script)
      .forEach(script => {
        scripts.push(script.script);
      });
  }

  return scripts;
}

