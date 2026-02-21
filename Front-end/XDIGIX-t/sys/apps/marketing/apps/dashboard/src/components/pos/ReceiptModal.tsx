import { useRef } from 'react';
import { CartItem } from '../../pages/pos/POSPage';
import { format } from 'date-fns';
import { useCurrency } from '../../hooks/useCurrency';

type Props = {
  open: boolean;
  onClose: () => void;
  orderNumber: string;
  cart: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  customer: { name: string; contact?: string; email?: string } | null;
  date: Date;
  businessName?: string;
};

const ReceiptModal = ({
  open,
  onClose,
  orderNumber,
  cart,
  subtotal,
  tax,
  discount,
  total,
  paymentMethod,
  customer,
  date,
  businessName
}: Props) => {
  const { formatCurrency } = useCurrency();
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!receiptRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the receipt');
      return;
    }

    const receiptContent = receiptRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${orderNumber}</title>
          <style>
            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 10mm;
                font-family: 'Courier New', monospace;
                font-size: 12px;
              }
            }
            body {
              margin: 0;
              padding: 10mm;
              font-family: 'Courier New', monospace;
              font-size: 12px;
              max-width: 80mm;
            }
            .receipt-header {
              text-align: center;
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .receipt-item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
              font-size: 11px;
            }
            .receipt-total {
              border-top: 1px dashed #000;
              padding-top: 10px;
              margin-top: 10px;
              font-weight: bold;
            }
            .receipt-footer {
              text-align: center;
              margin-top: 20px;
              font-size: 10px;
              color: #666;
            }
          </style>
        </head>
        <body>
          ${receiptContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl border border-gray-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-primary">Receipt</h2>
            <p className="text-sm text-madas-text/70">Order #{orderNumber}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-base transition-colors"
          >
            <span className="material-icons text-madas-text/60">close</span>
          </button>
        </div>

        {/* Receipt Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div ref={receiptRef} className="receipt-content max-w-xs mx-auto">
            {/* Receipt Header */}
            <div className="receipt-header">
              <h3 className="text-lg font-bold text-primary mb-1">{businessName || 'MADAS Store'}</h3>
              <p className="text-xs text-madas-text/70">Thank you for your purchase!</p>
            </div>

            {/* Order Info */}
            <div className="mb-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-madas-text/70">Order #:</span>
                <span className="font-medium">{orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-madas-text/70">Date:</span>
                <span className="font-medium">{format(date, 'MMM dd, yyyy HH:mm')}</span>
              </div>
              {customer && (
                <div className="flex justify-between">
                  <span className="text-madas-text/70">Customer:</span>
                  <span className="font-medium">{customer.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-madas-text/70">Payment:</span>
                <span className="font-medium capitalize">{paymentMethod}</span>
              </div>
            </div>

            {/* Items */}
            <div className="mb-4 border-t border-gray-200 pt-3">
              <div className="space-y-2">
                {cart.map((item, index) => (
                  <div key={index} className="receipt-item">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.product.name}</p>
                      {item.size && <p className="text-xs text-madas-text/60">Size: {item.size}</p>}
                      <p className="text-xs text-madas-text/60">
                        {formatCurrency(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="receipt-total space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="receipt-footer mt-6">
              <p>Thank you for shopping with us!</p>
              <p className="mt-2">Have a great day!</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 rounded-lg bg-primary text-white px-4 py-3 text-sm font-semibold hover:bg-[#1f3c19] transition-colors shadow-md"
          >
            <span className="material-icons text-base mr-2 align-middle">print</span>
            Print
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;

