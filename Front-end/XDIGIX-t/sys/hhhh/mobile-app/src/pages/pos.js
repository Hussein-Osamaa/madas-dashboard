/**
 * POS (Point of Sale) Page
 * Complete POS system for MADAS mobile app
 */

class POSPage {
    constructor(app) {
        this.app = app;
        this.cart = [];
        this.cartTotal = 0;
        this.taxRate = 0.08; // 8% tax rate
        this.discount = 0;
        this.customer = null;
        this.paymentMethod = null;
        this.isProcessing = false;
        
        this.elements = {};
        this.initializeElements();
    }

    initializeElements() {
        this.elements = {
            // Main containers
            posContainer: document.getElementById('pos-container'),
            productSearch: document.getElementById('product-search'),
            productGrid: document.getElementById('product-grid'),
            cartContainer: document.getElementById('cart-container'),
            cartItems: document.getElementById('cart-items'),
            cartTotal: document.getElementById('cart-total'),
            cartSubtotal: document.getElementById('cart-subtotal'),
            cartTax: document.getElementById('cart-tax'),
            cartDiscount: document.getElementById('cart-discount'),
            
            // Buttons
            scanBarcodeBtn: document.getElementById('scan-barcode-btn'),
            addCustomerBtn: document.getElementById('add-customer-btn'),
            applyDiscountBtn: document.getElementById('apply-discount-btn'),
            processPaymentBtn: document.getElementById('process-payment-btn'),
            clearCartBtn: document.getElementById('clear-cart-btn'),
            
            // Modals
            customerModal: document.getElementById('customer-modal'),
            paymentModal: document.getElementById('payment-modal'),
            receiptModal: document.getElementById('receipt-modal'),
            
            // Customer form
            customerName: document.getElementById('customer-name'),
            customerEmail: document.getElementById('customer-email'),
            customerPhone: document.getElementById('customer-phone'),
            
            // Payment form
            paymentMethodSelect: document.getElementById('payment-method'),
            cashAmount: document.getElementById('cash-amount'),
            cardNumber: document.getElementById('card-number'),
            cardExpiry: document.getElementById('card-expiry'),
            cardCvv: document.getElementById('card-cvv'),
            
            // Receipt
            receiptContent: document.getElementById('receipt-content'),
            printReceiptBtn: document.getElementById('print-receipt-btn'),
            emailReceiptBtn: document.getElementById('email-receipt-btn')
        };
    }

    async initialize() {
        try {
            console.log('🛒 Initializing POS system...');
            
            this.initializeEventListeners();
            await this.loadProducts();
            this.updateCartDisplay();
            
            console.log('✅ POS system initialized');
        } catch (error) {
            console.error('❌ POS initialization failed:', error);
            this.showError('Failed to initialize POS system');
        }
    }

    initializeEventListeners() {
        // Product search
        if (this.elements.productSearch) {
            this.elements.productSearch.addEventListener('input', (e) => {
                this.searchProducts(e.target.value);
            });
        }

        // Scan barcode button
        if (this.elements.scanBarcodeBtn) {
            this.elements.scanBarcodeBtn.addEventListener('click', () => {
                this.startBarcodeScan();
            });
        }

        // Customer management
        if (this.elements.addCustomerBtn) {
            this.elements.addCustomerBtn.addEventListener('click', () => {
                this.showCustomerModal();
            });
        }

        // Discount application
        if (this.elements.applyDiscountBtn) {
            this.elements.applyDiscountBtn.addEventListener('click', () => {
                this.showDiscountModal();
            });
        }

        // Payment processing
        if (this.elements.processPaymentBtn) {
            this.elements.processPaymentBtn.addEventListener('click', () => {
                this.showPaymentModal();
            });
        }

        // Clear cart
        if (this.elements.clearCartBtn) {
            this.elements.clearCartBtn.addEventListener('click', () => {
                this.clearCart();
            });
        }

        // Customer modal events
        this.initializeCustomerModal();
        
        // Payment modal events
        this.initializePaymentModal();
        
        // Receipt modal events
        this.initializeReceiptModal();
    }

    async loadProducts() {
        try {
            const apiService = this.app.getApiService();
            if (!apiService) {
                console.log('⏳ API service not ready, waiting...');
                setTimeout(() => this.loadProducts(), 1000);
                return;
            }

            const products = await apiService.fetchData('products', {}, { forceRefresh: true });
            this.products = products || [];
            this.renderProducts(this.products);
            
        } catch (error) {
            console.error('❌ Failed to load products:', error);
            this.showError('Failed to load products');
        }
    }

