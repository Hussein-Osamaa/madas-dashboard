import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '../../../lib/finance/format';

type Props = {
  data: Array<{ label: string; inflow: number; outflow: number; net: number }>;
  currency: string;
};

const ReportsCashFlowChart = ({ data, currency }: Props) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-primary">Cash flow</h3>
        <p className="text-xs text-madas-text/60">Inflow, outflow and net position over the selected range.</p>
      </div>
    </div>
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickFormatter={(value) => formatCurrency(value, currency)} tickLine={false} axisLine={false} />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value), currency)}
          contentStyle={{ borderRadius: '16px', border: '1px solid #E5E7EB' }}
        />
        <Legend />
        <Line type="monotone" dataKey="inflow" stroke="#1B7C54" strokeWidth={2} dot={false} name="Inflow" />
        <Line type="monotone" dataKey="outflow" stroke="#E03C31" strokeWidth={2} dot={false} name="Outflow" />
        <Line type="monotone" dataKey="net" stroke="#FFD300" strokeWidth={3} dot={false} name="Net" />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export default ReportsCashFlowChart;

