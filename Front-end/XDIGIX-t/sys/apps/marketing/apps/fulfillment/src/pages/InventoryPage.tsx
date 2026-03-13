import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { useRefetchOnVisible } from '../hooks/useRefetchOnVisible';
import { useWarehouseLive } from '../hooks/useWarehouseLive';
import { useStaffAuth } from '../contexts/StaffAuthContext';
import { Package, ChevronDown, Plus, Pencil, Trash2, Warehouse as WarehouseIcon, Search, Printer, Upload, Download, ScanBarcode, X, Check, RotateCcw } from 'lucide-react';
import BarcodePrintModal from '../components/BarcodePrintModal';
import { normalizeProductFromApi } from '../components/SizeVariantsEditor';
import {
  SizeVariantsEditorFull,
  buildStockPayloadFromVariantsFull,
  buildVariantsFromProductFull,
  emptyVariantFull,
  type SizeVariantFull,
} from '../components/SizeVariantsEditorFull';
import {
  listFulfillmentClients,
  listProducts,
  listWarehouses,
  createProduct,
  createWarehouse,
  updateProduct,
  deleteProduct,
  bulkUpdateStock,
  type FulfillmentClient,
  type ProductWithStock,
  type Warehouse,
} from '../lib/api';
import {
  exportProductsToExcel,
  importProductsFromExcel,
  parseExcelDataToProducts,
  downloadProductTemplate,
  type ProductRow,
} from '../utils/excelUtils';

const emptyForm = { name: '', sku: '', barcode: '', warehouse: '' };

type RestockEntry = {
  productId: string;
  productName: string;
  size: string;
  barcode: string;
  count: number;
};

type RestockSession = {
  active: boolean;
  clientId: string;
  clientName: string;
  startedAt: Date;
  totalScans: number;
  entries: Map<string, RestockEntry>;
};

const RESTOCK_STORAGE_KEY = 'xdf_restock_session';

function saveRestockToStorage(session: RestockSession | null) {
  if (!session) {
    sessionStorage.removeItem(RESTOCK_STORAGE_KEY);
    return;
  }
  const serializable = {
    active: session.active,
    clientId: session.clientId,
    clientName: session.clientName,
    startedAt: session.startedAt.toISOString(),
    totalScans: session.totalScans,
    entries: Array.from(session.entries.entries()),
  };
  sessionStorage.setItem(RESTOCK_STORAGE_KEY, JSON.stringify(serializable));
}

function loadRestockFromStorage(): RestockSession | null {
  try {
    const raw = sessionStorage.getItem(RESTOCK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.active) return null;
    return {
      active: parsed.active,
      clientId: parsed.clientId,
      clientName: parsed.clientName,
      startedAt: new Date(parsed.startedAt),
      totalScans: parsed.totalScans ?? 0,
      entries: new Map(parsed.entries ?? []),
    };
  } catch {
    return null;
  }
}

