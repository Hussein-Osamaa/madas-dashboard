import { Listbox, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import dayjs from 'dayjs';
import { ChevronUpDownIcon, CalendarIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

const ranges = [
  { id: '30d', label: 'Last 30 days', start: dayjs().subtract(29, 'day'), end: dayjs() },
  { id: '60d', label: 'Last 60 days', start: dayjs().subtract(59, 'day'), end: dayjs() },
  { id: '3m', label: 'Last 3 months', start: dayjs().subtract(3, 'month'), end: dayjs() },
  { id: 'ytd', label: 'Year to date', start: dayjs().startOf('year'), end: dayjs() }
];

type Props = {
  currentRangeId: string;
  onRangeChange: (rangeId: string, start: dayjs.Dayjs, end: dayjs.Dayjs) => void;
};

const OverviewFilters = ({ currentRangeId, onRangeChange }: Props) => {
  const current = ranges.find((item) => item.id === currentRangeId) ?? ranges[0];

  return (
    <div className="glass-card flex flex-wrap items-center gap-4 rounded-2xl p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-madas-text/60">Filters</p>
        <p className="text-sm text-madas-text/70">Select the period to analyse performance.</p>
      </div>
      <div className="ml-auto">
        <Listbox
          value={currentRangeId}
          onChange={(value) => {
            const selection = ranges.find((item) => item.id === value);
            if (selection) {
              onRangeChange(selection.id, selection.start, selection.end);
            }
          }}
        >
          <div className="relative mt-1">
            <Listbox.Button className="relative w-60 cursor-pointer rounded-2xl bg-white py-2 pl-3 pr-10 text-left shadow focus:outline-none">
              <span className="flex items-center gap-2 text-sm font-medium text-primary">
                <CalendarIcon className="h-5 w-5 text-primary/80" />
                {current.label}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <ChevronUpDownIcon className="h-5 w-5 text-primary/70" />
              </span>
            </Listbox.Button>
            <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
              <Listbox.Options className="absolute mt-2 max-h-60 w-full overflow-auto rounded-2xl bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">
                {ranges.map((range) => (
                  <Listbox.Option
                    key={range.id}
                    value={range.id}
                    className={({ active }) =>
                      clsx(
                        'cursor-pointer select-none px-4 py-3 text-sm',
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
      </div>
    </div>
  );
};

export default OverviewFilters;

