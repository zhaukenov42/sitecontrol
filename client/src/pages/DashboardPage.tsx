import { useEffect, useState } from 'react';
import api from '../api';
import MetricCard from '../components/MetricCard';
import RecoveryBanner from '../components/RecoveryBanner';
import ZoneStatusGrid from '../components/ZoneStatusGrid';
import SpiTrendChart from '../components/SpiTrendChart';
import MilestoneTimeline from '../components/MilestoneTimeline';

interface DashboardPageProps {
  projectId: number;
}

export default function DashboardPage({ projectId }: DashboardPageProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .getDashboard(projectId)
      .then((d: any) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-sm animate-pulse">Загрузка данных...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border-red-700 bg-red-950/30">
        <p className="text-red-400">Ошибка: {error}</p>
        <p className="text-slate-400 text-sm mt-1">Убедитесь, что сервер запущен на порту 3001.</p>
      </div>
    );
  }

  const { project, metrics, zones, milestones, spi_trend, recent_reports } = data;

  const openRisks = data.metrics?.open_risks || 0;
  const criticalRisks = data.metrics?.critical_risks || 0;

  // Last p6 import variance
  const lastSpi = spi_trend?.[spi_trend.length - 1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{project.name}</h1>
        <p className="text-slate-400 text-sm mt-1">
          {project.owner_company} · {project.contractor_company}
        </p>
      </div>

      {/* Recovery Banner */}
      {metrics.spi < 0.85 && (
        <RecoveryBanner spi={metrics.spi} varianceDays={lastSpi?.variance_days} />
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Общая готовность"
          value={`${metrics.pct_complete?.toFixed(1)}%`}
          sub={`Базовый план: ${new Date(project.baseline_finish).toLocaleDateString('ru-RU')}`}
          color="blue"
          icon="📊"
        />
        <MetricCard
          label="SPI (выполнение расписания)"
          value={metrics.spi?.toFixed(3)}
          sub={metrics.spi < 0.85 ? 'КРИТИЧНО — ниже порога 0,85' : metrics.spi < 0.95 ? 'ВНИМАНИЕ' : 'В НОРМЕ'}
          color={metrics.spi < 0.85 ? 'red' : metrics.spi < 0.95 ? 'amber' : 'green'}
          icon="📉"
        />
        <MetricCard
          label="Численность на площадке"
          value={metrics.headcount_onsite}
          sub="чел. (сегодня)"
          color="default"
          icon="👷"
        />
        <MetricCard
          label="Открытые блокеры"
          value={`${metrics.open_blockers || 0} / ${openRisks}`}
          sub={`из них критических: ${criticalRisks}`}
          color={metrics.open_blockers > 0 ? 'red' : 'green'}
          icon="🚨"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Zone Status Grid */}
        <div className="card">
          <h2 className="text-base font-semibold text-white mb-4">Статус зон ВРС</h2>
          <ZoneStatusGrid zones={zones} />
        </div>

        {/* SPI Trend Chart */}
        <div className="card">
          <h2 className="text-base font-semibold text-white mb-1">Динамика SPI (последние 8 обновлений)</h2>
          <p className="text-slate-500 text-xs mb-4">
            Жёлтая пунктирная линия — порог риска (0.85). Зелёная — план (1.0).
          </p>
          <SpiTrendChart data={spi_trend} />
        </div>
      </div>

      {/* Milestones */}
      <div className="card">
        <h2 className="text-base font-semibold text-white mb-4">Контрольные события</h2>
        <MilestoneTimeline milestones={milestones} />
      </div>

      {/* Open Risks Summary */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Открытые риски</h2>
          <a href="/risks" className="text-sky-400 text-sm hover:text-sky-300">Реестр рисков →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="table-header">ID</th>
                <th className="table-header">Описание</th>
                <th className="table-header">Вероятность</th>
                <th className="table-header">Воздействие</th>
                <th className="table-header">Ответственный</th>
                <th className="table-header">Статус</th>
              </tr>
            </thead>
            <tbody>
              {/* Show open risks from recent data */}
              {openRisks === 0 && (
                <tr>
                  <td colSpan={6} className="table-cell text-center text-slate-500">Нет открытых рисков</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="mt-2">
            <OpenRisksSummary projectId={projectId} />
          </div>
        </div>
      </div>

      {/* Recent Daily Reports */}
      <div className="card">
        <h2 className="text-base font-semibold text-white mb-4">Последние ежедневные отчёты</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="table-header">Дата</th>
                <th className="table-header">Зона</th>
                <th className="table-header">Прирост, %</th>
                <th className="table-header">Численность</th>
                <th className="table-header">Вопросы</th>
                <th className="table-header">Статус</th>
              </tr>
            </thead>
            <tbody>
              {recent_reports?.slice(0, 10).map((r: any) => (
                <tr key={r.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="table-cell">{new Date(r.date).toLocaleDateString('ru-RU')}</td>
                  <td className="table-cell">
                    <span className="text-slate-400 text-xs font-mono mr-1">{r.zone_code}</span>
                    {r.zone_name}
                  </td>
                  <td className="table-cell">+{parseFloat(r.pct_today).toFixed(2)}%</td>
                  <td className="table-cell">{r.headcount} чел.</td>
                  <td className="table-cell">
                    {r.new_issues ? (
                      <span className="text-red-400 text-xs">{r.new_issues.slice(0, 40)}…</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${r.approved ? 'badge-green' : 'badge-gray'}`}>
                      {r.approved ? 'Утверждён' : 'На проверке'}
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

// Inline sub-component to load risks
function OpenRisksSummary({ projectId }: { projectId: number }) {
  const [risks, setRisks] = useState<any[]>([]);

  useEffect(() => {
    api.getRisks({ project_id: projectId }).then((r: any) => {
      setRisks(r.filter((x: any) => x.status !== 'MITIGATED' && x.status !== 'CLOSED').slice(0, 5));
    }).catch(() => {});
  }, [projectId]);

  const probLabel: Record<string, string> = { LOW: 'Низкая', MEDIUM: 'Средняя', HIGH: 'Высокая' };
  const impactLabel: Record<string, string> = { LOW: 'Низкое', MEDIUM: 'Среднее', HIGH: 'Высокое' };
  const statusLabel: Record<string, string> = {
    OPEN: 'Открыт', IN_PROGRESS: 'В работе', MITIGATED: 'Снижен', CLOSED: 'Закрыт',
  };

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-slate-700">
          <th className="table-header">ID</th>
          <th className="table-header">Описание</th>
          <th className="table-header">Вероятность</th>
          <th className="table-header">Воздействие</th>
          <th className="table-header">Ответственный</th>
          <th className="table-header">Статус</th>
        </tr>
      </thead>
      <tbody>
        {risks.map((r) => (
          <tr
            key={r.id}
            className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${r.is_critical ? 'bg-red-950/20' : ''}`}
          >
            <td className="table-cell">
              <span className="font-mono text-xs">R-{String(r.id).padStart(3, '0')}</span>
              {r.is_critical && <span className="ml-1 text-red-400 text-xs">⚡</span>}
            </td>
            <td className="table-cell max-w-xs">
              <span className="line-clamp-2">{r.description.slice(0, 70)}…</span>
            </td>
            <td className="table-cell">
              <span className={`badge ${r.probability === 'HIGH' ? 'badge-red' : r.probability === 'MEDIUM' ? 'badge-amber' : 'badge-green'}`}>
                {probLabel[r.probability]}
              </span>
            </td>
            <td className="table-cell">
              <span className={`badge ${r.impact === 'HIGH' ? 'badge-red' : r.impact === 'MEDIUM' ? 'badge-amber' : 'badge-green'}`}>
                {impactLabel[r.impact]}
              </span>
            </td>
            <td className="table-cell text-xs">{r.owner}</td>
            <td className="table-cell">
              <span className={`badge ${r.status === 'OPEN' ? 'badge-red' : r.status === 'IN_PROGRESS' ? 'badge-amber' : 'badge-green'}`}>
                {statusLabel[r.status]}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
