/**
 * Export generators — read-only data extraction per resource type.
 *
 * Each generator returns { rows, columns } for CSV serialization,
 * or raw objects for JSON. Never mutates any collection.
 * Sensitive/internal fields are stripped from merchant exports.
 */
import mongoose from 'mongoose';
import type { ExportScope, IExportFilters } from './export-job.schema';

/* ── Types ────────────────────────────────────────────────────────── */

export interface ExportData {
  rows: Record<string, unknown>[];
  columns: string[];
}

interface GenOpts {
  tenantId: string;
  scope: ExportScope;
  filters?: IExportFilters | null;
  limit?: number;
}

const MAX_ROWS = 50000;

function dateFilter(filters?: IExportFilters | null, field = 'createdAt'): Record<string, unknown> {
  if (!filters?.from && !filters?.to) return {};
  const range: Record<string, Date> = {};
  if (filters.from) range.$gte = new Date(filters.from);
  if (filters.to) range.$lte = new Date(filters.to);
  return { [field]: range };
}

/* ── Order export ─────────────────────────────────────────────────── */

export async function exportOrders(opts: GenOpts): Promise<ExportData> {
  const Order = mongoose.models.StorefrontOrder;
  if (!Order) return { rows: [], columns: [] };

  const query: Record<string, unknown> = { tenantId: opts.tenantId, ...dateFilter(opts.filters) };
  if (opts.filters?.status) query.status = opts.filters.status;

  const docs = await Order.find(query)
    .sort({ createdAt: -1 })
    .limit(opts.limit || MAX_ROWS)
    .lean();

  const columns = [
    'orderId', 'status', 'paymentMethod', 'paymentStatus', 'subtotal',
    'shippingCost', 'total', 'currency', 'customer.email', 'customer.firstName',
    'customer.lastName', 'customer.phone', 'shipping.city', 'shipping.country',
    'createdAt',
  ];

  const rows = docs.map((d: Record<string, unknown>) => {
    const cust = (d.customer || {}) as Record<string, unknown>;
    const ship = (d.shipping || {}) as Record<string, unknown>;
    return {
      orderId: d.orderId,
      status: d.status,
      paymentMethod: d.paymentMethod,
      paymentStatus: d.paymentStatus,
      subtotal: d.subtotal,
      shippingCost: d.shippingCost,
      total: d.total,
      currency: d.currency,
      'customer.email': cust.email,
      'customer.firstName': cust.firstName,
      'customer.lastName': cust.lastName,
      'customer.phone': cust.phone,
      'shipping.city': ship.city,
      'shipping.country': ship.country,
      createdAt: d.createdAt,
    };
  });

  return { rows, columns };
}

/* ── Product export ───────────────────────────────────────────────── */

export async function exportProducts(opts: GenOpts): Promise<ExportData> {
  const Product = mongoose.models.Product;
  if (!Product) return { rows: [], columns: [] };

  const query: Record<string, unknown> = {
    tenantId: opts.tenantId,
    deleted: { $ne: true },
    ...dateFilter(opts.filters),
  };

  const docs = await Product.find(query)
    .sort({ createdAt: -1 })
    .limit(opts.limit || MAX_ROWS)
    .lean();

  const columns = [
    'name', 'sku', 'barcode', 'price', 'sellingPrice', 'currency',
    'status', 'vendor', 'tags', 'lowStockThreshold', 'createdAt',
  ];

  const rows = docs.map((d: Record<string, unknown>) => ({
    name: d.name,
    sku: d.sku || '',
    barcode: d.barcode || '',
    price: d.price,
    sellingPrice: d.sellingPrice || d.price,
    currency: d.currency,
    status: d.status,
    vendor: d.vendor || '',
    tags: Array.isArray(d.tags) ? (d.tags as string[]).join(', ') : '',
    lowStockThreshold: d.lowStockThreshold,
    createdAt: d.createdAt,
  }));

  return { rows, columns };
}

/* ── Customer export (from orders) ────────────────────────────────── */

export async function exportCustomers(opts: GenOpts): Promise<ExportData> {
  const Order = mongoose.models.StorefrontOrder;
  if (!Order) return { rows: [], columns: [] };

  // Deduplicate customers by email from orders
  const docs = await Order.aggregate([
    { $match: { tenantId: opts.tenantId, ...dateFilter(opts.filters) } },
    {
      $group: {
        _id: '$customer.email',
        firstName: { $first: '$customer.firstName' },
        lastName: { $first: '$customer.lastName' },
        phone: { $first: '$customer.phone' },
        orderCount: { $sum: 1 },
        totalSpent: { $sum: '$total' },
        lastOrderAt: { $max: '$createdAt' },
        city: { $first: '$shipping.city' },
        country: { $first: '$shipping.country' },
      },
    },
    { $sort: { totalSpent: -1 } },
    { $limit: opts.limit || MAX_ROWS },
  ]);

  const columns = [
    'email', 'firstName', 'lastName', 'phone', 'orderCount',
    'totalSpent', 'lastOrderAt', 'city', 'country',
  ];

  const rows = docs.map((d: Record<string, unknown>) => ({
    email: d._id,
    firstName: d.firstName,
    lastName: d.lastName,
    phone: d.phone || '',
    orderCount: d.orderCount,
    totalSpent: d.totalSpent,
    lastOrderAt: d.lastOrderAt,
    city: d.city || '',
    country: d.country || '',
  }));

  return { rows, columns };
}

