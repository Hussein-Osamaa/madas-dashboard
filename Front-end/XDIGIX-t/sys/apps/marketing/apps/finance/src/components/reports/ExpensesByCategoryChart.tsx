import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, Legend } from 'recharts';
import { formatCurrency } from '../../lib/format';

const COLORS = ['#27491F', '#FFD300', '#E03C31', '#1B7C54', '#2563EB', '#7C3AED'];

type Props = {
  data: Array<{ category: string; amount: number }>;
};

const ExpensesByCategoryChart = ({ data }: Props) => (
  <div className="space-y-3">
    <div>
      <h3 className="text-lg font-semibold text-primary">Expenses by category</h3>
      <p className="text-xs text-madas-text/60">Distribution of expenses for the selected period.</p>
    </div>
    {data.length ? (
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="category"
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={120}
            paddingAngle={4}
          >
            {data.map((entry, index) => (
              <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    ) : (
      <p className="text-xs text-madas-text/60">No expense data available.</p>
    )}
  </div>
);

export default ExpensesByCategoryChart;

