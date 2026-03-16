import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { getAuthValue, hasAuthSession } from './services/authStorage';

const Layout = lazy(() => import('./components/Layout'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PatientsPage = lazy(() => import('./pages/PatientsPage'));
const DoctorsPage = lazy(() => import('./pages/DoctorsPage'));
const AppointmentsPage = lazy(() => import('./pages/AppointmentsPage'));
const ConsultationsPage = lazy(() => import('./pages/ConsultationsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const ReceptionDeskPage = lazy(() => import('./pages/ReceptionDeskPage'));
const TodaySchedulePage = lazy(() => import('./pages/TodaySchedulePage'));
const QuickBookPage = lazy(() => import('./pages/QuickBookPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AssistancePage = lazy(() => import('./pages/AssistancePage'));

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
    <Suspense fallback={<div className="page-loader">Loading MediTrack...</div>}>
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
    </Suspense>
  );
}
