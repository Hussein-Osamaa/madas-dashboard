import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend
} from 'recharts';
import { formatCurrency } from '../../lib/format';

type Props = {
  data: Array<{ label: string; revenue: number; expenses: number }>;
  currency?: string;
};

const RevenueVsExpensesChart = ({ data, currency = 'USD' }: Props) => (
  <ResponsiveContainer width="100%" height={320}>
    <AreaChart data={data}>
      <defs>
        <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#1B7C54" stopOpacity={0.8} />
          <stop offset="95%" stopColor="#1B7C54" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="expenses" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#E03C31" stopOpacity={0.8} />
          <stop offset="95%" stopColor="#E03C31" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" />
      <XAxis dataKey="label" tickLine={false} axisLine={false} />
      <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value, currency)} />
      <Tooltip
        formatter={(value) => formatCurrency(Number(value), currency)}
        contentStyle={{ borderRadius: '16px', border: '1px solid #E5E7EB' }}
      />
      <Legend />
      <Area
        type="monotone"
        dataKey="revenue"
        stroke="#1B7C54"
        fillOpacity={1}
        fill="url(#revenue)"
        name="Revenue"
      />
      <Area
        type="monotone"
        dataKey="expenses"
        stroke="#E03C31"
        fillOpacity={1}
        fill="url(#expenses)"
        name="Expenses"
      />
    </AreaChart>
  </ResponsiveContainer>
);

export default RevenueVsExpensesChart;

