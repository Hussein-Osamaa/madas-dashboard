/**
 * Pricing Page - Manage product pricing and sales
 */

import { useState, useEffect, useMemo } from 'react';
import { collection, db, doc, getDocs, writeBatch } from '../../lib/firebase';
import { useBusiness } from '../../contexts/BusinessContext';
import { useCurrency } from '../../hooks/useCurrency';
import FullScreenLoader from '../../components/common/FullScreenLoader';

// Types
interface VariantPricing {
  size: string;
  stock: number;
  sku?: string;
  price?: number; // Variant-specific price
  salePrice?: number; // Variant-specific sale price
  onSale?: boolean;
}

interface Product {
  id: string;
  name: string;
  images?: string[];
  sellingPrice: number;
  costPrice?: number;
  compareAtPrice?: number;
  onSale?: boolean;
  salePrice?: number;
  variants?: VariantPricing[];
  collectionIds?: string[];
}

interface Collection {
  id: string;
  name: string;
}

interface PricingChange {
  productId: string;
  sellingPrice: number;
  compareAtPrice?: number;
  onSale: boolean;
  salePrice?: number;
  variants?: VariantPricing[];
}

const PricingPage = () => {
  const { businessId } = useBusiness();
  const { formatCurrency, currencySymbol } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [collectionFilter, setCollectionFilter] = useState<string>('all');
  const [saleFilter, setSaleFilter] = useState<'all' | 'on_sale' | 'regular'>('all');
  const [changes, setChanges] = useState<Map<string, PricingChange>>(new Map());
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkDiscountPercent, setBulkDiscountPercent] = useState(15);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  // Load data
  useEffect(() => {
    if (!businessId) return;
    loadData();
  }, [businessId]);

  const loadData = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const productsRef = collection(db, 'businesses', businessId, 'products');
      const productsSnapshot = await getDocs(productsRef);
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productsData);

      const collectionsRef = collection(db, 'businesses', businessId, 'collections');
      const collectionsSnapshot = await getDocs(collectionsRef);
      const collectionsData = collectionsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || ''
      })) as Collection[];
      setCollections(collectionsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle product expansion
  const toggleExpand = (productId: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  // Get current price data for a product
  const getProductPricing = (product: Product): PricingChange => {
    const change = changes.get(product.id);
    if (change) return change;

    return {
      productId: product.id,
      sellingPrice: product.sellingPrice || 0,
      compareAtPrice: product.compareAtPrice,
      onSale: product.onSale || false,
      salePrice: product.salePrice,
      variants: product.variants
    };
  };

  // Update product pricing
  const updateProductPricing = (productId: string, updates: Partial<PricingChange>) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const current = getProductPricing(product);
    const newChange: PricingChange = {
      ...current,
      ...updates,
      productId
    };

    // Auto-calculate sale price when toggling on sale
    if (updates.onSale === true && !newChange.salePrice && newChange.sellingPrice) {
      newChange.salePrice = Math.round(newChange.sellingPrice * 0.85);
      newChange.compareAtPrice = newChange.sellingPrice;
    }

    // If turning off sale
    if (updates.onSale === false) {
      newChange.salePrice = undefined;
      newChange.compareAtPrice = undefined;
    }

    setChanges(prev => {
      const newMap = new Map(prev);
      newMap.set(productId, newChange);
      return newMap;
    });
  };

  // Update variant pricing
  const updateVariantPricing = (productId: string, variantIndex: number, updates: Partial<VariantPricing>) => {
    const product = products.find(p => p.id === productId);
    if (!product || !product.variants) return;

    const current = getProductPricing(product);
    const variants = [...(current.variants || product.variants)];
    
    variants[variantIndex] = {
      ...variants[variantIndex],
      ...updates
    };

    // Auto-calculate variant sale price
    if (updates.onSale === true && !variants[variantIndex].salePrice) {
      const basePrice = variants[variantIndex].price || current.sellingPrice;
      variants[variantIndex].salePrice = Math.round(basePrice * 0.85);
    }

    if (updates.onSale === false) {
      variants[variantIndex].salePrice = undefined;
    }

    setChanges(prev => {
      const newMap = new Map(prev);
      newMap.set(productId, { ...current, variants, productId });
      return newMap;
    });
  };

  // Save all changes
  const saveChanges = async () => {
    if (!businessId || changes.size === 0) return;

    setSaving(true);
    try {
      const batch = writeBatch(db);

      changes.forEach((change, productId) => {
        const productRef = doc(db, 'businesses', businessId, 'products', productId);
        
        const updateData: any = {
          sellingPrice: change.sellingPrice,
          onSale: change.onSale
        };

        if (change.onSale) {
          updateData.salePrice = change.salePrice;
          updateData.compareAtPrice = change.compareAtPrice || change.sellingPrice;
        } else {
          updateData.salePrice = null;
          updateData.compareAtPrice = null;
        }

        // Save variant pricing
        if (change.variants) {
          updateData.variants = change.variants.map(v => ({
            size: v.size,
            stock: v.stock,
            sku: v.sku || null,
            price: v.price || null,
            salePrice: v.onSale ? v.salePrice : null,
            onSale: v.onSale || false
          }));
        }

        batch.update(productRef, updateData);
      });

      await batch.commit();
      await loadData();
      setChanges(new Map());
      alert('Prices updated successfully!');
    } catch (error) {
      console.error('Error saving prices:', error);
      alert('Failed to save prices');
    } finally {
      setSaving(false);
    }
  };

  // Discard changes
  const discardChanges = () => {
    setChanges(new Map());
  };

  // Toggle product selection
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  // Select all
  const selectAllFiltered = () => {
    const allIds = filteredProducts.map(p => p.id);
    setSelectedProducts(new Set(allIds));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedProducts(new Set());
  };

  // Apply bulk discount
  const applyBulkDiscount = () => {
    selectedProducts.forEach(productId => {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const currentPrice = product.sellingPrice || 0;
      const discountedPrice = Math.round(currentPrice * (1 - bulkDiscountPercent / 100));

      updateProductPricing(productId, {
        onSale: true,
        salePrice: discountedPrice,
        compareAtPrice: currentPrice
      });
    });

    setShowBulkModal(false);
    setBulkMode(false);
  };

  // Remove bulk sale
  const removeBulkSale = () => {
    selectedProducts.forEach(productId => {
      updateProductPricing(productId, {
        onSale: false,
        salePrice: undefined,
        compareAtPrice: undefined
      });
    });
    setBulkMode(false);
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !searchTerm || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCollection = collectionFilter === 'all' || 
        p.collectionIds?.includes(collectionFilter);

      const pricing = getProductPricing(p);
      const matchesSale = saleFilter === 'all' ||
        (saleFilter === 'on_sale' && pricing.onSale) ||
        (saleFilter === 'regular' && !pricing.onSale);

      return matchesSearch && matchesCollection && matchesSale;
    });
  }, [products, searchTerm, collectionFilter, saleFilter, changes]);

  // Stats
  const stats = useMemo(() => {
    let onSaleCount = 0;
    let regularCount = 0;
    let totalDiscount = 0;

    products.forEach(p => {
      const pricing = getProductPricing(p);
      if (pricing.onSale && pricing.salePrice && pricing.compareAtPrice) {
        onSaleCount++;
        totalDiscount += (pricing.compareAtPrice - pricing.salePrice);
      } else {
        regularCount++;
      }
    });

    return {
      total: products.length,
      onSale: onSaleCount,
      regular: regularCount,
      avgDiscount: onSaleCount > 0 ? Math.round(totalDiscount / onSaleCount) : 0
    };
  }, [products, changes]);

  // Calculate discount percentage
  const calcDiscountPercent = (original: number, sale: number) => {
    if (!original || original <= 0) return 0;
    return Math.round(((original - sale) / original) * 100);
  };

  if (loading) {
    return <FullScreenLoader />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Product Pricing</h1>
          <p className="text-gray-500 mt-1">Manage sale prices and discounts for your products</p>
        </div>
        <div className="flex items-center gap-3">
          {changes.size > 0 && (
            <>
              <button
                onClick={discardChanges}
                className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Discard
              </button>
              <button
                onClick={saveChanges}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 font-medium disabled:opacity-50"
              >
                {saving && <span className="material-icons animate-spin text-lg">refresh</span>}
                Save Changes ({changes.size})
              </button>
            </>
          )}
          {changes.size === 0 && (
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all font-medium ${
                bulkMode 
                  ? 'bg-primary text-white' 
                  : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="material-icons text-lg">checklist</span>
              Bulk Edit
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-blue-100">
              <span className="material-icons text-blue-600 text-xl">inventory_2</span>
            </div>
          </div>
          <p className="text-sm text-gray-500">Total Products</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-red-100">
              <span className="material-icons text-red-600 text-xl">local_offer</span>
            </div>
          </div>
          <p className="text-sm text-gray-500">On Sale</p>
          <p className="text-2xl font-bold text-red-600">{stats.onSale}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-green-100">
              <span className="material-icons text-green-600 text-xl">sell</span>
            </div>
          </div>
          <p className="text-sm text-gray-500">Regular Price</p>
          <p className="text-2xl font-bold text-green-600">{stats.regular}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-purple-100">
              <span className="material-icons text-purple-600 text-xl">savings</span>
            </div>
          </div>
          <p className="text-sm text-gray-500">Avg. Discount</p>
          <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.avgDiscount)}</p>
        </div>
      </div>

      {/* Bulk Actions */}
      {bulkMode && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">
                {selectedProducts.size} products selected
              </span>
              <button onClick={selectAllFiltered} className="text-sm text-primary hover:text-primary/80 font-medium">
                Select All
              </button>
              <button onClick={deselectAll} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                Deselect All
              </button>
            </div>
            <div className="flex-1"></div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkModal(true)}
                disabled={selectedProducts.size === 0}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50 text-sm"
              >
                Apply Sale
              </button>
              <button
                onClick={removeBulkSale}
                disabled={selectedProducts.size === 0}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 text-sm"
              >
                Remove Sale
              </button>
              <button
                onClick={() => { setBulkMode(false); setSelectedProducts(new Set()); }}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <select
            value={collectionFilter}
            onChange={(e) => setCollectionFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          >
            <option value="all">All Collections</option>
            {collections.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={saleFilter}
            onChange={(e) => setSaleFilter(e.target.value as any)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          >
            <option value="all">All Products</option>
            <option value="on_sale">On Sale</option>
            <option value="regular">Regular Price</option>
          </select>
        </div>
      </div>

      {/* Products List */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-icons text-4xl text-gray-400">inventory_2</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => {
            const pricing = getProductPricing(product);
            const hasChanges = changes.has(product.id);
            const isExpanded = expandedProducts.has(product.id);
            const hasVariants = product.variants && product.variants.length > 0;
            const discountPercent = pricing.onSale && pricing.compareAtPrice && pricing.salePrice
              ? calcDiscountPercent(pricing.compareAtPrice, pricing.salePrice)
              : 0;

            return (
              <div
                key={product.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                  hasChanges ? 'border-primary ring-2 ring-primary/20' : 'border-gray-100'
                } ${bulkMode && selectedProducts.has(product.id) ? 'bg-primary/5' : ''}`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Checkbox */}
                    {bulkMode && (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id)}
                          onChange={() => toggleProductSelection(product.id)}
                          className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary"
                        />
                      </div>
                    )}

                    {/* Image */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-icons text-gray-400 text-2xl">image</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                          {hasVariants && (
                            <p className="text-sm text-gray-500">
                              {product.variants!.length} sizes
                            </p>
                          )}
                        </div>
                        {pricing.onSale && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                            <span className="material-icons text-sm">local_offer</span>
                            {discountPercent}% OFF
                          </span>
                        )}
                      </div>

                      {/* Pricing Controls */}
                      <div className="flex flex-wrap items-center gap-4 mt-3">
                        {/* Original Price */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            {pricing.onSale ? 'Original Price' : 'Price'}
                          </label>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-gray-400">{currencySymbol}</span>
                            <input
                              type="number"
                              value={pricing.onSale ? (pricing.compareAtPrice || pricing.sellingPrice) : pricing.sellingPrice}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                if (pricing.onSale) {
                                  updateProductPricing(product.id, { compareAtPrice: value });
                                } else {
                                  updateProductPricing(product.id, { sellingPrice: value });
                                }
                              }}
                              className={`w-24 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm ${
                                pricing.onSale ? 'line-through text-gray-400' : ''
                              }`}
                            />
                          </div>
                        </div>

                        {/* Sale Price */}
                        {pricing.onSale && (
                          <div>
                            <label className="block text-xs font-medium text-red-600 mb-1">Sale Price</label>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-red-400">{currencySymbol}</span>
                              <input
                                type="number"
                                value={pricing.salePrice || ''}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  updateProductPricing(product.id, { salePrice: value });
                                }}
                                className="w-24 px-3 py-2 border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 text-sm text-red-600 font-semibold bg-red-50"
                              />
                            </div>
                          </div>
                        )}

                        {/* Sale Toggle */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-gray-500">Sale</label>
                          <button
                            onClick={() => updateProductPricing(product.id, { onSale: !pricing.onSale })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              pricing.onSale ? 'bg-red-500' : 'bg-gray-200'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                              pricing.onSale ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>

                        {/* Quick Discount Buttons */}
                        {pricing.onSale && (
                          <div className="flex items-center gap-1">
                            {[10, 15, 20, 25, 30, 50].map((percent) => (
                              <button
                                key={percent}
                                onClick={() => {
                                  const original = pricing.compareAtPrice || pricing.sellingPrice;
                                  const newSalePrice = Math.round(original * (1 - percent / 100));
                                  updateProductPricing(product.id, { salePrice: newSalePrice });
                                }}
                                className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                                  discountPercent === percent
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {percent}%
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Expand Variants Button - Dropdown Arrow */}
                        {hasVariants && (
                          <button
                            onClick={() => toggleExpand(product.id)}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                              isExpanded 
                                ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md'
                            }`}
                          >
                            <span className="material-icons text-lg">
                              {isExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                            </span>
                            {product.variants!.length} Sizes
                            <span className={`material-icons text-base transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                              arrow_drop_down
                            </span>
                          </button>
                        )}

                        {hasChanges && (
                          <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                            <span className="material-icons text-sm">edit</span>
                            Modified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Variants */}
                {isExpanded && hasVariants && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4">
                    <div className="grid gap-3">
                      {(pricing.variants || product.variants)!.map((variant, idx) => {
                        const variantDiscountPercent = variant.onSale && variant.salePrice
                          ? calcDiscountPercent(variant.price || pricing.sellingPrice, variant.salePrice)
                          : 0;

                        return (
                          <div key={variant.size} className="flex items-center gap-4 bg-white rounded-xl p-3 border border-gray-100">
                            {/* Size Badge */}
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-700">
                              {variant.size}
                            </div>

                            {/* Stock */}
                            <div className="text-sm">
                              <span className="text-gray-500">Stock:</span>
                              <span className={`ml-1 font-medium ${variant.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {variant.stock}
                              </span>
                            </div>

                            {/* Variant Price */}
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Price</label>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-400">{currencySymbol}</span>
                                <input
                                  type="number"
                                  value={variant.price || pricing.sellingPrice}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    updateVariantPricing(product.id, idx, { price: value });
                                  }}
                                  className={`w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 ${
                                    variant.onSale ? 'line-through text-gray-400' : ''
                                  }`}
                                />
                              </div>
                            </div>

                            {/* Variant Sale Price */}
                            {variant.onSale && (
                              <div>
                                <label className="block text-xs text-red-500 mb-1">Sale</label>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-red-400">{currencySymbol}</span>
                                  <input
                                    type="number"
                                    value={variant.salePrice || ''}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      updateVariantPricing(product.id, idx, { salePrice: value });
                                    }}
                                    className="w-20 px-2 py-1.5 border border-red-200 rounded-lg text-sm text-red-600 font-medium bg-red-50 focus:outline-none focus:ring-1 focus:ring-red-200"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Variant Sale Toggle */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateVariantPricing(product.id, idx, { onSale: !variant.onSale })}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                  variant.onSale ? 'bg-red-500' : 'bg-gray-200'
                                }`}
                              >
                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform shadow-sm ${
                                  variant.onSale ? 'translate-x-5' : 'translate-x-1'
                                }`} />
                              </button>
                            </div>

                            {/* Variant Quick Discounts */}
                            {variant.onSale && (
                              <div className="flex items-center gap-1 ml-auto">
                                {[10, 20, 30, 50].map((percent) => (
                                  <button
                                    key={percent}
                                    onClick={() => {
                                      const basePrice = variant.price || pricing.sellingPrice;
                                      const newSalePrice = Math.round(basePrice * (1 - percent / 100));
                                      updateVariantPricing(product.id, idx, { salePrice: newSalePrice });
                                    }}
                                    className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                                      variantDiscountPercent === percent
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    {percent}%
                                  </button>
                                ))}
                              </div>
                            )}

                            {variant.onSale && variantDiscountPercent > 0 && (
                              <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded">
                                -{variantDiscountPercent}%
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Save */}
      {changes.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {changes.size} product{changes.size > 1 ? 's' : ''} modified
            </span>
            <button onClick={discardChanges} className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium text-sm">
              Discard
            </button>
            <button
              onClick={saveChanges}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all font-medium disabled:opacity-50"
            >
              {saving && <span className="material-icons animate-spin text-lg">refresh</span>}
              Save All
            </button>
          </div>
        </div>
      )}

      {/* Bulk Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-icons text-red-600 text-3xl">local_offer</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Apply Bulk Discount</h3>
              <p className="text-gray-500">
                Apply to {selectedProducts.size} product{selectedProducts.size > 1 ? 's' : ''}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Discount Percentage</label>
              <div className="flex flex-wrap gap-2 mb-4">
                {[10, 15, 20, 25, 30, 40, 50].map((percent) => (
                  <button
                    key={percent}
                    onClick={() => setBulkDiscountPercent(percent)}
                    className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                      bulkDiscountPercent === percent
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {percent}%
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={bulkDiscountPercent}
                onChange={(e) => setBulkDiscountPercent(parseInt(e.target.value) || 0)}
                min="1"
                max="99"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-lg font-semibold text-center"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={applyBulkDiscount}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
              >
                Apply {bulkDiscountPercent}% Off
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingPage;
