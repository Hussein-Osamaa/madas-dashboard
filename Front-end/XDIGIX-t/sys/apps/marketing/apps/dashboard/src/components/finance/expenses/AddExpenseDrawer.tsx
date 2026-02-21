import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createExpense, updateExpense } from '../../../services/finance/expensesService';
import { formatCurrency } from '../../../lib/finance/format';
import { useFinanceScope } from '../../../hooks/useFinanceScope';

const schema = z.object({
  vendorName: z.string().min(1, 'Vendor is required'),
  category: z.string().min(1, 'Category is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  description: z.string().optional(),
  tax: z.coerce.number().optional(),
  status: z.enum(['approved', 'pending', 'rejected']).default('approved'),
  date: z.string().min(1, 'Date is required'),
  attachments: z.array(z.string()).optional()
});

type FormValues = z.infer<typeof schema>;

type ExpenseRow = {
  id: string;
  amount: number;
  category: string;
  vendorName?: string;
  description?: string;
  status?: string;
  createdAt: Date;
  currency?: string;
  tax?: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  expense?: ExpenseRow | null;
  mode?: 'add' | 'edit' | 'view';
};

const quickVendors = ['Supplier Co.', 'Office Depot', 'Logistics Inc.'];
const quickCategories = ['office_supplies', 'marketing', 'logistics', 'salary', 'rent'];

const AddExpenseDrawer = ({ open, onClose, expense, mode = 'add' }: Props) => {
  const scope = useFinanceScope();
  const queryClient = useQueryClient();
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vendorName: expense?.vendorName ?? '',
      category: expense?.category ?? '',
      amount: expense?.amount ?? 0,
      description: expense?.description ?? '',
      tax: expense?.tax ?? 0,
      status: (expense?.status as 'approved' | 'pending' | 'rejected') ?? 'approved',
      date: expense?.createdAt ? dayjs(expense.createdAt).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      attachments: []
    }
  });

  // Update form when expense changes
  useEffect(() => {
    if (expense) {
      setValue('vendorName', expense.vendorName ?? '');
      setValue('category', expense.category);
      setValue('amount', expense.amount);
      setValue('description', expense.description ?? '');
      setValue('tax', expense.tax ?? 0);
      setValue('status', (expense.status as 'approved' | 'pending' | 'rejected') ?? 'approved');
      setValue('date', expense.createdAt ? dayjs(expense.createdAt).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'));
    } else {
      reset({
        vendorName: '',
        category: '',
        amount: 0,
        description: '',
        tax: 0,
        status: 'approved',
        date: dayjs().format('YYYY-MM-DD'),
        attachments: []
      });
    }
  }, [expense, setValue, reset]);

  const createMutation = useMutation({
    mutationFn: (payload: FormValues) =>
      createExpense(scope.businessId!, {
        ...payload,
        createdAt: new Date(payload.date)
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['finance-expenses-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
      onClose();
      reset();
    }
  });

  const updateMutation = useMutation({
    mutationFn: (payload: FormValues) =>
      updateExpense(scope.businessId!, expense!.id, {
        ...payload,
        createdAt: new Date(payload.date)
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['finance-expenses-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
      onClose();
      reset();
    }
  });

  const mutation = isEditMode ? updateMutation : createMutation;

  const amount = watch('amount') ?? 0;
  const tax = watch('tax') ?? 0;
  const totalWithTax = amount + tax;

  const handleSubmitForm = (values: FormValues) => {
    if (!scope.businessId) {
      return;
    }
    mutation.mutate(values);
  };

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
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        <div className="fixed inset-0 right-0 z-50 flex max-w-2xl">
          <Transition.Child
            as={Fragment}
            enter="transform transition ease-in-out duration-300"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transform transition ease-in duration-200"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <Dialog.Panel className="relative flex w-full max-w-2xl flex-col overflow-hidden bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div>
                  <Dialog.Title className="text-lg font-semibold text-primary">
                    {isViewMode ? 'View Expense' : isEditMode ? 'Edit Expense' : 'Add Expense'}
                  </Dialog.Title>
                  <p className="text-xs text-madas-text/60">
                    {isViewMode
                      ? 'View expense details and information.'
                      : 'Capture expense details, vendor information and attachments.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary/10"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                <form id="add-expense-form" className="space-y-5" onSubmit={handleSubmit(handleSubmitForm)}>
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-primary/80">Vendor & Category</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold uppercase text-madas-text/60">Vendor</label>
                        <input
                          {...register('vendorName')}
                          placeholder="e.g. Supplier Co."
                          disabled={isViewMode}
                          className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-gray-50 disabled:cursor-not-allowed"
                        />
                        {errors.vendorName ? (
                          <p className="mt-1 text-xs text-rose-600">{errors.vendorName.message}</p>
                        ) : (
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            {!isViewMode &&
                          quickVendors.map((vendor) => (
                            <button
                              type="button"
                              key={vendor}
                              onClick={() => setValue('vendorName', vendor, { shouldValidate: true })}
                              className="rounded-full bg-primary/10 px-3 py-1 text-primary hover:bg-primary/20"
                            >
                              {vendor}
                            </button>
                          ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase text-madas-text/60">Category</label>
                        <input
                          {...register('category')}
                          placeholder="office_supplies"
                          disabled={isViewMode}
                          className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-gray-50 disabled:cursor-not-allowed"
                        />
                        {errors.category ? (
                          <p className="mt-1 text-xs text-rose-600">{errors.category.message}</p>
                        ) : (
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            {!isViewMode &&
                          quickCategories.map((category) => (
                            <button
                              type="button"
                              key={category}
                              onClick={() => setValue('category', category, { shouldValidate: true })}
                              className="rounded-full bg-primary/10 px-3 py-1 text-primary hover:bg-primary/20"
                            >
                              {category}
                            </button>
                          ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-primary/80">Financials</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold uppercase text-madas-text/60">Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('amount', { valueAsNumber: true })}
                          disabled={isViewMode}
                          className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-gray-50 disabled:cursor-not-allowed"
                        />
                        {errors.amount ? <p className="mt-1 text-xs text-rose-600">{errors.amount.message}</p> : null}
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase text-madas-text/60">Tax</label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('tax', { valueAsNumber: true })}
                          disabled={isViewMode}
                          className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-gray-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div className="rounded-2xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                      Total with tax: {formatCurrency(totalWithTax)}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-primary/80">Details</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold uppercase text-madas-text/60">Status</label>
                        <select
                          {...register('status')}
                          disabled={isViewMode}
                          className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-gray-50 disabled:cursor-not-allowed"
                        >
                          <option value="approved">Approved</option>
                          <option value="pending">Pending</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase text-madas-text/60">Date</label>
                        <input
                          type="date"
                          {...register('date')}
                          disabled={isViewMode}
                          className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-gray-50 disabled:cursor-not-allowed"
                        />
                        {errors.date ? <p className="mt-1 text-xs text-rose-600">{errors.date.message}</p> : null}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-madas-text/60">Description</label>
                      <textarea
                        rows={3}
                        {...register('description')}
                        placeholder="Optional notes"
                        disabled={isViewMode}
                        className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-gray-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-primary/80">Attachments</h3>
                    <p className="text-xs text-madas-text/60">
                      Attachment upload will be wired to Firebase Storage during the integrations phase. Add receipts or invoices
                      once enabled.
                    </p>
                  </section>
                </form>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
                <p className="text-xs text-madas-text/60">
                  {isViewMode ? 'View-only mode. Click Edit to modify this expense.' : 'Total recorded expenses update instantly in the dashboard.'}
                </p>
                {!isViewMode && (
                  <button
                    type="submit"
                    form="add-expense-form"
                    disabled={mutation.isPending || isSubmitting || !scope.businessId}
                    className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
                  >
                    {mutation.isPending ? 'Saving...' : isEditMode ? 'Update expense' : 'Save expense'}
                  </button>
                )}
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default AddExpenseDrawer;

