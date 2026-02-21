const fs = require('fs');
const path = require('path');

// Create shortcut icons for the manifest
const createShortcutIcon = (name, size = 96) => {
  const icon = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad-${name}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#27491F;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#4A7C59;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#grad-${name})" rx="${size * 0.15}"/>
    <rect x="${size * 0.15}" y="${size * 0.15}" width="${size * 0.7}" height="${size * 0.7}" fill="white" rx="${size * 0.1}"/>
    <text x="50%" y="50%" text-anchor="middle" dy="0.35em" font-family="Arial, sans-serif" font-size="${size * 0.3}" font-weight="bold" fill="#27491F">${name}</text>
  </svg>`;
  
  return icon;
};

// Create shortcut icons
const shortcuts = [
  { name: 'O', filename: 'shortcut-order.svg', title: 'Order' },
  { name: 'S', filename: 'shortcut-scan.svg', title: 'Scan' }
];

shortcuts.forEach(shortcut => {
  const svg = createShortcutIcon(shortcut.name);
  const filePath = path.join(__dirname, 'dist', 'assets', 'icons', shortcut.filename);
  fs.writeFileSync(filePath, svg);
  console.log(`✅ Created ${shortcut.filename} (${shortcut.title})`);
});

// Create placeholder screenshots
const createScreenshot = (name, width = 390, height = 844) => {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-${name}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#f8f9fa;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#e9ecef;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg-${name})"/>
    <rect x="20" y="60" width="${width-40}" height="60" fill="#27491F" rx="10"/>
    <text x="50%" y="90" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white">MADAS Mobile</text>
    <text x="50%" y="${height/2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#27491F">${name} Screen</text>
    <text x="50%" y="${height/2 + 40}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#6c757d">Mobile Dashboard Preview</text>
  </svg>`;
  
  return svg;
};

const screenshots = [
  { name: 'dashboard', filename: 'dashboard.svg' },
  { name: 'products', filename: 'products.svg' }
];

screenshots.forEach(screenshot => {
  const svg = createScreenshot(screenshot.name);
  const filePath = path.join(__dirname, 'dist', 'assets', 'screenshots', screenshot.filename);
  fs.writeFileSync(filePath, svg);
  console.log(`✅ Created ${screenshot.filename}`);
});

console.log('🎨 All shortcut icons and screenshots created!');
