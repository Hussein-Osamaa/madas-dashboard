# 🚀 Financial Dashboard - React + Firebase

A comprehensive financial dashboard web application built with React and Firebase for managing business finances, tracking KPIs, and generating reports.

## ✨ Features

### 📊 **Financial Metrics & KPIs**

- **Revenue Tracking**: Gross revenue, net revenue, average order value
- **Profit Analysis**: Gross profit, net profit, profit margins
- **Cash Flow Management**: Cash inflows, outflows, operating cash flow
- **Expense Management**: COGS, operating expenses, expense categorization
- **Inventory Analytics**: Stock levels, turnover ratios, days on hand
- **Customer Metrics**: Customer acquisition cost, lifetime value, churn rate

### 🔐 **Authentication & Authorization**

- Firebase Authentication with email/password
- Role-based access control (Admin, Manager, Viewer)
- Secure user management and permissions

### 📈 **Data Visualization**

- Interactive charts with Chart.js
- Real-time data updates
- Revenue trends, expense breakdowns, cash flow analysis
- Responsive design for all devices

### 📤 **Export & Reporting**

- CSV, Excel, and PDF export functionality
- Comprehensive financial reports
- Chart export as images
- Scheduled report generation

### 🔄 **Real-time Updates**

- Live data synchronization with Firestore
- Real-time KPI calculations
- Automatic data refresh

## 🛠️ Tech Stack

- **Frontend**: React 18, Tailwind CSS, React Router
- **Backend**: Firebase (Firestore, Auth, Functions, Hosting)
- **Charts**: Chart.js with React Chart.js 2
- **Export**: XLSX, jsPDF, html2canvas
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- Firebase project with Firestore, Auth, and Functions enabled

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd financial-dashboard
npm install
```

### 2. Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Enable Firebase Functions
5. Copy your Firebase config

### 3. Configure Firebase

Update `src/firebase/config.js` with your Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id",
};
```

### 4. Firestore Security Rules

Set up your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Sales collection - authenticated users can read/write
    match /sales/{document} {
      allow read, write: if request.auth != null;
    }

    // Expenses collection - authenticated users can read/write
    match /expenses/{document} {
      allow read, write: if request.auth != null;
    }

    // Inventory collection - authenticated users can read/write
    match /inventory/{document} {
      allow read, write: if request.auth != null;
    }

    // Customers collection - authenticated users can read/write
    match /customers/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 5. Run the Application

```bash
npm start
```

The app will open at `http://localhost:3000`

## 📁 Project Structure

```
financial-dashboard/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── auth/           # Authentication components
│   │   ├── charts/         # Chart components
│   │   ├── common/         # Reusable components
│   │   ├── dashboard/      # Dashboard-specific components
│   │   ├── export/         # Export functionality
│   │   ├── layout/         # Layout components
│   │   └── ui/             # UI components
│   ├── contexts/           # React contexts
│   ├── firebase/           # Firebase configuration and utilities
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Page components
│   ├── utils/              # Utility functions
│   ├── App.js              # Main app component
│   ├── index.js            # App entry point
│   └── index.css           # Global styles
├── package.json
├── tailwind.config.js
└── README.md
```

## 🔧 Configuration

### User Roles

The application supports three user roles:

- **Admin**: Full access to all features and settings
- **Manager**: Access to most features, limited settings access
- **Viewer**: Read-only access to dashboard and reports

### Data Models

#### Sales Document

```javascript
{
  amount: number,
  grossAmount: number,
  customerId: string,
  customerName: string,
  productName: string,
  status: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### Expense Document

```javascript
{
  amount: number,
  category: string,
  description: string,
  type: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### Inventory Document

```javascript
{
  name: string,
  quantity: number,
  costPrice: number,
  sellingPrice: number,
  minStock: number,
  category: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## 🚀 Deployment

### Firebase Hosting

```bash
npm run build
firebase deploy
```

### Environment Variables

Create a `.env` file for environment-specific configurations:

```env
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=your-app-id
```

## 📊 Usage Guide

### 1. **Initial Setup**

- Create your first admin user through Firebase Authentication
- Set up your business information in Settings
- Configure your chart of accounts and expense categories

### 2. **Adding Data**

- **Sales**: Add sales transactions with customer and product information
- **Expenses**: Categorize expenses by type (COGS, Marketing, Operations, etc.)
- **Inventory**: Track product stock levels and costs
- **Customers**: Manage customer information and relationships

### 3. **Viewing Analytics**

- **Dashboard**: Overview of key financial metrics
- **Charts**: Visual representation of trends and patterns
- **Reports**: Detailed financial reports and analysis

### 4. **Exporting Data**

- Use the Export button to download data in various formats
- Generate comprehensive financial reports
- Export charts as images for presentations

## 🔒 Security Considerations

- All data is stored securely in Firestore with proper security rules
- User authentication is handled by Firebase Auth
- Role-based access control ensures data security
- All API calls are authenticated and authorized

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue in the GitHub repository
- Check the documentation
- Review Firebase documentation for backend issues

## 🎯 Roadmap

- [ ] Advanced reporting with custom date ranges
- [ ] Integration with accounting software (QuickBooks, Xero)
- [ ] Mobile app development
- [ ] Advanced analytics with machine learning
- [ ] Multi-currency support
- [ ] Automated expense categorization
- [ ] Budget planning and forecasting tools

---

**Built with ❤️ using React and Firebase**
