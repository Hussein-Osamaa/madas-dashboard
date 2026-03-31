/**
 * Inventory reports — read-only aggregations over Product, StockMovement, Reservation.
 */

import { Product } from '../inventory/product.schema';
import { StockMovement } from '../inventory/stock-movement.schema';
import { Reservation } from '../inventory/reservation.schema';
import {
  ReportFilters,
  buildMatch,
  dateGroupExpr,
  defaultDateRange,
} from './report-helpers';

export const inventoryReports = {
  /**
   * D1 — Inventory summary.
   */
  async summary(filters: ReportFilters) {
    const match: Record<string, unknown> = {};
    if (filters.tenantId) match.tenantId = filters.tenantId;
    if (filters.businessId) match.businessId = filters.businessId;
    match.deleted = { $ne: true };

    const products = await Product.aggregate([
      { $match: match },
      { $addFields: { stockEntries: { $objectToArray: { $ifNull: ['$stock', {}] } } } },
      { $unwind: { path: '$stockEntries', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalProducts: { $addToSet: '$_id' },
          totalOnHand: { $sum: { $ifNull: ['$stockEntries.v.on_hand', 0] } },
          totalReserved: { $sum: { $ifNull: ['$stockEntries.v.reserved', 0] } },
          totalDamaged: { $sum: { $ifNull: ['$stockEntries.v.damaged', 0] } },
          totalMissing: { $sum: { $ifNull: ['$stockEntries.v.missing', 0] } },
          // Retail inventory value (on_hand * unit price). No cost field exists.
          totalValue: {
            $sum: {
              $multiply: [
                { $ifNull: ['$stockEntries.v.on_hand', 0] },
                { $ifNull: ['$price', 0] },
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalProducts: { $size: '$totalProducts' },
          totalOnHand: 1,
          totalReserved: 1,
          totalDamaged: 1,
          totalMissing: 1,
          totalValue: { $round: ['$totalValue', 2] },
        },
      },
    ]);

    return products[0] || {
      totalProducts: 0,
      totalOnHand: 0,
      totalReserved: 0,
      totalDamaged: 0,
      totalMissing: 0,
      totalValue: 0,
    };
  },

  /**
   * D2 — Low stock report.
   */
  async lowStock(filters: ReportFilters) {
    const match: Record<string, unknown> = {
      deleted: { $ne: true },
      status: 'active',
      lowStockThreshold: { $gt: 0 },
    };
    if (filters.tenantId) match.tenantId = filters.tenantId;
    if (filters.businessId) match.businessId = filters.businessId;

    return Product.aggregate([
      { $match: match },
      { $addFields: { stockEntries: { $objectToArray: { $ifNull: ['$stock', {}] } } } },
      { $unwind: '$stockEntries' },
      {
        $addFields: {
          available: {
            $subtract: [
              { $ifNull: ['$stockEntries.v.on_hand', 0] },
              {
                $add: [
                  { $ifNull: ['$stockEntries.v.reserved', 0] },
                  { $ifNull: ['$stockEntries.v.damaged', 0] },
                  { $ifNull: ['$stockEntries.v.missing', 0] },
                ],
              },
            ],
          },
        },
      },
      { $match: { $expr: { $lt: ['$available', '$lowStockThreshold'] } } },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          name: 1,
          variant: '$stockEntries.k',
          available: 1,
          threshold: '$lowStockThreshold',
          tenantId: 1,
          businessId: 1,
        },
      },
      { $sort: { available: 1 } },
      { $limit: filters.limit || 100 },
    ]);
  },

  /**
   * D3 — Stock movement trend.
   */
  async movementTrend(filters: ReportFilters) {
    const match = buildMatch({ ...filters, dateRange: filters.dateRange || defaultDateRange() });
    const groupBy = filters.groupBy || 'day';
    return StockMovement.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            period: dateGroupExpr('createdAt', groupBy),
            type: '$type',
          },
          totalQty: { $sum: '$qty' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.period.year': 1, '_id.period.month': 1, '_id.period.day': 1 } },
    ]);
  },

  /**
   * D4 — Most reserved products.
   */
  async mostReserved(filters: ReportFilters) {
    const match: Record<string, unknown> = { status: 'active' };
    if (filters.tenantId) match.tenantId = filters.tenantId;
    if (filters.businessId) match.businessId = filters.businessId;

    return Reservation.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalReservedQty: { $sum: '$items.qty' },
          reservationCount: { $sum: 1 },
        },
      },
      { $sort: { totalReservedQty: -1 } },
      { $limit: filters.limit || 20 },
    ]);
  },

  /**
   * D5/D6 — Fastest / slowest moving products.
   */
  async productVelocity(filters: ReportFilters, direction: 'fastest' | 'slowest' = 'fastest') {
    const match = buildMatch({ ...filters, dateRange: filters.dateRange || defaultDateRange() });
    const sortDir = direction === 'fastest' ? -1 : 1;

    return StockMovement.aggregate([
      // Only count actual outbound movement (fulfillment), not holds (reservation)
      { $match: { ...match, type: { $in: ['fulfillment', 'receiving', 'return'] } } },
      {
        $group: {
          _id: '$productId',
          totalQty: { $sum: '$qty' },
          movementCount: { $sum: 1 },
        },
      },
      { $sort: { totalQty: sortDir } },
      { $limit: filters.limit || 20 },
    ]);
  },
};
