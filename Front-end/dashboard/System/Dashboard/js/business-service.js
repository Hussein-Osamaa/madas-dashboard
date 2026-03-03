// Business Service - Complete Multi-Tenant Data Isolation System
// This service ensures each client's data is completely isolated from other clients

class BusinessService {
    constructor() {
        this.currentBusinessId = null;
        this.currentUser = null;
        this.permissions = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the business service
     * Must be called on every dashboard page load
     */
    async initialize() {
        console.log('🔐 Initializing Business Service...');
        
        try {
            // Get current authenticated user
            const user = await this.getCurrentUser();
            if (!user) {
                console.error('❌ No authenticated user found');
                return false;
            }

            this.currentUser = user;

            // Get user's business ID from Firestore
            const userDoc = await window.getDocs(
                window.query(
                    window.collection(window.db, 'users'),
                    window.where('uid', '==', user.uid)
                )
            );

            if (userDoc.empty) {
                console.error('❌ User document not found');
                return false;
            }

            const userData = userDoc.docs[0].data();
            this.currentBusinessId = userData.businessId;

            // Get staff permissions
            const staffDoc = await window.getDocs(
                window.query(
                    window.collection(window.db, 'staff'),
                    window.where('email', '==', user.email),
                    window.where('businessId', '==', this.currentBusinessId)
                )
            );

            if (!staffDoc.empty) {
                const staffData = staffDoc.docs[0].data();
                this.permissions = staffData.permissions;
                console.log('✅ Staff permissions loaded:', this.permissions);
            }

            this.isInitialized = true;
            console.log('✅ Business Service initialized for business:', this.currentBusinessId);
            return true;

        } catch (error) {
            console.error('❌ Error initializing Business Service:', error);
            return false;
        }
    }

    /**
     * Get current authenticated user
     */
    async getCurrentUser() {
        return new Promise((resolve) => {
            if (window.auth) {
                window.onAuthStateChanged(window.auth, (user) => {
                    resolve(user);
                });
            } else {
                // Fallback to localStorage
                const session = localStorage.getItem('currentUser');
                if (session) {
                    try {
                        resolve(JSON.parse(session));
                    } catch (error) {
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            }
        });
    }

    /**
     * Get current business ID
     */
    getCurrentBusinessId() {
        return this.currentBusinessId;
    }

    /**
     * Check if user has specific permission
     */
    hasPermission(resource, action) {
        if (!this.permissions) return false;
        
        const resourcePerms = this.permissions[resource];
        if (!resourcePerms) return false;
        
        return Array.isArray(resourcePerms) && resourcePerms.includes(action);
    }

    /**
     * Get business-specific data
     * Automatically filters by businessId
     */
    async getBusinessData(collectionName, additionalFilters = []) {
        if (!this.isInitialized || !this.currentBusinessId) {
            throw new Error('Business Service not initialized');
        }

        try {
            // Build query with businessId filter
            let q = window.query(
                window.collection(window.db, collectionName),
                window.where('businessId', '==', this.currentBusinessId)
            );

            // Add additional filters
            additionalFilters.forEach(filter => {
                q = window.query(q, filter);
            });

            const snapshot = await window.getDocs(q);
            const data = [];
            
            snapshot.forEach(doc => {
                data.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`📊 Loaded ${data.length} items from ${collectionName} for business ${this.currentBusinessId}`);
            return data;

        } catch (error) {
            console.error(`❌ Error loading ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Create business-specific document
     * Automatically includes businessId
     */
    async createBusinessDocument(collectionName, data) {
        if (!this.isInitialized || !this.currentBusinessId) {
            throw new Error('Business Service not initialized');
        }

        try {
            // Add businessId and timestamps
            const docData = {
                ...data,
                businessId: this.currentBusinessId,
                createdBy: this.currentUser.uid,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const docRef = await window.addDoc(
                window.collection(window.db, collectionName),
                docData
            );

            console.log(`✅ Created ${collectionName} document:`, docRef.id);
            return docRef.id;

        } catch (error) {
            console.error(`❌ Error creating ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Update business-specific document
     * Verifies document belongs to current business
     */
    async updateBusinessDocument(collectionName, documentId, data) {
        if (!this.isInitialized || !this.currentBusinessId) {
            throw new Error('Business Service not initialized');
        }

        try {
            // Verify document belongs to current business
            const docRef = window.doc(window.db, collectionName, documentId);
            const docSnap = await window.getDoc(docRef);

            if (!docSnap.exists()) {
                throw new Error('Document not found');
            }

            const docData = docSnap.data();
            if (docData.businessId !== this.currentBusinessId) {
                throw new Error('Access denied: Document belongs to another business');
            }

            // Update document
            const updateData = {
                ...data,
                updatedBy: this.currentUser.uid,
                updatedAt: new Date().toISOString()
            };

            await window.updateDoc(docRef, updateData);
            console.log(`✅ Updated ${collectionName} document:`, documentId);

        } catch (error) {
            console.error(`❌ Error updating ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Delete business-specific document
     * Verifies document belongs to current business
     */
    async deleteBusinessDocument(collectionName, documentId) {
        if (!this.isInitialized || !this.currentBusinessId) {
            throw new Error('Business Service not initialized');
        }

        try {
            // Verify document belongs to current business
            const docRef = window.doc(window.db, collectionName, documentId);
            const docSnap = await window.getDoc(docRef);

            if (!docSnap.exists()) {
                throw new Error('Document not found');
            }

            const docData = docSnap.data();
            if (docData.businessId !== this.currentBusinessId) {
                throw new Error('Access denied: Document belongs to another business');
            }

            // Delete document
            await window.deleteDoc(docRef);
            console.log(`✅ Deleted ${collectionName} document:`, documentId);

        } catch (error) {
            console.error(`❌ Error deleting ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Get all staff members for current business
     */
    async getBusinessStaff() {
        if (!this.isInitialized || !this.currentBusinessId) {
            throw new Error('Business Service not initialized');
        }

        try {
            const staffQuery = window.query(
                window.collection(window.db, 'staff'),
                window.where('businessId', '==', this.currentBusinessId)
            );

            const snapshot = await window.getDocs(staffQuery);
            const staff = [];
            
            snapshot.forEach(doc => {
                staff.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`👥 Loaded ${staff.length} staff members`);
            return staff;

        } catch (error) {
            console.error('❌ Error loading staff:', error);
            throw error;
        }
    }

    /**
     * Invite new staff member
     */
    async inviteStaff(email, role, permissions) {
        if (!this.isInitialized || !this.currentBusinessId) {
            throw new Error('Business Service not initialized');
        }

        try {
            // Check if staff already exists
            const existingStaff = window.query(
                window.collection(window.db, 'staff'),
                window.where('email', '==', email),
                window.where('businessId', '==', this.currentBusinessId)
            );

            const existingSnapshot = await window.getDocs(existingStaff);

            if (!existingSnapshot.empty) {
                throw new Error('Staff member already exists in your business');
            }

            // Generate invitation token
            const token = this.generateInviteToken();

            // Create staff invitation
            const inviteData = {
                email: email,
                businessId: this.currentBusinessId,
                role: role,
                permissions: permissions,
                invitedBy: this.currentUser.uid,
                status: 'pending',
                approved: false,
                token: token,
                inviteExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                createdAt: new Date().toISOString()
            };

            const inviteRef = await window.addDoc(
                window.collection(window.db, 'staff_invites'),
                inviteData
            );

            // Generate invitation link
            const inviteLink = `${window.location.origin}/Dashboard/staff-invite.html?token=${token}`;

            console.log('✅ Staff invitation created:', inviteLink);
            
            // In production, send email here
            console.log('📧 Send this link to', email + ':', inviteLink);

            return {
                inviteId: inviteRef.id,
                inviteLink: inviteLink,
                email: email
            };

        } catch (error) {
            console.error('❌ Error inviting staff:', error);
            throw error;
        }
    }

    /**
     * Generate unique invitation token
     */
    generateInviteToken() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < 32; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    }

    /**
     * Get business information
     */
    async getBusinessInfo() {
        if (!this.isInitialized || !this.currentBusinessId) {
            throw new Error('Business Service not initialized');
        }

        try {
            const businessDoc = await window.getDoc(
                window.doc(window.db, 'businesses', this.currentBusinessId)
            );

            if (businessDoc.exists()) {
                return businessDoc.data();
            }

            return null;

        } catch (error) {
            console.error('❌ Error loading business info:', error);
            throw error;
        }
    }

    /**
     * Update business information
     */
    async updateBusinessInfo(data) {
        if (!this.isInitialized || !this.currentBusinessId) {
            throw new Error('Business Service not initialized');
        }

        // Only owner can update business info
        if (!this.hasPermission('settings', 'edit')) {
            throw new Error('Access denied: Only owners can update business information');
        }

        try {
            const businessRef = window.doc(window.db, 'businesses', this.currentBusinessId);
            
            const updateData = {
                ...data,
                updatedAt: new Date().toISOString()
            };

            await window.updateDoc(businessRef, updateData);
            console.log('✅ Business information updated');

        } catch (error) {
            console.error('❌ Error updating business info:', error);
            throw error;
        }
    }
}

// Initialize and export business service
window.businessService = new BusinessService();

// Auto-initialize when Firebase is ready
if (typeof window !== 'undefined') {
    const initBusinessService = setInterval(() => {
        if (window.auth && window.db && window.getDocs) {
            clearInterval(initBusinessService);
            window.businessService.initialize().then(success => {
                if (success) {
                    console.log('✅ Business Service ready to use');
                    
                    // Store business ID in localStorage for quick access
                    if (window.businessService.currentBusinessId) {
                        localStorage.setItem('currentBusinessId', window.businessService.currentBusinessId);
                    }
                } else {
                    console.error('❌ Business Service initialization failed');
                }
            });
        }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => {
        clearInterval(initBusinessService);
    }, 5000);
}

console.log('✅ Business Service loaded');
