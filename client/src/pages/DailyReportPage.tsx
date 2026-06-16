import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api';

interface DailyReportPageProps {
  projectId: number;
}

interface FormData {
  wbs_zone_id: string;
  date: string;
  pct_today: string;
  headcount: string;
  equipment_count: string;
  deliveries_status: string;
  new_issues: string;
  foreman_notes: string;
  submitted_by: string;
}

const deliveryLabels: Record<string, string> = {
  ON_TIME: 'Вовремя',
  DELAYED: 'С задержкой',
  NOT_EXPECTED: 'Не ожидается',
};

export default function DailyReportPage({ projectId }: DailyReportPageProps) {
  const [zones, setZones] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitOk, setSubmitOk] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      deliveries_status: 'NOT_EXPECTED',
      pct_today: '1.0',
      headcount: '0',
      equipment_count: '0',
    },
  });

  const selectedZoneId = watch('wbs_zone_id');
  const pctToday = watch('pct_today');
  const headcount = watch('headcount');

  useEffect(() => {
    api.getZones(projectId).then((z: any) => setZones(z));
    loadReports();
  }, [projectId]);

  function loadReports() {
    api.getDailyReports({ project_id: projectId, limit: 21 }).then((r: any) => setReports(r));
  }

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setSubmitOk(false);
    setSubmitError('');
    try {
      await api.createDailyReport({
        ...data,
        wbs_zone_id: parseInt(data.wbs_zone_id),
        pct_today: parseFloat(data.pct_today),
        headcount: parseInt(data.headcount),
        equipment_count: parseInt(data.equipment_count),
      });
      setSubmitOk(true);
      reset({
        date: new Date().toISOString().split('T')[0],
        deliveries_status: 'NOT_EXPECTED',
        pct_today: '1.0',
        headcount: '0',
        equipment_count: '0',
        wbs_zone_id: data.wbs_zone_id,
        submitted_by: data.submitted_by,
      });
      loadReports();
      setTimeout(() => setSubmitOk(false), 4000);
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedZone = zones.find((z) => z.id === parseInt(selectedZoneId));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Ежедневный отчёт</h1>
        <p className="text-slate-400 text-sm mt-1">Заполните форму по итогам рабочей смены</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 card">
          {submitOk && (
            <div className="mb-4 p-3 bg-emerald-900/50 border border-emerald-700 rounded-lg">
              <p className="text-emerald-400 text-sm font-medium">✓ Отчёт успешно отправлен</p>
            </div>
          )}
          {submitError && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
              <p className="text-red-400 text-sm">Ошибка: {submitError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Зона ВРС *</label>
                <select
                  {...register('wbs_zone_id', { required: 'Выберите зону' })}
                  className="form-select"
                >
                  <option value="">— Выберите зону —</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.code} — {z.name}
                    </option>
                  ))}
                </select>
                {errors.wbs_zone_id && (
                  <p className="text-red-400 text-xs mt-1">{errors.wbs_zone_id.message}</p>
                )}
              </div>
              <div>
                <label className="form-label">Дата *</label>
                <input type="date" {...register('date', { required: true })} className="form-input" />
              </div>
            </div>

            {selectedZone && (
              <div className="p-3 bg-slate-700/50 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    selectedZone.status === 'GREEN' ? 'bg-emerald-400' :
                    selectedZone.status === 'AMBER' ? 'bg-amber-400' : 'bg-red-400'
                  }`}></span>
                  <span className="text-slate-300">{selectedZone.name}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">Текущая готовность: {selectedZone.pct_complete.toFixed(0)}%</span>
                </div>
              </div>
            )}

            {/* Progress & Headcount */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="form-label">Прирост за день, %</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  {...register('pct_today')}
                  className="form-input"
                />
                <div className="mt-2">
                  <div className="h-1.5 bg-slate-700 rounded-full">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all"
                      style={{ width: `${Math.min(parseFloat(pctToday || '0') * 10, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{pctToday || 0}% прироста</p>
                </div>
              </div>
              <div>
                <label className="form-label">Численность, чел.</label>
                <input type="number" min="0" {...register('headcount')} className="form-input" />
                <p className="text-xs text-slate-500 mt-1">{headcount || 0} человек</p>
              </div>
              <div>
                <label className="form-label">Техника, ед.</label>
                <input type="number" min="0" {...register('equipment_count')} className="form-input" />
              </div>
            </div>

            {/* Deliveries */}
            <div>
              <label className="form-label">Статус поставок</label>
              <div className="flex gap-3">
                {Object.entries(deliveryLabels).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value={value}
                      {...register('deliveries_status')}
                      className="accent-sky-500"
                    />
                    <span className="text-sm text-slate-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Issues */}
            <div>
              <label className="form-label">Новые проблемы / блокеры</label>
              <textarea
                rows={3}
                placeholder="Опишите возникшие проблемы, если есть…"
                {...register('new_issues')}
                className="form-textarea"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="form-label">Примечания прораба</label>
              <textarea
                rows={3}
                placeholder="Комментарии о ходе работ, планах на завтра…"
                {...register('foreman_notes')}
                className="form-textarea"
              />
            </div>

            {/* Submitted by */}
            <div>
              <label className="form-label">ФИО прораба *</label>
              <input
                type="text"
                placeholder="Иванов И.И."
                {...register('submitted_by', { required: 'Укажите ФИО' })}
                className="form-input"
              />
              {errors.submitted_by && (
                <p className="text-red-400 text-xs mt-1">{errors.submitted_by.message}</p>
              )}
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-base">
              {submitting ? 'Отправка…' : 'Отправить отчёт'}
            </button>
          </form>
        </div>

        {/* Zone quick stats */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3">Состояние зон</h3>
            <div className="space-y-2">
              {zones.map((z) => (
                <div key={z.id} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    z.status === 'GREEN' ? 'bg-emerald-400' :
                    z.status === 'AMBER' ? 'bg-amber-400' : 'bg-red-400'
                  }`}></span>
                  <span className="text-xs text-slate-400 flex-1 truncate">{z.name}</span>
                  <span className="text-xs text-white font-semibold">{z.pct_complete.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reports Table */}
      <div className="card">
        <h2 className="text-base font-semibold text-white mb-4">Последние 7 дней — отчёты по зонам</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="table-header">Дата</th>
                <th className="table-header">Зона</th>
                <th className="table-header">Прирост</th>
                <th className="table-header">Численность</th>
                <th className="table-header">Техника</th>
                <th className="table-header">Поставки</th>
                <th className="table-header">Проблемы</th>
                <th className="table-header">Прораб</th>
                <th className="table-header">Статус</th>
              </tr>
            </thead>
            <tbody>
              {reports.slice(0, 21).map((r: any) => (
                <tr key={r.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="table-cell whitespace-nowrap">
                    {new Date(r.date).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="table-cell">
                    <span className="text-slate-500 text-xs font-mono">{r.zone_code}</span>{' '}
                    <span className="text-xs">{r.zone_name}</span>
                  </td>
                  <td className="table-cell text-sky-400 font-mono">+{parseFloat(r.pct_today).toFixed(2)}%</td>
                  <td className="table-cell">{r.headcount}</td>
                  <td className="table-cell">{r.equipment_count}</td>
                  <td className="table-cell">
                    <span className={`badge ${
                      r.deliveries_status === 'ON_TIME' ? 'badge-green' :
                      r.deliveries_status === 'DELAYED' ? 'badge-red' : 'badge-gray'
                    }`}>
                      {deliveryLabels[r.deliveries_status] || r.deliveries_status}
                    </span>
                  </td>
                  <td className="table-cell max-w-xs">
                    {r.new_issues ? (
                      <span className="text-red-400 text-xs">{r.new_issues.slice(0, 50)}</span>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="table-cell text-xs text-slate-400">{r.submitted_by}</td>
                  <td className="table-cell">
                    <span className={`badge ${r.approved ? 'badge-green' : 'badge-gray'}`}>
                      {r.approved ? 'Утверждён' : 'Ожидает'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
