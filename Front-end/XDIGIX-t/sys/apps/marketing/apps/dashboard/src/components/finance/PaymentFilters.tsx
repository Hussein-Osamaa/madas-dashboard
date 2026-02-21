import { Listbox, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { ChevronUpDownIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

type Option = { id: string; label: string };

type Props = {
  method: string;
  onMethodChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
};

const methodOptions: Option[] = [
  { id: 'all', label: 'All methods' },
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Card' },
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'online_gateway', label: 'Online Gateway' }
];

const statusOptions: Option[] = [
  { id: 'all', label: 'All statuses' },
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
  { id: 'refunded', label: 'Refunded' }
];

const PaymentFilters = ({ method, onMethodChange, status, onStatusChange }: Props) => (
  <div className="flex flex-wrap gap-3">
    <FilterSelect label="Method" value={method} options={methodOptions} onChange={onMethodChange} />
    <FilterSelect label="Status" value={status} options={statusOptions} onChange={onStatusChange} />
  </div>
);

type FilterSelectProps = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
};

const FilterSelect = ({ label, value, options, onChange }: FilterSelectProps) => {
  const selected = options.find((option) => option.id === value) ?? options[0];

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-madas-text/60">{label}</p>
      <Listbox value={selected.id} onChange={onChange}>
        <div className="relative">
          <Listbox.Button className="relative w-52 cursor-pointer rounded-2xl border border-gray-100 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            <span className="block truncate text-sm font-medium text-primary">{selected.label}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronUpDownIcon className="h-5 w-5 text-primary/70" />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            enter="transition ease-out duration-100"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
          >
            <Listbox.Options className="absolute z-[9999] mt-2 max-h-60 w-full overflow-auto rounded-2xl border border-gray-100 bg-white py-1 shadow-2xl ring-1 ring-black/5 focus:outline-none" style={{ position: 'absolute', zIndex: 9999 }}>
              {options.map((option) => (
                <Listbox.Option
                  key={option.id}
                  value={option.id}
                  className={({ active }) =>
                    clsx(
                      'relative cursor-pointer select-none py-2 pl-4 pr-4 text-sm',
                      active ? 'bg-primary/10 text-primary' : 'text-madas-text'
                    )
                  }
                >
                  {option.label}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
};

export default PaymentFilters;

