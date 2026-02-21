import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reconcileAccount } from '../../services/accountsService';
import { useTenant } from '../../context/TenantProvider';
import { formatCurrency } from '../../lib/format';

const schema = z.object({
  accountId: z.string().min(1, 'Select account'),
  statementBalance: z.coerce.number(),
  statementDate: z.string().min(1),
  notes: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

type Account = {
  id: string;
  name: string;
  balance: number;
  currency?: string;
  lastReconciled?: Date;
};

type Props = {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
};

const ReconcileDrawer = ({ open, onClose, accounts }: Props) => {
  const tenant = useTenant();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      statementDate: dayjs().format('YYYY-MM-DD'),
      statementBalance: 0,
      accountId: ''
    }
  });

  const mutation = useMutation({
    mutationFn: (payload: FormValues) =>
      reconcileAccount(tenant.workspaceId, tenant.orgId, {
        ...payload,
        statementDate: new Date(payload.statementDate)
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      onClose();
      reset();
    }
  });

  return (
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

        <div className="fixed inset-0 z-50 flex justify-end">
          <Transition.Child
            as={Fragment}
            enter="transform transition ease-in-out duration-300"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transform transition ease-in duration-200"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <Dialog.Panel className="flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-primary/10 px-6 py-4">
                <div>
                  <Dialog.Title className="text-lg font-semibold text-primary">Reconcile account</Dialog.Title>
                  <p className="text-xs text-madas-text/60">
                    Match the ledger balance with bank statement to keep accounts accurate.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-primary shadow hover:bg-primary/10"
                >
                  Close
                </button>
              </div>

              <form
                id="reconcile-form"
                className="flex-1 overflow-y-auto px-6 py-6 space-y-4"
                onSubmit={handleSubmit((values) => mutation.mutate(values))}
              >
                <div>
                  <label className="text-xs font-semibold uppercase text-madas-text/60">Account</label>
                  <select
                    {...register('accountId')}
                    className="mt-1 w-full rounded-2xl border border-primary/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Select account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({formatCurrency(account.balance, account.currency ?? 'USD')})
                      </option>
                    ))}
                  </select>
                  {errors.accountId ? <p className="mt-1 text-xs text-danger">{errors.accountId.message}</p> : null}
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-madas-text/60">Statement balance</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('statementBalance')}
                    className="mt-1 w-full rounded-2xl border border-primary/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {errors.statementBalance ? (
                    <p className="mt-1 text-xs text-danger">{errors.statementBalance.message}</p>
                  ) : null}
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-madas-text/60">Statement date</label>
                  <input
                    type="date"
                    {...register('statementDate')}
                    className="mt-1 w-full rounded-2xl border border-primary/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {errors.statementDate ? (
                    <p className="mt-1 text-xs text-danger">{errors.statementDate.message}</p>
                  ) : null}
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-madas-text/60">Notes</label>
                  <textarea
                    rows={4}
                    {...register('notes')}
                    placeholder="Optional notes"
                    className="mt-1 w-full rounded-2xl border border-primary/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </form>
              <div className="border-t border-primary/10 px-6 py-4">
                <button
                  type="submit"
                  form="reconcile-form"
                  disabled={isSubmitting || mutation.isPending}
                  className="w-full rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                >
                  {mutation.isPending ? 'Reconciling...' : 'Reconcile'}
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default ReconcileDrawer;

