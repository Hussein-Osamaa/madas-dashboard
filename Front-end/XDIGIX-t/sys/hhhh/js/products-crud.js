/**
 * Products CRUD Operations
 * Firebase Firestore operations for products management
 * Version: 1.0.0
 */

import {
    getFirestore,
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

import {
    showLoading,
    hideLoading,
    showSuccess,
    showError,
    validateProductData,
    base64ToBlob,
    compressImage
} from './products-utilities.js';

// ============================================
// CREATE OPERATIONS
// ============================================

/**
 * Create a new product
 * @param {Object} productData - Product data
 * @param {Object} auth - Firebase auth instance
 * @returns {Promise<string>} Document ID
 */
export async function createProduct(productData, auth) {
    try {
        showLoading('Creating product...');

        const db = getFirestore();
        const user = auth.currentUser;

        if (!user) {
            throw new Error('Please sign in to add products');
        }

        // Validate data
        validateProductData(productData);

        // Upload images to Firebase Storage first
        const imageUrls = await uploadProductImages(productData.images, user.uid);

        // Sanitize and prepare data
        const cleanData = {
            name: productData.name.trim(),
            description: productData.description?.trim() || '',
            category: productData.category,
            price: parseFloat(productData.price),
            stock: productData.unlimitedStock ? -1 : parseInt(productData.stock),
            lowStockThreshold: parseInt(productData.lowStockThreshold) || 5,
            unlimitedStock: productData.unlimitedStock || false,
            sku: productData.sku || generateSKU(),
            barcode: productData.barcode || '',
            images: imageUrls,
            tags: productData.tags || [],
            userId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            status: 'active',
            inStock: productData.unlimitedStock || parseInt(productData.stock) > 0
        };

        // Add product to Firestore
        const docRef = await addDoc(collection(db, 'products'), cleanData);

        showSuccess('Product created successfully!');
        return docRef.id;

    } catch (error) {
        showError(`Failed to create product: ${error.message}`);
        console.error('Create product error:', error);
        throw error;
    } finally {
        hideLoading();
    }
}

/**
 * Upload product images to Firebase Storage
 * @param {Array} images - Array of image objects {src: base64, name: string}
 * @param {string} userId - User ID
 * @returns {Promise<Array<string>>} Array of download URLs
 */
async function uploadProductImages(images, userId) {
    if (!images || images.length === 0) {
        return [];
    }

    const storage = getStorage();
    const imageUrls = [];

    for (const image of images) {
        try {
            // Convert base64 to blob
            const blob = await base64ToBlob(image.src);

            // Create unique filename
            const timestamp = Date.now();
            const sanitizedName = image.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const filename = `products/${userId}/${timestamp}_${sanitizedName}`;
            const storageRef = ref(storage, filename);

            // Upload
            console.log(`📤 Uploading image: ${filename}`);
            await uploadBytes(storageRef, blob);

            // Get URL
            const url = await getDownloadURL(storageRef);
            imageUrls.push(url);
            console.log(`✅ Image uploaded: ${url}`);

        } catch (error) {
            console.error('Failed to upload image:', image.name, error);
            // Continue with other images even if one fails
        }
    }

    return imageUrls;
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Load all products for current user
 * @param {Object} auth - Firebase auth instance
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Array of products
 */
export async function loadProducts(auth, filters = {}) {
    try {
        showLoading('Loading products...');

        const db = getFirestore();
        const user = auth.currentUser;

        if (!user) {
            showError('Please sign in to view products');
            return [];
        }

        // Build query
        let q = query(
            collection(db, 'products'),
            where('userId', '==', user.uid),
            where('status', '!=', 'deleted')
        );

        // Apply filters
        if (filters.category) {
            q = query(q, where('category', '==', filters.category));
        }

        if (filters.inStock !== undefined) {
            q = query(q, where('inStock', '==', filters.inStock));
        }

        // Always order by createdAt
        q = query(q, orderBy('status'), orderBy('createdAt', 'desc'));

        // Apply pagination
        if (filters.limit) {
            q = query(q, limit(filters.limit));
        }

        if (filters.startAfter) {
            q = query(q, startAfter(filters.startAfter));
        }

        const querySnapshot = await getDocs(q);
        const products = [];

        querySnapshot.forEach((doc) => {
            products.push({
                id: doc.id,
                ...doc.data(),
                // Convert Firestore timestamp to Date
                createdAt: doc.data().createdAt?.toDate(),
                updatedAt: doc.data().updatedAt?.toDate()
            });
        });

        console.log(`✅ Loaded ${products.length} products`);
        return products;

    } catch (error) {
        showError(`Failed to load products: ${error.message}`);
        console.error('Load products error:', error);
        return [];
    } finally {
        hideLoading();
    }
}

/**
 * Get single product by ID
 * @param {string} productId - Product ID
 * @param {Object} auth - Firebase auth instance
 * @returns {Promise<Object|null>} Product data or null
 */
export async function getProduct(productId, auth) {
    try {
        const db = getFirestore();
        const user = auth.currentUser;

        if (!user) {
            throw new Error('Please sign in');
        }

        const docRef = doc(db, 'products', productId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            // Verify user owns this product
            if (data.userId !== user.uid) {
                throw new Error('Unauthorized access');
            }

            return {
                id: docSnap.id,
                ...data,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate()
            };
        } else {
            throw new Error('Product not found');
        }

    } catch (error) {
        showError(`Failed to load product: ${error.message}`);
        console.error('Get product error:', error);
        return null;
    }
}

// ============================================
// UPDATE OPERATIONS
// ============================================

/**
 * Update existing product
 * @param {string} productId - Product ID
 * @param {Object} updates - Fields to update
 * @param {Object} auth - Firebase auth instance
 * @returns {Promise<boolean>} Success status
 */
export async function updateProduct(productId, updates, auth) {
    try {
        showLoading('Updating product...');

        const db = getFirestore();
        const user = auth.currentUser;

        if (!user) {
            throw new Error('Please sign in');
        }

        // Get existing product to verify ownership
        const existingProduct = await getProduct(productId, auth);
        if (!existingProduct) {
            throw new Error('Product not found');
        }

        // Handle image uploads if new images provided
        if (updates.images && Array.isArray(updates.images)) {
            const imageUrls = await uploadProductImages(updates.images, user.uid);
            updates.images = imageUrls;
        }

        // Prepare update data
        const updateData = {
            ...updates,
            updatedAt: serverTimestamp()
        };

        // Update stock status if stock changed
        if ('stock' in updates) {
            updateData.inStock = updates.unlimitedStock || parseInt(updates.stock) > 0;
        }

        // Update document
        const productRef = doc(db, 'products', productId);
        await updateDoc(productRef, updateData);

        showSuccess('Product updated successfully!');
        return true;

    } catch (error) {
        showError(`Failed to update product: ${error.message}`);
        console.error('Update product error:', error);
        return false;
    } finally {
        hideLoading();
    }
}

/**
 * Update product stock
 * @param {string} productId - Product ID
 * @param {number} newStock - New stock quantity
 * @param {Object} auth - Firebase auth instance
 * @returns {Promise<boolean>} Success status
 */
export async function updateProductStock(productId, newStock, auth) {
    try {
        const db = getFirestore();
        const productRef = doc(db, 'products', productId);

        await updateDoc(productRef, {
            stock: parseInt(newStock),
            inStock: parseInt(newStock) > 0,
            updatedAt: serverTimestamp()
        });

        showSuccess('Stock updated successfully!');
        return true;

    } catch (error) {
        showError(`Failed to update stock: ${error.message}`);
        console.error('Update stock error:', error);
        return false;
    }
}

// ============================================
// DELETE OPERATIONS
// ============================================

/**
 * Delete product (soft delete)
 * @param {string} productId - Product ID
 * @param {Object} auth - Firebase auth instance
 * @returns {Promise<boolean>} Success status
 */
export async function deleteProduct(productId, auth) {
    try {
        showLoading('Deleting product...');

        const db = getFirestore();
        const user = auth.currentUser;

        if (!user) {
            throw new Error('Please sign in');
        }

        // Verify ownership
        const existingProduct = await getProduct(productId, auth);
        if (!existingProduct) {
            throw new Error('Product not found');
        }

        // Soft delete (mark as deleted instead of removing)
        const productRef = doc(db, 'products', productId);
        await updateDoc(productRef, {
            status: 'deleted',
            deletedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        showSuccess('Product deleted successfully!');
        return true;

    } catch (error) {
        showError(`Failed to delete product: ${error.message}`);
        console.error('Delete product error:', error);
        return false;
    } finally {
        hideLoading();
    }
}

/**
 * Permanently delete product
 * @param {string} productId - Product ID
 * @param {Object} auth - Firebase auth instance
 * @returns {Promise<boolean>} Success status
 */
export async function permanentlyDeleteProduct(productId, auth) {
    if (!confirm('This will permanently delete the product and cannot be undone. Continue?')) {
        return false;
    }

    try {
        showLoading('Permanently deleting product...');

        const db = getFirestore();
        const user = auth.currentUser;

        if (!user) {
            throw new Error('Please sign in');
        }

        // Get product to delete images
        const existingProduct = await getProduct(productId, auth);
        if (!existingProduct) {
            throw new Error('Product not found');
        }

        // Delete images from storage
        if (existingProduct.images && existingProduct.images.length > 0) {
            await deleteProductImages(existingProduct.images);
        }

        // Delete document
        await deleteDoc(doc(db, 'products', productId));

        showSuccess('Product permanently deleted!');
        return true;

    } catch (error) {
        showError(`Failed to delete product: ${error.message}`);
        console.error('Permanently delete error:', error);
        return false;
    } finally {
        hideLoading();
    }
}

/**
 * Delete product images from storage
 * @param {Array<string>} imageUrls - Array of image URLs
 */
async function deleteProductImages(imageUrls) {
    const storage = getStorage();

    for (const url of imageUrls) {
        try {
            const imageRef = ref(storage, url);
            await deleteObject(imageRef);
            console.log(`🗑️ Deleted image: ${url}`);
        } catch (error) {
            console.warn('Failed to delete image:', url, error);
            // Continue with other images
        }
    }
}

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Bulk delete products
 * @param {Array<string>} productIds - Array of product IDs
 * @param {Object} auth - Firebase auth instance
 * @returns {Promise<Object>} {success: number, failed: number}
 */
export async function bulkDeleteProducts(productIds, auth) {
    if (!confirm(`Delete ${productIds.length} products? This cannot be undone.`)) {
        return { success: 0, failed: 0 };
    }

    showLoading(`Deleting ${productIds.length} products...`);

    let successCount = 0;
    let failedCount = 0;

    for (const productId of productIds) {
        try {
            await deleteProduct(productId, auth);
            successCount++;
        } catch (error) {
            console.error('Failed to delete product:', productId, error);
            failedCount++;
        }
    }

    hideLoading();

    if (successCount > 0) {
        showSuccess(`Deleted ${successCount} products successfully!`);
    }

    if (failedCount > 0) {
        showError(`Failed to delete ${failedCount} products`);
    }

    return { success: successCount, failed: failedCount };
}

/**
 * Bulk update products
 * @param {Array<string>} productIds - Array of product IDs
 * @param {Object} updates - Fields to update
 * @param {Object} auth - Firebase auth instance
 * @returns {Promise<Object>} {success: number, failed: number}
 */
export async function bulkUpdateProducts(productIds, updates, auth) {
    showLoading(`Updating ${productIds.length} products...`);

    let successCount = 0;
    let failedCount = 0;

    const db = getFirestore();

    for (const productId of productIds) {
        try {
            const productRef = doc(db, 'products', productId);
            await updateDoc(productRef, {
                ...updates,
                updatedAt: serverTimestamp()
            });
            successCount++;
        } catch (error) {
            console.error('Failed to update product:', productId, error);
            failedCount++;
        }
    }

    hideLoading();

    if (successCount > 0) {
        showSuccess(`Updated ${successCount} products successfully!`);
    }

    if (failedCount > 0) {
        showError(`Failed to update ${failedCount} products`);
    }

    return { success: successCount, failed: failedCount };
}

// ============================================
// IMPORT/EXPORT
// ============================================

/**
 * Import products from Excel data
 * @param {Array} excelData - Array of product objects from Excel
 * @param {Object} auth - Firebase auth instance
 * @returns {Promise<Object>} {success: number, failed: number, errors: Array}
 */
export async function importProductsFromExcel(excelData, auth) {
    showLoading(`Importing ${excelData.length} products...`);

    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    for (let i = 0; i < excelData.length; i++) {
        const row = excelData[i];

        try {
            // Map Excel columns to product fields
            const productData = {
                name: row['Product Name'] || row['name'],
                description: row['Description'] || row['description'] || '',
                category: row['Category'] || row['category'],
                price: parseFloat(row['Price'] || row['price']),
                stock: parseInt(row['Stock'] || row['stock']),
                sku: row['SKU'] || row['sku'] || '',
                barcode: row['Barcode'] || row['barcode'] || '',
                images: [],
                unlimitedStock: false
            };

            await createProduct(productData, auth);
            successCount++;

        } catch (error) {
            console.error(`Failed to import row ${i + 1}:`, row, error);
            failedCount++;
            errors.push({
                row: i + 1,
                data: row,
                error: error.message
            });
        }
    }

    hideLoading();

    if (successCount > 0) {
        showSuccess(`Imported ${successCount} products successfully!`);
    }

    if (failedCount > 0) {
        showError(`Failed to import ${failedCount} products`);
        console.table(errors);
    }

    return { success: successCount, failed: failedCount, errors };
}

/**
 * Export products to Excel format
 * @param {Array} products - Array of products
 * @returns {Array} Excel-formatted data
 */
export function formatProductsForExcel(products) {
    return products.map(p => ({
        'Product Name': p.name,
        'Description': p.description,
        'Category': p.category,
        'Price': p.price,
        'Stock': p.unlimitedStock ? 'Unlimited' : p.stock,
        'SKU': p.sku,
        'Barcode': p.barcode,
        'Status': p.inStock ? 'In Stock' : 'Out of Stock',
        'Created': p.createdAt ? p.createdAt.toLocaleDateString() : '',
        'Updated': p.updatedAt ? p.updatedAt.toLocaleDateString() : ''
    }));
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate SKU code
 * @returns {string} SKU code
 */
function generateSKU() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `SKU-${timestamp}-${random}`;
}

/**
 * Calculate product statistics
 * @param {Array} products - Array of products
 * @returns {Object} Statistics
 */
export function calculateProductStats(products) {
    const total = products.length;
    const inStock = products.filter(p => p.inStock).length;
    const outOfStock = products.filter(p => !p.inStock).length;
    const lowStock = products.filter(p =>
        !p.unlimitedStock &&
        p.stock > 0 &&
        p.stock <= (p.lowStockThreshold || 5)
    ).length;

    const totalValue = products.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0);

    const categories = [...new Set(products.map(p => p.category))];
    const categoryBreakdown = categories.map(cat => ({
        category: cat,
        count: products.filter(p => p.category === cat).length
    }));

    return {
        total,
        inStock,
        outOfStock,
        lowStock,
        totalValue,
        categories: categoryBreakdown
    };
}

console.log('✅ Products CRUD module loaded');
