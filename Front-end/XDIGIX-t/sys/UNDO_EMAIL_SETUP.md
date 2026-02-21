# 📧 UNDO Invitation System - Email Setup

## 🎯 **For Your "UNDO invitation system"**

You need to configure email credentials to send staff invitation emails.

---

## 🔑 **Step 1: Get Gmail App Password**

### **For UNDO System:**
1. **Go to:** https://myaccount.google.com/apppasswords
2. **Enable 2-Step Verification** (if not already enabled)
3. **Click:** "Select app" → Choose "Mail"
4. **Click:** "Select device" → Choose "Other (Custom name)"
5. **Type:** "UNDO Invitation System"
6. **Click:** "Generate"
7. **Copy** the 16-character password (looks like: `abcd efgh ijkl mnop`)

---

## 📝 **Step 2: Update .env File**

**Edit your .env file:**
```bash
nano .env
```

**Replace with your actual credentials:**
```env
# Email Configuration for UNDO Invitation System
EMAIL_USER=your-actual-email@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
PORT=3000
```

**Example:**
```env
# Email Configuration for UNDO Invitation System
EMAIL_USER=hesaintheking@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
PORT=3000
```

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

---

## 🚀 **Step 3: Restart Server**

```bash
pkill -f "node server.js" && sleep 2 && node server.js &
```

---

## 🧪 **Step 4: Test Email Configuration**

```bash
node test-email.js
```

**Expected result:**
```
✅ Email server is ready to send messages
```

---

## 📧 **Step 5: Test UNDO Invitation System**

1. **Go to:** http://192.168.1.58:3000/dashboard/pages/Admin.html
2. **Click:** "Add Staff"
3. **Fill in:**
   - Email: your-test-email@gmail.com
   - Name: Test User
   - Role: Admin
   - Permissions: Check some boxes
4. **Click:** "Send Invitation"

**Expected result:**
```
✅ Staff member added and invitation email sent to your-test-email@gmail.com!
```

---

## 📧 **Email Template Features for UNDO System:**

✅ **Professional Design** - Clean, modern layout  
✅ **UNDO Branding** - Customizable business name  
✅ **Role Badges** - Admin/Manager/Staff/Cashier  
✅ **Direct Login Links** - One-click access  
✅ **Step-by-step Instructions** - Clear guidance  
✅ **Mobile Responsive** - Works on all devices  

---

## 🔍 **Troubleshooting:**

### **"Please replace placeholder credentials"**
- Your .env file still has placeholder values
- Update with your real Gmail and app password

### **"Email authentication failed"**
- Check your app password (not regular Gmail password)
- Make sure 2-Step Verification is enabled

### **"Email not received"**
- Check spam folder
- Wait 1-2 minutes
- Verify email address is correct

---

## 🎉 **Ready for UNDO Invitations!**

Once configured, your UNDO invitation system will send beautiful emails with:
- Professional UNDO branding
- Staff role information
- Direct dashboard access
- Clear instructions

**Your staff will receive emails like:**
```
Subject: 🎉 You've been invited to join [Your Business] on MADAS

Hi [Staff Name],
[Your Name] has invited you to join [Your Business] as an Admin on the MADAS platform.

[Beautiful HTML email with login link and instructions]
```

---

## 🎯 **Quick Setup Commands:**

```bash
# 1. Edit .env file
nano .env

# 2. Restart server
pkill -f "node server.js" && sleep 2 && node server.js &

# 3. Test configuration
node test-email.js

# 4. Test invitation
# Go to: http://192.168.1.58:3000/dashboard/pages/Admin.html
```

**Total setup time: 5 minutes!** ⏰

