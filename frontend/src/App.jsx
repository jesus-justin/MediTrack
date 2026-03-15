import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import DoctorsPage from './pages/DoctorsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import ConsultationsPage from './pages/ConsultationsPage';
import UsersPage from './pages/UsersPage';
import ReceptionDeskPage from './pages/ReceptionDeskPage';
import TodaySchedulePage from './pages/TodaySchedulePage';
import QuickBookPage from './pages/QuickBookPage';
import NotificationsPage from './pages/NotificationsPage';
import AssistancePage from './pages/AssistancePage';
import { getAuthValue, hasAuthSession } from './services/authStorage';

function ProtectedRoute({ children }) {
  if (!hasAuthSession()) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  if (getAuthValue('role') !== 'ADMIN') return <Navigate to="/app" replace />;
  return children;
}

function ReceptionistRoute({ children }) {
  if (getAuthValue('role') !== 'RECEPTIONIST') return <Navigate to="/app" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="assistance" element={<AssistancePage />} />
        <Route path="users" element={<AdminRoute><UsersPage /></AdminRoute>} />
        <Route path="patients" element={<PatientsPage />} />
        <Route path="doctors" element={<DoctorsPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="reception-desk" element={<ReceptionistRoute><ReceptionDeskPage /></ReceptionistRoute>} />
        <Route path="today-schedule" element={<ReceptionistRoute><TodaySchedulePage /></ReceptionistRoute>} />
        <Route path="quick-book" element={<ReceptionistRoute><QuickBookPage /></ReceptionistRoute>} />
        <Route path="notifications" element={<ReceptionistRoute><NotificationsPage /></ReceptionistRoute>} />
        <Route path="consultations" element={<ConsultationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
