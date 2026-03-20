import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearAuthSession, getAuthValue } from '../services/authStorage';

const roleLinks = {
  RECEPTIONIST: [
    { to: '/app', label: 'Dashboard' },
    { to: '/app/patients', label: 'Patients' },
    { to: '/app/appointments', label: 'Appointments' },
    { to: '/app/reception-desk', label: 'Reception Desk' },
    { to: '/app/today-schedule', label: "Today's Schedule" },
    { to: '/app/quick-book', label: 'Quick Book' },
    { to: '/app/notifications', label: 'Notifications' },
    { to: '/app/patient-checkin', label: 'Patient Check-in' },
    { to: '/app/billing-invoicing', label: 'Billing / Invoicing' },
    { to: '/app/walkin-registration', label: 'Walk-in Registration' }
  ],
  DOCTOR: [
    { to: '/app', label: 'Dashboard' },
    { to: '/app/patients', label: 'Patients' },
    { to: '/app/appointments', label: 'Appointments' },
    { to: '/app/consultations', label: 'Consultations' },
    { to: '/app/my-schedule', label: 'My Schedule' },
    { to: '/app/write-prescription', label: 'Write Prescription' },
    { to: '/app/lab-requests', label: 'Lab Requests' },
    { to: '/app/referrals', label: 'Referrals' },
    { to: '/app/messages', label: 'Messages' }
  ],
  PATIENT: [
    { to: '/app', label: 'Dashboard' },
    { to: '/app/appointments', label: 'Appointments' },
    { to: '/app/consultations', label: 'Consultations' },
    { to: '/app/assistance', label: 'AI Assistant' },
    { to: '/app/my-health-records', label: 'My Health Records' },
    { to: '/app/prescriptions', label: 'Prescriptions' },
    { to: '/app/my-bills', label: 'My Bills' },
    { to: '/app/my-messages', label: 'Messages' },
    { to: '/app/my-profile', label: 'My Profile' }
  ],
  ADMIN: [
    { to: '/app', label: 'Dashboard' },
    { to: '/app/users', label: 'Users' },
    { to: '/app/patients', label: 'Patients' },
    { to: '/app/doctors', label: 'Doctors & Staff' },
    { to: '/app/appointments', label: 'Appointments' },
    { to: '/app/consultations', label: 'Consultations' },
    { to: '/app/audit-logs', label: 'Audit Logs' },
    { to: '/app/analytics-reports', label: 'Analytics & Reports' },
    { to: '/app/clinic-settings', label: 'Clinic Settings' },
    { to: '/app/billing-payments', label: 'Billing & Payments' },
    { to: '/app/announcements', label: 'Announcements' },
    { to: '/app/role-permissions', label: 'Role & Permissions' }
  ]
};

export default function Layout() {
  const navigate = useNavigate();
  const username = getAuthValue('username');
  const role = getAuthValue('role') || 'RECEPTIONIST';
  const roleClass = `app-shell--${role.toLowerCase()}`;
  const visibleLinks = roleLinks[role] || roleLinks.RECEPTIONIST;

  const logout = () => {
    clearAuthSession();
    navigate('/');
  };

  return (
    <div className={`app-shell ${roleClass}`}>
      <aside className="sidebar glass">
        <h1>MediTrack</h1>
        <p className="muted">Hospital Workflow Suite</p>
        <nav>
          {visibleLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/app'}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="profile-box">
          <p>{username}</p>
          <small>{role}</small>
          <button onClick={logout}>Logout</button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
