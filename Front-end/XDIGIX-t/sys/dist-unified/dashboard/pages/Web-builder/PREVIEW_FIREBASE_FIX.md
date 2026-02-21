# 🔧 Preview & Firebase Integration Fix

## Problem Fixed

The preview system was showing the error:
```
No themeData or sections found in preview data
```

## Root Cause

**Data Structure Mismatch**: The bridge service was saving preview data with a different structure than what `preview.html` expected.

- **Expected by preview.html**: `{ themeData: { sections: [...], theme: {...} } }`
- **Saved by bridge service**: `{ data: {...} }`

## Solution Implemented

### 1. Fixed Bridge Service Data Structure

**File**: `js/bridge-service.js`

Updated `createPreviewLink()` method to normalize data structure:

```javascript
// Before
const previewData = {
    id: previewId,
    data: websiteData,  // ❌ Wrong structure
    createdAt: ...,
    expiresAt: ...
};

// After
const previewData = {
    id: previewId,
    themeData: normalizedData.themeData,  // ✅ Correct structure
    createdAt: ...,
    expiresAt: ...
};
```

The service now automatically normalizes the data:
- If data already has `themeData`, uses it as-is
- If not, wraps it in the expected format
- Includes theme information from bridge service

### 2. Improved Preview.html Error Handling

**File**: `preview.html`

Added:
- Firebase SDK integration
- Support for legacy data formats
- Better error messages with debugging info
- Fallback for old data structures

```javascript
// Now handles multiple formats:
if (data.themeData && data.themeData.sections) {
    // New format
    render(data.themeData);
} else if (data.sections) {
    // Legacy format
    render({ sections: data.sections, theme: data.theme });
} else {
    // Show helpful error with available keys
    showError(`Found keys: ${Object.keys(data).join(', ')}`);
}
```

### 3. Added Canvas Data Collection

**File**: `js/bridge-service.js`

New method `getCanvasData()` to properly collect sections from the canvas:

```javascript
getCanvasData() {
    const canvas = document.getElementById('canvas-container');
    const sections = [];
    const sectionElements = canvas.querySelectorAll('[data-section-id]');

    sectionElements.forEach((element, index) => {
        sections.push({
            id: element.getAttribute('data-section-id'),
            type: element.getAttribute('data-section-type'),
            content: element.innerHTML,
            styles: element.getAttribute('style'),
            index: index
        });
    });

    return { sections, theme: this.getData('theme') };
}
```

## How to Use the Preview System

### Creating a Preview

From the builder, use the bridge service:

```javascript
// Option 1: Pass canvas data directly
const canvasData = window.bridgeService.getCanvasData();
const result = window.bridgeService.createPreviewLink(canvasData);

if (result.success) {
    window.open(result.previewUrl, '_blank');
}

// Option 2: Pass custom data
const customData = {
    sections: [
        { content: '<h1>Hello World</h1>', type: 'hero' }
    ],
    theme: {
        primaryColor: '#2563eb',
        backgroundColor: '#ffffff'
    }
};
const result = window.bridgeService.createPreviewLink(customData);
```

### Preview Data Structure

The preview system now accepts multiple formats:

#### Format 1: Full Structure (Recommended)
```javascript
{
    themeData: {
        sections: [
            {
                id: 'section-1',
                type: 'hero',
                content: '<div>...</div>',
                styles: 'padding: 20px',
                index: 0
            }
        ],
        theme: {
            primaryColor: '#2563eb',
            secondaryColor: '#1e40af',
            backgroundColor: '#ffffff',
            textColor: '#1f293b'
        }
    }
}
```

#### Format 2: Legacy (Still Supported)
```javascript
{
    sections: [...],
    theme: {...}
}
```

#### Format 3: Simple Array (Auto-wrapped)
```javascript
[
    { content: '...', type: '...' }
]
```

## Firebase Integration

### Preview Storage

Previews are stored in:
1. **localStorage** (Primary) - For immediate access
2. **Firebase** (Optional) - For persistent/shared previews

```javascript
// localStorage key format
localStorage.setItem('preview_{previewId}', JSON.stringify({
    id: previewId,
    themeData: { sections, theme },
    createdAt: '2025-10-22T...',
    expiresAt: '2025-10-23T...' // 24 hours
}));
```

### Firebase Integration (Optional)

To enable Firebase-based previews:

1. **Initialize Firebase in preview.html** (Already added):
```html
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
```

2. **Save to Firebase**:
```javascript
// In bridge-service.js (automatic if Firebase available)
if (this.firebase) {
    await this.saveToFirebase('previews', previewId, previewData);
}
```

