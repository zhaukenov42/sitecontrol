import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '../api';

interface ReportsPageProps {
  projectId: number;
}

const MS_STATUS: Record<string, { label: string; color: string }> = {
  ON_TRACK: { label: 'В ГРАФИКЕ', color: 'text-emerald-400' },
  AT_RISK: { label: 'ПОД РИСКОМ', color: 'text-amber-400' },
  DELAYED: { label: 'ЗАДЕРЖКА', color: 'text-red-400' },
  COMPLETE: { label: 'ЗАВЕРШЁН', color: 'text-sky-400' },
};

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl text-sm">
        <p className="text-slate-400 text-xs mb-2">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {p.value !== null ? `${p.value}%` : '—'}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const REPORT_HISTORY = [
  { id: 3, week: 'Неделя 22 (2–6 июня 2025)', generated: '2025-06-06T08:00:00Z', spi: 0.81 },
  { id: 2, week: 'Неделя 21 (26–30 мая 2025)', generated: '2025-05-30T08:00:00Z', spi: 0.82 },
  { id: 1, week: 'Неделя 20 (19–23 мая 2025)', generated: '2025-05-23T08:00:00Z', spi: 0.83 },
];

export default function ReportsPage({ projectId }: ReportsPageProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  function generate() {
    setLoading(true);
    api.getWeeklySummary(projectId).then((d: any) => {
      setData(d);
      setLoading(false);
      setGenerated(true);
    }).catch(() => setLoading(false));
  }

  useEffect(() => {
    generate();
  }, [projectId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Отчёты</h1>
          <p className="text-slate-400 text-sm mt-1">Еженедельный отчёт для заказчика — АО НК КазахГаз</p>
        </div>
        <button onClick={generate} disabled={loading} className="btn-primary">
          {loading ? '⏳ Формирование…' : '📊 Сформировать отчёт'}
        </button>
      </div>

      {loading && (
        <div className="card text-center py-12">
          <div className="text-slate-400 animate-pulse">Формирование отчёта…</div>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Executive Summary */}
          <div className="card border-sky-700 bg-sky-950/20">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📋</span>
              <h2 className="text-lg font-semibold text-white">Исполнительное резюме</h2>
              <span className="text-slate-500 text-sm ml-auto">
                {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {[
                { label: 'Общая готовность', value: `${data.summary.pct_complete?.toFixed(1)}%`, color: 'text-sky-400' },
                { label: 'SPI', value: data.summary.spi?.toFixed(3), color: data.summary.spi < 0.85 ? 'text-red-400' : 'text-amber-400' },
                { label: 'Отставание', value: `−${Math.abs(data.summary.variance_days)} дн.`, color: 'text-red-400' },
                { label: 'Численность', value: `${data.summary.total_headcount} чел.`, color: 'text-emerald-400' },
              ].map((m) => (
                <div key={m.label} className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <p className="text-slate-400 text-xs mb-1">{m.label}</p>
                  <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Зоны GREEN', value: data.summary.green_zones, color: 'text-emerald-400' },
                { label: 'Зоны AMBER', value: data.summary.amber_zones, color: 'text-amber-400' },
                { label: 'Зоны RED', value: data.summary.red_zones, color: 'text-red-400' },
              ].map((m) => (
                <div key={m.label} className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                  <p className="text-slate-400 text-xs">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* S-Curve */}
          <div className="card">
            <h2 className="text-base font-semibold text-white mb-1">S-кривая — план vs факт</h2>
            <p className="text-slate-500 text-xs mb-4">Накопленная готовность в % от общего объёма работ</p>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.s_curve} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="planGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#475569' }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#475569' }} tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Legend
                  wrapperStyle={{ paddingTop: '8px' }}
                  formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>}
                />
                <Area
                  type="monotone"
                  dataKey="plan"
                  name="План (%)"
                  stroke="#22c55e"
                  fill="url(#planGrad)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  name="Факт (%)"
                  stroke="#3b82f6"
                  fill="url(#actualGrad)"
                  strokeWidth={2.5}
                  dot={{ fill: '#3b82f6', r: 3 }}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Milestone RAG Table */}
          <div className="card">
            <h2 className="text-base font-semibold text-white mb-4">Контрольные события — RAG-статус</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="table-header">Контрольное событие</th>
                    <th className="table-header">База</th>
                    <th className="table-header">Прогноз</th>
                    <th className="table-header">Отставание</th>
                    <th className="table-header">RAG</th>
                  </tr>
                </thead>
                <tbody>
                  {data.milestones.map((ms: any) => {
                    const cfg = MS_STATUS[ms.status] || MS_STATUS.ON_TRACK;
                    const diff = Math.round(
                      (new Date(ms.forecast_date).getTime() - new Date(ms.baseline_date).getTime()) / 86400000
                    );
                    return (
                      <tr key={ms.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="table-cell font-medium">{ms.name}</td>
                        <td className="table-cell text-slate-400">
                          {new Date(ms.baseline_date).toLocaleDateString('ru-RU')}
                        </td>
                        <td className={`table-cell font-medium ${diff > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                          {new Date(ms.forecast_date).toLocaleDateString('ru-RU')}
                        </td>
                        <td className={`table-cell font-mono ${diff > 0 ? 'text-red-400' : diff < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {diff > 0 ? `+${diff}d` : diff < 0 ? `${diff}d` : '0'}
                        </td>
                        <td className="table-cell">
                          <span className={`font-semibold text-xs ${cfg.color}`}>{cfg.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Risk Summary */}
          <div className="card">
            <h2 className="text-base font-semibold text-white mb-4">
              Сводка рисков ({data.risks.length} открытых)
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Критических рисков', value: data.summary.critical_risks, color: 'text-red-400' },
                { label: 'Всего открытых', value: data.risks.length, color: 'text-amber-400' },
              ].map((m) => (
                <div key={m.label} className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
                  <p className="text-slate-400 text-sm mt-1">{m.label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {data.risks.filter((r: any) => r.is_critical).map((risk: any) => (
                <div key={risk.id} className="p-3 bg-red-950/30 border border-red-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 text-xs font-bold mt-0.5">⚡ КРИТИЧЕСКИЙ</span>
                    <p className="text-slate-300 text-sm">{risk.description.slice(0, 100)}…</p>
                  </div>
                  <p className="text-slate-500 text-xs mt-1">Ответственный: {risk.owner}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Report History */}
      <div className="card">
        <h2 className="text-base font-semibold text-white mb-4">История отчётов</h2>
        <div className="space-y-2">
          {REPORT_HISTORY.map((rep) => (
            <div key={rep.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors">
              <div>
                <p className="text-slate-200 text-sm font-medium">{rep.week}</p>
                <p className="text-slate-400 text-xs mt-0.5">
                  Сформирован: {new Date(rep.generated).toLocaleString('ru-RU')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold ${rep.spi < 0.85 ? 'text-red-400' : 'text-amber-400'}`}>
                  SPI: {rep.spi.toFixed(2)}
                </span>
                <button className="btn-secondary text-xs py-1 px-3 opacity-50 cursor-not-allowed" disabled>
                  📄 Скачать
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
