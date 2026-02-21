import { Listbox, Transition } from '@headlessui/react';
import { Fragment, useMemo } from 'react';
import dayjs from 'dayjs';
import { ChevronUpDownIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

const ranges = [
  { id: '30d', label: 'Last 30 days', start: dayjs().subtract(29, 'day'), end: dayjs() },
  { id: '60d', label: 'Last 60 days', start: dayjs().subtract(59, 'day'), end: dayjs() },
  { id: '3m', label: 'Last 3 months', start: dayjs().subtract(3, 'month'), end: dayjs() },
  { id: 'ytd', label: 'Year to date', start: dayjs().startOf('year'), end: dayjs() }
];

type Filters = {
  vendor?: string;
  category?: string;
  status?: string;
};

type Props = {
  currentRangeId: string;
  onRangeChange: (rangeId: string, start: dayjs.Dayjs, end: dayjs.Dayjs) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
};

const ExpensesFilters = ({ currentRangeId, onRangeChange, filters, onFiltersChange }: Props) => {
  const currentRange = ranges.find((item) => item.id === currentRangeId) ?? ranges[0];

  const filtersActive = useMemo(() => {
    const entries = Object.entries(filters).filter(([, value]) => Boolean(value));
    return entries.map(([key, value]) => ({ key, value: value ?? '' }));
  }, [filters]);

  return (
    <div className="glass-card flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-madas-text/60">Filters</p>
        <p className="text-sm text-madas-text/70">
          {filtersActive.length
            ? `Active: ${filtersActive.map((item) => `${item.key}: ${item.value}`).join(', ')}`
            : 'Select date range, vendor, category or status'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Listbox
            value={currentRangeId}
            onChange={(value) => {
              const selected = ranges.find((item) => item.id === value);
              if (selected) {
                onRangeChange(selected.id, selected.start, selected.end);
              }
            }}
          >
            <div className="relative">
              <Listbox.Button className="w-48 cursor-pointer rounded-2xl bg-white py-2 pl-3 pr-10 text-left text-sm font-semibold text-primary shadow focus:outline-none">
                {currentRange.label}
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <ChevronUpDownIcon className="h-5 w-5 text-primary/70" />
                </span>
              </Listbox.Button>
              <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                <Listbox.Options className="absolute z-10 mt-2 max-h-60 w-48 overflow-auto rounded-2xl bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none">
                  {ranges.map((range) => (
                    <Listbox.Option
                      key={range.id}
                      value={range.id}
                      className={({ active }) =>
                        clsx('cursor-pointer px-4 py-2', active ? 'bg-primary/10 text-primary' : 'text-madas-text')
                      }
                    >
                      {range.label}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox>
        </div>
        <input
          placeholder="Vendor"
          value={filters.vendor ?? ''}
          onChange={(event) => onFiltersChange({ ...filters, vendor: event.target.value || undefined })}
          className="w-40 rounded-2xl border border-primary/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          placeholder="Category"
          value={filters.category ?? ''}
          onChange={(event) => onFiltersChange({ ...filters, category: event.target.value || undefined })}
          className="w-40 rounded-2xl border border-primary/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <select
          value={filters.status ?? 'all'}
          onChange={(event) =>
            onFiltersChange({ ...filters, status: event.target.value === 'all' ? undefined : event.target.value })
          }
          className="w-36 rounded-2xl border border-primary/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
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


