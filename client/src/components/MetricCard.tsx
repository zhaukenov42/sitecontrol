interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: 'default' | 'green' | 'amber' | 'red' | 'blue';
  icon?: string;
}

const colorMap = {
  default: 'text-white',
  green: 'text-emerald-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  blue: 'text-sky-400',
};

export default function MetricCard({ label, value, sub, color = 'default', icon }: MetricCardProps) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider truncate">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${colorMap[color]}`}>{value}</p>
          {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
        </div>
        {icon && (
          <span className="text-2xl ml-3 flex-shrink-0">{icon}</span>
        )}
      </div>
    </div>
  );
}
