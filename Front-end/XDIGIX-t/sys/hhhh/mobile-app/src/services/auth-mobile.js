// Mobile Authentication Service
// Handles user authentication, multi-tenancy, and session management for mobile app

import { getFirebaseAuth, getFirebaseFirestore, getFirebaseModules, FirebaseUtils } from './firebase-mobile.js';

export class AuthService {
    constructor() {
        this.auth = null;
        this.db = null;
        this.modules = null;
        this.currentUser = null;
        this.currentBusiness = null;
        this.authStateListeners = [];
        
        this.initialize();
    }
    
    async initialize() {
        try {
            console.log('🔐 Initializing Auth Service...');
            
            this.auth = getFirebaseAuth();
            this.db = getFirebaseFirestore();
            this.modules = await getFirebaseModules();
            
            // Set up auth state listener
            this.setupAuthStateListener();
            
            console.log('✅ Auth Service initialized');
        } catch (error) {
            console.error('❌ Auth Service initialization failed:', error);
            throw error;
        }
    }
    
    setupAuthStateListener() {
        this.modules.auth.onAuthStateChanged(this.auth, async (user) => {
            console.log('🔄 Auth state changed:', user ? 'User logged in' : 'User logged out');
            
            if (user) {
                await this.handleUserLogin(user);
            } else {
                this.handleUserLogout();
            }
            
            // Notify listeners
            this.authStateListeners.forEach(listener => {
                try {
                    listener(user);
                } catch (error) {
                    console.error('Error in auth state listener:', error);
                }
            });
        });
    }
    
