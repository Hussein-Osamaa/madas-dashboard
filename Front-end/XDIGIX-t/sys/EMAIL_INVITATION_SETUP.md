# 📧 Email Invitation System - Setup Guide

## ✅ **What's Been Implemented:**

The staff invitation system now sends **actual email invitations** when you add new staff members!

---

## 🎯 **Features:**

✅ **Beautiful HTML Email Templates** - Professional, branded emails  
✅ **Automatic Invitation Sending** - Emails sent when adding staff  
✅ **Login Link Included** - Direct link to login page  
✅ **Role & Permission Details** - Staff see their access level  
✅ **Fallback Handling** - Graceful error messages if email fails  
✅ **Welcome Emails** - Optional welcome email when staff logs in  

---

## 🔧 **Setup Instructions:**

### **Option 1: Gmail (Recommended for Testing)**

#### **Step 1: Enable App Passwords**
1. Go to your Google Account: https://myaccount.google.com
2. Click "Security" in the left sidebar
3. Enable "2-Step Verification" (if not already enabled)
4. Go to "App passwords": https://myaccount.google.com/apppasswords
5. Select "Mail" and "Other (Custom name)"
6. Name it "MADAS Staff Invitations"
7. Click "Generate"
8. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

#### **Step 2: Create .env File**
Create a file named `.env` in the root directory:

```bash
cd "/Users/mac/university/Project's/Web/Front-End/Projects/Madas/Front-end/dashboard/sys"
touch .env
```

#### **Step 3: Add Your Credentials**
Open `.env` and add:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
PORT=3000
```

**Replace:**
- `your-email@gmail.com` with your actual Gmail
- `abcdefghijklmnop` with your 16-character app password (no spaces!)

---

### **Option 2: Custom SMTP (For Production)**

If you're using a custom email service (SendGrid, Mailgun, AWS SES, etc.):

#### **Update emailService.js:**
Open `Dashboard/services/emailService.js` and uncomment the custom SMTP section:

```javascript
return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});
```

#### **Create .env file:**
```env
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASSWORD=your-smtp-password
PORT=3000
```

---

## 🚀 **How to Use:**

### **1. Start the Server**
```bash
cd "/Users/mac/university/Project's/Web/Front-End/Projects/Madas/Front-end/dashboard/sys"
node server.js
```

### **2. Add a Staff Member**
1. Go to: `http://192.168.1.58:3000/dashboard/pages/Admin.html`
2. Click "Add Staff"
3. Fill in:
   - **Email:** staff@example.com
   - **Name:** John Doe
   - **Role:** Admin/Manager/Staff/Cashier
   - **Permissions:** Check the boxes
4. Click "Send Invitation"

### **3. What Happens:**
✅ Staff record created in Firebase  
✅ Email sent to staff member  
✅ Success message shown  
✅ Staff appears in the table  

### **4. Staff Receives Email:**
The staff member gets a beautiful email with:
- Welcome message
- Their role and business name
- Direct login link
- Next steps instructions
- Professional branding

### **5. Staff Logs In:**
1. Staff clicks the login link in email
2. If they don't have an account, they sign up first
3. Once logged in, they have access based on permissions

---

## 📧 **Email Template Preview:**

```
┌─────────────────────────────────────┐
│              [M Logo]               │
│      Welcome to Your Business!      │
├─────────────────────────────────────┤
│                                     │
│  Hi John Doe,                       │
│                                     │
│  Great news! You've been invited    │
│  to join Your Business as an Admin  │
│  on the MADAS platform.             │
│                                     │
│  📧 Email: staff@example.com        │
│  🎭 Role: ADMIN                     │
│  🏢 Business: Your Business         │
│                                     │
│     [🚀 Get Started Now Button]    │
│                                     │
│  Next Steps:                        │
│  1. Click the button above          │
│  2. Sign in with your email         │
│  3. Access your dashboard           │
│                                     │
└─────────────────────────────────────┘
```

---

## 🧪 **Testing:**

### **Test 1: Email Configuration**
```bash
# Test if email is configured correctly
# The server will log any email errors
```

### **Test 2: Send Test Invitation**
1. Add yourself as a staff member
2. Use your own email
3. Check your inbox (and spam folder!)
4. Click the login link
5. Verify you can access the dashboard

