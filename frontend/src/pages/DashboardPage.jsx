import { useEffect, useMemo, useState } from 'react';
import { analyticsApi } from '../services/api';
import { BarChartCard, DoughnutChartCard, LineChartCard } from '../components/ChartCard';

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    analyticsApi.dashboard().then(({ data }) => setDashboard(data)).catch(() => setDashboard({}));
  }, []);

  const trend = useMemo(() => {
    const rows = dashboard?.appointmentTrends || [];
    return {
      labels: rows.map((r) => r[0]),
      values: rows.map((r) => r[1])
    };
  }, [dashboard]);

  const diagnosis = useMemo(() => {
    const rows = dashboard?.commonDiagnoses || [];
    return {
      labels: rows.map((r) => r[0]),
      values: rows.map((r) => r[1])
    };
  }, [dashboard]);

  const utilization = useMemo(() => {
    const rows = dashboard?.doctorUtilization || [];
    return {
      labels: rows.map((r) => r[1]),
      values: rows.map((r) => r[2])
    };
  }, [dashboard]);

  const peak = useMemo(() => {
    const rows = dashboard?.peakHours || [];
    return {
      labels: rows.map((r) => `${r[0]}:00`),
      values: rows.map((r) => r[1])
    };
  }, [dashboard]);

  const gender = dashboard?.patientDemographics?.gender || {};

  return (
    <div>
      <header className="page-header">
        <h2>Operations Intelligence</h2>
        <p>Live hospital workflow metrics for decisions and staffing.</p>
      </header>

      <div className="kpi-grid">
        <article className="card"><h3>Most Common Diagnosis</h3><p>{diagnosis.labels[0] || 'N/A'}</p></article>
        <article className="card"><h3>Total Diagnoses Tracked</h3><p>{diagnosis.values.reduce((a, b) => a + b, 0) || 0}</p></article>
        <article className="card"><h3>Peak Hour</h3><p>{peak.labels[peak.values.indexOf(Math.max(...(peak.values.length ? peak.values : [0])))] || 'N/A'}</p></article>
      </div>

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
            <div key={label} className="heat-cell" style={{ opacity: Math.min(1, (peak.values[idx] || 0) / 10 + 0.2) }}>
              <strong>{label}</strong>
              <span>{peak.values[idx]}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
