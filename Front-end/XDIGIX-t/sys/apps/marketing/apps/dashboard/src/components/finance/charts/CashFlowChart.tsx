import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '../../../lib/finance/format';

type Props = {
  data: Array<{ date: string; amount: number }>;
  currency?: string;
};

const CashFlowChart = ({ data, currency = 'USD' }: Props) => (
  <ResponsiveContainer width="100%" height={260}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" />
      <XAxis dataKey="date" tickLine={false} axisLine={false} />
      <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value, currency)} />
      <Tooltip
        formatter={(value) => formatCurrency(Number(value), currency)}
        contentStyle={{ borderRadius: '16px', border: '1px solid #E5E7EB' }}
      />
      <Legend />
      <Line type="monotone" dataKey="amount" stroke="#FFD300" strokeWidth={3} dot={false} name="Net Cash" />
    </LineChart>
  </ResponsiveContainer>
);

export default CashFlowChart;

