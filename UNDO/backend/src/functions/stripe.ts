import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Stripe } from 'stripe';
import { Request, Response } from 'express';
import { verifyToken } from '@/utils/auth';
import { validateBody, schemas } from '@/utils/validation';
import { logSystemEvent, logWebhookEvent } from '@/utils/logger';
import { sendSubscriptionEmail, sendSubscriptionCanceledEmail } from '@/utils/email';
import { handleStripeError } from '@/utils/errors';
import { CreateCheckoutSessionRequest, CreateCheckoutSessionResponse } from '@/types';

// Initialize Stripe
const stripe = new Stripe(functions.config().stripe.secret_key, {
  apiVersion: '2023-10-16',
});

/**
 * Create Stripe customer
 */
export const createStripeCustomer = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { email, name, metadata } = data;
    const userId = context.auth.uid;

    // Check if customer already exists
    const existingCustomer = await admin.firestore()
      .collection('stripe_customers')
      .where('userId', '==', userId)
      .get();

    if (!existingCustomer.empty) {
      const customerData = existingCustomer.docs[0].data();
      return { customerId: customerData.stripeCustomerId };
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
        ...metadata,
      },
    });

    // Store customer in Firestore
    await admin.firestore()
      .collection('stripe_customers')
      .doc(customer.id)
      .set({
        userId,
        stripeCustomerId: customer.id,
        email: customer.email,
        name: customer.name,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    await logSystemEvent('info', 'Stripe customer created', 'payment', { userId, customerId: customer.id });

    return { customerId: customer.id };
  } catch (error) {
    await logSystemEvent('error', 'Failed to create Stripe customer', 'payment', { error: error.message });
    throw new functions.https.HttpsError('internal', 'Failed to create customer');
  }
});

/**
 * Create checkout session
 */
