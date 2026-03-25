/**
 * Zammit Order Sync Module
 *
 * Syncs orders from Zammit (https://dashboard.zammit.shop) into XDIGIX
 * using Zammit's hidden REST API at https://api.zammit.shop/api/v2.
 */

export { ZammitApiClient } from './zammit-api-client';
export { mapZammitPurchaseToOrder, type XdigixProduct } from './zammit-order-mapper';
export { syncZammitOrders } from './zammit-sync.service';
export { startZammitSyncCron } from './zammit-scheduler.service';
export type { SyncResult, ZammitPurchase, ZammitLoginResponse } from './types';
