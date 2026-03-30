import { memo } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { normalizeCheckoutConfig } from '../../../lib/section-configs';

type Props = {
  data: Record<string, any>;
  style?: React.CSSProperties;
};

const CheckoutSection = ({ data, style }: Props) => {
  const d = (data ?? {}) as Record<string, any>;
  const { theme } = useTheme();

  // Normalize via shared contract — same logic as renderer + runtime
  const cfg = normalizeCheckoutConfig(d, theme.checkoutButtonText);
  const {
    title, subtitle, contactTitle, shippingTitle, paymentTitle, summaryTitle,
    orderNotesLabel, orderNotesPlaceholder, checkoutButtonText,
    secureBadgeText, supportText, termsText, deliveryInfoText,
    showEmail, showPhone, showCompany, showAddress2, showPostalCode,
    showOrderNotes, showPaymentIcons, showTrustBadges, showSecureBadge,
    showTermsLink, layout,
  } = cfg;

  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;

  const currency = theme.currency || 'SAR';
  const currencyPosition = theme.currencyPosition || 'prefix';
  const formatPrice = (n: number) => {
    const f = n.toFixed(2);
    return currencyPosition === 'suffix' ? `${f} ${currency}` : `${currency} ${f}`;
  };

  const demoItems = [
    { name: 'Classic Leather Bag', price: 89.99, quantity: 1 },
    { name: 'Minimalist Watch', price: 149.99, quantity: 2 },
  ];
  const subtotal = demoItems.reduce((s, i) => s + i.price * i.quantity, 0);

  const inputCls = "w-full px-3 py-2.5 text-sm bg-transparent outline-none transition-colors";
  const inputStyle = { border: '1px solid var(--input-border, #e5e7eb)', borderRadius: 'var(--input-radius, 8px)' };
  const labelCls = "text-xs font-semibold block mb-1";

  const isTwoCol = layout === 'two-column';

  return (
    <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
          <p className="text-sm opacity-60 mt-1">{subtitle}</p>
        </div>

        <div className={`flex ${isTwoCol ? 'flex-wrap' : 'flex-col'} gap-8`}>
          {/* ── Form column ── */}
          <div className={isTwoCol ? 'flex-1 min-w-[320px]' : 'w-full'}>
            <div className="space-y-6">
              {/* Contact */}
              <div>
                <h3 className="text-sm font-bold mb-3">{contactTitle}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>First name</label>
                    <div className={inputCls} style={inputStyle}>John</div>
                  </div>
                  <div>
                    <label className={labelCls}>Last name</label>
                    <div className={inputCls} style={inputStyle}>Doe</div>
                  </div>
                  {showEmail && (
                    <div className="col-span-2">
                      <label className={labelCls}>Email</label>
                      <div className={inputCls} style={inputStyle}>john@example.com</div>
                    </div>
                  )}
                  {showPhone && (
                    <div className="col-span-2">
                      <label className={labelCls}>Phone</label>
                      <div className={inputCls} style={inputStyle}>+20 XXX XXX XXXX</div>
                    </div>
                  )}
                  {showCompany && (
                    <div className="col-span-2">
                      <label className={labelCls}>Company (optional)</label>
                      <div className={inputCls} style={inputStyle}>Acme Inc.</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping */}
              <div>
                <h3 className="text-sm font-bold mb-3">{shippingTitle}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className={labelCls}>Address</label>
                    <div className={inputCls} style={inputStyle}>123 Main St</div>
                  </div>
                  {showAddress2 && (
                    <div className="col-span-2">
                      <label className={labelCls}>Address line 2</label>
                      <div className={inputCls} style={inputStyle}>Apt 4B</div>
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>City</label>
                    <div className={inputCls} style={inputStyle}>Cairo</div>
                  </div>
                  {showPostalCode && (
                    <div>
                      <label className={labelCls}>Postal code</label>
                      <div className={inputCls} style={inputStyle}>11511</div>
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className={labelCls}>Country</label>
                    <div className={inputCls} style={inputStyle}>Egypt</div>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div>
                <h3 className="text-sm font-bold mb-3">{paymentTitle}</h3>
                <div className="space-y-2">
                  {['Cash on Delivery', 'Credit / Debit Card', 'InstaPay'].map((m, i) => (
                    <label key={m} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${i === 0 ? 'border-current' : ''}`}
                      style={{ borderColor: i === 0 ? 'var(--c-primary)' : 'var(--input-border, #e5e7eb)', borderRadius: 'var(--input-radius, 8px)' }}>
                      <input type="radio" name="demo-pay" defaultChecked={i === 0} className="accent-current" />
                      <span className="text-sm">{m}</span>
                    </label>
                  ))}
                </div>
                {showPaymentIcons && (
                  <div className="flex gap-2 mt-3 opacity-30">
                    {['Visa', 'MC', 'Mada'].map(c => (
                      <span key={c} className="text-xs px-2 py-1 border rounded" style={{ borderColor: 'var(--input-border, #e5e7eb)' }}>{c}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              {showOrderNotes && (
                <div>
                  <label className={labelCls}>{orderNotesLabel} (optional)</label>
                  <textarea
                    placeholder={orderNotesPlaceholder}
                    className="w-full px-3 py-2.5 text-sm bg-transparent outline-none resize-vertical"
                    style={{ ...inputStyle, minHeight: '60px' }}
                    readOnly
                  />
                </div>
              )}

              {/* Delivery info */}
              {deliveryInfoText && (
                <p className="text-xs opacity-50">{deliveryInfoText}</p>
              )}

              {/* Secure badge */}
              {showSecureBadge && (
                <div className="flex items-center gap-1.5 text-xs opacity-50">
                  <span className="material-icons text-sm">lock</span>
                  {secureBadgeText}
                </div>
              )}

              {/* Submit button */}
              <button className="w-full py-3 text-sm font-bold tracking-wide text-white" style={{
                background: theme.checkoutAccentColor || 'var(--c-primary, #121212)',
                borderRadius: 'min(var(--btn-radius, 8px), 12px)',
                border: 'none',
              }}>
                {checkoutButtonText}
              </button>

              {/* Terms */}
              {showTermsLink && termsText && (
                <p className="text-xs opacity-50 text-center">{termsText}</p>
              )}

              {/* Support */}
              {supportText && (
                <p className="text-xs opacity-50 text-center">{supportText}</p>
              )}
            </div>
          </div>

          {/* ── Summary column ── */}
          <div className={isTwoCol ? 'w-[340px] flex-shrink-0' : 'w-full'}>
            <div className="border rounded-xl p-5 sticky top-24" style={{ borderColor: 'color-mix(in srgb, currentColor 10%, transparent)', borderRadius: 'var(--container-radius, 12px)' }}>
              <h3 className="font-bold text-sm mb-4">{summaryTitle}</h3>
              {demoItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                  <div className="w-12 h-12 bg-gray-100 rounded-md flex-shrink-0" style={{ borderRadius: 'var(--media-radius, 8px)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.name}</p>
                    <p className="text-xs opacity-50">Qty: {item.quantity}</p>
                  </div>
                  <span className="text-xs font-semibold">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="pt-3 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm opacity-50">
                  <span>Shipping</span><span>Calculated</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t">
                  <span>Total</span><span>{formatPrice(subtotal)}</span>
                </div>
              </div>

              {/* Trust badges */}
              {showTrustBadges && (
                <div className="flex items-center gap-2 mt-4 pt-3 border-t opacity-40">
                  <span className="material-icons text-sm">verified_user</span>
                  <span className="text-xs">Secure payment</span>
                  <span className="material-icons text-sm ml-2">local_shipping</span>
                  <span className="text-xs">Fast delivery</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default memo(CheckoutSection);
