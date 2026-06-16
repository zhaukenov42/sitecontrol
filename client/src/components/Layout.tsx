import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import api from '../api';

interface LayoutProps {
  projectId: number;
}

const navItems = [
  { to: '/dashboard', label: 'Панель управления', icon: '🏗️' },
  { to: '/daily-report', label: 'Ежедневный отчёт', icon: '📋' },
  { to: '/schedule', label: 'Расписание / P6', icon: '📅' },
  { to: '/recovery-plan', label: 'План восстановления', icon: '🔄' },
  { to: '/risks', label: 'Реестр рисков', icon: '⚠️' },
  { to: '/reports', label: 'Отчёты', icon: '📊' },
];

export default function Layout({ projectId }: LayoutProps) {
  const [project, setProject] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    api.getProject(projectId).then((p: any) => setProject(p)).catch(() => {});
  }, [projectId]);

  const recoveryMode = project && project.spi < 0.85;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } flex-shrink-0 bg-slate-900 border-r border-slate-700 flex flex-col transition-all duration-200`}
      >
        {/* Logo / Project */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">SC</span>
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm leading-tight truncate">SiteControl</p>
                <p className="text-slate-400 text-xs truncate">ГПЗ — 3-я очередь</p>
              </div>
            )}
          </div>
        </div>

        {/* Recovery Mode Indicator */}
        {recoveryMode && sidebarOpen && (
          <div className="mx-3 mt-3 px-3 py-2 bg-red-900/50 border border-red-700 rounded-lg">
            <p className="text-red-400 text-xs font-semibold flex items-center gap-1">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse inline-block"></span>
              РЕЖИМ ВОССТАНОВЛЕНИЯ
            </p>
            <p className="text-red-300 text-xs mt-0.5">SPI: {project?.spi?.toFixed(2)}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-sky-700/40 text-sky-300 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`
              }
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Toggle */}
        <div className="p-3 border-t border-slate-700">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            {project && (
              <>
                <span className="text-slate-400 text-sm">{project.owner_company}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 text-sm">{project.contractor_company}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            {recoveryMode && (
              <div className="flex items-center gap-2 bg-red-900/40 border border-red-700 px-3 py-1 rounded-full">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-red-400 text-xs font-semibold">
                  РЕЖИМ ВОССТАНОВЛЕНИЯ — SPI: {project?.spi?.toFixed(2)}
                </span>
              </div>
            )}
            {project && (
              <div className="text-right">
                <p className="text-xs text-slate-400">Готовность</p>
                <p className="text-sm font-semibold text-white">{project.pct_complete?.toFixed(1)}%</p>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-slate-900 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
