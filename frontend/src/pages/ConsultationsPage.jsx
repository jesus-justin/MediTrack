import { useState } from 'react';
import DataTable from '../components/DataTable';
import { consultationApi } from '../services/api';
import { getAuthValue } from '../services/authStorage';

export default function ConsultationsPage() {
  const role = getAuthValue('role') || 'RECEPTIONIST';
  const canCreateConsultation = role === 'DOCTOR';
  const canViewTimeline = role === 'ADMIN' || role === 'DOCTOR' || role === 'PATIENT';
  const [appointmentId, setAppointmentId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [timeline, setTimeline] = useState([]);
  const [form, setForm] = useState({ diagnosis: '', prescription: '', notes: '', attachmentUrl: '' });

  const save = async (e) => {
    e.preventDefault();
    await consultationApi.create(Number(appointmentId), form);
    setForm({ diagnosis: '', prescription: '', notes: '', attachmentUrl: '' });
  };

  const loadTimeline = async () => {
    const { data } = await consultationApi.timeline(Number(patientId));
    setTimeline(data.map((x) => ({
      createdAt: x.createdAt,
      diagnosis: x.diagnosis,
      prescription: x.prescription,
      notes: x.notes
    })));
  };

  return (
    <div>
      <header className="page-header"><h2>Consultation & Medical Records</h2></header>
      {canCreateConsultation ? (
        <section className="card">
          <form className="form-grid" onSubmit={save}>
            <input placeholder="Appointment ID" value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)} required />
            <input placeholder="Diagnosis" value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} required />
            <textarea placeholder="Prescription" value={form.prescription} onChange={(e) => setForm({ ...form, prescription: e.target.value })} />
            <textarea placeholder="SOAP / clinical notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <input placeholder="Attachment URL" value={form.attachmentUrl} onChange={(e) => setForm({ ...form, attachmentUrl: e.target.value })} />
            <button type="submit">Sign & Save Consultation</button>
          </form>
        </section>
      ) : null}

      {canViewTimeline ? (
        <section className="card">
          <h3>Patient Timeline</h3>
          <input placeholder="Patient ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
          <button onClick={loadTimeline}>Load Timeline</button>
        </section>
      ) : null}

      <DataTable
        title="Medical History Timeline"
        columns={[
          { key: 'createdAt', label: 'Date' },
          { key: 'diagnosis', label: 'Diagnosis' },
          { key: 'prescription', label: 'Prescription' },
          { key: 'notes', label: 'Notes' }
        ]}
        data={timeline}
      />
    </div>
  );
}
