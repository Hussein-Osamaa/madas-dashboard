import { useEffect } from 'react';
import clsx from 'clsx';
import { useCurrency } from '../../hooks/useCurrency';

type ScanResult = {
  productName: string;
  type: 'order' | 'return';
  previousStock: number;
  newStock: number;
  price?: number;
  size?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  result: ScanResult | null;
  autoCloseDelay?: number;
};

const ScanSuccessModal = ({ open, onClose, result, autoCloseDelay = 3000 }: Props) => {
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    if (open && result && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [open, result, autoCloseDelay, onClose]);

  if (!open || !result) {
    return null;
  }

  const stockChange = result.newStock - result.previousStock;
  const isIncrease = stockChange > 0;
  const isDecrease = stockChange < 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-card animate-in fade-in zoom-in duration-200">
        <div className="p-6 sm:p-8">
          {/* Success Icon */}
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-4">
              <span className="material-icons text-4xl text-green-600">check_circle</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-semibold text-primary text-center mb-2">
            Process Complete!
          </h2>
          <p className="text-sm text-madas-text/70 text-center mb-6">
            The scan has been successfully processed.
          </p>

          {/* Product Info */}
          <div className="bg-base/40 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-madas-text/70">Product:</span>
              <span className="text-sm font-semibold text-primary">{result.productName}</span>
            </div>
            {result.size && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-madas-text/70">Size:</span>
                <span className="text-sm text-madas-text/80">{result.size}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-madas-text/70">Type:</span>
              <span
                className={clsx(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold capitalize',
                  result.type === 'order' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                )}
              >
                <span className="material-icons text-xs">
                  {result.type === 'order' ? 'trending_down' : 'trending_up'}
                </span>
                {result.type}
              </span>
            </div>
          </div>

          {/* Stock Change with Arrow */}
          <div className="bg-base/40 rounded-xl p-4 mb-4">
            <div className="text-center mb-3">
              <span className="text-sm font-medium text-madas-text/70">Stock Change</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="text-center">
                <div className="text-xs text-madas-text/60 mb-1">Previous</div>
                <div className="text-lg font-semibold text-madas-text/80">{result.previousStock}</div>
              </div>
              <div className="flex flex-col items-center">
                <span
                  className={clsx(
                    'material-icons text-3xl',
                    isIncrease ? 'text-green-600' : isDecrease ? 'text-orange-600' : 'text-madas-text/60'
                  )}
                >
                  {isIncrease ? 'arrow_upward' : isDecrease ? 'arrow_downward' : 'arrow_forward'}
                </span>
                <span
                  className={clsx(
                    'text-sm font-semibold mt-1',
                    isIncrease ? 'text-green-600' : isDecrease ? 'text-orange-600' : 'text-madas-text/70'
                  )}
                >
                  {stockChange > 0 ? '+' : ''}
                  {stockChange}
                </span>
              </div>
              <div className="text-center">
                <div className="text-xs text-madas-text/60 mb-1">New</div>
                <div className="text-lg font-semibold text-primary">{result.newStock}</div>
              </div>
            </div>
          </div>

          {/* Price */}
          {result.price !== undefined && (
            <div className="bg-base/40 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-madas-text/70">Price:</span>
                <span className="text-sm font-semibold text-primary">{formatCurrency(result.price)}</span>
              </div>
            </div>
          )}

          {/* Close Button */}
          <button
            type="button"
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19]"
            onClick={onClose}
          >
            Continue Scanning
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScanSuccessModal;

