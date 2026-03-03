// XDIGIX API Client
class XdigixClient {
    constructor(config) {
        this.tenantId = config.tenantId;
        this.apiToken = config.apiToken;
        this.baseUrl = config.baseUrl;
        this.webhookUrl = config.webhookUrl;
        this.webhookSecret = config.webhookSecret;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'X-Madas-Api-Token': this.apiToken,
            'Content-Type': 'application/json',
            ...options.headers
        };

        console.log(`Making API request to: ${url}`);
        console.log('Headers:', { 'X-Madas-Api-Token': this.apiToken ? this.apiToken.substring(0, 10) + '...' : 'MISSING' });

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            console.log(`Response status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
                }
                console.error('API Error Response:', errorData);
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('API Success:', data);
            return data;
        } catch (error) {
            console.error('API Request Failed:', {
                url,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    async getProducts(limit = 100) {
        return this.request(`/products?limit=${limit}`);
    }

    async getProduct(productId) {
        return this.request(`/products/${productId}`);
    }

    async sendWebhook(eventType, data) {
        if (!this.webhookSecret) {
            console.warn('Webhook secret not configured');
            return;
        }

        const payload = {
            type: eventType,
            id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            occurredAt: new Date().toISOString(),
            data: data
        };

        const body = JSON.stringify(payload);
        const signature = await this.signWebhook(body);

        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Madas-Event': eventType,
                    'X-Madas-Signature': signature
                },
                body: body
            });

            const result = await response.json();
            console.log('Webhook sent:', result);
            return result;
        } catch (error) {
            console.error('Webhook error:', error);
            throw error;
        }
    }

    async signWebhook(body) {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(this.webhookSecret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
        const hex = Array.from(new Uint8Array(signature))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        return `sha256=${hex}`;
    }
}

// Application State
const app = {
    client: null,
    products: [],
    cart: JSON.parse(localStorage.getItem('addict_cart') || '[]'),
    filteredProducts: []
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Addict website...');
    console.log('XDIGIX Config:', {
        tenantId: XDIGIX_CONFIG.tenantId,
        baseUrl: XDIGIX_CONFIG.baseUrl,
        hasApiToken: !!XDIGIX_CONFIG.apiToken && XDIGIX_CONFIG.apiToken !== 'YOUR_API_TOKEN_HERE',
        hasWebhookSecret: !!XDIGIX_CONFIG.webhookSecret
    });

    // Check configuration
    if (!XDIGIX_CONFIG.apiToken || XDIGIX_CONFIG.apiToken === 'YOUR_API_TOKEN_HERE') {
        console.error('⚠️ API Token not configured!');
        const apiTokenNotice = document.getElementById('apiTokenNotice');
        if (apiTokenNotice) {
            apiTokenNotice.style.display = 'block';
        }
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.style.display = 'block';
            const errorText = errorMessage.querySelector('p');
            if (errorText) {
                errorText.innerHTML = '⚠️ <strong>API Token Required</strong><br>Please add your API token in index.html (line 208)<br>Get it from: XDIGIX Dashboard → E-commerce → External Website';
            }
        }
    }

    // Initialize XDIGIX client
    app.client = new XdigixClient(XDIGIX_CONFIG);

    // Load products
    loadProducts();

    // Setup event listeners
    setupEventListeners();

    // Update cart count
    updateCartCount();
});

// Load Products from XDIGIX
async function loadProducts() {
    const loadingEl = document.getElementById('loading');
    const productsGrid = document.getElementById('productsGrid');
    const errorMessage = document.getElementById('errorMessage');

    try {
        loadingEl.style.display = 'block';
        errorMessage.style.display = 'none';

        // Check if API token is configured
        if (!app.client.apiToken || app.client.apiToken === 'YOUR_API_TOKEN_HERE') {
            throw new Error('API Token not configured. Please add your API token in index.html');
        }

        console.log('Loading products from:', app.client.baseUrl);
        console.log('Using API token:', app.client.apiToken.substring(0, 10) + '...');

        const response = await app.client.getProducts(100);
        
        console.log('API Response:', response);

        if (response.success && response.products) {
            app.products = response.products;
            app.filteredProducts = app.products;
            console.log(`Loaded ${app.products.length} products`);
            renderProducts();
        } else {
            throw new Error(response.message || 'No products found in response');
        }
    } catch (error) {
        console.error('Failed to load products:', error);
        loadingEl.style.display = 'none';
        errorMessage.style.display = 'block';
        
        // Show detailed error message
        const errorText = errorMessage.querySelector('p');
        if (errorText) {
            let errorMsg = error.message || 'Failed to load products. Please try again later.';
            
            if (error.message.includes('API Token')) {
                errorMsg = '⚠️ API Token not configured. Please add your API token in index.html (line 208)';
            } else if (error.message.includes('401') || error.message.includes('Invalid')) {
                errorMsg = '❌ Invalid API Token. Please check your API token in XDIGIX Dashboard → External Website';
            } else if (error.message.includes('404')) {
                errorMsg = '❌ Integration not enabled. Please enable it in XDIGIX Dashboard → External Website';
            } else if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
                errorMsg = '❌ Network error. Check your internet connection and try again.';
            }
            
            errorText.textContent = errorMsg;
        }
    } finally {
        loadingEl.style.display = 'none';
    }
}

// Render Products
function renderProducts() {
    const productsGrid = document.getElementById('productsGrid');
    
    if (app.filteredProducts.length === 0) {
        productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 3rem;">No products found</p>';
        return;
    }

    productsGrid.innerHTML = app.filteredProducts.map(product => {
        const imageUrl = product.imageUrl || product.images?.[0] || '';
        const price = product.sellingPrice || product.price || 0;
        const category = product.category || 'uncategorized';
        const stock = product.stock || {};
        const hasStock = Object.values(stock).some(qty => qty > 0);

        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image">
                    ${imageUrl 
                        ? `<img src="${imageUrl}" alt="${product.name}" onerror="this.parentElement.innerHTML='<span class=\\'material-icons\\'>image</span>'">`
                        : '<span class="material-icons">image</span>'
                    }
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name || 'Unnamed Product'}</h3>
                    <p class="product-category">${category}</p>
                    <p class="product-price">$${price.toFixed(2)}</p>
                    <div class="product-actions">
                        <button class="btn-view" onclick="viewProduct('${product.id}')">View</button>
                        <button class="btn-add-cart" onclick="addToCart('${product.id}')" ${!hasStock ? 'disabled' : ''}>
                            ${hasStock ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// View Product Details
async function viewProduct(productId) {
    const modal = document.getElementById('productModal');
    const modalBody = document.getElementById('productModalBody');

    try {
        const response = await app.client.getProduct(productId);
        
        if (response.success && response.product) {
            const product = response.product;
            const imageUrl = product.imageUrl || product.images?.[0] || '';
            const price = product.sellingPrice || product.price || 0;
            const stock = product.stock || {};
            const hasStock = Object.values(stock).some(qty => qty > 0);

            modalBody.innerHTML = `
                <div class="product-detail">
                    <div class="product-detail-image">
                        ${imageUrl 
                            ? `<img src="${imageUrl}" alt="${product.name}" onerror="this.parentElement.innerHTML='<span class=\\'material-icons\\'>image</span>'">`
                            : '<span class="material-icons">image</span>'
                        }
                    </div>
                    <div class="product-detail-info">
                        <h2>${product.name || 'Unnamed Product'}</h2>
                        <p class="product-detail-price">$${price.toFixed(2)}</p>
                        <p class="product-detail-description">${product.description || 'No description available.'}</p>
                        ${Object.keys(stock).length > 0 ? `
                            <div style="margin-bottom: 1rem;">
                                <strong>Stock:</strong>
                                ${Object.entries(stock).map(([size, qty]) => 
                                    `<span style="margin-left: 1rem;">${size}: ${qty}</span>`
                                ).join('')}
                            </div>
                        ` : ''}
                        <button class="btn-primary" onclick="addToCart('${product.id}'); closeProductModal();" ${!hasStock ? 'disabled' : ''} style="width: 100%;">
                            ${hasStock ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                    </div>
                </div>
            `;

            modal.classList.add('active');
        }
    } catch (error) {
        console.error('Failed to load product:', error);
        alert('Failed to load product details');
    }
}

// Add to Cart
function addToCart(productId) {
    const product = app.products.find(p => p.id === productId);
    
    if (!product) {
        alert('Product not found');
        return;
    }

    const existingItem = app.cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        app.cart.push({
            id: product.id,
            name: product.name,
            price: product.sellingPrice || product.price || 0,
            image: product.imageUrl || product.images?.[0] || '',
            quantity: 1
        });
    }

    saveCart();
    updateCartCount();
    renderCart();
    
    // Show feedback
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = 'Added!';
    btn.disabled = true;
    setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
    }, 1000);
}

// Remove from Cart
function removeFromCart(productId) {
    app.cart = app.cart.filter(item => item.id !== productId);
    saveCart();
    updateCartCount();
    renderCart();
}

// Save Cart
function saveCart() {
    localStorage.setItem('addict_cart', JSON.stringify(app.cart));
}

// Update Cart Count
function updateCartCount() {
    const count = app.cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
}

// Render Cart
function renderCart() {
    const cartItems = document.getElementById('cartItems');
    const cartSummary = document.getElementById('cartSummary');
    const cartTotal = document.getElementById('cartTotal');

    if (app.cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
        cartSummary.style.display = 'none';
        return;
    }

    cartItems.innerHTML = app.cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-image">
                ${item.image 
                    ? `<img src="${item.image}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`
                    : '<span class="material-icons">image</span>'
                }
            </div>
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">$${item.price.toFixed(2)} x ${item.quantity}</div>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">
                <span class="material-icons">delete</span>
            </button>
        </div>
    `).join('');

    const total = app.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = `$${total.toFixed(2)}`;
    cartSummary.style.display = 'block';
}

// Checkout
async function checkout() {
    if (app.cart.length === 0) {
        alert('Your cart is empty');
        return;
    }

    // Create order data
    const orderData = {
        orderId: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending',
        items: app.cart.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.price
        })),
        total: app.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        subtotal: app.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        shipping: 0,
        tax: 0
    };

    try {
        // Send order to XDIGIX via webhook
        await app.client.sendWebhook('order.created', orderData);
        
        alert('Order placed successfully! We will contact you soon.');
        
        // Clear cart
        app.cart = [];
        saveCart();
        updateCartCount();
        renderCart();
        closeCart();
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Failed to place order. Please try again.');
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Cart modal
    document.getElementById('cartBtn').addEventListener('click', () => {
        renderCart();
        document.getElementById('cartModal').classList.add('active');
    });

    document.getElementById('closeCart').addEventListener('click', closeCart);

    // Product modal
    document.getElementById('closeProductModal').addEventListener('click', closeProductModal);

    // Close modals on outside click
    document.getElementById('cartModal').addEventListener('click', (e) => {
        if (e.target.id === 'cartModal') {
            closeCart();
        }
    });

    document.getElementById('productModal').addEventListener('click', (e) => {
        if (e.target.id === 'productModal') {
            closeProductModal();
        }
    });

    // Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const category = btn.dataset.category;
            if (category === 'all') {
                app.filteredProducts = app.products;
            } else {
                app.filteredProducts = app.products.filter(p => 
                    (p.category || 'uncategorized').toLowerCase() === category
                );
            }
            renderProducts();
        });
    });

    // Checkout button
    document.getElementById('checkoutBtn').addEventListener('click', checkout);

    // Contact form
    document.getElementById('contactForm').addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Thank you for your message! We will get back to you soon.');
        e.target.reset();
    });

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Close Modals
function closeCart() {
    document.getElementById('cartModal').classList.remove('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

// Make functions globally available
window.viewProduct = viewProduct;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.closeProductModal = closeProductModal;