    renderProducts(products) {
        if (!this.elements.productGrid) return;

        if (products.length === 0) {
            this.elements.productGrid.innerHTML = `
                <div class="col-span-full flex items-center justify-center py-8">
                    <div class="text-center">
                        <span class="material-icons text-4xl text-gray-400 mb-4">inventory_2</span>
                        <p class="text-gray-500">No products found</p>
                    </div>
                </div>
            `;
            return;
        }

        this.elements.productGrid.innerHTML = products.map(product => `
            <div class="product-card bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow" 
                 data-product-id="${product.id}" onclick="window.mobileApp.pages.pos.addToCart('${product.id}')">
                <div class="flex items-center space-x-3">
                    <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span class="material-icons text-gray-500">inventory_2</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-medium text-gray-900 truncate">${product.name || 'Unnamed Product'}</h3>
                        <p class="text-sm text-gray-500">${product.category || 'No Category'}</p>
                        <p class="text-sm font-medium text-green-600">$${product.price || 0}</p>
                    </div>
                    <div class="text-right">
                        <span class="text-xs text-gray-500">Stock: ${product.stock || 0}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    searchProducts(query) {
        if (!query.trim()) {
            this.renderProducts(this.products);
            return;
        }

        const filteredProducts = this.products.filter(product => 
            product.name?.toLowerCase().includes(query.toLowerCase()) ||
            product.category?.toLowerCase().includes(query.toLowerCase()) ||
            product.barcode?.includes(query)
        );

        this.renderProducts(filteredProducts);
    }

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        // Check if product already in cart
        const existingItem = this.cart.find(item => item.id === productId);
        
        if (existingItem) {
            if (existingItem.quantity < (product.stock || 0)) {
                existingItem.quantity += 1;
            } else {
                this.showError('Insufficient stock');
                return;
            }
        } else {
            if ((product.stock || 0) > 0) {
                this.cart.push({
                    id: product.id,
                    name: product.name,
                    price: product.price || 0,
                    quantity: 1,
                    category: product.category,
                    stock: product.stock || 0
                });
            } else {
                this.showError('Product out of stock');
                return;
            }
        }

        this.updateCartDisplay();
        this.showSuccess(`${product.name} added to cart`);
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.updateCartDisplay();
    }

    updateCartQuantity(productId, quantity) {
        const item = this.cart.find(item => item.id === productId);
        if (!item) return;

        if (quantity <= 0) {
            this.removeFromCart(productId);
        } else if (quantity <= item.stock) {
            item.quantity = quantity;
            this.updateCartDisplay();
        } else {
            this.showError('Insufficient stock');
        }
    }

    updateCartDisplay() {
        if (!this.elements.cartItems) return;

        if (this.cart.length === 0) {
            this.elements.cartItems.innerHTML = `
                <div class="text-center py-8">
                    <span class="material-icons text-4xl text-gray-400 mb-4">shopping_cart</span>
                    <p class="text-gray-500">Cart is empty</p>
                </div>
            `;
            this.elements.cartTotal.textContent = '$0.00';
            this.elements.cartSubtotal.textContent = '$0.00';
            this.elements.cartTax.textContent = '$0.00';
            this.elements.cartDiscount.textContent = '$0.00';
            return;
        }

        // Render cart items
        this.elements.cartItems.innerHTML = this.cart.map(item => `
            <div class="cart-item flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                <div class="flex-1">
                    <h4 class="font-medium text-gray-900">${item.name}</h4>
                    <p class="text-sm text-gray-500">$${item.price} each</p>
                </div>
                <div class="flex items-center space-x-2">
                    <button class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center" 
                            onclick="window.mobileApp.pages.pos.updateCartQuantity('${item.id}', ${item.quantity - 1})">
                        <span class="material-icons text-sm">remove</span>
                    </button>
                    <span class="w-8 text-center font-medium">${item.quantity}</span>
                    <button class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center" 
                            onclick="window.mobileApp.pages.pos.updateCartQuantity('${item.id}', ${item.quantity + 1})">
                        <span class="material-icons text-sm">add</span>
                    </button>
                    <div class="text-right ml-4">
                        <p class="font-medium">$${(item.price * item.quantity).toFixed(2)}</p>
                        <button class="text-red-500 text-sm" onclick="window.mobileApp.pages.pos.removeFromCart('${item.id}')">
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Calculate totals
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * this.taxRate;
        const total = subtotal + tax - this.discount;

        this.elements.cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
        this.elements.cartTax.textContent = `$${tax.toFixed(2)}`;
        this.elements.cartDiscount.textContent = `$${this.discount.toFixed(2)}`;
        this.elements.cartTotal.textContent = `$${total.toFixed(2)}`;

        // Update payment button state
        if (this.elements.processPaymentBtn) {
            this.elements.processPaymentBtn.disabled = this.cart.length === 0;
        }
    }

    startBarcodeScan() {
        // Simulate barcode scanning
        const barcode = prompt('Enter barcode or scan:');
        if (!barcode) return;

        const product = this.products.find(p => p.barcode === barcode);
        if (product) {
            this.addToCart(product.id);
        } else {
            this.showError('Product not found');
        }
    }

    showCustomerModal() {
        if (this.elements.customerModal) {
            this.elements.customerModal.classList.remove('hidden');
        }
    }

    hideCustomerModal() {
        if (this.elements.customerModal) {
            this.elements.customerModal.classList.add('hidden');
        }
    }

    initializeCustomerModal() {
        // Customer modal event listeners
        const saveCustomerBtn = document.getElementById('save-customer-btn');
        const cancelCustomerBtn = document.getElementById('cancel-customer-btn');

        if (saveCustomerBtn) {
            saveCustomerBtn.addEventListener('click', () => {
                this.saveCustomer();
            });
        }

        if (cancelCustomerBtn) {
            cancelCustomerBtn.addEventListener('click', () => {
                this.hideCustomerModal();
            });
        }
    }

    saveCustomer() {
        const name = this.elements.customerName?.value;
        const email = this.elements.customerEmail?.value;
        const phone = this.elements.customerPhone?.value;

        if (!name) {
            this.showError('Customer name is required');
            return;
        }

        this.customer = { name, email, phone };
        this.hideCustomerModal();
        this.showSuccess('Customer added');
        this.updateCustomerDisplay();
    }

    updateCustomerDisplay() {
        const customerDisplay = document.getElementById('customer-display');
        if (customerDisplay && this.customer) {
            customerDisplay.innerHTML = `
                <div class="flex items-center space-x-2">
                    <span class="material-icons text-green-500">person</span>
                    <span class="text-sm font-medium">${this.customer.name}</span>
                    <button class="text-red-500 text-sm" onclick="window.mobileApp.pages.pos.removeCustomer()">
                        Remove
                    </button>
                </div>
            `;
        }
    }

    removeCustomer() {
        this.customer = null;
        const customerDisplay = document.getElementById('customer-display');
        if (customerDisplay) {
            customerDisplay.innerHTML = '';
        }
    }

    showDiscountModal() {
        const discountAmount = prompt('Enter discount amount ($):');
        if (discountAmount && !isNaN(discountAmount)) {
            this.discount = parseFloat(discountAmount);
            this.updateCartDisplay();
            this.showSuccess(`Discount of $${this.discount} applied`);
        }
    }

    showPaymentModal() {
        if (this.elements.paymentModal) {
            this.elements.paymentModal.classList.remove('hidden');
        }
    }

    hidePaymentModal() {
        if (this.elements.paymentModal) {
            this.elements.paymentModal.classList.add('hidden');
        }
    }

    initializePaymentModal() {
        const processPaymentBtn = document.getElementById('process-payment-btn-modal');
        const cancelPaymentBtn = document.getElementById('cancel-payment-btn');

        if (processPaymentBtn) {
            processPaymentBtn.addEventListener('click', () => {
                this.processPayment();
            });
        }

        if (cancelPaymentBtn) {
            cancelPaymentBtn.addEventListener('click', () => {
                this.hidePaymentModal();
            });
        }

        // Payment method change handler
        if (this.elements.paymentMethodSelect) {
            this.elements.paymentMethodSelect.addEventListener('change', (e) => {
                this.togglePaymentFields(e.target.value);
            });
        }
    }

    togglePaymentFields(method) {
        const cashFields = document.getElementById('cash-fields');
        const cardFields = document.getElementById('card-fields');

        if (cashFields && cardFields) {
            if (method === 'cash') {
                cashFields.classList.remove('hidden');
                cardFields.classList.add('hidden');
            } else if (method === 'card') {
                cashFields.classList.add('hidden');
                cardFields.classList.remove('hidden');
            }
        }
    }

    async processPayment() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        
        try {
            const paymentMethod = this.elements.paymentMethodSelect?.value;
            const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const tax = subtotal * this.taxRate;
            const total = subtotal + tax - this.discount;

            // Validate payment
            if (paymentMethod === 'cash') {
                const cashAmount = parseFloat(this.elements.cashAmount?.value || 0);
                if (cashAmount < total) {
                    this.showError('Insufficient cash amount');
                    return;
                }
            } else if (paymentMethod === 'card') {
                const cardNumber = this.elements.cardNumber?.value;
                const cardExpiry = this.elements.cardExpiry?.value;
                const cardCvv = this.elements.cardCvv?.value;

                if (!cardNumber || !cardExpiry || !cardCvv) {
                    this.showError('Please fill in all card details');
                    return;
                }
            }

            // Process the sale
            await this.createSale({
                items: this.cart,
                customer: this.customer,
                subtotal,
                tax,
                discount: this.discount,
                total,
                paymentMethod,
                timestamp: new Date()
            });

            this.showReceipt();
            this.hidePaymentModal();
            
        } catch (error) {
            console.error('❌ Payment processing failed:', error);
            this.showError('Payment processing failed');
        } finally {
            this.isProcessing = false;
        }
    }

