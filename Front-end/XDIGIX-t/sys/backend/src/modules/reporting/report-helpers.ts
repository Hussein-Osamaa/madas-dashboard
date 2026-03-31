/**
 * Reporting helpers — shared types, date grouping, filter builders.
 * All functions are pure and read-only.
 */

/* ── Shared types ────────────────────────────────────────────────── */

export type GroupBy = 'day' | 'week' | 'month';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ReportFilters {
  tenantId?: string;
  businessId?: string;
  dateRange?: DateRange;
  groupBy?: GroupBy;
  limit?: number;
  page?: number;
}

/* ── Date grouping expression for $group ─────────────────────────── */

export function dateGroupExpr(field: string, groupBy: GroupBy = 'day'): Record<string, unknown> {
  switch (groupBy) {
    case 'week':
      return { year: { $isoWeekYear: `$${field}` }, week: { $isoWeek: `$${field}` } };
    case 'month':
      return { year: { $year: `$${field}` }, month: { $month: `$${field}` } };
    case 'day':
    default:
      return {
        year: { $year: `$${field}` },
        month: { $month: `$${field}` },
        day: { $dayOfMonth: `$${field}` },
      };
  }
}

/* ── Build a $match filter from ReportFilters ────────────────────── */

export function buildMatch(
  filters: ReportFilters,
  dateField = 'createdAt',
): Record<string, unknown> {
  const match: Record<string, unknown> = {};
  if (filters.tenantId) match.tenantId = filters.tenantId;
  if (filters.businessId) match.businessId = filters.businessId;
  if (filters.dateRange) {
    match[dateField] = { $gte: filters.dateRange.from, $lte: filters.dateRange.to };
  }
  return match;
}

/* ── Default date range (last 30 days) ───────────────────────────── */

export function defaultDateRange(): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from, to };
}

/* ── Pagination helpers ──────────────────────────────────────────── */

export function paginationStages(filters: ReportFilters): Array<Record<string, unknown>> {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(Math.max(1, filters.limit || 50), 200);
  return [{ $skip: (page - 1) * limit }, { $limit: limit }];
}

export function parseDateRange(from?: string, to?: string): DateRange | undefined {
  if (!from && !to) return undefined;
  return {
    from: from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: to ? new Date(to) : new Date(),
  };
}

export function parseFilters(query: Record<string, unknown>): ReportFilters {
  return {
    tenantId: query.tenantId as string | undefined,
    businessId: query.businessId as string | undefined,
    dateRange: parseDateRange(query.from as string, query.to as string),
    groupBy: (query.groupBy as GroupBy) || 'day',
    limit: query.limit ? Number(query.limit) : 50,
    page: query.page ? Number(query.page) : 1,
  };
}
