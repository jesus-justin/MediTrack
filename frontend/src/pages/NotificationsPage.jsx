import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { notificationApi } from '../services/api';
import { getAuthValue } from '../services/authStorage';

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

const TYPE_LABELS = {
  APPOINTMENT_REMINDER: 'Reminder',
  UPCOMING_SCHEDULE: 'Upcoming',
  NOTICE: 'Notice'
};

export default function NotificationsPage() {
  const role = getAuthValue('role') || 'RECEPTIONIST';
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await notificationApi.patientReminders();
      setReminders(Array.isArray(data) ? data : []);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch {
      setError('Could not load notifications. The service may be temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (role !== 'RECEPTIONIST') return <Navigate to="/app" replace />;

  return (
    <div>
      <header className="page-header">
        <div>
          <h2>Notifications</h2>
          <p>Patient appointment reminders and alerts for today.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <button type="button" onClick={load}>↻ Refresh</button>
          {lastRefreshed && <small className="muted">Last updated: {lastRefreshed}</small>}
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : reminders.length === 0 ? (
        <section className="card">
          <p className="muted">No notifications at this time.</p>
        </section>
      ) : (
        <section className="card">
          <div className="section-header-row">
            <h3>Patient Reminders</h3>
            <span className="today-status-badge" style={{ background: '#2563eb' }}>
              {reminders.length} alert{reminders.length !== 1 ? 's' : ''}
            </span>
          </div>
          <ul className="notif-list">
            {reminders.map((n, i) => (
              <li key={i} className="notif-item">
                <div className="notif-item-header">
                  <span className="notif-type-badge">
                    {TYPE_LABELS[n.type] || n.type || 'Notice'}
                  </span>
                  {n.createdAt && <small className="muted">{formatDate(n.createdAt)}</small>}
                </div>
                {n.message && <p className="notif-message">{n.message}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