    async createSale(saleData) {
        try {
            const apiService = this.app.getApiService();
            if (!apiService) {
                throw new Error('API service not available');
            }

            // Create sale record
            const sale = await apiService.createDocument('sales', saleData);
            
            // Update product stock
            for (const item of this.cart) {
                await apiService.updateDocument('products', item.id, {
                    stock: item.stock - item.quantity
                });
            }

            console.log('✅ Sale created successfully:', sale);
            return sale;
            
        } catch (error) {
            console.error('❌ Failed to create sale:', error);
            throw error;
        }
    }

    showReceipt() {
        if (this.elements.receiptModal) {
            this.generateReceipt();
            this.elements.receiptModal.classList.remove('hidden');
        }
    }

    hideReceipt() {
        if (this.elements.receiptModal) {
            this.elements.receiptModal.classList.add('hidden');
        }
    }

    generateReceipt() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * this.taxRate;
        const total = subtotal + tax - this.discount;

        const receiptHTML = `
            <div class="receipt-content bg-white p-6 max-w-sm mx-auto">
                <div class="text-center mb-6">
                    <h2 class="text-xl font-bold text-gray-900">MADAS POS</h2>
                    <p class="text-sm text-gray-500">Receipt #${Date.now().toString().slice(-6)}</p>
                    <p class="text-sm text-gray-500">${new Date().toLocaleString()}</p>
                </div>

                ${this.customer ? `
                    <div class="mb-4 p-3 bg-gray-50 rounded">
                        <h3 class="font-medium text-gray-900">Customer</h3>
                        <p class="text-sm text-gray-600">${this.customer.name}</p>
                        ${this.customer.email ? `<p class="text-sm text-gray-600">${this.customer.email}</p>` : ''}
                        ${this.customer.phone ? `<p class="text-sm text-gray-600">${this.customer.phone}</p>` : ''}
                    </div>
                ` : ''}

                <div class="mb-4">
                    <h3 class="font-medium text-gray-900 mb-2">Items</h3>
                    ${this.cart.map(item => `
                        <div class="flex justify-between text-sm mb-1">
                            <span>${item.name} x${item.quantity}</span>
                            <span>$${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="border-t pt-4">
                    <div class="flex justify-between text-sm mb-1">
                        <span>Subtotal:</span>
                        <span>$${subtotal.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between text-sm mb-1">
                        <span>Tax (${(this.taxRate * 100)}%):</span>
                        <span>$${tax.toFixed(2)}</span>
                    </div>
                    ${this.discount > 0 ? `
                        <div class="flex justify-between text-sm mb-1 text-green-600">
                            <span>Discount:</span>
                            <span>-$${this.discount.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div class="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total:</span>
                        <span>$${total.toFixed(2)}</span>
                    </div>
                </div>

                <div class="text-center mt-6">
                    <p class="text-sm text-gray-500">Thank you for your business!</p>
                </div>
            </div>
        `;

        if (this.elements.receiptContent) {
            this.elements.receiptContent.innerHTML = receiptHTML;
        }
    }

    initializeReceiptModal() {
        const printBtn = document.getElementById('print-receipt-btn');
        const emailBtn = document.getElementById('email-receipt-btn');
        const closeReceiptBtn = document.getElementById('close-receipt-btn');

        if (printBtn) {
            printBtn.addEventListener('click', () => {
                this.printReceipt();
            });
        }

        if (emailBtn) {
            emailBtn.addEventListener('click', () => {
                this.emailReceipt();
            });
        }

        if (closeReceiptBtn) {
            closeReceiptBtn.addEventListener('click', () => {
                this.hideReceipt();
                this.clearCart();
            });
        }
    }

    printReceipt() {
        const receiptContent = this.elements.receiptContent?.innerHTML;
        if (!receiptContent) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Receipt</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
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

    emailReceipt() {
        if (!this.customer?.email) {
            this.showError('Customer email is required to send receipt');
            return;
        }

        // Simulate email sending
        this.showSuccess('Receipt sent to customer email');
    }

    clearCart() {
        this.cart = [];
        this.discount = 0;
        this.customer = null;
        this.updateCartDisplay();
        this.updateCustomerDisplay();
    }

    showError(message) {
        // Simple error display - you can enhance this with a proper toast system
        alert(`Error: ${message}`);
    }

    showSuccess(message) {
        // Simple success display - you can enhance this with a proper toast system
        console.log(`Success: ${message}`);
    }

    // Public methods for external access
    getCart() {
        return this.cart;
    }

    getCartTotal() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * this.taxRate;
        return subtotal + tax - this.discount;
    }

    getCartItemCount() {
        return this.cart.reduce((sum, item) => sum + item.quantity, 0);
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = POSPage;
}