export const createCheckoutSession = functions.https.onCall(async (data: CreateCheckoutSessionRequest, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { priceId, successUrl, cancelUrl, customerId, trialPeriodDays } = data;
    const userId = context.auth.uid;

    // Get or create Stripe customer
    let stripeCustomerId = customerId;
    if (!stripeCustomerId) {
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      const customer = await stripe.customers.create({
        email: userData?.email,
        name: userData?.displayName,
        metadata: { userId },
      });
      
      stripeCustomerId = customer.id;
      
      // Store customer in Firestore
      await admin.firestore()
        .collection('stripe_customers')
        .doc(customer.id)
        .set({
          userId,
          stripeCustomerId: customer.id,
          email: customer.email,
          name: customer.name,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      trial_period_days: trialPeriodDays,
      metadata: {
        userId,
      },
    });

    await logSystemEvent('info', 'Checkout session created', 'payment', { 
      userId, 
      sessionId: session.id, 
      priceId 
    });

    return { sessionId: session.id, url: session.url } as CreateCheckoutSessionResponse;
  } catch (error) {
    await logSystemEvent('error', 'Failed to create checkout session', 'payment', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to create checkout session');
  }
});

/**
 * Handle Stripe webhooks
 */
export const handleStripeWebhook = functions.https.onRequest(async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = functions.config().stripe.webhook_secret;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      await logSystemEvent('error', 'Webhook signature verification failed', 'payment', { error: err.message });
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    await logWebhookEvent(event.id, event.type, true, true);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      default:
        await logSystemEvent('info', `Unhandled event type: ${event.type}`, 'payment', { eventId: event.id });
    }

    res.json({ received: true });
  } catch (error) {
    await logSystemEvent('error', 'Webhook processing failed', 'payment', { error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle checkout session completed
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    const userId = session.metadata?.userId;
    if (!userId) {
      throw new Error('No userId in session metadata');
    }

    // Update user subscription status
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update({
        'subscription.status': 'active',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    await logSystemEvent('info', 'Checkout session completed', 'payment', { 
      userId, 
      sessionId: session.id 
    });
  } catch (error) {
    await logSystemEvent('error', 'Failed to handle checkout session completed', 'payment', { 
      error: error.message, 
      sessionId: session.id 
    });
  }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    const customerData = customer as Stripe.Customer;
    
    // Find user by customer email
    const userQuery = await admin.firestore()
      .collection('users')
      .where('email', '==', customerData.email)
      .get();

    if (userQuery.empty) {
      throw new Error(`User not found for customer: ${customerData.email}`);
    }

    const userDoc = userQuery.docs[0];
    const userId = userDoc.id;

    // Get price details
    const price = await stripe.prices.retrieve(subscription.items.data[0].price.id);
    const product = await stripe.products.retrieve(price.product as string);

    // Update user subscription
    await userDoc.ref.update({
      subscription: {
        plan: product.metadata.plan || 'pro',
        status: subscription.status,
        stripeCustomerId: subscription.customer,
        stripeSubscriptionId: subscription.id,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        features: {
          websites: parseInt(product.metadata.websites || '10'),
          storage: parseInt(product.metadata.storage || '1000'),
          bandwidth: parseInt(product.metadata.bandwidth || '100'),
          customDomains: parseInt(product.metadata.customDomains || '5'),
          teamMembers: parseInt(product.metadata.teamMembers || '1'),
          prioritySupport: product.metadata.prioritySupport === 'true',
          advancedAnalytics: product.metadata.advancedAnalytics === 'true',
          customCode: product.metadata.customCode === 'true',
        },
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Store subscription in Firestore
    await admin.firestore()
      .collection('subscriptions')
      .doc(subscription.id)
      .set({
        userId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer,
        status: subscription.status,
        plan: product.metadata.plan || 'pro',
        amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Send welcome email
    const userData = userDoc.data();
    await sendSubscriptionEmail(userData, subscription, product);

    await logSystemEvent('info', 'Subscription created', 'payment', { 
      userId, 
      subscriptionId: subscription.id,
      plan: product.metadata.plan 
    });
  } catch (error) {
    await logSystemEvent('error', 'Failed to handle subscription created', 'payment', { 
      error: error.message, 
      subscriptionId: subscription.id 
    });
  }
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const subscriptionDoc = await admin.firestore()
      .collection('subscriptions')
      .doc(subscription.id)
      .get();

    if (!subscriptionDoc.exists) {
      throw new Error(`Subscription not found: ${subscription.id}`);
    }

    const subscriptionData = subscriptionDoc.data();
    const userId = subscriptionData?.userId;

    // Update subscription in Firestore
    await subscriptionDoc.ref.update({
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update user subscription
    if (userId) {
      await admin.firestore()
        .collection('users')
        .doc(userId)
        .update({
          'subscription.status': subscription.status,
          'subscription.currentPeriodStart': new Date(subscription.current_period_start * 1000),
          'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000),
          'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    await logSystemEvent('info', 'Subscription updated', 'payment', { 
      userId, 
      subscriptionId: subscription.id,
      status: subscription.status 
    });
  } catch (error) {
    await logSystemEvent('error', 'Failed to handle subscription updated', 'payment', { 
      error: error.message, 
      subscriptionId: subscription.id 
    });
  }
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const subscriptionDoc = await admin.firestore()
      .collection('subscriptions')
      .doc(subscription.id)
      .get();

    if (!subscriptionDoc.exists) {
      throw new Error(`Subscription not found: ${subscription.id}`);
    }

    const subscriptionData = subscriptionDoc.data();
    const userId = subscriptionData?.userId;

    // Update subscription status
    await subscriptionDoc.ref.update({
      status: 'canceled',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update user subscription
    if (userId) {
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      await userDoc.ref.update({
        subscription: {
          plan: 'free',
          status: 'canceled',
          features: {
            websites: 1,
            storage: 100,
            bandwidth: 1,
            customDomains: 0,
            teamMembers: 1,
            prioritySupport: false,
            advancedAnalytics: false,
            customCode: false,
          },
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Send cancellation email
      await sendSubscriptionCanceledEmail(userData, subscription, { name: 'Pro' });
    }

    await logSystemEvent('info', 'Subscription deleted', 'payment', { 
      userId, 
      subscriptionId: subscription.id 
    });
  } catch (error) {
    await logSystemEvent('error', 'Failed to handle subscription deleted', 'payment', { 
      error: error.message, 
      subscriptionId: subscription.id 
    });
  }
}

/**
 * Handle invoice payment succeeded
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const subscriptionDoc = await admin.firestore()
      .collection('subscriptions')
      .doc(subscription.id)
      .get();

    if (subscriptionDoc.exists) {
      const subscriptionData = subscriptionDoc.data();
      const userId = subscriptionData?.userId;

      if (userId) {
        await admin.firestore()
          .collection('users')
          .doc(userId)
          .update({
            'subscription.status': 'active',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      }
    }

    await logSystemEvent('info', 'Invoice payment succeeded', 'payment', { 
      invoiceId: invoice.id,
      subscriptionId: subscription.id 
    });
  } catch (error) {
    await logSystemEvent('error', 'Failed to handle invoice payment succeeded', 'payment', { 
      error: error.message, 
      invoiceId: invoice.id 
    });
  }
}

/**
 * Handle invoice payment failed
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const subscriptionDoc = await admin.firestore()
      .collection('subscriptions')
      .doc(subscription.id)
      .get();

    if (subscriptionDoc.exists) {
      const subscriptionData = subscriptionDoc.data();
      const userId = subscriptionData?.userId;

      if (userId) {
        await admin.firestore()
          .collection('users')
          .doc(userId)
          .update({
            'subscription.status': 'past_due',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      }
    }

    await logSystemEvent('info', 'Invoice payment failed', 'payment', { 
      invoiceId: invoice.id,
      subscriptionId: subscription.id 
    });
  } catch (error) {
    await logSystemEvent('error', 'Failed to handle invoice payment failed', 'payment', { 
      error: error.message, 
      invoiceId: invoice.id 
    });
  }
}

/**
 * Cancel subscription
 */
export const cancelSubscription = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { subscriptionId, cancelAtPeriodEnd = true } = data;
    const userId = context.auth.uid;

    // Verify subscription belongs to user
    const subscriptionDoc = await admin.firestore()
      .collection('subscriptions')
      .doc(subscriptionId)
      .get();

    if (!subscriptionDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Subscription not found');
    }

    const subscriptionData = subscriptionDoc.data();
    if (subscriptionData?.userId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Access denied');
    }

    // Cancel subscription in Stripe
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
    });

    await logSystemEvent('info', 'Subscription canceled', 'payment', { 
      userId, 
      subscriptionId,
      cancelAtPeriodEnd 
    });

    return { success: true };
  } catch (error) {
    await logSystemEvent('error', 'Failed to cancel subscription', 'payment', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to cancel subscription');
  }
});

/**
 * Update subscription
 */
export const updateSubscription = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { subscriptionId, priceId } = data;
    const userId = context.auth.uid;

    // Verify subscription belongs to user
    const subscriptionDoc = await admin.firestore()
      .collection('subscriptions')
      .doc(subscriptionId)
      .get();

    if (!subscriptionDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Subscription not found');
    }

    const subscriptionData = subscriptionDoc.data();
    if (subscriptionData?.userId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Access denied');
    }

    // Update subscription in Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: priceId,
      }],
      proration_behavior: 'create_prorations',
    });

    await logSystemEvent('info', 'Subscription updated', 'payment', { 
      userId, 
      subscriptionId,
      priceId 
    });

    return { success: true };
  } catch (error) {
    await logSystemEvent('error', 'Failed to update subscription', 'payment', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to update subscription');
  }
});

/**
 * Get subscription status
 */
export const getSubscriptionStatus = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const userDoc = await admin.firestore().collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();
    return {
      subscription: userData?.subscription,
      features: userData?.subscription?.features,
    };
  } catch (error) {
    await logSystemEvent('error', 'Failed to get subscription status', 'payment', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to get subscription status');
  }
});

export const stripeFunctions = {
  createStripeCustomer,
  createCheckoutSession,
  handleStripeWebhook,
  cancelSubscription,
  updateSubscription,
  getSubscriptionStatus,
};
