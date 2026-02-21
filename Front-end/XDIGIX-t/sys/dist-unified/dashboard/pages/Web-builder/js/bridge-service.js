/**
 * Bridge Service - Core service for managing communication between components
 */
class BridgeService {
    constructor() {
        this.isInitialized = false;
        this.eventListeners = new Map();
        this.data = new Map();
        this.init();
    }

    init() {
        try {
            console.log('🔗 Initializing Bridge Service...');
            
            // Initialize event system
            this.setupEventSystem();
            
            // Initialize data storage
            this.setupDataStorage();
            
            // Initialize Firebase connection
            this.setupFirebaseConnection();
            
            this.isInitialized = true;
            console.log('✅ Bridge Service initialized successfully');
        } catch (error) {
            console.error('❌ Bridge Service initialization failed:', error);
            this.isInitialized = false;
        }
    }

    setupEventSystem() {
        // Create custom event system
        this.eventBus = {
            emit: (event, data) => {
                const listeners = this.eventListeners.get(event) || [];
                listeners.forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error(`Error in event listener for ${event}:`, error);
                    }
                });
            },
            on: (event, callback) => {
                if (!this.eventListeners.has(event)) {
                    this.eventListeners.set(event, []);
                }
                this.eventListeners.get(event).push(callback);
            },
            off: (event, callback) => {
                const listeners = this.eventListeners.get(event) || [];
                const index = listeners.indexOf(callback);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        };
    }

    setupDataStorage() {
        // Initialize data storage with default values
        this.data.set('sections', []);
        this.data.set('currentSection', null);
        this.data.set('selectedElements', []);
        this.data.set('theme', {
            primaryColor: '#2563eb',
            secondaryColor: '#1e40af',
            backgroundColor: '#ffffff',
            textColor: '#1f293b'
        });
        this.data.set('settings', {
            autosave: true,
            responsive: true,
            animations: true
        });
    }

    setupFirebaseConnection() {
        // Check if Firebase is available
        if (typeof firebase !== 'undefined') {
            this.firebase = firebase;
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            this.functions = firebase.functions();
            console.log('✅ Firebase connection established');
        } else {
            console.warn('⚠️ Firebase not available, using local storage');
        }
    }

    // Data management methods
    setData(key, value) {
        this.data.set(key, value);
        this.eventBus.emit('dataChanged', { key, value });
    }

    getData(key) {
        return this.data.get(key);
    }

    // Event management methods
    emit(event, data) {
        this.eventBus.emit(event, data);
    }

    on(event, callback) {
        this.eventBus.on(event, callback);
    }

    off(event, callback) {
        this.eventBus.off(event, callback);
    }

    // Firebase integration methods
    async saveToFirebase(collection, documentId, data) {
        try {
            if (!this.firebase) {
                throw new Error('Firebase not available');
            }

            const docRef = this.db.collection(collection).doc(documentId);
            await docRef.set(data, { merge: true });
            
            this.emit('dataSaved', { collection, documentId, data });
            return { success: true };
        } catch (error) {
            console.error('Error saving to Firebase:', error);
            this.emit('saveError', error);
            return { success: false, error: error.message };
        }
    }

    async loadFromFirebase(collection, documentId) {
        try {
            if (!this.firebase) {
                throw new Error('Firebase not available');
            }

            const docRef = this.db.collection(collection).doc(documentId);
            const doc = await docRef.get();
            
            if (doc.exists) {
                const data = doc.data();
                this.emit('dataLoaded', { collection, documentId, data });
                return { success: true, data };
            } else {
                return { success: false, error: 'Document not found' };
            }
        } catch (error) {
            console.error('Error loading from Firebase:', error);
            this.emit('loadError', error);
            return { success: false, error: error.message };
        }
    }

    // Local storage methods
    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            this.emit('dataSaved', { key, data });
            return { success: true };
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return { success: false, error: error.message };
        }
    }

    loadFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(key);
            if (data) {
                const parsedData = JSON.parse(data);
                this.emit('dataLoaded', { key, data: parsedData });
                return { success: true, data: parsedData };
            } else {
                return { success: false, error: 'No data found' };
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return { success: false, error: error.message };
        }
    }

    // Authentication methods
    isAuthenticated() {
        try {
            if (this.firebase && this.auth) {
                return this.auth.currentUser !== null;
            }
            return false;
        } catch (error) {
            console.warn('Authentication check failed:', error);
            return false;
        }
    }

    async getCurrentUser() {
        try {
            if (this.firebase && this.auth) {
                return this.auth.currentUser;
            }
            return null;
        } catch (error) {
            console.warn('Get current user failed:', error);
            return null;
        }
    }

    // Canvas data collection
    getCanvasData() {
        try {
            const canvas = document.getElementById('canvas-container');
            if (!canvas) {
                console.warn('Canvas container not found');
                return { sections: [], theme: {} };
            }

            // Collect all sections from canvas
            const sections = [];
            const sectionElements = canvas.querySelectorAll('[data-section-id]');

            sectionElements.forEach((element, index) => {
                sections.push({
                    id: element.getAttribute('data-section-id') || `section-${index}`,
                    type: element.getAttribute('data-section-type') || 'unknown',
                    content: element.innerHTML,
                    styles: element.getAttribute('style') || '',
                    index: index
                });
            });

            return {
                sections: sections,
                theme: this.getData('theme') || {}
            };
        } catch (error) {
            console.error('Error collecting canvas data:', error);
            return { sections: [], theme: {} };
        }
    }

    // Publishing methods
    async publishSite(siteData) {
        try {
            console.log('🚀 Publishing site:', siteData);
            
            if (!this.isAuthenticated()) {
                throw new Error('User must be authenticated to publish sites');
            }

            const currentUser = await this.getCurrentUser();
            if (!currentUser) {
                throw new Error('No authenticated user found');
            }

            // Prepare site data for publishing
            const publishData = {
                ...siteData,
                published: true,
                publishedAt: new Date().toISOString(),
                publishedBy: currentUser.uid,
                status: 'published'
            };

            // Save to Firebase
            const siteId = siteData.id || this.generateId();
            const saveResult = await this.saveToFirebase('published_sites', siteId, publishData);
            
            if (!saveResult.success) {
                throw new Error('Failed to save to Firebase: ' + saveResult.error);
            }

            // Also save to localStorage as backup
            this.saveToLocalStorage(`published_site_${siteId}`, publishData);

            // Generate public URL
            const publicUrl = `https://your-domain.com/sites/${siteId}`;
            
            this.emit('sitePublished', { siteId, publicUrl, siteData: publishData });
            
            return { 
                success: true, 
                siteId, 
                publicUrl,
                message: 'Site published successfully!' 
            };
        } catch (error) {
            console.error('Error publishing site:', error);
            this.emit('publishError', error);
            return { success: false, error: error.message };
        }
    }

    async unpublishSite(siteId) {
        try {
            if (!this.isAuthenticated()) {
                throw new Error('User must be authenticated to unpublish sites');
            }

            const currentUser = await this.getCurrentUser();
            if (!currentUser) {
                throw new Error('No authenticated user found');
            }

            // Update site status in Firebase
            const updateResult = await this.saveToFirebase('published_sites', siteId, {
                published: false,
                unpublishedAt: new Date().toISOString(),
                status: 'draft'
            });

            if (!updateResult.success) {
                throw new Error('Failed to update Firebase: ' + updateResult.error);
            }

            // Update localStorage
            const localData = this.loadFromLocalStorage(`published_site_${siteId}`);
            if (localData.success) {
                localData.data.published = false;
                localData.data.unpublishedAt = new Date().toISOString();
                localData.data.status = 'draft';
                this.saveToLocalStorage(`published_site_${siteId}`, localData.data);
            }

            this.emit('siteUnpublished', { siteId });
            
            return { success: true, message: 'Site unpublished successfully!' };
        } catch (error) {
            console.error('Error unpublishing site:', error);
            this.emit('unpublishError', error);
            return { success: false, error: error.message };
        }
    }

    async getPublishedSites() {
        try {
            if (!this.isAuthenticated()) {
                return { success: false, error: 'User must be authenticated' };
            }

            const currentUser = await this.getCurrentUser();
            if (!currentUser) {
                return { success: false, error: 'No authenticated user found' };
            }

            // Try to load from Firebase first
            if (this.firebase && this.db) {
                try {
                    const snapshot = await this.db.collection('published_sites')
                        .where('publishedBy', '==', currentUser.uid)
                        .where('published', '==', true)
                        .get();
                    
                    const sites = [];
                    snapshot.forEach(doc => {
                        sites.push({ id: doc.id, ...doc.data() });
                    });
                    
                    return { success: true, sites };
                } catch (firebaseError) {
                    console.warn('Firebase query failed, falling back to localStorage:', firebaseError);
                }
            }

            // Fallback to localStorage
            const sites = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('published_site_')) {
                    const data = this.loadFromLocalStorage(key);
                    if (data.success && data.data.published) {
                        sites.push({ id: key.replace('published_site_', ''), ...data.data });
                    }
                }
            }

            return { success: true, sites };
        } catch (error) {
            console.error('Error getting published sites:', error);
            return { success: false, error: error.message };
        }
    }

    // Preview methods
    createPreviewLink(websiteData) {
        try {
            // Generate a unique preview ID
            const previewId = this.generateId();

            // Normalize the website data structure
            // Ensure it has themeData.sections for preview.html compatibility
            let normalizedData = websiteData;
            if (!websiteData.themeData) {
                normalizedData = {
                    themeData: {
                        sections: websiteData.sections || websiteData || [],
                        theme: websiteData.theme || this.getData('theme') || {}
                    }
                };
            }

            // Store the website data temporarily for preview
            const previewData = {
                id: previewId,
                themeData: normalizedData.themeData, // Use themeData for preview.html compatibility
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
            };

            // Save to localStorage for preview
            const saveResult = this.saveToLocalStorage(`preview_${previewId}`, previewData);

            if (!saveResult.success) {
                throw new Error('Failed to save preview data: ' + saveResult.error);
            }

            // Return the preview URL
            const previewUrl = `preview.html?id=${previewId}`;

            // Emit event safely
            try {
                this.emit('previewCreated', { previewId, previewUrl });
            } catch (emitError) {
                console.warn('Could not emit previewCreated event:', emitError);
            }

            return { success: true, previewUrl, previewId, expiresAt: previewData.expiresAt };
        } catch (error) {
            console.error('Error creating preview link:', error);

            // Emit error event safely
            try {
                this.emit('previewError', error);
            } catch (emitError) {
                console.warn('Could not emit previewError event:', emitError);
            }

            return { success: false, error: error.message };
        }
    }

    async getPreviewData(previewId) {
        try {
            if (!previewId) {
                return { success: false, error: 'No preview ID provided' };
            }
            
            const result = this.loadFromLocalStorage(`preview_${previewId}`);
            if (result.success) {
                // Check if preview has expired
                const now = new Date();
                const expiresAt = new Date(result.data.expiresAt);
                
                if (now > expiresAt) {
                    // Preview expired, clean up
                    try {
                        localStorage.removeItem(`preview_${previewId}`);
                    } catch (cleanupError) {
                        console.warn('Could not clean up expired preview:', cleanupError);
                    }
                    return { success: false, error: 'Preview has expired' };
                }
                
                return { success: true, data: result.data.data };
            } else {
                return { success: false, error: 'Preview not found' };
            }
        } catch (error) {
            console.error('Error getting preview data:', error);
            return { success: false, error: error.message };
        }
    }

    // Utility methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Make BridgeService available globally
window.BridgeService = BridgeService;
