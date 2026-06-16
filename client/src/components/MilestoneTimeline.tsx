interface Milestone {
  id: number;
  name: string;
  baseline_date: string;
  forecast_date: string;
  status: 'ON_TRACK' | 'AT_RISK' | 'DELAYED' | 'COMPLETE';
}

interface MilestoneTimelineProps {
  milestones: Milestone[];
}

const statusConfig = {
  ON_TRACK: { label: 'В ГРАФИКЕ', className: 'badge-green', dot: 'bg-emerald-400' },
  AT_RISK: { label: 'ПОД РИСКОМ', className: 'badge-amber', dot: 'bg-amber-400' },
  DELAYED: { label: 'ЗАДЕРЖКА', className: 'badge-red', dot: 'bg-red-400' },
  COMPLETE: { label: 'ЗАВЕРШЁН', className: 'badge-blue', dot: 'bg-sky-400' },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysDiff(baseline: string, forecast: string) {
  const b = new Date(baseline).getTime();
  const f = new Date(forecast).getTime();
  return Math.round((f - b) / (1000 * 60 * 60 * 24));
}

export default function MilestoneTimeline({ milestones }: MilestoneTimelineProps) {
  return (
    <div className="space-y-2">
      {milestones.map((ms) => {
        const cfg = statusConfig[ms.status];
        const diff = daysDiff(ms.baseline_date, ms.forecast_date);
        return (
          <div key={ms.id} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`}></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-200 font-medium truncate">{ms.name}</p>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                <span>База: {formatDate(ms.baseline_date)}</span>
                <span>→</span>
                <span className={diff > 0 ? 'text-red-400' : diff < 0 ? 'text-emerald-400' : ''}>
                  Прогноз: {formatDate(ms.forecast_date)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {diff !== 0 && ms.status !== 'COMPLETE' && (
                <span className={`text-xs font-semibold ${diff > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {diff > 0 ? `+${diff}d` : `${diff}d`}
                </span>
              )}
              <span className={`badge ${cfg.className}`}>{cfg.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