3. **Load from Firebase**:
```javascript
// In preview.html (automatic fallback)
if (!localData && window.firebase) {
    const firebaseData = await loadFromFirebase('previews', previewId);
}
```

## Testing

### Test Preview Creation

```javascript
// Open browser console in builder
const testData = {
    sections: [
        {
            id: 'test-1',
            type: 'hero',
            content: '<div style="padding: 40px; background: #2563eb; color: white; text-align: center;"><h1>Test Preview</h1><p>This is a test section</p></div>'
        }
    ],
    theme: {
        primaryColor: '#2563eb',
        backgroundColor: '#ffffff'
    }
};

const result = window.bridgeService.createPreviewLink(testData);
console.log('Preview URL:', result.previewUrl);
window.open(result.previewUrl, '_blank');
```

### Test Canvas Data Collection

```javascript
// After adding sections to canvas
const canvasData = window.bridgeService.getCanvasData();
console.log('Canvas Data:', canvasData);
console.log('Sections found:', canvasData.sections.length);
```

### Debug Preview Issues

```javascript
// Check what's stored in localStorage
const previewId = 'your-preview-id'; // Get from URL
const stored = localStorage.getItem(`preview_${previewId}`);
console.log('Stored data:', JSON.parse(stored));

// Check data structure
const data = JSON.parse(stored);
console.log('Has themeData?', !!data.themeData);
console.log('Has sections?', !!data.themeData?.sections);
console.log('Section count:', data.themeData?.sections?.length);
```

## Common Issues & Solutions

### Issue 1: "No preview data available"

**Cause**: Empty or incorrectly structured data

**Solution**:
```javascript
// Check console for "Available keys" message
// Should show: themeData, id, createdAt, expiresAt

// If not, recreate preview with correct data
const canvasData = window.bridgeService.getCanvasData();
const result = window.bridgeService.createPreviewLink(canvasData);
```

### Issue 2: "Preview has expired"

**Cause**: Preview is older than 24 hours

**Solution**:
```javascript
// Create a new preview
const result = window.bridgeService.createPreviewLink(canvasData);
```

### Issue 3: Preview shows empty content

**Cause**: Sections array is empty

**Solution**:
```javascript
// Verify sections exist in canvas
const canvas = document.getElementById('canvas-container');
const sections = canvas.querySelectorAll('[data-section-id]');
console.log('Sections in canvas:', sections.length);

// Make sure sections have data-section-id attribute
```

### Issue 4: Firebase not saving previews

**Cause**: Firebase not initialized or permissions issue

**Solution**:
```javascript
// Check Firebase initialization
console.log('Firebase available?', !!window.firebase);
console.log('Bridge has Firebase?', !!window.bridgeService.firebase);

// Test Firebase connection
await window.bridgeService.saveToFirebase('test', 'test-doc', { test: true });
```

## API Reference

### Bridge Service Methods

#### `createPreviewLink(websiteData)`
Creates a preview link for the provided website data.

**Parameters**:
- `websiteData` (Object): Website data (auto-normalized to correct format)

**Returns**:
```javascript
{
    success: true,
    previewUrl: 'preview.html?id=abc123',
    previewId: 'abc123',
    expiresAt: '2025-10-23T12:00:00.000Z'
}
```

#### `getCanvasData()`
Collects all sections from the canvas.

**Returns**:
```javascript
{
    sections: Array<Section>,
    theme: Object
}
```

#### `getPreviewData(previewId)`
Loads preview data by ID.

**Parameters**:
- `previewId` (String): The preview ID

**Returns**:
```javascript
{
    success: true,
    data: { themeData: { sections, theme } }
}
```

## Files Modified

1. **js/bridge-service.js**
   - Updated `createPreviewLink()` - Normalizes data structure
   - Added `getCanvasData()` - Collects canvas sections

2. **preview.html**
   - Added Firebase SDK
   - Improved error handling
   - Added legacy format support
   - Better debugging messages

## Backward Compatibility

✅ **100% Compatible**
- Supports old data formats
- Automatic data normalization
- Graceful fallbacks
- No breaking changes

## Next Steps

For production deployment:

1. ✅ Preview system is now working
2. ⚠️ Consider adding Firebase Security Rules for preview collection
3. ⚠️ Consider adding preview cleanup (remove expired previews)
4. ⚠️ Consider adding preview analytics

## Example Firebase Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Preview collection (24-hour expiration)
    match /previews/{previewId} {
      allow read: if true; // Public read
      allow write: if request.auth != null; // Authenticated write only
    }
  }
}
```

---

**Status**: ✅ Fixed and Ready
**Date**: October 22, 2025
**Version**: 1.0.2