/* ── Ticket export ────────────────────────────────────────────────── */

export async function exportTickets(opts: GenOpts): Promise<ExportData> {
  const Ticket = mongoose.models.Ticket;
  if (!Ticket) return { rows: [], columns: [] };

  const query: Record<string, unknown> = {
    tenantId: opts.tenantId,
    ...dateFilter(opts.filters),
  };
  // Merchants cannot export internal tickets
  if (opts.scope === 'merchant_self') {
    query.visibility = 'tenant';
  }
  if (opts.filters?.status) query.status = opts.filters.status;

  const docs = await Ticket.find(query)
    .sort({ createdAt: -1 })
    .limit(opts.limit || MAX_ROWS)
    .lean();

  const columns = [
    'ticketId', 'subject', 'status', 'priority', 'category',
    'visibility', 'createdBy.email', 'assignedTo.userId',
    'linkedOrderId', 'linkedShipmentId', 'createdAt', 'resolvedAt', 'closedAt',
  ];

  const rows = docs.map((d: Record<string, unknown>) => {
    const creator = (d.createdBy || {}) as Record<string, unknown>;
    const assignee = (d.assignedTo || {}) as Record<string, unknown>;
    return {
      ticketId: d.ticketId,
      subject: d.subject,
      status: d.status,
      priority: d.priority,
      category: d.category,
      visibility: d.visibility,
      'createdBy.email': creator.email || '',
      'assignedTo.userId': assignee.userId || '',
      linkedOrderId: d.linkedOrderId || '',
      linkedShipmentId: d.linkedShipmentId || '',
      createdAt: d.createdAt,
      resolvedAt: d.resolvedAt || '',
      closedAt: d.closedAt || '',
    };
  });

  return { rows, columns };
}

/* ── Finance export (ledger entries) ──────────────────────────────── */

export async function exportFinance(opts: GenOpts): Promise<ExportData> {
  const LedgerEntry = mongoose.models.LedgerEntry;
  if (!LedgerEntry) return { rows: [], columns: [] };

  const query: Record<string, unknown> = { tenantId: opts.tenantId, ...dateFilter(opts.filters) };

  const docs = await LedgerEntry.find(query)
    .sort({ createdAt: -1 })
    .limit(opts.limit || MAX_ROWS)
    .lean();

  const columns = [
    'type', 'amount', 'currency', 'status', 'referenceType',
    'referenceId', 'orderId', 'invoiceId', 'createdAt',
  ];

  const rows = docs.map((d: Record<string, unknown>) => ({
    type: d.type,
    amount: d.amount,
    currency: d.currency,
    status: d.status,
    referenceType: d.referenceType,
    referenceId: d.referenceId,
    orderId: d.orderId || '',
    invoiceId: d.invoiceId || '',
    createdAt: d.createdAt,
  }));

  return { rows, columns };
}

/* ── Inventory export (stock movements) ───────────────────────────── */

export async function exportInventory(opts: GenOpts): Promise<ExportData> {
  const StockMovement = mongoose.models.StockMovement;
  if (!StockMovement) return { rows: [], columns: [] };

  const query: Record<string, unknown> = { tenantId: opts.tenantId, ...dateFilter(opts.filters) };

  const docs = await StockMovement.find(query)
    .sort({ createdAt: -1 })
    .limit(opts.limit || MAX_ROWS)
    .lean();

  const columns = [
    'productId', 'variantId', 'type', 'qty', 'referenceType',
    'referenceId', 'reason', 'actor', 'createdAt',
  ];

  const rows = docs.map((d: Record<string, unknown>) => ({
    productId: d.productId,
    variantId: d.variantId,
    type: d.type,
    qty: d.qty,
    referenceType: d.referenceType || '',
    referenceId: d.referenceId || '',
    reason: d.reason || '',
    actor: d.actor,
    createdAt: d.createdAt,
  }));

  return { rows, columns };
}

/* ── Audit log export (admin only) ────────────────────────────────── */

export async function exportAuditLogs(opts: GenOpts): Promise<ExportData> {
  // Only admin_tenant scope allowed for audit logs
  if (opts.scope !== 'admin_tenant') {
    return { rows: [], columns: [] };
  }

  const AuditLog = mongoose.models.AuditLog;
  if (!AuditLog) return { rows: [], columns: [] };

  const query: Record<string, unknown> = { ...dateFilter(opts.filters, 'timestamp') };
  if (opts.tenantId) query.tenantId = opts.tenantId;

  const docs = await AuditLog.find(query)
    .sort({ timestamp: -1 })
    .limit(opts.limit || MAX_ROWS)
    .lean();

  const columns = [
    'actor', 'actorType', 'module', 'action', 'entityType',
    'entityId', 'tenantId', 'timestamp',
  ];

  const rows = docs.map((d: Record<string, unknown>) => ({
    actor: d.actor,
    actorType: d.actorType,
    module: d.module,
    action: d.action,
    entityType: d.entityType,
    entityId: d.entityId,
    tenantId: d.tenantId || '',
    timestamp: d.timestamp,
    // details intentionally excluded — may contain sensitive internal data
  }));

  return { rows, columns };
}
