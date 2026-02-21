import { useCurrency } from '../../hooks/useCurrency';

type Props = {
  totalProducts: number;
  totalStock: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
  pendingOrders?: number;
  pendingItems?: number;
};

const InventoryStats = ({ totalProducts, totalStock, lowStock, outOfStock, totalValue, pendingOrders = 0, pendingItems = 0 }: Props) => {
  const { formatCurrency } = useCurrency();
  const cards = [
    {
      label: 'Total Products',
      value: totalProducts,
      icon: 'inventory_2',
      accent: 'bg-blue-100 text-blue-600',
      isLarge: false
    },
    {
      label: 'Total Stock',
      value: totalStock.toLocaleString(),
      icon: 'warehouse',
      accent: 'bg-purple-100 text-purple-600',
      isLarge: false
    },
    {
      label: 'Pending Orders',
      value: pendingOrders,
      subValue: `${pendingItems} items`,
      icon: 'pending_actions',
      accent: 'bg-amber-100 text-amber-600',
      isLarge: false
    },
    {
      label: 'Low Stock',
      value: lowStock,
      icon: 'warning',
      accent: 'bg-orange-100 text-orange-600',
      isLarge: false
    },
    {
      label: 'Out of Stock',
      value: outOfStock,
      icon: 'do_not_disturb',
      accent: 'bg-red-100 text-red-600',
      isLarge: false
    },
    {
      label: 'Inventory Value',
      value: formatCurrency(totalValue),
      icon: 'payments',
      accent: 'bg-green-100 text-green-600',
      isLarge: true
    }
  ];

  return (
    <section className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-8">
      {cards.map((card) => (
        <article 
          key={card.label} 
          className={`card-hover rounded-xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm min-w-0 overflow-hidden ${
            card.isLarge ? 'col-span-2 sm:col-span-1' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs md:text-sm font-medium text-madas-text/70 truncate">{card.label}</p>
            <span className={`material-icons rounded-lg p-1.5 md:p-2 text-base md:text-lg flex-shrink-0 ${card.accent}`}>{card.icon}</span>
          </div>
          <p 
            className={`mt-3 md:mt-4 font-semibold text-primary truncate ${
              card.isLarge 
                ? 'text-lg sm:text-xl md:text-2xl' 
                : 'text-xl md:text-2xl'
            }`}
            title={String(card.value)}
          >
            {card.value}
          </p>
          {'subValue' in card && card.subValue && (
            <p className="text-xs text-madas-text/50 mt-1 truncate">{card.subValue}</p>
          )}
        </article>
      ))}
    </section>
  );
};

export default InventoryStats;

