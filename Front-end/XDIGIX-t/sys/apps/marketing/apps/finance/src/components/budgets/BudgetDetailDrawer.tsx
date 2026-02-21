import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { formatCurrency } from '../../lib/format';

type Props = {
  open: boolean;
  onClose: () => void;
  budget:
    | {
        id: string;
        name: string;
        category: string;
        allocated: number;
        spent: number;
        startDate: Date;
        endDate: Date;
        notes?: string;
      }
    | null;
  currency: string;
  transactions: Array<{
    id: string;
    description?: string;
    amount: number;
    createdAt: Date;
  }>;
};

const BudgetDetailDrawer = ({ open, onClose, budget, currency, transactions }: Props) => (
  <Transition.Root show={open} as={Fragment}>
    <Dialog as="div" className="relative z-40" onClose={onClose}>
      <Transition.Child
        as={Fragment}
        enter="transition-opacity ease-linear duration-200"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity ease-linear duration-150"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="fixed inset-0 bg-black/30" />
      </Transition.Child>

      <div className="fixed inset-0 right-0 flex max-w-xl">
        <Transition.Child
          as={Fragment}
          enter="transform transition ease-in-out duration-300"
          enterFrom="translate-x-full"
          enterTo="translate-x-0"
          leave="transform transition ease-in duration-200"
          leaveFrom="translate-x-0"
          leaveTo="translate-x-full"
        >
          <Dialog.Panel className="flex h-full w-full flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-primary/10 px-6 py-4">
              <Dialog.Title className="text-lg font-semibold text-primary">
                {budget ? budget.name : 'Budget'}
              </Dialog.Title>
              <button
                onClick={onClose}
                className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-primary shadow hover:bg-primary/10"
              >
                Close
              </button>
            </div>

            {budget ? (
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                <section className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase text-madas-text/50">Allocated</p>
                      <p className="text-xl font-semibold text-primary">
                        {formatCurrency(budget.allocated, currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase text-madas-text/50">Spend</p>
                      <p className="text-base font-semibold text-primary">
                        {formatCurrency(budget.spent, currency)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-madas-text/60">
                    {budget.startDate.toLocaleDateString()} – {budget.endDate.toLocaleDateString()}
                  </p>
                </section>

                {budget.notes ? (
                  <section className="rounded-2xl border border-primary/10 bg-white p-4">
                    <h3 className="text-sm font-semibold text-primary">Notes</h3>
                    <p className="mt-1 text-sm text-madas-text/70">{budget.notes}</p>
                  </section>
                ) : null}

                <section className="rounded-2xl border border-primary/10 bg-white p-4">
                  <h3 className="text-sm font-semibold text-primary">Recent transactions</h3>
                  <ul className="mt-3 space-y-3">
                    {transactions.length ? (
                      transactions.map((transaction) => (
                        <li key={transaction.id} className="flex items-center justify-between text-sm">
                          <div>
                            <p className="font-medium text-primary">
                              {transaction.description ?? 'Expense'}
                            </p>
                            <p className="text-xs text-madas-text/60">
                              {transaction.createdAt.toLocaleDateString()}
                            </p>
                          </div>
                          <span className="font-semibold">
                            {formatCurrency(transaction.amount, currency)}
                          </span>
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-madas-text/60">No transactions recorded yet.</li>
                    )}
                  </ul>
                </section>
              </div>
            ) : null}
          </Dialog.Panel>
        </Transition.Child>
      </div>
    </Dialog>
  </Transition.Root>
);

export default BudgetDetailDrawer;

