# Marketing App

The public-facing marketing website for Madas - featuring landing page, pricing, and company information.

## 🚀 Features

- **Landing Page** - Hero section, features, testimonials, and CTA
- **Pricing Page** - Subscription plans with Stripe integration
- **Responsive Design** - Mobile-first approach with TailwindCSS
- **SEO Optimized** - Meta tags, Open Graph, and structured data
- **Performance** - Optimized images and fast loading times

## 🛠️ Tech Stack

- **Next.js 14** - App Router with TypeScript
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - Reusable UI components
- **Framer Motion** - Smooth animations
- **Lucide React** - Beautiful icons
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
│   ├── layout/          # Header, Footer
│   └── sections/        # Hero, Features, Pricing, etc.
├── app/                 # Next.js App Router
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page
│   └── pricing/         # Pricing page
└── lib/                 # Utilities (if needed)
```

## 🎨 Components

### Layout Components
- **Header** - Navigation with mobile menu
- **Footer** - Links, social media, company info

### Section Components
- **Hero** - Main landing section with CTA
- **Features** - Feature grid with icons
- **Testimonials** - Customer reviews and ratings
- **Pricing** - Subscription plans
- **CTA** - Call-to-action section
- **FAQ** - Frequently asked questions

## 🚀 Deployment

### Firebase Hosting

```bash
# Build the app
npm run build

# Deploy to Firebase
firebase deploy --only hosting:marketing
```

### Environment Setup

1. Set up Firebase project with hosting
2. Configure custom domain (optional)
3. Set up environment variables in Firebase
4. Deploy the app

## 📱 Pages

### Home Page (`/`)
- Hero section with main value proposition
- Features showcase
- Customer testimonials
- Pricing overview
- Call-to-action

### Pricing Page (`/pricing`)
- Detailed pricing plans
- Feature comparison
- FAQ section
- Enterprise contact

## 🎯 SEO Features

- **Meta Tags** - Title, description, keywords
- **Open Graph** - Social media sharing
- **Twitter Cards** - Twitter sharing
- **Structured Data** - Rich snippets
- **Sitemap** - Search engine indexing
- **Robots.txt** - Crawler instructions

## 🔧 Customization

### Colors and Branding
Edit `tailwind.config.js` to customize:
- Primary colors
- Typography
- Spacing
- Animations

### Content
Update components in `src/components/sections/` to modify:
- Headlines and copy
- Features list
- Testimonials
- Pricing plans

### Styling
Modify `app/globals.css` for:
- Global styles
- Custom CSS classes
- Dark mode support

## 📊 Analytics

The app is ready for analytics integration:
- Google Analytics
- Facebook Pixel
- Custom event tracking

## 🤝 Contributing

1. Follow the existing code style
2. Use TypeScript for all new code
3. Test responsive design
4. Update documentation when needed

## 📄 License

Private - All rights reserved
