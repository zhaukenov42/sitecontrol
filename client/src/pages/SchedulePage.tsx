import { useEffect, useState, useRef } from 'react';
import api from '../api';

interface SchedulePageProps {
  projectId: number;
}

// Mock WBS activities data
const ACTIVITIES = [
  { code: 'WBS-01', name: 'Фундаментные работы', baselineStart: '2024-01-15', forecastFinish: '2024-09-15', float: 15, pct: 95, status: 'GREEN', critical: false },
  { code: 'WBS-02', name: 'Стальные конструкции', baselineStart: '2024-06-01', forecastFinish: '2025-05-20', float: -7, pct: 72, status: 'AMBER', critical: false },
  { code: 'WBS-03', name: 'Трубопроводы', baselineStart: '2024-08-01', forecastFinish: '2025-09-10', float: -25, pct: 58, status: 'RED', critical: true },
  { code: 'WBS-04', name: 'Электромонтаж', baselineStart: '2024-09-01', forecastFinish: '2025-10-15', float: -18, pct: 45, status: 'RED', critical: true },
  { code: 'WBS-05', name: 'Изоляция', baselineStart: '2025-01-01', forecastFinish: '2025-11-20', float: -8, pct: 30, status: 'AMBER', critical: false },
  { code: 'WBS-06', name: 'Пусконаладка', baselineStart: '2025-06-01', forecastFinish: '2026-03-15', float: -75, pct: 5, status: 'RED', critical: true },
];

