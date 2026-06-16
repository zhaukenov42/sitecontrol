import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api';

interface RecoveryPlanPageProps {
  projectId: number;
}

const SECTIONS = [
  { key: 'executiveSummary', label: 'Исполнительное резюме' },
  { key: 'delayAnalysis', label: 'Анализ отставания' },
  { key: 'recoveryStrategy', label: 'Стратегия восстановления' },
  { key: 'revisedMilestones', label: 'Пересмотренные контрольные события' },
  { key: 'riskRegisterSummary', label: 'Реестр рисков (сводка)' },
  { key: 'kpis', label: 'КПЭ восстановления' },
  { key: 'signOff', label: 'Подписи и согласование' },
];

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  DRAFT: { label: 'Черновик', badge: 'badge-gray' },
  SUBMITTED: { label: 'На согласовании', badge: 'badge-amber' },
  APPROVED: { label: 'Утверждён', badge: 'badge-green' },
};

export default function RecoveryPlanPage({ projectId }: RecoveryPlanPageProps) {
  const [plans, setPlans] = useState<any[]>([]);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const [project, setProject] = useState<any>(null);

  const { register, handleSubmit, reset } = useForm<any>();

  useEffect(() => {
    api.getProject(projectId).then((p: any) => setProject(p));
    loadPlans();
  }, [projectId]);

  function loadPlans() {
    api.getRecoveryPlans(projectId).then((ps: any) => {
      setPlans(ps);
      if (ps.length > 0) {
        setActivePlan(ps[0]);
        setSelectedVersion(ps[0]);
        reset(ps[0].content_json || {});
      }
    });
  }

  async function handleGenerate() {
    const content = {
      executiveSummary: `По состоянию на ${new Date().toLocaleDateString('ru-RU')} реализация проекта отстаёт от базового графика. SPI = ${project?.spi?.toFixed(2) || '—'}. Требуется разработка и реализация плана восстановления.`,
      delayAnalysis: 'Основные причины отставания:\n1. Задержка поставок материалов\n2. Дефицит квалифицированных кадров\n3. Погодные условия\n4. Изменения проектной документации',
      recoveryStrategy: '1. Увеличение сменности работ до 2 смен\n2. Привлечение дополнительных субподрядчиков\n3. Параллельное выполнение смежных работ\n4. Еженедельные оперативные совещания',
      revisedMilestones: 'Механическая готовность (MC): пересмотр срока\nВвод в эксплуатацию: пересмотр срока',
      riskRegisterSummary: 'Критические риски под наблюдением. Назначены ответственные. Меры по снижению рисков реализуются.',
      kpis: 'SPI ≥ 0.90 к концу квартала\nЧисленность на площадке: согласно графику\nЕженедельный прирост: по WBS-зонам',
      signOff: 'Подготовил: ПМ\nПроверил: ГИП\nСогласование заказчика: ожидается',
    };
    try {
      await api.createRecoveryPlan({ project_id: projectId, content_json: content });
      loadPlans();
    } catch (e: any) {
      alert('Ошибка: ' + e.message);
    }
  }

  async function onSave(data: any) {
    if (!activePlan) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await api.updateRecoveryPlan(activePlan.id, { content_json: data });
      setSaveMsg('Сохранено');
      loadPlans();
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e: any) {
      setSaveMsg('Ошибка: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(status: string) {
    if (!activePlan) return;
    await api.updateRecoveryPlan(activePlan.id, { status });
    loadPlans();
  }

  function selectVersion(plan: any) {
    setSelectedVersion(plan);
    setActivePlan(plan);
    reset(plan.content_json || {});
    setEditMode(false);
  }

  const displayPlan = selectedVersion || activePlan;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">План восстановления</h1>
          <p className="text-slate-400 text-sm mt-1">Управление планом корректирующих мероприятий проекта</p>
        </div>
        <div className="flex gap-3">
          {activePlan && !editMode && (
            <>
              <button onClick={() => setEditMode(true)} className="btn-secondary">
                ✏️ Редактировать
              </button>
              <button
                onClick={() => handleStatusChange('SUBMITTED')}
                disabled={activePlan.status === 'SUBMITTED' || activePlan.status === 'APPROVED'}
                className="btn-primary"
              >
                📤 Отправить на согласование
              </button>
              <button
                onClick={() => handleStatusChange('APPROVED')}
                disabled={activePlan.status === 'APPROVED'}
                className="btn-primary"
              >
                ✅ Утвердить
              </button>
            </>
          )}
          {!activePlan && (
            <button onClick={handleGenerate} className="btn-primary">
              ⚡ Сгенерировать план восстановления
            </button>
          )}
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-white mb-2">План восстановления не создан</h2>
          <p className="text-slate-400 text-sm mb-6">
            SPI проекта ({project?.spi?.toFixed(2)}) ниже порогового значения 0,85.
            Рекомендуется немедленная разработка плана восстановления.
          </p>
          <button onClick={handleGenerate} className="btn-primary mx-auto">
            ⚡ Сгенерировать план восстановления
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Version History */}
          <div className="xl:col-span-1 space-y-3">
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-3">Версии плана</h3>
              <div className="space-y-2">
                {plans.map((plan) => {
                  const sc = STATUS_LABELS[plan.status] || STATUS_LABELS.DRAFT;
                  return (
                    <button
                      key={plan.id}
                      onClick={() => selectVersion(plan)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        displayPlan?.id === plan.id
                          ? 'border-sky-600 bg-sky-900/30'
                          : 'border-slate-700 bg-slate-700/30 hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-sm font-medium">Версия {plan.version}</span>
                        <span className={`badge ${sc.badge}`}>{sc.label}</span>
                      </div>
                      <p className="text-slate-400 text-xs">
                        {new Date(plan.created_at).toLocaleDateString('ru-RU')}
                      </p>
                      {plan.approved_at && (
                        <p className="text-emerald-400 text-xs mt-0.5">
                          Утверждён: {new Date(plan.approved_at).toLocaleDateString('ru-RU')}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
              <button onClick={handleGenerate} className="btn-secondary w-full mt-3 text-xs">
                + Новая версия
              </button>
            </div>

            {/* Status Card */}
            {displayPlan && (
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-3">Статус согласования</h3>
                <div className="space-y-2">
                  {[
                    { label: 'ПМ (исполнитель)', done: true },
                    { label: 'ГИП (проверка)', done: displayPlan.status !== 'DRAFT' },
                    { label: 'АО НК КазахГаз', done: displayPlan.status === 'APPROVED' },
                  ].map((step) => (
                    <div key={step.label} className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step.done ? 'bg-emerald-700 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                        {step.done ? '✓' : '○'}
                      </span>
                      <span className={`text-xs ${step.done ? 'text-emerald-300' : 'text-slate-400'}`}>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Export Buttons */}
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-3">Экспорт</h3>
              <div className="space-y-2">
                <button disabled className="btn-secondary w-full opacity-50 text-xs cursor-not-allowed">
                  📄 Экспорт в DOCX (скоро)
                </button>
                <button disabled className="btn-secondary w-full opacity-50 text-xs cursor-not-allowed">
                  📋 Экспорт в PDF (скоро)
                </button>
              </div>
            </div>
          </div>

          {/* Plan Content */}
          <div className="xl:col-span-3">
            {displayPlan && (
              <form onSubmit={handleSubmit(onSave)}>
                <div className="card mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        План восстановления — Версия {displayPlan.version}
                      </h2>
                      <p className="text-slate-400 text-sm mt-0.5">
                        Создан: {new Date(displayPlan.created_at).toLocaleDateString('ru-RU')} ·{' '}
                        <span className={`badge ${STATUS_LABELS[displayPlan.status]?.badge}`}>
                          {STATUS_LABELS[displayPlan.status]?.label}
                        </span>
                      </p>
                    </div>
                    {editMode && (
                      <div className="flex gap-2">
                        {saveMsg && <span className="text-emerald-400 text-sm">{saveMsg}</span>}
                        <button type="button" onClick={() => setEditMode(false)} className="btn-secondary">
                          Отмена
                        </button>
                        <button type="submit" disabled={saving} className="btn-primary">
                          {saving ? 'Сохранение…' : 'Сохранить'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {SECTIONS.map((section, i) => (
                    <div key={section.key} className="card">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-6 h-6 bg-sky-700 rounded-full flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
                          {i + 1}
                        </span>
                        <h3 className="text-sm font-semibold text-white">{section.label}</h3>
                      </div>
                      {editMode ? (
                        <textarea
                          {...register(section.key)}
                          rows={5}
                          className="form-textarea"
                          placeholder={`Введите ${section.label.toLowerCase()}…`}
                        />
                      ) : (
                        <div className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                          {displayPlan.content_json?.[section.key] || (
                            <span className="text-slate-500 italic">Нет данных</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {editMode && (
                  <div className="mt-4 flex justify-end gap-3">
                    {saveMsg && <span className="text-emerald-400 text-sm self-center">{saveMsg}</span>}
                    <button type="button" onClick={() => setEditMode(false)} className="btn-secondary">
                      Отмена
                    </button>
                    <button type="submit" disabled={saving} className="btn-primary">
                      {saving ? 'Сохранение…' : 'Сохранить изменения'}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
