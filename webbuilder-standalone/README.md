# Website Builder App

The core drag-and-drop website builder for Madas - featuring a visual editor, component library, and real-time preview.

## 🚀 Features

- **Drag & Drop Editor** - Visual website building with intuitive interface
- **Component Library** - Pre-built components (text, images, buttons, forms, etc.)
- **Real-time Preview** - Live preview with device responsiveness
- **Properties Panel** - Edit component properties and styles
- **Undo/Redo** - Full history management
- **Auto-save** - Automatic saving of changes
- **Export/Import** - Export websites and import templates

## 🛠️ Tech Stack

- **Next.js 14** - App Router with TypeScript
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - Reusable UI components
- **@dnd-kit** - Drag and drop functionality
- **Framer Motion** - Smooth animations
- **React Hook Form** - Form management
- **Shared Package** - Common components and utilities

## 📦 Getting Started

### Prerequisites

- Node.js 18+
- npm 8+

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp env.local.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

### Environment Variables

Create a `.env.local` file with:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DASHBOARD_URL=http://localhost:3001
NEXT_PUBLIC_BUILDER_URL=http://localhost:3002
NEXT_PUBLIC_ADMIN_URL=http://localhost:3003

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
```

## 📁 Project Structure

```
src/
├── components/
│   └── editor/          # Editor components
│       ├── EditorLayout.tsx
│       ├── EditorToolbar.tsx
│       ├── ComponentLibrary.tsx
│       ├── EditorCanvas.tsx
│       ├── ComponentRenderer.tsx
│       ├── PropertiesPanel.tsx
│       ├── PreviewMode.tsx
│       └── DragOverlayContent.tsx
├── contexts/
│   └── EditorContext.tsx # Editor state management
├── types/
│   └── editor.ts        # Editor-specific types
└── app/                 # Next.js App Router
    ├── globals.css      # Global styles
    ├── layout.tsx       # Root layout
    └── page.tsx         # Editor page
```

## 🎨 Components

### Editor Components
- **EditorLayout** - Main layout with sidebars and canvas
- **EditorToolbar** - Top toolbar with actions
- **ComponentLibrary** - Left sidebar with draggable components
- **EditorCanvas** - Center canvas for building
- **PropertiesPanel** - Right sidebar for editing properties
- **PreviewMode** - Full-screen preview mode

### Component Types
- **Text** - Headings, paragraphs, rich text
- **Media** - Images, videos, galleries
- **Layout** - Containers, rows, columns
- **Interactive** - Buttons, links, forms
- **Forms** - Contact forms, surveys

## 🎯 Editor Features

### Drag & Drop
- Drag components from library to canvas
- Reorder components by dragging
- Visual drop indicators
- Snap to grid functionality

### Component Editing
- Inline text editing
- Properties panel for detailed editing
- Style customization (colors, spacing, fonts)
- Real-time preview

### Canvas Management
- Multiple device previews (mobile, tablet, desktop)
- Zoom controls
- Grid and ruler display
- Component selection and manipulation

### History Management
- Undo/redo functionality
- Auto-save every 2 seconds
- History state management
- Unsaved changes indicator

## 🔧 Development

### Adding New Components

1. **Define Component Type** in `ComponentLibrary.tsx`:
```typescript
{
  id: 'my-component',
  name: 'My Component',
  description: 'Description of my component',
  icon: MyIcon,
  type: 'my-component',
  defaultProps: {
    type: 'my-component',
    content: { /* default content */ },
    styles: { /* default styles */ }
  }
}
```

2. **Add Renderer** in `ComponentRenderer.tsx`:
```typescript
case 'my-component':
  return <MyComponentRenderer {...component} />
```

3. **Add Properties** in `PropertiesPanel.tsx`:
```typescript
case 'my-component':
  return <MyComponentProperties component={selectedBlock} />
```

### State Management

The editor uses React Context for state management:

```typescript
const {
  website,
  currentPage,
  selectedComponent,
  addComponent,
  updateComponent,
  deleteComponent,
  // ... other actions
} = useEditor()
```

### Component Structure

Each component follows this structure:

```typescript
interface ContentBlock {
  id: string
  type: string
  content: any
  styles: Record<string, any>
  order: number
}
```

## 🚀 Deployment

### Firebase Hosting

```bash
# Build the app
npm run build

# Deploy to Firebase
firebase deploy --only hosting:webbuilder
```

### Environment Setup

1. Set up Firebase project with hosting
2. Configure custom domain (optional)
3. Set up environment variables in Firebase
4. Deploy the app

## 🎨 Customization

### Adding New Component Categories

1. Add category to `componentCategories` in `ComponentLibrary.tsx`
2. Add components to the category
3. Update icons and descriptions

### Styling

- Modify `app/globals.css` for global styles
- Update `tailwind.config.js` for theme customization
- Component-specific styles in individual components

### Keyboard Shortcuts

- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Y` - Redo
- `Ctrl/Cmd + S` - Save
- `Delete` - Delete selected component
- `Ctrl/Cmd + D` - Duplicate selected component

## 📊 Performance

- **Lazy Loading** - Components loaded on demand
- **Virtual Scrolling** - For large component lists
- **Debounced Auto-save** - Prevents excessive API calls
- **Optimized Re-renders** - Using React.memo and useMemo

## 🤝 Contributing

1. Follow the existing code style
2. Use TypeScript for all new code
3. Test drag and drop functionality
4. Update documentation when adding new features

## 📄 License

Private - All rights reserved
