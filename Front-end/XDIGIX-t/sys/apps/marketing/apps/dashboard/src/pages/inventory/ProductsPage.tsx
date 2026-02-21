import { useEffect, useMemo, useState, useRef } from 'react';
import clsx from 'clsx';
import InventoryStats from '../../components/inventory/InventoryStats';
import ProductCard, { InventoryViewMode } from '../../components/inventory/ProductCard';
import ProductModal, { ProductDraft } from '../../components/inventory/ProductModal';
import XdfImagePricingModal from '../../components/inventory/XdfImagePricingModal';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import { useBusiness } from '../../contexts/BusinessContext';
import { calculateInventoryTotals, useProducts } from '../../hooks/useProducts';
import { useWarehouses } from '../../hooks/useWarehouses';
import { useLinkedInventory } from '../../hooks/useLinkedInventory';
import { useFulfillmentSubscription } from '../../hooks/useFulfillmentSubscription';
import { useCurrency } from '../../hooks/useCurrency';
import { useOrders } from '../../hooks/useOrders';
import WarehouseModal from '../../components/inventory/WarehouseModal';
import BulkActionsModal from '../../components/inventory/BulkActionsModal';
import BarcodePrintModal from '../../components/inventory/BarcodePrintModal';
import { Product } from '../../services/productsService';
import { createWarehouse } from '../../services/warehousesService';
import { exportProductsToExcel, exportProductsWithImagesToExcel, importProductsFromExcel, parseExcelDataToProducts } from '../../utils/excelUtils';
import { updateLinkedProductImagePricing } from '../../lib/backend-adapter';

const useBackend = !!import.meta.env.VITE_API_BACKEND_URL;

