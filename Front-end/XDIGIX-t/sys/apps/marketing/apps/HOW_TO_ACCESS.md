# How to Access Deployed Apps

After deployment, all apps are accessible through a single domain with path-based routing.

## 🌐 Access URLs

### Current Deployment (madas-store.web.app)

All apps are deployed and accessible at:

| App | URL | Description |
|-----|-----|-------------|
| **Marketing** | https://madas-store.web.app/ | Main marketing website (root) |
| **Dashboard** | https://madas-store.web.app/dashboard | Multi-tenant dashboard system |
| **Finance** | https://madas-store.web.app/finance | Finance management system |
| **Admin** | https://madas-store.web.app/admin | XDIGIX admin dashboard |

## 📍 URL Structure

```
https://madas-store.web.app/
├── /                    → Marketing Website
├── /dashboard          → Dashboard App
├── /finance            → Finance App
└── /admin              → Admin Dashboard
```

## 🔗 Direct Links

### Marketing Website
- **Home**: https://madas-store.web.app/
- **Features**: https://madas-store.web.app/features (if configured)
- **Pricing**: https://madas-store.web.app/pricing (if configured)

### Dashboard App
- **Login**: https://madas-store.web.app/dashboard/login
- **Home**: https://madas-store.web.app/dashboard
- **Orders**: https://madas-store.web.app/dashboard/orders
- **Inventory**: https://madas-store.web.app/dashboard/inventory/products
- **POS**: https://madas-store.web.app/dashboard/pos

### Finance App
- **Login**: https://madas-store.web.app/finance/login
- **Overview**: https://madas-store.web.app/finance/overview
- **Transactions**: https://madas-store.web.app/finance/transactions
- **Payments**: https://madas-store.web.app/finance/payments
- **Expenses**: https://madas-store.web.app/finance/expenses

### Admin Dashboard
- **Login**: https://madas-store.web.app/admin/login
- **Overview**: https://madas-store.web.app/admin
- **Clients**: https://madas-store.web.app/admin/clients
- **Staff**: https://madas-store.web.app/admin/staff
- **Subscriptions**: https://madas-store.web.app/admin/subscriptions

## 🎯 Custom Domain (xdigix.com)

When you configure your custom domain `xdigix.com` in Firebase Console, the same paths will work:

- `https://xdigix.com/` → Marketing
- `https://xdigix.com/dashboard` → Dashboard
- `https://xdigix.com/finance` → Finance
- `https://xdigix.com/admin` → Admin

## 🔍 Testing Access

### Quick Test Commands

```bash
# Test Marketing (should return 200)
curl -I https://madas-store.web.app/

# Test Dashboard (should return 200)
curl -I https://madas-store.web.app/dashboard

# Test Finance (should return 200)
curl -I https://madas-store.web.app/finance

# Test Admin (should return 200)
curl -I https://madas-store.web.app/admin
```

## ⚠️ Important Notes

1. **No Trailing Slash**: Use `/dashboard` not `/dashboard/`
2. **Case Sensitive**: URLs are case-sensitive
3. **Authentication**: Some pages require login
4. **Cache**: Clear browser cache if you see old versions

## 🐛 Troubleshooting

### If you see "Page not found":

1. **Check the URL**: Make sure there's no trailing slash
2. **Clear Cache**: Hard refresh (`Cmd+Shift+R` or `Ctrl+Shift+R`)
3. **Check Console**: Open browser DevTools (F12) and check for errors
4. **Verify Deployment**: Check Firebase Console to ensure deployment succeeded

### If assets don't load:

1. **Check Network Tab**: Look for 404 errors in browser DevTools
2. **Verify Base Paths**: Assets should load from `/dashboard/assets/`, `/finance/assets/`, etc.
3. **Check Firebase Console**: Verify the deployment includes all files

## 📱 Mobile Access

All apps are responsive and accessible on mobile devices using the same URLs.

## 🔐 Authentication

- **Dashboard**: Requires Firebase authentication
- **Finance**: Requires Firebase authentication  
- **Admin**: Requires super admin authentication

## 🚀 Next Steps

1. **Configure Custom Domain**: Add `xdigix.com` in Firebase Console
2. **Set Up DNS**: Follow Firebase instructions for DNS configuration
3. **Test All Routes**: Verify all apps work correctly
4. **Monitor**: Check Firebase Console for any errors



