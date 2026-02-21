import { useMemo } from 'react';

type Filters = {
  vendor?: string;
  category?: string;
  status?: string;
};

type Props = {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onResetToThisMonth: () => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
};

const ExpensesFilters = ({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange, 
  onResetToThisMonth, 
  filters, 
  onFiltersChange 
}: Props) => {
  const filtersActive = useMemo(() => {
    const entries = Object.entries(filters).filter(([, value]) => Boolean(value));
    return entries.map(([key, value]) => ({ key, value: value ?? '' }));
  }, [filters]);

  return (
    <div className="relative flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white/80 p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-madas-text/60">Filters</p>
        <p className="text-sm text-madas-text/70">
          {filtersActive.length
            ? `Active: ${filtersActive.map((item) => `${item.key}: ${item.value}`).join(', ')}`
            : 'Select date range, vendor, category or status'}
        </p>
      </div>
        
        {/* Date Range */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-madas-text/70">Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-madas-text/70">End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={onResetToThisMonth}
            className="px-4 py-1.5 text-sm font-medium text-madas-text border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset to This Month
          </button>
        </div>
      </div>
      
      {/* Other Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          placeholder="Vendor"
          value={filters.vendor ?? ''}
          onChange={(event) => onFiltersChange({ ...filters, vendor: event.target.value || undefined })}
          className="w-40 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          placeholder="Category"
          value={filters.category ?? ''}
          onChange={(event) => onFiltersChange({ ...filters, category: event.target.value || undefined })}
          className="w-40 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <select
          value={filters.status ?? 'all'}
          onChange={(event) =>
            onFiltersChange({ ...filters, status: event.target.value === 'all' ? undefined : event.target.value })
          }
          className="w-36 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">All statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
    </div>
  );
};

export default ExpensesFilters;
