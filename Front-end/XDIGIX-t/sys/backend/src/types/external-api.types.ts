/**
 * Types for the multi-tenant external API.
 * No secrets in frontend; all resolved server-side.
 */

export interface ExternalTenantCredentials {
  tenantId: string;
  apiToken: string;
  webhookSecret: string;
  enabled: boolean;
  apiEnabled?: boolean;
  webhookEnabled?: boolean;
}

export interface ExternalApiRequestContext {
  requestId: string;
  tenantId: string;
  /** For orders: businessId to use (e.g. same as tenantId when 1:1). */
  businessId: string;
}

/** Attached to req by middleware */
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      rawBody?: Buffer;
      externalTenant?: ExternalTenantCredentials;
      externalContext?: ExternalApiRequestContext;
    }
  }
}

export interface ExternalOrderItem {
  productId: string;
  quantity: number;
  size?: string;
}

export interface ExternalOrderPayload {
  items: ExternalOrderItem[];
  /** Optional client/source identifier (e.g. external site name). */
  source?: string;
  /** Optional customer email for the order. */
  customerEmail?: string;
  /** Optional shipping/details - extend as needed. */
  metadata?: Record<string, unknown>;
}

export interface WebhookEventPayload {
  event: string;
  /** ISO timestamp; used for replay protection. */
  timestamp: string;
  data: Record<string, unknown>;
}
