import { formatCurrency } from '../../lib/format';

type ProfitLossData = {
  revenue: number;
  costOfGoods: number;
  operatingExpenses: number;
  netProfit: number;
};

type Props = {
  data: ProfitLossData | null;
};

const ProfitLossCard = ({ data }: Props) => (
  <div className="glass-card p-6">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-lg font-semibold text-primary">Profit & Loss</h3>
        <p className="text-xs text-madas-text/60">Summary of revenue, cost of goods and expenses.</p>
      </div>
    </div>
    {data ? (
      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-madas-text/60">Revenue</dt>
          <dd className="font-semibold text-primary">{formatCurrency(data.revenue)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-madas-text/60">Cost of goods sold</dt>
          <dd className="font-semibold text-danger">{formatCurrency(data.costOfGoods)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-madas-text/60">Operating expenses</dt>
          <dd className="font-semibold text-danger">{formatCurrency(data.operatingExpenses)}</dd>
        </div>
        <hr className="border-primary/10" />
        <div className="flex items-center justify-between text-base">
          <dt className="font-semibold text-primary">Net profit</dt>
          <dd className={`font-semibold ${data.netProfit >= 0 ? 'text-primary' : 'text-danger'}`}>
            {formatCurrency(data.netProfit)}
          </dd>
        </div>
      </dl>
    ) : (
      <p className="text-xs text-madas-text/60">No profit & loss data available for this period.</p>
    )}
  </div>
);

export default ProfitLossCard;

