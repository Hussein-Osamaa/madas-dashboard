import { useCurrency } from '../../hooks/useCurrency';

type Props = {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  cancelled: number;
  revenue: number;
};

const OrderStats = ({ total, pending, processing, completed, cancelled, revenue }: Props) => {
  const { formatCurrency } = useCurrency();
  const cards = [
    {
      label: 'Total Orders',
      value: total,
      accent: 'bg-blue-100 text-blue-600',
      icon: 'receipt_long'
    },
    {
      label: 'Pending',
      value: pending,
      accent: 'bg-orange-100 text-orange-600',
      icon: 'hourglass_bottom'
    },
    {
      label: 'Processing',
      value: processing,
      accent: 'bg-sky-100 text-sky-600',
      icon: 'sync_alt'
    },
    {
      label: 'Completed',
      value: completed,
      accent: 'bg-green-100 text-green-600',
      icon: 'check_circle'
    },
    {
      label: 'Cancelled',
      value: cancelled,
      accent: 'bg-red-100 text-red-600',
      icon: 'cancel'
    },
    {
      label: 'Revenue',
      value: formatCurrency(revenue),
      accent: 'bg-purple-100 text-purple-600',
      icon: 'payments'
    }
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <article
          key={card.label}
          className="card-hover rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">{card.label}</p>
            <span className={`material-icons rounded-lg p-2 text-lg ${card.accent}`}>{card.icon}</span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-primary">{card.value}</p>
        </article>
      ))}
    </section>
  );
};

export default OrderStats;

