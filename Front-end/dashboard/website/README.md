# MADAS Website - SaaS Business Platform

A comprehensive SaaS platform built with Next.js 15, Firebase, and Tailwind CSS. Provides business management, website building, user authentication, and admin capabilities with complete business isolation.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Visit http://localhost:3001
```

## 📚 Documentation

- **[Quick Start Guide](./QUICK_START.md)** - Get up and running in 5 minutes
- **[Full Documentation](./DOCUMENTATION.md)** - Comprehensive guide to all features
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment instructions

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │   HTML Pages    │    │   Firebase      │
│   (React/TS)    │    │   (Dashboard)   │    │   (Backend)     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Landing       │    │ • Products      │    │ • Firestore     │
│ • Plans         │    │ • Orders        │    │ • Auth          │
│ • Business Setup│    │ • Analytics     │    │ • Hosting       │
│ • Login         │    │ • Staff         │    │ • Functions     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## ✨ Key Features

### 🏢 Business Management
- **Business Isolation**: Each business has completely isolated data
- **Multi-tenant Architecture**: Secure data separation
- **Staff Management**: Role-based access control
- **Subscription Plans**: Starter, Pro, Enterprise tiers

### 🔐 Authentication & Security
- **Firebase Authentication**: Secure user management
- **Business Context**: Automatic business association
- **Permission System**: Granular access control
- **Fail-safe Login**: Auto-creates missing user documents

### 📊 Dashboard System
- **Business Dashboard**: Overview and statistics
- **Products Management**: Inventory and catalog
- **Orders Processing**: Customer order management
- **Analytics**: Sales and performance insights
- **Staff Management**: Team member administration

### 🛠️ Website Builder
- **Professional Builder**: Drag-and-drop website creation
- **Theme Library**: Pre-built templates
- **E-commerce Integration**: Product and order management
- **Publishing System**: Deploy to custom domains

## 🛠️ Technology Stack

- **Frontend**: Next.js 15.5.3, React 19.1.0, TypeScript
- **Styling**: Tailwind CSS 4.0
- **Backend**: Firebase (Firestore, Authentication, Hosting)
- **Build Tool**: Turbopack
- **Deployment**: Firebase Hosting

## 📱 Available Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Landing page with features |
| Plans | `/plans` | Subscription plans |
| Business Setup | `/business-setup` | Create business account |
| Login | `/Login.html` | User authentication |
| Dashboard | `/pages/dashboard/{businessId}` | Business dashboard |
| Products | `/pages/products.html` | Product management |
| Orders | `/pages/orders.html` | Order processing |
| Analytics | `/pages/analytics.html` | Business analytics |
| Staff | `/pages/staff.html` | Team management |
| Website Builder | `/E-comm/professional-builder-new.html` | Website creation |

## 🔧 Development

### Prerequisites
- Node.js 18+
- Firebase project with Firestore and Authentication
- Git repository access

### Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure Firebase: Update `public/firebaseConfig.js`
4. Start development: `npm run dev`

### Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## 🔒 Security Features

- **Business Data Isolation**: Complete data separation
- **Role-based Permissions**: Granular access control
- **Firestore Security Rules**: Database-level security
- **Authentication Guards**: Protected routes
- **Input Validation**: Secure data handling

## 🚀 Deployment

### Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and deploy
firebase login
firebase deploy
```

### Environment Setup
1. Create Firebase project
2. Enable Firestore and Authentication
3. Configure security rules
4. Deploy to Firebase Hosting

See [Deployment Guide](./DEPLOYMENT.md) for detailed instructions.

## 🧪 Testing

### Test Pages
- `/test-signup` - Test user signup flow
- `/business-setup` - Test business creation

### Manual Testing
1. Create a new business account
2. Test login/logout functionality
3. Verify business data isolation
4. Test staff management features

## 📊 Monitoring

- **Firebase Analytics**: User behavior tracking
- **Performance Monitoring**: App performance insights
- **Error Reporting**: Crash and error tracking
- **Custom Metrics**: Business-specific analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Standards
- TypeScript for type safety
- ESLint for code quality
- Component-based architecture
- Business isolation patterns

## 📞 Support

### Getting Help
- Check the [documentation](./DOCUMENTATION.md)
- Review [API reference](./API_REFERENCE.md)
- Test with provided test pages
- Check browser console for errors

### Common Issues
- **Login Loop**: Use the new signup/login services
- **Permission Errors**: Check Firestore security rules
- **Missing Data**: Ensure business context is loaded

## 📈 Roadmap

### Upcoming Features
- [ ] Advanced analytics dashboard
- [ ] Mobile app development
- [ ] API integrations
- [ ] Advanced website builder features
- [ ] Multi-language support

### Performance Improvements
- [ ] Server-side rendering optimization
- [ ] Database query optimization
- [ ] Caching strategies
- [ ] CDN integration

## 📄 License

This project is proprietary software. All rights reserved.

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Maintainer**: MADAS Development Team

For detailed information, see the [full documentation](./DOCUMENTATION.md).