import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const links = [
  { to: '/app', label: 'Dashboard' },
  { to: '/app/patients', label: 'Patients' },
  { to: '/app/doctors', label: 'Doctors & Staff' },
  { to: '/app/appointments', label: 'Appointments' },
  { to: '/app/consultations', label: 'Consultations' }
];

export default function Layout() {
  const navigate = useNavigate();
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  const logout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar glass">
        <h1>MediTrack</h1>
        <p className="muted">Hospital Workflow Suite</p>
        <nav>
          {links.map((link) => (
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
