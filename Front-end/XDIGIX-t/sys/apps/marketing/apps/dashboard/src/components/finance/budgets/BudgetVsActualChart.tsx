import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '../../../lib/finance/format';

type Props = {
  data: Array<{ category: string; allocated: number; spent: number }>;
  currency: string;
};

const BudgetVsActualChart = ({ data, currency }: Props) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-primary">Budget vs actual</h3>
        <p className="text-xs text-madas-text/60">Categories displayed for the selected period.</p>
      </div>
    </div>
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" />
        <XAxis dataKey="category" tickLine={false} axisLine={false} />
        <YAxis tickFormatter={(value) => formatCurrency(value, currency)} tickLine={false} axisLine={false} />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value), currency)}
          contentStyle={{ borderRadius: '16px', border: '1px solid #E5E7EB' }}
        />
        <Legend />
        <Bar dataKey="allocated" fill="#27491F" radius={[8, 8, 0, 0]} name="Allocated" />
        <Bar dataKey="spent" fill="#FFD300" radius={[8, 8, 0, 0]} name="Actual" />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default BudgetVsActualChart;

