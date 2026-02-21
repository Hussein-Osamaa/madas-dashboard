import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';
import { useTenant } from '../../context/TenantProvider';
import { createPayment } from '../../services/financeService';
import { useQueryClient } from '@tanstack/react-query';

type Props = {
  open: boolean;
  onClose: () => void;
};

const schema = z.object({
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  customerName: z.string().min(1, 'Customer name is required'),
  method: z.string().min(1),
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).default('completed'),
  orderId: z.string().optional(),
  date: z.string().min(1, 'Select date')
});

type FormValues = z.infer<typeof schema>;

const AddPaymentModal = ({ open, onClose }: Props) => {
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
      method: 'cash',
      status: 'completed',
      date: dayjs().format('YYYY-MM-DDTHH:mm'),
      customerName: '',
      amount: 0,
      orderId: ''
    }
  });

  const onSubmit = async (values: FormValues) => {
    await createPayment(tenant.workspaceId, tenant.orgId, {
      ...values,
      createdAt: new Date(values.date)
    });
    await queryClient.invalidateQueries({ queryKey: ['finance-payments'] });
    await queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
    reset({
      amount: 0,
      customerName: '',
      method: 'cash',
      status: 'completed',
      orderId: '',
      date: dayjs().format('YYYY-MM-DDTHH:mm')
    });
    onClose();
  };

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
              <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-3xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title className="text-lg font-semibold text-primary">Record Payment</Dialog.Title>
                <form className="mt-4 space-y-4" onSubmit={handleSubmit(onSubmit)}>
                  <div>
                    <label className="text-sm font-medium text-madas-text/70">Customer name</label>
                    <input
                      type="text"
                      {...register('customerName')}
                      className="mt-1 w-full rounded-xl border border-primary/20 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {errors.customerName ? (
                      <p className="mt-1 text-xs text-danger">{errors.customerName.message}</p>
                    ) : null}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-madas-text/70">Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('amount')}
                        className="mt-1 w-full rounded-xl border border-primary/20 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      {errors.amount ? <p className="mt-1 text-xs text-danger">{errors.amount.message}</p> : null}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-madas-text/70">Received on</label>
                      <input
                        type="datetime-local"
                        {...register('date')}
                        defaultValue={dayjs().format('YYYY-MM-DDTHH:mm')}
                        className="mt-1 w-full rounded-xl border border-primary/20 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      {errors.date ? <p className="mt-1 text-xs text-danger">{errors.date.message}</p> : null}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-madas-text/70">Method</label>
                      <select
                        {...register('method')}
                        className="mt-1 w-full rounded-xl border border-primary/20 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="online_gateway">Online Gateway</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-madas-text/70">Status</label>
                      <select
                        {...register('status')}
                        className="mt-1 w-full rounded-xl border border-primary/20 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-madas-text/70">Linked order (optional)</label>
                    <input
                      type="text"
                      {...register('orderId')}
                      placeholder="e.g. ORD-2024-001"
                      className="mt-1 w-full rounded-xl border border-primary/20 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-primary shadow hover:bg-primary/10"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                    >
                      {isSubmitting ? 'Saving...' : 'Save payment'}
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

export default AddPaymentModal;

