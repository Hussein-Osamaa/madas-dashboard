import { memo } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

type Props = {
  data: Record<string, any>;
  style?: React.CSSProperties;
};

const CheckoutSection = ({ data, style }: Props) => {
  const d = (data ?? {}) as Record<string, any>;
  const { theme } = useTheme();

  const title = d.title || 'Checkout';
  const subtitle = d.subtitle || 'Complete your purchase securely';
  const btnText = theme.checkoutButtonText || 'Complete order';
  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;

  const currency = theme.currency || 'SAR';

  // Demo items for preview
  const demoItems = [
    { name: 'Classic Leather Bag', price: 89.99, quantity: 1, image: '' },
    { name: 'Minimalist Watch', price: 149.99, quantity: 2, image: '' },
  ];
  const demoSubtotal = demoItems.reduce((s, i) => s + i.price * i.quantity, 0);

  const formatPrice = (n: number) => {
    const formatted = n.toFixed(2);
    return theme.currencyPosition === 'suffix' ? `${formatted} ${currency}` : `${currency} ${formatted}`;
  };

  return (
    <section
      className="w-full"
      style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}
    >
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
          <p className="text-sm opacity-60 mt-1">{subtitle}</p>
        </div>

        <div className="flex flex-wrap gap-8">
          {/* Left: Form preview */}
          <div className="flex-1 min-w-[320px] space-y-6">
            {/* Contact */}
            <div>
              <h3 className="text-sm font-bold mb-3">Contact</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1">First name</label>
                  <div className="border rounded-lg px-3 py-2.5 text-sm text-gray-400 bg-gray-50">John</div>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Last name</label>
                  <div className="border rounded-lg px-3 py-2.5 text-sm text-gray-400 bg-gray-50">Doe</div>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium block mb-1">Email</label>
                  <div className="border rounded-lg px-3 py-2.5 text-sm text-gray-400 bg-gray-50">john@example.com</div>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium block mb-1">Phone</label>
                  <div className="border rounded-lg px-3 py-2.5 text-sm text-gray-400 bg-gray-50">+20 XXX XXX XXXX</div>
                </div>
              </div>
            </div>

            {/* Shipping */}
            <div>
              <h3 className="text-sm font-bold mb-3">Shipping address</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium block mb-1">Address</label>
                  <div className="border rounded-lg px-3 py-2.5 text-sm text-gray-400 bg-gray-50">123 Main St</div>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">City</label>
                  <div className="border rounded-lg px-3 py-2.5 text-sm text-gray-400 bg-gray-50">Cairo</div>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Country</label>
                  <div className="border rounded-lg px-3 py-2.5 text-sm text-gray-400 bg-gray-50">Egypt</div>
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div>
              <h3 className="text-sm font-bold mb-3">Payment method</h3>
              <div className="space-y-2">
                {['Cash on Delivery', 'Credit / Debit Card', 'InstaPay'].map((m, i) => (
                  <label key={m} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${i === 0 ? 'border-current' : 'border-gray-200'}`}>
                    <input type="radio" name="demo-payment" defaultChecked={i === 0} className="accent-current" />
                    <span className="text-sm">{m}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit button */}
            <button
              className="w-full text-sm font-bold tracking-wider uppercase text-white"
              style={{
                padding: 'var(--btn-padding, 0.75rem 1.5rem)',
                borderRadius: 'min(var(--btn-radius, 8px), 12px)',
                background: theme.checkoutAccentColor || 'var(--c-primary, #121212)',
                border: 'none',
              }}
            >
              {btnText}
            </button>
          </div>

          {/* Right: Order summary */}
          <div className="w-[340px] flex-shrink-0">
            <div className="border rounded-xl p-5 sticky top-24">
              <h3 className="font-bold text-sm mb-4">Order summary</h3>
              {demoItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                  <div className="w-12 h-12 bg-gray-100 rounded-md flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.name}</p>
                    <p className="text-xs opacity-50">Qty: {item.quantity}</p>
                  </div>
                  <span className="text-xs font-semibold">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="pt-3 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice(demoSubtotal)}</span>
                </div>
                <div className="flex justify-between text-sm opacity-50">
                  <span>Shipping</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatPrice(demoSubtotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default memo(CheckoutSection);
