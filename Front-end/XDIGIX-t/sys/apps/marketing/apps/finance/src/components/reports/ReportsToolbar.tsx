import { Listbox, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { ChevronUpDownIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

const ranges = [
  { id: '30d', label: 'Last 30 days' },
  { id: '60d', label: 'Last 60 days' },
  { id: 'quarter', label: 'This quarter' },
  { id: 'ytd', label: 'Year to date' }
];

type Props = {
  filters: { range: string };
  onFiltersChange: (filters: { range: string }) => void;
  onExport: () => void;
};

const ReportsToolbar = ({ filters, onFiltersChange, onExport }: Props) => {
  const selectedRange = ranges.find((range) => range.id === filters.range) ?? ranges[0];

  return (
    <div className="glass-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-madas-text/60">Filters</p>
        <p className="text-sm text-madas-text/70">Select a range and export data in CSV, PDF or XLSX.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Listbox
          value={selectedRange.id}
          onChange={(value) => onFiltersChange({ range: value })}
        >
          <div className="relative">
            <Listbox.Button className="relative w-48 cursor-pointer rounded-2xl bg-white py-2 pl-3 pr-10 text-left text-sm font-semibold text-primary shadow focus:outline-none">
              {selectedRange.label}
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <ChevronUpDownIcon className="h-5 w-5 text-primary/70" />
              </span>
            </Listbox.Button>
            <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
              <Listbox.Options className="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-2xl bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none">
                {ranges.map((range) => (
                  <Listbox.Option
                    key={range.id}
                    value={range.id}
                    className={({ active }) =>
                      clsx(
                        'cursor-pointer px-4 py-2',
                        active ? 'bg-primary/10 text-primary' : 'text-madas-text'
                      )
                    }
                  >
                    {range.label}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>
        <button
          onClick={onExport}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition"
        >
          <ArrowDownTrayIcon className="h-4 w-4" /> Export
        </button>
      </div>
    </div>
  );
};

export default ReportsToolbar;