### **Test 3: Different Roles**
Try inviting staff with different roles:
- Admin
- Manager
- Staff
- Cashier

Each will receive the same beautiful email template.

---

## 🔍 **Troubleshooting:**

### **Problem: Email not sending**

**Check 1: .env file exists**
```bash
ls -la .env
```

**Check 2: Credentials are correct**
```bash
cat .env
```

**Check 3: App password (not regular password)**
- Gmail requires an "App Password"
- Regular Gmail password won't work
- Generate at: https://myaccount.google.com/apppasswords

**Check 4: Server logs**
```bash
# Look for error messages in the terminal
# Should show: "✅ Email sent successfully"
# Or: "❌ Error sending email: [error message]"
```

### **Problem: Email goes to spam**

**Solutions:**
1. Add sender to contacts
2. Mark as "Not Spam"
3. Use a custom domain email (production)
4. Configure SPF/DKIM records (production)

### **Problem: "Invalid login" error**

**Gmail specific:**
1. Enable "Less secure app access" (if using regular password)
2. OR use App Passwords (recommended)
3. Check 2-Step Verification is enabled

---

## 📊 **Email Service Options:**

### **Free Tier Options:**

| Service | Free Tier | Setup Difficulty |
|---------|-----------|------------------|
| **Gmail** | 500/day | ⭐ Easy |
| **SendGrid** | 100/day | ⭐⭐ Medium |
| **Mailgun** | 100/day | ⭐⭐ Medium |
| **AWS SES** | 62,000/month | ⭐⭐⭐ Hard |

### **Recommended:**
- **Development:** Gmail (easiest setup)
- **Production:** SendGrid or AWS SES (better deliverability)

---

## 🎨 **Customization:**

### **Change Email Template:**
Edit `Dashboard/services/emailService.js`:
- Line 50+: HTML template
- Change colors, text, layout
- Add your logo URL
- Customize branding

### **Change "From" Name:**
```javascript
from: `"Your Company Name" <${process.env.EMAIL_USER}>`,
```

### **Add More Email Types:**
The service supports:
- `sendStaffInvitation()` - Invitation emails ✅
- `sendWelcomeEmail()` - Welcome emails (ready to use)
- Add more as needed (password reset, notifications, etc.)

---

## 🔐 **Security Best Practices:**

✅ **Never commit .env file** - Already in .gitignore  
✅ **Use App Passwords** - Not your main Gmail password  
✅ **Rotate passwords** - Change every 90 days  
✅ **Use environment variables** - Never hardcode credentials  
✅ **Production:** Use dedicated email service (SendGrid, etc.)  

---

## 📝 **Files Created:**

1. ✅ `Dashboard/services/emailService.js` - Email sending logic
2. ✅ `Dashboard/api/send-invitation.js` - API endpoint
3. ✅ `Dashboard/js/staff-management.js` - Updated to call API
4. ✅ `server.js` - Added `/api/send-invitation` route
5. ✅ `email-config-example.txt` - Configuration template
6. ✅ `EMAIL_INVITATION_SETUP.md` - This guide

---

## 🎯 **Quick Start (TL;DR):**

```bash
# 1. Get Gmail App Password
# Visit: https://myaccount.google.com/apppasswords

# 2. Create .env file
cd "/Users/mac/university/Project's/Web/Front-End/Projects/Madas/Front-end/dashboard/sys"
echo "EMAIL_USER=your-email@gmail.com" > .env
echo "EMAIL_PASSWORD=your-app-password" >> .env

# 3. Restart server
pkill -f "node server.js"
node server.js &

# 4. Test it!
# Go to: http://192.168.1.58:3000/dashboard/pages/Admin.html
# Add a staff member with your email
# Check your inbox!
```

---

## ✨ **What Staff Receives:**

📧 **Subject:** "🎉 You've been invited to join [Business Name] on MADAS"

**Email includes:**
- Professional HTML design
- Business name and logo
- Staff member's role
- Direct login link
- Step-by-step instructions
- Contact information
- Responsive design (mobile-friendly)

---

## 🎉 **You're All Set!**

