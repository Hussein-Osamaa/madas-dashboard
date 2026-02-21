import { formatCurrency } from '../../lib/format';

type TaxSummary = {
  collected: number;
  payable: number;
  adjustments?: number;
};

type Props = {
  data: TaxSummary | null;
};

const TaxSummaryCard = ({ data }: Props) => (
  <div className="glass-card p-6">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-primary">Tax summary</h3>
        <p className="text-xs text-madas-text/60">Collected vs payable tax for the selected range.</p>
      </div>
    </div>
    <div className="mt-4 grid gap-3 text-sm">
      <div>
        <p className="text-xs font-semibold uppercase text-madas-text/60">Collected</p>
        <p className="text-base font-semibold text-primary">
          {formatCurrency(data?.collected ?? 0)}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase text-madas-text/60">Payable</p>
        <p className="text-base font-semibold text-danger">
          {formatCurrency(data?.payable ?? 0)}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase text-madas-text/60">Adjustments</p>
        <p className="text-base font-semibold text-primary">
          {formatCurrency(data?.adjustments ?? 0)}
        </p>
      </div>
    </div>
  </div>
);

export default TaxSummaryCard;

