/**
 * HTTP client for the Zammit REST API (https://api.zammit.shop/api/v2).
 *
 * IMPORTANT: The list endpoint (/purchases) returns purchaseProducts WITHOUT
 * name, variantName, image fields. Only the detail endpoint (/purchases/:id)
 * returns full product data. So we:
 * 1. Use the list endpoint to discover new order IDs
 * 2. Fetch each new order individually for full product details
 */

import { config } from '../../config';
import { logger } from '../../utils/logger';
import type {
  ZammitLoginResponse,
  ZammitPurchasesResponse,
  ZammitPurchaseDetailResponse,
  ZammitPurchase,
} from './types';

const API_BASE = config.zammit.apiBaseUrl;
const API_PREFIX = '/api/v2';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** Minimal includes for list (just to get IDs and basic status) */
const LIST_INCLUDES = JSON.stringify([
  { relation: 'customer' },
  { relation: 'address' },
]);

/** Full includes for detail endpoint (gets product names, images, variants) */
const DETAIL_INCLUDES = JSON.stringify([
  { relation: 'purchase_products' },
  { relation: 'customer' },
  { relation: 'address' },
  { relation: 'discount' },
]);

const REQUEST_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ZammitApiClient {
  private token: string | null = null;
  private readonly email: string;
  private readonly password: string;

  constructor(email: string, password: string) {
    this.email = email;
    this.password = password;
  }

  // ── Authentication ────────────────────────────────────────────

  async login(): Promise<ZammitLoginResponse> {
    const url = `${API_BASE}${API_PREFIX}/authentication/email`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify({
        email: this.email,
        password: this.password,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      if (res.status === 401 || res.status === 422) {
        throw new Error('Invalid Zammit credentials (email or password is wrong)');
      }
      throw new Error(`Zammit login failed: HTTP ${res.status} — ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as ZammitLoginResponse;
    if (!data.accessToken) {
      throw new Error('Zammit login response missing accessToken');
    }

    this.token = data.accessToken;
    logger.info('Zammit API: login successful', {
      userId: String(data.user?.id),
      companyId: String(data.user?.companyId),
    });

    return data;
  }

  // ── Orders ────────────────────────────────────────────────────

  /**
   * Fetch a page of purchases (list endpoint — basic data only, NO product names).
   */
  async fetchPurchasesPage(page: number, limit = 25): Promise<ZammitPurchasesResponse> {
    this.requireToken();

    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      includes: LIST_INCLUDES,
      order: JSON.stringify({ id: 'desc' }),
    });

    const url = `${API_BASE}${API_PREFIX}/purchases?${params.toString()}`;
    const res = await this.authenticatedGet(url);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      if (res.status === 401) throw new Error('Zammit session expired (401)');
      throw new Error(`Zammit fetch purchases failed: HTTP ${res.status} — ${text.slice(0, 200)}`);
    }

    return (await res.json()) as ZammitPurchasesResponse;
  }

  /**
   * Fetch a single purchase with FULL details (product names, images, variants).
   * This is the only way to get product names from Zammit.
   */
  async fetchPurchaseDetail(purchaseId: number): Promise<ZammitPurchase> {
    this.requireToken();

    const params = new URLSearchParams({
      includes: DETAIL_INCLUDES,
    });

    const url = `${API_BASE}${API_PREFIX}/purchases/${purchaseId}?${params.toString()}`;
    const res = await this.authenticatedGet(url);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      if (res.status === 401) throw new Error('Zammit session expired (401)');
      throw new Error(`Zammit fetch purchase #${purchaseId} failed: HTTP ${res.status} — ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as ZammitPurchaseDetailResponse;
    return json.data;
  }

  /**
   * Fetch all new purchases with FULL product details.
   *
   * Strategy:
   * 1. Use the list endpoint to paginate and find new order IDs
   * 2. For each new order, fetch full details individually (to get product names)
   * 3. Stop paginating when all orders on a page are already synced
   */
  async fetchNewPurchases(
    syncedIds: Set<string>,
    maxPages = 20
  ): Promise<ZammitPurchase[]> {
    const newPurchaseIds: number[] = [];
    let page = 1;

    // Phase 1: Discover new order IDs from list endpoint
    while (page <= maxPages) {
      logger.debug('Zammit API: scanning page for new orders', { page: String(page) });

      const response = await this.fetchPurchasesPage(page, 25);
      const purchases = response.data;

      if (!purchases || purchases.length === 0) break;

      let allSynced = true;
      for (const purchase of purchases) {
        if (purchase.status === 'draft') continue;

        const purchaseId = String(purchase.id);
        if (!syncedIds.has(purchaseId)) {
          newPurchaseIds.push(purchase.id);
          allSynced = false;
        }
      }

      if (allSynced) {
        logger.debug('Zammit API: all orders on page already synced, stopping', { page: String(page) });
        break;
      }

      if (page >= response.metadata.totalPages) break;

      page++;
      await sleep(REQUEST_DELAY_MS);
    }

    if (newPurchaseIds.length === 0) {
      logger.info('Zammit API: no new orders found');
      return [];
    }

    // Phase 2: Fetch FULL details for each new order (gets product names)
    logger.info('Zammit API: fetching full details for new orders', {
      count: String(newPurchaseIds.length),
    });

    const fullPurchases: ZammitPurchase[] = [];
    for (const id of newPurchaseIds) {
      try {
        const detail = await this.fetchPurchaseDetail(id);
        fullPurchases.push(detail);
        logger.debug('Zammit API: fetched order detail', {
          orderId: String(id),
          products: String(detail.purchaseProducts?.length || 0),
        });
      } catch (err) {
        logger.error('Zammit API: failed to fetch order detail', {
          orderId: String(id),
          error: (err as Error).message,
        });
        // Skip this order — it will be retried next sync
      }
      await sleep(REQUEST_DELAY_MS);
    }

    logger.info('Zammit API: fetch complete', {
      discovered: String(newPurchaseIds.length),
      fetched: String(fullPurchases.length),
      pagesScanned: String(page),
    });

    return fullPurchases;
  }

  /**
   * Test credentials by attempting login.
   */
  static async testCredentials(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const client = new ZammitApiClient(email, password);
      await client.login();
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  // ── Helpers ───────────────────────────────────────────────────

  private requireToken(): void {
    if (!this.token) {
      throw new Error('Not authenticated. Call login() first.');
    }
  }

  private authenticatedGet(url: string): Promise<Response> {
    return fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
        locale: 'all',
      },
    });
  }
}
