/**
 * POS (Point of Sale) System for MADAS Web Dashboard
 * Complete POS functionality with multi-tenancy support
 */

// Utility functions
function showPOSError(message) {
    console.error('❌ POS Error:', message);
    showNotification('error', message);
}

function showPOSSuccess(message) {
    console.log('✅ POS Success:', message);
    showNotification('success', message);
}

// Enhanced notification system
function showNotification(type, message) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.pos-notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = `pos-notification pos-notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="material-icons">${type === 'success' ? 'check_circle' : 'error'}</span>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <span class="material-icons">close</span>
        </button>
    `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Input validation
function validateInput(input, type) {
    switch (type) {
        case 'email':
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
        case 'phone':
            return /^[\+]?[1-9][\d]{0,15}$/.test(input);
        case 'price':
            return !isNaN(parseFloat(input)) && parseFloat(input) >= 0;
        case 'quantity':
            return !isNaN(parseInt(input)) && parseInt(input) > 0;
        default:
            return input && input.trim().length > 0;
    }
}

// Sanitize input
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .trim()
        .substring(0, 1000); // Limit length
}

// Audit logging
function logAuditEvent(event, data) {
    const auditLog = {
        timestamp: new Date().toISOString(),
        event: event,
        userId: firebaseInstance?.auth?.currentUser?.uid || 'anonymous',
        businessId: posBusinessId,
        data: data
    };
    
    console.log('📝 Audit Log:', auditLog);
    
    // In production, send to logging service
    if (firebaseInstance?.db) {
        firebaseInstance.addDoc(firebaseInstance.collection(firebaseInstance.db, 'audit_logs'), auditLog)
            .catch(err => console.error('Failed to log audit event:', err));
    }
}

function clearPOSCart() {
    posCart = [];
    updatePOSCartDisplay();
}

function updatePOSUI() {
    try {
        // Update business name in header
        const businessNameElement = document.getElementById('business-name');
        if (businessNameElement && posBusinessData) {
            businessNameElement.textContent = posBusinessData.name || 'MADAS POS System';
        } else if (businessNameElement) {
            businessNameElement.textContent = 'MADAS POS System (No Business Access)';
        }

        // Update business plan badge
        const planBadgeElement = document.getElementById('plan-badge');
        if (planBadgeElement && posBusinessData) {
            planBadgeElement.textContent = posBusinessData.plan || 'Free';
            planBadgeElement.className = `px-2 py-1 rounded-full text-xs font-medium ${
                posBusinessData.plan === 'Premium' ? 'bg-purple-100 text-purple-800' :
                posBusinessData.plan === 'Pro' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
            }`;
        } else if (planBadgeElement) {
            planBadgeElement.textContent = 'No Access';
            planBadgeElement.className = 'px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800';
        }

        console.log('✅ POS UI updated');
    } catch (error) {
        console.error('❌ Failed to update POS UI:', error);
    }
}

// Firebase configuration and imports
const firebaseConfig = {
  apiKey: "AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8",
  authDomain: "madas-store.firebaseapp.com",
  projectId: "madas-store",
  storageBucket: "madas-store.firebasestorage.app",
  messagingSenderId: "527071300010",
  appId: "1:527071300010:web:70470e2204065b4590583d3",
};

// Initialize Firebase
let firebaseInstance = null;

