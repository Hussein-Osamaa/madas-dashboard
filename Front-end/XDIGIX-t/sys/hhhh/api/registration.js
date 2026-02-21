/**
 * REGISTRATION & CONTACT API ENDPOINTS
 * Handles new business registration and contact form submissions
 */

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');

const db = admin.firestore();

/**
 * POST /api/register
 * Register new business account
 */
router.post('/register', async (req, res) => {
  try {
    const {
      // Step 1: Business Information
      businessName,
      industry,
      businessEmail,
      phone,
      companySize,
      
      // Step 2: Plan
      plan,
      
      // Step 3: Account Setup
      userName,
      userEmail,
      password
    } = req.body;

    // Validation
    if (!businessName || !businessEmail || !industry || !companySize) {
      return res.status(400).json({ 
        error: 'Missing required business information' 
      });
    }

    if (!plan || !['basic', 'professional', 'enterprise'].includes(plan)) {
      return res.status(400).json({ 
        error: 'Invalid plan selected' 
      });
    }

    if (!userName || !userEmail || !password) {
      return res.status(400).json({ 
        error: 'Missing required account information' 
      });
    }

    // Check if business email already exists
    const existingBusinesses = await db.collection('businesses')
      .where('contact.email', '==', businessEmail)
      .get();

    if (!existingBusinesses.empty) {
      return res.status(409).json({ 
        error: 'A business with this email already exists' 
      });
    }

    // Create user in Firebase Auth
    let userRecord;
    try {
      userRecord = await admin.auth().createUser({
        email: userEmail,
        password: password,
        displayName: userName
      });
    } catch (authError) {
      if (authError.code === 'auth/email-already-exists') {
        return res.status(409).json({ 
          error: 'An account with this email already exists' 
        });
      }
      throw authError;
    }

    // Get plan details
    const planDoc = await db.collection('plans').doc(`plan_${plan}`).get();
    const planData = planDoc.exists ? planDoc.data() : null;

    // Create business document
    const businessRef = db.collection('businesses').doc();
    const businessId = businessRef.id;

    const now = admin.firestore.FieldValue.serverTimestamp();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14); // 14 day trial

    const businessData = {
      businessId,
      businessName,
      slug: businessName.toLowerCase().replace(/\s+/g, '-'),
      
      plan: {
        type: plan,
        status: 'trial',
        startDate: now,
        expiresAt: admin.firestore.Timestamp.fromDate(trialEnd),
        autoRenew: false,
        billingCycle: 'monthly'
      },
      
      contact: {
        email: businessEmail,
        phone: phone || '',
        website: ''
      },
      
      owner: {
        userId: userRecord.uid,
        name: userName,
        email: userEmail
      },
      
      businessInfo: {
        industry,
        companySize
      },
      
      limits: planData ? planData.limits : {
        maxStaff: plan === 'basic' ? 5 : (plan === 'professional' ? 20 : -1),
        maxProducts: plan === 'basic' ? 500 : (plan === 'professional' ? 1000 : -1),
        maxOrders: -1,
        maxStorage: plan === 'basic' ? 1 : (plan === 'professional' ? 50 : 500),
        maxApiCalls: plan === 'basic' ? 1000 : (plan === 'professional' ? 10000 : 100000),
        maxLocations: plan === 'basic' ? 1 : (plan === 'professional' ? 3 : -1)
      },
      
      usage: {
        staffCount: 1,
        productsCount: 0,
        ordersThisMonth: 0,
        storageUsed: 0,
        apiCallsThisMonth: 0,
        locationsCount: 0
      },
      
      features: planData ? {} : {
        pos: true,
        inventory: true,
        orders: true,
        customers: true,
        analytics: true,
        reports: true,
        advanced_reports: plan !== 'basic',
        insights: plan === 'enterprise',
        gamification: plan !== 'basic',
        loyalty: plan !== 'basic',
        madas_pass: plan !== 'basic',
        reviews: plan !== 'basic',
        collections: plan !== 'basic',
        customer_wallet: plan !== 'basic',
        website_builder: plan === 'enterprise',
        api_access: plan !== 'basic',
        custom_domain: plan === 'enterprise',
        multi_location: plan === 'enterprise',
        shares_management: plan === 'enterprise'
      },
      
      settings: {
        currency: 'USD',
        timezone: 'America/New_York',
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        logo: null,
        primaryColor: '#6366F1',
        taxRate: 0
      },
      
      status: 'active',
      suspensionReason: null,
      
      metadata: {
        createdAt: now,
        createdBy: userRecord.uid,
        updatedAt: now,
        lastActivityAt: now,
        isVerified: false
      }
    };

    // Set features based on plan
    if (planData && planData.features) {
      planData.features.forEach(feature => {
        businessData.features[feature] = true;
      });
    }

    await businessRef.set(businessData);

    // Create user document
    await db.collection('users').doc(userRecord.uid).set({
      userId: userRecord.uid,
      name: userName,
      email: userEmail,
      phone: phone || '',
      avatar: null,
      
      emailVerified: false,
      phoneVerified: false,
      authProvider: 'email',
      
      businesses: [{
        businessId,
        businessName,
        role: 'owner',
        joinedAt: now
      }],
      
      currentBusinessId: businessId,
      platformRole: null,
      
      preferences: {
        language: 'en',
        timezone: 'America/New_York',
        notifications: {
          email: true,
          push: true,
          sms: false
        }
      },
      
      metadata: {
        createdAt: now,
        updatedAt: now,
        lastLogin: null,
        lastSeen: null
      }
    });

    // Add owner as staff member
    await businessRef.collection('staff').doc(userRecord.uid).set({
      staffId: userRecord.uid,
      userId: userRecord.uid,
      businessId,
      
      name: userName,
      email: userEmail,
      phone: phone || '',
      avatar: null,
      
      role: 'owner',
      permissions: {
        canViewProducts: true,
        canCreateProducts: true,
        canEditProducts: true,
        canDeleteProducts: true,
        canViewOrders: true,
        canCreateOrders: true,
        canEditOrders: true,
        canCancelOrders: true,
        canRefundOrders: true,
        canViewCustomers: true,
        canEditCustomers: true,
        canDeleteCustomers: true,
        canViewReports: true,
        canViewFinances: true,
        canManageExpenses: true,
        canViewStaff: true,
        canManageStaff: true,
        canAccessPOS: true,
        canEditSettings: true,
        canManageBilling: true
      },
      
      employment: {
        status: 'active',
        hireDate: now,
        terminationDate: null,
        position: 'Owner',
        location: 'Main Office'
      },
      
      metadata: {
        invitedAt: now,
        invitedBy: 'system',
        joinedAt: now,
        lastLogin: null,
        createdAt: now
      }
    });

    // Create welcome email task (implement with SendGrid/Resend)
    // await sendWelcomeEmail(userEmail, userName, businessName);

    // Log platform event
    await db.collection('platform-events').add({
      eventId: db.collection('platform-events').doc().id,
      type: 'signup',
      businessId,
      userId: userRecord.uid,
      data: {
        businessName,
        plan,
        industry,
        companySize
      },
      timestamp: now,
      severity: 'success'
    });

    // Return success with custom token for immediate login
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        userId: userRecord.uid,
        email: userEmail,
        name: userName
      },
      business: {
        businessId,
        businessName,
        plan: plan,
        trialEnds: trialEnd.toISOString()
      },
      token: customToken
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Cleanup: delete user if business creation failed
    if (error.userRecord) {
      try {
        await admin.auth().deleteUser(error.userRecord.uid);
      } catch (deleteError) {
        console.error('Failed to cleanup user:', deleteError);
      }
    }

    res.status(500).json({ 
      error: 'Registration failed',
      message: 'An error occurred during registration. Please try again.' 
    });
  }
});

