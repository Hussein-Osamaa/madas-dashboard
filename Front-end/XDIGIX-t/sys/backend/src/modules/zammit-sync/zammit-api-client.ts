/**
 * HTTP client for the Zammit REST API (https://api.zammit.shop/api/v2).
 * Handles authentication, token management, and order fetching.
 *
 * Discovery: Zammit's dashboard is a Quasar SPA that talks to a hidden REST API.
 * Endpoints reverse-engineered from the JS bundle:
 *   POST /api/v2/authentication/email   → login
 *   GET  /api/v2/purchases              → list orders (with includes for relations)
 *   GET  /api/v2/purchases/:id          → single order detail
 */

import { config } from '../../config';
import { logger } from '../../utils/logger';
import type {
  ZammitLoginResponse,
  ZammitPurchasesResponse,
  ZammitPurchase,
} from './types';

const API_BASE = config.zammit.apiBaseUrl;
const API_PREFIX = '/api/v2';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** Default includes for purchase list — fetches related customer, address, and products in one call */
const PURCHASE_INCLUDES = JSON.stringify([
  { relation: 'purchase_products' },
  { relation: 'customer' },
  { relation: 'address' },
]);

/** Delay between API calls to avoid rate-limiting (ms) */
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

  /**
   * Login to Zammit and store the access token.
   * @throws Error if credentials are invalid or Zammit is unreachable.
   */
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
   * Fetch a page of purchases (orders) from Zammit, newest first.
   * Includes: customer, address, purchase_products in each record.
   */
  async fetchPurchasesPage(page: number, limit = 25): Promise<ZammitPurchasesResponse> {
    this.requireToken();

    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      includes: PURCHASE_INCLUDES,
      order: JSON.stringify({ id: 'desc' }),
    });

    const url = `${API_BASE}${API_PREFIX}/purchases?${params.toString()}`;
    const res = await this.authenticatedGet(url);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      if (res.status === 401) {
        throw new Error('Zammit session expired (401)');
      }
      throw new Error(`Zammit fetch purchases failed: HTTP ${res.status} — ${text.slice(0, 200)}`);
    }

    return (await res.json()) as ZammitPurchasesResponse;
  }

  /**
   * Fetch all new purchases (not yet synced).
   * Paginates from newest to oldest. Stops when it hits a page where all orders are already synced.
   *
   * @param syncedIds - Set of Zammit purchase IDs that have already been imported.
   * @param maxPages - Safety limit to prevent infinite pagination.
   * @returns Array of new (unseen) purchases, newest first.
   */
  async fetchNewPurchases(
    syncedIds: Set<string>,
    maxPages = 20
  ): Promise<ZammitPurchase[]> {
    const newPurchases: ZammitPurchase[] = [];
    let page = 1;

    while (page <= maxPages) {
      logger.debug('Zammit API: fetching purchases page', { page: String(page) });

      const response = await this.fetchPurchasesPage(page, 25);
      const purchases = response.data;

      if (!purchases || purchases.length === 0) break;

      let allSynced = true;
      for (const purchase of purchases) {
        // Skip drafts and abandoned carts
        if (purchase.status === 'draft') continue;

        const purchaseId = String(purchase.id);
        if (!syncedIds.has(purchaseId)) {
          newPurchases.push(purchase);
          allSynced = false;
        }
      }

      // If every order on this page was already synced, stop — older pages will be too
      if (allSynced) {
        logger.debug('Zammit API: all orders on page already synced, stopping', {
          page: String(page),
        });
        break;
      }

      // If we've reached the last page, stop
      if (page >= response.metadata.totalPages) break;

      page++;
      await sleep(REQUEST_DELAY_MS);
    }

    logger.info('Zammit API: fetch complete', {
      newOrders: String(newPurchases.length),
      pagesScanned: String(page),
    });

    return newPurchases;
  }

  /**
   * Test credentials by attempting login. Does not store the token.
   * @returns true if login succeeds, error message otherwise.
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
