import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { appointmentApi, doctorApi } from '../services/api';
import { getAuthValue } from '../services/authStorage';
import { applyAvailabilityToSlots } from '../services/scheduleCoordination';

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function computeDurationMinutes(appointment) {
  const start = new Date(appointment.startTime).getTime();
  const end = new Date(appointment.endTime).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 30;
  return Math.max(15, Math.round((end - start) / 60000));
}

export default function ReceptionDeskPage() {
  const role = getAuthValue('role') || 'RECEPTIONIST';
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notes, setNotes] = useState('Arranged by reception desk');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [slotFilter, setSlotFilter] = useState({
    doctorId: '',
    date: new Date().toISOString().slice(0, 10),
    durationMinutes: 30,
    limit: 10
  });

  const load = async () => {
    const [doctorsRes, apptRes] = await Promise.all([doctorApi.list(''), appointmentApi.list()]);
    setDoctors(doctorsRes.data);
    setAppointments(apptRes.data);

    if (!slotFilter.doctorId && doctorsRes.data.length > 0) {
      setSlotFilter((prev) => ({ ...prev, doctorId: String(doctorsRes.data[0].id) }));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const activeAppointments = useMemo(
    () => appointments.filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED'),
    [appointments]
  );

  const selectedAppointment = useMemo(
    () => activeAppointments.find((a) => String(a.id) === selectedAppointmentId),
    [activeAppointments, selectedAppointmentId]
  );

  const fetchSlots = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSelectedSlot(null);

    if (!slotFilter.doctorId || !slotFilter.date) {
      setError('Select doctor and date first.');
      return;
    }

    try {
      const { data } = await appointmentApi.receptionSlots({
        doctorId: Number(slotFilter.doctorId),
        date: slotFilter.date,
        durationMinutes: Number(slotFilter.durationMinutes),
        limit: Number(slotFilter.limit)
      });
      const selectedDoctor = doctors.find((doctor) => String(doctor.id) === String(slotFilter.doctorId));
      const filteredSlots = applyAvailabilityToSlots(data.slots || [], selectedDoctor?.fullName);
      setSlots(filteredSlots);
      if (!filteredSlots.length) {
        setMessage('No available slots in the selected window that match doctor availability.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Could not load available slots.');
    }
  };

  const prefillFromAppointment = () => {
    if (!selectedAppointment) return;
    setSlotFilter((prev) => ({
      ...prev,
      doctorId: String(selectedAppointment.doctor.id),
      date: selectedAppointment.startTime.slice(0, 10),
      durationMinutes: computeDurationMinutes(selectedAppointment)
    }));
  };

  const arrange = async () => {
    setError('');
    setMessage('');

    if (!selectedAppointment || !selectedSlot) {
      setError('Choose an appointment and a suggested slot.');
      return;
    }

    setLoading(true);
    try {
      await appointmentApi.arrange(selectedAppointment.id, {
        doctorId: Number(slotFilter.doctorId),
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        notes
      });

      setMessage(`Appointment #${selectedAppointment.id} rearranged successfully.`);
      await load();
      setSelectedSlot(null);
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Failed to arrange appointment time.');
    } finally {
      setLoading(false);
    }
  };

  if (role !== 'RECEPTIONIST') {
    return <Navigate to="/app" replace />;
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h2>Reception Desk Scheduler</h2>
          <p>Receptionist-only tools to arrange times, resolve conflicts, and keep patient flow on track.</p>
        </div>
      </header>

      <section className="card">
        <h3>1) Choose Appointment to Rearrange</h3>
        <div className="form-grid">
          <select value={selectedAppointmentId} onChange={(e) => setSelectedAppointmentId(e.target.value)}>
            <option value="">Select pending/confirmed appointment</option>
            {activeAppointments.map((a) => (
              <option key={a.id} value={a.id}>
                #{a.id} | {a.patient.firstName} {a.patient.lastName} | {a.doctor.fullName} | {formatDateTime(a.startTime)}
              </option>
            ))}
          </select>
          <button type="button" onClick={prefillFromAppointment} disabled={!selectedAppointment}>
            Use Appointment Doctor/Date
          </button>
        </div>
      </section>

      <section className="card">
        <h3>2) Find Available Time Slots</h3>
        <form className="form-grid" onSubmit={fetchSlots}>
          <select value={slotFilter.doctorId} onChange={(e) => setSlotFilter({ ...slotFilter, doctorId: e.target.value })} required>
            <option value="">Select doctor</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.fullName}</option>
            ))}
          </select>
          <input type="date" value={slotFilter.date} onChange={(e) => setSlotFilter({ ...slotFilter, date: e.target.value })} required />
          <input
            type="number"
            min="15"
            max="180"
            step="15"
            value={slotFilter.durationMinutes}
            onChange={(e) => setSlotFilter({ ...slotFilter, durationMinutes: e.target.value })}
          />
          <input
            type="number"
            min="1"
            max="30"
            value={slotFilter.limit}
            onChange={(e) => setSlotFilter({ ...slotFilter, limit: e.target.value })}
          />
          <button type="submit">Suggest Time Slots</button>
        </form>

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
      </section>

      <section className="card">
        <h3>3) Arrange Selected Time</h3>
        <div className="form-grid">
          <textarea
            placeholder="Reason or note for rearrangement"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button type="button" onClick={arrange} disabled={loading || !selectedAppointment || !selectedSlot}>
            {loading ? 'Arranging…' : 'Arrange Appointment Time'}
          </button>
        </div>
        {message ? <p className="success">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </section>
    </div>
  );
}
