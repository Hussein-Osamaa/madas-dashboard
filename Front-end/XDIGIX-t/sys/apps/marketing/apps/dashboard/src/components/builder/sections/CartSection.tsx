import { memo, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

type Props = {
  data: Record<string, any>;
  style?: React.CSSProperties;
  isSelected?: boolean;
};

/** Demo cart items for preview */
const DEMO_ITEMS = [
  { id: '1', name: 'Classic Leather Bag', price: 89.99, quantity: 1, image: '' },
  { id: '2', name: 'Minimalist Watch', price: 149.99, quantity: 2, image: '' },
];

const CartSection = ({ data, style }: Props) => {
  const d = (data ?? {}) as Record<string, any>;
  const { theme } = useTheme();

  const title = d.title || 'Your cart';
  const emptyMessage = d.empty_message || 'Your cart is empty';
  const emptyButtonText = d.empty_button_text || 'Continue shopping';
  const emptyButtonLink = d.empty_button_link || '/';
  const showNotes = d.show_notes ?? true;
  const showShippingEstimate = d.show_shipping ?? true;
  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;

  // Preview mode: show demo items or empty cart
  const previewMode = d.preview_mode ?? 'with_items';
  const items = previewMode === 'empty' ? [] : DEMO_ITEMS;

  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(items.map(i => [i.id, i.quantity]))
  );

  const updateQty = (id: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 1) + delta),
    }));
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * (quantities[item.id] || item.quantity), 0);

  const currency = theme.currency || 'SAR';
  const currencyPosition = theme.currencyPosition || 'prefix';
  const formatPrice = (n: number) => {
    const num = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
    return currencyPosition === 'suffix' ? `${num} ${currency}` : `${currency} ${num}`;
  };

  // Empty cart state
  if (items.length === 0) {
    return (
      <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
        <div className="max-w-[600px] mx-auto px-4 sm:px-6 text-center py-16">
          <h1 className="text-2xl md:text-3xl font-bold mb-6">{emptyMessage}</h1>
          <a
            href={emptyButtonLink}
            className="inline-block text-sm font-medium tracking-wider uppercase transition-colors"
            style={{ padding: 'var(--btn-padding, 0.75rem 1.5rem)', borderRadius: 'var(--btn-radius, 8px)', boxShadow: 'var(--btn-shadow, none)', backgroundColor: 'var(--scheme-btn-bg, #121212)', color: 'var(--scheme-btn-label, #fff)' }}
          >
            {emptyButtonText}
          </a>
          <div className="mt-12 pt-8 border-t">
            <h2 className="text-lg font-semibold mb-2">Have an account?</h2>
            <p className="text-sm opacity-70">
              <a href="/account/login" className="underline">Log in</a> to check out faster.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center">{title}</h1>

        {/* Cart table */}
        <div className="border-b pb-2 mb-4 hidden md:grid grid-cols-[1fr_120px_120px_80px] gap-4 text-xs uppercase tracking-wider opacity-50 font-medium">
          <span>Product</span>
          <span className="text-center">Quantity</span>
          <span className="text-right">Total</span>
          <span />
        </div>

        {items.map(item => {
          const qty = quantities[item.id] || item.quantity;
          return (
            <div key={item.id} className="border-b py-4 grid grid-cols-1 md:grid-cols-[1fr_120px_120px_80px] gap-4 items-center">
              {/* Product info */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-[#f5f5f5] rounded-md flex-shrink-0 flex items-center justify-center">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-md" />
                  ) : (
                    <span className="material-icons text-2xl text-gray-300">image</span>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium">{item.name}</h3>
                  <p className="text-sm opacity-60 mt-0.5">{formatPrice(item.price)}</p>
                </div>
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-center">
                <div className="flex items-center border rounded">
                  <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-sm hover:bg-gray-50">-</button>
                  <span className="w-10 h-8 flex items-center justify-center text-sm border-x">{qty}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-sm hover:bg-gray-50">+</button>
                </div>
              </div>

              {/* Total */}
              <div className="text-right text-sm font-medium">
                {formatPrice(item.price * qty)}
              </div>

              {/* Remove */}
              <div className="text-center">
                <button className="text-sm opacity-50 hover:opacity-100 transition-opacity underline">
                  Remove
                </button>
              </div>
            </div>
          );
        })}

        {/* Cart footer */}
        <div className="mt-6 flex flex-col items-end gap-4">
          {showNotes && (
            <div className="w-full md:w-96">
              <label className="text-sm font-medium mb-1 block">Order notes</label>
              <textarea
                placeholder="Add a note to your order..."
                className="w-full border rounded-md px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-[#121212]/20"
              />
            </div>
          )}

          <div className="w-full md:w-96 text-right">
            {showShippingEstimate && (
              <p className="text-xs opacity-60 mb-2">Taxes and shipping calculated at checkout</p>
            )}
            <div className="flex items-baseline justify-end gap-4 mb-4">
              <span className="text-sm font-medium uppercase tracking-wider">Subtotal</span>
              <span className="text-lg font-bold">{formatPrice(subtotal)}</span>
            </div>
            <button
              className="w-full text-sm font-medium tracking-wider uppercase transition-colors"
              style={{ padding: 'var(--btn-padding, 0.75rem 1.5rem)', borderRadius: 'var(--btn-radius, 8px)', boxShadow: 'var(--btn-shadow, none)', backgroundColor: 'var(--scheme-btn-bg, #121212)', color: 'var(--scheme-btn-label, #fff)' }}
            >
              Check out
            </button>
            <a href="/" className="text-sm underline opacity-70 hover:opacity-100 mt-3 inline-block">
              Continue shopping
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default memo(CartSection);
