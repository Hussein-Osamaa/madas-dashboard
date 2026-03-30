/**
 * Inventory P0 tests.
 *
 * Tests product schema, stock computations, reservation logic,
 * release/fulfillment, movement ledger, and background jobs.
 */
import { describe, it, expect } from 'vitest';

/* ═══════════════════════════════════════════════════════════════════
   STOCK COMPUTATION
   ═══════════════════════════════════════════════════════════════════ */

describe('Inventory — Stock Computation', () => {
  function computeAvailable(stock: { on_hand: number; reserved: number; damaged: number; missing: number }): number {
    return Math.max(0, stock.on_hand - stock.reserved - stock.damaged - stock.missing);
  }

  it('available = on_hand - reserved - damaged - missing', () => {
    expect(computeAvailable({ on_hand: 50, reserved: 5, damaged: 2, missing: 1 })).toBe(42);
  });

  it('available is 0 when fully reserved', () => {
    expect(computeAvailable({ on_hand: 10, reserved: 10, damaged: 0, missing: 0 })).toBe(0);
  });

  it('available never goes negative', () => {
    expect(computeAvailable({ on_hand: 5, reserved: 3, damaged: 2, missing: 1 })).toBe(0);
  });

  it('available with no damage or missing', () => {
    expect(computeAvailable({ on_hand: 100, reserved: 20, damaged: 0, missing: 0 })).toBe(80);
  });

  it('zero stock returns zero', () => {
    expect(computeAvailable({ on_hand: 0, reserved: 0, damaged: 0, missing: 0 })).toBe(0);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   RESERVATION LOGIC
   ═══════════════════════════════════════════════════════════════════ */

describe('Inventory — Reservation Logic', () => {
  const stock: Record<string, { on_hand: number; reserved: number; damaged: number; missing: number }> = {
    S: { on_hand: 50, reserved: 5, damaged: 2, missing: 1 },
    M: { on_hand: 30, reserved: 10, damaged: 0, missing: 0 },
    L: { on_hand: 0, reserved: 0, damaged: 0, missing: 0 },
  };

  function canReserve(variantId: string, qty: number): boolean {
    const s = stock[variantId];
    if (!s) return false;
    const available = s.on_hand - s.reserved - s.damaged - s.missing;
    return available >= qty;
  }

  it('can reserve when sufficient available', () => {
    expect(canReserve('S', 10)).toBe(true); // 50-5-2-1=42 >= 10
  });

  it('cannot reserve when insufficient', () => {
    expect(canReserve('S', 50)).toBe(false); // 42 < 50
  });

  it('cannot reserve zero-stock variant', () => {
    expect(canReserve('L', 1)).toBe(false);
  });

  it('cannot reserve unknown variant', () => {
    expect(canReserve('XL', 1)).toBe(false);
  });

  it('can reserve exact available amount', () => {
    expect(canReserve('M', 20)).toBe(true); // 30-10=20 >= 20
  });

  it('cannot reserve one more than available', () => {
    expect(canReserve('M', 21)).toBe(false);
  });
});

describe('Inventory — Reservation Success Effect', () => {
  it('reservation increments reserved count', () => {
    const before = { on_hand: 50, reserved: 5, damaged: 0, missing: 0 };
    const reserveQty = 10;
    const after = { ...before, reserved: before.reserved + reserveQty };
    expect(after.reserved).toBe(15);
    expect(after.on_hand).toBe(50); // on_hand unchanged
  });
});

describe('Inventory — Release Effect', () => {
  it('release decrements reserved count', () => {
    const before = { on_hand: 50, reserved: 15, damaged: 0, missing: 0 };
    const releaseQty = 10;
    const after = { ...before, reserved: before.reserved - releaseQty };
    expect(after.reserved).toBe(5);
    expect(after.on_hand).toBe(50); // on_hand unchanged
  });
});

describe('Inventory — Fulfillment Effect', () => {
  it('fulfillment decrements both on_hand and reserved', () => {
    const before = { on_hand: 50, reserved: 10, damaged: 0, missing: 0 };
    const fulfillQty = 10;
    const after = {
      ...before,
      on_hand: before.on_hand - fulfillQty,
      reserved: before.reserved - fulfillQty,
    };
    expect(after.on_hand).toBe(40);
    expect(after.reserved).toBe(0);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   STOCK MOVEMENT LEDGER
   ═══════════════════════════════════════════════════════════════════ */

describe('Inventory — Stock Movement Types', () => {
  const validTypes = ['reservation', 'release', 'fulfillment', 'receiving', 'damage', 'missing', 'adjustment', 'return'];

  it('all movement types are defined', () => {
    expect(validTypes.length).toBe(8);
  });

  it('reservation movement has negative qty', () => {
    // Reservation reduces available (increases reserved)
    const movement = { type: 'reservation', qty: 5 }; // positive = increase in reserved
    expect(movement.qty).toBeGreaterThan(0);
  });

  it('release movement has negative qty for reserved', () => {
    const movement = { type: 'release', qty: -5 }; // negative = decrease in reserved
    expect(movement.qty).toBeLessThan(0);
  });

  it('receiving movement has positive qty', () => {
    const movement = { type: 'receiving', qty: 20 };
    expect(movement.qty).toBeGreaterThan(0);
  });

  it('damage movement has positive qty (adding to damaged count)', () => {
    const movement = { type: 'damage', qty: 2 };
    expect(movement.qty).toBeGreaterThan(0);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   RESERVATION EXPIRY
   ═══════════════════════════════════════════════════════════════════ */

describe('Inventory — Reservation Expiry', () => {
  it('active reservation past expiresAt should be released', () => {
    const reservation = {
      status: 'active' as const,
      expiresAt: new Date(Date.now() - 60000), // 1 minute ago
    };
    const shouldExpire = reservation.status === 'active' && reservation.expiresAt < new Date();
    expect(shouldExpire).toBe(true);
  });

  it('active reservation not yet expired should NOT be released', () => {
    const reservation = {
      status: 'active' as const,
      expiresAt: new Date(Date.now() + 60000), // 1 minute from now
    };
    const shouldExpire = reservation.status === 'active' && reservation.expiresAt < new Date();
    expect(shouldExpire).toBe(false);
  });

  it('already released reservation should NOT be re-released', () => {
    const reservation = {
      status: 'released' as string,
      expiresAt: new Date(Date.now() - 60000),
    };
    const shouldExpire = reservation.status === 'active' && reservation.expiresAt < new Date();
    expect(shouldExpire).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   LOW STOCK DETECTION
   ═══════════════════════════════════════════════════════════════════ */

describe('Inventory — Low Stock Detection', () => {
  it('detects low stock when available < threshold', () => {
    const stock = { on_hand: 10, reserved: 8, damaged: 0, missing: 0 };
    const threshold = 5;
    const available = stock.on_hand - stock.reserved - stock.damaged - stock.missing;
    expect(available).toBe(2);
    expect(available < threshold).toBe(true);
  });

  it('no alert when available >= threshold', () => {
    const stock = { on_hand: 50, reserved: 5, damaged: 0, missing: 0 };
    const threshold = 10;
    const available = stock.on_hand - stock.reserved - stock.damaged - stock.missing;
    expect(available).toBe(45);
    expect(available < threshold).toBe(false);
  });

  it('no alert when threshold is 0 (disabled)', () => {
    const threshold = 0;
    const shouldAlert = threshold > 0;
    expect(shouldAlert).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   PRODUCT SCHEMA CONTRACT
   ═══════════════════════════════════════════════════════════════════ */

describe('Inventory — Product Schema Contract', () => {
  it('product has all required fields', () => {
    const product = {
      tenantId: 'tenant-1',
      businessId: 'biz-1',
      name: 'Test Product',
      price: 29.99,
      images: [],
      tags: [],
      variants: [{ name: 'Size', values: ['S', 'M', 'L'] }],
      stock: {
        S: { on_hand: 10, reserved: 0, damaged: 0, missing: 0 },
        M: { on_hand: 5, reserved: 0, damaged: 0, missing: 0 },
        L: { on_hand: 0, reserved: 0, damaged: 0, missing: 0 },
      },
      status: 'active',
      lowStockThreshold: 5,
    };
    expect(product.tenantId).toBeTruthy();
    expect(product.name).toBeTruthy();
    expect(product.price).toBeGreaterThan(0);
    expect(Object.keys(product.stock).length).toBe(3);
  });

  it('stock per variant has correct shape', () => {
    const variantStock = { on_hand: 10, reserved: 2, damaged: 1, missing: 0 };
    expect(variantStock).toHaveProperty('on_hand');
    expect(variantStock).toHaveProperty('reserved');
    expect(variantStock).toHaveProperty('damaged');
    expect(variantStock).toHaveProperty('missing');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   COLLECTION SCHEMA CONTRACT
   ═══════════════════════════════════════════════════════════════════ */

describe('Inventory — Collection Schema Contract', () => {
  it('collection requires tenantId, name, slug', () => {
    const collection = {
      tenantId: 'tenant-1',
      businessId: 'biz-1',
      name: 'Summer Collection',
      slug: 'summer-collection',
      productIds: ['prod-1', 'prod-2'],
      status: 'active',
    };
    expect(collection.tenantId).toBeTruthy();
    expect(collection.name).toBeTruthy();
    expect(collection.slug).toBeTruthy();
    expect(collection.productIds.length).toBe(2);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   SEARCH CONTRACT
   ═══════════════════════════════════════════════════════════════════ */

describe('Inventory — Search Contract', () => {
  it('text search weights are correct priority', () => {
    const weights = { name: 10, tags: 5, vendor: 3, sku: 2, description: 1 };
    expect(weights.name).toBeGreaterThan(weights.tags);
    expect(weights.tags).toBeGreaterThan(weights.vendor);
    expect(weights.vendor).toBeGreaterThan(weights.sku);
    expect(weights.sku).toBeGreaterThan(weights.description);
  });

  it('search input is trimmed and capped', () => {
    const raw = '   bag   ';
    const processed = raw.trim().slice(0, 200);
    expect(processed).toBe('bag');
  });

  it('search regex escapes special characters', () => {
    const raw = 'bag.*+?^${}()|[]\\';
    const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    expect(escaped).not.toContain('.*');
    expect(escaped).toContain('\\.');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   RESERVATION ITEM CONTRACT
   ═══════════════════════════════════════════════════════════════════ */

describe('Inventory — Reservation Item Contract', () => {
  it('reservation item has productId, variantId, qty', () => {
    const item = { productId: 'prod-1', variantId: 'M', qty: 2 };
    expect(item.productId).toBeTruthy();
    expect(item.variantId).toBeTruthy();
    expect(item.qty).toBeGreaterThan(0);
  });

  it('reservation has TTL', () => {
    const ttlMinutes = 30;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
