# Debugging Guide - Addict Website

## Quick Debugging Steps

### 1. Open Browser Console
- Press **F12** (or right-click → Inspect → Console tab)
- Look for error messages in red

### 2. Check Common Issues

#### Issue: "API Token not configured"
**Solution:**
- Open `index.html`
- Find line 208: `apiToken: 'YOUR_API_TOKEN_HERE'`
- Replace with your actual API token from XDIGIX dashboard

#### Issue: "Invalid API Token" or "401 Unauthorized"
**Solution:**
- Go to XDIGIX Dashboard → E-commerce → External Website
- Verify your API token is correct
- Make sure "Outbound API" is enabled
- Generate a new token if needed

#### Issue: "404 Not Found" or "Integration not enabled"
**Solution:**
- Go to XDIGIX Dashboard → E-commerce → External Website
- Toggle "Enable integration" to ON
- Make sure "Outbound API" is enabled
- Click "Save"

#### Issue: "Failed to fetch" or CORS error
**Solution:**
- Check your internet connection
- Make sure you're using HTTPS (not HTTP)
- Try opening the website in a different browser

#### Issue: "No products found"
**Solution:**
- Go to XDIGIX Dashboard → Inventory → Products
- Make sure you have products added
- Check that products have status "active"

### 3. Test API Connection

Open browser console (F12) and run:

```javascript
// Test API connection
fetch('https://us-central1-madas-store.cloudfunctions.net/api/external/91FMZUAsbY3QggZ3oPko/ping', {
    headers: {
        'X-Madas-Api-Token': 'YOUR_API_TOKEN_HERE' // Replace with your token
    }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

If this works, you'll see: `{success: true, message: "OK", tenantId: "..."}`

### 4. Check Network Tab

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Refresh the page
4. Look for request to `/products`
5. Click on it to see:
   - Request headers (check if API token is sent)
   - Response status
   - Response body (error message if any)

### 5. Verify Configuration

Check browser console for:
```
Initializing Addict website...
MADAS Config: {
  tenantId: "91FMZUAsbY3QggZ3oPko",
  hasApiToken: true,  // Should be true
  hasWebhookSecret: true  // Should be true
}
```

If `hasApiToken: false`, you need to add your API token.

## Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| `API Token not configured` | Token placeholder not replaced | Add your API token in index.html |
| `Invalid API token` | Token is wrong or expired | Get new token from dashboard |
| `Integration not enabled` | External API disabled in dashboard | Enable it in dashboard |
| `Failed to fetch` | Network/CORS issue | Check connection, use HTTPS |
| `No products found` | No products in XDIGIX | Add products in dashboard |

## Still Not Working?

1. **Check browser console** (F12) for detailed error messages
2. **Check Network tab** to see API requests/responses
3. **Verify credentials** in MADAS dashboard
4. **Try a different browser** (Chrome, Firefox, Safari)
5. **Check if products exist** in MADAS → Inventory → Products

## Get Help

If still having issues, provide:
1. Browser console errors (screenshot or copy text)
2. Network tab response (screenshot)
3. What you see on the page
4. Your API token (first 10 characters only for security)

