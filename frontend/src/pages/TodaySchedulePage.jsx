import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { appointmentApi } from '../services/api';
import { getAuthValue } from '../services/authStorage';

const STATUS_COLORS = {
  PENDING: '#d97706',
  CONFIRMED: '#2563eb',
  COMPLETED: '#16a34a',
  CANCELLED: '#dc2626',
  NO_SHOW: '#6b7280'
};

function formatTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function TodaySchedulePage() {
  const role = getAuthValue('role') || 'RECEPTIONIST';
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    []
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await appointmentApi.list();
      setAppointments(data);
    } catch {
      setError('Could not load appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const todayAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.startTime?.slice(0, 10) === todayStr)
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
    [appointments, todayStr]
  );

  const pendingCount = useMemo(() => todayAppointments.filter((a) => a.status === 'PENDING').length, [todayAppointments]);
  const confirmedCount = useMemo(() => todayAppointments.filter((a) => a.status === 'CONFIRMED').length, [todayAppointments]);
  const completedCount = useMemo(() => todayAppointments.filter((a) => a.status === 'COMPLETED').length, [todayAppointments]);

  const updateStatus = async (id, status) => {
    setError('');
    setMessage('');
    try {
      await appointmentApi.updateStatus(id, status);
      setMessage(`Appointment #${id} marked as ${status}.`);
      await load();
    } catch {
      setError('Failed to update status.');
    }
  };

  if (role !== 'RECEPTIONIST') return <Navigate to="/app" replace />;

  return (
    <div>
      <header className="page-header">
        <div>
          <h2>Today's Schedule</h2>
          <p className="muted">{todayLabel}</p>
        </div>
        <button type="button" onClick={load}>↻ Refresh</button>
      </header>

      {!loading && todayAppointments.length > 0 && (
        <div className="status-monitor-grid" style={{ marginBottom: '16px' }}>
          <div className="card status-monitor-card appt-pending" style={{ marginBottom: 0 }}>
            <h4>Pending</h4>
            <div className="monitor-count">{pendingCount}</div>
          </div>
          <div className="card status-monitor-card appt-confirmed" style={{ marginBottom: 0 }}>
            <h4>Confirmed</h4>
            <div className="monitor-count">{confirmedCount}</div>
          </div>
          <div className="card status-monitor-card appt-completed" style={{ marginBottom: 0 }}>
            <h4>Completed</h4>
            <div className="monitor-count">{completedCount}</div>
          </div>
          <div className="card status-monitor-card" style={{ marginBottom: 0, borderColor: '#9ca3af' }}>
            <h4>Total Today</h4>
            <div className="monitor-count" style={{ color: '#374151' }}>{todayAppointments.length}</div>
          </div>
        </div>
      )}

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : todayAppointments.length === 0 ? (
        <section className="card">
          <p className="muted">No appointments scheduled for today.</p>
        </section>
      ) : (
        <div className="today-schedule-list">
          {todayAppointments.map((a) => (
            <div key={a.id} className="today-schedule-row card">
              <div className="today-time">
                <strong>{formatTime(a.startTime)}</strong>
                <small className="muted">→ {formatTime(a.endTime)}</small>
              </div>
              <div className="today-info">
                <strong>{a.patient.firstName} {a.patient.lastName}</strong>
                <small className="muted">{a.patient.patientCode}</small>
              </div>
              <div className="today-doctor">
                <span>{a.doctor.fullName}</span>
                {a.reason && <small className="muted">{a.reason}</small>}
              </div>
              <div>
                <span
                  className="today-status-badge"
                  style={{ background: STATUS_COLORS[a.status] || '#9ca3af' }}
                >
                  {a.status}
                </span>
              </div>
              <div className="today-actions">
                {a.status === 'PENDING' && (
                  <button type="button" className="btn-teal" onClick={() => updateStatus(a.id, 'CONFIRMED')}>
                    Confirm
                  </button>
                )}
                {a.status === 'CONFIRMED' && (
                  <button type="button" className="btn-teal" onClick={() => updateStatus(a.id, 'COMPLETED')}>
                    Complete
                  </button>
                )}
                {(a.status === 'PENDING' || a.status === 'CONFIRMED') && (
                  <button type="button" className="btn-danger" onClick={() => updateStatus(a.id, 'CANCELLED')}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
