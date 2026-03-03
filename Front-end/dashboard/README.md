# Website Builder Publishing System

A comprehensive Firebase-powered website builder with a full publishing system built with React and Firebase.

## Features

### 🚀 Publishing System

- **Draft vs Published Pages**: Separate draft and published versions in Firestore
- **One-Click Publishing**: Copy draft data to published data with a single click
- **Publishing Logs**: Track all publishing activities with timestamps and status
- **Real-time Status Updates**: See publishing progress and results instantly

### 🌐 Hosting & Domains

- **Firebase Hosting Integration**: Automatic deployment to Firebase Hosting
- **Custom Domains**: Support for custom domain configuration
- **DNS Verification**: Automated domain verification with DNS setup instructions
- **SSL Certificates**: Automatic SSL provisioning via Firebase

### 📱 Dynamic Site Rendering

- **JSON to HTML Renderer**: Convert site JSON data to fully rendered HTML
- **SEO Optimization**: Built-in SEO settings with meta tags and Open Graph
- **Responsive Design**: Mobile-first responsive layouts
- **Theme Support**: Customizable themes with CSS variables

### 📁 Media Management

- **Firebase Storage**: Secure file uploads with Firebase Storage
- **CDN Integration**: Fast content delivery via Firebase CDN
- **File Organization**: Organized file structure by user and site
- **Storage Analytics**: Track storage usage and file counts

### 🔐 Security & Authentication

- **Firebase Auth**: Secure user authentication
- **Firestore Security Rules**: Granular access control
- **Storage Security**: User-specific file access controls
- **HTTPS Enforcement**: Secure connections for all published sites

## Tech Stack

- **Frontend**: React 18, Tailwind CSS
- **Backend**: Firebase (Firestore, Auth, Storage, Hosting, Functions)
- **Deployment**: Firebase Hosting with Cloud Functions
- **Database**: Firestore with optimized indexes
- **Storage**: Firebase Storage with CDN

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── publishing/
│   │   │   ├── PublishButton.jsx
│   │   │   ├── PublishLogs.jsx
│   │   │   ├── DomainManager.jsx
│   │   │   ├── SEOSettings.jsx
│   │   │   └── PublishingDashboard.jsx
│   │   └── auth/
│   │       └── Login.jsx
│   ├── services/
│   │   ├── publishingService.js
│   │   ├── domainService.js
│   │   ├── siteService.js
│   │   └── mediaService.js
│   ├── contexts/
│   │   └── AuthContext.js
│   ├── firebase/
│   │   └── config.js
│   ├── App.js
│   ├── App.css
│   └── index.js
├── public/functions/
│   ├── index.js
│   └── package.json
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
└── package.json
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project created

### 2. Install Dependencies

```bash
# Install React app dependencies
npm install

# Install Cloud Functions dependencies
cd public/functions
npm install
cd ../..
```

### 3. Firebase Configuration

1. Update `src/firebase/config.js` with your Firebase project configuration
2. Update `public/functions/index.js` if needed for your project

### 4. Deploy Firebase Rules and Functions

```bash
# Login to Firebase
firebase login

# Set your project
firebase use your-project-id

# Deploy Firestore rules and indexes
firebase deploy --only firestore

# Deploy Storage rules
firebase deploy --only storage

# Deploy Cloud Functions
firebase deploy --only functions

# Deploy Hosting
firebase deploy --only hosting
```

### 5. Start Development Server

```bash
npm start
```

## Usage

### Creating a Site

1. Sign up/Login to the dashboard
2. Click "Create New Site"
3. Enter site name and description
4. Start building your site

### Publishing a Site

1. Select a site from the sidebar
2. Go to the "Publish" tab
3. Click "Publish Site" button
4. Your site will be available at `https://your-site-id.web.app`

### Custom Domains

1. Go to "Custom Domains" tab
2. Add your domain (e.g., `example.com`)
3. Follow the DNS setup instructions
4. Click "Verify" once DNS is configured

### SEO Settings

1. Go to "SEO Settings" tab
2. Configure meta tags, Open Graph, and Twitter Card settings
3. Preview how your site will appear in search results
4. Save settings

## Firestore Schema

### Sites Collection

```javascript
{
  name: string,
  description: string,
  draftData: object,
  publishedData: object,
  status: 'draft' | 'published',
  ownerId: string,
  collaborators: string[],
  seoSettings: {
    title: string,
    description: string,
    keywords: string,
    ogTitle: string,
    ogDescription: string,
    ogImage: string,
    twitterCard: string,
    canonicalUrl: string
  },
  createdAt: timestamp,
  updatedAt: timestamp,
  publishedAt: timestamp
}
```

### Publishing Logs Collection

```javascript
{
  userId: string,
  siteId: string,
  siteName: string,
  status: 'success' | 'error' | 'pending',
  message: string,
  error?: string,
  duration: number,
  url: string,
  timestamp: timestamp
}
```

### Custom Domains Collection

```javascript
{
  domain: string,
  siteId: string,
  ownerId: string,
  status: 'pending' | 'verified' | 'failed',
  verificationToken: string,
  createdAt: timestamp,
  verifiedAt?: timestamp,
  error?: string
}
```

## API Endpoints

### Cloud Functions

- `serveSite`: Serves published sites dynamically
- `publishSite`: Publishes a site
- `verifyDomain`: Verifies custom domains

### Site URLs

- Published sites: `https://your-project.web.app/site/{siteId}`
- Custom domains: `https://your-domain.com` (after verification)

## Security Features

- **Authentication Required**: All operations require valid Firebase Auth
- **User Isolation**: Users can only access their own data
- **Secure Storage**: Files are stored with user-specific access controls
- **HTTPS Only**: All published sites use HTTPS
- **Input Validation**: All inputs are validated and sanitized

## Performance Optimizations

- **Caching**: Published sites are cached for 5 minutes
- **CDN**: Static assets served via Firebase CDN
- **Lazy Loading**: Components are loaded on demand
- **Optimized Queries**: Firestore queries use proper indexes
- **Compression**: All responses are compressed

## Monitoring & Logging

- **Publishing Logs**: Track all publishing activities
- **Error Tracking**: Comprehensive error logging
- **Performance Metrics**: Publishing duration tracking
- **User Analytics**: Track user engagement

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue in the GitHub repository or contact the development team.
