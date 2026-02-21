# ⚠️ Enable External API Integration

## The Problem

You're seeing: `"External API integration is not enabled"`

This means the integration needs to be enabled in your XDIGIX Dashboard.

## ✅ Solution: Enable in Dashboard

### Step 1: Go to External Website Settings

1. Open: **https://madas-store.web.app**
2. Login to your account
3. Navigate to: **E-commerce → External Website**

### Step 2: Enable the Integration

1. **Toggle "Enable integration" to ON** (at the top of the page)
2. **In "Outbound API" section:**
   - Toggle **"Enable API"** to ON
   - Make sure your API Token is set: `GvL5jc76-BpP_WGV5TJJva-wR_kwmuh8t_iUk90prAA`
3. **In "Inbound Webhook" section:**
   - Toggle **"Enable Webhook"** to ON
   - Make sure your Webhook Secret is set: `SgJv6LpreG3bhF-aQSqISIhCQkEEwKQY_G2GdAM9Htc`
4. **Click "Save"** button

### Step 3: Verify

After saving, the website at **https://addict-123.web.app** should:
- ✅ Load products from XDIGIX
- ✅ Display your inventory
- ✅ Allow customers to add to cart
- ✅ Process checkout orders

## What Gets Enabled

When you enable the integration, it sets:
- `enabled: true` (top-level)
- `api.enabled: true`
- `webhook.enabled: true`

All three must be `true` for the API to work.

## Still Not Working?

1. **Check the dashboard page** - Make sure all toggles are ON
2. **Click "Save"** - Changes don't apply until you save
3. **Wait 10-30 seconds** - Settings may take a moment to propagate
4. **Refresh the website** - Hard refresh: `Ctrl+Shift+R` or `Cmd+Shift+R`

---

**Once enabled, your Addict website will be fully connected to XDIGIX! 🎉**

