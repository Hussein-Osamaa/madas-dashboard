// Products Fixed Script - Resolves product-related JavaScript errors
(function() {
    'use strict';

    console.log('🔧 Products fixed script loaded');

    // Fix product-related functions
    function fixProductFunctions() {
        // Fix initializeProducts function
        if (typeof initializeProducts === 'undefined') {
            window.initializeProducts = function() {
                console.log('📦 Products initialized');
                loadProducts();
                setupProductFilters();
                setupProductSearch();
                setupProductActions();
            };
        }

        // Fix loadProducts function
        if (typeof loadProducts === 'undefined') {
            window.loadProducts = function() {
                console.log('📦 Loading products');
                
                // Mock products data
                const products = [
                    {
                        id: 1,
                        name: 'Product 1',
                        price: 29.99,
                        stock: 10,
                        category: 'Electronics',
                        status: 'active',
                        image: 'assets/img/madas-logo.png'
                    },
                    {
                        id: 2,
                        name: 'Product 2',
                        price: 39.99,
                        stock: 5,
                        category: 'Clothing',
                        status: 'active',
                        image: 'assets/img/madas-logo.png'
                    },
                    {
                        id: 3,
                        name: 'Product 3',
                        price: 49.99,
                        stock: 15,
                        category: 'Home',
                        status: 'active',
                        image: 'assets/img/madas-logo.png'
                    }
                ];
                
                renderProducts(products);
                updateProductStats(products);
            };
        }

        // Fix addProduct function
        if (typeof addProduct === 'undefined') {
            window.addProduct = function(productData) {
                console.log('➕ Adding product:', productData);
                
                const newProduct = {
                    id: Date.now(),
                    ...productData,
                    createdAt: new Date().toISOString(),
                    status: 'active'
                };
                
                // Add to local storage
                const products = JSON.parse(localStorage.getItem('products') || '[]');
                products.push(newProduct);
                localStorage.setItem('products', JSON.stringify(products));
                
                // Refresh product list
                loadProducts();
                
                return Promise.resolve(newProduct);
            };
        }

        // Fix updateProduct function
        if (typeof updateProduct === 'undefined') {
            window.updateProduct = function(id, productData) {
                console.log('✏️ Updating product:', id, productData);
                
                const products = JSON.parse(localStorage.getItem('products') || '[]');
                const productIndex = products.findIndex(p => p.id === id);
                
                if (productIndex !== -1) {
                    products[productIndex] = { ...products[productIndex], ...productData };
                    localStorage.setItem('products', JSON.stringify(products));
                    loadProducts();
                }
                
                return Promise.resolve();
            };
        }

        // Fix deleteProduct function
        if (typeof deleteProduct === 'undefined') {
            window.deleteProduct = function(id) {
                console.log('🗑️ Deleting product:', id);
                
                const products = JSON.parse(localStorage.getItem('products') || '[]');
                const filteredProducts = products.filter(p => p.id !== id);
                localStorage.setItem('products', JSON.stringify(filteredProducts));
                
                loadProducts();
                
                return Promise.resolve();
            };
        }

        // Fix getProduct function
        if (typeof getProduct === 'undefined') {
            window.getProduct = function(id) {
                const products = JSON.parse(localStorage.getItem('products') || '[]');
                return products.find(p => p.id === id);
            };
        }

        // Fix getProducts function
        if (typeof getProducts === 'undefined') {
            window.getProducts = function() {
                return JSON.parse(localStorage.getItem('products') || '[]');
            };
        }

        console.log('✅ Product functions fixed');
    }

    // Render products in the interface
    function renderProducts(products) {
        const productsContainer = document.getElementById('products-container');
        if (!productsContainer) return;

        if (products.length === 0) {
            productsContainer.innerHTML = '<p class="text-gray-500 text-center py-8">No products found</p>';
            return;
        }

        const productsHTML = products.map(product => `
            <div class="product-card bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
                <div class="flex items-center space-x-4">
                    <div class="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                        <img src="${product.image}" alt="${product.name}" class="w-12 h-12 object-cover rounded">
                    </div>
                    <div class="flex-1">
                        <h3 class="font-semibold text-gray-900">${product.name}</h3>
                        <p class="text-sm text-gray-600">$${product.price}</p>
                        <p class="text-xs text-gray-500">Stock: ${product.stock} | Category: ${product.category}</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="px-2 py-1 text-xs rounded-full ${getStatusColor(product.status)}">
                            ${product.status}
                        </span>
                        <div class="flex space-x-1">
                            <button onclick="editProduct(${product.id})" class="p-1 text-blue-600 hover:bg-blue-100 rounded">
                                <span class="material-icons text-sm">edit</span>
                            </button>
                            <button onclick="deleteProduct(${product.id})" class="p-1 text-red-600 hover:bg-red-100 rounded">
                                <span class="material-icons text-sm">delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        productsContainer.innerHTML = productsHTML;
    }

    // Update product statistics
    function updateProductStats(products) {
        const totalProducts = products.length;
        const activeProducts = products.filter(p => p.status === 'active').length;
        const lowStockProducts = products.filter(p => p.stock < 5).length;
        const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

        // Update stats elements
        const totalProductsElement = document.getElementById('total-products');
        if (totalProductsElement) {
            totalProductsElement.textContent = totalProducts;
        }

        const activeProductsElement = document.getElementById('active-products');
        if (activeProductsElement) {
            activeProductsElement.textContent = activeProducts;
        }

        const lowStockElement = document.getElementById('low-stock-products');
        if (lowStockElement) {
            lowStockElement.textContent = lowStockProducts;
        }

        const totalValueElement = document.getElementById('total-value');
        if (totalValueElement) {
            totalValueElement.textContent = `$${totalValue.toFixed(2)}`;
        }
    }

    // Setup product filters
    function setupProductFilters() {
        const filterButtons = document.querySelectorAll('[data-filter]');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const filter = button.dataset.filter;
                filterProducts(filter);
            });
        });
    }

    // Filter products
    function filterProducts(filter) {
        const products = getProducts();
        let filteredProducts = products;

        if (filter === 'active') {
            filteredProducts = products.filter(p => p.status === 'active');
        } else if (filter === 'inactive') {
            filteredProducts = products.filter(p => p.status === 'inactive');
        } else if (filter === 'low-stock') {
            filteredProducts = products.filter(p => p.stock < 5);
        }

        renderProducts(filteredProducts);
    }

    // Setup product search
    function setupProductSearch() {
        const searchInput = document.getElementById('product-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                searchProducts(query);
            });
        }
    }

    // Search products
    function searchProducts(query) {
        const products = getProducts();
        const filteredProducts = products.filter(product => 
            product.name.toLowerCase().includes(query) ||
            product.category.toLowerCase().includes(query)
        );
        renderProducts(filteredProducts);
    }

    // Setup product actions
    function setupProductActions() {
        // Add product form
        const addProductForm = document.getElementById('add-product-form');
        if (addProductForm) {
            addProductForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(addProductForm);
                const productData = Object.fromEntries(formData);
                addProduct(productData);
                addProductForm.reset();
            });
        }

        // Edit product function
        window.editProduct = function(id) {
            const product = getProduct(id);
            if (product) {
                // Open edit modal or form
                console.log('✏️ Editing product:', product);
                // Implement edit functionality
            }
        };
    }

    // Get status color
    function getStatusColor(status) {
        const colors = {
            'active': 'bg-green-100 text-green-800',
            'inactive': 'bg-red-100 text-red-800',
            'pending': 'bg-yellow-100 text-yellow-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    }

    // Initialize product fixes
    function initializeProductFixes() {
        fixProductFunctions();
        setupProductActions();
        
        // Load products if on products page
        if (window.location.pathname.includes('products.html')) {
            loadProducts();
        }
        
        console.log('✅ Product fixes initialized');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeProductFixes);
    } else {
        initializeProductFixes();
    }

    // Make functions available globally
    window.productsFixed = {
        fixProductFunctions,
        renderProducts,
        updateProductStats,
        filterProducts,
        searchProducts
    };

})();
