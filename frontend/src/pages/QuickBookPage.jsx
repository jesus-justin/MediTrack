import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { appointmentApi, doctorApi, patientApi } from '../services/api';
import { getAuthValue } from '../services/authStorage';
import { applyAvailabilityToSlots } from '../services/scheduleCoordination';

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export default function QuickBookPage() {
  const role = getAuthValue('role') || 'RECEPTIONIST';
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    patientId: '',
    doctorId: '',
    date: new Date().toISOString().slice(0, 10),
    durationMinutes: '30',
    reason: '',
    notes: ''
  });

  useEffect(() => {
    Promise.all([patientApi.list(''), doctorApi.list('')]).then(([p, d]) => {
      setPatients(p.data);
      setDoctors(d.data);
    });
  }, []);

  const findSlots = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSelectedSlot(null);
    setSlots([]);
    try {
      const { data } = await appointmentApi.receptionSlots({
        doctorId: Number(form.doctorId),
        date: form.date,
        durationMinutes: Number(form.durationMinutes),
        limit: 8
      });
      const selectedDoctor = doctors.find((doctor) => String(doctor.id) === String(form.doctorId));
      const filteredSlots = applyAvailabilityToSlots(data.slots || [], selectedDoctor?.fullName);
      setSlots(filteredSlots);
      if (!filteredSlots.length) {
        setMessage('No slots match the doctor schedule (availability and blocked times).');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Could not load slots.');
    }
  };

  const book = async () => {
    if (!form.patientId || !selectedSlot) {
      setError('Please select a patient and a time slot.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await appointmentApi.create({
        patientId: Number(form.patientId),
        doctorId: Number(form.doctorId),
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        reason: form.reason,
        notes: form.notes || 'Booked via Quick Book'
      });
      setMessage('Appointment booked successfully!');
      setSelectedSlot(null);
      setSlots([]);
      setForm((prev) => ({ ...prev, patientId: '', reason: '', notes: '' }));
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Booking failed.');
    } finally {
      setLoading(false);
    }
  };

  if (role !== 'RECEPTIONIST') return <Navigate to="/app" replace />;

  return (
    <div>
      <header className="page-header">
        <div>
          <h2>Quick Book</h2>
          <p>Book a new appointment with slot suggestions in one streamlined flow.</p>
        </div>
      </header>

      <section className="card">
        <h3>1) Select Patient &amp; Reason</h3>
        <div className="form-grid">
          <select
            value={form.patientId}
            onChange={(e) => setForm({ ...form, patientId: e.target.value })}
          >
            <option value="">— Select patient —</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.patientCode} – {p.firstName} {p.lastName}
              </option>
            ))}
          </select>
          <input
            placeholder="Reason for visit (optional)"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
        </div>
      </section>

      <section className="card">
        <h3>2) Find Available Slots</h3>
        <form className="form-grid" onSubmit={findSlots}>
          <select
            value={form.doctorId}
            onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
            required
          >
            <option value="">— Select doctor —</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.fullName}</option>
            ))}
          </select>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
          <select
            value={form.durationMinutes}
            onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
          >
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">60 min</option>
          </select>
          <button type="submit">Find Available Slots</button>
        </form>

        {slots.length > 0 && (
          <div className="reception-slot-grid">
            {slots.map((slot) => {
              const active = selectedSlot?.startTime === slot.startTime;
              return (
                <button
                  type="button"
                  key={slot.startTime}
                  className={`reception-slot-btn ${active ? 'active' : ''}`}
                  onClick={() => setSelectedSlot(slot)}
                >
                  <strong>{formatDateTime(slot.startTime)}</strong>
                  <small>to {formatDateTime(slot.endTime)}</small>
                </button>
              );
            })}
          </div>
        )}

        {message && <p className="success" style={{ marginTop: '10px' }}>{message}</p>}
        {error && <p className="error" style={{ marginTop: '10px' }}>{error}</p>}
      </section>

      {selectedSlot && (
        <section className="card">
          <h3>3) Confirm Booking</h3>
          <p>
            <strong>Selected slot:</strong> {formatDateTime(selectedSlot.startTime)} → {formatDateTime(selectedSlot.endTime)}
          </p>
          <div className="form-grid">
            <textarea
              placeholder="Additional notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <button
              type="button"
              onClick={book}
              disabled={loading || !form.patientId}
            >
              {loading ? 'Booking…' : 'Confirm Booking'}
            </button>
          </div>
          {!form.patientId && (
            <p className="error" style={{ marginTop: '8px' }}>← Go back to step 1 and select a patient first.</p>
          )}
        </section>
      )}
    </div>
  );
}