function SpiGauge({ spi }: { spi: number }) {
  const pct = Math.min(Math.max((spi - 0.6) / (1.2 - 0.6), 0), 1);
  const angle = pct * 180 - 90;
  const color = spi >= 0.95 ? '#22c55e' : spi >= 0.85 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-20 overflow-hidden">
        <svg viewBox="0 0 160 80" className="w-full h-full">
          {/* Background arc */}
          <path d="M 10 80 A 70 70 0 0 1 150 80" fill="none" stroke="#334155" strokeWidth="12" strokeLinecap="round" />
          {/* Colored arc */}
          <path d="M 10 80 A 70 70 0 0 1 150 80" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${pct * 220} 220`}
          />
          {/* Needle */}
          <line
            x1="80" y1="80"
            x2={80 + 55 * Math.cos((angle - 90) * Math.PI / 180)}
            y2={80 + 55 * Math.sin((angle - 90) * Math.PI / 180)}
            stroke="white" strokeWidth="2" strokeLinecap="round"
          />
          <circle cx="80" cy="80" r="5" fill={color} />
        </svg>
      </div>
      <p className="text-3xl font-bold mt-1" style={{ color }}>{spi.toFixed(3)}</p>
      <p className="text-slate-400 text-xs">Индекс выполнения расписания (SPI)</p>
    </div>
  );
}

export default function SchedulePage({ projectId }: SchedulePageProps) {
  const [project, setProject] = useState<any>(null);
  const [imports, setImports] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getProject(projectId).then((p: any) => setProject(p));
    api.getP6Imports(projectId).then((i: any) => setImports(i));
  }, [projectId]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg('');
    try {
      const result = await api.importSchedule(projectId, file);
      setUploadMsg(`Файл "${file.name}" импортирован. SPI: ${result.parsed?.spi?.toFixed(3)}, отставание: ${result.parsed?.variance_days} дн.`);
      api.getP6Imports(projectId).then((i: any) => setImports(i));
      api.getProject(projectId).then((p: any) => setProject(p));
    } catch (e: any) {
      setUploadMsg('Ошибка импорта: ' + e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const statusLabel: Record<string, string> = { GREEN: 'В НОРМЕ', AMBER: 'ВНИМАНИЕ', RED: 'КРИТИЧНО' };
  const statusBadge: Record<string, string> = { GREEN: 'badge-green', AMBER: 'badge-amber', RED: 'badge-red' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Расписание / P6</h1>
        <p className="text-slate-400 text-sm mt-1">Управление графиком проекта и импорт данных из Primavera P6</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SPI Gauge */}
        <div className="card flex flex-col items-center justify-center">
          {project ? (
            <SpiGauge spi={project.spi} />
          ) : (
            <div className="text-slate-400 animate-pulse">Загрузка…</div>
          )}
          {project && (
            <div className="mt-4 w-full space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Прогноз завершения</span>
                <span className="text-white font-medium">
                  {new Date(project.forecast_finish).toLocaleDateString('ru-RU')}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">База</span>
                <span className="text-slate-300">
                  {new Date(project.baseline_finish).toLocaleDateString('ru-RU')}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Готовность</span>
                <span className="text-sky-400 font-semibold">{project.pct_complete?.toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* P6 Import */}
        <div className="card lg:col-span-2">
          <h2 className="text-base font-semibold text-white mb-4">Импорт P6 / XER</h2>
          <div className="border-2 border-dashed border-slate-600 rounded-xl p-6 text-center hover:border-sky-600 transition-colors">
            <div className="text-4xl mb-2">📁</div>
            <p className="text-slate-300 text-sm font-medium mb-1">Загрузите файл расписания</p>
            <p className="text-slate-500 text-xs mb-4">Форматы: .xlsx, .xer (Primavera P6)</p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xer,.xml"
              onChange={handleFileUpload}
              className="hidden"
              id="p6-upload"
            />
            <label htmlFor="p6-upload" className="btn-primary cursor-pointer">
              {uploading ? 'Импорт…' : 'Выбрать файл'}
            </label>
          </div>

          {uploadMsg && (
            <div className={`mt-3 p-3 rounded-lg text-sm ${uploadMsg.startsWith('Ошибка') ? 'bg-red-900/50 border border-red-700 text-red-400' : 'bg-emerald-900/50 border border-emerald-700 text-emerald-400'}`}>
              {uploadMsg}
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Последний SPI', value: imports[0]?.spi?.toFixed(3) || '—', color: 'text-red-400' },
              { label: 'Отставание', value: imports[0] ? `${Math.abs(imports[0].variance_days)} дн.` : '—', color: 'text-amber-400' },
              { label: 'Обновлений', value: imports.length, color: 'text-sky-400' },
            ].map((m) => (
              <div key={m.label} className="bg-slate-700/50 rounded-lg p-3 text-center">
                <p className="text-slate-400 text-xs">{m.label}</p>
                <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activities Table */}
      <div className="card">
        <h2 className="text-base font-semibold text-white mb-4">Работы ВРС — статус и критический путь</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="table-header">Код</th>
                <th className="table-header">Наименование работы</th>
                <th className="table-header">Начало (база)</th>
                <th className="table-header">Прогноз завершения</th>
                <th className="table-header">Резерв, дн.</th>
                <th className="table-header">Готовность</th>
                <th className="table-header">Статус</th>
              </tr>
            </thead>
            <tbody>
              {ACTIVITIES.map((a) => (
                <tr
                  key={a.code}
                  className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${a.critical ? 'border-l-2 border-l-red-600' : ''}`}
                >
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      {a.critical && <span className="text-red-400 text-xs font-bold" title="Критический путь">CP</span>}
                      <span className="font-mono text-xs text-slate-400">{a.code}</span>
                    </div>
                  </td>
                  <td className="table-cell font-medium">{a.name}</td>
                  <td className="table-cell text-slate-400">
                    {new Date(a.baselineStart).toLocaleDateString('ru-RU')}
                  </td>
                  <td className={`table-cell font-medium ${a.float < 0 ? 'text-red-400' : 'text-slate-300'}`}>
                    {new Date(a.forecastFinish).toLocaleDateString('ru-RU')}
                  </td>
                  <td className={`table-cell font-mono font-semibold ${a.float < 0 ? 'text-red-400' : a.float === 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {a.float > 0 ? '+' : ''}{a.float}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${a.status === 'GREEN' ? 'bg-emerald-500' : a.status === 'AMBER' ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${a.pct}%` }}
                        ></div>
                      </div>
                      <span className="text-white text-xs font-semibold w-8">{a.pct}%</span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${statusBadge[a.status]}`}>{statusLabel[a.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-3">CP = Критический путь (нулевой или отрицательный резерв)</p>
      </div>

      {/* Import History */}
      <div className="card">
        <h2 className="text-base font-semibold text-white mb-4">История импорта P6</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="table-header">#</th>
                <th className="table-header">Файл</th>
                <th className="table-header">Дата импорта</th>
                <th className="table-header">SPI</th>
                <th className="table-header">Отставание, дн.</th>
                <th className="table-header">Тенденция</th>
              </tr>
            </thead>
            <tbody>
              {imports.map((imp: any, idx: number) => {
                const prev = imports[idx + 1];
                const trend = prev ? imp.spi - prev.spi : 0;
                return (
                  <tr key={imp.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="table-cell text-slate-500">{imports.length - idx}</td>
                    <td className="table-cell font-mono text-xs text-slate-300">{imp.filename}</td>
                    <td className="table-cell">
                      {new Date(imp.imported_at).toLocaleDateString('ru-RU', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </td>
                    <td className={`table-cell font-mono font-bold ${imp.spi < 0.85 ? 'text-red-400' : imp.spi < 0.95 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {imp.spi.toFixed(3)}
                    </td>
                    <td className="table-cell text-red-400 font-medium">−{Math.abs(imp.variance_days)}</td>
                    <td className="table-cell">
                      {idx < imports.length - 1 && (
                        <span className={trend >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(3)}
                        </span>
                      )}
                      {idx === imports.length - 1 && <span className="text-slate-500">базовый</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
