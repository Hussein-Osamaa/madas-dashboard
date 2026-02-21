import { 
  doc, 
  collection, 
  addDoc, 
  getDoc, 
  getDocs,
  updateDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Create a new website for a business
 * @param {string} businessId 
 * @param {Object} websiteData 
 * @returns {Promise<Object>}
 */
export async function createWebsite(businessId, websiteData) {
  try {
    const websiteRef = await addDoc(collection(db, 'websites'), {
      businessId,
      siteName: websiteData.siteName || 'My Website',
      description: websiteData.description || '',
      domain: {
        subdomain: websiteData.subdomain || businessId.slice(0, 8),
        customDomain: null,
        isVerified: false
      },
      templateId: websiteData.templateId || 'blank',
      templateName: websiteData.templateName || 'Blank',
      editorData: {
        html: '',
        css: '',
        components: [],
        styles: []
      },
      pages: [
        {
          pageId: 'home',
          name: 'Home',
          slug: '/',
          title: websiteData.siteName || 'Home',
          metaDescription: '',
          isPublished: false,
          content: {
            html: '',
            css: '',
            components: [],
            styles: []
          }
        }
      ],
      settings: {
        primaryColor: '#3B82F6',
        secondaryColor: '#8B5CF6',
        backgroundColor: '#FFFFFF',
        textColor: '#111827',
        headingFont: 'Inter, sans-serif',
        bodyFont: 'Inter, sans-serif',
        logo: null,
        favicon: null,
        menuItems: [
          { label: 'Home', link: '/', type: 'internal' }
        ],
        footerText: '© 2025 All rights reserved.',
        socialLinks: {
          facebook: '',
          instagram: '',
          twitter: ''
        },
        googleAnalyticsId: '',
        facebookPixelId: '',
        ogImage: ''
      },
      status: 'draft',
      isPublished: false,
      publishedUrl: '',
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: null,
        lastEditedBy: websiteData.userId || null
      }
    });

    return { success: true, websiteId: websiteRef.id };
  } catch (error) {
    console.error('Error creating website:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get website by business ID
 * @param {string} businessId 
 * @returns {Promise<Object>}
 */
export async function getWebsiteByBusinessId(businessId) {
  try {
    const q = query(
      collection(db, 'websites'),
      where('businessId', '==', businessId)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { success: false, error: 'No website found' };
    }
    
    const website = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };
    
    return { success: true, website };
  } catch (error) {
    console.error('Error fetching website:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update website
 * @param {string} websiteId 
 * @param {Object} updates 
 * @returns {Promise<Object>}
 */
export async function updateWebsite(websiteId, updates) {
  try {
    await updateDoc(doc(db, 'websites', websiteId), {
      ...updates,
      'metadata.updatedAt': new Date().toISOString()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating website:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save editor data (GrapesJS)
 * @param {string} websiteId 
 * @param {Object} editorData 
 * @returns {Promise<Object>}
 */
export async function saveEditorData(websiteId, editorData) {
  try {
    await updateDoc(doc(db, 'websites', websiteId), {
      editorData,
      'metadata.updatedAt': new Date().toISOString()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error saving editor data:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Publish website
 * @param {string} websiteId 
 * @returns {Promise<Object>}
 */
export async function publishWebsite(websiteId) {
  try {
    const websiteDoc = await getDoc(doc(db, 'websites', websiteId));
    
    if (!websiteDoc.exists()) {
      return { success: false, error: 'Website not found' };
    }
    
    const website = websiteDoc.data();
    const subdomain = website.domain.subdomain;
    const publishedUrl = `https://${subdomain}.yoursaas.com`;
    
    await updateDoc(doc(db, 'websites', websiteId), {
      status: 'published',
      isPublished: true,
      publishedUrl,
      'metadata.publishedAt': new Date().toISOString(),
      'metadata.updatedAt': new Date().toISOString()
    });
    
    // TODO: Deploy to Vercel/Netlify via API
    
    return { success: true, publishedUrl };
  } catch (error) {
    console.error('Error publishing website:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all websites for a business
 * @param {string} businessId 
 * @returns {Promise<Object>}
 */
export async function getWebsitesByBusinessId(businessId) {
  try {
    const q = query(
      collection(db, 'websites'),
      where('businessId', '==', businessId)
    );
    
    const snapshot = await getDocs(q);
    const websites = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, websites };
  } catch (error) {
    console.error('Error fetching websites:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete website
 * @param {string} websiteId 
 * @returns {Promise<Object>}
 */
export async function deleteWebsite(websiteId) {
  try {
    await updateDoc(doc(db, 'websites', websiteId), {
      status: 'deleted',
      'metadata.updatedAt': new Date().toISOString()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting website:', error);
    return { success: false, error: error.message };
  }
}
