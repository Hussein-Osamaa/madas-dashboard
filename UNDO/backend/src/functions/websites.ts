import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { logSystemEvent, logUserActivity } from '@/utils/logger';
import { sendWebsitePublishedEmail } from '@/utils/email';
import { canCreateWebsite, getUser } from '@/utils/auth';
import { trackEvent } from '@/utils/analytics';
import { generateSlug, generateWebsiteUrl } from '@/utils/helpers';

/**
 * Create website
 */
export const createWebsite = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { name, description, templateId, customDomain } = data;

    // Check if user can create website
    const canCreate = await canCreateWebsite(userId);
    if (!canCreate) {
      throw new functions.https.HttpsError('permission-denied', 'Website limit reached for your plan');
    }

    // Get template data
    const templateDoc = await admin.firestore()
      .collection('templates')
      .doc(templateId)
      .get();

    if (!templateDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Template not found');
    }

    const templateData = templateDoc.data();

    // Create website document
    const websiteData = {
      ownerId: userId,
      name,
      description: description || '',
      url: customDomain ? generateWebsiteUrl('', customDomain) : null,
      customDomain: customDomain || null,
      status: 'draft',
      template: {
        id: templateId,
        name: templateData?.name || 'Default',
        category: templateData?.category || 'general',
        preview: templateData?.preview || '',
      },
      content: templateData?.content || {
        pages: [],
        globalStyles: {},
        assets: [],
        components: [],
      },
      settings: {
        general: {
          language: 'en',
          timezone: 'UTC',
          maintenanceMode: false,
        },
        social: {},
        contact: {},
        integrations: {},
      },
      analytics: {
        views: 0,
        uniqueVisitors: 0,
        bounceRate: 0,
        averageSessionDuration: 0,
        topPages: [],
        trafficSources: [],
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
      seo: {
        title: name,
        description: description || '',
        keywords: [],
        robots: {
          index: true,
          follow: true,
        },
        sitemap: true,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const websiteRef = await admin.firestore()
      .collection('websites')
      .add(websiteData);

    // Update user stats
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update({
        'stats.websites.total': admin.firestore.FieldValue.increment(1),
        'stats.websites.draft': admin.firestore.FieldValue.increment(1),
        'stats.activity.websitesCreated': admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    await logUserActivity(userId, 'create_website', 'website', websiteRef.id, { name, templateId });
    await trackEvent('website_created', 'user_action', { websiteId: websiteRef.id, templateId }, userId);

    return { websiteId: websiteRef.id, success: true };
  } catch (error) {
    await logSystemEvent('error', 'Failed to create website', 'website', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to create website');
  }
});

/**
 * Update website
 */
export const updateWebsite = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { websiteId, name, description, content, settings, seo } = data;

    // Verify ownership
    const websiteDoc = await admin.firestore()
      .collection('websites')
      .doc(websiteId)
      .get();

    if (!websiteDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Website not found');
    }

    const websiteData = websiteDoc.data();
    if (websiteData?.ownerId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Access denied');
    }

    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (content !== undefined) updateData.content = content;
    if (settings !== undefined) updateData.settings = settings;
    if (seo !== undefined) updateData.seo = seo;

    await websiteDoc.ref.update(updateData);

    await logUserActivity(userId, 'update_website', 'website', websiteId, { fields: Object.keys(updateData) });
    await trackEvent('website_updated', 'user_action', { websiteId }, userId);

    return { success: true };
  } catch (error) {
    await logSystemEvent('error', 'Failed to update website', 'website', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to update website');
  }
});

/**
 * Delete website
 */
export const deleteWebsite = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { websiteId } = data;

    // Verify ownership
    const websiteDoc = await admin.firestore()
      .collection('websites')
      .doc(websiteId)
      .get();

    if (!websiteDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Website not found');
    }

    const websiteData = websiteDoc.data();
    if (websiteData?.ownerId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Access denied');
    }

    // Delete website
    await websiteDoc.ref.delete();

    // Update user stats
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update({
        'stats.websites.total': admin.firestore.FieldValue.increment(-1),
        [`stats.websites.${websiteData.status}`]: admin.firestore.FieldValue.increment(-1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    await logUserActivity(userId, 'delete_website', 'website', websiteId, { name: websiteData.name });
    await trackEvent('website_deleted', 'user_action', { websiteId }, userId);

    return { success: true };
  } catch (error) {
    await logSystemEvent('error', 'Failed to delete website', 'website', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to delete website');
  }
});

/**
 * Publish website
 */
export const publishWebsite = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { websiteId, customDomain, sslEnabled = true } = data;

    // Verify ownership
    const websiteDoc = await admin.firestore()
      .collection('websites')
      .doc(websiteId)
      .get();

    if (!websiteDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Website not found');
    }

    const websiteData = websiteDoc.data();
    if (websiteData?.ownerId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Access denied');
    }

    // Generate URL if not provided
    const websiteUrl = customDomain 
      ? generateWebsiteUrl('', customDomain)
      : generateWebsiteUrl(websiteId);

    // Update website status
    await websiteDoc.ref.update({
      status: 'published',
      url: websiteUrl,
      customDomain: customDomain || null,
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastPublishedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create published website document
    await admin.firestore()
      .collection('published_websites')
      .doc(websiteId)
      .set({
        ...websiteData,
        status: 'published',
        url: websiteUrl,
        customDomain: customDomain || null,
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastPublishedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Update user stats
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update({
        'stats.websites.published': admin.firestore.FieldValue.increment(1),
        'stats.websites.draft': admin.firestore.FieldValue.increment(-1),
        'stats.activity.websitesPublished': admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Log publishing
    await admin.firestore()
      .collection('publishing_logs')
      .add({
        websiteId,
        userId,
        action: 'publish',
        status: 'success',
        message: 'Website published successfully',
        details: {
          url: websiteUrl,
          customDomain,
          sslEnabled,
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Send notification email
    const userData = await getUser(userId);
    await sendWebsitePublishedEmail(userData, {
      name: websiteData.name,
      url: websiteUrl,
    });

    await logUserActivity(userId, 'publish_website', 'website', websiteId, { url: websiteUrl });
    await trackEvent('website_published', 'user_action', { websiteId, url: websiteUrl }, userId);

    return { success: true, url: websiteUrl };
  } catch (error) {
    await logSystemEvent('error', 'Failed to publish website', 'website', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to publish website');
  }
});

/**
 * Unpublish website
 */
export const unpublishWebsite = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { websiteId } = data;

    // Verify ownership
    const websiteDoc = await admin.firestore()
      .collection('websites')
      .doc(websiteId)
      .get();

    if (!websiteDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Website not found');
    }

    const websiteData = websiteDoc.data();
    if (websiteData?.ownerId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Access denied');
    }

    // Update website status
    await websiteDoc.ref.update({
      status: 'draft',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Remove from published websites
    await admin.firestore()
      .collection('published_websites')
      .doc(websiteId)
      .delete();

    // Update user stats
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update({
        'stats.websites.published': admin.firestore.FieldValue.increment(-1),
        'stats.websites.draft': admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Log unpublishing
    await admin.firestore()
      .collection('publishing_logs')
      .add({
        websiteId,
        userId,
        action: 'unpublish',
        status: 'success',
        message: 'Website unpublished successfully',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

    await logUserActivity(userId, 'unpublish_website', 'website', websiteId);
    await trackEvent('website_unpublished', 'user_action', { websiteId }, userId);

    return { success: true };
  } catch (error) {
    await logSystemEvent('error', 'Failed to unpublish website', 'website', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to unpublish website');
  }
});

/**
 * Get website
 */
export const getWebsite = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { websiteId } = data;

    const websiteDoc = await admin.firestore()
      .collection('websites')
      .doc(websiteId)
      .get();

    if (!websiteDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Website not found');
    }

    const websiteData = websiteDoc.data();
    if (websiteData?.ownerId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Access denied');
    }

    return {
      id: websiteDoc.id,
      ...websiteData,
    };
  } catch (error) {
    await logSystemEvent('error', 'Failed to get website', 'website', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to get website');
  }
});

/**
 * List user websites
 */
export const listUserWebsites = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { status, limit = 20, offset = 0 } = data;

    let query = admin.firestore()
      .collection('websites')
      .where('ownerId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(limit)
      .offset(offset);

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    const websites = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { websites, total: snapshot.size };
  } catch (error) {
    await logSystemEvent('error', 'Failed to list user websites', 'website', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to list websites');
  }
});

export const websiteFunctions = {
  createWebsite,
  updateWebsite,
  deleteWebsite,
  publishWebsite,
  unpublishWebsite,
  getWebsite,
  listUserWebsites,
};
