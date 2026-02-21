# ⚡ Quick Email Setup - 5 Minutes!

## 🎯 **Follow These Steps:**

### **Step 1: Get Gmail App Password** (2 minutes)

1. **Open:** https://myaccount.google.com/apppasswords
2. **Enable 2-Step Verification** (if not already enabled)
3. **Click:** "Select app" → Choose "Mail"
4. **Click:** "Select device" → Choose "Other (Custom name)"
5. **Type:** "MADAS Staff Invitations"
6. **Click:** "Generate"
7. **Copy** the 16-character password (looks like: `abcd efgh ijkl mnop`)

---

### **Step 2: Create .env File** (1 minute)

**Run these commands in terminal:**

```bash
cd "/Users/mac/university/Project's/Web/Front-End/Projects/Madas/Front-end/dashboard/sys"

cat > .env << 'EOF'
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
PORT=3000
EOF
```

**Then edit the file:**
```bash
nano .env
```

**Replace:**
- `your-email@gmail.com` → Your actual Gmail
- `abcdefghijklmnop` → Your 16-character app password (remove spaces!)

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

---

### **Step 3: Restart Server** (30 seconds)

```bash
pkill -f "node server.js"
sleep 2
node server.js &
```

---

### **Step 4: Test It!** (1 minute)

1. **Go to:** http://192.168.1.58:3000/dashboard/pages/Admin.html
2. **Click:** "Add Staff"
3. **Fill in:**
   - Email: your-test-email@gmail.com (use your own!)
   - Name: Test User
   - Role: Admin
   - Check some permissions
4. **Click:** "Send Invitation"
5. **Check your inbox!** 📧

---

## ✅ **Expected Result:**

You should see:
```
✅ Staff member added and invitation email sent to your-test-email@gmail.com!
```

And receive an email with:
- Subject: "🎉 You've been invited to join [Your Business] on MADAS"
- Beautiful HTML template
- Login link
- Role information

---

## 🚨 **Troubleshooting:**

### **"Failed to send email"**
- Check your app password (no spaces!)
- Make sure 2-Step Verification is enabled
- Try regenerating the app password

### **"Email not received"**
- Check spam folder
- Wait 1-2 minutes
- Verify email address is correct
- Check server logs for errors

### **"Invalid login"**
- You're using regular password instead of app password
- Generate app password at: https://myaccount.google.com/apppasswords

---

## 🎉 **That's It!**

Your email invitation system is now live! 🚀

**Next:** Start inviting your team members!


## 🎯 **Follow These Steps:**

### **Step 1: Get Gmail App Password** (2 minutes)

1. **Open:** https://myaccount.google.com/apppasswords
2. **Enable 2-Step Verification** (if not already enabled)
3. **Click:** "Select app" → Choose "Mail"
4. **Click:** "Select device" → Choose "Other (Custom name)"
5. **Type:** "MADAS Staff Invitations"
6. **Click:** "Generate"
7. **Copy** the 16-character password (looks like: `abcd efgh ijkl mnop`)

---

### **Step 2: Create .env File** (1 minute)

**Run these commands in terminal:**

```bash
cd "/Users/mac/university/Project's/Web/Front-End/Projects/Madas/Front-end/dashboard/sys"

cat > .env << 'EOF'
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
PORT=3000
EOF
```

**Then edit the file:**
```bash
nano .env
```

**Replace:**
- `your-email@gmail.com` → Your actual Gmail
- `abcdefghijklmnop` → Your 16-character app password (remove spaces!)

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

---

### **Step 3: Restart Server** (30 seconds)

```bash
pkill -f "node server.js"
sleep 2
node server.js &
```

---

### **Step 4: Test It!** (1 minute)

1. **Go to:** http://192.168.1.58:3000/dashboard/pages/Admin.html
2. **Click:** "Add Staff"
3. **Fill in:**
   - Email: your-test-email@gmail.com (use your own!)
   - Name: Test User
   - Role: Admin
   - Check some permissions
4. **Click:** "Send Invitation"
5. **Check your inbox!** 📧

---

## ✅ **Expected Result:**

You should see:
```
✅ Staff member added and invitation email sent to your-test-email@gmail.com!
```

And receive an email with:
- Subject: "🎉 You've been invited to join [Your Business] on MADAS"
- Beautiful HTML template
- Login link
- Role information

---

## 🚨 **Troubleshooting:**

### **"Failed to send email"**
- Check your app password (no spaces!)
- Make sure 2-Step Verification is enabled
- Try regenerating the app password

### **"Email not received"**
- Check spam folder
- Wait 1-2 minutes
- Verify email address is correct
- Check server logs for errors

### **"Invalid login"**
- You're using regular password instead of app password
- Generate app password at: https://myaccount.google.com/apppasswords

---

## 🎉 **That's It!**

Your email invitation system is now live! 🚀

**Next:** Start inviting your team members!



