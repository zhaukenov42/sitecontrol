import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

interface SpiTrendChartProps {
  data: Array<{ imported_at: string; spi: number }>;
}

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
        <p className="text-slate-400 text-xs mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }} className="text-sm font-semibold">
            {p.name}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function SpiTrendChart({ data }: SpiTrendChartProps) {
  // Add static week labels for display
  const weekLabels = ['Нед 1', 'Нед 2', 'Нед 3', 'Нед 4', 'Нед 5', 'Нед 6', 'Нед 7', 'Нед 8'];

  const chartData = data.map((d, i) => ({
    week: weekLabels[i] || `Нед ${i + 1}`,
    spi: d.spi,
    baseline: 1.0,
    target: 0.9,
    date: new Date(d.imported_at).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="week"
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          axisLine={{ stroke: '#475569' }}
          tickLine={false}
        />
        <YAxis
          domain={[0.7, 1.05]}
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          axisLine={{ stroke: '#475569' }}
          tickLine={false}
          tickFormatter={(v) => v.toFixed(2)}
        />
        <Tooltip content={<CUSTOM_TOOLTIP />} />
        <Legend
          wrapperStyle={{ paddingTop: '12px' }}
          formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>}
        />
        <ReferenceLine y={1.0} stroke="#22c55e" strokeDasharray="6 3" strokeOpacity={0.5} />
        <ReferenceLine y={0.85} stroke="#f59e0b" strokeDasharray="6 3" strokeOpacity={0.5} />
        <Line
          type="monotone"
          dataKey="spi"
          name="SPI (факт)"
          stroke="#f87171"
          strokeWidth={2.5}
          dot={{ fill: '#f87171', r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="baseline"
          name="SPI (план = 1.0)"
          stroke="#22c55e"
          strokeWidth={1.5}
          strokeDasharray="5 5"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
