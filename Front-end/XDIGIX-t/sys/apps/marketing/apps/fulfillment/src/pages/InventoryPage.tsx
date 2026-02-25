import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { useWarehouseLive } from '../hooks/useWarehouseLive';
import { Package, ChevronDown, Plus, Pencil, Warehouse as WarehouseIcon, Search, Printer } from 'lucide-react';
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
  type FulfillmentClient,
  type ProductWithStock,
  type Warehouse,
} from '../lib/api';

const emptyForm = { name: '', sku: '', barcode: '', warehouse: '' };

export default function InventoryPage() {
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
          setSelectedClientId(res.clients[0].id);
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

  useLiveRefresh(() => loadProducts(true), 30_000, [selectedClientId]);
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
      await updateProduct(selectedClientId, editProduct.id, {
        name: formData.name,
        sku: formData.sku,
        barcode: formData.barcode,
        warehouse: formData.warehouse,
        stock: { ...stock },
        sizeBarcodes: { ...sizeBarcodes },
      });
      handleCloseModals();
      setSaveSuccessMessage('Saved. Refreshing list…');
      await loadProducts();
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
        <div className="relative w-full max-w-md">
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            disabled={loadingClients}
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
      </div>

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
                  {filteredProducts.map((p) => {
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
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-2 rounded-lg text-gray-500 hover:text-amber-500 dark:text-gray-400 dark:hover:text-amber-400 hover:bg-amber-500/10 transition"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
    </div>
  );
}
