/**
 * Shared section config contracts — frontend mirror.
 *
 * These interfaces are the SAME as the backend version in
 * sys/backend/src/modules/sites/section-configs.ts
 *
 * They define the normalized config shape used by builder previews.
 * The builder reads raw section data (snake_case), normalizes it
 * into the same contract the runtime uses (camelCase).
 */

/* ═══════════════════════════════════════════════════════════════════
   CART
   ═══════════════════════════════════════════════════════════════════ */

export interface CartSectionConfig {
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyMessage: string;
  emptyButtonText: string;
  emptyButtonLink: string;
  continueShoppingText: string;
  checkoutButtonText: string;
  notesLabel: string;
  notesPlaceholder: string;
  shippingInfoText: string;
  trustMessage: string;
  showNotes: boolean;
  showShippingInfo: boolean;
  showQuantityControls: boolean;
  showRemoveButtons: boolean;
  showProductVendor: boolean;
  showVariantDetails: boolean;
  showProductImage: boolean;
  showTrustBadges: boolean;
  showEstimatedTotal: boolean;
  showCheckoutButton: boolean;
  showContinueShopping: boolean;
}

export const DEFAULT_CART_CONFIG: CartSectionConfig = {
  title: 'Your cart',
  subtitle: '',
  emptyTitle: 'Your cart is empty',
  emptyMessage: 'Looks like you have not added anything yet.',
  emptyButtonText: 'Continue shopping',
  emptyButtonLink: '/products',
  continueShoppingText: 'Continue shopping',
  checkoutButtonText: 'Check out',
  notesLabel: 'Order notes',
  notesPlaceholder: 'Special instructions for your order...',
  shippingInfoText: 'Shipping & taxes calculated at checkout',
  trustMessage: '',
  showNotes: false,
  showShippingInfo: true,
  showQuantityControls: true,
  showRemoveButtons: true,
  showProductVendor: false,
  showVariantDetails: true,
  showProductImage: true,
  showTrustBadges: false,
  showEstimatedTotal: true,
  showCheckoutButton: true,
  showContinueShopping: true,
};

export function normalizeCartConfig(raw: Record<string, unknown>): CartSectionConfig {
  if (!raw || typeof raw !== 'object') raw = {};
  const s = (key: string, fb: string): string => { const v = raw[key]; return typeof v === 'string' ? v.replace(/<[^>]*>/g, '').slice(0, 500).trim() || fb : fb; };
  const b = (key: string, legacy: string | null, fb: boolean): boolean => {
    if (raw[key] != null) return !!raw[key];
    if (legacy && raw[legacy] != null) return !!raw[legacy];
    return fb;
  };
  return {
    title: s('title', DEFAULT_CART_CONFIG.title),
    subtitle: s('subtitle', DEFAULT_CART_CONFIG.subtitle),
    emptyTitle: s('empty_title', DEFAULT_CART_CONFIG.emptyTitle),
    emptyMessage: s('empty_message', DEFAULT_CART_CONFIG.emptyMessage),
    emptyButtonText: s('empty_button_text', DEFAULT_CART_CONFIG.emptyButtonText),
    emptyButtonLink: s('empty_button_link', DEFAULT_CART_CONFIG.emptyButtonLink),
    continueShoppingText: s('continue_shopping_text', DEFAULT_CART_CONFIG.continueShoppingText),
    checkoutButtonText: s('checkout_button_text', DEFAULT_CART_CONFIG.checkoutButtonText),
    notesLabel: s('notes_label', DEFAULT_CART_CONFIG.notesLabel),
    notesPlaceholder: s('notes_placeholder', DEFAULT_CART_CONFIG.notesPlaceholder),
    shippingInfoText: s('shipping_info_text', DEFAULT_CART_CONFIG.shippingInfoText),
    trustMessage: s('trust_message', DEFAULT_CART_CONFIG.trustMessage),
    showNotes: b('show_notes', null, DEFAULT_CART_CONFIG.showNotes),
    showShippingInfo: b('show_shipping_info', 'show_shipping', DEFAULT_CART_CONFIG.showShippingInfo),
    showQuantityControls: b('show_quantity_controls', null, DEFAULT_CART_CONFIG.showQuantityControls),
    showRemoveButtons: b('show_remove_buttons', null, DEFAULT_CART_CONFIG.showRemoveButtons),
    showProductVendor: b('show_product_vendor', null, DEFAULT_CART_CONFIG.showProductVendor),
    showVariantDetails: b('show_variant_details', null, DEFAULT_CART_CONFIG.showVariantDetails),
    showProductImage: b('show_product_image', null, DEFAULT_CART_CONFIG.showProductImage),
    showTrustBadges: b('show_trust_badges', null, DEFAULT_CART_CONFIG.showTrustBadges),
    showEstimatedTotal: b('show_estimated_total', null, DEFAULT_CART_CONFIG.showEstimatedTotal),
    showCheckoutButton: b('show_checkout_button', null, DEFAULT_CART_CONFIG.showCheckoutButton),
    showContinueShopping: b('show_continue_shopping', null, DEFAULT_CART_CONFIG.showContinueShopping),
  };
}

/* ═══════════════════════════════════════════════════════════════════
   CHECKOUT
   ═══════════════════════════════════════════════════════════════════ */

