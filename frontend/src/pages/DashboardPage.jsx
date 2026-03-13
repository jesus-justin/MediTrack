import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  adminAnalyticsApi,
  adminPanelApi,
  analyticsApi,
  appointmentApi,
  consultationApi,
  doctorApi,
  healthApi,
  notificationApi,
  patientApi,
  userApi
} from '../services/api';
import { BarChartCard, DoughnutChartCard, LineChartCard } from '../components/ChartCard';
import { getAuthValue } from '../services/authStorage';

const DOCTOR_PROFILE_KEY = 'doctorDashboardProfile';
const DOCTOR_SCRATCHPAD_KEY = 'doctorDashboardScratchpad';

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/dr\.?/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function toDateOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toMinutes(start, end) {
  const startDate = toDateOrNull(start);
  const endDate = toDateOrNull(end);
  if (!startDate || !endDate) return 0;
  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
}

function formatMinutes(totalMinutes) {
  const safeMinutes = Math.max(0, Number(totalMinutes) || 0);
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function isSameLocalDate(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export default function DashboardPage() {
  const role = getAuthValue('role') || 'RECEPTIONIST';
  const username = getAuthValue('username') || '';
  const [dashboard, setDashboard] = useState({});
  const [summary, setSummary] = useState({
    patients: 0,
    doctors: 0,
    appointments: 0,
    consultations: 0,
    users: 0,
    enabledUsers: 0,
    disabledUsers: 0,
    confirmedAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0,
    canceledAppointments: 0
  });
  const [health, setHealth] = useState({ status: 'UNKNOWN', service: 'MediTrack API' });
  const [notifications, setNotifications] = useState({ doctorUpcoming: [], patientReminders: [] });
  const [users, setUsers] = useState([]);
  const [systemStats, setSystemStats] = useState({
    appointmentsByStatus: {},
    patientsWithNoAppointments: 0,
    doctorsWithNoAppointments: 0,
    completedWithNoConsultation: 0,
    usersCreatedLastWeek: 0,
    adminCount: 0,
    disabledCount: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchData, setSearchData] = useState({ total: 0, groups: {} });
  const [auditLogs, setAuditLogs] = useState([]);
  const [reports, setReports] = useState(null);
  const [workflowResult, setWorkflowResult] = useState(null);
  const [runningWorkflow, setRunningWorkflow] = useState(false);
  const [allDoctors, setAllDoctors] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [allConsultations, setAllConsultations] = useState([]);
  const [selectedDoctorName, setSelectedDoctorName] = useState(
    () => localStorage.getItem(DOCTOR_PROFILE_KEY) || ''
  );
  const [doctorScratchpad, setDoctorScratchpad] = useState(
    () => localStorage.getItem(DOCTOR_SCRATCHPAD_KEY) || ''
  );

  const load = async () => {
    setRefreshing(true);
    try {
      const [
        patientsRes, doctorsRes, appointmentsRes, consultationsRes,
        analyticsRes, usersRes, healthRes, doctorNotifRes,
        patientNotifRes, sysStatsRes, auditRes, reportsRes
      ] = await Promise.allSettled([
        patientApi.list(''),
        doctorApi.list(''),
        appointmentApi.list(),
        consultationApi.list(),
        analyticsApi.dashboard(),
        role === 'ADMIN' ? userApi.list() : Promise.resolve({ data: [] }),
        healthApi.status(),
        notificationApi.doctorUpcoming(),
        notificationApi.patientReminders(),
        role === 'ADMIN' ? adminAnalyticsApi.systemStats() : Promise.resolve({ data: {} }),
        role === 'ADMIN' ? adminPanelApi.audit(20) : Promise.resolve({ data: [] }),
        role === 'ADMIN' ? adminPanelApi.reportsSummary() : Promise.resolve({ data: null })
      ]);

      const patients = patientsRes.status === 'fulfilled' ? patientsRes.value.data : [];
      const doctors = doctorsRes.status === 'fulfilled' ? doctorsRes.value.data : [];
      const appointments = appointmentsRes.status === 'fulfilled' ? appointmentsRes.value.data : [];
      const consultations = consultationsRes.status === 'fulfilled' ? consultationsRes.value.data : [];
      const analytics = analyticsRes.status === 'fulfilled' ? analyticsRes.value.data : {};
      const adminUsers = usersRes.status === 'fulfilled' ? usersRes.value.data : [];
      const apiHealth = healthRes.status === 'fulfilled' ? healthRes.value.data : { status: 'DOWN', service: 'MediTrack API' };
      const doctorUpcoming = doctorNotifRes.status === 'fulfilled' ? doctorNotifRes.value.data : [];
      const patientReminders = patientNotifRes.status === 'fulfilled' ? patientNotifRes.value.data : [];
      const stats = sysStatsRes.status === 'fulfilled' ? sysStatsRes.value.data : {};
      const audit = auditRes.status === 'fulfilled' ? auditRes.value.data : [];
      const reportSummary = reportsRes.status === 'fulfilled' ? reportsRes.value.data : null;

      setDashboard(analytics);
      setUsers(adminUsers);
      setHealth(apiHealth);
      setNotifications({ doctorUpcoming, patientReminders });
      setSystemStats(stats);
      setAuditLogs(audit);
      setReports(reportSummary);
      setAllDoctors(doctors);
      setAllAppointments(appointments);
      setAllConsultations(consultations);
      setSummary({
        patients: patients.length,
        doctors: doctors.length,
        appointments: appointments.length,
        consultations: consultations.length,
        users: adminUsers.length,
        enabledUsers: adminUsers.filter((u) => u.enabled).length,
        disabledUsers: adminUsers.filter((u) => !u.enabled).length,
        confirmedAppointments: appointments.filter((a) => a.status === 'CONFIRMED').length,
        pendingAppointments: appointments.filter((a) => a.status === 'PENDING').length,
        completedAppointments: appointments.filter((a) => a.status === 'COMPLETED').length,
        canceledAppointments: appointments.filter((a) => a.status === 'CANCELED').length
      });

      if (role === 'DOCTOR' && !selectedDoctorName && doctors.length > 0) {
        const normalizedUsername = normalizeText(username);
        const profileMatch = doctors.find((doctor) => normalizeText(doctor.fullName).includes(normalizedUsername));
        const fallbackDoctor = doctors[0];
        const initialDoctorName = profileMatch?.fullName || fallbackDoctor.fullName;
        setSelectedDoctorName(initialDoctorName);
        localStorage.setItem(DOCTOR_PROFILE_KEY, initialDoctorName);
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ── charts used by non-admin roles ──────────────────────────────────────
  const trend = useMemo(() => {
    const rows = dashboard?.appointmentTrends || [];
    return { labels: rows.map((r) => r[0]), values: rows.map((r) => r[1]) };
  }, [dashboard]);

  const diagnosis = useMemo(() => {
    const rows = dashboard?.commonDiagnoses || [];
    return { labels: rows.map((r) => r[0]), values: rows.map((r) => r[1]) };
  }, [dashboard]);

  const utilization = useMemo(() => {
    const rows = dashboard?.doctorUtilization || [];
    return { labels: rows.map((r) => r[1]), values: rows.map((r) => r[2]) };
  }, [dashboard]);

  const peak = useMemo(() => {
    const rows = dashboard?.peakHours || [];
    return { labels: rows.map((r) => `${r[0]}:00`), values: rows.map((r) => r[1]) };
  }, [dashboard]);

  const gender = dashboard?.patientDemographics?.gender || {};

  // ── admin governance stats ────────────────────────────────────────────────
  const adminStats = useMemo(() => {
    if (role !== 'ADMIN') return null;
    const statusMap = systemStats.appointmentsByStatus || {};
    const pending = statusMap.PENDING ?? summary.pendingAppointments;
    const confirmed = statusMap.CONFIRMED ?? summary.confirmedAppointments;
    const completed = statusMap.COMPLETED ?? summary.completedAppointments;
    const canceled = statusMap.CANCELED ?? summary.canceledAppointments;
    const totalAppts = pending + confirmed + completed + canceled;

    const completionRate = totalAppts > 0 ? (completed / totalAppts) * 100 : 0;
    const cancellationRate = totalAppts > 0 ? (canceled / totalAppts) * 100 : 0;
    const activeUserRate = summary.users > 0 ? (summary.enabledUsers / summary.users) * 100 : 100;
    const coverageRate = completed > 0 ? Math.min(100, (summary.consultations / completed) * 100) : 0;
    const integrityScore = Math.max(0, 100 - cancellationRate);
    const healthScore = Math.min(
      100,
      Math.round(completionRate * 0.30 + activeUserRate * 0.25 + coverageRate * 0.25 + integrityScore * 0.20)
    );
    const healthGrade = healthScore >= 75 ? 'GOOD' : healthScore >= 50 ? 'FAIR' : 'POOR';
    const healthClass = healthScore >= 75 ? 'score-good' : healthScore >= 50 ? 'score-fair' : 'score-poor';

    const adminCount = systemStats.adminCount || 0;
    const disabledCount = systemStats.disabledCount || 0;
    const newUsers = systemStats.usersCreatedLastWeek || 0;
    const securityWarnings = [];
    if (adminCount === 1) securityWarnings.push('Single admin account — no redundancy');
    if (adminCount > 5) securityWarnings.push('Unusually high admin count — review privileges');
    if (disabledCount > 0) securityWarnings.push(`${disabledCount} account(s) currently disabled`);
    if (newUsers > 5) securityWarnings.push(`${newUsers} new accounts registered this week`);
    const securityClass = securityWarnings.length === 0 ? 'status-good' : 'status-warning';
    const securityLabel = securityWarnings.length === 0 ? 'SECURE' : 'REVIEW NEEDED';

    const missingConsultations = systemStats.completedWithNoConsultation || 0;
    const unengagedPatients = systemStats.patientsWithNoAppointments || 0;
    const idleDoctors = systemStats.doctorsWithNoAppointments || 0;
    const integrityIssues = [];
    if (missingConsultations > 0) integrityIssues.push(`${missingConsultations} completed appointment(s) missing consultation record`);
    if (unengagedPatients > 0) integrityIssues.push(`${unengagedPatients} patient(s) have never been scheduled`);
    if (idleDoctors > 0) integrityIssues.push(`${idleDoctors} doctor(s) have no active assignments`);
    if (cancellationRate > 25) integrityIssues.push(`Cancellation rate at ${cancellationRate.toFixed(1)}% — exceeds 25% threshold`);
    const integrityClass = integrityIssues.length === 0 ? 'status-good' : 'status-warning';
    const integrityLabel = integrityIssues.length === 0 ? 'NO ISSUES' : `${integrityIssues.length} ISSUE(S)`;

    return {
      pending, confirmed, completed, canceled, totalAppts,
      completionRate, cancellationRate, activeUserRate, coverageRate,
      healthScore, healthGrade, healthClass,
      adminCount, disabledCount, newUsers,
      securityWarnings, securityClass, securityLabel,
      integrityIssues, integrityClass, integrityLabel
    };
  }, [role, systemStats, summary]);

  const adminStatusChart = useMemo(() => {
    if (!adminStats) return { labels: [], values: [] };
    return {
      labels: ['Pending', 'Confirmed', 'Completed', 'Canceled'],
      values: [adminStats.pending, adminStats.confirmed, adminStats.completed, adminStats.canceled]
    };
  }, [adminStats]);

  const userRoleDistribution = useMemo(() => {
    const counts = users.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {});
    return { labels: Object.keys(counts), values: Object.values(counts) };
  }, [users]);

  const toggleUserEnabled = async (user) => {
    try {
      await userApi.update(user.id, {
        username: user.username,
        email: user.email,
        role: user.role,
        enabled: !user.enabled
      });
      load();
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not update account status.');
    }
  };

  const runSearch = async () => {
    const keyword = searchQuery.trim();
    if (!keyword) {
      setSearchData({ total: 0, groups: {} });
      return;
    }

    try {
      const { data } = await adminPanelApi.search(keyword);
      setSearchData(data);
    } catch (err) {
      alert(err?.response?.data?.error || 'Search failed.');
    }
  };

  const downloadReportCsv = async () => {
    try {
      const response = await adminPanelApi.reportsSummaryCsv();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'admin-report-summary.csv';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err?.response?.data?.error || 'CSV export failed.');
    }
  };

  const runMaintenanceWorkflow = async () => {
    setRunningWorkflow(true);
    try {
      const { data } = await adminPanelApi.runMaintenance();
      setWorkflowResult(data);
      await load();
    } catch (err) {
      alert(err?.response?.data?.error || 'Could not run maintenance workflow.');
    } finally {
      setRunningWorkflow(false);
    }
  };

  // ── non-admin KPIs ────────────────────────────────────────────────────────
  const roleKpis = {
    RECEPTIONIST: [
      { label: 'Pending Appointments', value: summary.pendingAppointments },
      { label: 'Confirmed Appointments', value: summary.confirmedAppointments },
      { label: 'Registered Patients', value: summary.patients }
    ],
    DOCTOR: [
      { label: 'Total Appointments', value: summary.appointments },
      { label: 'Completed Appointments', value: summary.completedAppointments },
      { label: 'Consultation Records', value: summary.consultations }
    ],
    PATIENT: [
      { label: 'Active Doctors', value: summary.doctors },
      { label: 'System Appointments', value: summary.appointments },
      { label: 'Consultation Records', value: summary.consultations }
    ]
  };
  const visibleRoleKpis = roleKpis[role] || roleKpis.RECEPTIONIST;

  const sharedFlow = [
    'Reception registers patient profile and booking details.',
    'Doctor receives schedule updates and consultation context.',
    'Patient journey is tracked with appointment and record continuity.',
    'Admin monitors outcomes, utilization, and service performance.'
  ];

  const titleByRole = {
    ADMIN: 'System Administration & Oversight',
    RECEPTIONIST: 'Front Desk Operations Dashboard',
    DOCTOR: 'Clinical Workflow Dashboard',
    PATIENT: 'Patient Journey Dashboard'
  };
  const subtitleByRole = {
    ADMIN: 'Governance, security posture, data integrity, and system performance monitoring.',
    RECEPTIONIST: 'Coordinate registrations and appointments while keeping the care team aligned.',
    DOCTOR: 'Review appointment flow and consultation load to stay ahead of daily care delivery.',
    PATIENT: 'Track service activity and stay informed about the care journey touchpoints.'
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <header className="page-header">
        <div>
          <h2>{titleByRole[role] || titleByRole.RECEPTIONIST}</h2>
          <p>{subtitleByRole[role] || subtitleByRole.RECEPTIONIST}</p>
        </div>
        <div className="page-header-actions">
          <button type="button" onClick={load} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh Dashboard'}
          </button>
        </div>
      </header>

      {role === 'ADMIN' ? (
        /* ══════════════════════════╗
           ADMIN GOVERNANCE DASHBOARD
           ══════════════════════════╝ */
        <>
          {/* ── Executive KPIs ── */}
          {adminStats && (
            <div className="kpi-grid admin-kpi-grid">
              <article className="card kpi-featured">
                <h3>System Health Score</h3>
                <p className={`kpi-big-number ${adminStats.healthClass}`}>
                  {adminStats.healthScore}<span className="kpi-unit">%</span>
                </p>
                <small className={adminStats.healthClass}>{adminStats.healthGrade}</small>
              </article>
              <article className="card">
                <h3>Active Users</h3>
                <p className="kpi-big-number">{adminStats.activeUserRate.toFixed(0)}<span className="kpi-unit">%</span></p>
                <small>{summary.enabledUsers} of {summary.users} accounts enabled</small>
              </article>
              <article className="card">
                <h3>Appointment Efficiency</h3>
                <p className="kpi-big-number">{adminStats.completionRate.toFixed(0)}<span className="kpi-unit">%</span></p>
                <small>{adminStats.completed} completed of {adminStats.totalAppts} total</small>
              </article>
              <article className="card">
                <h3>Consultation Coverage</h3>
                <p className="kpi-big-number">{adminStats.coverageRate.toFixed(0)}<span className="kpi-unit">%</span></p>
                <small>{summary.consultations} records vs {adminStats.completed} completed</small>
              </article>
            </div>
          )}

          {/* ── Control Panels ── */}
          {adminStats && (
            <section className="admin-overview-grid">

              {/* API & Service Status */}
              <article className="card admin-panel">
                <div className="admin-panel-header">
                  <h3>API &amp; Service Status</h3>
                  <span className={`status-badge ${health.status === 'UP' ? 'badge-good' : 'badge-warn'}`}>
                    {health.status}
                  </span>
                </div>
                <div className="status-row-list">
                  <div className="status-row-item">
                    <span>API Gateway</span>
                    <span className={health.status === 'UP' ? 'inline-good' : 'inline-warn'}>
                      {health.status === 'UP' ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                  <div className="status-row-item">
                    <span>Database</span>
                    <span className={health.status === 'UP' ? 'inline-good' : 'inline-warn'}>
                      {health.status === 'UP' ? 'CONNECTED' : 'UNREACHABLE'}
                    </span>
                  </div>
                  <div className="status-row-item">
                    <span>Doctor Alerts Queued</span>
                    <span className="inline-neutral">{notifications.doctorUpcoming.length}</span>
                  </div>
                  <div className="status-row-item">
                    <span>Patient Reminders Queued</span>
                    <span className="inline-neutral">{notifications.patientReminders.length}</span>
                  </div>
                </div>
              </article>

              {/* Security Posture */}
              <article className="card admin-panel">
                <div className="admin-panel-header">
                  <h3>Security Posture</h3>
                  <span className={`status-badge ${adminStats.securityClass === 'status-good' ? 'badge-good' : 'badge-warn'}`}>
                    {adminStats.securityLabel}
                  </span>
                </div>
                <div className="status-row-list">
                  <div className="status-row-item">
                    <span>Admin Accounts</span>
                    <span className={adminStats.adminCount === 1 ? 'inline-warn' : 'inline-good'}>
                      {adminStats.adminCount}
                    </span>
                  </div>
                  <div className="status-row-item">
                    <span>Disabled Accounts</span>
                    <span className={adminStats.disabledCount > 0 ? 'inline-warn' : 'inline-good'}>
                      {adminStats.disabledCount}
                    </span>
                  </div>
                  <div className="status-row-item">
                    <span>New Accounts (7 days)</span>
                    <span className="inline-neutral">{adminStats.newUsers}</span>
                  </div>
                  <div className="status-row-item">
                    <span>Total Managed Users</span>
                    <span className="inline-neutral">{summary.users}</span>
                  </div>
                </div>
                {adminStats.securityWarnings.length > 0 && (
                  <ul className="issue-list">
                    {adminStats.securityWarnings.map((w) => <li key={w}>{w}</li>)}
                  </ul>
                )}
              </article>

              {/* Data Integrity */}
              <article className="card admin-panel">
                <div className="admin-panel-header">
                  <h3>Data Integrity</h3>
                  <span className={`status-badge ${adminStats.integrityClass === 'status-good' ? 'badge-good' : 'badge-warn'}`}>
                    {adminStats.integrityLabel}
                  </span>
                </div>
                <div className="status-row-list">
                  <div className="status-row-item">
                    <span>Missing Consultation Records</span>
                    <span className={systemStats.completedWithNoConsultation > 0 ? 'inline-warn' : 'inline-good'}>
                      {systemStats.completedWithNoConsultation ?? 0}
                    </span>
                  </div>
                  <div className="status-row-item">
                    <span>Patients Never Scheduled</span>
                    <span className={systemStats.patientsWithNoAppointments > 0 ? 'inline-warn' : 'inline-good'}>
                      {systemStats.patientsWithNoAppointments ?? 0}
                    </span>
                  </div>
                  <div className="status-row-item">
                    <span>Idle Doctors (no assignments)</span>
                    <span className={systemStats.doctorsWithNoAppointments > 0 ? 'inline-warn' : 'inline-good'}>
                      {systemStats.doctorsWithNoAppointments ?? 0}
                    </span>
                  </div>
                  <div className="status-row-item">
                    <span>Cancellation Rate</span>
                    <span className={adminStats.cancellationRate > 25 ? 'inline-warn' : 'inline-good'}>
                      {adminStats.cancellationRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
                {adminStats.integrityIssues.length > 0 && (
                  <ul className="issue-list">
                    {adminStats.integrityIssues.map((i) => <li key={i}>{i}</li>)}
                  </ul>
                )}
              </article>
            </section>
          )}

          {/* ── Appointment Status Live Monitor ── */}
          {adminStats && (
            <section className="admin-section">
              <h3 className="section-label">Appointment Status Monitor</h3>
              <div className="status-monitor-grid">
                <article className="card status-monitor-card appt-pending">
                  <h4>PENDING</h4>
                  <p className="monitor-count">{adminStats.pending}</p>
                  <small>
                    {adminStats.totalAppts > 0
                      ? ((adminStats.pending / adminStats.totalAppts) * 100).toFixed(1)
                      : 0}% of total
                  </small>
                </article>
                <article className="card status-monitor-card appt-confirmed">
                  <h4>CONFIRMED</h4>
                  <p className="monitor-count">{adminStats.confirmed}</p>
                  <small>
                    {adminStats.totalAppts > 0
                      ? ((adminStats.confirmed / adminStats.totalAppts) * 100).toFixed(1)
                      : 0}% of total
                  </small>
                </article>
                <article className="card status-monitor-card appt-completed">
                  <h4>COMPLETED</h4>
                  <p className="monitor-count">{adminStats.completed}</p>
                  <small>
                    {adminStats.totalAppts > 0
                      ? ((adminStats.completed / adminStats.totalAppts) * 100).toFixed(1)
                      : 0}% of total
                  </small>
                </article>
                <article className="card status-monitor-card appt-canceled">
                  <h4>CANCELED</h4>
                  <p className="monitor-count">{adminStats.canceled}</p>
                  <small>
                    {adminStats.totalAppts > 0
                      ? ((adminStats.canceled / adminStats.totalAppts) * 100).toFixed(1)
                      : 0}% of total
                  </small>
                </article>
              </div>
            </section>
          )}

          {/* ── User Account Control Center ── */}
          <section className="card admin-section">
            <div className="section-header-row">
              <h3>User Account Control Center</h3>
              <Link className="text-action-link" to="/app/users">Full User Management →</Link>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Since</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td><strong>{user.username}</strong></td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge role-${user.role.toLowerCase()}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={user.enabled ? 'inline-good' : 'inline-warn'}>
                          {user.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <button
                          className={`toggle-btn ${user.enabled ? 'btn-disable' : 'btn-enable'}`}
                          onClick={() => toggleUserEnabled(user)}
                        >
                          {user.enabled ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: '#999' }}>No users found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card admin-section">
            <div className="section-header-row">
              <h3>Advanced Search</h3>
              <small>Find users, patients, doctors, appointments, and consultations from one place.</small>
            </div>
            <div className="admin-search-row">
              <input
                placeholder="Search by name, email, diagnosis, role, status..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    runSearch();
                  }
                }}
              />
              <button type="button" onClick={runSearch}>Search</button>
            </div>
            {searchData.total > 0 ? (
              <>
                <p className="muted">{searchData.total} result(s) found.</p>
                <div className="search-groups-grid">
                  {Object.entries(searchData.groups || {}).map(([group, items]) => (
                    <article key={group} className="search-group-card">
                      <h4>{group.toUpperCase()}</h4>
                      <ul>
                        {(items || []).slice(0, 5).map((item) => (
                          <li key={`${group}-${item.type}-${item.id}`}>
                            <strong>{item.title}</strong>
                            <span>{item.subtitle}</span>
                            <small>{item.status} {item.meta ? `• ${item.meta}` : ''}</small>
                          </li>
                        ))}
                        {(!items || items.length === 0) ? <li><small>No matches.</small></li> : null}
                      </ul>
                    </article>
                  ))}
                </div>
              </>
            ) : searchQuery.trim() ? <p className="muted">No matches found.</p> : null}
          </section>

          <section className="admin-overview-grid">
            <article className="card admin-panel">
              <div className="section-header-row">
                <h3>Reports Summary</h3>
                <button type="button" className="export-csv-button" onClick={downloadReportCsv}>
                  <span className="button__text">Export CSV</span>
                  <span className="button__icon">
                    <svg className="svg" viewBox="0 0 35 35" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M17.5,22.131a1.249,1.249,0,0,1-1.25-1.25V2.187a1.25,1.25,0,0,1,2.5,0V20.881A1.25,1.25,0,0,1,17.5,22.131Z" />
                      <path d="M17.5,22.693a3.189,3.189,0,0,1-2.262-.936L8.487,15.006a1.249,1.249,0,0,1,1.767-1.767l6.751,6.751a.7.7,0,0,0,.99,0l6.751-6.751a1.25,1.25,0,0,1,1.768,1.767l-6.752,6.751A3.191,3.191,0,0,1,17.5,22.693Z" />
                      <path d="M31.436,34.063H3.564A3.318,3.318,0,0,1,.25,30.749V22.011a1.25,1.25,0,0,1,2.5,0v8.738a.815.815,0,0,0,.814.814H31.436a.815.815,0,0,0,.814-.814V22.011a1.25,1.25,0,1,1,2.5,0v8.738A3.318,3.318,0,0,1,31.436,34.063Z" />
                    </svg>
                  </span>
                </button>
              </div>
              {reports ? (
                <div className="status-row-list">
                  <div className="status-row-item"><span>Patients</span><strong>{reports.overview?.patients ?? 0}</strong></div>
                  <div className="status-row-item"><span>Doctors</span><strong>{reports.overview?.doctors ?? 0}</strong></div>
                  <div className="status-row-item"><span>Appointments</span><strong>{reports.overview?.appointments ?? 0}</strong></div>
                  <div className="status-row-item"><span>Consultations</span><strong>{reports.overview?.consultations ?? 0}</strong></div>
                  <div className="status-row-item"><span>Generated</span><small>{reports.generatedAt ? new Date(reports.generatedAt).toLocaleString() : 'N/A'}</small></div>
                </div>
              ) : <small>Report data unavailable.</small>}
            </article>

            <article className="card admin-panel">
              <div className="section-header-row">
                <h3>Automated Workflows</h3>
                <button type="button" onClick={runMaintenanceWorkflow} disabled={runningWorkflow}>
                  {runningWorkflow ? 'Running...' : 'Run Maintenance'}
                </button>
              </div>
              <small>Automatically cancels stale pending appointments and logs maintenance checks.</small>
              {workflowResult ? (
                <div className="status-row-list workflow-summary">
                  <div className="status-row-item"><span>Canceled stale pending</span><strong>{workflowResult.stalePendingCanceled}</strong></div>
                  <div className="status-row-item"><span>Unresolved completed</span><strong>{workflowResult.unresolvedCompletedAppointments}</strong></div>
                  <div className="status-row-item"><span>Patients without appointments</span><strong>{workflowResult.orphanPatients}</strong></div>
                  <div className="status-row-item"><span>Idle doctors</span><strong>{workflowResult.idleDoctors}</strong></div>
                  <div className="status-row-item"><span>Last run</span><small>{workflowResult.executedAt ? new Date(workflowResult.executedAt).toLocaleString() : 'N/A'}</small></div>
                </div>
              ) : null}
            </article>

            <article className="card admin-panel">
              <h3>Security Controls</h3>
              <div className="status-row-list">
                <div className="status-row-item"><span>RBAC Enforcement</span><span className="inline-good">Enabled</span></div>
                <div className="status-row-item"><span>JWT Authentication</span><span className="inline-good">Enabled</span></div>
                <div className="status-row-item"><span>Password Policy</span><span className="inline-good">Enabled</span></div>
                <div className="status-row-item"><span>Audit Trail Logging</span><span className="inline-good">Enabled</span></div>
              </div>
            </article>
          </section>

          <section className="card admin-section">
            <div className="section-header-row">
              <h3>Audit Trail</h3>
              <small>Who changed what and when.</small>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'N/A'}</td>
                      <td>{entry.actorUsername}</td>
                      <td>{entry.action}</td>
                      <td>{entry.targetType} {entry.targetId ? `#${entry.targetId}` : ''}</td>
                      <td>{entry.details || 'N/A'}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: '#999' }}>No audit entries yet.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Admin Charts ── */}
          <div className="chart-grid">
            <DoughnutChartCard
              title="Appointment Status Distribution"
              labels={adminStatusChart.labels}
              values={adminStatusChart.values}
            />
            <BarChartCard
              title="User Role Composition"
              labels={userRoleDistribution.labels}
              values={userRoleDistribution.values}
            />
          </div>
        </>
      ) : (
        /* ════════════════════════════╗
           NON-ADMIN ROLE DASHBOARDS
           ════════════════════════════╝ */
        <>
          <div className="kpi-grid">
            {visibleRoleKpis.map((kpi) => (
              <article key={kpi.label} className="card">
                <h3>{kpi.label}</h3>
                <p>{kpi.value}</p>
              </article>
            ))}
          </div>

          <section className="card">
            <h3>Connected Care Workflow</h3>
            <div className="connected-flow-grid">
              {sharedFlow.map((step) => (
                <article key={step} className="connected-flow-item">
                  <p>{step}</p>
                </article>
              ))}
            </div>
          </section>

          <div className="chart-grid">
            <LineChartCard title="Appointment Trends" labels={trend.labels} values={trend.values} />
            <BarChartCard title="Doctor Utilization" labels={utilization.labels} values={utilization.values} />
            <DoughnutChartCard title="Common Diagnoses" labels={diagnosis.labels} values={diagnosis.values} />
            <DoughnutChartCard title="Gender Breakdown" labels={Object.keys(gender)} values={Object.values(gender)} />
          </div>

          <section className="card chart-card">
            <h3>Peak Hours Heatmap (Simplified)</h3>
            <div className="heatmap-row">
              {peak.labels.map((label, idx) => (
                <div
                  key={label}
                  className="heat-cell"
                  style={{ opacity: Math.min(1, (peak.values[idx] || 0) / 10 + 0.2) }}
                >
                  <strong>{label}</strong>
                  <span>{peak.values[idx]}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}