async function initializeFirebase() {
  try {
    // Import Firebase modules
    const { initializeApp } = await import(
      "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"
    );
    const {
      getFirestore,
      collection,
      getDocs,
      addDoc,
      updateDoc,
      deleteDoc,
      doc,
      query,
      where,
      orderBy,
      limit,
      getDoc,
      setDoc,
      onSnapshot,
      writeBatch,
      serverTimestamp
    } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const {
      getAuth,
      signInWithEmailAndPassword,
      createUserWithEmailAndPassword,
      signOut,
      onAuthStateChanged,
      updateProfile
    } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
    const {
      getStorage,
      ref,
      uploadBytes,
      getDownloadURL,
      deleteObject
    } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js");

    // Initialize Firebase app
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    const storage = getStorage(app);

    // Create firebase instance object
    firebaseInstance = {
      app,
      db,
      auth,
      storage,
      // Firestore functions
      collection,
      getDocs,
      addDoc,
      updateDoc,
      deleteDoc,
      doc,
      query,
      where,
      orderBy,
      limit,
      getDoc,
      setDoc,
      onSnapshot,
      writeBatch,
      serverTimestamp,
      // Auth functions
      signInWithEmailAndPassword,
      createUserWithEmailAndPassword,
      signOut,
      onAuthStateChanged,
      updateProfile,
      // Storage functions
      ref,
      uploadBytes,
      getDownloadURL,
      deleteObject
    };

    console.log('✅ Firebase initialized for POS');
    return firebaseInstance;
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
}

// Global POS variables
let posCart = [];
let posProducts = [];
let posCustomer = null;
let posDiscount = 0;
let posTaxRate = 0.08; // 8% tax rate
let posBusinessId = null;
let posBusinessData = null;
let posUserRole = null;
let posUserPermissions = null;

// Initialize POS system
async function initializePOS() {
    try {
        console.log('🛒 Initializing POS system...');
        
        // Wait for Firebase to be ready
        if (!firebaseInstance) {
            console.log('⏳ Waiting for Firebase initialization...');
            setTimeout(initializePOS, 1000);
            return;
        }
        
        // Get business context
        await getBusinessContext();
        
        // Initialize event listeners
        initializePOSEventListeners();
        
        // Load products
        await loadPOSProducts();
        
        // Update UI
        updatePOSUI();
        
        console.log('✅ POS system initialized');
    } catch (error) {
        console.error('❌ POS initialization failed:', error);
        showPOSError('Failed to initialize POS system');
    }
}

// Get business context for multi-tenancy
async function getBusinessContext() {
    try {
        if (!firebaseInstance) {
            throw new Error('Firebase not initialized');
        }
        
        const { db, collection, getDocs, query, where, getDoc, doc, onAuthStateChanged } = firebaseInstance;
        
        // Wait for authentication state
        return new Promise((resolve, reject) => {
            const unsubscribe = onAuthStateChanged(firebaseInstance.auth, async (user) => {
                unsubscribe(); // Stop listening after first change
                
                if (!user) {
                    console.log('❌ No user authenticated, redirecting to login...');
                    // Redirect to login page
                    window.location.href = '/dashboard/login.html';
                    return;
                }
                
                try {
                    console.log('✅ User authenticated:', user.email);
                    
                    // Get user data
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    
                    if (!userDoc.exists()) {
                        console.log('⚠️ User data not found, creating default user profile...');
                        
                        // Create default user data
                        const defaultUserData = {
                            email: user.email,
                            displayName: user.displayName || user.email.split('@')[0],
                            role: 'staff',
                            permissions: ['view'],
                            businessId: null,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                        
                        // Save user data to Firestore
                        await firebaseInstance.setDoc(firebaseInstance.doc(firebaseInstance.db, 'users', user.uid), defaultUserData);
                        
                        console.log('✅ Default user profile created');
                        
                        // Set default values
                        posBusinessId = null;
                        posUserRole = 'staff';
                        posUserPermissions = ['view'];
                        posBusinessData = null;
                        
                        // Show message to user
                        showPOSError('User profile created. Please contact admin to assign business access.');
                        
                        resolve();
                        return;
                    }
                    
                    const userData = userDoc.data();
                    
                    // Set business context
                    posBusinessId = userData.businessId;
                    posUserRole = userData.role || 'staff';
                    posUserPermissions = userData.permissions || ['view'];
                    
                    if (!posBusinessId) {
                        console.log('⚠️ No business context available for user');
                        posBusinessData = null;
                        
                        // Show message to user
                        showPOSError('No business access assigned. Please contact admin.');
                        
                        resolve();
                        return;
                    }
                    
                    // Get business data
                    const businessDoc = await getDoc(doc(db, 'businesses', posBusinessId));
                    if (businessDoc.exists()) {
                        posBusinessData = businessDoc.data();
                    }
                    
                    console.log('🏢 Business context loaded:', {
                        businessId: posBusinessId,
                        role: posUserRole,
                        permissions: posUserPermissions
                    });
                    
                    resolve();
                } catch (error) {
                    console.error('❌ Failed to get business context:', error);
                    reject(error);
                }
            });
        });
    } catch (error) {
        console.error('❌ Failed to get business context:', error);
        throw error;
    }
}

// Initialize POS event listeners
function initializePOSEventListeners() {
    // Product search
    const productSearch = document.getElementById('product-search');
    if (productSearch) {
        productSearch.addEventListener('input', (e) => {
            searchPOSProducts(e.target.value);
        });
    }

    // Scan barcode button
    const scanBtn = document.getElementById('scan-barcode-btn');
    if (scanBtn) {
        scanBtn.addEventListener('click', startBarcodeScan);
    }

    // Customer button
    const customerBtn = document.getElementById('add-customer-btn');
    if (customerBtn) {
        customerBtn.addEventListener('click', showCustomerModal);
    }

    // Discount button
    const discountBtn = document.getElementById('apply-discount-btn');
    if (discountBtn) {
        discountBtn.addEventListener('click', showDiscountModal);
    }

    // Payment button
    const paymentBtn = document.getElementById('process-payment-btn');
    if (paymentBtn) {
        paymentBtn.addEventListener('click', showPaymentModal);
    }

    // Clear cart button
    const clearBtn = document.getElementById('clear-cart-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearPOSCart);
    }
}

// Load products for POS
async function loadPOSProducts() {
    try {
        console.log('📦 Loading products for POS...');
        
        if (!firebaseInstance) {
            console.log('⏳ Waiting for Firebase initialization...');
            setTimeout(loadPOSProducts, 1000);
            return;
        }
        
        if (!posBusinessId) {
            console.log('⚠️ No business context available, showing empty product list');
            posProducts = [];
            renderPOSProducts([]);
            return;
        }
        
        const { db, collection, getDocs } = firebaseInstance;
        
        // Load products for current business
        const productsRef = collection(db, 'businesses', posBusinessId, 'products');
        const productsSnapshot = await getDocs(productsRef);
        
        posProducts = [];
        productsSnapshot.forEach((doc) => {
            posProducts.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`✅ Loaded ${posProducts.length} products`);
        renderPOSProducts(posProducts);
        
    } catch (error) {
        console.error('❌ Failed to load products:', error);
        showPOSError('Failed to load products');
    }
}

// Render products in POS grid
function renderPOSProducts(products) {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;

    if (products.length === 0) {
        productGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #6b7280;">
                <span class="material-icons" style="font-size: 48px; margin-bottom: 16px; color: #d1d5db;">inventory_2</span>
                <p>No products found</p>
            </div>
        `;
        return;
    }

    productGrid.innerHTML = products.map(product => `
        <div class="product-card" onclick="addToPOSCart('${product.id}')">
            <div class="product-image">
                <span class="material-icons" style="font-size: 48px; color: #9ca3af;">inventory_2</span>
            </div>
            <div class="product-info">
                <h3>${product.name || 'Unnamed Product'}</h3>
                <div class="product-category">${product.category || 'No Category'}</div>
                <div class="product-price">EGP ${product.price || 0}</div>
                <div class="product-stock">Stock: ${product.stock || 0}</div>
            </div>
        </div>
    `).join('');
}

// Search products
function searchPOSProducts(query) {
    if (!query.trim()) {
        renderPOSProducts(posProducts);
        return;
    }

    const filteredProducts = posProducts.filter(product => 
        product.name?.toLowerCase().includes(query.toLowerCase()) ||
        product.category?.toLowerCase().includes(query.toLowerCase()) ||
        product.barcode?.includes(query)
    );

    renderPOSProducts(filteredProducts);
}

// Add product to cart
function addToPOSCart(productId) {
    const product = posProducts.find(p => p.id === productId);
    if (!product) return;

    // Check if product already in cart
    const existingItem = posCart.find(item => item.id === productId);
    
    if (existingItem) {
        if (existingItem.quantity < (product.stock || 0)) {
            existingItem.quantity += 1;
        } else {
            showPOSError('Insufficient stock');
            return;
        }
    } else {
        if ((product.stock || 0) > 0) {
            posCart.push({
                id: product.id,
                name: product.name,
                price: product.price || 0,
                quantity: 1,
                category: product.category,
                stock: product.stock || 0
            });
        } else {
            showPOSError('Product out of stock');
            return;
        }
    }

    updatePOSCartDisplay();
    showPOSSuccess(`${product.name} added to cart`);
    
    // Log audit event
    logAuditEvent('product_added_to_cart', {
        productId: productId,
        productName: product.name,
        quantity: existingItem ? existingItem.quantity : 1
    });
}

// Remove product from cart
function removeFromPOSCart(productId) {
    posCart = posCart.filter(item => item.id !== productId);
    updatePOSCartDisplay();
}

// Update cart quantity
function updatePOSCartQuantity(productId, quantity) {
    const item = posCart.find(item => item.id === productId);
    if (!item) return;

    if (quantity <= 0) {
        removeFromPOSCart(productId);
    } else if (quantity <= item.stock) {
        item.quantity = quantity;
        updatePOSCartDisplay();
    } else {
        showPOSError('Insufficient stock');
    }
}

// Update cart display
function updatePOSCartDisplay() {
    const cartItems = document.getElementById('cart-items');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartTax = document.getElementById('cart-tax');
    const cartDiscount = document.getElementById('cart-discount');
    const cartTotal = document.getElementById('cart-total');
    const processPaymentBtn = document.getElementById('process-payment-btn');

    if (!cartItems) return;

    if (posCart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <span class="material-icons">shopping_cart</span>
                <p>Cart is empty</p>
            </div>
        `;
        
        if (cartSubtotal) cartSubtotal.textContent = 'EGP 0.00';
        if (cartTax) cartTax.textContent = 'EGP 0.00';
        if (cartDiscount) cartDiscount.textContent = 'EGP 0.00';
        if (cartTotal) cartTotal.textContent = 'EGP 0.00';
        if (processPaymentBtn) processPaymentBtn.disabled = true;
        return;
    }

    // Render cart items
    cartItems.innerHTML = posCart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">EGP ${item.price} each</div>
            </div>
            <div class="cart-item-controls">
                <button class="quantity-btn" onclick="updatePOSCartQuantity('${item.id}', ${item.quantity - 1})">
                    <span class="material-icons" style="font-size: 16px;">remove</span>
                </button>
                <span class="quantity-display">${item.quantity}</span>
                <button class="quantity-btn" onclick="updatePOSCartQuantity('${item.id}', ${item.quantity + 1})">
                    <span class="material-icons" style="font-size: 16px;">add</span>
                </button>
                <div style="text-align: right; margin-left: 12px;">
                    <div style="font-weight: 500;">EGP ${(item.price * item.quantity).toFixed(2)}</div>
                    <button onclick="removeFromPOSCart('${item.id}')" style="color: #ef4444; font-size: 12px; background: none; border: none; cursor: pointer;">
                        Remove
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    // Calculate totals
    const subtotal = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * posTaxRate;
    const total = subtotal + tax - posDiscount;

    if (cartSubtotal) cartSubtotal.textContent = `EGP ${subtotal.toFixed(2)}`;
    if (cartTax) cartTax.textContent = `EGP ${tax.toFixed(2)}`;
    if (cartDiscount) cartDiscount.textContent = `EGP ${posDiscount.toFixed(2)}`;
    if (cartTotal) cartTotal.textContent = `EGP ${total.toFixed(2)}`;
    if (processPaymentBtn) processPaymentBtn.disabled = posCart.length === 0;
}

// Start barcode scan
function startBarcodeScan() {
    // Check if camera is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showPOSError('Camera not available. Please enter barcode manually.');
        const barcode = prompt('Enter barcode manually:');
        if (barcode) {
            findProductByBarcode(barcode);
        }
        return;
    }

    // Create scanner modal
    const scannerModal = document.createElement('div');
    scannerModal.className = 'modal';
    scannerModal.id = 'scanner-modal';
    scannerModal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3 class="modal-title">Scan Barcode</h3>
                <button class="close-modal" onclick="closeScannerModal()">
                    <span class="material-icons">close</span>
                </button>
            </div>
            <div class="scanner-container">
                <video id="scanner-video" autoplay playsinline style="width: 100%; height: 300px; background: #000; border-radius: 8px;"></video>
                <div class="scanner-overlay">
                    <div class="scanner-frame"></div>
                    <p class="scanner-text">Position barcode within the frame</p>
                </div>
                <div class="scanner-actions">
                    <button class="btn btn-cancel" onclick="closeScannerModal()">Cancel</button>
                    <button class="btn btn-secondary" onclick="switchCamera()">Switch Camera</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(scannerModal);
    scannerModal.style.display = 'flex';

    // Start camera
    startCamera();
}

function startCamera() {
    const video = document.getElementById('scanner-video');
    if (!video) return;

    navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'environment' // Use back camera if available
        } 
    })
    .then(stream => {
        video.srcObject = stream;
        video.play();
        
        // Start barcode detection
        detectBarcode(video);
    })
    .catch(err => {
        console.error('Camera access denied:', err);
        showPOSError('Camera access denied. Please allow camera access or enter barcode manually.');
        closeScannerModal();
    });
}

