import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearAuthSession, getAuthValue } from '../services/authStorage';

const links = [
  { to: '/app', label: 'Dashboard' },
  { to: '/app/users', label: 'Users' },
  { to: '/app/patients', label: 'Patients' },
  { to: '/app/doctors', label: 'Doctors & Staff' },
  { to: '/app/appointments', label: 'Appointments' },
  { to: '/app/reception-desk', label: 'Reception Desk' },
  { to: '/app/today-schedule', label: "Today's Schedule" },
  { to: '/app/quick-book', label: 'Quick Book' },
  { to: '/app/notifications', label: 'Notifications' },
  { to: '/app/consultations', label: 'Consultations' }
];

const roleAccess = {
  ADMIN: ['/app', '/app/users', '/app/patients', '/app/doctors', '/app/appointments', '/app/consultations'],
  RECEPTIONIST: ['/app', '/app/patients', '/app/doctors', '/app/appointments', '/app/reception-desk', '/app/today-schedule', '/app/quick-book', '/app/notifications', '/app/consultations'],
  DOCTOR: ['/app', '/app/patients', '/app/doctors', '/app/appointments', '/app/consultations'],
  PATIENT: ['/app', '/app/appointments', '/app/consultations']
};

export default function Layout() {
  const navigate = useNavigate();
  const username = getAuthValue('username');
  const role = getAuthValue('role') || 'RECEPTIONIST';
  const allowed = roleAccess[role] || roleAccess.RECEPTIONIST;
  const visibleLinks = links.filter((link) => allowed.includes(link.to));

  const logout = () => {
    clearAuthSession();
    navigate('/');
  };

  return (
    <div className="app-shell">
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
