import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { createTransfer } from '../../services/accountsService';
import { useTenant } from '../../context/TenantProvider';
import { formatCurrency } from '../../lib/format';

const schema = z
  .object({
    fromAccountId: z.string().min(1, 'Select source'),
    toAccountId: z.string().min(1, 'Select destination'),
    amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
    memo: z.string().optional(),
    date: z.string().min(1)
  })
  .refine((values) => values.fromAccountId !== values.toAccountId, {
    message: 'Source and destination must be different',
    path: ['toAccountId']
  });

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  accounts: Array<{ id: string; name: string; balance: number; currency?: string }>;
};

const TransferModal = ({ open, onClose, accounts }: Props) => {
  const tenant = useTenant();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: dayjs().format('YYYY-MM-DDTHH:mm'), amount: 0 }
  });

  const mutation = useMutation({
    mutationFn: (payload: FormValues) =>
      createTransfer(tenant.workspaceId, tenant.orgId, {
        ...payload,
        createdAt: new Date(payload.date)
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
      reset({ amount: 0, fromAccountId: '', toAccountId: '', memo: '', date: dayjs().format('YYYY-MM-DDTHH:mm') });
      onClose();
    }
  });

  const amount = watch('amount') ?? 0;

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-40" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-6 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4"
              enterTo="opacity-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-4"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-3xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title className="text-lg font-semibold text-primary">Transfer between accounts</Dialog.Title>
                <p className="mt-1 text-xs text-madas-text/60">
                  Transfers adjust balances instantly; expenses and revenue are not impacted.
                </p>

                <form className="mt-5 space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
                  <div>
                    <label className="text-xs font-semibold uppercase text-madas-text/60">From</label>
                    <select
                      {...register('fromAccountId')}
                      className="mt-1 w-full rounded-2xl border border-primary/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Select account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({formatCurrency(account.balance, account.currency ?? 'USD')})
                        </option>
                      ))}
                    </select>
                    {errors.fromAccountId ? (
                      <p className="mt-1 text-xs text-danger">{errors.fromAccountId.message}</p>
                    ) : null}
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-madas-text/60">To</label>
                    <select
                      {...register('toAccountId')}
                      className="mt-1 w-full rounded-2xl border border-primary/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Select account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({formatCurrency(account.balance, account.currency ?? 'USD')})
                        </option>
                      ))}
                    </select>
                    {errors.toAccountId ? <p className="mt-1 text-xs text-danger">{errors.toAccountId.message}</p> : null}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold uppercase text-madas-text/60">Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('amount', { valueAsNumber: true })}
                        className="mt-1 w-full rounded-2xl border border-primary/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      {errors.amount ? <p className="mt-1 text-xs text-danger">{errors.amount.message}</p> : null}
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-madas-text/60">Date</label>
                      <input
                        type="datetime-local"
                        {...register('date')}
                        defaultValue={dayjs().format('YYYY-MM-DDTHH:mm')}
                        className="mt-1 w-full rounded-2xl border border-primary/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-madas-text/60">Memo</label>
                    <textarea
                      rows={3}
                      {...register('memo')}
                      placeholder="Optional notes"
                      className="mt-1 w-full rounded-2xl border border-primary/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="rounded-2xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                    You’re moving {formatCurrency(amount || 0, 'USD')} between internal accounts.
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-primary shadow hover:bg-primary/10"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || mutation.isPending}
                      className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                    >
                      {mutation.isPending ? 'Transferring...' : 'Transfer funds'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default TransferModal;