const ProductsPage = () => {
  const { 
    businessId, 
    permissions, 
    loading, 
    hasPermission, 
    businessName,
    linkedBusinesses,
    currentViewingBusinessId,
    currentViewingBusinessName,
    setCurrentViewingBusiness,
    isViewingOtherBusiness,
    getEffectiveBusinessId
  } = useBusiness();
  
  // Use the effective business ID (current viewing or own)
  const effectiveBusinessId = getEffectiveBusinessId();
  const isViewingOther = isViewingOtherBusiness();
  
  const { warehouses, refetch: refetchWarehouses } = useWarehouses(effectiveBusinessId);
  const { formatCurrency } = useCurrency();
  const { data: linkedInventory, isLoading: linkedLoading, refetch: refetchLinkedInventory } = useLinkedInventory(!!effectiveBusinessId);
  const { subscribed: fulfillmentSubscribed } = useFulfillmentSubscription(!!effectiveBusinessId);
  const {
    products,
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    creating,
    updating
  } = useProducts(effectiveBusinessId);
  
  // Fetch orders to get pending orders count
  const { orders } = useOrders(effectiveBusinessId);
  
  // Calculate pending orders stats
  const pendingOrdersStats = useMemo(() => {
    const pendingOrders = orders.filter((order) => 
      order.status === 'pending' || order.status === 'processing'
    );
    const pendingItems = pendingOrders.reduce((total, order) => {
      const items = order.items || [];
      return total + items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    }, 0);
    return { count: pendingOrders.length, items: pendingItems };
  }, [orders]);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<InventoryViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const [bulkActionsModalOpen, setBulkActionsModalOpen] = useState(false);
  const [barcodePrintModalOpen, setBarcodePrintModalOpen] = useState(false);
  const [creatingWarehouse, setCreatingWarehouse] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [processingBulkAction, setProcessingBulkAction] = useState(false);
  const [removingDuplicates, setRemovingDuplicates] = useState(false);
  const [inventorySource, setInventorySource] = useState<'mine' | 'xdf'>('mine');
  const [xdfPricingProduct, setXdfPricingProduct] = useState<Product | null>(null);
  const [xdfPricingSubmitting, setXdfPricingSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Check edit permission - support both product_update/product_edit keys and inventory.edit format
  // Disable editing when viewing another business's inventory
  const hasEditPermission = hasPermission('product_update') || 
                            hasPermission('product_edit') || 
                            permissions?.product?.includes('update') ||
                            permissions?.product?.includes('edit') ||
                            permissions?.inventory?.includes('edit');
  const canEdit = hasEditPermission && !isViewingOther;

  const warehouseLookup = useMemo(() => {
    const map = new Map<string, { name?: string; code?: string }>();
    warehouses.forEach((warehouse) => {
      map.set(warehouse.id, { name: warehouse.name, code: warehouse.code });
    });
    return map;
  }, [warehouses]);

  useEffect(() => {
    if (warehouseFilter !== 'all') {
      const exists = warehouses.some((warehouse) => warehouse.id === warehouseFilter);
      if (!exists) {
        setWarehouseFilter('all');
      }
    }
  }, [warehouses, warehouseFilter]);

  const productsScopedToWarehouse = useMemo(() => {
    if (!warehouseFilter || warehouseFilter === 'all' || warehouseFilter === 'xdf') {
      return products;
    }
    return products.filter((product) => {
      const stockByLocation = product.stockByLocation ?? {};
      return Object.prototype.hasOwnProperty.call(stockByLocation, warehouseFilter);
    });
  }, [products, warehouseFilter]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return productsScopedToWarehouse;
    return productsScopedToWarehouse.filter((product) => {
      const haystacks: Array<string | undefined> = [
        product.name,
        product.description,
        product.sku,
        product.barcode,
        ...Object.keys(product.stock ?? {}),
        ...Object.values(product.sizeBarcodes ?? {}),
        ...Object.keys(product.stockByLocation ?? {}),
        ...Object.keys(product.stockByLocation ?? {}).map((locationId) => {
          const location = warehouseLookup.get(locationId);
          if (!location) return undefined;
          return `${location.name ?? ''} ${location.code ?? ''}`;
        })
      ];
      return haystacks.some((value) => value && value.toLowerCase().includes(term));
    });
  }, [productsScopedToWarehouse, searchTerm, warehouseLookup]);

  const linkedProductsAsProduct = useMemo(() => {
    if (!linkedInventory?.products?.length) return [];
    const term = searchTerm.trim().toLowerCase();
    let list = linkedInventory.products;
    if (term) {
      list = list.filter((p) => {
        const name = (p.name ?? '').toLowerCase();
        const sku = (p.sku ?? '').toLowerCase();
        const barcode = (p.barcode ?? '').toLowerCase();
        return name.includes(term) || sku.includes(term) || barcode.includes(term);
      });
    }
    return list.map((p) => ({
      id: p.id,
      name: p.name ?? '',
      description: '',
      price: 0,
      sku: p.sku ?? '',
      barcode: p.barcode,
      stock: p.stock ?? {},
      sizeBarcodes: p.sizeBarcodes ?? {},
      stockByLocation: {}
    })) as Product[];
  }, [linkedInventory, searchTerm]);

  const isLinkedView = inventorySource === 'xdf' || warehouseFilter === 'xdf';
  const displayProducts = isLinkedView ? linkedProductsAsProduct : filteredProducts;

  const selectedCount = useMemo(
    () => displayProducts.filter((product) => selected[product.id]).length,
    [displayProducts, selected]
  );

  const filteredTotals = useMemo(
    () => (isLinkedView ? { totalProducts: displayProducts.length, totalStock: 0, lowStock: 0, outOfStock: 0, totalValue: 0 } : calculateInventoryTotals(filteredProducts)),
    [isLinkedView, displayProducts, filteredProducts]
  );

  const toggleSelection = (productId: string, checked: boolean) => {
    setSelected((prev) => ({ ...prev, [productId]: checked }));
  };

  const handleSelectAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    displayProducts.forEach((product) => {
      next[product.id] = checked;
    });
    setSelected(next);
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!canEdit) return;
    const confirmed = window.confirm('Delete this product? This action cannot be undone.');
    if (!confirmed) return;
    await deleteProduct(productId);
  };

  const handleSubmit = async (payload: ProductDraft) => {
    if (!businessId) return;
    if (payload.id) {
      const { id, ...rest } = payload;
      await updateProduct({ productId: id, payload: rest });
    } else {
      const { id, ...rest } = payload;
      await createProduct(rest as Omit<Product, 'id'>);
    }
    setModalOpen(false);
  };

  const handleCreateWarehouse = async (payload: { name: string; code?: string }) => {
    if (!businessId) return;
    try {
      setCreatingWarehouse(true);
      await createWarehouse(businessId, payload);
      await refetchWarehouses();
      setWarehouseModalOpen(false);
    } catch (error) {
      console.error('[ProductsPage] Failed to create warehouse', error);
      alert('Failed to create storage location. Please try again.');
    } finally {
      setCreatingWarehouse(false);
    }
  };

  const handleExportExcel = async (withImages: boolean = false) => {
    if (isLinkedView) return;
    const selectedProductsList = displayProducts.filter((p) => selected[p.id]);
    const productsToExport = selectedProductsList.length > 0 ? selectedProductsList : displayProducts;
    
    if (productsToExport.length === 0) {
      alert('No products to export.');
      return;
    }
    try {
      setExporting(true);
      setExportDropdownOpen(false);
      const exportType = selectedProductsList.length > 0 ? 'selected' : 'all';
      if (withImages) {
        await exportProductsWithImagesToExcel(productsToExport);
        alert(`Successfully exported ${productsToExport.length} ${exportType} products with images to Excel!`);
      } else {
        await exportProductsToExcel(productsToExport);
        alert(`Successfully exported ${productsToExport.length} ${exportType} products to Excel!`);
      }
    } catch (error) {
      console.error('[ProductsPage] Export failed:', error);
      alert('Failed to export products. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleXdfImagePricingSubmit = async (payload: { images: string[]; price: number; sellingPrice: number }) => {
    if (!xdfPricingProduct) return;
    try {
      setXdfPricingSubmitting(true);
      await updateLinkedProductImagePricing(xdfPricingProduct.id, payload);
      await refetchLinkedInventory();
      setXdfPricingProduct(null);
    } catch (error) {
      console.error('[ProductsPage] XDF image/pricing update failed:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setXdfPricingSubmitting(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      alert('Please select a valid Excel file (.xlsx, .xls, or .csv)');
      return;
    }

    try {
      setImporting(true);
      console.log('[ProductsPage] Starting import...');
      
      const excelData = await importProductsFromExcel(file);
      console.log('[ProductsPage] Excel data parsed:', excelData.length, 'rows');
      console.log('[ProductsPage] First row sample:', excelData[0]);
      
      const productsToImport = parseExcelDataToProducts(excelData);
      console.log('[ProductsPage] Products to import:', productsToImport.length);
      console.log('[ProductsPage] First product sample:', productsToImport[0]);

      if (productsToImport.length === 0) {
        alert('No valid products found in the file. Please check the format.\n\nRequired columns: Product Name\nOptional: Size, Quantity, SKU, Main Barcode, Size Barcode, Cost Price, Selling Price, Category, Description');
        return;
      }

      // Check how many products already exist
      const existingProducts = products || [];
      const existingByName: Record<string, Product> = {};
      existingProducts.forEach(p => {
        if (p.name) {
          existingByName[p.name.toLowerCase().trim()] = p;
        }
      });

      let updateCount = 0;
      let newCount = 0;
      productsToImport.forEach(p => {
        const key = (p.name || '').toLowerCase().trim();
        if (existingByName[key]) {
          updateCount++;
        } else {
          newCount++;
        }
      });

      const confirmed = window.confirm(
        `Found ${productsToImport.length} products in the file:\n` +
        `• ${updateCount} existing products will be UPDATED (sizes merged)\n` +
        `• ${newCount} new products will be CREATED\n\n` +
        `Do you want to continue?`
      );
      if (!confirmed) return;

      // Import products - update existing or create new
      let updatedCount = 0;
      let createdCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const productData of productsToImport) {
        try {
          const productName = (productData.name || '').toLowerCase().trim();
          const existingProduct = existingByName[productName];
          
          if (existingProduct) {
            // UPDATE existing product - merge sizes/stock
            const mergedStock = { ...(existingProduct.stock || {}) };
            const mergedSizeBarcodes = { ...(existingProduct.sizeBarcodes || {}) };
            
            // Merge new stock values
            if (productData.stock) {
              Object.entries(productData.stock).forEach(([size, qty]) => {
                mergedStock[size] = qty as number;
              });
            }
            
            // Merge new size barcodes
            if (productData.sizeBarcodes) {
              Object.entries(productData.sizeBarcodes).forEach(([size, barcode]) => {
                if (barcode) {
                  mergedSizeBarcodes[size] = barcode as string;
                }
              });
            }
            
            const updatePayload: Partial<Omit<Product, 'id'>> = {
              stock: mergedStock,
              sizeBarcodes: mergedSizeBarcodes
            };
            
            // Only update other fields if they have values in the import
            if (productData.price && productData.price > 0) updatePayload.price = productData.price;
            if (productData.sellingPrice && productData.sellingPrice > 0) updatePayload.sellingPrice = productData.sellingPrice;
            if (productData.sku) updatePayload.sku = productData.sku;
            if (productData.barcode) updatePayload.barcode = productData.barcode;
            if (productData.category) updatePayload.category = productData.category;
            if (productData.description) updatePayload.description = productData.description;
            
            console.log('[ProductsPage] Updating product:', existingProduct.name, 'with stock:', mergedStock);
            await updateProduct({ productId: existingProduct.id, payload: updatePayload });
            updatedCount++;
          } else {
            // CREATE new product
            const validatedProduct = {
              ...productData,
              name: productData.name || 'Unnamed Product',
              price: productData.price || 0,
              sellingPrice: productData.sellingPrice || productData.price || 0,
              stock: productData.stock || {},
              status: productData.status || 'active'
            };
            
            console.log('[ProductsPage] Creating new product:', validatedProduct.name);
            await createProduct(validatedProduct as Omit<Product, 'id'>);
            createdCount++;
          }
        } catch (error: any) {
          console.error('[ProductsPage] Failed to import product:', productData.name, error);
          errors.push(`${productData.name}: ${error?.message || 'Unknown error'}`);
          failedCount++;
        }
      }

      const successMessage = [];
      if (updatedCount > 0) successMessage.push(`${updatedCount} products updated`);
      if (createdCount > 0) successMessage.push(`${createdCount} products created`);
      
      if (successMessage.length > 0) {
        alert(`Import complete!\n\n✓ ${successMessage.join('\n✓ ')}${failedCount > 0 ? `\n\n✗ ${failedCount} failed:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}` : ''}`);
      } else {
        alert(`Failed to import products.\n\nErrors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`);
      }
    } catch (error: any) {
      console.error('[ProductsPage] Import failed:', error);
      alert(`Failed to import products: ${error?.message || 'Unknown error'}\n\nPlease check the file format and try again.`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Find and remove duplicate products (keep the oldest one)
  const handleRemoveDuplicates = async () => {
    if (!products || products.length === 0) {
      alert('No products found.');
      return;
    }

    // Group products by name (case-insensitive)
    const productsByName: Record<string, Product[]> = {};
    products.forEach(product => {
      const key = (product.name || '').toLowerCase().trim();
      if (!productsByName[key]) {
        productsByName[key] = [];
      }
      productsByName[key].push(product);
    });

    // Find duplicates (more than 1 product with same name)
    const duplicateGroups = Object.entries(productsByName).filter(([_, prods]) => prods.length > 1);
    
    if (duplicateGroups.length === 0) {
      alert('No duplicate products found!');
      return;
    }

    // Count total duplicates to delete
    let totalDuplicates = 0;
    duplicateGroups.forEach(([_, prods]) => {
      totalDuplicates += prods.length - 1; // Keep one, delete rest
    });

    const confirmed = window.confirm(
      `Found ${duplicateGroups.length} product names with duplicates:\n\n` +
      duplicateGroups.slice(0, 10).map(([name, prods]) => `• "${name}" (${prods.length} copies)`).join('\n') +
      (duplicateGroups.length > 10 ? `\n... and ${duplicateGroups.length - 10} more` : '') +
      `\n\nThis will DELETE ${totalDuplicates} duplicate products (keeping the oldest one for each).\n\n` +
      `Are you sure you want to continue?`
    );

    if (!confirmed) return;

    try {
      setRemovingDuplicates(true);
      let deletedCount = 0;
      let failedCount = 0;

      for (const [name, prods] of duplicateGroups) {
        // Sort by createdAt to keep the oldest
        const sorted = [...prods].sort((a, b) => {
          const dateA = a.createdAt ? (typeof a.createdAt === 'object' && 'toDate' in a.createdAt ? a.createdAt.toDate() : new Date(a.createdAt as string)) : new Date(0);
          const dateB = b.createdAt ? (typeof b.createdAt === 'object' && 'toDate' in b.createdAt ? b.createdAt.toDate() : new Date(b.createdAt as string)) : new Date(0);
          return dateA.getTime() - dateB.getTime();
        });

        // Keep the first (oldest), delete the rest
        const toDelete = sorted.slice(1);
        
        for (const product of toDelete) {
          try {
            await deleteProduct(product.id);
            deletedCount++;
            console.log(`[ProductsPage] Deleted duplicate: ${product.name} (${product.id})`);
          } catch (error) {
            console.error(`[ProductsPage] Failed to delete duplicate:`, product.name, error);
            failedCount++;
          }
        }
      }

      alert(`Duplicates removed!\n\n✓ ${deletedCount} duplicate products deleted${failedCount > 0 ? `\n✗ ${failedCount} failed` : ''}`);
    } catch (error) {
      console.error('[ProductsPage] Remove duplicates failed:', error);
      alert('Failed to remove duplicates. Please try again.');
    } finally {
      setRemovingDuplicates(false);
    }
  };

  const handleBulkActions = () => {
    const selectedIds = Object.keys(selected).filter((id) => selected[id]);
    if (selectedIds.length === 0) {
      alert('Please select at least one product.');
      return;
    }
    setBulkActionsModalOpen(true);
  };

  const handleBulkDelete = async () => {
    const selectedIds = Object.keys(selected).filter((id) => selected[id]);
    if (selectedIds.length === 0) return;

    try {
      setProcessingBulkAction(true);
      await Promise.all(
        selectedIds.map((id) => deleteProduct(id).catch((error) => {
          console.error('[ProductsPage] Failed to delete product:', error);
        }))
      );
      setSelected({});
      setBulkActionsModalOpen(false);
    } catch (error) {
      console.error('[ProductsPage] Bulk delete failed:', error);
      alert('Failed to delete some products. Please try again.');
    } finally {
      setProcessingBulkAction(false);
    }
  };

  const handleBulkUpdateStatus = async (newStatus: string) => {
    const selectedIds = Object.keys(selected).filter((id) => selected[id]);
    if (selectedIds.length === 0) return;

    try {
      setProcessingBulkAction(true);
      await Promise.all(
        selectedIds.map((id) => {
          const product = products.find((p) => p.id === id);
          if (product) {
            return updateProduct({
              productId: id,
              payload: { ...product, status: newStatus.toLowerCase() }
            }).catch((error) => {
              console.error('[ProductsPage] Failed to update product:', error);
            });
          }
          return Promise.resolve();
        })
      );
      setSelected({});
      setBulkActionsModalOpen(false);
    } catch (error) {
      console.error('[ProductsPage] Bulk status update failed:', error);
      alert('Failed to update some products. Please try again.');
    } finally {
      setProcessingBulkAction(false);
    }
  };

  const handleBulkUpdateCategory = async (newCategory: string) => {
    const selectedIds = Object.keys(selected).filter((id) => selected[id]);
    if (selectedIds.length === 0) return;

    try {
      setProcessingBulkAction(true);
      await Promise.all(
        selectedIds.map((id) => {
          const product = products.find((p) => p.id === id);
          if (product) {
            return updateProduct({
              productId: id,
              payload: { ...product, category: newCategory }
            }).catch((error) => {
              console.error('[ProductsPage] Failed to update product:', error);
            });
          }
          return Promise.resolve();
        })
      );
      setSelected({});
      setBulkActionsModalOpen(false);
    } catch (error) {
      console.error('[ProductsPage] Bulk category update failed:', error);
      alert('Failed to update some products. Please try again.');
    } finally {
      setProcessingBulkAction(false);
    }
  };

  const handleBulkUpdatePrice = async (newPrice: number, priceType: 'price' | 'sellingPrice') => {
    const selectedIds = Object.keys(selected).filter((id) => selected[id]);
    if (selectedIds.length === 0) return;

    try {
      setProcessingBulkAction(true);
      await Promise.all(
        selectedIds.map((id) => {
          const product = products.find((p) => p.id === id);
          if (product) {
            const payload = priceType === 'price' 
              ? { ...product, price: newPrice }
              : { ...product, sellingPrice: newPrice };
            return updateProduct({
              productId: id,
              payload
            }).catch((error) => {
              console.error('[ProductsPage] Failed to update product:', error);
            });
          }
          return Promise.resolve();
        })
      );
      setSelected({});
      setBulkActionsModalOpen(false);
    } catch (error) {
      console.error('[ProductsPage] Bulk price update failed:', error);
      alert('Failed to update some products. Please try again.');
    } finally {
      setProcessingBulkAction(false);
    }
  };

  const handleBulkUpdateLowStockAlert = async (threshold: number) => {
    const selectedIds = Object.keys(selected).filter((id) => selected[id]);
    if (selectedIds.length === 0) return;

    try {
      setProcessingBulkAction(true);
      await Promise.all(
        selectedIds.map((id) => {
          const product = products.find((p) => p.id === id);
          if (product) {
            return updateProduct({
              productId: id,
              payload: { lowStockAlert: threshold }
            }).catch((error) => {
              console.error('[ProductsPage] Failed to update product:', error);
            });
          }
          return Promise.resolve();
        })
      );
      setSelected({});
      setBulkActionsModalOpen(false);
    } catch (error) {
      console.error('[ProductsPage] Bulk low stock alert update failed:', error);
      alert('Failed to update some products. Please try again.');
    } finally {
      setProcessingBulkAction(false);
    }
  };

  const handlePrintBarcodes = () => {
    const selectedIds = Object.keys(selected).filter((id) => selected[id]);
    if (selectedIds.length === 0) {
      alert('Please select at least one product to print barcodes.');
      return;
    }
    setBarcodePrintModalOpen(true);
  };

  // Get selected products for barcode printing
  const selectedProducts = products.filter((p) => selected[p.id]);

  if (loading) {
    return <FullScreenLoader message="Loading business context..." />;
  }

  return (
    <div className="px-6 py-8 space-y-6">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-semibold text-primary">Inventory</h1>
            {isViewingOther && currentViewingBusinessName && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                <span className="material-icons text-sm">visibility</span>
                Viewing: {currentViewingBusinessName}
              </span>
            )}
          </div>
          <p className="text-sm text-madas-text/70">
            {isViewingOther 
              ? `Viewing ${currentViewingBusinessName}'s inventory (read-only)`
              : 'Manage products, monitor stock levels, and keep your catalog organised.'}
          </p>

          {/* Inventory source dropdown: My products vs linked (XDF) */}
          {!isViewingOther && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs font-medium text-madas-text/80">Inventory:</span>
              <select
                value={inventorySource}
                onChange={(e) => {
                  const v = e.target.value as 'mine' | 'xdf';
                  setInventorySource(v);
                  if (v === 'xdf') setWarehouseFilter('xdf');
                  else if (warehouseFilter === 'xdf') setWarehouseFilter('all');
                  setSelected({});
                }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-madas-text bg-white focus:outline-none focus:ring-2 focus:ring-accent min-w-[200px]"
              >
                <option value="mine">My products</option>
                {useBackend && (
                  <option value="xdf">{linkedInventory?.name ?? 'XDF (XDIGIX-FULFILLMENT)'}</option>
                )}
              </select>
              {linkedLoading && (
                <span className="inline-flex items-center gap-1 text-xs text-madas-text/60">
                  <span className="material-icons animate-spin text-sm">progress_activity</span>
                  Loading…
                </span>
              )}
            </div>
          )}
          
          {/* Business Switcher */}
          {linkedBusinesses && linkedBusinesses.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-madas-text/60">View inventory:</span>
              <select
                value={currentViewingBusinessId || businessId || ''}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  if (selectedId === businessId) {
                    setCurrentViewingBusiness(null);
                  } else {
                    setCurrentViewingBusiness(selectedId);
                  }
                }}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-madas-text bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value={businessId || ''}>{businessName || 'My Business'} (You)</option>
                {linkedBusinesses.map((biz) => (
                  <option key={biz.id} value={biz.id}>
                    {biz.name}
                  </option>
                ))}
              </select>
              {isViewingOther && (
                <button
                  type="button"
                  onClick={() => setCurrentViewingBusiness(null)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-base rounded transition-colors"
                >
                  <span className="material-icons text-sm">arrow_back</span>
                  Back to my inventory
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex overflow-hidden rounded-lg border border-gray-200">
            <button
              type="button"
              className={clsx(
                'inline-flex items-center gap-1 px-3 py-2 text-sm transition-colors',
                viewMode === 'grid' ? 'bg-primary text-white' : 'text-madas-text hover:bg-base'
              )}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <span className="material-icons text-base">grid_view</span>
              Grid
            </button>
            <button
              type="button"
              className={clsx(
                'inline-flex items-center gap-1 px-3 py-2 text-sm transition-colors',
                viewMode === 'list' ? 'bg-primary text-white' : 'text-madas-text hover:bg-base'
              )}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <span className="material-icons text-base">view_list</span>
              List
            </button>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls,.csv"
            onChange={handleImportExcel}
            className="hidden"
          />
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-madas-text/70 hover:bg-base transition-colors disabled:opacity-60"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing || !canEdit}
          >
            <span className="material-icons text-base text-current">
              {importing ? 'hourglass_empty' : 'upload_file'}
            </span>
            {importing ? 'Importing...' : 'Upload Excel'}
          </button>
          {/* Remove Duplicates Button */}
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
            onClick={handleRemoveDuplicates}
            disabled={removingDuplicates || !canEdit || (products?.length || 0) === 0}
          >
            <span className="material-icons text-base text-current">
              {removingDuplicates ? 'hourglass_empty' : 'delete_sweep'}
            </span>
            {removingDuplicates ? 'Removing...' : 'Remove Duplicates'}
          </button>
          {/* Export Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-madas-text/70 hover:bg-base transition-colors disabled:opacity-60"
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              disabled={exporting || displayProducts.length === 0 || isLinkedView}
          >
            <span className="material-icons text-base text-current">
              {exporting ? 'hourglass_empty' : 'download'}
            </span>
              {exporting ? 'Exporting...' : `Download${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
              <span className="material-icons text-base text-current">
                {exportDropdownOpen ? 'expand_less' : 'expand_more'}
              </span>
          </button>
            {exportDropdownOpen && (
              <div className="absolute right-0 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                  <span className="text-xs text-gray-500">
                    {selectedCount > 0 
                      ? `Exporting ${selectedCount} selected product${selectedCount > 1 ? 's' : ''}`
                      : `Exporting all ${displayProducts.length} product${displayProducts.length > 1 ? 's' : ''}`
                    }
                  </span>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-madas-text/80 hover:bg-base transition-colors"
                  onClick={() => handleExportExcel(false)}
                >
                  <span className="material-icons text-base text-gray-500">description</span>
                  <div className="text-left">
                    <div className="font-medium">Without Images</div>
                    <div className="text-xs text-gray-500">Standard export with all details</div>
                  </div>
                </button>
                <button
                  type="button"
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-madas-text/80 hover:bg-base transition-colors rounded-b-lg border-t border-gray-100"
                  onClick={() => handleExportExcel(true)}
                >
                  <span className="material-icons text-base text-primary">image</span>
                  <div className="text-left">
                    <div className="font-medium">With Images</div>
                    <div className="text-xs text-gray-500">Includes product photos</div>
                  </div>
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            disabled={!canEdit || isLinkedView}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-[#1f3c19] transition-colors disabled:opacity-60"
            onClick={openCreateModal}
          >
            <span className="material-icons text-base">add</span>
            Add Product
          </button>
        </div>
      </header>

      <InventoryStats
        totalProducts={filteredTotals.totalProducts}
        totalStock={filteredTotals.totalStock}
        lowStock={filteredTotals.lowStock}
        outOfStock={filteredTotals.outOfStock}
        totalValue={filteredTotals.totalValue}
        pendingOrders={pendingOrdersStats.count}
        pendingItems={pendingOrdersStats.items}
      />

      <section className="rounded-xl border border-dashed border-gray-200 bg-base/40 px-4 py-3 text-sm text-madas-text/70 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-accent bg-white checked:bg-primary checked:border-primary"
            checked={displayProducts.length > 0 && selectedCount === displayProducts.length}
            ref={(input) => {
              if (input) {
                input.indeterminate = selectedCount > 0 && selectedCount < displayProducts.length;
              }
            }}
            onChange={(event) => handleSelectAll(event.target.checked)}
            disabled={isLinkedView}
            title={isLinkedView ? 'Selection disabled for linked inventory' : undefined}
          />
          <span>{selectedCount} selected</span>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2">
          <button
            type="button"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-madas-text/70 hover:bg-base transition-colors disabled:opacity-60"
            disabled={selectedCount === 0 || !canEdit || isLinkedView}
            onClick={handleBulkActions}
          >
            Bulk Actions
          </button>
          <button
            type="button"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-madas-text/70 hover:bg-base transition-colors disabled:opacity-60"
            disabled={selectedCount === 0 || isLinkedView}
            onClick={handlePrintBarcodes}
          >
            Print Barcodes
          </button>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5">
            <span className="material-icons text-madas-text/60">warehouse</span>
            <select
              value={warehouseFilter}
              onChange={(event) => {
                const value = event.target.value;
                setWarehouseFilter(value);
                if (value === 'xdf') setInventorySource('xdf');
                else if (inventorySource === 'xdf') setInventorySource('mine');
              }}
              className="bg-transparent text-xs text-madas-text focus:outline-none min-w-[140px]"
            >
              <option value="all">All storage</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                  {warehouse.code ? ` (${warehouse.code})` : ''}
                </option>
              ))}
              {useBackend && (
                <option value="xdf">{linkedInventory?.name ?? 'XDF (XDIGIX-FULFILLMENT)'}</option>
              )}
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5">
            <span className="material-icons text-madas-text/60">search</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search products"
              className="w-48 bg-transparent text-xs text-madas-text focus:outline-none"
            />
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-primary transition-colors hover:bg-base disabled:opacity-60 whitespace-nowrap"
            onClick={() => setWarehouseModalOpen(true)}
            disabled={!canEdit}
          >
            <span className="material-icons text-sm">add_home_work</span>
            Add Storage
          </button>
        </div>
      </section>

      {isLoading && !isLinkedView ? (
        <div className="flex items-center justify-center py-16">
          <div className="space-y-3 text-center text-madas-text/70">
            <span className="material-icons animate-spin text-3xl text-primary">progress_activity</span>
            <p>Loading products…</p>
          </div>
        </div>
      ) : isLinkedView && linkedLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="space-y-3 text-center text-madas-text/70">
            <span className="material-icons animate-spin text-3xl text-primary">progress_activity</span>
            <p>Loading linked inventory…</p>
          </div>
        </div>
      ) : displayProducts.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white py-16 text-center">
          <div className="space-y-3">
            {isLinkedView ? (
              <>
                <span className="material-icons text-4xl text-madas-text/30">inventory_2</span>
                <p className="text-sm text-madas-text/70">
                  {fulfillmentSubscribed
                    ? 'No linked inventory products.'
                    : 'Your business must be subscribed to the fulfillment service to view XDF (linked) inventory. Contact your administrator or support to enable it.'}
                </p>
              </>
            ) : searchTerm ? (
              <>
                <span className="material-icons text-4xl text-madas-text/30">search_off</span>
                <p className="text-sm text-madas-text/70">No products match your search.</p>
                <button
                  type="button"
                  className="mx-auto flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-madas-text hover:bg-base transition-colors"
                  onClick={() => setSearchTerm('')}
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <span className="material-icons text-4xl text-madas-text/30">inventory_2</span>
                <p className="text-sm text-madas-text/70">No products yet. Add your first product to get started.</p>
                <button
                  type="button"
                  className="mx-auto flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-[#1f3c19] transition-colors disabled:opacity-60"
                  onClick={openCreateModal}
                  disabled={!canEdit}
                >
                  <span className="material-icons text-base">add</span>
                  Add Product
                </button>
              </>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {displayProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              viewMode={viewMode}
              selected={Boolean(selected[product.id])}
              onSelect={(checked) => toggleSelection(product.id, checked)}
              onEdit={() => openEditModal(product)}
              onDelete={() => handleDeleteProduct(product.id)}
              readOnly={isLinkedView}
              onEditImageAndPricing={isLinkedView ? () => setXdfPricingProduct(product) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {displayProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              viewMode={viewMode}
              selected={Boolean(selected[product.id])}
              onSelect={(checked) => toggleSelection(product.id, checked)}
              onEdit={() => openEditModal(product)}
              onDelete={() => handleDeleteProduct(product.id)}
              readOnly={isLinkedView}
              onEditImageAndPricing={isLinkedView ? () => setXdfPricingProduct(product) : undefined}
            />
          ))}
        </div>
      )}

      <ProductModal
        open={modalOpen}
        initialValue={editingProduct}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        submitting={creating || updating}
        warehouses={warehouses}
      />
      <WarehouseModal
        open={warehouseModalOpen}
        onClose={() => setWarehouseModalOpen(false)}
        onSubmit={handleCreateWarehouse}
        submitting={creatingWarehouse}
      />
      <BulkActionsModal
        open={bulkActionsModalOpen}
        onClose={() => setBulkActionsModalOpen(false)}
        selectedCount={selectedCount}
        onDelete={handleBulkDelete}
        onUpdateStatus={handleBulkUpdateStatus}
        onUpdateCategory={handleBulkUpdateCategory}
        onUpdatePrice={handleBulkUpdatePrice}
        onUpdateLowStockAlert={handleBulkUpdateLowStockAlert}
        processing={processingBulkAction}
      />
      <BarcodePrintModal
        open={barcodePrintModalOpen}
        onClose={() => setBarcodePrintModalOpen(false)}
        products={selectedProducts}
      />
      <XdfImagePricingModal
        open={!!xdfPricingProduct}
        onClose={() => setXdfPricingProduct(null)}
        product={xdfPricingProduct}
        onSubmit={handleXdfImagePricingSubmit}
        submitting={xdfPricingSubmitting}
      />

    </div>
  );
};

export default ProductsPage;


