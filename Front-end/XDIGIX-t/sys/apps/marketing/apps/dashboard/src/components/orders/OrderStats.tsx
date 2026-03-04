import { useCurrency } from '../../hooks/useCurrency';

type Props = {
  total: number;
  pending: number;
  preparingForPickup?: number;
  readyForPickup?: number;
  shipped?: number;
  processing: number;
  delivered?: number;
  completed: number;
  returned?: number;
  damaged?: number;
  cancelled: number;
  revenue: number;
};

const OrderStats = ({
  total, pending, preparingForPickup = 0, readyForPickup = 0, shipped = 0,
  processing, delivered = 0, completed, returned = 0, damaged = 0, cancelled, revenue
}: Props) => {
  const { formatCurrency } = useCurrency();
  const inShipping = preparingForPickup + readyForPickup + shipped;

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
      label: 'In Shipping',
      value: inShipping,
      accent: 'bg-amber-100 text-amber-700',
      icon: 'local_shipping'
    },
    {
      label: 'Delivered',
      value: delivered + completed,
      accent: 'bg-green-100 text-green-600',
      icon: 'check_circle'
    },
    {
      label: 'Returned / Damaged',
      value: returned + damaged,
      accent: 'bg-red-100 text-red-600',
      icon: 'undo'
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