export default function InventoryPage() {
  const { user } = useStaffAuth();
  const isAdmin = user?.allowedApps?.includes('ADMIN') ?? false;

  const [clients, setClients] = useState<FulfillmentClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductWithStock | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [variants, setVariants] = useState<SizeVariantFull[]>([emptyVariantFull()]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [warehouseForm, setWarehouseForm] = useState({ name: '', code: '' });
  const [warehouseFormError, setWarehouseFormError] = useState('');
  const [submittingWarehouse, setSubmittingWarehouse] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [showAssignWarehouseModal, setShowAssignWarehouseModal] = useState(false);
  const [assignWarehouseId, setAssignWarehouseId] = useState('');
  const [submittingBulkAssign, setSubmittingBulkAssign] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [productToDelete, setProductToDelete] = useState<ProductWithStock | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 30;
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restock session state — persisted to sessionStorage so it survives refresh
  const [restockSession, setRestockSessionRaw] = useState<RestockSession | null>(loadRestockFromStorage);
  const setRestockSession = useCallback((value: RestockSession | null | ((prev: RestockSession | null) => RestockSession | null)) => {
    setRestockSessionRaw((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      saveRestockToStorage(next);
      return next;
    });
  }, []);
  const [restockScanInput, setRestockScanInput] = useState('');
  const [restockLastScan, setRestockLastScan] = useState<{ barcode: string; matched: boolean; detail: string } | null>(null);
  const [restockSubmitting, setRestockSubmitting] = useState(false);
  const [showRestockConfirm, setShowRestockConfirm] = useState(false);
  const restockInputRef = useRef<HTMLInputElement>(null);

  const barcodeToProduct = useMemo(() => {
    const map = new Map<string, { productId: string; productName: string; size: string }>();
    products.forEach((p) => {
      const data = p as Record<string, unknown>;
      const name = String(data.name ?? p.id);
      const sizeBarcodes = data.sizeBarcodes as Record<string, string> | undefined;
      if (sizeBarcodes && typeof sizeBarcodes === 'object') {
        Object.entries(sizeBarcodes).forEach(([size, bc]) => {
          if (bc) map.set(bc, { productId: p.id, productName: name, size });
        });
      }
      const mainBarcode = String(data.barcode ?? '');
      if (mainBarcode && !map.has(mainBarcode)) {
        map.set(mainBarcode, { productId: p.id, productName: name, size: 'default' });
      }
    });
    return map;
  }, [products]);

  const handleStartRestock = () => {
    if (!selectedClientId) return;
    const client = clients.find((c) => c.id === selectedClientId);
    setRestockSession({
      active: true,
      clientId: selectedClientId,
      clientName: client?.name || selectedClientId,
      startedAt: new Date(),
      totalScans: 0,
      entries: new Map(),
    });
    setRestockLastScan(null);
    setRestockScanInput('');
    setTimeout(() => restockInputRef.current?.focus(), 100);
  };

  const handleRestockScan = (barcode: string) => {
    if (!restockSession || !barcode.trim()) return;
    const bc = barcode.trim();
    const match = barcodeToProduct.get(bc);

    setRestockSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, totalScans: prev.totalScans + 1, entries: new Map(prev.entries) };
      if (match) {
        const key = `${match.productId}::${match.size}`;
        const existing = next.entries.get(key);
        if (existing) {
          next.entries.set(key, { ...existing, count: existing.count + 1 });
        } else {
          next.entries.set(key, {
            productId: match.productId,
            productName: match.productName,
            size: match.size,
            barcode: bc,
            count: 1,
          });
        }
      }
      return next;
    });

    setRestockLastScan({
      barcode: bc,
      matched: !!match,
      detail: match ? `${match.productName} – ${match.size}` : 'No matching product found',
    });
    setRestockScanInput('');
    restockInputRef.current?.focus();
  };

  const handleRestockScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRestockScan(restockScanInput);
    }
  };

  const handleCancelRestock = () => {
    if (restockSession && restockSession.totalScans > 0) {
      if (!window.confirm('Cancel restock session? All scanned data will be lost.')) return;
    }
    setRestockSession(null);
    setRestockLastScan(null);
    setShowRestockConfirm(false);
  };

  const handleFinishRestock = async () => {
    if (!restockSession || restockSession.entries.size === 0) return;
    setRestockSubmitting(true);
    setError('');

    try {
      const scannedProductIds = new Set<string>();
      const productStockMap = new Map<string, Record<string, number>>();
      restockSession.entries.forEach((entry) => {
        scannedProductIds.add(entry.productId);
        const existing = productStockMap.get(entry.productId) ?? {};
        existing[entry.size] = (existing[entry.size] ?? 0) + entry.count;
        productStockMap.set(entry.productId, existing);
      });

      // Build all updates (scanned + zeroed) into one array for the bulk endpoint
      const allUpdates: Array<{ productId: string; stock: Record<string, number> }> = [];

      for (const [productId, newStock] of productStockMap) {
        allUpdates.push({ productId, stock: newStock });
      }

      let zeroedCount = 0;
      for (const p of products) {
        if (scannedProductIds.has(p.id)) continue;
        const data = p as Record<string, unknown>;
        const stock = data.stock as Record<string, number> | undefined;
        if (!stock || typeof stock !== 'object') continue;
        const hasStock = Object.values(stock).some((qty) => typeof qty === 'number' && qty > 0);
        if (!hasStock) continue;
        const zeroed: Record<string, number> = {};
        Object.keys(stock).forEach((key) => { zeroed[key] = 0; });
        allUpdates.push({ productId: p.id, stock: zeroed });
        zeroedCount++;
      }

      const result = await bulkUpdateStock(restockSession.clientId, allUpdates);

      const totalScanned = restockSession.totalScans;
      const productsUpdated = productStockMap.size;
      setSaveSuccessMessage(
        `Restock complete: ${totalScanned} items scanned, ${productsUpdated} product${productsUpdated !== 1 ? 's' : ''} restocked` +
        (zeroedCount > 0 ? `, ${zeroedCount} zeroed.` : '.') +
        (result.failed > 0 ? ` (${result.failed} failed)` : '')
      );
      setTimeout(() => setSaveSuccessMessage(''), 8000);

      setRestockSession(null);
      setShowRestockConfirm(false);
      setRestockLastScan(null);
      await loadProducts();
    } catch (err) {
      setError(`Restock failed: ${(err as Error).message}`);
    } finally {
      setRestockSubmitting(false);
    }
  };

  const restockEntries = useMemo(() => {
    if (!restockSession) return [];
    return Array.from(restockSession.entries.values()).sort((a, b) => a.productName.localeCompare(b.productName));
  }, [restockSession]);

  const unscannedProducts = useMemo(() => {
    if (!restockSession) return [];
    const scannedIds = new Set(restockEntries.map((e) => e.productId));
    return products.filter((p) => {
      if (scannedIds.has(p.id)) return false;
      const data = p as Record<string, unknown>;
      const stock = data.stock as Record<string, number> | undefined;
      if (!stock || typeof stock !== 'object') return false;
      return Object.values(stock).some((qty) => typeof qty === 'number' && qty > 0);
    });
  }, [restockSession, restockEntries, products]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const q = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      const d = p as Record<string, unknown>;
      const name = String(d.name ?? '').toLowerCase();
      const sku = String(d.sku ?? '').toLowerCase();
      const barcode = String(d.barcode ?? '').toLowerCase();
      return name.includes(q) || sku.includes(q) || barcode.includes(q);
    });
  }, [products, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const paginatedProducts = useMemo(
    () => filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredProducts, currentPage]
  );

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedClientId]);

  const selectedProducts = useMemo(
    () => filteredProducts.filter((p) => selectedIds.has(p.id)),
    [filteredProducts, selectedIds]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingClients(true);
      setError('');
      try {
        const res = await listFulfillmentClients();
        if (cancelled) return;
        setClients(res.clients || []);
        if (res.clients?.length && !selectedClientId) {
          const restored = loadRestockFromStorage();
          const restoredClient = restored?.clientId && res.clients.some((c: FulfillmentClient) => c.id === restored.clientId)
            ? restored.clientId
            : res.clients[0].id;
          setSelectedClientId(restoredClient);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoadingClients(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedClientId) {
      setProducts([]);
      setSelectedIds(new Set());
      return;
    }
    let cancelled = false;
    async function load() {
      setLoadingProducts(true);
      setError('');
      try {
        const res = await listProducts(selectedClientId);
        if (cancelled) return;
        const list = res.products || [];
        setProducts(list.map((p) => normalizeProductFromApi(p as Record<string, unknown> & { id?: string }) as ProductWithStock));
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedClientId]);

  useEffect(() => {
    if (!selectedClientId) {
      setWarehouses([]);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoadingWarehouses(true);
      try {
        const res = await listWarehouses(selectedClientId);
        if (!cancelled) setWarehouses(res.warehouses || []);
      } catch {
        if (!cancelled) setWarehouses([]);
      } finally {
        if (!cancelled) setLoadingWarehouses(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedClientId]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const loadWarehouses = async () => {
    if (!selectedClientId) return;
    setLoadingWarehouses(true);
    try {
      const res = await listWarehouses(selectedClientId);
      setWarehouses(res.warehouses || []);
    } catch {
      setWarehouses([]);
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const loadProducts = useCallback(async (silent = false) => {
    if (!selectedClientId) return;
    if (!silent) setLoadingProducts(true);
    if (!silent) setError('');
    try {
      const res = await listProducts(selectedClientId);
      const list = res.products || [];
      setProducts(list.map((p) => normalizeProductFromApi(p as Record<string, unknown> & { id?: string }) as ProductWithStock));
    } catch (e) {
      if (!silent) setError((e as Error).message);
    } finally {
      if (!silent) setLoadingProducts(false);
    }
  }, [selectedClientId]);

  useLiveRefresh(() => loadProducts(true), 60_000, [selectedClientId]);
  useRefetchOnVisible(() => {
    if (selectedClientId) {
      loadProducts(true);
      loadWarehouses();
    }
  });
  useWarehouseLive(() => loadProducts(true), { type: 'products', clientId: selectedClientId || undefined });
  useWarehouseLive(() => loadProducts(true), { type: 'transactions', clientId: selectedClientId || undefined });
  useWarehouseLive(() => loadWarehouses(), { type: 'warehouses', clientId: selectedClientId || undefined });

  const handleOpenAdd = () => {
    setFormData(emptyForm);
    setVariants([emptyVariantFull()]);
    setFormError('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (p: ProductWithStock) => {
    setEditProduct(p);
    const normalized = normalizeProductFromApi(p as Record<string, unknown> & { id?: string });
    const barcode = String(normalized.barcode ?? '');
    setFormData({
      name: String(normalized.name ?? p.id),
      sku: String(normalized.sku ?? ''),
      barcode,
      warehouse: String(normalized.warehouse ?? ''),
    });
    setVariants(buildVariantsFromProductFull(normalized, barcode));
    setFormError('');
  };

  const handleCloseModals = () => {
    setShowAddModal(false);
    setEditProduct(null);
  };

  const handleDeleteProduct = async (p: ProductWithStock) => {
    if (!selectedClientId) return;
    const name = String((p as Record<string, unknown>).name ?? p.id);
    if (!window.confirm(`Delete product "${name}"? This cannot be undone.`)) return;
    setProductToDelete(p);
    setDeleting(true);
    try {
      await deleteProduct(selectedClientId, p.id);
      await loadProducts();
      setProductToDelete(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
      setProductToDelete(null);
    }
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;
    setFormError('');
    const nameTrim = formData.name.trim();
    if (!nameTrim) {
      setFormError('Name is required');
      return;
    }
    const isDuplicate = products.some((p) => {
      const existingName = String((p as Record<string, unknown>).name ?? '').trim().toLowerCase();
      return existingName === nameTrim.toLowerCase();
    });
    if (isDuplicate) {
      setFormError('A product with this name already exists for this client.');
      return;
    }
    setSubmitting(true);
    try {
      const { stock, sizeBarcodes } = buildStockPayloadFromVariantsFull(variants, formData.barcode);
      await createProduct(selectedClientId, {
        name: nameTrim,
        warehouse: formData.warehouse,
        barcode: formData.barcode.trim() || undefined,
        stock: { ...stock },
        sizeBarcodes: { ...sizeBarcodes },
      });
      handleCloseModals();
      await loadProducts();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !editProduct) return;
    setFormError('');
    setSubmitting(true);
    try {
      const { stock, sizeBarcodes } = buildStockPayloadFromVariantsFull(variants, formData.barcode);
      const payload = {
        name: formData.name,
        sku: formData.sku,
        barcode: formData.barcode,
        warehouse: formData.warehouse,
        stock: { ...stock },
        sizeBarcodes: { ...sizeBarcodes },
      };
      await updateProduct(selectedClientId, editProduct.id, payload);
      // Optimistic local update — no need to re-fetch the full list
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editProduct.id
            ? normalizeProductFromApi({ ...(p as Record<string, unknown>), ...payload, id: p.id } as Record<string, unknown> & { id?: string }) as ProductWithStock
            : p
        )
      );
      handleCloseModals();
      setSaveSuccessMessage('Saved.');
      setTimeout(() => setSaveSuccessMessage(''), 3000);
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenWarehouseModal = () => {
    setWarehouseForm({ name: '', code: '' });
    setWarehouseFormError('');
    setShowWarehouseModal(true);
  };

  const handleSubmitWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !warehouseForm.name.trim()) return;
    setWarehouseFormError('');
    setSubmittingWarehouse(true);
    try {
      await createWarehouse(selectedClientId, {
        name: warehouseForm.name.trim(),
        code: warehouseForm.code.trim() || undefined,
      });
      setShowWarehouseModal(false);
      await loadWarehouses();
    } catch (e) {
      setWarehouseFormError((e as Error).message);
    } finally {
      setSubmittingWarehouse(false);
    }
  };

  const getWarehouseDisplay = (warehouseIdOrName: string | undefined) => {
    if (!warehouseIdOrName) return '-';
    const w = warehouses.find((wh) => wh.id === warehouseIdOrName || wh.name === warehouseIdOrName);
    return w ? w.name : warehouseIdOrName;
  };

  const handleBulkAssignWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !assignWarehouseId || selectedProducts.length === 0) return;
    setSubmittingBulkAssign(true);
    try {
      for (const p of selectedProducts) {
        await updateProduct(selectedClientId, p.id, { warehouse: assignWarehouseId });
      }
      setShowAssignWarehouseModal(false);
      setAssignWarehouseId('');
      setSelectedIds(new Set());
      await loadProducts();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmittingBulkAssign(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedClientId || selectedProducts.length === 0) return;
    const n = selectedProducts.length;
    if (!window.confirm(`Delete ${n} selected product${n !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    setBulkActionOpen(false);
    setDeletingBulk(true);
    setError('');
    try {
      for (const p of selectedProducts) {
        await deleteProduct(selectedClientId, p.id);
      }
      setSelectedIds(new Set());
      await loadProducts();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeletingBulk(false);
    }
  };

  const handleExportExcel = async (selectedOnly: boolean) => {
    setExportDropdownOpen(false);
    const list = selectedOnly ? selectedProducts : filteredProducts;
    if (list.length === 0) {
      alert(selectedOnly ? 'Select products to export.' : 'No products to export.');
      return;
    }
    setExporting(true);
    try {
      await exportProductsToExcel(list as ProductRow[]);
      alert(`Exported ${list.length} product(s) to Excel.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClientId) return;
    const valid = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
    if (!valid.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      alert('Please select a valid Excel file (.xlsx, .xls, or .csv).');
      return;
    }
    setImporting(true);
    setError('');
    try {
      const raw = await importProductsFromExcel(file);
      const toImport = parseExcelDataToProducts(raw);
      if (toImport.length === 0) {
        alert('No valid products found in the file. Check column names: Product Name, SKU, Main Barcode, Size, Quantity, Size Barcode, Warehouse.');
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      let created = 0;
      let updated = 0;
      let failed = 0;
      for (const prod of toImport) {
        try {
          const existing = products.find(
            (p) =>
              (prod.sku && String((p as Record<string, unknown>).sku ?? '').trim() === prod.sku.trim()) ||
              String((p as Record<string, unknown>).name ?? '').trim().toLowerCase() === prod.name.trim().toLowerCase()
          );
          if (existing) {
            await updateProduct(selectedClientId, existing.id, {
              name: prod.name,
              sku: prod.sku,
              barcode: prod.barcode,
              warehouse: prod.warehouse,
              stock: Object.keys(prod.stock).length ? prod.stock : undefined,
              sizeBarcodes: Object.keys(prod.sizeBarcodes).length ? prod.sizeBarcodes : undefined,
            });
            updated++;
          } else {
            await createProduct(selectedClientId, {
              name: prod.name,
              sku: prod.sku,
              barcode: prod.barcode,
              warehouse: prod.warehouse,
              stock: prod.stock,
              sizeBarcodes: prod.sizeBarcodes,
            });
            created++;
          }
        } catch {
          failed++;
        }
      }
      await loadProducts();
      alert(`Import done: ${created} created, ${updated} updated${failed ? `, ${failed} failed` : ''}.`);
    } catch (err) {
      setError((err as Error).message);
      alert('Import failed. Check file format.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-w-0">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Warehouse products</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
        Products you have added to your warehouses. Select a client to see and manage their products.
      </p>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 mb-6">
          {error}
        </div>
      )}

      {/* Client selector */}
      <div className="mb-6 sm:mb-8">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client</label>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-md">
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              disabled={loadingClients || !!restockSession}
              className="w-full appearance-none px-4 py-3 pr-10 rounded-xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50 min-h-[44px]"
            >
              <option value="">
                {loadingClients ? 'Loading clients...' : clients.length === 0 ? 'No fulfillment clients' : 'Select a client'}
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.id}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400 pointer-events-none" />
          </div>
          {isAdmin && selectedClientId && !restockSession && (
            <button
              type="button"
              onClick={handleStartRestock}
              disabled={loadingProducts || products.length === 0}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ScanBarcode className="w-5 h-5" />
              Restock
            </button>
          )}
        </div>
      </div>

      {/* Restock Session */}
      {restockSession && (
        <div className="mb-8 rounded-xl border-2 border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-500/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/20">
                <ScanBarcode className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Restock Session</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {restockSession.clientName} &middot; Started {restockSession.startedAt.toLocaleTimeString()}
                  &middot; {restockSession.totalScans} scans
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (restockSession.entries.size === 0) {
                    alert('No items scanned yet.');
                    return;
                  }
                  setShowRestockConfirm(true);
                }}
                disabled={restockSubmitting || restockSession.entries.size === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Finish Restock
              </button>
              <button
                type="button"
                onClick={handleCancelRestock}
                disabled={restockSubmitting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-medium text-sm border border-gray-300 dark:border-white/10"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>

          {/* Scanner input */}
          <div className="relative mb-4">
            <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500 pointer-events-none" />
            <input
              ref={restockInputRef}
              type="text"
              value={restockScanInput}
              onChange={(e) => setRestockScanInput(e.target.value)}
              onKeyDown={handleRestockScanKeyDown}
              placeholder="Scan barcode or type and press Enter..."
              autoFocus
              className="w-full pl-11 pr-4 py-3 rounded-lg border-2 border-emerald-500/40 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-base font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            />
          </div>

          {/* Last scan feedback */}
          {restockLastScan && (
            <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 ${
              restockLastScan.matched
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400'
            }`}>
              <span className="font-mono text-xs">{restockLastScan.barcode}</span>
              <span>&rarr;</span>
              <span>{restockLastScan.detail}</span>
            </div>
          )}

          {/* Scanned items table */}
          {restockEntries.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Product</th>
                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Size</th>
                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Barcode</th>
                    <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Scanned Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {restockEntries.map((entry) => (
                    <tr key={`${entry.productId}::${entry.size}`} className="border-b border-gray-100 dark:border-white/5 last:border-0">
                      <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">{entry.productName}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{entry.size}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 font-mono text-xs">{entry.barcode}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                          {entry.count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                    <td colSpan={3} className="py-3 px-4 text-gray-700 dark:text-gray-300 font-medium">Total</td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {restockEntries.reduce((sum, e) => sum + e.count, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
              Start scanning barcodes. Each scan adds to the restock count.
            </div>
          )}
        </div>
      )}

      {/* Warehouses section */}
      {selectedClientId && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Warehouses</h2>
            <button
              onClick={handleOpenWarehouseModal}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-medium border border-gray-300 dark:border-white/10"
            >
              <WarehouseIcon className="w-4 h-4" />
              Add Warehouse
            </button>
          </div>
          {loadingWarehouses ? (
            <div className="py-4 text-sm text-gray-500 dark:text-gray-400">Loading warehouses...</div>
          ) : warehouses.length === 0 ? (
            <div className="py-6 px-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 text-sm">
              No warehouses yet. Add a warehouse to assign products to storage locations.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {warehouses.map((wh) => (
                <span
                  key={wh.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-sm"
                >
                  <WarehouseIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  {wh.name}
                  {wh.code && (
                    <span className="text-gray-500 dark:text-gray-400 font-mono text-xs">({wh.code})</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inventory table */}
      {selectedClientId && (
        <div>
          {saveSuccessMessage && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-sm">
              {saveSuccessMessage}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {selectedClient?.name || selectedClientId} – Products in warehouse
            </h2>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 min-w-0 sm:flex-initial sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, SKU, barcode..."
                  className="w-full pl-9 pr-4 py-2.5 sm:py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportExcel}
                className="hidden"
                aria-hidden
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing || !selectedClientId}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-medium border border-gray-300 dark:border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                {importing ? 'Importing...' : 'Upload Excel'}
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportDropdownOpen((o) => !o)}
                  disabled={exporting || filteredProducts.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-medium border border-gray-300 dark:border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  {exporting ? 'Exporting...' : `Export${selectedProducts.length > 0 ? ` (${selectedProducts.length})` : ''}`}
                  <ChevronDown className={`w-4 h-4 transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {exportDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" aria-hidden onClick={() => setExportDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 min-w-[200px] py-1 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1b3e] shadow-lg">
                      <button
                        type="button"
                        onClick={() => handleExportExcel(false)}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                      >
                        Export all products
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportExcel(true)}
                        disabled={selectedProducts.length === 0}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50"
                      >
                        Export selected ({selectedProducts.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => { downloadProductTemplate(); setExportDropdownOpen(false); }}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                      >
                        Download template
                      </button>
                    </div>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                disabled={selectedProducts.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-medium border border-gray-300 dark:border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="w-4 h-4" />
                Print labels{selectedProducts.length > 0 ? ` (${selectedProducts.length})` : ''}
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => selectedProducts.length > 0 && setBulkActionOpen((o) => !o)}
                  disabled={selectedProducts.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-medium border border-gray-300 dark:border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Bulk actions
                  {selectedProducts.length > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium">
                      {selectedProducts.length}
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 transition-transform ${bulkActionOpen ? 'rotate-180' : ''}`} />
                </button>
                {bulkActionOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      aria-hidden
                      onClick={() => setBulkActionOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 z-20 min-w-[200px] py-1 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1b3e] shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAssignWarehouseModal(true);
                          setAssignWarehouseId('');
                          setBulkActionOpen(false);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                      >
                        <WarehouseIcon className="w-4 h-4" />
                        Assign to warehouse
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkDelete}
                        disabled={deletingBulk}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deletingBulk ? 'Deleting...' : 'Delete selected'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedIds(new Set());
                          setBulkActionOpen(false);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                      >
                        Clear selection
                      </button>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0a0b1a] font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </div>
          </div>

          {loadingProducts ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 px-6 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-center text-gray-500 dark:text-gray-400">
              {products.length === 0
                ? 'No products in warehouse for this client. Add products to get started.'
                : `No products match "${searchTerm}". Try a different search.`}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10">
                    <th className="w-10 py-4 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 dark:border-white/20 text-amber-500 focus:ring-amber-500/50"
                      />
                    </th>
                    <th className="text-left py-4 px-5 text-gray-500 dark:text-gray-400 font-medium">Product</th>
                    <th className="text-left py-4 px-5 text-gray-500 dark:text-gray-400 font-medium">SKU</th>
                    <th className="text-left py-4 px-5 text-gray-500 dark:text-gray-400 font-medium">Barcode</th>
                    <th className="text-left py-4 px-5 text-gray-500 dark:text-gray-400 font-medium">Warehouse</th>
                    <th className="text-left py-4 px-5 text-gray-500 dark:text-gray-400 font-medium">ID</th>
                    <th className="text-right py-4 px-5 text-gray-500 dark:text-gray-400 font-medium">Quantity</th>
                    <th className="text-right py-4 px-5 text-gray-500 dark:text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((p) => {
                    const data = p as Record<string, unknown>;
                    const isSelected = selectedIds.has(p.id);
                    return (
                      <tr
                        key={p.id}
                        className={`border-b border-gray-100 dark:border-white/5 last:border-0 ${isSelected ? 'bg-amber-500/5' : ''}`}
                      >
                        <td className="w-10 py-4 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(p.id)}
                            className="rounded border-gray-300 dark:border-white/20 text-amber-500 focus:ring-amber-500/50"
                          />
                        </td>
                        <td className="py-4 px-5 text-gray-900 dark:text-white font-medium">{data.name ?? p.id}</td>
                        <td className="py-4 px-5 text-gray-600 dark:text-gray-300">{data.sku ?? '-'}</td>
                        <td className="py-4 px-5 text-gray-600 dark:text-gray-300 font-mono text-xs">{data.barcode ?? '-'}</td>
                        <td className="py-4 px-5 text-gray-600 dark:text-gray-300">
                          {getWarehouseDisplay(String(data.warehouse ?? ''))}
                        </td>
                        <td className="py-4 px-5 text-gray-500 dark:text-gray-400 font-mono text-xs">{p.id}</td>
                        <td className="py-4 px-5 text-right">
                          {(() => {
                            const rawStock = (data.stock ?? (p as Record<string, unknown>).stock) as Record<string, number> | undefined;
                            const stockObj =
                              rawStock != null && typeof rawStock === 'object' && !Array.isArray(rawStock)
                                ? rawStock
                                : {};
                            const sizeEntries = Object.entries(stockObj).filter(([k]) => k != null);
                            if (sizeEntries.length === 0) {
                              return <span className="text-gray-500 dark:text-gray-400">—</span>;
                            }
                            return (
                              <span className="inline-flex flex-col items-end gap-0.5">
                                {sizeEntries.map(([size, qty]) => (
                                  <span
                                    key={String(size)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                  >
                                    {String(size).includes('|') ? String(size).replace('|', ' → ') : String(size)}: {Number(qty) ?? 0}
                                  </span>
                                ))}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-2 rounded-lg text-gray-500 hover:text-amber-500 dark:text-gray-400 dark:hover:text-amber-400 hover:bg-amber-500/10 transition"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p)}
                              disabled={deleting && productToDelete?.id === p.id}
                              className="p-2 rounded-lg text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {totalPages > 1 && (
                <nav className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-white/10">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredProducts.length)} of {filteredProducts.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </nav>
              )}
            </div>
          )}
        </div>
      )}

      {!selectedClientId && !loadingClients && clients.length === 0 && (
        <div className="py-12 px-6 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-center">
          No clients are subscribed to the fulfillment service. Add fulfillment to a client in the admin dashboard.
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1b3e] rounded-xl border border-gray-200 dark:border-white/10 max-w-xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Product</h2>
            <form onSubmit={handleSubmitAdd} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                SKU and barcode are auto-generated per client. Optionally set a base barcode for variant barcodes below.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Base barcode (optional)</label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData((d) => ({ ...d, barcode: e.target.value }))}
                  placeholder="e.g. 123456789012 – used as prefix for variant barcodes"
                  className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Warehouse</label>
                <select
                  value={formData.warehouse}
                  onChange={(e) => setFormData((d) => ({ ...d, warehouse: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white"
                >
                  <option value="">— None —</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                      {wh.code ? ` (${wh.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <SizeVariantsEditorFull
                variants={variants}
                onVariantsChange={setVariants}
                mainBarcode={formData.barcode}
                onMainBarcodeChange={(v) => setFormData((d) => ({ ...d, barcode: v }))}
                disabled={submitting}
              />
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0a0b1a] font-medium disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModals}
                  className="px-5 py-2.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1b3e] rounded-xl border border-gray-200 dark:border-white/10 max-w-xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit Product</h2>
            <form onSubmit={handleSubmitEdit} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">SKU</label>
                  <div className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-600 dark:text-gray-400 text-sm font-mono">
                    {formData.sku || '-'}
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Barcode</label>
                  <div className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-600 dark:text-gray-400 text-sm font-mono">
                    {formData.barcode || '-'}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Warehouse</label>
                <select
                  value={formData.warehouse}
                  onChange={(e) => setFormData((d) => ({ ...d, warehouse: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white"
                >
                  <option value="">— None —</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                      {wh.code ? ` (${wh.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <SizeVariantsEditorFull
                variants={variants}
                onVariantsChange={setVariants}
                mainBarcode={formData.barcode}
                onMainBarcodeChange={(v) => setFormData((d) => ({ ...d, barcode: v }))}
                disabled={submitting}
              />
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0a0b1a] font-medium disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModals}
                  className="px-5 py-2.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Warehouse Modal */}
      {showWarehouseModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1b3e] rounded-xl border border-gray-200 dark:border-white/10 max-w-md w-full p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Warehouse</h2>
            <form onSubmit={handleSubmitWarehouse} className="space-y-4">
              {warehouseFormError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm">
                  {warehouseFormError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name *</label>
                <input
                  type="text"
                  value={warehouseForm.name}
                  onChange={(e) => setWarehouseForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white"
                  placeholder="e.g. Main Warehouse"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Code (optional)</label>
                <input
                  type="text"
                  value={warehouseForm.code}
                  onChange={(e) => setWarehouseForm((f) => ({ ...f, code: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white"
                  placeholder="e.g. WH-001"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submittingWarehouse}
                  className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0a0b1a] font-medium disabled:opacity-50"
                >
                  {submittingWarehouse ? 'Adding...' : 'Add Warehouse'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowWarehouseModal(false)}
                  disabled={submittingWarehouse}
                  className="px-5 py-2.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign to warehouse modal (bulk) */}
      {showAssignWarehouseModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1b3e] rounded-xl border border-gray-200 dark:border-white/10 max-w-md w-full p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Assign to warehouse</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Assign {selectedProducts.length} selected product{selectedProducts.length !== 1 ? 's' : ''} to a warehouse.
            </p>
            <form onSubmit={handleBulkAssignWarehouse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Warehouse</label>
                <select
                  value={assignWarehouseId}
                  onChange={(e) => setAssignWarehouseId(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white"
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                      {wh.code ? ` (${wh.code})` : ''}
                    </option>
                  ))}
                </select>
                {warehouses.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Add warehouses first above.</p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submittingBulkAssign || !assignWarehouseId || warehouses.length === 0}
                  className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0a0b1a] font-medium disabled:opacity-50"
                >
                  {submittingBulkAssign ? 'Assigning...' : 'Assign'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAssignWarehouseModal(false); setAssignWarehouseId(''); }}
                  disabled={submittingBulkAssign}
                  className="px-5 py-2.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BarcodePrintModal
        open={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        products={selectedProducts}
        brandName={selectedClient?.name || selectedClientId || ''}
      />

      {/* Restock Confirmation Modal */}
      {showRestockConfirm && restockSession && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1b3e] rounded-xl border border-gray-200 dark:border-white/10 max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/20">
                <RotateCcw className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Confirm Restock</h2>
            </div>
            <div className="mb-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm">
              <strong>Warning:</strong> This will <strong>replace</strong> the existing stock for scanned products with the scanned quantities.
              {unscannedProducts.length > 0 && (
                <> Products <strong>not scanned</strong> will have their stock <strong>set to 0</strong> (out of stock).</>
              )}
            </div>
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p><strong>Client:</strong> {restockSession.clientName}</p>
              <p><strong>Total scans:</strong> {restockSession.totalScans}</p>
              <p><strong>Products restocked:</strong> {new Set(restockEntries.map((e) => e.productId)).size}</p>
              {unscannedProducts.length > 0 && (
                <p className="text-red-600 dark:text-red-400">
                  <strong>Products zeroed (not scanned):</strong> {unscannedProducts.length}
                </p>
              )}
            </div>
            <div className="max-h-40 overflow-y-auto mb-3 rounded-lg border border-gray-200 dark:border-white/10">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 dark:bg-white/5">
                  <tr>
                    <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400">Product</th>
                    <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400">Size</th>
                    <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400">New Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {restockEntries.map((entry) => (
                    <tr key={`${entry.productId}::${entry.size}`} className="border-t border-gray-100 dark:border-white/5">
                      <td className="py-2 px-3 text-gray-900 dark:text-white">{entry.productName}</td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-300">{entry.size}</td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{entry.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {unscannedProducts.length > 0 && (
              <div className="max-h-32 overflow-y-auto mb-4 rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5">
                <p className="sticky top-0 bg-red-50 dark:bg-red-500/10 text-xs font-semibold text-red-600 dark:text-red-400 py-2 px-3 border-b border-red-200 dark:border-red-500/20">
                  Will be set to 0 stock:
                </p>
                {unscannedProducts.map((p) => {
                  const data = p as Record<string, unknown>;
                  return (
                    <div key={p.id} className="flex items-center justify-between py-1.5 px-3 border-t border-red-100 dark:border-red-500/10 first:border-t-0 text-xs">
                      <span className="text-gray-900 dark:text-white">{String(data.name ?? p.id)}</span>
                      <span className="text-red-500 font-medium">0</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleFinishRestock}
                disabled={restockSubmitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50"
              >
                {restockSubmitting ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    Updating stock...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirm & Apply
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowRestockConfirm(false)}
                disabled={restockSubmitting}
                className="px-5 py-2.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
