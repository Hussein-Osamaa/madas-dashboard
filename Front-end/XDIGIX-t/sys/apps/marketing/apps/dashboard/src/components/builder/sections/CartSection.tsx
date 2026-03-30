import { memo, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

type Props = {
  data: Record<string, any>;
  style?: React.CSSProperties;
};

const CartSection = ({ data, style }: Props) => {
  const d = (data ?? {}) as Record<string, any>;
  const { theme } = useTheme();
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  // ── Read ALL settings (matching registry defaultData) ──
  const title = d.title || 'Your cart';
  const subtitle = d.subtitle || '';
  const emptyTitle = d.empty_title || 'Your cart is empty';
  const emptyMessage = d.empty_message || 'Looks like you have not added anything yet.';
  const emptyButtonText = d.empty_button_text || 'Continue shopping';
  const continueShoppingText = d.continue_shopping_text || 'Continue shopping';
  const checkoutButtonText = d.checkout_button_text || 'Check out';
  const notesLabel = d.notes_label || 'Order notes';
  const notesPlaceholder = d.notes_placeholder || 'Special instructions for your order...';
  const shippingInfoText = d.shipping_info_text || 'Shipping & taxes calculated at checkout';
  const trustMessage = d.trust_message || '';
  const showNotes = d.show_notes ?? false;
  const showShippingInfo = d.show_shipping_info ?? d.show_shipping ?? true;
  const showQuantityControls = d.show_quantity_controls ?? true;
  const showRemoveButtons = d.show_remove_buttons ?? true;
  const showProductVendor = d.show_product_vendor ?? false;
  const showVariantDetails = d.show_variant_details ?? true;
  const showProductImage = d.show_product_image ?? true;
  const showTrustBadges = d.show_trust_badges ?? false;
  const showEstimatedTotal = d.show_estimated_total ?? true;
  const showCheckoutButton = d.show_checkout_button ?? true;
  const showContinueShopping = d.show_continue_shopping ?? true;
  const previewMode = d.preview_mode || 'with_items';
  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;

  const currency = theme.currency || 'SAR';
  const currencyPosition = theme.currencyPosition || 'prefix';
  const formatPrice = (n: number) => {
    const f = n.toFixed(2);
    return currencyPosition === 'suffix' ? `${f} ${currency}` : `${currency} ${f}`;
  };

  // Demo items for preview
  const demoItems = previewMode === 'empty' ? [] : [
    { id: 1, name: 'Classic Leather Bag', vendor: 'Artisan Co.', variant: 'Brown / Medium', price: 89.99, quantity: 1, image: '' },
    { id: 2, name: 'Minimalist Watch', vendor: 'Modern Time', variant: 'Silver', price: 149.99, quantity: 2, image: '' },
  ];

  const getQty = (id: number, def: number) => quantities[id] ?? def;
  const subtotal = demoItems.reduce((s, i) => s + i.price * getQty(i.id, i.quantity), 0);

  // ── Empty state ──
  if (demoItems.length === 0) {
    return (
      <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
            {subtitle && <p className="text-sm opacity-60 mt-1">{subtitle}</p>}
          </div>
          <div className="text-center py-16">
            <span className="material-icons text-5xl opacity-20 mb-4 block">shopping_bag</span>
            <h2 className="text-xl font-bold mb-2">{emptyTitle}</h2>
            <p className="text-sm opacity-60 mb-6">{emptyMessage}</p>
            <button className="px-6 py-3 text-sm font-semibold rounded-lg"
              style={{ background: 'var(--c-primary, #121212)', color: '#fff', borderRadius: 'min(var(--btn-radius, 8px), 12px)' }}>
              {emptyButtonText}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ── Filled state ──
  return (
    <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
          {subtitle && <p className="text-sm opacity-60 mt-1">{subtitle}</p>}
        </div>

        {/* Items */}
        <div className="divide-y" style={{ borderColor: 'color-mix(in srgb, currentColor 6%, transparent)' }}>
          {demoItems.map((item) => (
            <div key={item.id} className="flex gap-4 py-4 items-center">
              {/* Image */}
              {showProductImage && (
                <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden"
                  style={{ background: '#f5f5f5', borderRadius: 'var(--media-radius, 8px)' }}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-icons text-2xl opacity-20">image</span>
                    </div>
                  )}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{item.name}</p>
                {showProductVendor && <p className="text-xs opacity-40 uppercase tracking-wider mt-0.5">{item.vendor}</p>}
                {showVariantDetails && <p className="text-xs opacity-50 mt-0.5">{item.variant}</p>}
                <p className="font-semibold text-sm mt-1">{formatPrice(item.price)}</p>

                {/* Qty controls */}
                {showQuantityControls && (
                  <div className="flex items-center mt-2 border rounded-lg w-fit" style={{ borderColor: 'color-mix(in srgb, currentColor 15%, transparent)' }}>
                    <button
                      className="w-8 h-8 flex items-center justify-center text-sm hover:opacity-70 transition-opacity"
                      onClick={() => setQuantities(q => ({ ...q, [item.id]: Math.max(1, getQty(item.id, item.quantity) - 1) }))}
                    >−</button>
                    <span className="w-8 text-center text-sm font-semibold" style={{ borderLeft: '1px solid color-mix(in srgb, currentColor 15%, transparent)', borderRight: '1px solid color-mix(in srgb, currentColor 15%, transparent)' }}>
                      {getQty(item.id, item.quantity)}
                    </span>
                    <button
                      className="w-8 h-8 flex items-center justify-center text-sm hover:opacity-70 transition-opacity"
                      onClick={() => setQuantities(q => ({ ...q, [item.id]: getQty(item.id, item.quantity) + 1 }))}
                    >+</button>
                  </div>
                )}
              </div>

              {/* Line total + remove */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className="font-bold text-sm">{formatPrice(item.price * getQty(item.id, item.quantity))}</span>
                {showRemoveButtons && (
                  <button className="text-xs opacity-30 hover:opacity-80 transition-opacity">✕</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Order notes */}
        {showNotes && (
          <div className="mt-6">
            <label className="text-xs font-semibold block mb-1.5">{notesLabel}</label>
            <textarea
              placeholder={notesPlaceholder}
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-transparent outline-none resize-vertical"
              style={{ border: '1px solid var(--input-border, #e5e7eb)', borderRadius: 'var(--input-radius, 8px)', minHeight: '70px' }}
              readOnly
            />
          </div>
        )}

        {/* Summary card */}
        <div className="mt-6 p-5 rounded-xl border" style={{ borderColor: 'color-mix(in srgb, currentColor 10%, transparent)', borderRadius: 'var(--container-radius, 12px)' }}>
          {showEstimatedTotal && (
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm">Subtotal ({demoItems.reduce((s, i) => s + getQty(i.id, i.quantity), 0)} items)</span>
              <span className="text-lg font-extrabold">{formatPrice(subtotal)}</span>
            </div>
          )}
          {showShippingInfo && (
            <p className="text-xs opacity-50 mb-4">{shippingInfoText}</p>
          )}
          {showTrustBadges && trustMessage && (
            <p className="text-xs opacity-50 mb-4 flex items-center gap-1.5">
              <span className="material-icons text-sm">lock</span>
              {trustMessage}
            </p>
          )}
          {showCheckoutButton && (
            <button className="w-full py-3 text-sm font-bold tracking-wide text-white"
              style={{ background: 'var(--c-primary, #121212)', borderRadius: 'min(var(--btn-radius, 8px), 12px)', border: 'none' }}>
              {checkoutButtonText}
            </button>
          )}
          {showContinueShopping && (
            <p className="text-center text-xs mt-3 opacity-50 underline cursor-pointer">{continueShoppingText}</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default memo(CartSection);
