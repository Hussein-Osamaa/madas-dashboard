/**
 * Discounts Page - Manage discount codes and promotions
 */

import { useState, useEffect, useMemo } from 'react';
import {
  addDoc,
  collection,
  db,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc
} from '../../lib/firebase';
import { useBusiness } from '../../contexts/BusinessContext';
import { useCurrency } from '../../hooks/useCurrency';
import FullScreenLoader from '../../components/common/FullScreenLoader';

// Types
interface Product {
  id: string;
  name: string;
  images?: string[];
  sellingPrice?: number;
}

interface Collection {
  id: string;
  name: string;
  image?: string;
  productCount?: number;
}

interface DiscountCode {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping' | 'buy_x_get_y';
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number; // For percentage discounts - cap the max discount
  maxUses?: number;
  usesPerCustomer?: number; // Limit per customer
  usedCount: number;
  startDate?: string;
  endDate?: string;
  status: 'active' | 'inactive' | 'expired' | 'scheduled';
  appliesTo: 'all' | 'specific_products' | 'specific_collections';
  productIds?: string[];
  collectionIds?: string[];
  excludeProductIds?: string[]; // Products to exclude
  excludeCollectionIds?: string[]; // Collections to exclude
  customerEligibility: 'all' | 'new_customers' | 'returning_customers';
  combineWithOther: boolean;
  description?: string;
  // Buy X Get Y specific
  buyQuantity?: number;
  getQuantity?: number;
  getDiscountPercent?: number; // e.g., 100 = free, 50 = half off
  createdAt: any;
  updatedAt?: any;
}

type DiscountDraft = Omit<DiscountCode, 'id' | 'createdAt' | 'updatedAt' | 'usedCount'>;

const defaultFormData: DiscountDraft = {
  code: '',
  type: 'percentage',
  value: 10,
  minOrderAmount: 0,
  maxDiscountAmount: undefined,
  maxUses: undefined,
  usesPerCustomer: undefined,
  startDate: '',
  endDate: '',
  status: 'active',
  appliesTo: 'all',
  productIds: [],
  collectionIds: [],
  excludeProductIds: [],
  excludeCollectionIds: [],
  customerEligibility: 'all',
  combineWithOther: true,
  description: '',
  buyQuantity: 2,
  getQuantity: 1,
  getDiscountPercent: 100
};

