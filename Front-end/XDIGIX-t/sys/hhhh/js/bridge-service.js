/**
 * Bridge Service - Connects HTML Builder with Firebase Publishing System
 * Handles authentication, site data management, and publishing operations
 */

class BridgeService {
    constructor() {
        this.firebase = null;
        this.auth = null;
        this.db = null;
        this.currentUser = null;
        this.currentSiteId = null;
        this.isInitialized = false;
        
        // Initialize Firebase when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    /**
     * Initialize Firebase and authentication
     */
    async initialize() {
        try {
            // Check if Firebase is already loaded
            if (typeof window.firebase === 'undefined') {
                console.error('Firebase not loaded. Please include Firebase SDK.');
                return;
            }

            // Initialize Firebase
            this.firebase = window.firebase;
            this.auth = this.firebase.auth();
            this.db = this.firebase.firestore();
            this.functions = this.firebase.functions();

            // Set up auth state listener
            this.auth.onAuthStateChanged((user) => {
                this.currentUser = user;
                this.onAuthStateChanged(user);
            });

            this.isInitialized = true;
            console.log('Bridge Service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Bridge Service:', error);
        }
    }

    /**
     * Handle authentication state changes
     */
    onAuthStateChanged(user) {
        if (user) {
            console.log('User authenticated:', user.email);
            this.updateUIForAuthenticatedUser();
        } else {
            console.log('User not authenticated');
            this.updateUIForUnauthenticatedUser();
        }
    }

    /**
     * Sign in with email and password
     */
    async signIn(email, password) {
        try {
            const result = await this.auth.signInWithEmailAndPassword(email, password);
            return { success: true, user: result.user };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sign in with Google
     */
    async signInWithGoogle() {
        try {
            const provider = new this.firebase.auth.GoogleAuthProvider();
            const result = await this.auth.signInWithPopup(provider);
            return { success: true, user: result.user };
        } catch (error) {
            console.error('Google sign in error:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Sign out
     */
    async signOut() {
        try {
            await this.auth.signOut();
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * Create a new site
     */
    async createSite(siteData) {
        if (!this.isAuthenticated()) {
            throw new Error('User must be authenticated to create a site');
        }

        try {
            const siteDoc = {
                name: siteData.name || 'Untitled Site',
                description: siteData.description || '',
                draftData: siteData.draftData || {},
                publishedData: null,
                status: 'draft',
                ownerId: this.currentUser.uid,
                collaborators: [],
                seoSettings: {
                    title: siteData.name || 'Untitled Site',
                    description: siteData.description || '',
                    keywords: '',
                    ogTitle: '',
                    ogDescription: '',
                    ogImage: '',
                    twitterCard: 'summary_large_image',
                    canonicalUrl: '',
                },
                createdAt: this.firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: this.firebase.firestore.FieldValue.serverTimestamp(),
            };

            const docRef = await this.db.collection('sites').add(siteDoc);
            this.currentSiteId = docRef.id;

            return {
                id: docRef.id,
                ...siteDoc,
            };
        } catch (error) {
            console.error('Error creating site:', error);
            throw new Error('Failed to create site');
        }
    }

    /**
     * Save site draft data
     */
    async saveSiteDraft(siteId, draftData) {
        if (!this.isAuthenticated()) {
            throw new Error('User must be authenticated to save site data');
        }

        try {
            await this.db.collection('sites').doc(siteId).update({
                draftData: draftData,
                updatedAt: this.firebase.firestore.FieldValue.serverTimestamp(),
            });

            return { success: true };
        } catch (error) {
            console.error('Error saving site draft:', error);
            throw new Error('Failed to save site draft');
        }
    }

    /**
     * Load site data
     */
    async loadSite(siteId) {
        if (!this.isAuthenticated()) {
            throw new Error('User must be authenticated to load site data');
        }

        try {
            const doc = await this.db.collection('sites').doc(siteId).get();
            
            if (!doc.exists) {
                throw new Error('Site not found');
            }

            const siteData = doc.data();
            
            // Check if user owns the site
            if (siteData.ownerId !== this.currentUser.uid) {
                throw new Error('Unauthorized access to site');
            }

            this.currentSiteId = siteId;
            return {
                id: doc.id,
                ...siteData,
            };
        } catch (error) {
            console.error('Error loading site:', error);
            throw new Error('Failed to load site');
        }
    }

    /**
     * Get user's sites
     */
    async getUserSites() {
        if (!this.isAuthenticated()) {
            throw new Error('User must be authenticated to get sites');
        }

        try {
            const querySnapshot = await this.db
                .collection('sites')
                .where('ownerId', '==', this.currentUser.uid)
                .orderBy('updatedAt', 'desc')
                .get();

            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
        } catch (error) {
            console.error('Error getting user sites:', error);
            throw new Error('Failed to get user sites');
        }
    }

    /**
     * Publish site
     */
    async publishSite(siteId, siteData) {
        if (!this.isAuthenticated()) {
            throw new Error('User must be authenticated to publish site');
        }

        try {
            // First, save the site data to Firestore
            const siteDoc = {
                id: siteId,
                userId: this.currentUser.uid,
                status: 'published',
                theme: siteData,
                subdomain: `${this.currentUser.uid}.myapp.com`,
                publishedAt: this.firebase.firestore.FieldValue.serverTimestamp(),
                lastModified: this.firebase.firestore.FieldValue.serverTimestamp(),
            };

            // Save to sites collection
            await this.db.collection('sites').doc(siteId).set(siteDoc, { merge: true });

            // Call the Cloud Function to generate and deploy static HTML
            const publishSite = this.functions.httpsCallable('publishSite');
            const result = await publishSite({
                siteId: siteId,
                siteData: siteData,
                userId: this.currentUser.uid,
                subdomain: siteDoc.subdomain,
            });

            // Update the site with the published URL
            await this.db.collection('sites').doc(siteId).update({
                publishedUrl: result.data.publishedUrl,
                hostingStatus: 'deployed',
            });

            return {
                ...result.data,
                siteId: siteId,
                subdomain: siteDoc.subdomain,
            };
        } catch (error) {
            console.error('Publishing error:', error);
            throw new Error(`Failed to publish site: ${error.message}`);
        }
    }

    /**
     * Create preview link
     */
    async createPreviewLink(siteId, siteData) {
        if (!this.isAuthenticated()) {
            throw new Error('User must be authenticated to create preview');
        }

        try {
            // Create a temporary preview document
            const previewData = {
                siteId: siteId,
                siteData: siteData,
                ownerId: this.currentUser.uid,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                createdAt: this.firebase.firestore.FieldValue.serverTimestamp(),
            };

            const docRef = await this.db.collection('preview_links').add(previewData);
            const previewId = docRef.id;

            // Generate preview URL
            const previewUrl = `${window.location.origin}/preview/${previewId}`;

            return {
                previewId: previewId,
                previewUrl: previewUrl,
                expiresAt: previewData.expiresAt,
            };
        } catch (error) {
            console.error('Error creating preview link:', error);
            throw new Error('Failed to create preview link');
        }
    }

    /**
     * Get site data from builder
     */
    getSiteDataFromBuilder() {
        // This will be called by the HTML builder to get current site data
        // The builder should implement this method to return its current state
        if (typeof window.getBuilderSiteData === 'function') {
            return window.getBuilderSiteData();
        }
        
        // Fallback: return empty site data
        return {
            name: 'Untitled Site',
            description: '',
            sections: [],
            theme: {},
        };
    }

    /**
     * Load site data into builder
     */
    loadSiteDataIntoBuilder(siteData) {
        // This will be called to load site data into the HTML builder
        // The builder should implement this method to accept site data
        if (typeof window.loadBuilderSiteData === 'function') {
            window.loadBuilderSiteData(siteData);
        }
    }

    /**
     * Update UI for authenticated user
     */
    updateUIForAuthenticatedUser() {
        // Show authenticated UI elements
        const authElements = document.querySelectorAll('.auth-required');
        authElements.forEach(el => el.style.display = 'block');

        const unauthElements = document.querySelectorAll('.auth-not-required');
        unauthElements.forEach(el => el.style.display = 'none');

        // Update user info
        const userInfoElements = document.querySelectorAll('.user-info');
        userInfoElements.forEach(el => {
            el.textContent = this.currentUser.displayName || this.currentUser.email;
        });
    }

    /**
     * Update UI for unauthenticated user
     */
    updateUIForUnauthenticatedUser() {
        // Hide authenticated UI elements
        const authElements = document.querySelectorAll('.auth-required');
        authElements.forEach(el => el.style.display = 'none');

        const unauthElements = document.querySelectorAll('.auth-not-required');
        unauthElements.forEach(el => el.style.display = 'block');
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Add to page
        document.body.appendChild(notification);

        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    /**
     * Show loading state
     */
    showLoading(element, text = 'Loading...') {
        if (element) {
            element.disabled = true;
            element.innerHTML = `
                <div class="loading-spinner"></div>
                ${text}
            `;
        }
    }

    /**
     * Hide loading state
     */
    hideLoading(element, originalText) {
        if (element) {
            element.disabled = false;
            element.innerHTML = originalText;
        }
    }

    /**
     * Domain Management Functions
     */

    /**
     * Get user's domain settings
     */
    async getDomainSettings(siteId) {
        if (!this.isAuthenticated()) {
            throw new Error('User must be authenticated to get domain settings');
        }

        try {
            const doc = await this.db.collection('sites').doc(siteId).get();
            
            if (!doc.exists) {
                throw new Error('Site not found');
            }

            const siteData = doc.data();
            
            // Check if user owns the site
            if (siteData.userId !== this.currentUser.uid) {
                throw new Error('Unauthorized access to site');
            }

            return {
                subdomain: siteData.subdomain || `${this.currentUser.uid}.myapp.com`,
                customDomain: siteData.customDomain || null,
                domainStatus: siteData.domainStatus || 'none',
                publishedUrl: siteData.publishedUrl || null,
            };
        } catch (error) {
            console.error('Error getting domain settings:', error);
            throw new Error('Failed to get domain settings');
        }
    }

    /**
     * Connect custom domain
     */
    async connectCustomDomain(siteId, domain) {
        if (!this.isAuthenticated()) {
            throw new Error('User must be authenticated to connect domain');
        }

        try {
            // Call the Cloud Function to connect domain
            const connectDomain = this.firebase.functions().httpsCallable('connectDomain');
            const result = await connectDomain({
                siteId: siteId,
                domain: domain,
                userId: this.currentUser.uid,
            });

            // Update the site with domain information
            await this.db.collection('sites').doc(siteId).update({
                customDomain: domain,
                domainStatus: 'pending',
                domainVerificationToken: result.data.verificationToken,
            });

            return result.data;
        } catch (error) {
            console.error('Error connecting domain:', error);
            throw new Error(`Failed to connect domain: ${error.message}`);
        }
    }

    /**
     * Verify domain
     */
    async verifyDomain(siteId) {
        if (!this.isAuthenticated()) {
            throw new Error('User must be authenticated to verify domain');
        }

        try {
            // Call the Cloud Function to verify domain
            const verifyDomain = this.firebase.functions().httpsCallable('verifyDomain');
            const result = await verifyDomain({
                siteId: siteId,
                userId: this.currentUser.uid,
            });

            // Update the site with verification status
            await this.db.collection('sites').doc(siteId).update({
                domainStatus: result.data.verified ? 'active' : 'failed',
                domainVerifiedAt: result.data.verified ? 
                    this.firebase.firestore.FieldValue.serverTimestamp() : null,
            });

            return result.data;
        } catch (error) {
            console.error('Error verifying domain:', error);
            throw new Error(`Failed to verify domain: ${error.message}`);
        }
    }

    /**
     * Remove custom domain
     */
    async removeCustomDomain(siteId) {
        if (!this.isAuthenticated()) {
            throw new Error('User must be authenticated to remove domain');
        }

        try {
            // Call the Cloud Function to remove domain
            const removeDomain = this.firebase.functions().httpsCallable('removeDomain');
            await removeDomain({
                siteId: siteId,
                userId: this.currentUser.uid,
            });

            // Update the site to remove domain information
            await this.db.collection('sites').doc(siteId).update({
                customDomain: null,
                domainStatus: 'none',
                domainVerificationToken: null,
                domainVerifiedAt: null,
            });

            return { success: true };
        } catch (error) {
            console.error('Error removing domain:', error);
            throw new Error(`Failed to remove domain: ${error.message}`);
        }
    }
}

// Initialize the bridge service
window.bridgeService = new BridgeService();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BridgeService;
}