function detectBarcode(video) {
    // Simple barcode detection simulation
    // In a real implementation, you would use a library like QuaggaJS or ZXing
    let scanAttempts = 0;
    const maxAttempts = 100; // Stop after 10 seconds
    
    const detectInterval = setInterval(() => {
        scanAttempts++;
        
        // Simulate barcode detection (replace with real detection)
        if (scanAttempts > 50) {
            // For demo purposes, simulate finding a barcode
            const mockBarcode = '1234567890';
            clearInterval(detectInterval);
            findProductByBarcode(mockBarcode);
            closeScannerModal();
        }
        
        if (scanAttempts >= maxAttempts) {
            clearInterval(detectInterval);
            showPOSError('Barcode not detected. Please try again or enter manually.');
        }
    }, 100);
}

function findProductByBarcode(barcode) {
    const product = posProducts.find(p => p.barcode === barcode);
    if (product) {
        addToPOSCart(product.id);
        showPOSSuccess(`Product "${product.name}" added to cart`);
    } else {
        showPOSError('Product not found. Please check the barcode or add product manually.');
    }
}

function closeScannerModal() {
    const modal = document.getElementById('scanner-modal');
    if (modal) {
        // Stop camera stream
        const video = document.getElementById('scanner-video');
        if (video && video.srcObject) {
            const stream = video.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
        }
        
        modal.remove();
    }
}

