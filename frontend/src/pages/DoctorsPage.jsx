import { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import { doctorApi } from '../services/api';

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [form, setForm] = useState({ fullName: '', specialization: '', department: '', schedule: '' });

  const load = async () => {
    const doctorsRes = await doctorApi.list('');
    const workloadRes = await doctorApi.workload();
    setDoctors(doctorsRes.data);
    setWorkload(workloadRes.data);
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    await doctorApi.create({ ...form, active: true });
    setForm({ fullName: '', specialization: '', department: '', schedule: '' });
    load();
  };

  return (
    <div>
      <header className="page-header"><h2>Doctor & Staff Management</h2></header>
      <section className="card">
        <form className="form-grid" onSubmit={create}>
          <input placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          <input placeholder="Specialization" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} required />
          <input placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required />
          <textarea placeholder="Schedule (e.g., Mon-Fri 08:00-16:00)" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} />
          <button type="submit">Add Doctor</button>
        </form>
      </section>

      <DataTable
        title="Doctors"
        columns={[
          { key: 'fullName', label: 'Name' },
          { key: 'specialization', label: 'Specialization' },
          { key: 'department', label: 'Department' },
          { key: 'schedule', label: 'Schedule' }
        ]}
        data={doctors}
      />

      <DataTable
        title="Workload Overview"
        columns={[
          { key: 'doctorName', label: 'Doctor' },
          { key: 'appointmentCount', label: 'Appointments' }
        ]}
        data={workload}
      />
    </div>
  );
}