Email invitations are now fully functional. Just configure your email credentials and start inviting your team!

**Need help?** Check the troubleshooting section above or contact support.


## ✅ **What's Been Implemented:**

The staff invitation system now sends **actual email invitations** when you add new staff members!

---

## 🎯 **Features:**

✅ **Beautiful HTML Email Templates** - Professional, branded emails  
✅ **Automatic Invitation Sending** - Emails sent when adding staff  
✅ **Login Link Included** - Direct link to login page  
✅ **Role & Permission Details** - Staff see their access level  
✅ **Fallback Handling** - Graceful error messages if email fails  
✅ **Welcome Emails** - Optional welcome email when staff logs in  

---

## 🔧 **Setup Instructions:**

### **Option 1: Gmail (Recommended for Testing)**

#### **Step 1: Enable App Passwords**
1. Go to your Google Account: https://myaccount.google.com
2. Click "Security" in the left sidebar
3. Enable "2-Step Verification" (if not already enabled)
4. Go to "App passwords": https://myaccount.google.com/apppasswords
5. Select "Mail" and "Other (Custom name)"
6. Name it "MADAS Staff Invitations"
7. Click "Generate"
8. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

#### **Step 2: Create .env File**
Create a file named `.env` in the root directory:

```bash
cd "/Users/mac/university/Project's/Web/Front-End/Projects/Madas/Front-end/dashboard/sys"
touch .env
```

#### **Step 3: Add Your Credentials**
Open `.env` and add:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
PORT=3000
```

**Replace:**
- `your-email@gmail.com` with your actual Gmail
- `abcdefghijklmnop` with your 16-character app password (no spaces!)

---

### **Option 2: Custom SMTP (For Production)**

If you're using a custom email service (SendGrid, Mailgun, AWS SES, etc.):

#### **Update emailService.js:**
Open `Dashboard/services/emailService.js` and uncomment the custom SMTP section:

```javascript
return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});
```

#### **Create .env file:**
```env
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASSWORD=your-smtp-password
PORT=3000
```

---

## 🚀 **How to Use:**

### **1. Start the Server**
```bash
cd "/Users/mac/university/Project's/Web/Front-End/Projects/Madas/Front-end/dashboard/sys"
node server.js
```

### **2. Add a Staff Member**
1. Go to: `http://192.168.1.58:3000/dashboard/pages/Admin.html`
2. Click "Add Staff"
3. Fill in:
   - **Email:** staff@example.com
   - **Name:** John Doe
   - **Role:** Admin/Manager/Staff/Cashier
   - **Permissions:** Check the boxes
4. Click "Send Invitation"

### **3. What Happens:**
✅ Staff record created in Firebase  
✅ Email sent to staff member  
✅ Success message shown  
✅ Staff appears in the table  

### **4. Staff Receives Email:**
The staff member gets a beautiful email with:
- Welcome message
- Their role and business name
- Direct login link
- Next steps instructions
- Professional branding

### **5. Staff Logs In:**
1. Staff clicks the login link in email
2. If they don't have an account, they sign up first
3. Once logged in, they have access based on permissions

---

## 📧 **Email Template Preview:**

```
┌─────────────────────────────────────┐
│              [M Logo]               │
│      Welcome to Your Business!      │
├─────────────────────────────────────┤
│                                     │
│  Hi John Doe,                       │
│                                     │
│  Great news! You've been invited    │
│  to join Your Business as an Admin  │
│  on the MADAS platform.             │
│                                     │
│  📧 Email: staff@example.com        │
│  🎭 Role: ADMIN                     │
│  🏢 Business: Your Business         │
│                                     │
│     [🚀 Get Started Now Button]    │
│                                     │
│  Next Steps:                        │
│  1. Click the button above          │
│  2. Sign in with your email         │
│  3. Access your dashboard           │
│                                     │
└─────────────────────────────────────┘
```

---

## 🧪 **Testing:**

### **Test 1: Email Configuration**
```bash
# Test if email is configured correctly
# The server will log any email errors
```

### **Test 2: Send Test Invitation**
1. Add yourself as a staff member
2. Use your own email
3. Check your inbox (and spam folder!)
4. Click the login link
5. Verify you can access the dashboard

