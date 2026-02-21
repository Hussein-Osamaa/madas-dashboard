const fs = require('fs');
const path = require('path');

// Create a simple MADAS icon as PNG using canvas-like approach
// Since we can't use canvas in Node.js without additional dependencies,
// let's create simple HTML files that can be converted to PNG

const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

const createIconHTML = (size) => {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            margin: 0;
            padding: 0;
            width: ${size}px;
            height: ${size}px;
            background: linear-gradient(135deg, #27491F 0%, #4A7C59 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Arial', sans-serif;
        }
        .icon {
            width: ${size * 0.7}px;
            height: ${size * 0.7}px;
            background: white;
            border-radius: ${size * 0.15}px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .letter {
            font-size: ${size * 0.4}px;
            font-weight: bold;
            color: #27491F;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="icon">
        <div class="letter">M</div>
    </div>
</body>
</html>`;
};

// Create HTML files for each icon size
iconSizes.forEach(size => {
  const html = createIconHTML(size);
  const filePath = path.join(__dirname, 'dist', 'assets', 'icons', `icon-${size}x${size}.html`);
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, html);
  console.log(`✅ Created icon-${size}x${size}.html`);
});

console.log('🎨 Icon HTML files created!');
console.log('📝 Note: These HTML files can be converted to PNG using a browser screenshot or online converter.');
console.log('🔧 For now, let\'s update the manifest to use SVG files instead.');

// Update manifest to use SVG files
const manifestPath = path.join(__dirname, 'dist', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

manifest.icons = iconSizes.map(size => ({
  src: `assets/icons/icon-${size}x${size}.svg`,
  sizes: `${size}x${size}`,
  type: 'image/svg+xml',
  purpose: 'maskable any'
}));

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('✅ Updated manifest.json to use SVG icons');
