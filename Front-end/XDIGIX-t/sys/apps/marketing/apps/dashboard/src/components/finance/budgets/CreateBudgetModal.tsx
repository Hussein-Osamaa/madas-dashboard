import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createBudget, updateBudgetAllocation } from '../../../services/finance/budgetsService';
import { useFinanceScope } from '../../../hooks/useFinanceScope';

const schema = z.object({
  name: z.string().min(3, 'Name is required'),
  category: z.string().min(1, 'Select a category'),
  allocated: z.coerce.number().min(1, 'Allocation must be positive'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  notes: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
};

const quickCategories = ['marketing', 'logistics', 'operations', 'payroll', 'supplies'];

const CreateBudgetModal = ({ open, onClose }: Props) => {
  const scope = useFinanceScope();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
      endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
      category: '',
      name: '',
      allocated: 0,
      notes: ''
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const budgetId = await createBudget(scope.businessId!, {
        ...values,
        startDate: new Date(values.startDate),
        endDate: new Date(values.endDate)
      });
      await updateBudgetAllocation(scope.businessId!, budgetId, values.allocated, new Date(values.endDate));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['finance-budgets'] });
      await queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
      reset();
      onClose();
    }
  });

  const onSubmit = (values: FormValues) => {
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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title className="text-lg font-semibold text-primary">Create budget</Dialog.Title>
                <p className="mt-1 text-xs text-madas-text/60">
                  Budgets sync with expenses automatically to track actual vs target.
                </p>

                <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)}>
                  <div>
                    <label className="text-xs font-semibold uppercase text-madas-text/60">Name</label>
                    <input
                      {...register('name')}
                      placeholder="e.g. Q1 Marketing"
                      className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {errors.name ? <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p> : null}
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-madas-text/60">Category</label>
                    <input
                      {...register('category')}
                      placeholder="marketing"
                      className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {errors.category ? <p className="mt-1 text-xs text-rose-600">{errors.category.message}</p> : null}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {quickCategories.map((category) => (
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
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold uppercase text-madas-text/60">Allocated amount</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('allocated', { valueAsNumber: true })}
                        className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      {errors.allocated ? <p className="mt-1 text-xs text-rose-600">{errors.allocated.message}</p> : null}
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-madas-text/60">Start date</label>
                      <input
                        type="date"
                        {...register('startDate')}
                        className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-madas-text/60">End date</label>
                      <input
                        type="date"
                        {...register('endDate')}
                        className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-madas-text/60">Notes</label>
                    <textarea
                      rows={3}
                      {...register('notes')}
                      placeholder="Optional notes or instructions"
                      className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/10"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={mutation.isPending || isSubmitting || !scope.businessId}
                      className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
                    >
                      {mutation.isPending ? 'Saving...' : 'Create budget'}
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

export default CreateBudgetModal;

