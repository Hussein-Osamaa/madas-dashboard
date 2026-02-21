import { Listbox, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import clsx from 'clsx';
import { ChevronUpDownIcon } from '@heroicons/react/24/outline';

type Option = { id: string; label: string };

type Props = {
  type: string;
  onTypeChange: (value: string) => void;
  method: string;
  onMethodChange: (value: string) => void;
};

const typeOptions: Option[] = [
  { id: 'all', label: 'All types' },
  { id: 'income', label: 'Income' },
  { id: 'expense', label: 'Expense' },
  { id: 'transfer', label: 'Transfer' }
];

const methodOptions: Option[] = [
  { id: 'all', label: 'All methods' },
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Card' },
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'online_gateway', label: 'Online Gateway' }
];

const TransactionFilters = ({ type, onTypeChange, method, onMethodChange }: Props) => (
  <div className="flex flex-wrap gap-3">
    <FilterSelect label="Type" value={type} options={typeOptions} onChange={onTypeChange} />
    <FilterSelect label="Method" value={method} options={methodOptions} onChange={onMethodChange} />
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
          <Listbox.Button className="relative w-52 cursor-pointer rounded-2xl bg-white py-2 pl-3 pr-10 text-left shadow focus:outline-none">
            <span className="block truncate text-sm font-medium text-primary">{selected.label}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronUpDownIcon className="h-5 w-5 text-primary/70" />
            </span>
          </Listbox.Button>
          <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
            <Listbox.Options className="absolute mt-2 max-h-60 w-full overflow-auto rounded-2xl bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
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

export default TransactionFilters;

