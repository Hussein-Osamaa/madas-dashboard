// Mobile API Service
// Handles all API calls, data fetching, and business logic for the mobile app

import { getFirebaseFirestore, getFirebaseStorage, getFirebaseModules, FirebaseUtils } from './firebase-mobile.js';

export class ApiService {
    constructor() {
        this.db = null;
        this.storage = null;
        this.modules = null;
        this.currentBusinessId = null;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        this.initialize();
    }
    
    async initialize() {
        try {
            console.log('🌐 Initializing API Service...');
            
            this.db = getFirebaseFirestore();
            this.storage = getFirebaseStorage();
            this.modules = await getFirebaseModules();
            
            console.log('✅ API Service initialized');
        } catch (error) {
            console.error('❌ API Service initialization failed:', error);
            throw error;
        }
    }
    
    // Set current business context
    setBusinessContext(businessId) {
        this.currentBusinessId = businessId;
        console.log('🏢 Business context set:', businessId);
    }
    
    // Cache management
    getCacheKey(collection, filters = {}) {
        return `${collection}_${JSON.stringify(filters)}`;
    }
    
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }
    
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Cache cleared');
    }
    
    // Generic data fetching
    async fetchData(collection, filters = {}, options = {}) {
        try {
            // Check if Firebase is initialized
            if (!this.db || !this.modules || !this.modules.firestore) {
                console.error('❌ Firebase not initialized in API service');
                throw new Error('Firebase not initialized. Please wait for initialization to complete.');
            }
            
            const cacheKey = this.getCacheKey(collection, filters);
            const cached = this.getFromCache(cacheKey);
            
            if (cached && !options.forceRefresh) {
                console.log('📦 Returning cached data for:', collection);
                return cached;
            }
            
            console.log('📡 Fetching data from Firestore:', collection);
            
            let query = this.modules.firestore.collection(this.db, collection);
            
            // Apply business context filter
            if (this.currentBusinessId && collection !== 'businesses') {
                query = this.modules.firestore.query(
                    query,
                    this.modules.firestore.where('businessId', '==', this.currentBusinessId)
                );
            }
            
            // Apply additional filters
            Object.entries(filters).forEach(([field, value]) => {
                if (field !== 'businessId') {
                    query = this.modules.firestore.query(
                        query,
                        this.modules.firestore.where(field, '==', value)
                    );
                }
            });
            
            // Apply ordering
            if (options.orderBy) {
                query = this.modules.firestore.query(
                    query,
                    this.modules.firestore.orderBy(options.orderBy.field, options.orderBy.direction || 'desc')
                );
            }
            
            // Apply limit
            if (options.limit) {
                query = this.modules.firestore.query(
                    query,
                    this.modules.firestore.limit(options.limit)
                );
            }
            
            const snapshot = await this.modules.firestore.getDocs(query);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Cache the result
            this.setCache(cacheKey, data);
            
            console.log(`✅ Fetched ${data.length} documents from ${collection}`);
            return data;
            
        } catch (error) {
            console.error(`❌ Failed to fetch data from ${collection}:`, error);
            throw error;
        }
    }
    
    // Business data methods
    async getBusinessData(userId) {
        try {
            console.log('🏢 Fetching business data for user:', userId);
            
            // First try to find business by owner
            const ownerQuery = this.modules.firestore.query(
                this.modules.firestore.collection(this.db, 'businesses'),
                this.modules.firestore.where('owner.userId', '==', userId)
            );
            
            const ownerSnapshot = await this.modules.firestore.getDocs(ownerQuery);
            
            if (!ownerSnapshot.empty) {
                const businessDoc = ownerSnapshot.docs[0];
                const businessData = {
                    id: businessDoc.id,
                    ...businessDoc.data()
                };
                
                this.setBusinessContext(businessDoc.id);
                return businessData;
            }
            
            // If not owner, check if user is staff
            const userDoc = await this.modules.firestore.getDoc(
                this.modules.firestore.doc(this.db, 'users', userId)
            );
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.businessId) {
                    const businessDoc = await this.modules.firestore.getDoc(
                        this.modules.firestore.doc(this.db, 'businesses', userData.businessId)
                    );
                    
                    if (businessDoc.exists()) {
                        const businessData = {
                            id: businessDoc.id,
                            ...businessDoc.data()
                        };
                        
                        this.setBusinessContext(businessDoc.id);
                        return businessData;
                    }
                }
            }
            
            throw new Error('No business found for user');
            
        } catch (error) {
            console.error('❌ Failed to get business data:', error);
            throw error;
        }
    }
    
    // Dashboard data methods
    async getDashboardStats() {
        try {
            console.log('📊 Fetching dashboard stats...');
            
            const [orders, products, customers] = await Promise.all([
                this.fetchData('orders', {}, { limit: 1000 }),
                this.fetchData('products', {}, { limit: 1000 }),
                this.fetchData('customers', {}, { limit: 1000 })
            ]);
            
            const stats = {
                totalOrders: orders.length,
                totalProducts: products.length,
                totalCustomers: customers.length,
                totalRevenue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
                recentOrders: orders.slice(0, 5),
                lowStockProducts: products.filter(p => (p.stock || 0) <= (p.lowStockAlert || 5)),
                newCustomers: customers.filter(c => {
                    const createdDate = FirebaseUtils.timestampToDate(c.createdAt);
                    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    return createdDate > weekAgo;
                }).length
            };
            
            console.log('✅ Dashboard stats fetched');
            return stats;
            
        } catch (error) {
            console.error('❌ Failed to fetch dashboard stats:', error);
            throw error;
        }
    }
    
    // Orders methods
    async getOrders(filters = {}) {
        return this.fetchData('orders', filters, {
            orderBy: { field: 'createdAt', direction: 'desc' }
        });
    }
    
    async getOrder(orderId) {
        try {
            const orderDoc = await this.modules.firestore.getDoc(
                this.modules.firestore.doc(this.db, 'businesses', this.currentBusinessId, 'orders', orderId)
            );
            
            if (orderDoc.exists()) {
                return {
                    id: orderDoc.id,
                    ...orderDoc.data()
                };
            }
            
            throw new Error('Order not found');
            
        } catch (error) {
            console.error('❌ Failed to get order:', error);
            throw error;
        }
    }
    
    async createOrder(orderData) {
        try {
            console.log('📝 Creating new order...');
            
            const order = {
                ...orderData,
                businessId: this.currentBusinessId,
                createdAt: FirebaseUtils.getCurrentTimestamp(),
                updatedAt: FirebaseUtils.getCurrentTimestamp(),
                status: 'pending'
            };
            
            const docRef = await this.modules.firestore.addDoc(
                this.modules.firestore.collection(this.db, 'businesses', this.currentBusinessId, 'orders'),
                order
            );
            
            console.log('✅ Order created:', docRef.id);
            return docRef.id;
            
        } catch (error) {
            console.error('❌ Failed to create order:', error);
            throw error;
        }
    }
    
    async updateOrder(orderId, updates) {
        try {
            console.log('✏️ Updating order:', orderId);
            
            const orderRef = this.modules.firestore.doc(
                this.db, 'businesses', this.currentBusinessId, 'orders', orderId
            );
            
            await this.modules.firestore.updateDoc(orderRef, {
                ...updates,
                updatedAt: FirebaseUtils.getCurrentTimestamp()
            });
            
            console.log('✅ Order updated');
            
        } catch (error) {
            console.error('❌ Failed to update order:', error);
            throw error;
        }
    }
    
    // Products methods
    async getProducts(filters = {}) {
        return this.fetchData('products', filters, {
            orderBy: { field: 'name', direction: 'asc' }
        });
    }
    
    async getProduct(productId) {
        try {
            const productDoc = await this.modules.firestore.getDoc(
                this.modules.firestore.doc(this.db, 'businesses', this.currentBusinessId, 'products', productId)
            );
            
            if (productDoc.exists()) {
                return {
                    id: productDoc.id,
                    ...productDoc.data()
                };
            }
            
            throw new Error('Product not found');
            
        } catch (error) {
            console.error('❌ Failed to get product:', error);
            throw error;
        }
    }
    
    async createProduct(productData) {
        try {
            console.log('📦 Creating new product...');
            
            const product = {
                ...productData,
                businessId: this.currentBusinessId,
                createdAt: FirebaseUtils.getCurrentTimestamp(),
                updatedAt: FirebaseUtils.getCurrentTimestamp()
            };
            
            const docRef = await this.modules.firestore.addDoc(
                this.modules.firestore.collection(this.db, 'businesses', this.currentBusinessId, 'products'),
                product
            );
            
            console.log('✅ Product created:', docRef.id);
            return docRef.id;
            
        } catch (error) {
            console.error('❌ Failed to create product:', error);
            throw error;
        }
    }
    
    async updateProduct(productId, updates) {
        try {
            console.log('✏️ Updating product:', productId);
            
            const productRef = this.modules.firestore.doc(
                this.db, 'businesses', this.currentBusinessId, 'products', productId
            );
            
            await this.modules.firestore.updateDoc(productRef, {
                ...updates,
                updatedAt: FirebaseUtils.getCurrentTimestamp()
            });
            
            console.log('✅ Product updated');
            
        } catch (error) {
            console.error('❌ Failed to update product:', error);
            throw error;
        }
    }
    
    async deleteProduct(productId) {
        try {
            console.log('🗑️ Deleting product:', productId);
            
            await this.modules.firestore.deleteDoc(
                this.modules.firestore.doc(this.db, 'businesses', this.currentBusinessId, 'products', productId)
            );
            
            console.log('✅ Product deleted');
            
        } catch (error) {
            console.error('❌ Failed to delete product:', error);
            throw error;
        }
    }
    
    // Customers methods
    async getCustomers(filters = {}) {
        return this.fetchData('customers', filters, {
            orderBy: { field: 'name', direction: 'asc' }
        });
    }
    
    async createCustomer(customerData) {
        try {
            console.log('👤 Creating new customer...');
            
            const customer = {
                ...customerData,
                businessId: this.currentBusinessId,
                createdAt: FirebaseUtils.getCurrentTimestamp(),
                updatedAt: FirebaseUtils.getCurrentTimestamp()
            };
            
            const docRef = await this.modules.firestore.addDoc(
                this.modules.firestore.collection(this.db, 'businesses', this.currentBusinessId, 'customers'),
                customer
            );
            
            console.log('✅ Customer created:', docRef.id);
            return docRef.id;
            
        } catch (error) {
            console.error('❌ Failed to create customer:', error);
            throw error;
        }
    }
    
    // Finance methods
    async getFinancialData() {
        try {
            console.log('💰 Fetching financial data...');
            
            const orders = await this.getOrders();
            const expenses = await this.fetchData('expenses', {});
            
            const revenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
            const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
            const profit = revenue - totalExpenses;
            
            // Calculate monthly data
            const currentMonth = new Date();
            currentMonth.setDate(1);
            currentMonth.setHours(0, 0, 0, 0);
            
            const monthlyOrders = orders.filter(order => {
                const orderDate = FirebaseUtils.timestampToDate(order.createdAt);
                return orderDate >= currentMonth;
            });
            
            const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + (order.total || 0), 0);
            
            return {
                totalRevenue: revenue,
                totalExpenses: totalExpenses,
                profit: profit,
                monthlyRevenue: monthlyRevenue,
                monthlyOrders: monthlyOrders.length,
                orders: orders.slice(0, 10) // Recent orders for display
            };
            
        } catch (error) {
            console.error('❌ Failed to fetch financial data:', error);
            throw error;
        }
    }
    
    // Analytics methods
    async getAnalyticsData() {
        try {
            console.log('📈 Fetching analytics data...');
            
            const [orders, products, customers] = await Promise.all([
                this.getOrders(),
                this.getProducts(),
                this.getCustomers()
            ]);
            
            // Calculate trends
            const now = new Date();
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            const monthlyOrders = orders.filter(order => {
                const orderDate = FirebaseUtils.timestampToDate(order.createdAt);
                return orderDate >= lastMonth;
            });
            
            const weeklyOrders = orders.filter(order => {
                const orderDate = FirebaseUtils.timestampToDate(order.createdAt);
                return orderDate >= lastWeek;
            });
            
            // Top products by sales
            const productSales = {};
            orders.forEach(order => {
                if (order.items) {
                    order.items.forEach(item => {
                        if (!productSales[item.productId]) {
                            productSales[item.productId] = 0;
                        }
                        productSales[item.productId] += item.quantity;
                    });
                }
            });
            
            const topProducts = Object.entries(productSales)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([productId, quantity]) => {
                    const product = products.find(p => p.id === productId);
                    return {
                        productId,
                        productName: product?.name || 'Unknown Product',
                        quantity
                    };
                });
            
            return {
                totalOrders: orders.length,
                monthlyOrders: monthlyOrders.length,
                weeklyOrders: weeklyOrders.length,
                totalProducts: products.length,
                totalCustomers: customers.length,
                topProducts,
                salesTrend: this.calculateSalesTrend(orders)
            };
            
        } catch (error) {
            console.error('❌ Failed to fetch analytics data:', error);
            throw error;
        }
    }
    
    calculateSalesTrend(orders) {
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            
            const dayOrders = orders.filter(order => {
                const orderDate = FirebaseUtils.timestampToDate(order.createdAt);
                return orderDate >= date && orderDate < new Date(date.getTime() + 24 * 60 * 60 * 1000);
            });
            
            const dayRevenue = dayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
            
            last7Days.push({
                date: date.toISOString().split('T')[0],
                orders: dayOrders.length,
                revenue: dayRevenue
            });
        }
        
        return last7Days;
    }
    
    // Notifications methods
    async getNotifications() {
        try {
            console.log('🔔 Fetching notifications...');
            
            const notifications = await this.fetchData('notifications', {
                businessId: this.currentBusinessId
            }, {
                orderBy: { field: 'createdAt', direction: 'desc' },
                limit: 20
            });
            
            return notifications;
            
        } catch (error) {
            console.error('❌ Failed to fetch notifications:', error);
            return [];
        }
    }
    
    async markNotificationAsRead(notificationId) {
        try {
            console.log('✅ Marking notification as read:', notificationId);
            
            await this.modules.firestore.updateDoc(
                this.modules.firestore.doc(this.db, 'notifications', notificationId),
                {
                    read: true,
                    readAt: FirebaseUtils.getCurrentTimestamp()
                }
            );
            
        } catch (error) {
            console.error('❌ Failed to mark notification as read:', error);
        }
    }
    
    // Staff methods
    async getStaff() {
        try {
            console.log('👥 Fetching staff data...');
            
            const staffSnapshot = await this.modules.firestore.getDocs(
                this.modules.firestore.collection(this.db, 'businesses', this.currentBusinessId, 'staff')
            );
            
            const staff = staffSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            return staff;
            
        } catch (error) {
            console.error('❌ Failed to fetch staff:', error);
            throw error;
        }
    }
    
    async createStaffMember(staffData) {
        try {
            console.log('👤 Creating staff member...');
            
            const staff = {
                ...staffData,
                businessId: this.currentBusinessId,
                createdAt: FirebaseUtils.getCurrentTimestamp(),
                updatedAt: FirebaseUtils.getCurrentTimestamp(),
                status: 'pending'
            };
            
            const docRef = await this.modules.firestore.addDoc(
                this.modules.firestore.collection(this.db, 'businesses', this.currentBusinessId, 'staff'),
                staff
            );
            
            console.log('✅ Staff member created:', docRef.id);
            return docRef.id;
            
        } catch (error) {
            console.error('❌ Failed to create staff member:', error);
            throw error;
        }
    }
    
    // File upload methods
    async uploadFile(file, path) {
        try {
            console.log('📤 Uploading file:', path);
            
            const storageRef = this.modules.storage.ref(this.storage, path);
            const snapshot = await this.modules.storage.uploadBytes(storageRef, file);
            const downloadURL = await this.modules.storage.getDownloadURL(snapshot.ref);
            
            console.log('✅ File uploaded:', downloadURL);
            return downloadURL;
            
        } catch (error) {
            console.error('❌ Failed to upload file:', error);
            throw error;
        }
    }
    
    async deleteFile(path) {
        try {
            console.log('🗑️ Deleting file:', path);
            
            const storageRef = this.modules.storage.ref(this.storage, path);
            await this.modules.storage.deleteObject(storageRef);
            
            console.log('✅ File deleted');
            
        } catch (error) {
            console.error('❌ Failed to delete file:', error);
            throw error;
        }
    }
    
    // Search methods
    async search(query, collection, fields = ['name', 'description']) {
        try {
            console.log('🔍 Searching:', query, 'in', collection);
            
            // For now, we'll do client-side filtering
            // In production, you might want to use Algolia or similar service
            const allData = await this.fetchData(collection, {});
            
            const results = allData.filter(item => {
                return fields.some(field => {
                    const value = item[field];
                    if (typeof value === 'string') {
                        return value.toLowerCase().includes(query.toLowerCase());
                    }
                    return false;
                });
            });
            
            console.log(`✅ Found ${results.length} results`);
            return results;
            
        } catch (error) {
            console.error('❌ Search failed:', error);
            throw error;
        }
    }
}
