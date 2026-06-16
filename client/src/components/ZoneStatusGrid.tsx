interface Zone {
  id: number;
  code: string;
  name: string;
  pct_complete: number;
  status: 'GREEN' | 'AMBER' | 'RED';
  headcount: number;
  float_days: number;
  forecast_finish: string;
}

interface ZoneStatusGridProps {
  zones: Zone[];
}

const statusStyles = {
  GREEN: 'border-emerald-600 bg-emerald-950/50',
  AMBER: 'border-amber-600 bg-amber-950/50',
  RED: 'border-red-600 bg-red-950/50',
};

const statusDot = {
  GREEN: 'bg-emerald-400',
  AMBER: 'bg-amber-400',
  RED: 'bg-red-400',
};

const statusLabel = {
  GREEN: 'В НОРМЕ',
  AMBER: 'ВНИМАНИЕ',
  RED: 'КРИТИЧНО',
};

const statusTextColor = {
  GREEN: 'text-emerald-400',
  AMBER: 'text-amber-400',
  RED: 'text-red-400',
};

export default function ZoneStatusGrid({ zones }: ZoneStatusGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {zones.map((zone) => (
        <div
          key={zone.id}
          className={`rounded-xl border-2 p-4 ${statusStyles[zone.status]}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-xs font-mono font-semibold">{zone.code}</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${statusDot[zone.status]}`}></span>
              <span className={`text-xs font-bold ${statusTextColor[zone.status]}`}>
                {statusLabel[zone.status]}
              </span>
            </div>
          </div>
          <p className="text-white font-semibold text-sm leading-tight mb-3">{zone.name}</p>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Готовность</span>
              <span className="text-white font-bold">{zone.pct_complete.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  zone.status === 'GREEN'
                    ? 'bg-emerald-500'
                    : zone.status === 'AMBER'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${zone.pct_complete}%` }}
              ></div>
            </div>
          </div>

          <div className="flex justify-between text-xs text-slate-400">
            <span>👷 {zone.headcount} чел.</span>
            <span className={zone.float_days < 0 ? 'text-red-400 font-medium' : 'text-slate-400'}>
              Резерв: {zone.float_days} дн.
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Прогноз: {new Date(zone.forecast_finish).toLocaleDateString('ru-RU')}
          </div>
        </div>
      ))}
    </div>
  );
}
