import { describe, it, expect } from 'vitest';
import {
  normalizeCartConfig,
  normalizeCheckoutConfig,
  DEFAULT_CART_CONFIG,
  DEFAULT_CHECKOUT_CONFIG,
  serializeConfigForHtml,
  type CartSectionConfig,
  type CheckoutSectionConfig,
} from '../modules/sites/section-configs';

/* ═══════════════════════════════════════════════════════════════════
   CART CONFIG
   ═══════════════════════════════════════════════════════════════════ */

describe('normalizeCartConfig', () => {
  it('returns all defaults when given empty object', () => {
    const result = normalizeCartConfig({});
    expect(result).toEqual(DEFAULT_CART_CONFIG);
  });

  it('preserves explicitly set values', () => {
    const result = normalizeCartConfig({
      title: 'My Cart',
      show_notes: true,
      show_quantity_controls: false,
    });
    expect(result.title).toBe('My Cart');
    expect(result.showNotes).toBe(true);
    expect(result.showQuantityControls).toBe(false);
    // Other fields should be defaults
    expect(result.subtitle).toBe(DEFAULT_CART_CONFIG.subtitle);
    expect(result.showRemoveButtons).toBe(DEFAULT_CART_CONFIG.showRemoveButtons);
  });

  it('migrates old show_shipping → showShippingInfo', () => {
    const result = normalizeCartConfig({ show_shipping: false });
    expect(result.showShippingInfo).toBe(false);
  });

  it('prefers new show_shipping_info over old show_shipping', () => {
    const result = normalizeCartConfig({
      show_shipping_info: true,
      show_shipping: false, // old key should be ignored
    });
    expect(result.showShippingInfo).toBe(true);
  });

  it('handles missing fields with correct defaults', () => {
    const result = normalizeCartConfig({
      title: 'Cart',
      // everything else missing
    });
    expect(result.emptyTitle).toBe('Your cart is empty');
    expect(result.emptyButtonLink).toBe('/products');
    expect(result.showEstimatedTotal).toBe(true);
    expect(result.showProductVendor).toBe(false);
    expect(result.showNotes).toBe(false);
  });

  it('sanitizes invalid types — uses default for non-string title', () => {
    const result = normalizeCartConfig({
      title: 42 as unknown as string,
      subtitle: true as unknown as string,
    });
    expect(result.title).toBe(DEFAULT_CART_CONFIG.title);
    expect(result.subtitle).toBe(DEFAULT_CART_CONFIG.subtitle);
  });

  it('coerces truthy/falsy values for booleans', () => {
    const result = normalizeCartConfig({
      show_notes: 1, // truthy
      show_trust_badges: 0, // falsy
      show_product_image: '', // falsy
    });
    expect(result.showNotes).toBe(true);
    expect(result.showTrustBadges).toBe(false);
    expect(result.showProductImage).toBe(false);
  });

  it('produces consistent output for builder/runtime contract', () => {
    const raw = { title: 'Test', show_notes: true, empty_button_link: '/shop' };
    const config = normalizeCartConfig(raw);

    // Every key in CartSectionConfig must be present
    const keys: (keyof CartSectionConfig)[] = [
      'title', 'subtitle', 'emptyTitle', 'emptyMessage', 'emptyButtonText',
      'emptyButtonLink', 'continueShoppingText', 'checkoutButtonText',
      'notesLabel', 'notesPlaceholder', 'shippingInfoText', 'trustMessage',
      'showNotes', 'showShippingInfo', 'showQuantityControls', 'showRemoveButtons',
      'showProductVendor', 'showVariantDetails', 'showProductImage',
      'showTrustBadges', 'showEstimatedTotal', 'showCheckoutButton', 'showContinueShopping',
    ];
    for (const key of keys) {
      expect(config).toHaveProperty(key);
      expect(config[key]).not.toBeUndefined();
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CHECKOUT CONFIG
   ═══════════════════════════════════════════════════════════════════ */

describe('normalizeCheckoutConfig', () => {
  it('returns all defaults when given empty object', () => {
    const result = normalizeCheckoutConfig({});
    expect(result).toEqual(DEFAULT_CHECKOUT_CONFIG);
  });

  it('preserves explicitly set values', () => {
    const result = normalizeCheckoutConfig({
      title: 'Pay Now',
      contact_title: 'Your Info',
      show_company: true,
      layout: 'one-column',
    });
    expect(result.title).toBe('Pay Now');
    expect(result.contactTitle).toBe('Your Info');
    expect(result.showCompany).toBe(true);
    expect(result.layout).toBe('one-column');
  });

  it('migrates old show_notes → showOrderNotes', () => {
    const result = normalizeCheckoutConfig({ show_notes: false });
    expect(result.showOrderNotes).toBe(false);
  });

  it('prefers show_order_notes over show_notes', () => {
    const result = normalizeCheckoutConfig({
      show_order_notes: true,
      show_notes: false,
    });
    expect(result.showOrderNotes).toBe(true);
  });

  it('uses theme checkoutButtonText as fallback', () => {
    const result = normalizeCheckoutConfig({}, 'Buy Now');
    expect(result.checkoutButtonText).toBe('Buy Now');
  });

  it('section checkout_button_text overrides theme', () => {
    const result = normalizeCheckoutConfig(
      { checkout_button_text: 'Place Order' },
      'Buy Now',
    );
    expect(result.checkoutButtonText).toBe('Place Order');
  });

  it('sanitizes invalid layout value', () => {
    const result = normalizeCheckoutConfig({ layout: 'three-column' });
    expect(result.layout).toBe('two-column'); // default
  });

  it('sanitizes invalid types', () => {
    const result = normalizeCheckoutConfig({
      title: 123 as unknown as string,
      show_email: 'yes' as unknown as boolean,
    });
    expect(result.title).toBe(DEFAULT_CHECKOUT_CONFIG.title);
    expect(result.showEmail).toBe(true); // 'yes' is truthy
  });

  it('produces consistent output for builder/runtime contract', () => {
    const config = normalizeCheckoutConfig({ title: 'Test' });

    const keys: (keyof CheckoutSectionConfig)[] = [
      'title', 'subtitle', 'contactTitle', 'shippingTitle', 'paymentTitle',
      'summaryTitle', 'orderNotesLabel', 'orderNotesPlaceholder',
      'checkoutButtonText', 'guestCheckoutText', 'supportText',
      'termsText', 'privacyText', 'secureBadgeText', 'deliveryInfoText',
      'showEmail', 'showPhone', 'showCompany', 'showAddress2',
      'showPostalCode', 'showOrderNotes', 'showBillingToggle',
      'showPaymentIcons', 'showTrustBadges', 'showSecureBadge',
      'showTermsLink', 'layout',
    ];
    for (const key of keys) {
      expect(config).toHaveProperty(key);
      expect(config[key]).not.toBeUndefined();
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════
   SERIALIZATION
   ═══════════════════════════════════════════════════════════════════ */

describe('serializeConfigForHtml', () => {
  it('escapes < to prevent XSS', () => {
    const result = serializeConfigForHtml({ text: '<script>alert(1)</script>' });
    expect(result).not.toContain('<script>');
    expect(result).toContain('\\u003c');
  });

  it('escapes apostrophes for HTML attribute safety', () => {
    const result = serializeConfigForHtml({ text: "it's here" });
    expect(result).not.toContain("'s");
    expect(result).toContain('\\u0027');
  });

  it('produces valid JSON after attribute extraction', () => {
    const original = { title: "John's <Store>", showNotes: true };
    const serialized = serializeConfigForHtml(original);
    // JSON.parse handles \uXXXX natively
    const parsed = JSON.parse(serialized);
    expect(parsed.title).toBe("John's <Store>");
    expect(parsed.showNotes).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   OLD PAYLOAD MIGRATION
   ═══════════════════════════════════════════════════════════════════ */

describe('old payload migration', () => {
  it('migrates v1 cart payload (only title + empty_message + show_shipping)', () => {
    // This is what old sites saved before Phase 2
    const oldPayload = {
      title: 'Your cart',
      empty_message: 'Your cart is empty',
      empty_button_text: 'Continue shopping',
      empty_button_link: '/',
      show_notes: true,
      show_shipping: true,
      preview_mode: 'with_items',
      color_scheme: 'scheme-1',
      padding_top: 36,
      padding_bottom: 36,
    };
    const config = normalizeCartConfig(oldPayload);
    // Old show_shipping should migrate to showShippingInfo
    expect(config.showShippingInfo).toBe(true);
    // Missing fields get defaults
    expect(config.checkoutButtonText).toBe('Check out');
    expect(config.showQuantityControls).toBe(true);
    expect(config.emptyTitle).toBe('Your cart is empty');
    expect(config.subtitle).toBe('');
    // Explicitly set fields preserved
    expect(config.title).toBe('Your cart');
    expect(config.showNotes).toBe(true);
    expect(config.emptyButtonLink).toBe('/');
  });

  it('migrates v1 checkout payload (only title + subtitle + show_notes)', () => {
    const oldPayload = {
      title: 'Checkout',
      subtitle: 'Complete your purchase securely',
      show_notes: true,
      show_trust_badges: true,
      color_scheme: 'scheme-1',
      padding_top: 36,
      padding_bottom: 36,
    };
    const config = normalizeCheckoutConfig(oldPayload);
    // Old show_notes migrates to showOrderNotes
    expect(config.showOrderNotes).toBe(true);
    // Missing fields get defaults
    expect(config.contactTitle).toBe('Contact');
    expect(config.showEmail).toBe(true);
    expect(config.layout).toBe('two-column');
    expect(config.secureBadgeText).toBe('Secure checkout');
    // Explicitly set fields preserved
    expect(config.showTrustBadges).toBe(true);
  });
});
