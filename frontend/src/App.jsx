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
const ReceptionOperationsPage = lazy(() => import('./pages/ReceptionOperationsPage'));
const DoctorWorkspacePage = lazy(() => import('./pages/DoctorWorkspacePage'));
const PatientWorkspacePage = lazy(() => import('./pages/PatientWorkspacePage'));
const AdminControlCenterPage = lazy(() => import('./pages/AdminControlCenterPage'));

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

function RoleRoute({ roles, children }) {
  const role = getAuthValue('role');
  if (!roles.includes(role)) return <Navigate to="/app" replace />;
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
          <Route path="assistance" element={<RoleRoute roles={['PATIENT']}><AssistancePage /></RoleRoute>} />
          <Route path="users" element={<AdminRoute><UsersPage /></AdminRoute>} />
          <Route path="patients" element={<RoleRoute roles={['ADMIN', 'RECEPTIONIST', 'DOCTOR']}><PatientsPage /></RoleRoute>} />
          <Route path="doctors" element={<AdminRoute><DoctorsPage /></AdminRoute>} />
          <Route path="appointments" element={<RoleRoute roles={['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PATIENT']}><AppointmentsPage /></RoleRoute>} />
          <Route path="reception-desk" element={<ReceptionistRoute><ReceptionDeskPage /></ReceptionistRoute>} />
          <Route path="today-schedule" element={<ReceptionistRoute><TodaySchedulePage /></ReceptionistRoute>} />
          <Route path="quick-book" element={<ReceptionistRoute><QuickBookPage /></ReceptionistRoute>} />
          <Route path="notifications" element={<ReceptionistRoute><NotificationsPage /></ReceptionistRoute>} />
          <Route path="consultations" element={<RoleRoute roles={['ADMIN', 'DOCTOR', 'PATIENT']}><ConsultationsPage /></RoleRoute>} />

          <Route path="patient-checkin" element={<ReceptionistRoute><ReceptionOperationsPage mode="checkin" /></ReceptionistRoute>} />
          <Route path="billing-invoicing" element={<ReceptionistRoute><ReceptionOperationsPage mode="billing" /></ReceptionistRoute>} />
          <Route path="walkin-registration" element={<ReceptionistRoute><ReceptionOperationsPage mode="walkin" /></ReceptionistRoute>} />

          <Route path="my-schedule" element={<RoleRoute roles={['DOCTOR']}><DoctorWorkspacePage mode="schedule" /></RoleRoute>} />
          <Route path="write-prescription" element={<RoleRoute roles={['DOCTOR']}><DoctorWorkspacePage mode="prescriptions" /></RoleRoute>} />
          <Route path="lab-requests" element={<RoleRoute roles={['DOCTOR']}><DoctorWorkspacePage mode="labs" /></RoleRoute>} />
          <Route path="referrals" element={<RoleRoute roles={['DOCTOR']}><DoctorWorkspacePage mode="referrals" /></RoleRoute>} />
          <Route path="messages" element={<RoleRoute roles={['DOCTOR']}><DoctorWorkspacePage mode="messages" /></RoleRoute>} />

          <Route path="my-health-records" element={<RoleRoute roles={['PATIENT']}><PatientWorkspacePage mode="records" /></RoleRoute>} />
          <Route path="prescriptions" element={<RoleRoute roles={['PATIENT']}><PatientWorkspacePage mode="prescriptions" /></RoleRoute>} />
          <Route path="my-bills" element={<RoleRoute roles={['PATIENT']}><PatientWorkspacePage mode="bills" /></RoleRoute>} />
          <Route path="my-messages" element={<RoleRoute roles={['PATIENT']}><PatientWorkspacePage mode="messages" /></RoleRoute>} />
          <Route path="my-profile" element={<RoleRoute roles={['PATIENT']}><PatientWorkspacePage mode="profile" /></RoleRoute>} />

          <Route path="audit-logs" element={<AdminRoute><AdminControlCenterPage mode="audit" /></AdminRoute>} />
          <Route path="analytics-reports" element={<AdminRoute><AdminControlCenterPage mode="reports" /></AdminRoute>} />
          <Route path="clinic-settings" element={<AdminRoute><AdminControlCenterPage mode="settings" /></AdminRoute>} />
          <Route path="billing-payments" element={<AdminRoute><AdminControlCenterPage mode="billing" /></AdminRoute>} />
          <Route path="announcements" element={<AdminRoute><AdminControlCenterPage mode="announcements" /></AdminRoute>} />
          <Route path="role-permissions" element={<AdminRoute><AdminControlCenterPage mode="permissions" /></AdminRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
