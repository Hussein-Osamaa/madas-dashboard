# Quick Start - Addict Website

## ✅ What's Already Configured

- ✅ **Tenant ID**: `91FMZUAsbY3QggZ3oPko`
- ✅ **Webhook URL**: `https://us-central1-madas-store.cloudfunctions.net/api/external/91FMZUAsbY3QggZ3oPko/webhook`
- ✅ **Webhook Secret**: `SgJv6LpreG3bhF-aQSqISIhCQkEEwKQY_G2GdAM9Htc`
- ✅ **Products API URL**: `https://us-central1-madas-store.cloudfunctions.net/api/external/91FMZUAsbY3QggZ3oPko/products`

## ⚠️ What You Still Need

### Get Your API Token

1. **Go to XDIGIX Dashboard**
   - URL: `https://madas-store.web.app` (or your dashboard URL)
   - Login to your account

2. **Navigate to External Website**
   - Click: **E-commerce** → **External Website**

3. **Copy Your API Token**
   - In the **"Outbound API"** section
   - Find the **"API Token"** field
   - Click **"Copy"** or manually copy the token
   - It will look something like: `abc123xyz789...`

4. **Update the Website**
   - Open: `index.html`
   - Find line 208: `apiToken: 'YOUR_API_TOKEN_HERE'`
   - Replace `YOUR_API_TOKEN_HERE` with your actual token
   - Save the file

## 🚀 Test It Now

1. **Open `index.html` in your browser**
   - Double-click the file, or
   - Right-click → Open with → Browser

2. **Check if products load**
   - You should see products from your XDIGIX store
   - If you see "Loading products..." check browser console (F12)

3. **Test the cart**
   - Click "Add to Cart" on any product
   - Click the cart icon (top right)
   - Items should appear

4. **Test checkout**
   - Add items to cart
   - Click "Checkout"
   - Check XDIGIX Dashboard → External Website → Event History
   - You should see `order.created` event

## 📝 Current Configuration

```javascript
const XDIGIX_CONFIG = {
    tenantId: '91FMZUAsbY3QggZ3oPko',
    apiToken: 'YOUR_API_TOKEN_HERE', // ⚠️ UPDATE THIS!
    baseUrl: 'https://us-central1-madas-store.cloudfunctions.net/api/external/91FMZUAsbY3QggZ3oPko',
    webhookUrl: 'https://us-central1-madas-store.cloudfunctions.net/api/external/91FMZUAsbY3QggZ3oPko/webhook',
    webhookSecret: 'SgJv6LpreG3bhF-aQSqISIhCQkEEwKQY_G2GdAM9Htc' // ✅ Already set
};
```

## 🎯 Next Steps After Adding API Token

1. ✅ Products will load from XDIGIX
2. ✅ Cart will work
3. ✅ Checkout will send orders to XDIGIX via webhook
4. ✅ Orders will appear in XDIGIX Dashboard → Orders

## 🐛 Troubleshooting

### Products Not Loading?
- Check browser console (F12) for errors
- Verify API token is correct
- Make sure products exist in XDIGIX → Inventory → Products

### Webhook Not Working?
- Webhook secret is already configured ✅
- Make sure `order.created` event is enabled in dashboard
- Check Event History in External Website page

---

**You're almost done! Just add your API token and you're ready to go! 🎉**

