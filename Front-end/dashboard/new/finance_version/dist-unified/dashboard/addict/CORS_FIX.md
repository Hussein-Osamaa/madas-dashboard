# CORS Error Fix

## The Problem

You're seeing this error:
```
Access to fetch ... has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present
```

**Why?** You're opening `index.html` directly (double-clicking it), which uses the `file://` protocol. Browsers block API requests from `file://` for security.

## The Solution

**You MUST run a local server.** Here's the easiest way:

### Quick Fix (Python - Recommended)

1. **Open Terminal** (Mac/Linux) or **Command Prompt** (Windows)

2. **Navigate to the addict folder:**
   ```bash
   cd sys/apps/dashboard/public/addict
   ```

3. **Start the server:**
   ```bash
   # Mac/Linux:
   python3 -m http.server 8000
   
   # Windows:
   python -m http.server 8000
   ```

4. **Open in browser:**
   - Go to: `http://localhost:8000`
   - The website should work now! ✅

### Alternative: Node.js

If you have Node.js installed:

```bash
cd sys/apps/dashboard/public/addict
npx serve .
```

Then open the URL shown (usually `http://localhost:3000`)

### Alternative: VS Code Live Server

1. Install "Live Server" extension in VS Code
2. Right-click `index.html`
3. Select "Open with Live Server"

## Why This Works

- `file://` protocol = origin `null` = CORS blocked ❌
- `http://localhost:8000` = proper origin = CORS allowed ✅

The backend API accepts requests from `localhost` origins, but not from `file://`.

## After Starting Server

1. ✅ CORS error will be gone
2. ✅ Products will load from XDIGIX
3. ✅ Everything will work normally

**Remember:** Always use `http://localhost:8000` (or your server URL), never open the HTML file directly!

