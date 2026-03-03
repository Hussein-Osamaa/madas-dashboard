# Addict - Handmade Treasures Website

A beautiful, standalone e-commerce website for the "Addict" handmade brand, connected to XDIGIX platform via API.

## Features

- 🛍️ **Product Catalog**: Fetches products from XDIGIX API
- 🛒 **Shopping Cart**: Full cart functionality with localStorage persistence
- 📱 **Responsive Design**: Works on all devices
- 🎨 **Beautiful UI**: Handcrafted aesthetic matching handmade brand
- 🔗 **XDIGIX Integration**: 
  - Reads products via API
  - Sends orders via webhooks
  - Real-time synchronization

## Setup Instructions

### 1. Configure API Credentials

Open `index.html` and update the configuration:

```javascript
const XDIGIX_CONFIG = {
    tenantId: '91FMZUAsbY3QggZ3oPko',
    apiToken: 'YOUR_API_TOKEN_HERE', // Get from XDIGIX dashboard
    baseUrl: 'https://us-central1-madas-store.cloudfunctions.net/api/external/91FMZUAsbY3QggZ3oPko',
    webhookUrl: 'https://us-central1-madas-store.cloudfunctions.net/api/external/91FMZUAsbY3QggZ3oPko/webhook',
    webhookSecret: 'YOUR_WEBHOOK_SECRET_HERE' // Get from XDIGIX dashboard
};
```

### 2. Get Your Credentials

1. Log in to your XDIGIX dashboard
2. Navigate to: **E-commerce → External Website**
3. Generate or copy:
   - **API Token** (for reading products)
   - **Webhook Secret** (for sending orders)

### 3. Deploy the Website

You can deploy this website to any static hosting service:

- **Firebase Hosting**
- **Netlify**
- **Vercel**
- **GitHub Pages**
- **Any web server**

Simply upload the `addict` folder contents to your hosting service.

## File Structure

```
addict/
├── index.html      # Main HTML file
├── styles.css      # All styles
├── app.js          # Application logic and XDIGIX integration
└── README.md       # This file
```

## How It Works

### Reading Products

The website fetches products from XDIGIX using the API:

```javascript
const response = await app.client.getProducts(100);
```

Products are displayed in a beautiful grid layout with:
- Product images
- Names and categories
- Prices
- Add to cart functionality

### Sending Orders

When a customer checks out, the order is sent to XDIGIX via webhook:

```javascript
await app.client.sendWebhook('order.created', orderData);
```

The webhook includes:
- Order ID
- Items (products and quantities)
- Total amount
- Customer information

## Customization

### Colors

Edit `styles.css` to change the color scheme:

```css
:root {
    --primary-color: #8B4513;    /* Main brand color */
    --secondary-color: #D4A574;  /* Accent color */
    --accent-color: #F5E6D3;      /* Light background */
}
```

### Content

Edit `index.html` to customize:
- Brand name and tagline
- About section text
- Contact information
- Social media links

### Product Categories

The filter buttons can be customized in `index.html`:

```html
<button class="filter-btn" data-category="bags">Bags</button>
<button class="filter-btn" data-category="accessories">Accessories</button>
```

Make sure your products in MADAS have matching categories.

## Testing

1. Open `index.html` in a browser
2. Check browser console for any errors
3. Verify products load correctly
4. Test adding items to cart
5. Test checkout (will send webhook to MADAS)

## Troubleshooting

### Products Not Loading

- Check that API token is correct
- Verify tenant ID matches your XDIGIX account
- Check browser console for error messages
- Ensure CORS is enabled (should be by default)

### Webhook Not Working

- Verify webhook secret is correct
- Check that webhook is enabled in XDIGIX dashboard
- Check browser console for webhook errors
- Verify event type is enabled in dashboard

### Images Not Showing

- Products need `imageUrl` or `images` array in XDIGIX
- Check that image URLs are accessible
- Fallback icon will show if image fails to load

## Support

For issues or questions:
1. Check the XDIGIX integration guide
2. Review browser console for errors
3. Contact XDIGIX support

---

**Powered by XDIGIX E-commerce Platform**

