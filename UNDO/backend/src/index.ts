import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Stripe } from 'stripe';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Stripe
const stripe = new Stripe(functions.config().stripe.secret_key, {
  apiVersion: '2023-10-16',
});

// Import function modules
import { authFunctions } from './functions/auth';
import { stripeFunctions } from './functions/stripe';
import { websiteFunctions } from './functions/websites';
import { adminFunctions } from './functions/admin';
import { userFunctions } from './functions/users';
import { analyticsFunctions } from './functions/analytics';

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3002',
    'http://localhost:3003',
    'https://madas.com',
    'https://dashboard.madas.com',
    'https://builder.madas.com',
    'https://admin.madas.com'
  ],
  credentials: true,
};

const corsHandler = cors(corsOptions);

// Express app for HTTP functions
const app = express();
app.use(helmet());
app.use(compression());
app.use(corsHandler);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Export HTTP functions
export const api = functions.https.onRequest(app);

// Export all function modules
export const {
  createUser,
  updateUser,
  deleteUser,
  getUserProfile
} = authFunctions;

export const {
  createStripeCustomer,
  createCheckoutSession,
  handleStripeWebhook,
  cancelSubscription,
  updateSubscription,
  getSubscriptionStatus
} = stripeFunctions;

export const {
  createWebsite,
  updateWebsite,
  deleteWebsite,
  publishWebsite,
  unpublishWebsite,
  getWebsite,
  listUserWebsites
} = websiteFunctions;

export const {
  getAdminStats,
  getSystemLogs,
  updateSystemSettings,
  exportUserData,
  sendAdminNotification
} = adminFunctions;

export const {
  updateUserProfile,
  getUserAnalytics,
  getUserSubscription,
  updateUserPreferences
} = userFunctions;

export const {
  trackWebsiteView,
  getWebsiteAnalytics,
  getPlatformAnalytics,
  generateAnalyticsReport
} = analyticsFunctions;

// Scheduled functions
export const cleanupTempFiles = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({ prefix: 'temp/' });
    
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    const deletePromises = files
      .filter(file => {
        const [created] = file.metadata.timeCreated;
        return new Date(created).getTime() < oneDayAgo;
      })
      .map(file => file.delete());
    
    await Promise.all(deletePromises);
    console.log(`Cleaned up ${deletePromises.length} temporary files`);
  });

export const generateDailyReports = functions.pubsub
  .schedule('0 6 * * *') // Every day at 6 AM
  .timeZone('UTC')
  .onRun(async (context) => {
    // Generate daily analytics reports
    const db = admin.firestore();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Get daily stats
    const usersSnapshot = await db.collection('users').get();
    const websitesSnapshot = await db.collection('websites').get();
    const subscriptionsSnapshot = await db.collection('subscriptions').get();
    
    const dailyReport = {
      date: yesterday.toISOString().split('T')[0],
      users: {
        total: usersSnapshot.size,
        new: usersSnapshot.docs.filter(doc => {
          const createdAt = doc.data().createdAt?.toDate();
          return createdAt && createdAt.toDateString() === yesterday.toDateString();
        }).length
      },
      websites: {
        total: websitesSnapshot.size,
        published: websitesSnapshot.docs.filter(doc => doc.data().status === 'published').length
      },
      subscriptions: {
        total: subscriptionsSnapshot.size,
        active: subscriptionsSnapshot.docs.filter(doc => doc.data().status === 'active').length
      },
      generatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('daily_reports').add(dailyReport);
    console.log('Daily report generated:', dailyReport);
  });

// Error handling middleware
app.use((error: any, req: any, res: any, next: any) => {
  console.error('API Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});
