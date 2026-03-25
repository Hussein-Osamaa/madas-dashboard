/**
 * Type definitions for Zammit API responses and internal mapping.
 * Based on the Zammit REST API at https://api.zammit.shop/api/v2.
 */

// ── Zammit API Response Types ─────────────────────────────────────

export interface ZammitAddress {
  id: number;
  addressLine1: string;
  addressLine2: string | null;
  addressLineWithLocation: string;
  addressType: string;
  apartment: string;
  building: string;
  city: string;
  country: string;
  district: string;
  floor: string;
  name: string;
  phoneNumber: string;
  postalCode: string;
  region: string;
}

export interface ZammitCustomer {
  id: number;
  email: string;
  phoneNumber: string;
  loginPhoneNumber: string | null;
  name: string;
  isGuest: boolean;
  companyId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ZammitVariant {
  id: number;
  sku: string | null;
  barCode: string | null;
  quantity: number;
  priceCents: number;
  discountedPriceCents: number | null;
  isOnSale: boolean;
  weight: string;
  productId: number;
  isDefault: boolean;
}

export interface ZammitPurchaseProduct {
  id: number;
  purchaseId: number;
  productId: number;
  priceAtPurchase: number;
  quantity: number;
  sku: string | null;
  extras: Record<string, unknown>;
  variantId: number;
  name: string;
  vendor: string | null;
  isPhysical: boolean;
  image: string;
  variantName: string;
  values: string[];
  variant?: ZammitVariant;
  pricedBy: string;
  unitPriceWithAddons: number;
  finalPriceWithAddons: number;
}

export interface ZammitPurchase {
  id: number;
  activatedAt: string | null;
  address: ZammitAddress | null;
  addressId: number | null;
  channel: string;
  codFee: number;
  companyId: number;
  courier: string;
  courierDiscount: number;
  courierTrackingId: string | null;
  createdAt: string;
  creatorId: number | null;
  currency: string;
  customer: ZammitCustomer | null;
  customerId: number | null;
  deliveryNeeded: boolean;
  discountId: number | null;
  discountValue: number;
  fulfillment: string;
  fulfillmentDate: string | null;
  isManuallyCreated: boolean;
  isPhysical: boolean;
  itemsCount: number;
  notes: string | null;
  payment: string;
  paymentDate: string | null;
  paymentType: string | null;
  purchaseProducts: ZammitPurchaseProduct[];
  shippingFee: number;
  shippingType: string;
  status: string;
  storePickup: boolean;
  subtotal: number;
  taxValue: number;
  total: number;
  updatedAt: string;
}

export interface ZammitPaginationMetadata {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
}

export interface ZammitPurchasesResponse {
  message: string;
  data: ZammitPurchase[];
  metadata: ZammitPaginationMetadata;
}

export interface ZammitPurchaseDetailResponse {
  message: string;
  data: ZammitPurchase;
}

export interface ZammitLoginResponse {
  accessToken: string;
  tokenType: string;
  user: {
    id: number;
    companyId: number;
    email: string;
    name: string;
    loginPhoneNumber: string;
  };
}

// ── Sync Result Types ─────────────────────────────────────────────

export interface SyncResult {
  success: boolean;
  newOrdersCount: number;
  skippedCount: number;
  errors: string[];
  durationMs: number;
}