After deployment, all apps are accessible through a single domain with path-based routing.

## 🌐 Access URLs

### Current Deployment (madas-store.web.app)

All apps are deployed and accessible at:

| App | URL | Description |
|-----|-----|-------------|
| **Marketing** | https://madas-store.web.app/ | Main marketing website (root) |
| **Dashboard** | https://madas-store.web.app/dashboard | Multi-tenant dashboard system |
| **Finance** | https://madas-store.web.app/finance | Finance management system |
| **Admin** | https://madas-store.web.app/admin | XDIGIX admin dashboard |

## 📍 URL Structure

```
https://madas-store.web.app/
├── /                    → Marketing Website
├── /dashboard          → Dashboard App
├── /finance            → Finance App
└── /admin              → Admin Dashboard
```

## 🔗 Direct Links

### Marketing Website
- **Home**: https://madas-store.web.app/
- **Features**: https://madas-store.web.app/features (if configured)
- **Pricing**: https://madas-store.web.app/pricing (if configured)

### Dashboard App
- **Login**: https://madas-store.web.app/dashboard/login
- **Home**: https://madas-store.web.app/dashboard
- **Orders**: https://madas-store.web.app/dashboard/orders
- **Inventory**: https://madas-store.web.app/dashboard/inventory/products
- **POS**: https://madas-store.web.app/dashboard/pos

### Finance App
- **Login**: https://madas-store.web.app/finance/login
- **Overview**: https://madas-store.web.app/finance/overview
- **Transactions**: https://madas-store.web.app/finance/transactions
- **Payments**: https://madas-store.web.app/finance/payments
- **Expenses**: https://madas-store.web.app/finance/expenses

### Admin Dashboard
- **Login**: https://madas-store.web.app/admin/login
- **Overview**: https://madas-store.web.app/admin
- **Clients**: https://madas-store.web.app/admin/clients
- **Staff**: https://madas-store.web.app/admin/staff
- **Subscriptions**: https://madas-store.web.app/admin/subscriptions

## 🎯 Custom Domain (xdigix.com)

When you configure your custom domain `xdigix.com` in Firebase Console, the same paths will work:

- `https://xdigix.com/` → Marketing
- `https://xdigix.com/dashboard` → Dashboard
- `https://xdigix.com/finance` → Finance
- `https://xdigix.com/admin` → Admin

## 🔍 Testing Access

### Quick Test Commands

```bash
# Test Marketing (should return 200)
curl -I https://madas-store.web.app/

# Test Dashboard (should return 200)
curl -I https://madas-store.web.app/dashboard

# Test Finance (should return 200)
curl -I https://madas-store.web.app/finance

# Test Admin (should return 200)
curl -I https://madas-store.web.app/admin
```

## ⚠️ Important Notes

1. **No Trailing Slash**: Use `/dashboard` not `/dashboard/`
2. **Case Sensitive**: URLs are case-sensitive
3. **Authentication**: Some pages require login
4. **Cache**: Clear browser cache if you see old versions

## 🐛 Troubleshooting

### If you see "Page not found":

1. **Check the URL**: Make sure there's no trailing slash
2. **Clear Cache**: Hard refresh (`Cmd+Shift+R` or `Ctrl+Shift+R`)
3. **Check Console**: Open browser DevTools (F12) and check for errors
4. **Verify Deployment**: Check Firebase Console to ensure deployment succeeded

### If assets don't load:

1. **Check Network Tab**: Look for 404 errors in browser DevTools
2. **Verify Base Paths**: Assets should load from `/dashboard/assets/`, `/finance/assets/`, etc.
3. **Check Firebase Console**: Verify the deployment includes all files

## 📱 Mobile Access

All apps are responsive and accessible on mobile devices using the same URLs.

## 🔐 Authentication

- **Dashboard**: Requires Firebase authentication
- **Finance**: Requires Firebase authentication  
- **Admin**: Requires super admin authentication

## 🚀 Next Steps

1. **Configure Custom Domain**: Add `xdigix.com` in Firebase Console
2. **Set Up DNS**: Follow Firebase instructions for DNS configuration
3. **Test All Routes**: Verify all apps work correctly
4. **Monitor**: Check Firebase Console for any errors