### **Test 3: Different Roles**
Try inviting staff with different roles:
- Admin
- Manager
- Staff
- Cashier

Each will receive the same beautiful email template.

---

## 🔍 **Troubleshooting:**

### **Problem: Email not sending**

**Check 1: .env file exists**
```bash
ls -la .env
```

**Check 2: Credentials are correct**
```bash
cat .env
```

**Check 3: App password (not regular password)**
- Gmail requires an "App Password"
- Regular Gmail password won't work
- Generate at: https://myaccount.google.com/apppasswords

**Check 4: Server logs**
```bash
# Look for error messages in the terminal
# Should show: "✅ Email sent successfully"
# Or: "❌ Error sending email: [error message]"
```

### **Problem: Email goes to spam**

**Solutions:**
1. Add sender to contacts
2. Mark as "Not Spam"
3. Use a custom domain email (production)
4. Configure SPF/DKIM records (production)

### **Problem: "Invalid login" error**

**Gmail specific:**
1. Enable "Less secure app access" (if using regular password)
2. OR use App Passwords (recommended)
3. Check 2-Step Verification is enabled

---

## 📊 **Email Service Options:**

### **Free Tier Options:**

| Service | Free Tier | Setup Difficulty |
|---------|-----------|------------------|
| **Gmail** | 500/day | ⭐ Easy |
| **SendGrid** | 100/day | ⭐⭐ Medium |
| **Mailgun** | 100/day | ⭐⭐ Medium |
| **AWS SES** | 62,000/month | ⭐⭐⭐ Hard |

### **Recommended:**
- **Development:** Gmail (easiest setup)
- **Production:** SendGrid or AWS SES (better deliverability)

---

## 🎨 **Customization:**

### **Change Email Template:**
Edit `Dashboard/services/emailService.js`:
- Line 50+: HTML template
- Change colors, text, layout
- Add your logo URL
- Customize branding

### **Change "From" Name:**
```javascript
from: `"Your Company Name" <${process.env.EMAIL_USER}>`,
```

### **Add More Email Types:**
The service supports:
- `sendStaffInvitation()` - Invitation emails ✅
- `sendWelcomeEmail()` - Welcome emails (ready to use)
- Add more as needed (password reset, notifications, etc.)

---

## 🔐 **Security Best Practices:**

✅ **Never commit .env file** - Already in .gitignore  
✅ **Use App Passwords** - Not your main Gmail password  
✅ **Rotate passwords** - Change every 90 days  
✅ **Use environment variables** - Never hardcode credentials  
✅ **Production:** Use dedicated email service (SendGrid, etc.)  

---

## 📝 **Files Created:**

1. ✅ `Dashboard/services/emailService.js` - Email sending logic
2. ✅ `Dashboard/api/send-invitation.js` - API endpoint
3. ✅ `Dashboard/js/staff-management.js` - Updated to call API
4. ✅ `server.js` - Added `/api/send-invitation` route
5. ✅ `email-config-example.txt` - Configuration template
6. ✅ `EMAIL_INVITATION_SETUP.md` - This guide

---

## 🎯 **Quick Start (TL;DR):**

```bash
# 1. Get Gmail App Password
# Visit: https://myaccount.google.com/apppasswords

# 2. Create .env file
cd "/Users/mac/university/Project's/Web/Front-End/Projects/Madas/Front-end/dashboard/sys"
echo "EMAIL_USER=your-email@gmail.com" > .env
echo "EMAIL_PASSWORD=your-app-password" >> .env

# 3. Restart server
pkill -f "node server.js"
node server.js &

# 4. Test it!
# Go to: http://192.168.1.58:3000/dashboard/pages/Admin.html
# Add a staff member with your email
# Check your inbox!
```

---

## ✨ **What Staff Receives:**

📧 **Subject:** "🎉 You've been invited to join [Business Name] on MADAS"

**Email includes:**
- Professional HTML design
- Business name and logo
- Staff member's role
- Direct login link
- Step-by-step instructions
- Contact information
- Responsive design (mobile-friendly)

---

## 🎉 **You're All Set!**

Email invitations are now fully functional. Just configure your email credentials and start inviting your team!

**Need help?** Check the troubleshooting section above or contact support.



