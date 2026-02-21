const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: "madas-store"
  });
}

const db = admin.firestore();

/**
 * Publish website API endpoint
 * POST /api/website/publish
 */
async function publishWebsite(req, res) {
  try {
    const { websiteId } = req.body;

    if (!websiteId) {
      return res.status(400).json({ error: 'Website ID is required' });
    }

    // Get website data
    const websiteDoc = await db.collection('websites').doc(websiteId).get();
    
    if (!websiteDoc.exists) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const website = websiteDoc.data();
    const html = website.editorData.html;
    const css = website.editorData.css;

    // Generate complete HTML file
    const completeHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${website.siteName}</title>
  <meta name="description" content="${website.description}">
  
  <!-- Favicon -->
  ${website.settings.favicon ? `<link rel="icon" href="${website.settings.favicon}">` : ''}
  
  <!-- Google Analytics -->
  ${website.settings.googleAnalyticsId ? `
  <script async src="https://www.googletagmanager.com/gtag/js?id=${website.settings.googleAnalyticsId}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${website.settings.googleAnalyticsId}');
  </script>
  ` : ''}
  
  <!-- Facebook Pixel -->
  ${website.settings.facebookPixelId ? `
  <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${website.settings.facebookPixelId}');
    fbq('track', 'PageView');
  </script>
  ` : ''}
  
  <style>
    ${css}
  </style>
</head>
<body>
  ${html}
</body>
</html>
    `;

    // Update website status
    const subdomain = website.domain.subdomain;
    const publishedUrl = `https://${subdomain}.yoursaas.com`;
    
    await db.collection('websites').doc(websiteId).update({
      status: 'published',
      isPublished: true,
      publishedUrl,
      'metadata.publishedAt': new Date().toISOString(),
      'metadata.updatedAt': new Date().toISOString()
    });

    // TODO: Deploy to Vercel/Netlify via API
    // For now, just return the HTML
    
    return res.json({
      success: true,
      url: publishedUrl,
      html: completeHTML
    });
  } catch (error) {
    console.error('Publish error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { publishWebsite };