    async handleUserLogin(user) {
        try {
            console.log('👤 Handling user login:', user.email);
            
            // Get user profile and business data
            const userProfile = await this.getUserProfile(user.uid);
            const businessData = await this.getBusinessData(userProfile);
            
            this.currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || userProfile?.name,
                photoURL: user.photoURL,
                emailVerified: user.emailVerified,
                ...userProfile,
                businessData
            };
            
            this.currentBusiness = businessData;
            
            // Store in localStorage for offline access
            localStorage.setItem('madasUser', JSON.stringify(this.currentUser));
            localStorage.setItem('madasBusiness', JSON.stringify(this.currentBusiness));
            
            console.log('✅ User login handled successfully');
            
        } catch (error) {
            console.error('❌ Failed to handle user login:', error);
            throw error;
        }
    }
    
    handleUserLogout() {
        console.log('👋 Handling user logout');
        
        this.currentUser = null;
        this.currentBusiness = null;
        
        // Clear localStorage
        localStorage.removeItem('madasUser');
        localStorage.removeItem('madasBusiness');
        localStorage.removeItem('fcmToken');
    }
    
    async getUserProfile(uid) {
        try {
            const userDoc = await this.modules.firestore.getDoc(
                this.modules.firestore.doc(this.db, 'users', uid)
            );
            
            if (userDoc.exists()) {
                return userDoc.data();
            }
            
            return null;
        } catch (error) {
            console.error('Failed to get user profile:', error);
            return null;
        }
    }
    
    async getBusinessData(userProfile) {
        try {
            if (!userProfile?.businessId) {
                // Try to find business by owner
                const businessesQuery = this.modules.firestore.query(
                    this.modules.firestore.collection(this.db, 'businesses'),
                    this.modules.firestore.where('owner.userId', '==', this.currentUser?.uid)
                );
                
                const businessesSnapshot = await this.modules.firestore.getDocs(businessesQuery);
                
                if (!businessesSnapshot.empty) {
                    const businessDoc = businessesSnapshot.docs[0];
                    return {
                        id: businessDoc.id,
                        ...businessDoc.data()
                    };
                }
                
                return null;
            }
            
            const businessDoc = await this.modules.firestore.getDoc(
                this.modules.firestore.doc(this.db, 'businesses', userProfile.businessId)
            );
            
            if (businessDoc.exists()) {
                return {
                    id: businessDoc.id,
                    ...businessDoc.data()
                };
            }
            
            return null;
        } catch (error) {
            console.error('Failed to get business data:', error);
            return null;
        }
    }
    
    // Authentication methods
    async signIn(email, password) {
        try {
            console.log('🔑 Signing in user:', email);
            
            const userCredential = await this.modules.auth.signInWithEmailAndPassword(
                this.auth, email, password
            );
            
            console.log('✅ User signed in successfully');
            return userCredential.user;
            
        } catch (error) {
            console.error('❌ Sign in failed:', error);
            throw this.handleAuthError(error);
        }
    }
    
    async signUp(email, password, userData = {}) {
        try {
            console.log('📝 Creating new user account:', email);
            
            const userCredential = await this.modules.auth.createUserWithEmailAndPassword(
                this.auth, email, password
            );
            
            // Update user profile
            if (userData.displayName) {
                await this.modules.auth.updateProfile(userCredential.user, {
                    displayName: userData.displayName
                });
            }
            
            // Create user profile in Firestore
            await this.createUserProfile(userCredential.user, userData);
            
            console.log('✅ User account created successfully');
            return userCredential.user;
            
        } catch (error) {
            console.error('❌ Sign up failed:', error);
            throw this.handleAuthError(error);
        }
    }
    
    async signOut() {
        try {
            console.log('🚪 Signing out user');
            
            await this.modules.auth.signOut(this.auth);
            
            console.log('✅ User signed out successfully');
            
        } catch (error) {
            console.error('❌ Sign out failed:', error);
            throw error;
        }
    }
    
    async createUserProfile(user, userData) {
        try {
            const userProfile = {
                uid: user.uid,
                email: user.email,
                name: userData.displayName || userData.name || user.displayName,
                businessId: userData.businessId,
                businessName: userData.businessName,
                role: userData.role || 'staff',
                permissions: userData.permissions || this.getDefaultPermissions(userData.role),
                createdAt: FirebaseUtils.getCurrentTimestamp(),
                updatedAt: FirebaseUtils.getCurrentTimestamp(),
                isActive: true,
                setupCompleted: true,
                ...userData
            };
            
            await this.modules.firestore.setDoc(
                this.modules.firestore.doc(this.db, 'users', user.uid),
                userProfile
            );
            
            console.log('✅ User profile created');
            
        } catch (error) {
            console.error('❌ Failed to create user profile:', error);
            throw error;
        }
    }
    
    getDefaultPermissions(role) {
        const permissions = {
            owner: {
                home: ['view'],
                orders: ['view', 'search', 'create', 'edit', 'delete'],
                inventory: ['view', 'edit', 'delete'],
                customers: ['view', 'edit', 'delete'],
                employees: ['view', 'edit', 'delete'],
                finance: ['view', 'reports', 'export'],
                analytics: ['view', 'export'],
                settings: ['view', 'edit']
            },
            admin: {
                home: ['view'],
                orders: ['view', 'search', 'create', 'edit'],
                inventory: ['view', 'edit'],
                customers: ['view', 'edit'],
                employees: ['view', 'edit'],
                finance: ['view', 'reports'],
                analytics: ['view', 'export'],
                settings: ['view']
            },
            manager: {
                home: ['view'],
                orders: ['view', 'search', 'create', 'edit'],
                inventory: ['view', 'edit'],
                customers: ['view', 'edit'],
                employees: ['view'],
                finance: ['view'],
                analytics: ['view'],
                settings: []
            },
            staff: {
                home: ['view'],
                orders: ['view', 'search', 'create'],
                inventory: ['view'],
                customers: ['view'],
                employees: [],
                finance: [],
                analytics: [],
                settings: []
            }
        };
        
        return permissions[role] || permissions.staff;
    }
    
    // Multi-tenancy methods
    async getCurrentBusiness() {
        if (this.currentBusiness) {
            return this.currentBusiness;
        }
        
        // Try to load from localStorage
        const storedBusiness = localStorage.getItem('madasBusiness');
        if (storedBusiness) {
            this.currentBusiness = JSON.parse(storedBusiness);
            return this.currentBusiness;
        }
        
        return null;
    }
    
    async getCurrentUser() {
        if (this.currentUser) {
            return this.currentUser;
        }
        
        // Try to load from localStorage
        const storedUser = localStorage.getItem('madasUser');
        if (storedUser) {
            this.currentUser = JSON.parse(storedUser);
            return this.currentUser;
        }
        
        return null;
    }
    
    async hasPermission(resource, action) {
        const user = await this.getCurrentUser();
        if (!user || !user.permissions) {
            return false;
        }
        
        const resourcePermissions = user.permissions[resource];
        if (!resourcePermissions) {
            return false;
        }
        
        return resourcePermissions.includes(action);
    }
    
    async canAccessBusiness(businessId) {
        const user = await this.getCurrentUser();
        const business = await this.getCurrentBusiness();
        
        if (!user || !business) {
            return false;
        }
        
        // Super admin can access all businesses
        if (user.role === 'super-admin') {
            return true;
        }
        
        // User can access their own business
        return business.id === businessId || user.businessId === businessId;
    }
    
    // Utility methods
    handleAuthError(error) {
        console.error('Auth error:', error);
        
        const errorMessages = {
            'auth/user-not-found': 'No account found with this email address.',
            'auth/wrong-password': 'Incorrect password. Please try again.',
            'auth/email-already-in-use': 'An account with this email already exists.',
            'auth/weak-password': 'Password should be at least 6 characters.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'auth/network-request-failed': 'Network error. Please check your connection.',
            'auth/user-disabled': 'This account has been disabled.',
            'auth/invalid-credential': 'Invalid email or password.'
        };
        
        const message = errorMessages[error.code] || 'Authentication failed. Please try again.';
        
        return new Error(message);
    }
    
    // Event listeners
    addAuthStateListener(listener) {
        this.authStateListeners.push(listener);
        
        // Return unsubscribe function
        return () => {
            const index = this.authStateListeners.indexOf(listener);
            if (index > -1) {
                this.authStateListeners.splice(index, 1);
            }
        };
    }
    
    // Session management
    async refreshSession() {
        try {
            const user = this.auth.currentUser;
            if (user) {
                await user.reload();
                console.log('✅ Session refreshed');
            }
        } catch (error) {
            console.error('❌ Failed to refresh session:', error);
            throw error;
        }
    }
    
    async updateProfile(updates) {
        try {
            const user = this.auth.currentUser;
            if (!user) {
                throw new Error('No user logged in');
            }
            
            // Update Firebase Auth profile
            if (updates.displayName || updates.photoURL) {
                await this.modules.auth.updateProfile(user, {
                    displayName: updates.displayName,
                    photoURL: updates.photoURL
                });
            }
            
            // Update Firestore profile
            const userRef = this.modules.firestore.doc(this.db, 'users', user.uid);
            await this.modules.firestore.updateDoc(userRef, {
                ...updates,
                updatedAt: FirebaseUtils.getCurrentTimestamp()
            });
            
            // Update local user data
            if (this.currentUser) {
                this.currentUser = { ...this.currentUser, ...updates };
                localStorage.setItem('madasUser', JSON.stringify(this.currentUser));
            }
            
            console.log('✅ Profile updated successfully');
            
        } catch (error) {
            console.error('❌ Failed to update profile:', error);
            throw error;
        }
    }
    
    // Password management
    async changePassword(currentPassword, newPassword) {
        try {
            const user = this.auth.currentUser;
            if (!user) {
                throw new Error('No user logged in');
            }
            
            // Re-authenticate user
            const credential = this.modules.auth.EmailAuthProvider.credential(
                user.email, currentPassword
            );
            await user.reauthenticateWithCredential(credential);
            
            // Update password
            await user.updatePassword(newPassword);
            
            console.log('✅ Password changed successfully');
            
        } catch (error) {
            console.error('❌ Failed to change password:', error);
            throw this.handleAuthError(error);
        }
    }
    
    // Business switching (for multi-business users)
    async switchBusiness(businessId) {
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                throw new Error('No user logged in');
            }
            
            // Check if user has access to this business
            if (!await this.canAccessBusiness(businessId)) {
                throw new Error('Access denied to this business');
            }
            
            // Get business data
            const businessDoc = await this.modules.firestore.getDoc(
                this.modules.firestore.doc(this.db, 'businesses', businessId)
            );
            
            if (!businessDoc.exists()) {
                throw new Error('Business not found');
            }
            
            const businessData = {
                id: businessDoc.id,
                ...businessDoc.data()
            };
            
            // Update current business
            this.currentBusiness = businessData;
            localStorage.setItem('madasBusiness', JSON.stringify(businessData));
            
            console.log('✅ Switched to business:', businessData.businessName);
            
        } catch (error) {
            console.error('❌ Failed to switch business:', error);
            throw error;
        }
    }
}
