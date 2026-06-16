const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  // Projects
  getProject: (id: number) => apiFetch(`/api/projects/${id}`),
  getDashboard: (id: number) => apiFetch(`/api/projects/${id}/dashboard`),

  // WBS Zones
  getZones: (projectId: number) => apiFetch(`/api/wbs-zones/${projectId}`),

  // Daily Reports
  getDailyReports: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/api/daily-reports?${qs}`);
  },
  createDailyReport: (data: any) =>
    apiFetch('/api/daily-reports', { method: 'POST', body: JSON.stringify(data) }),

  // Risks
  getRisks: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/api/risks?${qs}`);
  },
  createRisk: (data: any) =>
    apiFetch('/api/risks', { method: 'POST', body: JSON.stringify(data) }),
  updateRisk: (id: number, data: any) =>
    apiFetch(`/api/risks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRisk: (id: number) =>
    apiFetch(`/api/risks/${id}`, { method: 'DELETE' }),

  // Recovery Plans
  getRecoveryPlans: (projectId: number) =>
    apiFetch(`/api/recovery-plans?project_id=${projectId}`),
  createRecoveryPlan: (data: any) =>
    apiFetch('/api/recovery-plans', { method: 'POST', body: JSON.stringify(data) }),
  updateRecoveryPlan: (id: number, data: any) =>
    apiFetch(`/api/recovery-plans/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Schedule / P6
  getP6Imports: (projectId: number) => apiFetch(`/api/p6-imports/${projectId}`),
  importSchedule: (projectId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('project_id', String(projectId));
    return fetch(`${BASE_URL}/api/schedule/import`, { method: 'POST', body: form }).then((r) =>
      r.json()
    );
  },

  // Reports
  getWeeklySummary: (projectId: number) =>
    apiFetch(`/api/reports/weekly-summary/${projectId}`),
};

export default api;