function switchCamera() {
    // Stop current stream
    const video = document.getElementById('scanner-video');
    if (video && video.srcObject) {
        const stream = video.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
    }
    
    // Start with different camera
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'user' // Switch to front camera
        } 
    })
    .then(stream => {
        video.srcObject = stream;
        video.play();
    })
    .catch(err => {
        console.error('Camera switch failed:', err);
        showPOSError('Failed to switch camera');
    });
}

// Show customer modal
function showCustomerModal() {
    const modal = document.getElementById('customer-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Close customer modal
function closeCustomerModal() {
    const modal = document.getElementById('customer-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Save customer
function saveCustomer() {
    const name = sanitizeInput(document.getElementById('customer-name')?.value);
    const email = sanitizeInput(document.getElementById('customer-email')?.value);
    const phone = sanitizeInput(document.getElementById('customer-phone')?.value);

    // Validate inputs
    if (!validateInput(name, 'default')) {
        showPOSError('Customer name is required');
        return;
    }

    if (email && !validateInput(email, 'email')) {
        showPOSError('Please enter a valid email address');
        return;
    }

    if (phone && !validateInput(phone, 'phone')) {
        showPOSError('Please enter a valid phone number');
        return;
    }

    posCustomer = { name, email, phone };
    closeCustomerModal();
    showPOSSuccess('Customer added successfully');
    updateCustomerDisplay();
    
    // Log audit event
    logAuditEvent('customer_added', { customerName: name });
}

// Update customer display
function updateCustomerDisplay() {
    const customerDisplay = document.getElementById('customer-display');
    if (customerDisplay && posCustomer) {
        customerDisplay.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span class="material-icons" style="font-size: 16px;">person</span>
                <span>${posCustomer.name}</span>
                <button onclick="removeCustomer()" style="color: #ef4444; font-size: 12px; background: none; border: none; cursor: pointer;">
                    Remove
                </button>
            </div>
        `;
    }
}

// Remove customer
function removeCustomer() {
    posCustomer = null;
    const customerDisplay = document.getElementById('customer-display');
    if (customerDisplay) {
        customerDisplay.innerHTML = '';
    }
}

// Show discount modal
function showDiscountModal() {
    const discountAmount = prompt('Enter discount amount (EGP):');
    if (discountAmount && !isNaN(discountAmount)) {
        posDiscount = parseFloat(discountAmount);
        updatePOSCartDisplay();
        showPOSSuccess(`Discount of EGP ${posDiscount} applied`);
    }
}

// Show payment modal
function showPaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Close payment modal
function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        console.log('✅ Payment modal closed');
    } else {
        console.error('❌ Payment modal not found');
    }
}

// Toggle payment fields
function togglePaymentFields() {
    const paymentMethod = document.getElementById('payment-method')?.value;
    const cashFields = document.getElementById('cash-fields');
    const cardFields = document.getElementById('card-fields');

    if (cashFields && cardFields) {
        if (paymentMethod === 'cash') {
            cashFields.classList.remove('hidden');
            cardFields.classList.add('hidden');
        } else if (paymentMethod === 'card') {
            cashFields.classList.add('hidden');
            cardFields.classList.remove('hidden');
        }
    }
}

// Process payment
async function processPayment() {
    try {
        const paymentMethod = document.getElementById('payment-method')?.value;
        const subtotal = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * posTaxRate;
        const total = subtotal + tax - posDiscount;

        // Validate payment
        if (paymentMethod === 'cash') {
            const cashAmount = parseFloat(document.getElementById('cash-amount')?.value || 0);
            if (cashAmount < total) {
                showPOSError('Insufficient cash amount');
                return;
            }
        } else if (paymentMethod === 'card') {
            const cardNumber = document.getElementById('card-number')?.value;
            const cardExpiry = document.getElementById('card-expiry')?.value;
            const cardCvv = document.getElementById('card-cvv')?.value;

            if (!cardNumber || !cardExpiry || !cardCvv) {
                showPOSError('Please fill in all card details');
                return;
            }
        }

        // Process the sale
        await createPOSSale({
            items: posCart,
            customer: posCustomer,
            subtotal,
            tax,
            discount: posDiscount,
            total,
            paymentMethod,
            timestamp: new Date(),
            businessId: posBusinessId
        });

        showReceiptModal();
        closePaymentModal();
        
    } catch (error) {
        console.error('❌ Payment processing failed:', error);
        showPOSError('Payment processing failed');
    }
}

// Create sale record
async function createPOSSale(saleData) {
    try {
        const { db, collection, addDoc, updateDoc, doc } = firebaseInstance;
        
        // Create sale record
        const saleRef = await addDoc(collection(db, 'businesses', posBusinessId, 'sales'), saleData);
        
        // Update product stock
        for (const item of posCart) {
            const productRef = doc(db, 'businesses', posBusinessId, 'products', item.id);
            await updateDoc(productRef, {
                stock: item.stock - item.quantity
            });
        }

        console.log('✅ Sale created successfully:', saleRef.id);
        return saleRef.id;
        
    } catch (error) {
        console.error('❌ Failed to create sale:', error);
        throw error;
    }
}

// Show receipt modal
function showReceiptModal() {
    const modal = document.getElementById('receipt-modal');
    if (modal) {
        generateReceipt();
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        console.log('✅ Receipt modal shown');
    } else {
        console.error('❌ Receipt modal not found');
    }
}

// Close receipt modal
function closeReceiptModal() {
    const modal = document.getElementById('receipt-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        console.log('✅ Receipt modal closed');
    }
    clearPOSCart();
}

// Generate receipt
function generateReceipt() {
    const subtotal = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * posTaxRate;
    const total = subtotal + tax - posDiscount;

    const receiptHTML = `
        <div class="receipt-header">
            <h2 style="margin: 0; font-size: 18px;">MADAS POS</h2>
            <p style="margin: 4px 0; font-size: 12px; color: #6b7280;">Receipt #${Date.now().toString().slice(-6)}</p>
            <p style="margin: 4px 0; font-size: 12px; color: #6b7280;">${new Date().toLocaleString()}</p>
        </div>

        ${posCustomer ? `
            <div style="margin-bottom: 16px; padding: 8px; background: #f3f4f6; border-radius: 4px;">
                <strong>Customer:</strong> ${posCustomer.name}
                ${posCustomer.email ? `<br><strong>Email:</strong> ${posCustomer.email}` : ''}
                ${posCustomer.phone ? `<br><strong>Phone:</strong> ${posCustomer.phone}` : ''}
            </div>
        ` : ''}

        <div class="receipt-items">
            ${posCart.map(item => `
                <div class="receipt-item">
                    <span>${item.name} x${item.quantity}</span>
                    <span>EGP ${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            `).join('')}
        </div>

        <div class="receipt-total">
            <div class="receipt-item">
                <span>Subtotal:</span>
                <span>EGP ${subtotal.toFixed(2)}</span>
            </div>
            <div class="receipt-item">
                <span>Tax (${(posTaxRate * 100)}%):</span>
                <span>EGP ${tax.toFixed(2)}</span>
            </div>
            ${posDiscount > 0 ? `
                <div class="receipt-item" style="color: #10b981;">
                    <span>Discount:</span>
                    <span>-EGP ${posDiscount.toFixed(2)}</span>
                </div>
            ` : ''}
            <div class="receipt-item" style="font-weight: bold; font-size: 16px; border-top: 1px solid #d1d5db; padding-top: 8px; margin-top: 8px;">
                <span>Total:</span>
                <span>EGP ${total.toFixed(2)}</span>
            </div>
        </div>

        <div class="receipt-footer">
            <p>Thank you for your business!</p>
        </div>
    `;

    const receiptContent = document.getElementById('receipt-content');
    if (receiptContent) {
        receiptContent.innerHTML = receiptHTML;
    }
}

// Print receipt
function printReceipt() {
    const receiptContent = document.getElementById('receipt-content')?.innerHTML;
    if (!receiptContent) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Receipt</title>
                <style>
                    body { font-family: 'Courier New', monospace; margin: 0; padding: 20px; }
                    .receipt-content { max-width: 300px; margin: 0 auto; }
                </style>
            </head>
            <body>
                ${receiptContent}
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Email receipt
function emailReceipt() {
    if (!posCustomer?.email) {
        showPOSError('Customer email is required to send receipt');
        return;
    }

    showPOSSuccess('Receipt sent to customer email');
}
// Make functions globally accessible for HTML onclick handlers
window.closeReceiptModal = closeReceiptModal;
window.closeCustomerModal = closeCustomerModal;
window.closePaymentModal = closePaymentModal;
window.saveCustomer = saveCustomer;
window.togglePaymentFields = togglePaymentFields;
window.processPayment = processPayment;
window.printReceipt = printReceipt;
window.emailReceipt = emailReceipt;
window.closeScannerModal = closeScannerModal;
window.switchCamera = switchCamera;

// Add click-outside-to-close functionality
document.addEventListener('click', function(event) {
    // Close receipt modal if clicking outside
    const receiptModal = document.getElementById('receipt-modal');
    if (receiptModal && !receiptModal.classList.contains('hidden')) {
        if (event.target === receiptModal) {
            closeReceiptModal();
        }
    }
    
    // Close payment modal if clicking outside
    const paymentModal = document.getElementById('payment-modal');
    if (paymentModal && !paymentModal.classList.contains('hidden')) {
        if (event.target === paymentModal) {
            closePaymentModal();
        }
    }
});

// Initialize POS when page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🛒 Initializing POS system...');
        
        // Initialize Firebase
        await initializeFirebase();
        
        // Initialize POS system
        await initializePOS();
        
        console.log('✅ POS system initialized');
    } catch (error) {
        console.error('❌ POS initialization failed:', error);
        
        // If authentication failed, show a user-friendly message
        if (error.message.includes('User not authenticated') || error.message.includes('No business context')) {
            showPOSError('Please log in to access the POS system. Redirecting to login...');
            setTimeout(() => {
                window.location.href = '/dashboard/login.html';
            }, 2000);
        } else {
            showPOSError('Failed to initialize POS system');
        }
    }
});
