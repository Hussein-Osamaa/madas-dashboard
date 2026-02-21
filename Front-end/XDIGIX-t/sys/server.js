/**
 * Minimal static server for local preview of the unified frontend.
 * Run after: npm run build
 * Serves: dist-unified/ (marketing, /dashboard, /finance, /admin, /warehouse)
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist-unified');

// Static files from dist-unified (assets, etc.)
app.use(express.static(distPath));

// SPA fallbacks: serve index.html for app routes
const appPaths = ['/dashboard', '/finance', '/admin', '/warehouse'];
appPaths.forEach((base) => {
  app.get(base, (req, res) => {
    const indexFile = path.join(distPath, base, 'index.html');
    if (fs.existsSync(indexFile)) res.sendFile(indexFile);
    else res.status(404).send('Not built yet. Run: npm run build');
  });
  app.get(`${base}/*`, (req, res) => {
    const indexFile = path.join(distPath, base, 'index.html');
    if (fs.existsSync(indexFile)) res.sendFile(indexFile);
    else res.status(404).send('Not built yet. Run: npm run build');
  });
});

// Root SPA fallback
app.get('*', (req, res) => {
  const indexFile = path.join(distPath, 'index.html');
  if (fs.existsSync(indexFile)) res.sendFile(indexFile);
  else res.status(404).send('Not built yet. Run: npm run build');
});

if (!fs.existsSync(distPath)) {
  console.warn('dist-unified/ not found. Run: npm run build');
}

app.listen(PORT, () => {
  console.log(`[Server] Preview at http://localhost:${PORT}`);
  console.log('  /  marketing  |  /dashboard  |  /finance  |  /admin  |  /warehouse');
});
