import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import DailyReportPage from './pages/DailyReportPage';
import SchedulePage from './pages/SchedulePage';
import RecoveryPlanPage from './pages/RecoveryPlanPage';
import RiskRegisterPage from './pages/RiskRegisterPage';
import ReportsPage from './pages/ReportsPage';

const PROJECT_ID = 1;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout projectId={PROJECT_ID} />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage projectId={PROJECT_ID} />} />
          <Route path="daily-report" element={<DailyReportPage projectId={PROJECT_ID} />} />
          <Route path="schedule" element={<SchedulePage projectId={PROJECT_ID} />} />
          <Route path="recovery-plan" element={<RecoveryPlanPage projectId={PROJECT_ID} />} />
          <Route path="risks" element={<RiskRegisterPage projectId={PROJECT_ID} />} />
          <Route path="reports" element={<ReportsPage projectId={PROJECT_ID} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
