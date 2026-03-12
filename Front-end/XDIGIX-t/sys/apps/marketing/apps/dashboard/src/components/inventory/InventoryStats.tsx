import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../../hooks/useCurrency';

export type StatFilter = 'all' | 'low_stock' | 'out_of_stock' | 'pending_orders';

type Props = {
  totalProducts: number;
  totalStock: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
  pendingOrders?: number;
  pendingItems?: number;
  activeFilter?: StatFilter;
  onFilterChange?: (filter: StatFilter) => void;
  valueBreakdown?: { label: string; value: number }[];
};

const InventoryStats = ({
  totalProducts, totalStock, lowStock, outOfStock, totalValue,
  pendingOrders = 0, pendingItems = 0, activeFilter = 'all', onFilterChange,
  valueBreakdown,
}: Props) => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [showValueTooltip, setShowValueTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showValueTooltip) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setShowValueTooltip(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showValueTooltip]);

  const cards: Array<{
    label: string;
    value: string | number;
    subValue?: string;
    icon: string;
    accent: string;
    isLarge: boolean;
    filter?: StatFilter;
    action?: () => void;
  }> = [
    {
      label: 'Total Products',
      value: totalProducts,
      icon: 'inventory_2',
      accent: 'bg-blue-100 text-blue-600',
      isLarge: false,
      filter: 'all',
    },
    {
      label: 'Total Stock',
      value: totalStock.toLocaleString(),
      icon: 'warehouse',
      accent: 'bg-purple-100 text-purple-600',
      isLarge: false,
    },
    {
      label: 'Pending Orders',
      value: pendingOrders,
      subValue: `${pendingItems} items`,
      icon: 'pending_actions',
      accent: 'bg-amber-100 text-amber-600',
      isLarge: false,
      action: () => navigate('/orders?status=pending'),
    },
    {
      label: 'Low Stock',
      value: lowStock,
      icon: 'warning',
      accent: 'bg-orange-100 text-orange-600',
      isLarge: false,
      filter: 'low_stock',
    },
    {
      label: 'Out of Stock',
      value: outOfStock,
      icon: 'do_not_disturb',
      accent: 'bg-red-100 text-red-600',
      isLarge: false,
      filter: 'out_of_stock',
    },
    {
      label: 'Inventory Value',
      value: formatCurrency(totalValue),
      icon: 'payments',
      accent: 'bg-green-100 text-green-600',
      isLarge: true,
    }
  ];

  return (
    <section className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-8">
      {cards.map((card) => {
        const isFilterable = !!card.filter && !!onFilterChange;
        const isClickable = isFilterable || !!card.action;
        const isActive = card.filter === activeFilter;
        const isValueCard = card.label === 'Inventory Value';

        const handleClick = () => {
          if (card.action) {
            card.action();
          } else if (isFilterable) {
            onFilterChange!(isActive && card.filter !== 'all' ? 'all' : card.filter!);
          }
        };

        return (
          <article
            key={card.label}
            onClick={isClickable ? handleClick : undefined}
            onMouseEnter={isValueCard ? () => setShowValueTooltip(true) : undefined}
            onMouseLeave={isValueCard ? () => setShowValueTooltip(false) : undefined}
            className={`relative rounded-xl border bg-white p-4 md:p-5 shadow-sm min-w-0 overflow-visible transition-all ${
              card.isLarge ? 'col-span-2 sm:col-span-1' : ''
            } ${isClickable ? 'cursor-pointer hover:shadow-md' : ''} ${isValueCard ? 'group' : ''} ${
              isActive && card.filter !== 'all' ? 'border-primary ring-1 ring-primary/20' : 'border-gray-100'
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
            {card.subValue && (
              <p className="text-xs text-madas-text/50 mt-1 truncate">{card.subValue}</p>
            )}
            {card.action && (
              <p className="text-[10px] text-madas-text/40 mt-1">Click to view</p>
            )}

            {isValueCard && showValueTooltip && valueBreakdown && valueBreakdown.length > 0 && (
              <div
                ref={tooltipRef}
                className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-xl border border-gray-100 bg-white p-4 shadow-lg"
              >
                <p className="text-xs font-semibold text-primary mb-3">Value Breakdown</p>
                <div className="space-y-2">
                  {valueBreakdown.map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-xs">
                      <span className="text-madas-text/70 truncate mr-2">{item.label}</span>
                      <span className="font-medium text-primary whitespace-nowrap">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs font-semibold">
                  <span className="text-madas-text/70">Total</span>
                  <span className="text-primary">{formatCurrency(totalValue)}</span>
                </div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b border-gray-100" />
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
};

export default InventoryStats;

