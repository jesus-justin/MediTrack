import { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import { appointmentApi, doctorApi, patientApi } from '../services/api';
import { getAuthValue } from '../services/authStorage';
import { PORTAL_KEYS, appendCollectionItem, nextPortalId } from '../services/portalStore';

export default function AppointmentsPage() {
  const role = getAuthValue('role') || 'RECEPTIONIST';
  const username = getAuthValue('username') || '';
  const canCreateAppointment = role === 'ADMIN' || role === 'RECEPTIONIST';
  const canUpdateStatus = role === 'ADMIN' || role === 'RECEPTIONIST' || role === 'DOCTOR' || role === 'PATIENT';
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [cancelReason, setCancelReason] = useState('');
  const [form, setForm] = useState({ patientId: '', doctorId: '', startTime: '', endTime: '', reason: '', notes: '' });

  const load = async () => {
    const [a, p, d] = await Promise.all([appointmentApi.list(), patientApi.list(''), doctorApi.list('')]);
    const rows = a.data.map((x) => ({
      id: x.id,
      patientId: x.patient.id,
      patient: `${x.patient.patientCode} - ${x.patient.firstName} ${x.patient.lastName}`,
      doctor: x.doctor.fullName,
      startTime: x.startTime,
      endTime: x.endTime,
      status: x.status
    }));

    const scopedRows = role === 'DOCTOR'
      ? rows.filter((item) => item.doctor.toLowerCase().includes(username.toLowerCase()))
      : role === 'PATIENT'
        ? rows.filter((item) => String(item.patient).toLowerCase().includes(username.toLowerCase()))
        : rows;

    setAppointments(scopedRows);
    setPatients(p.data);
    setDoctors(d.data);
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    await appointmentApi.create({
      ...form,
      patientId: Number(form.patientId),
      doctorId: Number(form.doctorId)
    });
    setForm({ patientId: '', doctorId: '', startTime: '', endTime: '', reason: '', notes: '' });
    load();
  };

  const setStatus = async (id, status) => {
    if (status === 'CANCELED' && role === 'RECEPTIONIST' && !cancelReason.trim()) {
      return;
    }

    await appointmentApi.updateStatus(id, status);

    if (status === 'CANCELED') {
      appendCollectionItem(PORTAL_KEYS.MESSAGES, {
        id: nextPortalId(PORTAL_KEYS.MESSAGES),
        sender: username,
        senderRole: role,
        recipient: 'patient-notify',
        recipientRole: 'PATIENT',
        content: `Appointment #${id} canceled${cancelReason ? `: ${cancelReason}` : ''}`,
        createdAt: new Date().toISOString()
      });
    }

    setCancelReason('');
    load();
  };

  return (
    <div>
      <header className="page-header"><h2>Appointment Scheduling</h2></header>
      {canCreateAppointment ? (
        <section className="card">
          <form className="form-grid" onSubmit={create}>
            <select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} required>
              <option value="">Select patient</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.patientCode} - {p.firstName} {p.lastName}</option>)}
            </select>
            <select value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })} required>
              <option value="">Select doctor</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
            </select>
            <input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
            <input type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
            <input placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <button type="submit">Book Appointment</button>
          </form>
        </section>
      ) : null}

      {role === 'RECEPTIONIST' ? (
        <section className="card">
          <h3>Cancellation Reason</h3>
          <input
            placeholder="Reason for cancellation (required before cancel)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </section>
      ) : null}

      <DataTable
        title="Appointments"
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'patient', label: 'Patient' },
          { key: 'doctor', label: 'Doctor' },
          { key: 'startTime', label: 'Start' },
          { key: 'endTime', label: 'End' },
          { key: 'status', label: 'Status' }
        ]}
        data={appointments}
      />

      {canUpdateStatus ? (
        <section className="card action-grid">
          <h3>Quick Status Updates</h3>
          {appointments.slice(0, 10).map((a) => (
            <div key={a.id} className="action-row">
              <span>Appointment #{a.id}</span>
              <button onClick={() => setStatus(a.id, 'CONFIRMED')}>Confirm</button>
              <button onClick={() => setStatus(a.id, 'COMPLETED')}>Complete</button>
              <button onClick={() => setStatus(a.id, 'CANCELED')}>Cancel</button>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
