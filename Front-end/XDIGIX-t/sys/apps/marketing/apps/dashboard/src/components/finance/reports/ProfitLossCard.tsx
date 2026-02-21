import { formatCurrency } from '../../../lib/finance/format';

type ProfitLossData = {
  revenue: number;
  costOfGoods: number;
  operatingExpenses: number;
  netProfit: number;
};

type Props = {
  data: ProfitLossData | null;
  currency: string;
};

const ProfitLossCard = ({ data, currency }: Props) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-primary">Profit &amp; Loss</h3>
        <p className="text-xs text-madas-text/60">Summary of revenue, cost of goods and expenses.</p>
      </div>
    </div>
    {data ? (
      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-madas-text/60">Revenue</dt>
          <dd className="font-semibold text-primary">{formatCurrency(data.revenue, currency)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-madas-text/60">Cost of goods sold</dt>
          <dd className="font-semibold text-rose-600">{formatCurrency(data.costOfGoods, currency)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-madas-text/60">Operating expenses</dt>
          <dd className="font-semibold text-rose-600">{formatCurrency(data.operatingExpenses, currency)}</dd>
        </div>
        <hr className="border-primary/10" />
        <div className="flex items-center justify-between text-base">
          <dt className="font-semibold text-primary">Net profit</dt>
          <dd className={`font-semibold ${data.netProfit >= 0 ? 'text-primary' : 'text-rose-600'}`}>
            {formatCurrency(data.netProfit, currency)}
          </dd>
        </div>
      </dl>
    ) : (
      <p className="text-xs text-madas-text/60">No profit &amp; loss data available for this period.</p>
    )}
  </div>
);

export default ProfitLossCard;