/**
 * POST /api/contact
 * Handle contact form submissions
 */
router.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        error: 'All fields are required' 
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ 
        error: 'Invalid email address' 
      });
    }

    // Save to Firestore
    const submissionRef = db.collection('contact-submissions').doc();
    
    await submissionRef.set({
      submissionId: submissionRef.id,
      name,
      email,
      subject,
      message,
      status: 'new',
      metadata: {
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        respondedAt: null,
        notes: ''
      }
    });

    // Send notification email to admin (implement with SendGrid/Resend)
    // await sendContactNotification(name, email, subject, message);

    res.json({
      success: true,
      message: 'Message sent successfully. We\'ll get back to you soon!'
    });

  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ 
      error: 'Failed to send message. Please try again.' 
    });
  }
});

/**
 * POST /api/newsletter/subscribe
 * Newsletter subscription
 */
router.post('/newsletter/subscribe', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Check if already subscribed
    const existing = await db.collection('newsletter-subscribers').doc(email).get();

    if (existing.exists) {
      return res.status(409).json({ 
        message: 'You\'re already subscribed to our newsletter' 
      });
    }

    // Add to newsletter
    await db.collection('newsletter-subscribers').doc(email).set({
      email,
      name: name || '',
      subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: req.body.source || 'website',
      isActive: true
    });

    res.json({
      success: true,
      message: 'Successfully subscribed to our newsletter!'
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({ 
      error: 'Failed to subscribe. Please try again.' 
    });
  }
});

/**
 * Helper: Validate email
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Helper: Send welcome email (implement with your email service)
 */
async function sendWelcomeEmail(email, name, businessName) {
  // Implementation with SendGrid, Resend, or similar
  console.log(`Sending welcome email to ${email}`);
  
  // Example with SendGrid:
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // 
  // const msg = {
  //   to: email,
  //   from: 'welcome@madas.com',
  //   subject: `Welcome to MADAS, ${name}!`,
  //   html: `
  //     <h1>Welcome to MADAS!</h1>
  //     <p>Hi ${name},</p>
  //     <p>Thank you for registering ${businessName}. Your 14-day trial has started!</p>
  //     <p>Get started: <a href="https://app.madas.com/dashboard">Go to Dashboard</a></p>
  //   `
  // };
  // 
  // await sgMail.send(msg);
}

/**
 * Helper: Send contact notification to admin
 */
async function sendContactNotification(name, email, subject, message) {
  // Implementation with your email service
  console.log(`New contact form submission from ${email}`);
}

module.exports = router;