export interface CheckoutSectionConfig {
  title: string;
  subtitle: string;
  contactTitle: string;
  shippingTitle: string;
  paymentTitle: string;
  summaryTitle: string;
  orderNotesLabel: string;
  orderNotesPlaceholder: string;
  checkoutButtonText: string;
  guestCheckoutText: string;
  supportText: string;
  termsText: string;
  privacyText: string;
  secureBadgeText: string;
  deliveryInfoText: string;
  showEmail: boolean;
  showPhone: boolean;
  showCompany: boolean;
  showAddress2: boolean;
  showPostalCode: boolean;
  showOrderNotes: boolean;
  showBillingToggle: boolean;
  showPaymentIcons: boolean;
  showTrustBadges: boolean;
  showSecureBadge: boolean;
  showTermsLink: boolean;
  layout: 'one-column' | 'two-column';
}

export const DEFAULT_CHECKOUT_CONFIG: CheckoutSectionConfig = {
  title: 'Checkout',
  subtitle: 'Complete your purchase securely',
  contactTitle: 'Contact',
  shippingTitle: 'Shipping address',
  paymentTitle: 'Payment method',
  summaryTitle: 'Order summary',
  orderNotesLabel: 'Order notes',
  orderNotesPlaceholder: 'Any special instructions...',
  checkoutButtonText: 'Complete order',
  guestCheckoutText: '',
  supportText: '',
  termsText: '',
  privacyText: '',
  secureBadgeText: 'Secure checkout',
  deliveryInfoText: '',
  showEmail: true,
  showPhone: true,
  showCompany: false,
  showAddress2: false,
  showPostalCode: true,
  showOrderNotes: true,
  showBillingToggle: false,
  showPaymentIcons: true,
  showTrustBadges: true,
  showSecureBadge: true,
  showTermsLink: false,
  layout: 'two-column',
};

export function normalizeCheckoutConfig(raw: Record<string, unknown>, themeButtonText?: string): CheckoutSectionConfig {
  if (!raw || typeof raw !== 'object') raw = {};
  const s = (key: string, fb: string): string => { const v = raw[key]; return typeof v === 'string' ? v.replace(/<[^>]*>/g, '').slice(0, 500).trim() || fb : fb; };
  const b = (key: string, legacy: string | null, fb: boolean): boolean => {
    if (raw[key] != null) return !!raw[key];
    if (legacy && raw[legacy] != null) return !!raw[legacy];
    return fb;
  };
  const layout = raw.layout;
  const valid = ['one-column', 'two-column'];
  return {
    title: s('title', DEFAULT_CHECKOUT_CONFIG.title),
    subtitle: s('subtitle', DEFAULT_CHECKOUT_CONFIG.subtitle),
    contactTitle: s('contact_title', DEFAULT_CHECKOUT_CONFIG.contactTitle),
    shippingTitle: s('shipping_title', DEFAULT_CHECKOUT_CONFIG.shippingTitle),
    paymentTitle: s('payment_title', DEFAULT_CHECKOUT_CONFIG.paymentTitle),
    summaryTitle: s('summary_title', DEFAULT_CHECKOUT_CONFIG.summaryTitle),
    orderNotesLabel: s('order_notes_label', DEFAULT_CHECKOUT_CONFIG.orderNotesLabel),
    orderNotesPlaceholder: s('order_notes_placeholder', DEFAULT_CHECKOUT_CONFIG.orderNotesPlaceholder),
    checkoutButtonText: s('checkout_button_text', themeButtonText || DEFAULT_CHECKOUT_CONFIG.checkoutButtonText),
    guestCheckoutText: s('guest_checkout_text', DEFAULT_CHECKOUT_CONFIG.guestCheckoutText),
    supportText: s('support_text', DEFAULT_CHECKOUT_CONFIG.supportText),
    termsText: s('terms_text', DEFAULT_CHECKOUT_CONFIG.termsText),
    privacyText: s('privacy_text', DEFAULT_CHECKOUT_CONFIG.privacyText),
    secureBadgeText: s('secure_badge_text', DEFAULT_CHECKOUT_CONFIG.secureBadgeText),
    deliveryInfoText: s('delivery_info_text', DEFAULT_CHECKOUT_CONFIG.deliveryInfoText),
    showEmail: b('show_email', null, DEFAULT_CHECKOUT_CONFIG.showEmail),
    showPhone: b('show_phone', null, DEFAULT_CHECKOUT_CONFIG.showPhone),
    showCompany: b('show_company', null, DEFAULT_CHECKOUT_CONFIG.showCompany),
    showAddress2: b('show_address2', null, DEFAULT_CHECKOUT_CONFIG.showAddress2),
    showPostalCode: b('show_postal_code', null, DEFAULT_CHECKOUT_CONFIG.showPostalCode),
    showOrderNotes: b('show_order_notes', 'show_notes', DEFAULT_CHECKOUT_CONFIG.showOrderNotes),
    showBillingToggle: b('show_billing_toggle', null, DEFAULT_CHECKOUT_CONFIG.showBillingToggle),
    showPaymentIcons: b('show_payment_icons', null, DEFAULT_CHECKOUT_CONFIG.showPaymentIcons),
    showTrustBadges: b('show_trust_badges', null, DEFAULT_CHECKOUT_CONFIG.showTrustBadges),
    showSecureBadge: b('show_secure_badge', null, DEFAULT_CHECKOUT_CONFIG.showSecureBadge),
    showTermsLink: b('show_terms_link', null, DEFAULT_CHECKOUT_CONFIG.showTermsLink),
    layout: (typeof layout === 'string' && valid.includes(layout) ? layout : DEFAULT_CHECKOUT_CONFIG.layout) as 'one-column' | 'two-column',
  };
}
