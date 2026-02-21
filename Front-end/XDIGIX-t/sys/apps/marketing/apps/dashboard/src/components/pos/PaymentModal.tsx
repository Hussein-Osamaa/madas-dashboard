import { useState, useMemo } from 'react';
import { CartItem } from '../../pages/pos/POSPage';
import { useCurrency } from '../../hooks/useCurrency';

type Props = {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  total: number;
  taxRate?: number;
  customer: { name: string; contact?: string; email?: string } | null;
  onComplete: (paymentData: {
    method: string;
    amount: number;
    discount?: number;
    tax?: number;
    notes?: string;
  }) => Promise<void>;
};

const PaymentModal = ({ open, onClose, cart, total, taxRate = 0, customer, onComplete }: Props) => {
  const { formatCurrency, currencySymbol } = useCurrency();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'other'>('cash');
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = total;
  const discountAmount = parseFloat(discount) || 0;
  const tax = subtotal * taxRate;
  const finalTotal = subtotal + tax - discountAmount;

  const handleSubmit = async () => {
    if (finalTotal <= 0) {
      alert('Total must be greater than 0');
      return;
    }

    setIsProcessing(true);
    try {
      await onComplete({
        method: paymentMethod,
        amount: finalTotal,
        discount: discountAmount > 0 ? discountAmount : undefined,
        tax: tax > 0 ? tax : undefined,
        notes: notes.trim() || undefined
      });
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl border border-gray-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-primary">Complete Payment</h2>
            <p className="text-sm text-madas-text/70">Review order and process payment</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-full hover:bg-base transition-colors"
          >
            <span className="material-icons text-madas-text/60">close</span>
          </button>
        </div>

        {/* Order Summary */}
        <div className="px-6 py-4 border-b border-gray-200 bg-base/40">
          <h3 className="text-sm font-semibold text-primary mb-3">Order Summary</h3>
          <div className="space-y-2">
            {cart.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-madas-text/70">
                  {item.product.name}
                  {item.size && ` (${item.size})`} × {item.quantity}
                </span>
                <span className="font-medium text-madas-text/80">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          {customer && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm text-madas-text/70">
                <span className="font-medium">Customer:</span> {customer.name}
                {customer.contact && ` • ${customer.contact}`}
              </p>
            </div>
          )}
        </div>

        {/* Payment Details */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-madas-text/80 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['cash', 'card', 'other'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  disabled={isProcessing}
                  className={`
                    rounded-lg border px-4 py-3 text-sm font-medium transition-all
                    ${
                      paymentMethod === method
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-200 text-madas-text/70 hover:border-primary/30 hover:bg-base'
                    }
                  `}
                >
                  {method.charAt(0).toUpperCase() + method.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Discount */}
          <div>
            <label className="block text-sm font-medium text-madas-text/80 mb-2">
              Discount (optional)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-madas-text/60">{currencySymbol}</span>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                disabled={isProcessing}
                min="0"
                max={subtotal}
                step="0.01"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-madas-text/80 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isProcessing}
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Add any notes about this order..."
            />
          </div>

          {/* Total */}
          <div className="rounded-lg border border-gray-200 bg-base p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-madas-text/70">Subtotal</span>
              <span className="font-medium text-madas-text/80">{formatCurrency(subtotal)}</span>
            </div>
            {tax > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-madas-text/70">Tax</span>
                <span className="font-medium text-madas-text/80">{formatCurrency(tax)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-madas-text/70">Discount</span>
                <span className="font-medium text-green-600">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="text-lg font-semibold text-primary">Total</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(finalTotal)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isProcessing || finalTotal <= 0}
            className="flex-1 rounded-lg bg-primary text-white px-4 py-3 text-sm font-semibold hover:bg-[#1f3c19] transition-colors disabled:opacity-60 shadow-md"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="material-icons animate-spin text-base">progress_activity</span>
                Processing...
              </span>
            ) : (
              `Complete Payment (${formatCurrency(finalTotal)})`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;

