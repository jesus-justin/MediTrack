import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { adminAnalyticsApi, adminPanelApi, analyticsApi } from '../services/api';
import { getAuthValue } from '../services/authStorage';
import {
  PORTAL_KEYS,
  appendCollectionItem,
  nextPortalId,
  readCollection,
  upsertCollectionItem,
  writePortalValue
} from '../services/portalStore';

const DEFAULT_ROLE_PERMISSIONS = {
  ADMIN: {
    users: true,
    patients: true,
    doctors: true,
    appointments: true,
    consultations: true,
    billing: true
  },
  RECEPTIONIST: {
    patients: true,
    appointments: true,
    checkIn: true,
    billing: true,
    doctors: false,
    consultations: false
  },
  DOCTOR: {
    patients: true,
    appointments: true,
    consultations: true,
    billing: false,
    users: false
  },
  PATIENT: {
    appointments: true,
    consultations: true,
    billing: true,
    doctors: false,
    users: false
  }
};

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell || '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminControlCenterPage({ mode = 'audit' }) {
  const role = getAuthValue('role');
  const username = getAuthValue('username') || '';

  const [auditLogs, setAuditLogs] = useState([]);
  const [reports, setReports] = useState(null);
  const [systemStats, setSystemStats] = useState({});
  const [announcements, setAnnouncements] = useState(() => readCollection(PORTAL_KEYS.ANNOUNCEMENTS));
  const [invoices, setInvoices] = useState(() => readCollection(PORTAL_KEYS.INVOICES));
  const [clinicSettings, setClinicSettings] = useState(() => {
    const saved = readCollection(PORTAL_KEYS.CLINIC_SETTINGS)[0];
    return saved || {
      id: 1,
      weekHours: 'Mon-Fri 08:00-20:00',
      weekendHours: 'Sat 09:00-15:00',
      services: 'General Practice, Cardiology, Pediatrics',
      slotDurationMinutes: 30,
      notificationTemplate: 'Reminder: your appointment is tomorrow at {time}.'
    };
  });
  const [permissions, setPermissions] = useState(() => {
    const saved = readCollection(PORTAL_KEYS.ROLE_PERMISSIONS)[0];
    return saved || DEFAULT_ROLE_PERMISSIONS;
  });

  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', audience: 'ALL', expiresAt: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.allSettled([
      adminPanelApi.audit(200),
      adminPanelApi.reportsSummary(),
      adminAnalyticsApi.systemStats(),
      analyticsApi.dashboard()
    ]).then(([auditRes, reportRes, statsRes, trendsRes]) => {
      const remoteAudit = auditRes.status === 'fulfilled' ? auditRes.value.data : [];
      const remoteReports = reportRes.status === 'fulfilled' ? reportRes.value.data : null;
      const remoteStats = statsRes.status === 'fulfilled' ? statsRes.value.data : {};
      const remoteTrends = trendsRes.status === 'fulfilled' ? trendsRes.value.data : {};

      setAuditLogs(Array.isArray(remoteAudit) ? remoteAudit : []);
      setReports(remoteReports);
      setSystemStats({ ...remoteStats, ...remoteTrends });
    });
  }, []);

  if (role !== 'ADMIN') {
    return <Navigate to="/app" replace />;
  }

  const addAuditEntry = (action, detail) => {
    const local = readCollection(PORTAL_KEYS.ANNOUNCEMENTS);
    const logEntry = {
      id: nextPortalId('localAuditLogs'),
      actor: username,
      action,
      detail,
      createdAt: new Date().toISOString()
    };
    writePortalValue('localAuditLogs', [logEntry, ...readCollection('localAuditLogs')]);
    writePortalValue(PORTAL_KEYS.ANNOUNCEMENTS, local);
  };

  const publishAnnouncement = (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!announcementForm.title.trim() || !announcementForm.content.trim()) {
      setError('Announcement title and content are required.');
      return;
    }

    const payload = {
      id: nextPortalId(PORTAL_KEYS.ANNOUNCEMENTS),
      title: announcementForm.title,
      content: announcementForm.content,
      audience: announcementForm.audience,
      expiresAt: announcementForm.expiresAt,
      author: username,
      createdAt: new Date().toISOString()
    };

    const updated = appendCollectionItem(PORTAL_KEYS.ANNOUNCEMENTS, payload);
    setAnnouncements(updated);
    addAuditEntry('ANNOUNCEMENT_PUBLISHED', payload.title);
    setAnnouncementForm({ title: '', content: '', audience: 'ALL', expiresAt: '' });
    setMessage('Announcement published.');
  };

  const saveClinicSettings = (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    writePortalValue(PORTAL_KEYS.CLINIC_SETTINGS, [clinicSettings]);
    addAuditEntry('CLINIC_SETTINGS_UPDATED', `Slot ${clinicSettings.slotDurationMinutes} minutes`);
    setMessage('Clinic settings saved.');
  };

  const togglePermission = (targetRole, feature) => {
    const next = {
      ...permissions,
      [targetRole]: {
        ...permissions[targetRole],
        [feature]: !permissions[targetRole]?.[feature]
      }
    };
    setPermissions(next);
    writePortalValue(PORTAL_KEYS.ROLE_PERMISSIONS, [next]);
  };

  const updateInvoiceStatus = (id, paymentStatus) => {
    const invoice = invoices.find((entry) => entry.id === id);
    if (!invoice) return;
    const updated = upsertCollectionItem(PORTAL_KEYS.INVOICES, { ...invoice, paymentStatus });
    setInvoices(updated);
    setMessage(`Invoice #${id} set to ${paymentStatus}.`);
  };

  const billingSummary = useMemo(() => {
    const total = invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
    const paid = invoices.filter((invoice) => invoice.paymentStatus === 'PAID').reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
    const pending = Math.max(0, total - paid);
    return { total, paid, pending };
  }, [invoices]);

  if (mode === 'audit') {
    const localAudit = readCollection('localAuditLogs');
    const merged = [...localAudit, ...auditLogs].slice(0, 300);
    return (
      <div>
        <header className="page-header"><h2>Audit Logs</h2></header>
        <section className="card">
          <div className="table-actions">
            <button type="button" onClick={() => downloadCsv('audit-logs.csv', [['actor', 'action', 'detail', 'createdAt'], ...merged.map((row) => [row.actor || row.username || 'system', row.action || row.eventType || '-', row.detail || row.message || '-', row.createdAt || row.timestamp || '-'])])}>Export CSV</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Actor</th><th>Action</th><th>Detail</th><th>Date</th></tr></thead>
              <tbody>
                {merged.map((row, index) => (
                  <tr key={`${row.id || index}-${row.createdAt || row.timestamp || index}`}>
                    <td>{row.actor || row.username || 'system'}</td>
                    <td>{row.action || row.eventType || 'EVENT'}</td>
                    <td>{row.detail || row.message || '—'}</td>
                    <td>{formatDateTime(row.createdAt || row.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  if (mode === 'reports') {
    const appointmentTrends = systemStats.appointmentTrends || [];
    return (
      <div>
        <header className="page-header"><h2>Analytics & Reports</h2></header>
        <section className="card">
          <div className="status-monitor-grid">
            <div className="card status-monitor-card" style={{ marginBottom: 0, borderColor: '#2563eb' }}><h4>Total Appointments</h4><div className="monitor-count" style={{ color: '#2563eb' }}>{reports?.totals?.appointments || 0}</div></div>
            <div className="card status-monitor-card" style={{ marginBottom: 0, borderColor: '#16a34a' }}><h4>Total Revenue</h4><div className="monitor-count" style={{ color: '#16a34a' }}>${Number(reports?.totals?.revenue || billingSummary.total || 0).toFixed(0)}</div></div>
            <div className="card status-monitor-card" style={{ marginBottom: 0, borderColor: '#f59e0b' }}><h4>No-show Rate</h4><div className="monitor-count" style={{ color: '#f59e0b' }}>{Number(reports?.totals?.noShowRate || 0).toFixed(1)}%</div></div>
            <div className="card status-monitor-card" style={{ marginBottom: 0, borderColor: '#7c3aed' }}><h4>Active Patients</h4><div className="monitor-count" style={{ color: '#7c3aed' }}>{reports?.totals?.activePatients || 0}</div></div>
          </div>
        </section>
        <section className="card">
          <h3>Appointments Per Day</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Appointments</th></tr></thead>
              <tbody>{appointmentTrends.map((row, index) => <tr key={index}><td>{row[0]}</td><td>{row[1]}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="table-actions" style={{ marginTop: '10px' }}>
            <button type="button" onClick={() => downloadCsv('analytics-report.csv', [['date', 'appointments'], ...appointmentTrends.map((row) => [row[0], row[1]])])}>Export CSV</button>
          </div>
        </section>
      </div>
    );
  }

  if (mode === 'settings') {
    return (
      <div>
        <header className="page-header"><h2>Clinic Settings</h2></header>
        <section className="card">
          <form className="form-grid" onSubmit={saveClinicSettings}>
            <input placeholder="Weekday hours" value={clinicSettings.weekHours} onChange={(event) => setClinicSettings({ ...clinicSettings, weekHours: event.target.value })} required />
            <input placeholder="Weekend hours" value={clinicSettings.weekendHours} onChange={(event) => setClinicSettings({ ...clinicSettings, weekendHours: event.target.value })} required />
            <input placeholder="Services offered" value={clinicSettings.services} onChange={(event) => setClinicSettings({ ...clinicSettings, services: event.target.value })} required />
            <input type="number" min="10" step="5" placeholder="Slot duration (minutes)" value={clinicSettings.slotDurationMinutes} onChange={(event) => setClinicSettings({ ...clinicSettings, slotDurationMinutes: Number(event.target.value) })} required />
            <textarea placeholder="Notification template" value={clinicSettings.notificationTemplate} onChange={(event) => setClinicSettings({ ...clinicSettings, notificationTemplate: event.target.value })} required />
            <button type="submit">Save Settings</button>
          </form>
          {message ? <p className="success">{message}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </section>
      </div>
    );
  }

  if (mode === 'billing') {
    return (
      <div>
        <header className="page-header"><h2>Billing & Payments</h2></header>
        <section className="card">
          <div className="status-monitor-grid">
            <div className="card status-monitor-card" style={{ marginBottom: 0, borderColor: '#0f766e' }}><h4>Total</h4><div className="monitor-count" style={{ color: '#0f766e' }}>${billingSummary.total.toFixed(2)}</div></div>
            <div className="card status-monitor-card" style={{ marginBottom: 0, borderColor: '#16a34a' }}><h4>Paid</h4><div className="monitor-count" style={{ color: '#16a34a' }}>${billingSummary.paid.toFixed(2)}</div></div>
            <div className="card status-monitor-card" style={{ marginBottom: 0, borderColor: '#dc2626' }}><h4>Pending</h4><div className="monitor-count" style={{ color: '#dc2626' }}>${billingSummary.pending.toFixed(2)}</div></div>
            <div className="card status-monitor-card" style={{ marginBottom: 0, borderColor: '#2563eb' }}><h4>Invoices</h4><div className="monitor-count" style={{ color: '#2563eb' }}>{invoices.length}</div></div>
          </div>
        </section>
        <section className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Patient</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.id}</td>
                    <td>{invoice.patientName}</td>
                    <td>${Number(invoice.amount).toFixed(2)}</td>
                    <td>{invoice.paymentStatus}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" onClick={() => updateInvoiceStatus(invoice.id, 'PAID')}>Mark Paid</button>
                        <button type="button" onClick={() => updateInvoiceStatus(invoice.id, 'DISPUTED')}>Flag Dispute</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  if (mode === 'announcements') {
    return (
      <div>
        <header className="page-header"><h2>Announcements</h2></header>
        <section className="card">
          <form className="form-grid" onSubmit={publishAnnouncement}>
            <input placeholder="Title" value={announcementForm.title} onChange={(event) => setAnnouncementForm({ ...announcementForm, title: event.target.value })} required />
            <select value={announcementForm.audience} onChange={(event) => setAnnouncementForm({ ...announcementForm, audience: event.target.value })}>
              <option value="ALL">All Users</option>
              <option value="STAFF">Staff Only</option>
              <option value="PATIENTS">Patients Only</option>
            </select>
            <input type="date" value={announcementForm.expiresAt} onChange={(event) => setAnnouncementForm({ ...announcementForm, expiresAt: event.target.value })} />
            <textarea placeholder="Announcement content" value={announcementForm.content} onChange={(event) => setAnnouncementForm({ ...announcementForm, content: event.target.value })} required />
            <button type="submit">Publish</button>
          </form>
          {message ? <p className="success">{message}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </section>
        <section className="card">
          <h3>Published Announcements</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Title</th><th>Audience</th><th>Expires</th><th>Published</th></tr></thead>
              <tbody>{announcements.map((entry) => <tr key={entry.id}><td>{entry.title}</td><td>{entry.audience}</td><td>{entry.expiresAt || 'No expiry'}</td><td>{formatDateTime(entry.createdAt)}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  const roleNames = Object.keys(permissions);
  return (
    <div>
      <header className="page-header"><h2>Role & Permissions</h2></header>
      {roleNames.map((roleName) => (
        <section key={roleName} className="card">
          <h3>{roleName}</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Feature</th><th>Enabled</th><th>Toggle</th></tr></thead>
              <tbody>
                {Object.keys(permissions[roleName] || {}).map((feature) => (
                  <tr key={`${roleName}-${feature}`}>
                    <td>{feature}</td>
                    <td>{permissions[roleName][feature] ? 'Yes' : 'No'}</td>
                    <td><button type="button" onClick={() => togglePermission(roleName, feature)}>Toggle</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <section className="card">
        <button
          type="button"
          onClick={() => {
            writePortalValue(PORTAL_KEYS.ROLE_PERMISSIONS, [permissions]);
            setMessage('Permissions updated.');
          }}
        >
          Save Permission Matrix
        </button>
        {message ? <p className="success">{message}</p> : null}
      </section>
    </div>
  );
}
