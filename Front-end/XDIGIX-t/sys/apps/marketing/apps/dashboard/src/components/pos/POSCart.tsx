import { useState } from 'react';
import { CartItem } from '../../pages/pos/POSPage';
import CustomerSelectModal from './CustomerSelectModal';
import { useCurrency } from '../../hooks/useCurrency';

type Props = {
  cart: CartItem[];
  total: number;
  itemCount: number;
  taxRate?: number;
  customer: { name: string; contact?: string; email?: string } | null;
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
  onCheckout: () => void;
  onSelectCustomer: (customer: { name: string; contact?: string; email?: string } | null) => void;
};

const POSCart = ({
  cart,
  total,
  itemCount,
  taxRate = 0,
  customer,
  onUpdateQuantity,
  onRemove,
  onClear,
  onCheckout,
  onSelectCustomer
}: Props) => {
  const { formatCurrency } = useCurrency();
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const subtotal = total;
  const tax = subtotal * taxRate;
  const discount = 0; // TODO: Implement discount
  const finalTotal = subtotal + tax - discount;

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Cart Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-primary">Cart</h2>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="text-sm text-red-600 hover:text-red-700 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <p className="text-sm text-madas-text/70">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
        </div>

        {/* Customer Selection */}
        <div className="px-6 py-4 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setShowCustomerModal(true)}
            className="w-full flex items-center justify-between rounded-lg border border-gray-200 bg-base px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="material-icons text-madas-text/60">person</span>
              <div className="text-left">
                <p className="text-sm font-medium text-madas-text/80">
                  {customer?.name ?? 'Select Customer'}
                </p>
                {customer?.contact && (
                  <p className="text-xs text-madas-text/60">{customer.contact}</p>
                )}
              </div>
            </div>
            <span className="material-icons text-madas-text/60">chevron_right</span>
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-icons text-6xl text-madas-text/30 mb-4">shopping_cart</span>
              <p className="text-sm font-medium text-madas-text/70 mb-1">Cart is empty</p>
              <p className="text-xs text-madas-text/60">Add products to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item, index) => (
                <div
                  key={`${item.product.id}-${item.size ?? 'default'}`}
                  className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3"
                >
                  {/* Product Image */}
                  <div className="w-16 h-16 rounded-lg bg-base flex items-center justify-center flex-shrink-0">
                    <span className="material-icons text-2xl text-madas-text/30">image</span>
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-primary mb-1 line-clamp-2">
                      {item.product.name}
                    </h3>
                    {item.size && (
                      <p className="text-xs text-madas-text/60 mb-1">Size: {item.size}</p>
                    )}
                    <p className="text-sm font-medium text-primary">
                      {formatCurrency(item.price)} × {item.quantity}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(index, -1)}
                        className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-base transition-colors"
                      >
                        <span className="material-icons text-sm text-madas-text/70">remove</span>
                      </button>
                      <span className="text-sm font-medium text-madas-text/80 w-8 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(index, 1)}
                        className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-base transition-colors"
                      >
                        <span className="material-icons text-sm text-madas-text/70">add</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      className="p-1 rounded hover:bg-red-50 transition-colors"
                    >
                      <span className="material-icons text-sm text-red-600">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="border-t border-gray-200 bg-base px-6 py-4 space-y-2">
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
            {discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-madas-text/70">Discount</span>
                <span className="font-medium text-green-600">-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="text-lg font-semibold text-primary">Total</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(finalTotal)}</span>
            </div>
            <button
              type="button"
              onClick={onCheckout}
              className="w-full mt-4 rounded-lg bg-primary text-white py-3 px-4 font-semibold hover:bg-[#1f3c19] transition-colors shadow-md"
            >
              Checkout
            </button>
          </div>
        )}
      </div>

      {/* Customer Select Modal */}
      {showCustomerModal && (
        <CustomerSelectModal
          open={showCustomerModal}
          onClose={() => setShowCustomerModal(false)}
          selectedCustomer={customer}
          onSelect={(customer) => {
            onSelectCustomer(customer);
            setShowCustomerModal(false);
          }}
        />
      )}
    </>
  );
};

export default POSCart;

