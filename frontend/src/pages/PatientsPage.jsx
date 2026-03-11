import { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import { patientApi } from '../services/api';
import { getAuthValue } from '../services/authStorage';

export default function PatientsPage() {
  const role = getAuthValue('role') || 'RECEPTIONIST';
  const canManagePatients = role === 'ADMIN' || role === 'RECEPTIONIST';
  const [patients, setPatients] = useState([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'Male',
    phone: '',
    email: '',
    address: '',
    insuranceProvider: '',
    medicalHistory: ''
  });

  const load = () => patientApi.list(q).then(({ data }) => setPatients(data));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    await patientApi.create(form);
    setForm({ ...form, firstName: '', lastName: '' });
    load();
  };

  return (
    <div>
      <header className="page-header"><h2>Patient Management</h2></header>
      {canManagePatients ? (
        <section className="card">
          <form className="form-grid" onSubmit={create}>
            <input placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            <input placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} required />
            <input placeholder="Gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} required />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <input placeholder="Insurance" value={form.insuranceProvider} onChange={(e) => setForm({ ...form, insuranceProvider: e.target.value })} />
            <textarea placeholder="Medical history" value={form.medicalHistory} onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })} />
            <button type="submit">Register Patient</button>
          </form>
        </section>
      ) : null}

      <section className="card">
        <input placeholder="Search by name or patient code" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={load}>Search</button>
      </section>

      <DataTable
        title="Patients"
        columns={[
          { key: 'patientCode', label: 'Patient ID' },
          { key: 'firstName', label: 'First Name' },
          { key: 'lastName', label: 'Last Name' },
          { key: 'gender', label: 'Gender' },
          { key: 'insuranceProvider', label: 'Insurance' }
        ]}
        data={patients}
      />
    </div>
  );
}