const DiscountsPage = () => {
  const { businessId } = useBusiness();
  const { formatCurrency, currencySymbol } = useCurrency();
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired' | 'scheduled'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountCode | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'conditions' | 'limits' | 'schedule'>('basic');
  const [productSearch, setProductSearch] = useState('');
  const [collectionSearch, setCollectionSearch] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'include' | 'exclude'>('include');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<DiscountDraft>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load data
  useEffect(() => {
    if (!businessId) return;
    loadData();
  }, [businessId]);

  const loadData = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      // Load discounts
      const discountsRef = collection(db, 'businesses', businessId, 'discounts');
      const discountsSnapshot = await getDocs(discountsRef);
      const discountsData = discountsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DiscountCode[];
      
      // Check for expired and scheduled discounts
      const now = new Date();
      const updatedDiscounts = discountsData.map(d => {
        if (d.endDate && new Date(d.endDate) < now && d.status === 'active') {
          return { ...d, status: 'expired' as const };
        }
        if (d.startDate && new Date(d.startDate) > now && d.status === 'active') {
          return { ...d, status: 'scheduled' as const };
        }
        return d;
      });
      
      setDiscounts(updatedDiscounts);

      // Load products
      const productsRef = collection(db, 'businesses', businessId, 'products');
      const productsSnapshot = await getDocs(productsRef);
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || '',
        images: doc.data().images || [],
        sellingPrice: doc.data().sellingPrice
      })) as Product[];
      setProducts(productsData);

      // Load collections
      const collectionsRef = collection(db, 'businesses', businessId, 'collections');
      const collectionsSnapshot = await getDocs(collectionsRef);
      const collectionsData = collectionsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || '',
        image: doc.data().image,
        productCount: doc.data().productCount
      })) as Collection[];
      setCollections(collectionsData);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate random code
  const generateCode = (length: number = 8, prefix: string = '') => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = prefix;
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, code }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Discount code is required';
    } else if (formData.code.length < 3) {
      newErrors.code = 'Code must be at least 3 characters';
    } else if (!/^[A-Z0-9]+$/.test(formData.code)) {
      newErrors.code = 'Code can only contain letters and numbers';
    }

    // Check for duplicate code
    const existingCode = discounts.find(
      d => d.code === formData.code.toUpperCase() && d.id !== editingDiscount?.id
    );
    if (existingCode) {
      newErrors.code = 'This code already exists';
    }

    if (formData.type !== 'free_shipping' && formData.type !== 'buy_x_get_y') {
      if (!formData.value || formData.value <= 0) {
        newErrors.value = 'Discount value must be greater than 0';
      }
      if (formData.type === 'percentage' && formData.value > 100) {
        newErrors.value = 'Percentage cannot exceed 100%';
      }
    }

    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    if (formData.appliesTo === 'specific_products' && (!formData.productIds || formData.productIds.length === 0)) {
      newErrors.products = 'Select at least one product';
    }

    if (formData.appliesTo === 'specific_collections' && (!formData.collectionIds || formData.collectionIds.length === 0)) {
      newErrors.collections = 'Select at least one collection';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save discount
  const handleSave = async () => {
    if (!businessId || !validateForm()) return;
    
    setSaving(true);
    try {
      // Determine actual status based on dates
      let actualStatus = formData.status;
      const now = new Date();
      if (formData.startDate && new Date(formData.startDate) > now && formData.status === 'active') {
        actualStatus = 'scheduled';
      }

      const discountData = {
        ...formData,
        code: formData.code.toUpperCase().trim(),
        status: actualStatus,
        updatedAt: serverTimestamp()
      };

      // Remove undefined values
      Object.keys(discountData).forEach(key => {
        if (discountData[key as keyof typeof discountData] === undefined) {
          delete discountData[key as keyof typeof discountData];
        }
      });

      if (editingDiscount) {
        const discountRef = doc(db, 'businesses', businessId, 'discounts', editingDiscount.id);
        await updateDoc(discountRef, discountData);
      } else {
        const discountsRef = collection(db, 'businesses', businessId, 'discounts');
        await addDoc(discountsRef, {
          ...discountData,
          usedCount: 0,
          createdAt: serverTimestamp()
        });
      }

      setModalOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving discount:', error);
      alert('Failed to save discount');
    } finally {
      setSaving(false);
    }
  };

  // Delete discount
  const handleDelete = async (id: string) => {
    if (!businessId) return;
    
    try {
      const discountRef = doc(db, 'businesses', businessId, 'discounts', id);
      await deleteDoc(discountRef);
      setDeleteConfirm(null);
      loadData();
    } catch (error) {
      console.error('Error deleting discount:', error);
      alert('Failed to delete discount');
    }
  };

  // Toggle status
  const toggleStatus = async (discount: DiscountCode) => {
    if (!businessId || discount.status === 'expired') return;
    
    const newStatus = discount.status === 'active' ? 'inactive' : 'active';
    try {
      const discountRef = doc(db, 'businesses', businessId, 'discounts', discount.id);
      await updateDoc(discountRef, { 
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Duplicate discount
  const duplicateDiscount = (discount: DiscountCode) => {
    setEditingDiscount(null);
    setFormData({
      ...discount,
      code: discount.code + '_COPY',
      status: 'inactive'
    });
    setActiveTab('basic');
    setModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (discount: DiscountCode) => {
    setEditingDiscount(discount);
    setFormData({
      code: discount.code,
      type: discount.type,
      value: discount.value,
      minOrderAmount: discount.minOrderAmount || 0,
      maxDiscountAmount: discount.maxDiscountAmount,
      maxUses: discount.maxUses,
      usesPerCustomer: discount.usesPerCustomer,
      startDate: discount.startDate || '',
      endDate: discount.endDate || '',
      status: discount.status === 'expired' ? 'inactive' : discount.status,
      appliesTo: discount.appliesTo,
      productIds: discount.productIds || [],
      collectionIds: discount.collectionIds || [],
      excludeProductIds: discount.excludeProductIds || [],
      excludeCollectionIds: discount.excludeCollectionIds || [],
      customerEligibility: discount.customerEligibility || 'all',
      combineWithOther: discount.combineWithOther !== false,
      description: discount.description || '',
      buyQuantity: discount.buyQuantity || 2,
      getQuantity: discount.getQuantity || 1,
      getDiscountPercent: discount.getDiscountPercent || 100
    });
    setActiveTab('basic');
    setErrors({});
    setModalOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setEditingDiscount(null);
    setFormData(defaultFormData);
    setActiveTab('basic');
    setErrors({});
  };

  // Copy code
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filter products for picker
  const filteredProducts = useMemo(() => {
    const term = productSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(term));
  }, [products, productSearch]);

  // Filter collections for picker
  const filteredCollections = useMemo(() => {
    const term = collectionSearch.toLowerCase();
    return collections.filter(c => c.name.toLowerCase().includes(term));
  }, [collections, collectionSearch]);

  // Filter discounts
  const filteredDiscounts = useMemo(() => {
    return discounts.filter(d => {
      const matchesSearch = !searchTerm || 
        d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [discounts, searchTerm, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: discounts.length,
    active: discounts.filter(d => d.status === 'active').length,
    scheduled: discounts.filter(d => d.status === 'scheduled').length,
    inactive: discounts.filter(d => d.status === 'inactive').length,
    expired: discounts.filter(d => d.status === 'expired').length,
    totalUses: discounts.reduce((sum, d) => sum + (d.usedCount || 0), 0)
  }), [discounts]);

  // Get discount display value
  const getDiscountDisplay = (discount: DiscountCode) => {
    switch (discount.type) {
      case 'percentage':
        return `${discount.value}% off`;
      case 'fixed':
        return `${formatCurrency(discount.value)} off`;
      case 'free_shipping':
        return 'Free Shipping';
      case 'buy_x_get_y':
        return `Buy ${discount.buyQuantity} Get ${discount.getQuantity} ${discount.getDiscountPercent === 100 ? 'Free' : `${discount.getDiscountPercent}% off`}`;
      default:
        return '';
    }
  };

  if (loading) {
    return <FullScreenLoader />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Discount Codes</h1>
          <p className="text-gray-500 mt-1">Create and manage promotional discount codes</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 font-medium"
        >
          <span className="material-icons text-xl">add</span>
          Create Discount
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-blue-100">
              <span className="material-icons text-blue-600 text-lg">confirmation_number</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-green-100">
              <span className="material-icons text-green-600 text-lg">check_circle</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">Active</p>
          <p className="text-xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-blue-100">
              <span className="material-icons text-blue-600 text-lg">schedule</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">Scheduled</p>
          <p className="text-xl font-bold text-blue-600">{stats.scheduled}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-gray-100">
              <span className="material-icons text-gray-600 text-lg">pause_circle</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">Inactive</p>
          <p className="text-xl font-bold text-gray-600">{stats.inactive}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-red-100">
              <span className="material-icons text-red-600 text-lg">event_busy</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">Expired</p>
          <p className="text-xl font-bold text-red-600">{stats.expired}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-purple-100">
              <span className="material-icons text-purple-600 text-lg">redeem</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">Total Uses</p>
          <p className="text-xl font-bold text-purple-600">{stats.totalUses}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input
              type="text"
              placeholder="Search by code or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="inactive">Inactive</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Discounts List */}
      {filteredDiscounts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-icons text-4xl text-gray-400">local_offer</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No discount codes found</h3>
          <p className="text-gray-500 mb-6">Create your first discount code to start offering promotions</p>
          <button
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all font-medium"
          >
            <span className="material-icons text-xl">add</span>
            Create Discount
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Code</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Discount</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Usage</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4 hidden lg:table-cell">Conditions</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Status</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDiscounts.map((discount) => (
                  <tr key={discount.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          discount.type === 'percentage' ? 'bg-blue-100' :
                          discount.type === 'fixed' ? 'bg-green-100' :
                          discount.type === 'free_shipping' ? 'bg-purple-100' : 'bg-orange-100'
                        }`}>
                          <span className={`material-icons text-lg ${
                            discount.type === 'percentage' ? 'text-blue-600' :
                            discount.type === 'fixed' ? 'text-green-600' :
                            discount.type === 'free_shipping' ? 'text-purple-600' : 'text-orange-600'
                          }`}>
                            {discount.type === 'percentage' ? 'percent' :
                             discount.type === 'fixed' ? 'payments' :
                             discount.type === 'free_shipping' ? 'local_shipping' : 'card_giftcard'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-mono font-bold text-gray-900">{discount.code}</p>
                            <button
                              onClick={() => copyCode(discount.code)}
                              className="p-1 text-gray-400 hover:text-primary transition-colors"
                              title="Copy code"
                            >
                              <span className="material-icons text-sm">
                                {copiedCode === discount.code ? 'check' : 'content_copy'}
                              </span>
                            </button>
                          </div>
                          {discount.description && (
                            <p className="text-sm text-gray-500 truncate max-w-[200px]">{discount.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">
                        {getDiscountDisplay(discount)}
                      </div>
                      {discount.minOrderAmount && discount.minOrderAmount > 0 && (
                        <p className="text-xs text-gray-500">Min. order: {formatCurrency(discount.minOrderAmount)}</p>
                      )}
                      {discount.maxDiscountAmount && (
                        <p className="text-xs text-gray-500">Max discount: {formatCurrency(discount.maxDiscountAmount)}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{discount.usedCount || 0}</div>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        {discount.maxUses && <p>/ {discount.maxUses} total</p>}
                        {discount.usesPerCustomer && <p>{discount.usesPerCustomer}/customer</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {discount.appliesTo !== 'all' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                            {discount.appliesTo === 'specific_products' 
                              ? `${discount.productIds?.length || 0} products` 
                              : `${discount.collectionIds?.length || 0} collections`}
                          </span>
                        )}
                        {discount.customerEligibility !== 'all' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-600">
                            {discount.customerEligibility === 'new_customers' ? 'New' : 'Returning'}
                          </span>
                        )}
                        {!discount.combineWithOther && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-600">
                            Exclusive
                          </span>
                        )}
                        {discount.startDate && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-600">
                            From {new Date(discount.startDate).toLocaleDateString()}
                          </span>
                        )}
                        {discount.endDate && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600">
                            Until {new Date(discount.endDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleStatus(discount)}
                        disabled={discount.status === 'expired'}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          discount.status === 'active'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : discount.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : discount.status === 'expired'
                            ? 'bg-red-100 text-red-700 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          discount.status === 'active' ? 'bg-green-500' :
                          discount.status === 'scheduled' ? 'bg-blue-500' :
                          discount.status === 'expired' ? 'bg-red-500' : 'bg-gray-400'
                        }`}></span>
                        {discount.status.charAt(0).toUpperCase() + discount.status.slice(1)}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => duplicateDiscount(discount)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Duplicate"
                        >
                          <span className="material-icons text-lg">content_copy</span>
                        </button>
                        <button
                          onClick={() => openEditModal(discount)}
                          className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <span className="material-icons text-lg">edit</span>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(discount.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <span className="material-icons text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingDiscount ? 'Edit Discount Code' : 'Create Discount Code'}
                </h2>
                <button
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-100 px-6">
              <div className="flex gap-1">
                {(['basic', 'conditions', 'limits', 'schedule'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab === 'basic' && 'Basic Info'}
                    {tab === 'conditions' && 'Conditions'}
                    {tab === 'limits' && 'Usage Limits'}
                    {tab === 'schedule' && 'Schedule'}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Basic Info Tab */}
              {activeTab === 'basic' && (
                <div className="space-y-5">
                  {/* Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Discount Code *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                        placeholder="e.g., SUMMER20"
                        className={`flex-1 px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono uppercase ${
                          errors.code ? 'border-red-300' : 'border-gray-200'
                        }`}
                      />
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => generateCode(8)}
                          className="px-3 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
                          title="Generate 8 characters"
                        >
                          8
                        </button>
                        <button
                          type="button"
                          onClick={() => generateCode(12)}
                          className="px-3 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
                          title="Generate 12 characters"
                        >
                          12
                        </button>
                      </div>
                    </div>
                    {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
                  </div>

                  {/* Discount Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Discount Type</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { value: 'percentage', label: 'Percentage', icon: 'percent' },
                        { value: 'fixed', label: 'Fixed Amount', icon: 'payments' },
                        { value: 'free_shipping', label: 'Free Shipping', icon: 'local_shipping' },
                        { value: 'buy_x_get_y', label: 'Buy X Get Y', icon: 'card_giftcard' }
                      ].map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, type: type.value as any }))}
                          className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                            formData.type === type.value
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className={`material-icons ${formData.type === type.value ? 'text-primary' : 'text-gray-400'}`}>
                            {type.icon}
                          </span>
                          <span className={`text-xs font-medium ${formData.type === type.value ? 'text-primary' : 'text-gray-600'}`}>
                            {type.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Value - Only for percentage and fixed */}
                  {(formData.type === 'percentage' || formData.type === 'fixed') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {formData.type === 'percentage' ? 'Percentage Off' : 'Amount Off'} *
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                            {formData.type === 'percentage' ? '%' : currencySymbol}
                          </span>
                          <input
                            type="number"
                            value={formData.value}
                            onChange={(e) => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                            min="0"
                            max={formData.type === 'percentage' ? 100 : undefined}
                            step={formData.type === 'percentage' ? 1 : 0.01}
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                              errors.value ? 'border-red-300' : 'border-gray-200'
                            }`}
                          />
                        </div>
                        {errors.value && <p className="text-red-500 text-xs mt-1">{errors.value}</p>}
                      </div>

                      {/* Max Discount - Only for percentage */}
                      {formData.type === 'percentage' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Discount (Optional)</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">{currencySymbol}</span>
                            <input
                              type="number"
                              value={formData.maxDiscountAmount || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, maxDiscountAmount: parseFloat(e.target.value) || undefined }))}
                              min="0"
                              step="0.01"
                              placeholder="No cap"
                              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Cap the maximum discount amount</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Buy X Get Y Options */}
                  {formData.type === 'buy_x_get_y' && (
                    <div className="p-4 bg-orange-50 rounded-xl space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Buy Quantity</label>
                          <input
                            type="number"
                            value={formData.buyQuantity}
                            onChange={(e) => setFormData(prev => ({ ...prev, buyQuantity: parseInt(e.target.value) || 2 }))}
                            min="1"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Get Quantity</label>
                          <input
                            type="number"
                            value={formData.getQuantity}
                            onChange={(e) => setFormData(prev => ({ ...prev, getQuantity: parseInt(e.target.value) || 1 }))}
                            min="1"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">At % Off</label>
                          <select
                            value={formData.getDiscountPercent}
                            onChange={(e) => setFormData(prev => ({ ...prev, getDiscountPercent: parseInt(e.target.value) }))}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                          >
                            <option value={100}>Free (100% off)</option>
                            <option value={50}>50% off</option>
                            <option value={25}>25% off</option>
                            <option value={20}>20% off</option>
                            <option value={10}>10% off</option>
                          </select>
                        </div>
                      </div>
                      <p className="text-sm text-orange-700">
                        Customer buys {formData.buyQuantity} items and gets {formData.getQuantity} item(s) at {formData.getDiscountPercent}% off
                      </p>
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Internal Description (Optional)</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      placeholder="Note about this discount for internal use..."
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="status"
                          checked={formData.status === 'active' || formData.status === 'scheduled'}
                          onChange={() => setFormData(prev => ({ ...prev, status: 'active' }))}
                          className="w-4 h-4 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">Active</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="status"
                          checked={formData.status === 'inactive'}
                          onChange={() => setFormData(prev => ({ ...prev, status: 'inactive' }))}
                          className="w-4 h-4 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">Draft / Inactive</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Conditions Tab */}
              {activeTab === 'conditions' && (
                <div className="space-y-5">
                  {/* Minimum Order Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Order Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">{currencySymbol}</span>
                      <input
                        type="number"
                        value={formData.minOrderAmount || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, minOrderAmount: parseFloat(e.target.value) || 0 }))}
                        min="0"
                        step="0.01"
                        placeholder="0 = No minimum"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Leave empty or 0 for no minimum</p>
                  </div>

                  {/* Applies To */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Applies To</label>
                    <div className="space-y-2">
                      {[
                        { value: 'all', label: 'All Products', desc: 'Discount applies to entire order' },
                        { value: 'specific_products', label: 'Specific Products', desc: 'Only selected products get discount' },
                        { value: 'specific_collections', label: 'Specific Collections', desc: 'Products in selected collections' }
                      ].map((option) => (
                        <label
                          key={option.value}
                          className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            formData.appliesTo === option.value
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="appliesTo"
                            checked={formData.appliesTo === option.value}
                            onChange={() => setFormData(prev => ({ ...prev, appliesTo: option.value as any }))}
                            className="mt-0.5 w-4 h-4 text-primary focus:ring-primary"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{option.label}</p>
                            <p className="text-xs text-gray-500">{option.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    {errors.products && <p className="text-red-500 text-xs mt-1">{errors.products}</p>}
                    {errors.collections && <p className="text-red-500 text-xs mt-1">{errors.collections}</p>}
                  </div>

                  {/* Product Picker */}
                  {formData.appliesTo === 'specific_products' && (
                    <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700">
                          Selected Products ({formData.productIds?.length || 0})
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setPickerMode('include');
                            setShowProductPicker(true);
                          }}
                          className="text-sm text-primary hover:text-primary/80 font-medium"
                        >
                          + Add Products
                        </button>
                      </div>
                      {formData.productIds && formData.productIds.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.productIds.map(productId => {
                            const product = products.find(p => p.id === productId);
                            return (
                              <div
                                key={productId}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200"
                              >
                                {product?.images?.[0] && (
                                  <img src={product.images[0]} alt="" className="w-5 h-5 rounded object-cover" />
                                )}
                                <span className="text-sm text-gray-700">{product?.name || 'Unknown'}</span>
                                <button
                                  type="button"
                                  onClick={() => setFormData(prev => ({
                                    ...prev,
                                    productIds: prev.productIds?.filter(id => id !== productId)
                                  }))}
                                  className="text-gray-400 hover:text-red-500"
                                >
                                  <span className="material-icons text-sm">close</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Collection Picker */}
                  {formData.appliesTo === 'specific_collections' && (
                    <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700">
                          Selected Collections ({formData.collectionIds?.length || 0})
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setPickerMode('include');
                            setShowCollectionPicker(true);
                          }}
                          className="text-sm text-primary hover:text-primary/80 font-medium"
                        >
                          + Add Collections
                        </button>
                      </div>
                      {formData.collectionIds && formData.collectionIds.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.collectionIds.map(collectionId => {
                            const coll = collections.find(c => c.id === collectionId);
                            return (
                              <div
                                key={collectionId}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200"
                              >
                                {coll?.image && (
                                  <img src={coll.image} alt="" className="w-5 h-5 rounded object-cover" />
                                )}
                                <span className="text-sm text-gray-700">{coll?.name || 'Unknown'}</span>
                                <button
                                  type="button"
                                  onClick={() => setFormData(prev => ({
                                    ...prev,
                                    collectionIds: prev.collectionIds?.filter(id => id !== collectionId)
                                  }))}
                                  className="text-gray-400 hover:text-red-500"
                                >
                                  <span className="material-icons text-sm">close</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Customer Eligibility */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Customer Eligibility</label>
                    <select
                      value={formData.customerEligibility}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerEligibility: e.target.value as any }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                    >
                      <option value="all">All Customers</option>
                      <option value="new_customers">New Customers Only (First Order)</option>
                      <option value="returning_customers">Returning Customers Only</option>
                    </select>
                  </div>

                  {/* Combine with Other Discounts */}
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <input
                      type="checkbox"
                      id="combineWithOther"
                      checked={formData.combineWithOther}
                      onChange={(e) => setFormData(prev => ({ ...prev, combineWithOther: e.target.checked }))}
                      className="mt-0.5 w-4 h-4 text-primary focus:ring-primary rounded"
                    />
                    <label htmlFor="combineWithOther" className="cursor-pointer">
                      <p className="text-sm font-medium text-gray-900">Can be combined with other discounts</p>
                      <p className="text-xs text-gray-500">Allow customers to use this with other discount codes</p>
                    </label>
                  </div>
                </div>
              )}

              {/* Usage Limits Tab */}
              {activeTab === 'limits' && (
                <div className="space-y-5">
                  {/* Total Usage Limit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Total Usage Limit</label>
                    <input
                      type="number"
                      value={formData.maxUses || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxUses: parseInt(e.target.value) || undefined }))}
                      min="1"
                      placeholder="Unlimited"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <p className="text-xs text-gray-500 mt-1">Maximum number of times this code can be used in total</p>
                  </div>

                  {/* Usage Per Customer */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Usage Per Customer</label>
                    <input
                      type="number"
                      value={formData.usesPerCustomer || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, usesPerCustomer: parseInt(e.target.value) || undefined }))}
                      min="1"
                      placeholder="Unlimited"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <p className="text-xs text-gray-500 mt-1">How many times each customer can use this code</p>
                  </div>

                  {/* Quick Presets */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quick Presets</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, maxUses: 100, usesPerCustomer: 1 }))}
                        className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        100 total, 1/customer
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, maxUses: 50, usesPerCustomer: 1 }))}
                        className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        50 total, 1/customer
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, maxUses: undefined, usesPerCustomer: 1 }))}
                        className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Unlimited, 1/customer
                      </button>
                    </div>
                  </div>

                  {/* Current Usage */}
                  {editingDiscount && (
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-icons text-blue-600">info</span>
                        <p className="text-sm font-medium text-blue-900">Current Usage</p>
                      </div>
                      <p className="text-sm text-blue-700">
                        This code has been used <strong>{editingDiscount.usedCount || 0}</strong> times
                        {editingDiscount.maxUses && <> out of <strong>{editingDiscount.maxUses}</strong> allowed</>}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Schedule Tab */}
              {activeTab === 'schedule' && (
                <div className="space-y-5">
                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty to start immediately when activated</p>
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                        errors.endDate ? 'border-red-300' : 'border-gray-200'
                      }`}
                    />
                    {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
                    <p className="text-xs text-gray-500 mt-1">Leave empty for no expiration</p>
                  </div>

                  {/* Quick Date Presets */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quick Date Presets</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: '24 Hours', days: 1 },
                        { label: '1 Week', days: 7 },
                        { label: '1 Month', days: 30 },
                        { label: '3 Months', days: 90 }
                      ].map((preset) => (
                        <button
                          key={preset.days}
                          type="button"
                          onClick={() => {
                            const now = new Date();
                            const end = new Date(now.getTime() + preset.days * 24 * 60 * 60 * 1000);
                            setFormData(prev => ({
                              ...prev,
                              startDate: now.toISOString().slice(0, 16),
                              endDate: end.toISOString().slice(0, 16)
                            }));
                          }}
                          className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Schedule Preview */}
                  {(formData.startDate || formData.endDate) && (
                    <div className="p-4 bg-green-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-icons text-green-600">event</span>
                        <p className="text-sm font-medium text-green-900">Schedule Preview</p>
                      </div>
                      <div className="text-sm text-green-700 space-y-1">
                        {formData.startDate && (
                          <p>Starts: {new Date(formData.startDate).toLocaleString()}</p>
                        )}
                        {formData.endDate && (
                          <p>Ends: {new Date(formData.endDate).toLocaleString()}</p>
                        )}
                        {!formData.startDate && !formData.endDate && (
                          <p>No schedule set - active immediately with no expiration</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving && <span className="material-icons animate-spin text-lg">refresh</span>}
                {saving ? 'Saving...' : editingDiscount ? 'Update Discount' : 'Create Discount'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Picker Modal */}
      {showProductPicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">Select Products</h3>
                <button
                  onClick={() => setShowProductPicker(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
              <div className="relative">
                <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No products found</div>
              ) : (
                <div className="space-y-1">
                  {filteredProducts.map((product) => {
                    const isSelected = formData.productIds?.includes(product.id);
                    return (
                      <button
                        key={product.id}
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            productIds: isSelected
                              ? prev.productIds?.filter(id => id !== product.id)
                              : [...(prev.productIds || []), product.id]
                          }));
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                          isSelected ? 'bg-primary/10' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="material-icons text-gray-400">image</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-gray-900">{product.name}</p>
                          {product.sellingPrice && (
                            <p className="text-xs text-gray-500">{formatCurrency(product.sellingPrice)}</p>
                          )}
                        </div>
                        {isSelected && (
                          <span className="material-icons text-primary">check_circle</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => setShowProductPicker(false)}
                className="w-full px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium"
              >
                Done ({formData.productIds?.length || 0} selected)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collection Picker Modal */}
      {showCollectionPicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">Select Collections</h3>
                <button
                  onClick={() => setShowCollectionPicker(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
              <div className="relative">
                <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                <input
                  type="text"
                  value={collectionSearch}
                  onChange={(e) => setCollectionSearch(e.target.value)}
                  placeholder="Search collections..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredCollections.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No collections found</div>
              ) : (
                <div className="space-y-1">
                  {filteredCollections.map((coll) => {
                    const isSelected = formData.collectionIds?.includes(coll.id);
                    return (
                      <button
                        key={coll.id}
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            collectionIds: isSelected
                              ? prev.collectionIds?.filter(id => id !== coll.id)
                              : [...(prev.collectionIds || []), coll.id]
                          }));
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                          isSelected ? 'bg-primary/10' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          {coll.image ? (
                            <img src={coll.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="material-icons text-gray-400">collections</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-gray-900">{coll.name}</p>
                          {coll.productCount !== undefined && (
                            <p className="text-xs text-gray-500">{coll.productCount} products</p>
                          )}
                        </div>
                        {isSelected && (
                          <span className="material-icons text-primary">check_circle</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => setShowCollectionPicker(false)}
                className="w-full px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium"
              >
                Done ({formData.collectionIds?.length || 0} selected)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-icons text-red-600 text-3xl">delete_forever</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Discount Code?</h3>
              <p className="text-gray-500 mb-6">This action cannot be undone. The discount code will be permanently removed.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountsPage;
