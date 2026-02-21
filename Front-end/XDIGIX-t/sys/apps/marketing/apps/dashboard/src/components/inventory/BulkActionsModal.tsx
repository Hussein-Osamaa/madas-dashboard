import { useState } from 'react';
import clsx from 'clsx';

type BulkAction = 'delete' | 'status' | 'category' | 'price' | 'lowStockAlert' | null;

type Props = {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  onDelete: () => void;
  onUpdateStatus: (status: string) => void;
  onUpdateCategory: (category: string) => void;
  onUpdatePrice: (price: number, priceType: 'price' | 'sellingPrice') => void;
  onUpdateLowStockAlert?: (threshold: number) => void;
  processing?: boolean;
};

const BulkActionsModal = ({
  open,
  onClose,
  selectedCount,
  onDelete,
  onUpdateStatus,
  onUpdateCategory,
  onUpdatePrice,
  onUpdateLowStockAlert,
  processing = false
}: Props) => {
  const [action, setAction] = useState<BulkAction>(null);
  const [status, setStatus] = useState('active');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [priceType, setPriceType] = useState<'price' | 'sellingPrice'>('price');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lowStockAlert, setLowStockAlert] = useState('10');

  if (!open) return null;

  const handleActionSelect = (selectedAction: BulkAction) => {
    setAction(selectedAction);
    setConfirmDelete(false);
    if (selectedAction === 'status') {
      setStatus('active');
    } else if (selectedAction === 'category') {
      setCategory('');
    } else if (selectedAction === 'price') {
      setPrice('');
      setPriceType('price');
    } else if (selectedAction === 'lowStockAlert') {
      setLowStockAlert('10');
    }
  };

  const handleSubmit = () => {
    if (action === 'delete' && confirmDelete) {
      onDelete();
      handleClose();
    } else if (action === 'status') {
      onUpdateStatus(status);
      handleClose();
    } else if (action === 'category' && category.trim()) {
      onUpdateCategory(category.trim());
      handleClose();
    } else if (action === 'price' && price.trim()) {
      const priceValue = parseFloat(price);
      if (!isNaN(priceValue) && priceValue >= 0) {
        onUpdatePrice(priceValue, priceType);
        handleClose();
      }
    } else if (action === 'lowStockAlert' && lowStockAlert.trim() && onUpdateLowStockAlert) {
      const threshold = parseInt(lowStockAlert, 10);
      if (!isNaN(threshold) && threshold >= 0) {
        onUpdateLowStockAlert(threshold);
        handleClose();
      }
    }
  };

  const handleClose = () => {
    setAction(null);
    setStatus('active');
    setCategory('');
    setPrice('');
    setPriceType('price');
    setConfirmDelete(false);
    setLowStockAlert('10');
    onClose();
  };

  const canSubmit = () => {
    if (action === 'delete') return confirmDelete;
    if (action === 'status') return true;
    if (action === 'category') return category.trim().length > 0;
    if (action === 'price') {
      const priceValue = parseFloat(price);
      return price.trim().length > 0 && !isNaN(priceValue) && priceValue >= 0;
    }
    if (action === 'lowStockAlert') {
      const threshold = parseInt(lowStockAlert, 10);
      return lowStockAlert.trim().length > 0 && !isNaN(threshold) && threshold >= 0;
    }
    return false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
        <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-primary">Bulk Actions</h2>
            <p className="text-xs text-madas-text/60">
              {selectedCount} product{selectedCount !== 1 ? 's' : ''} selected
            </p>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-madas-text/60 transition-colors hover:bg-base"
            onClick={handleClose}
            disabled={processing}
          >
            <span className="material-icons">close</span>
          </button>
        </header>

        <div className="px-6 py-6 space-y-4">
          {!action ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleActionSelect('delete')}
                className="w-full flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left transition-colors hover:bg-red-100"
                disabled={processing}
              >
                <span className="material-icons text-red-600">delete</span>
                <div className="flex-1">
                  <div className="font-medium text-red-900">Delete Products</div>
                  <div className="text-xs text-red-700">Permanently remove selected products</div>
                </div>
                <span className="material-icons text-red-600">chevron_right</span>
              </button>

              <button
                type="button"
                onClick={() => handleActionSelect('status')}
                className="w-full flex items-center gap-3 rounded-lg border border-gray-200 bg-base px-4 py-3 text-left transition-colors hover:bg-gray-100"
                disabled={processing}
              >
                <span className="material-icons text-primary">toggle_on</span>
                <div className="flex-1">
                  <div className="font-medium text-madas-text">Update Status</div>
                  <div className="text-xs text-madas-text/70">Change status for all selected products</div>
                </div>
                <span className="material-icons text-madas-text/60">chevron_right</span>
              </button>

              <button
                type="button"
                onClick={() => handleActionSelect('category')}
                className="w-full flex items-center gap-3 rounded-lg border border-gray-200 bg-base px-4 py-3 text-left transition-colors hover:bg-gray-100"
                disabled={processing}
              >
                <span className="material-icons text-primary">category</span>
                <div className="flex-1">
                  <div className="font-medium text-madas-text">Update Category</div>
                  <div className="text-xs text-madas-text/70">Set category for all selected products</div>
                </div>
                <span className="material-icons text-madas-text/60">chevron_right</span>
              </button>

              <button
                type="button"
                onClick={() => handleActionSelect('price')}
                className="w-full flex items-center gap-3 rounded-lg border border-gray-200 bg-base px-4 py-3 text-left transition-colors hover:bg-gray-100"
                disabled={processing}
              >
                <span className="material-icons text-primary">attach_money</span>
                <div className="flex-1">
                  <div className="font-medium text-madas-text">Update Price</div>
                  <div className="text-xs text-madas-text/70">Set price for all selected products</div>
                </div>
                <span className="material-icons text-madas-text/60">chevron_right</span>
              </button>

              {onUpdateLowStockAlert && (
                <button
                  type="button"
                  onClick={() => handleActionSelect('lowStockAlert')}
                  className="w-full flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-left transition-colors hover:bg-orange-100"
                  disabled={processing}
                >
                  <span className="material-icons text-orange-600">warning</span>
                  <div className="flex-1">
                    <div className="font-medium text-orange-900">Update Low Stock Alert</div>
                    <div className="text-xs text-orange-700">Set alert threshold for all selected products</div>
                  </div>
                  <span className="material-icons text-orange-600">chevron_right</span>
                </button>
              )}
            </div>
          ) : action === 'delete' ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <span className="material-icons text-red-600">warning</span>
                  <div className="flex-1">
                    <div className="font-semibold text-red-900 mb-1">Delete {selectedCount} product{selectedCount !== 1 ? 's' : ''}?</div>
                    <div className="text-sm text-red-700">
                      This action cannot be undone. All selected products will be permanently deleted.
                    </div>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  disabled={processing}
                />
                <span className="text-sm text-madas-text">
                  I understand this action cannot be undone
                </span>
              </label>
            </div>
          ) : action === 'status' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-madas-text mb-2">
                  Select Status
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-gray-200 bg-base px-4 py-3 hover:bg-gray-100 transition-colors">
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={status === 'active'}
                      onChange={(e) => setStatus(e.target.value)}
                      className="h-4 w-4 rounded-full border-2 border-gray-300 text-primary focus:ring-primary"
                      disabled={processing}
                    />
                    <span className="material-icons text-green-600">check_circle</span>
                    <span className="flex-1 text-madas-text font-medium">Active</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-gray-200 bg-base px-4 py-3 hover:bg-gray-100 transition-colors">
                    <input
                      type="radio"
                      name="status"
                      value="inactive"
                      checked={status === 'inactive'}
                      onChange={(e) => setStatus(e.target.value)}
                      className="h-4 w-4 rounded-full border-2 border-gray-300 text-primary focus:ring-primary"
                      disabled={processing}
                    />
                    <span className="material-icons text-gray-400">cancel</span>
                    <span className="flex-1 text-madas-text font-medium">Inactive</span>
                  </label>
                </div>
              </div>
            </div>
          ) : action === 'category' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-madas-text mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Enter category name"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-madas-text placeholder:text-madas-text/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={processing}
                  autoFocus
                />
              </div>
            </div>
          ) : action === 'price' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-madas-text mb-2">
                  Price Type
                </label>
                <div className="space-y-2 mb-4">
                  <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-gray-200 bg-base px-4 py-3 hover:bg-gray-100 transition-colors">
                    <input
                      type="radio"
                      name="priceType"
                      value="price"
                      checked={priceType === 'price'}
                      onChange={(e) => setPriceType(e.target.value as 'price' | 'sellingPrice')}
                      className="h-4 w-4 rounded-full border-2 border-gray-300 text-primary focus:ring-primary"
                      disabled={processing}
                    />
                    <span className="material-icons text-primary">price_check</span>
                    <span className="flex-1 text-madas-text font-medium">Price</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-gray-200 bg-base px-4 py-3 hover:bg-gray-100 transition-colors">
                    <input
                      type="radio"
                      name="priceType"
                      value="sellingPrice"
                      checked={priceType === 'sellingPrice'}
                      onChange={(e) => setPriceType(e.target.value as 'price' | 'sellingPrice')}
                      className="h-4 w-4 rounded-full border-2 border-gray-300 text-primary focus:ring-primary"
                      disabled={processing}
                    />
                    <span className="material-icons text-primary">sell</span>
                    <span className="flex-1 text-madas-text font-medium">Selling Price</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text mb-2">
                  {priceType === 'price' ? 'Price' : 'Selling Price'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-madas-text/60">$</span>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-gray-200 bg-white pl-8 pr-4 py-2.5 text-sm text-madas-text placeholder:text-madas-text/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={processing}
                    autoFocus
                  />
                </div>
                <p className="mt-2 text-xs text-madas-text/60">
                  This {priceType === 'price' ? 'price' : 'selling price'} will be applied to all {selectedCount} selected product{selectedCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          ) : action === 'lowStockAlert' ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                <div className="flex items-start gap-3">
                  <span className="material-icons text-orange-600">warning</span>
                  <div className="flex-1">
                    <div className="font-semibold text-orange-900 mb-1">Low Stock Alert Threshold</div>
                    <div className="text-sm text-orange-700">
                      Products will be flagged as "Low Stock" when their quantity falls below this number.
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text mb-2">
                  Alert Threshold
                </label>
                <div className="relative">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-madas-text/40">inventory_2</span>
                  <input
                    type="number"
                    value={lowStockAlert}
                    onChange={(e) => setLowStockAlert(e.target.value)}
                    placeholder="10"
                    min="0"
                    className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-madas-text placeholder:text-madas-text/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={processing}
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text mb-2">
                  Quick Presets
                </label>
                <div className="flex flex-wrap gap-2">
                  {[5, 10, 15, 20, 25, 50].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLowStockAlert(value.toString())}
                      disabled={processing}
                      className={clsx(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                        lowStockAlert === value.toString()
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-madas-text hover:bg-gray-200"
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-madas-text/60">
                This threshold will be applied to all {selectedCount} selected product{selectedCount !== 1 ? 's' : ''}
              </p>
            </div>
          ) : null}

          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-madas-text transition-colors hover:bg-base"
              disabled={processing}
            >
              Cancel
            </button>
            {action && (
              <button
                type="button"
                onClick={() => setAction(null)}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-madas-text transition-colors hover:bg-base"
                disabled={processing}
              >
                Back
              </button>
            )}
            {action && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit() || processing}
                className={clsx(
                  'flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors',
                  action === 'delete'
                    ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-300'
                    : 'bg-primary hover:bg-[#1f3c19] disabled:bg-primary/50'
                )}
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="material-icons animate-spin text-base">progress_activity</span>
                    Processing...
                  </span>
                ) : action === 'delete' ? (
                  'Delete Products'
                ) : action === 'status' ? (
                  'Update Status'
                ) : action === 'category' ? (
                  'Update Category'
                ) : action === 'lowStockAlert' ? (
                  'Update Alert Threshold'
                ) : (
                  'Update Price'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkActionsModal;

