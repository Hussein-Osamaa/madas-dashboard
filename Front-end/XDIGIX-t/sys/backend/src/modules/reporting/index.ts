/**
 * Reporting module — barrel export.
 * Read-only analytics layer over existing platform data.
 */

export { revenueReports } from './revenue.reports';
export { orderReports } from './order.reports';
export { inventoryReports } from './inventory.reports';
export { fulfillmentReports } from './fulfillment.reports';
export { shippingReports } from './shipping.reports';
export { notificationReports } from './notification.reports';
export { tenantReports } from './tenant.reports';
export { default as reportingRoutes } from './reporting.routes';
export {
  type ReportFilters,
  type DateRange,
  type GroupBy,
  parseFilters,
  parseDateRange,
  buildMatch,
  dateGroupExpr,
  defaultDateRange,
} from './report-helpers';
