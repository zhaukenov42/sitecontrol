import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api';

interface RiskRegisterPageProps {
  projectId: number;
}

const PROB_LABELS: Record<string, { label: string; badge: string }> = {
  LOW: { label: 'Низкая', badge: 'badge-green' },
  MEDIUM: { label: 'Средняя', badge: 'badge-amber' },
  HIGH: { label: 'Высокая', badge: 'badge-red' },
};

const IMPACT_LABELS: Record<string, { label: string; badge: string }> = {
  LOW: { label: 'Низкое', badge: 'badge-green' },
  MEDIUM: { label: 'Среднее', badge: 'badge-amber' },
  HIGH: { label: 'Высокое', badge: 'badge-red' },
};

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  OPEN: { label: 'Открыт', badge: 'badge-red' },
  IN_PROGRESS: { label: 'В работе', badge: 'badge-amber' },
  MITIGATED: { label: 'Снижен', badge: 'badge-blue' },
  CLOSED: { label: 'Закрыт', badge: 'badge-green' },
};

export default function RiskRegisterPage({ projectId }: RiskRegisterPageProps) {
  const [risks, setRisks] = useState<any[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editRisk, setEditRisk] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, reset, setValue } = useForm<any>({
    defaultValues: {
      probability: 'MEDIUM',
      impact: 'MEDIUM',
      status: 'OPEN',
      is_critical: false,
    },
  });

  useEffect(() => {
    loadRisks();
  }, [projectId]);

  function loadRisks() {
    setLoading(true);
    api.getRisks({ project_id: projectId }).then((r: any) => {
      setRisks(r);
      setLoading(false);
    });
  }

  function startEdit(risk: any) {
    setEditRisk(risk);
    setShowForm(true);
    reset({
      description: risk.description,
      probability: risk.probability,
      impact: risk.impact,
      mitigation: risk.mitigation,
      owner: risk.owner,
      status: risk.status,
      is_critical: risk.is_critical === 1,
    });
  }

  function startAdd() {
    setEditRisk(null);
    setShowForm(true);
    reset({
      probability: 'MEDIUM',
      impact: 'MEDIUM',
      status: 'OPEN',
      is_critical: false,
    });
  }

  async function onSubmit(data: any) {
    try {
      if (editRisk) {
        await api.updateRisk(editRisk.id, data);
      } else {
        await api.createRisk({ ...data, project_id: projectId });
      }
      setShowForm(false);
      setEditRisk(null);
      reset({});
      loadRisks();
    } catch (e: any) {
      alert('Ошибка: ' + e.message);
    }
  }

  async function updateStatus(id: number, status: string) {
    await api.updateRisk(id, { status });
    loadRisks();
  }

  async function deleteRisk(id: number) {
    if (!confirm('Удалить риск?')) return;
    await api.deleteRisk(id);
    loadRisks();
  }

  const filtered = filter === 'ALL'
    ? risks
    : filter === 'CRITICAL'
    ? risks.filter((r) => r.is_critical)
    : risks.filter((r) => r.status === filter);

  const statusCounts = {
    ALL: risks.length,
    OPEN: risks.filter((r) => r.status === 'OPEN').length,
    IN_PROGRESS: risks.filter((r) => r.status === 'IN_PROGRESS').length,
    CRITICAL: risks.filter((r) => r.is_critical).length,
    MITIGATED: risks.filter((r) => r.status === 'MITIGATED').length,
    CLOSED: risks.filter((r) => r.status === 'CLOSED').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Реестр рисков</h1>
          <p className="text-slate-400 text-sm mt-1">Управление рисками проекта</p>
        </div>
        <button onClick={startAdd} className="btn-primary">
          + Добавить риск
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { key: 'ALL', label: 'Всего', color: 'text-slate-300' },
          { key: 'OPEN', label: 'Открыты', color: 'text-red-400' },
          { key: 'IN_PROGRESS', label: 'В работе', color: 'text-amber-400' },
          { key: 'CRITICAL', label: 'Критических', color: 'text-red-500' },
          { key: 'MITIGATED', label: 'Снижены', color: 'text-sky-400' },
          { key: 'CLOSED', label: 'Закрыты', color: 'text-emerald-400' },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`card text-center cursor-pointer transition-all ${filter === s.key ? 'ring-2 ring-sky-500' : 'hover:bg-slate-700'}`}
          >
            <p className={`text-2xl font-bold ${s.color}`}>{statusCounts[s.key as keyof typeof statusCounts]}</p>
            <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card border-sky-700">
          <h2 className="text-base font-semibold text-white mb-4">
            {editRisk ? 'Редактировать риск' : 'Новый риск'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="form-label">Описание риска *</label>
              <textarea
                {...register('description', { required: true })}
                rows={3}
                className="form-textarea"
                placeholder="Подробное описание риска…"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="form-label">Вероятность</label>
                <select {...register('probability')} className="form-select">
                  <option value="LOW">Низкая</option>
                  <option value="MEDIUM">Средняя</option>
                  <option value="HIGH">Высокая</option>
                </select>
              </div>
              <div>
                <label className="form-label">Воздействие</label>
                <select {...register('impact')} className="form-select">
                  <option value="LOW">Низкое</option>
                  <option value="MEDIUM">Среднее</option>
                  <option value="HIGH">Высокое</option>
                </select>
              </div>
              <div>
                <label className="form-label">Статус</label>
                <select {...register('status')} className="form-select">
                  <option value="OPEN">Открыт</option>
                  <option value="IN_PROGRESS">В работе</option>
                  <option value="MITIGATED">Снижен</option>
                  <option value="CLOSED">Закрыт</option>
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register('is_critical')} className="accent-red-500 w-4 h-4" />
                  <span className="text-sm text-slate-300">Критический</span>
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Меры по снижению *</label>
                <textarea
                  {...register('mitigation', { required: true })}
                  rows={2}
                  className="form-textarea"
                  placeholder="Описание мер по снижению…"
                />
              </div>
              <div>
                <label className="form-label">Ответственный *</label>
                <input
                  {...register('owner', { required: true })}
                  className="form-input"
                  placeholder="ФИО и должность"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setShowForm(false); setEditRisk(null); }} className="btn-secondary">
                Отмена
              </button>
              <button type="submit" className="btn-primary">
                {editRisk ? 'Сохранить' : 'Добавить риск'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'ALL', label: 'Все' },
          { key: 'OPEN', label: 'Открытые' },
          { key: 'IN_PROGRESS', label: 'В работе' },
          { key: 'CRITICAL', label: '⚡ Критические' },
          { key: 'MITIGATED', label: 'Снижены' },
          { key: 'CLOSED', label: 'Закрыты' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === f.key
                ? 'bg-sky-700 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Risks Table */}
      {loading ? (
        <div className="card text-center py-8 text-slate-400 animate-pulse">Загрузка…</div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="card text-center py-8 text-slate-500">Нет рисков по выбранному фильтру</div>
          ) : (
            filtered.map((risk) => (
              <div
                key={risk.id}
                className={`card border ${risk.is_critical ? 'border-red-700 bg-red-950/20' : 'border-slate-700'}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <p className="text-slate-500 text-xs font-mono">R-{String(risk.id).padStart(3, '0')}</p>
                    {risk.is_critical && (
                      <span className="text-red-400 text-xs font-bold flex items-center gap-1 mt-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full inline-block animate-pulse"></span>
                        КРИТИЧЕСКИЙ
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{risk.description}</p>
                    <p className="text-slate-400 text-xs mt-2">
                      <strong className="text-slate-300">Меры:</strong> {risk.mitigation}
                    </p>
                    <p className="text-slate-500 text-xs mt-1">
                      Ответственный: <span className="text-slate-300">{risk.owner}</span>
                    </p>
                  </div>

                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${PROB_LABELS[risk.probability]?.badge}`}>
                        В: {PROB_LABELS[risk.probability]?.label}
                      </span>
                      <span className={`badge ${IMPACT_LABELS[risk.impact]?.badge}`}>
                        У: {IMPACT_LABELS[risk.impact]?.label}
                      </span>
                      <span className={`badge ${STATUS_LABELS[risk.status]?.badge}`}>
                        {STATUS_LABELS[risk.status]?.label}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-1">
                      {risk.status === 'OPEN' && (
                        <button
                          onClick={() => updateStatus(risk.id, 'IN_PROGRESS')}
                          className="text-xs px-2 py-1 bg-amber-900/50 border border-amber-700 text-amber-300 rounded hover:bg-amber-800/50"
                        >
                          В работу
                        </button>
                      )}
                      {risk.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => updateStatus(risk.id, 'MITIGATED')}
                          className="text-xs px-2 py-1 bg-sky-900/50 border border-sky-700 text-sky-300 rounded hover:bg-sky-800/50"
                        >
                          Снижен
                        </button>
                      )}
                      {risk.status !== 'CLOSED' && (
                        <button
                          onClick={() => updateStatus(risk.id, 'CLOSED')}
                          className="text-xs px-2 py-1 bg-emerald-900/50 border border-emerald-700 text-emerald-300 rounded hover:bg-emerald-800/50"
                        >
                          Закрыть
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(risk)}
                        className="text-xs px-2 py-1 bg-slate-700 border border-slate-600 text-slate-300 rounded hover:bg-slate-600"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteRisk(risk.id)}
                        className="text-xs px-2 py-1 bg-red-900/40 border border-red-800 text-red-400 rounded hover:bg-red-900/70"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
