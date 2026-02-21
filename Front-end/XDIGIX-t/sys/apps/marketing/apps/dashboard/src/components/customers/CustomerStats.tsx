import { useCurrency } from '../../hooks/useCurrency';

type Props = {
  total: number;
  active: number;
  vip: number;
  newThisMonth: number;
  totalRevenue: number;
};

const CustomerStats = ({ total, active, vip, newThisMonth, totalRevenue }: Props) => {
  const { formatCurrency } = useCurrency();

  const cards = [
    {
      label: 'Total Customers',
      value: total,
      accent: 'bg-blue-100 text-blue-600',
      icon: 'group'
    },
    {
      label: 'Active Customers',
      value: active,
      accent: 'bg-green-100 text-green-600',
      icon: 'check_circle'
    },
    {
      label: 'VIP Customers',
      value: vip,
      accent: 'bg-purple-100 text-purple-600',
      icon: 'star'
    },
    {
      label: 'New This Month',
      value: newThisMonth,
      accent: 'bg-amber-100 text-amber-600',
      icon: 'person_add'
    },
    {
      label: 'Lifetime Revenue',
      value: formatCurrency(totalRevenue),
      accent: 'bg-orange-100 text-orange-600',
      icon: 'attach_money'
    }
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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

export default CustomerStats;

