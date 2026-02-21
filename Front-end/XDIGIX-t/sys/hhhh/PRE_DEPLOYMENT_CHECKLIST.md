# Pre-Deployment Checklist for MADAS Dashboard

## 📋 Complete This Checklist Before Deployment

**Project**: MADAS Dashboard
**Deployment Date**: _____________
**Deployed By**: _____________
**Target Platform**: Firebase Hosting / Vercel / Netlify (circle one)

---

## 🔴 CRITICAL SECURITY (Must Complete)

### 1. Credentials & Secrets
- [ ] Remove `.env` file from Git tracking
  ```bash
  git rm --cached ../../../.env
  ```
- [ ] Add `.env` to `.gitignore`
- [ ] Regenerate exposed email password (Gmail app password)
- [ ] Store email credentials in deployment platform environment variables
- [ ] Verify Firebase API keys are NOT in `.gitignore` (they're safe for client-side)
- [ ] Check no hardcoded passwords anywhere in code
- [ ] Remove any test/development API keys

### 2. Firebase Security Rules
- [ ] Review and deploy Firestore security rules
  ```bash
  firebase deploy --only firestore:rules
  ```
- [ ] Test rules with Firebase Emulator first
- [ ] Verify multi-tenant isolation rules
- [ ] Ensure staff permission rules match client-side checks
- [ ] Test unauthorized access scenarios

### 3. Authentication Domain
- [ ] Add production domain to Firebase authorized domains
  - Go to: Firebase Console → Authentication → Settings → Authorized domains
  - Add: `madas-store.web.app` (or your custom domain)
- [ ] Test login from production domain

---

## 🟠 HIGH PRIORITY (Strongly Recommended)

### 4. Code Cleanup
- [ ] Remove or disable all 645 `console.log()` statements
  ```bash
  # Option A: Remove all
  find ./js -name "*.js" -exec sed -i '' '/console\.log/d' {} \;

  # Option B: Conditional logging (create logger.js first)
  ```
- [ ] Remove `console.error()` and `console.warn()` (or send to logging service)
- [ ] Remove all `alert()` calls (replace with toast notifications)
- [ ] Remove debug/test code blocks

### 5. File Cleanup
- [ ] Delete `node_modules` from subdirectories:
  - [ ] `mobile-app/node_modules/`
  - [ ] `multi-tenancy/node_modules/`
- [ ] Remove backup files (`.bak`, `~` files)
- [ ] Remove `.DS_Store` files (Mac)
- [ ] Remove `Thumbs.db` files (Windows)
- [ ] Delete any test/sample data files

### 6. Performance Optimization
- [ ] Minify CSS files (optional - can use build tool)
- [ ] Compress images (use tools like TinyPNG)
- [ ] Check all image paths are correct
- [ ] Verify all CSS/JS files load correctly
- [ ] Test page load speed (aim for < 3 seconds)

---

## 🟡 MEDIUM PRIORITY (Important)

### 7. Configuration Files
- [ ] Verify `firebase.json` is configured correctly
- [ ] Verify `.firebaserc` points to `madas-store` project
- [ ] Check `firebase.json` ignore rules include:
  - [ ] `node_modules`
  - [ ] `mobile-app`
  - [ ] `multi-tenancy`
  - [ ] `*.md` files

### 8. URL & Path Fixes
- [ ] Update hardcoded URLs to use relative paths:
  - [ ] `/login` → `./login.html`
  - [ ] `/no-access.html` → `./no-access.html`
  - [ ] Other absolute paths
- [ ] Test all navigation links work correctly
- [ ] Verify asset paths (images, CSS, JS)

### 9. Error Handling
- [ ] Replace `alert()` with proper error toasts
- [ ] Add try-catch blocks to all async functions
- [ ] Implement error logging service (Sentry, etc.)
- [ ] Create user-friendly error messages
- [ ] Add fallback UI for errors

### 10. Testing (Local)
- [ ] Test login/logout flow
- [ ] Test all pages load correctly
- [ ] Test multi-tenant switching
- [ ] Test permission system (3 roles: owner, admin, staff)
- [ ] Test CRUD operations (products, orders, customers, staff)
- [ ] Test on multiple browsers:
  - [ ] Chrome/Edge
  - [ ] Firefox
  - [ ] Safari
- [ ] Test on mobile devices:
  - [ ] iOS Safari
  - [ ] Android Chrome

---

## 🟢 LOW PRIORITY (Nice to Have)

### 11. Documentation
- [ ] Create user guide for staff
- [ ] Document admin features
- [ ] Create troubleshooting FAQ
- [ ] Document API endpoints (if any)
- [ ] Update README with deployment URL

### 12. Monitoring & Analytics
- [ ] Set up Google Analytics
  - [ ] Create GA4 property
  - [ ] Add tracking code to `index.html`
- [ ] Enable Firebase Performance Monitoring
- [ ] Set up error tracking (Sentry.io)
- [ ] Configure Firebase Crashlytics (if using mobile)

### 13. SEO & Meta Tags
- [ ] Add proper `<title>` tags to all pages
- [ ] Add meta descriptions
- [ ] Add Open Graph tags (for social sharing)
- [ ] Add favicon (already exists: `madas-logo.png`)
- [ ] Create `robots.txt` (if needed)
- [ ] Create `sitemap.xml` (optional for dashboard)

### 14. Accessibility (a11y)
- [ ] Check color contrast ratios (WCAG 2.1 AA)
- [ ] Add ARIA labels to interactive elements
- [ ] Test keyboard navigation
- [ ] Test with screen readers
- [ ] Ensure form inputs have labels

### 15. Backup Plan
- [ ] Set up automated Firestore backups
- [ ] Document rollback procedure
- [ ] Create emergency contact list
- [ ] Test backup restore process

---

## ✅ Deployment Steps

### Before Deployment
- [ ] Review all checklist items above
- [ ] Create a backup of current Firestore data
- [ ] Test locally one more time
  ```bash
  firebase serve
  ```
- [ ] Commit all changes to Git
  ```bash
  git add .
  git commit -m "Production release v1.0"
  git push
  ```

### During Deployment
- [ ] Run deployment command:
  ```bash
  firebase deploy --only hosting
  ```
- [ ] Watch deployment logs for errors
- [ ] Note deployment URL from output

### After Deployment
- [ ] Test production URL immediately
- [ ] Check SSL certificate is active (🔒 in browser)
- [ ] Test login with real account
- [ ] Verify Firebase operations work
- [ ] Check browser console for errors
- [ ] Test on multiple devices
- [ ] Share URL with team for QA testing

---

## 🔍 Post-Deployment Verification

### Immediate Checks (Within 1 Hour)
- [ ] Dashboard loads at production URL
- [ ] Login page works
- [ ] Authentication succeeds
- [ ] User can access dashboard after login
- [ ] Multi-tenancy works (if applicable)
- [ ] No JavaScript errors in console
- [ ] Images/assets load correctly
- [ ] Navigation works between pages
- [ ] SSL certificate is valid

### Extended Checks (Within 24 Hours)
- [ ] Monitor Firebase usage (Firestore, Auth, Hosting)
- [ ] Check for 404 errors in logs
- [ ] Review user feedback (if any)
- [ ] Check performance metrics
- [ ] Verify all features work as expected
- [ ] Test with real users (beta testing)

### Weekly Checks (First Week)
- [ ] Monitor error rates
- [ ] Check Firebase quotas (free tier limits)
- [ ] Review user activity logs
- [ ] Collect feedback from users
- [ ] Plan for any necessary hotfixes

---

## 🚨 Rollback Plan (If Needed)

If deployment fails or critical issues found:

1. **Immediate Rollback** (Firebase Hosting):
   ```bash
   firebase hosting:channel:delete live
   firebase hosting:clone SOURCE_SITE_ID:SOURCE_CHANNEL_ID TARGET_SITE_ID:live
   ```

2. **Manual Rollback**:
   - Go to Firebase Console → Hosting
   - Click "Release history"
   - Click "Rollback" on previous working version

3. **Emergency Contacts**:
   - Firebase Support: https://firebase.google.com/support
   - Team Lead: _____________
   - DevOps: _____________

---

## 📊 Deployment Metrics to Track

### Day 1
- [ ] Total page views
- [ ] Number of logins
- [ ] Average page load time
- [ ] Error rate
- [ ] Number of active users

### Week 1
- [ ] Daily active users (DAU)
- [ ] Feature usage statistics
- [ ] Firebase quota usage (% of free tier)
- [ ] Performance scores (Lighthouse)

### Month 1
- [ ] Monthly active users (MAU)
- [ ] Retention rate
- [ ] Feature adoption rates
- [ ] Plan for scaling (if needed)

---

## ✍️ Sign-Off

**Pre-Deployment Checklist Completed By**:

Name: _______________________________
Date: _______________________________
Signature: __________________________

**Deployment Approved By**:

Name: _______________________________
Date: _______________________________
Signature: __________________________

**Deployment Executed By**:

Name: _______________________________
Date: _______________________________
Time: _______________________________
Deployment URL: _____________________

---

## 📝 Notes & Issues Found

Use this space to document any issues encountered during deployment or items that need follow-up:

```
Issue 1:
Description:
Severity: High / Medium / Low
Status: Resolved / Pending
Resolution:

Issue 2:
Description:
Severity: High / Medium / Low
Status: Resolved / Pending
Resolution:

(Add more as needed)
```

---

## 🎉 Post-Deployment Actions

After successful deployment:

- [ ] Announce deployment to team
- [ ] Update internal documentation
- [ ] Schedule follow-up meeting (1 week)
- [ ] Plan for next release cycle
- [ ] Celebrate! 🎊

---

**Checklist Version**: 1.0
**Last Updated**: October 26, 2025
**For**: MADAS Dashboard Production Deployment
