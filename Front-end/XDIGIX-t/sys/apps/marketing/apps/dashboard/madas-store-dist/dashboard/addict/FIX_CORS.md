# ⚠️ CORS Error Fix - IMPORTANT!

## The Problem

You're seeing this error:
```
Access to fetch ... has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present
Origin: 'null'
```

**This means you're opening the HTML file directly (double-clicking it).**

## ✅ The Solution: Use a Local Server

You **MUST** run a local server. Here's the **EASIEST** way:

### Quick Fix (Copy & Paste This):

**On Mac/Linux:**
```bash
cd sys/apps/dashboard/public/addict
python3 -m http.server 8000
```

**On Windows:**
```bash
cd sys\apps\dashboard\public\addict
python -m http.server 8000
```

Then open: **http://localhost:8000**

---

## Step-by-Step Instructions

### Step 1: Open Terminal/Command Prompt

- **Mac**: Press `Cmd + Space`, type "Terminal", press Enter
- **Windows**: Press `Win + R`, type "cmd", press Enter
- **Linux**: Press `Ctrl + Alt + T`

### Step 2: Navigate to the Folder

**Mac/Linux:**
```bash
cd sys/apps/dashboard/public/addict
```

**Windows:**
```bash
cd sys\apps\dashboard\public\addict
```

### Step 3: Start Server

**If you have Python (most common):**
```bash
# Mac/Linux:
python3 -m http.server 8000

# Windows:
python -m http.server 8000
```

**OR if you have Node.js:**
```bash
npx serve .
```

### Step 4: Open in Browser

- Go to: **http://localhost:8000**
- The CORS error will be GONE! ✅
- Products will load! 🎉

---

## Why This Happens

| Method | Origin | Works? |
|--------|--------|--------|
| Double-click `index.html` | `null` (file://) | ❌ CORS blocked |
| `http://localhost:8000` | `http://localhost:8000` | ✅ Works! |

Browsers block API requests from `file://` for security. A local server provides a proper `http://` origin.

---

## Alternative: Use the Scripts

I've created helper scripts:

- **Mac/Linux**: Double-click `START_SERVER.sh`
- **Windows**: Double-click `START_SERVER.bat`

These will guide you through starting a server.

---

## After Starting Server

1. ✅ CORS error disappears
2. ✅ Products load from MADAS
3. ✅ Everything works normally

**Remember:** Always use `http://localhost:8000`, never open the HTML file directly!

---

## Still Having Issues?

1. Make sure you're in the correct folder
2. Check that Python/Node.js is installed
3. Try a different port: `python3 -m http.server 8080`
4. Check firewall isn't blocking the port

