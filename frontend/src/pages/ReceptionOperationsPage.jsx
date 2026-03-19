import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { appointmentApi, doctorApi, patientApi } from '../services/api';
import { getAuthValue } from '../services/authStorage';
import {
  PORTAL_KEYS,
  appendCollectionItem,
  nextPortalId,
  readCollection,
  upsertCollectionItem,
  writePortalValue
} from '../services/portalStore';
import { applyAvailabilityToSlots } from '../services/scheduleCoordination';

function normalizeDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: 'WalkIn' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

export default function ReceptionOperationsPage({ mode = 'checkin' }) {
  const role = getAuthValue('role') || 'RECEPTIONIST';
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [checkIns, setCheckIns] = useState(() => readCollection(PORTAL_KEYS.CHECK_INS));
  const [invoices, setInvoices] = useState(() => readCollection(PORTAL_KEYS.INVOICES));
  const [walkIns, setWalkIns] = useState(() => readCollection(PORTAL_KEYS.WALK_INS));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [checkInForm, setCheckInForm] = useState({ search: '', appointmentId: '' });
  const [invoiceForm, setInvoiceForm] = useState({
    appointmentId: '',
    services: '',
    amount: '',
    paymentStatus: 'PENDING',
    deliveryMethod: 'PRINT'
  });
  const [walkInForm, setWalkInForm] = useState({
    patientName: '',
    concern: '',
    preferredDoctorId: '',
    phone: ''
  });

  const load = async () => {
    const [apptRes, patientRes, doctorRes] = await Promise.all([
      appointmentApi.list(),
      patientApi.list(''),
      doctorApi.list('')
    ]);
    setAppointments(apptRes.data || []);
    setPatients(patientRes.data || []);
    setDoctors(doctorRes.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  if (role !== 'RECEPTIONIST') {
    return <Navigate to="/app" replace />;
  }

  const todayAppointments = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return appointments
      .filter((appointment) => String(appointment.startTime || '').startsWith(today))
      .sort((left, right) => new Date(left.startTime) - new Date(right.startTime));
  }, [appointments]);

  const filteredCheckInCandidates = useMemo(() => {
    const keyword = checkInForm.search.trim().toLowerCase();
    if (!keyword) return todayAppointments;

    return todayAppointments.filter((appointment) => {
      const patientName = `${appointment.patient?.firstName || ''} ${appointment.patient?.lastName || ''}`.toLowerCase();
      const code = String(appointment.patient?.patientCode || '').toLowerCase();
      const phone = String(appointment.patient?.phone || '').toLowerCase();
      return patientName.includes(keyword) || code.includes(keyword) || phone.includes(keyword);
    });
  }, [todayAppointments, checkInForm.search]);

  const waitingRoom = useMemo(() => {
    return checkIns
      .filter((entry) => entry.status === 'ARRIVED' || entry.status === 'WAITING')
      .sort((left, right) => new Date(left.arrivedAt) - new Date(right.arrivedAt));
  }, [checkIns]);

  const completedAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status === 'COMPLETED'),
    [appointments]
  );

  const applyCheckInStatus = async (status) => {
    setError('');
    setMessage('');
    const appointmentId = Number(checkInForm.appointmentId);
    const appointment = appointments.find((entry) => entry.id === appointmentId);
    if (!appointment) {
      setError('Select an appointment first.');
      return;
    }

    const log = {
      id: nextPortalId(PORTAL_KEYS.CHECK_INS),
      appointmentId,
      patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      doctorName: appointment.doctor.fullName,
      status,
      arrivedAt: new Date().toISOString()
    };

    const updated = appendCollectionItem(PORTAL_KEYS.CHECK_INS, log);
    setCheckIns(updated);

    try {
      if (status === 'ARRIVED' || status === 'WAITING') {
        await appointmentApi.updateStatus(appointmentId, 'CONFIRMED');
      }
      if (status === 'DONE') {
        await appointmentApi.updateStatus(appointmentId, 'COMPLETED');
      }
    } catch {
      // Check-in logs remain available even if status sync fails.
    }

    setMessage(`Patient marked as ${status}. Doctor has been notified in queue updates.`);
    await load();
  };

  const generateInvoice = (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    const appointmentId = Number(invoiceForm.appointmentId);
    const appointment = appointments.find((entry) => entry.id === appointmentId);
    if (!appointment) {
      setError('Choose a completed appointment.');
      return;
    }

    const amount = Number(invoiceForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid invoice amount.');
      return;
    }

    const invoice = {
      id: nextPortalId(PORTAL_KEYS.INVOICES),
      appointmentId,
      patientId: appointment.patient.id,
      patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      doctorName: appointment.doctor.fullName,
      services: invoiceForm.services,
      amount,
      paymentStatus: invoiceForm.paymentStatus,
      deliveryMethod: invoiceForm.deliveryMethod,
      createdAt: new Date().toISOString()
    };

    const updated = appendCollectionItem(PORTAL_KEYS.INVOICES, invoice);
    setInvoices(updated);
    const patientBills = readCollection(PORTAL_KEYS.PATIENT_BILLS);
    writePortalValue(PORTAL_KEYS.PATIENT_BILLS, [invoice, ...patientBills]);

    setInvoiceForm({ appointmentId: '', services: '', amount: '', paymentStatus: 'PENDING', deliveryMethod: 'PRINT' });
    setMessage('Invoice generated successfully. Receipt delivery prepared.');
  };

  const updateInvoiceStatus = (invoiceId, paymentStatus) => {
    const invoice = invoices.find((entry) => entry.id === invoiceId);
    if (!invoice) return;
    const updated = upsertCollectionItem(PORTAL_KEYS.INVOICES, { ...invoice, paymentStatus });
    setInvoices(updated);
    setMessage(`Invoice #${invoiceId} marked as ${paymentStatus}.`);
  };

  const registerWalkIn = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!walkInForm.patientName.trim() || !walkInForm.preferredDoctorId) {
      setError('Patient name and preferred doctor are required.');
      return;
    }

    let patientId;
    const matchedPatient = patients.find((entry) => {
      const fullName = `${entry.firstName} ${entry.lastName}`.trim().toLowerCase();
      return fullName === walkInForm.patientName.trim().toLowerCase();
    });

    if (matchedPatient) {
      patientId = matchedPatient.id;
    } else {
      const names = splitName(walkInForm.patientName);
      const created = await patientApi.create({
        firstName: names.firstName,
        lastName: names.lastName,
        dateOfBirth: '1990-01-01',
        gender: 'Unknown',
        phone: walkInForm.phone,
        email: '',
        address: '',
        insuranceProvider: '',
        medicalHistory: ''
      });
      patientId = created.data.id;
    }

    let bookingInfo = 'added to waitlist';
    try {
      const nowDate = new Date().toISOString().slice(0, 10);
      const slotsRes = await appointmentApi.receptionSlots({
        doctorId: Number(walkInForm.preferredDoctorId),
        date: nowDate,
        durationMinutes: 30,
        limit: 1
      });

      const selectedDoctor = doctors.find((doctor) => String(doctor.id) === String(walkInForm.preferredDoctorId));
      const filtered = applyAvailabilityToSlots(slotsRes.data?.slots || [], selectedDoctor?.fullName);
      const firstSlot = filtered[0];
      if (firstSlot) {
        await appointmentApi.create({
          patientId,
          doctorId: Number(walkInForm.preferredDoctorId),
          startTime: firstSlot.startTime,
          endTime: firstSlot.endTime,
          reason: `Walk-in: ${walkInForm.concern}`,
          notes: 'Registered at reception desk walk-in module.'
        });
        bookingInfo = `booked for ${normalizeDate(firstSlot.startTime)}`;
      }
    } catch {
      bookingInfo = 'added to waitlist (auto slot unavailable)';
    }

    const walkIn = {
      id: nextPortalId(PORTAL_KEYS.WALK_INS),
      patientName: walkInForm.patientName,
      patientId,
      concern: walkInForm.concern,
      preferredDoctorId: Number(walkInForm.preferredDoctorId),
      bookingInfo,
      createdAt: new Date().toISOString()
    };

    const updated = appendCollectionItem(PORTAL_KEYS.WALK_INS, walkIn);
    setWalkIns(updated);
    setWalkInForm({ patientName: '', concern: '', preferredDoctorId: '', phone: '' });
    await load();
    setMessage(`Walk-in registered and ${bookingInfo}.`);
  };

  if (mode === 'billing') {
    return (
      <div>
        <header className="page-header">
          <h2>Billing / Invoicing</h2>
        </header>

        <section className="card">
          <form className="form-grid" onSubmit={generateInvoice}>
            <select value={invoiceForm.appointmentId} onChange={(event) => setInvoiceForm({ ...invoiceForm, appointmentId: event.target.value })} required>
              <option value="">Select completed consultation</option>
              {completedAppointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>
                  #{appointment.id} | {appointment.patient.firstName} {appointment.patient.lastName} | {appointment.doctor.fullName}
                </option>
              ))}
            </select>
            <input
              placeholder="Services rendered"
              value={invoiceForm.services}
              onChange={(event) => setInvoiceForm({ ...invoiceForm, services: event.target.value })}
              required
            />
            <input
              type="number"
              min="1"
              step="0.01"
              placeholder="Total amount"
              value={invoiceForm.amount}
              onChange={(event) => setInvoiceForm({ ...invoiceForm, amount: event.target.value })}
              required
            />
            <select value={invoiceForm.paymentStatus} onChange={(event) => setInvoiceForm({ ...invoiceForm, paymentStatus: event.target.value })}>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="INSURANCE_CLAIM">Insurance Claim</option>
            </select>
            <select value={invoiceForm.deliveryMethod} onChange={(event) => setInvoiceForm({ ...invoiceForm, deliveryMethod: event.target.value })}>
              <option value="PRINT">Print Receipt</option>
              <option value="EMAIL">Email Receipt</option>
            </select>
            <button type="submit">Generate Invoice</button>
          </form>
          {message ? <p className="success">{message}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </section>

        <section className="card">
          <h3>Recent Invoices</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Services</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.id}</td>
                    <td>{invoice.patientName}</td>
                    <td>{invoice.doctorName}</td>
                    <td>${Number(invoice.amount).toFixed(2)}</td>
                    <td>{invoice.paymentStatus}</td>
                    <td>{invoice.services}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" onClick={() => updateInvoiceStatus(invoice.id, 'PAID')}>Mark Paid</button>
                        <button type="button" onClick={() => updateInvoiceStatus(invoice.id, 'PENDING')}>Mark Pending</button>
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

  if (mode === 'walkin') {
    return (
      <div>
        <header className="page-header">
          <h2>Walk-in Registration</h2>
        </header>

        <section className="card">
          <form className="form-grid" onSubmit={registerWalkIn}>
            <input
              placeholder="Patient name"
              value={walkInForm.patientName}
              onChange={(event) => setWalkInForm({ ...walkInForm, patientName: event.target.value })}
              required
            />
            <input
              placeholder="Phone number"
              value={walkInForm.phone}
              onChange={(event) => setWalkInForm({ ...walkInForm, phone: event.target.value })}
            />
            <select
              value={walkInForm.preferredDoctorId}
              onChange={(event) => setWalkInForm({ ...walkInForm, preferredDoctorId: event.target.value })}
              required
            >
              <option value="">Preferred doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
              ))}
            </select>
            <textarea
              placeholder="Concern / chief complaint"
              value={walkInForm.concern}
              onChange={(event) => setWalkInForm({ ...walkInForm, concern: event.target.value })}
              required
            />
            <button type="submit">Register Walk-in</button>
          </form>
          {message ? <p className="success">{message}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </section>

        <section className="card">
          <h3>Walk-in Queue</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Concern</th>
                  <th>Preferred Doctor</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {walkIns.map((item) => (
                  <tr key={item.id}>
                    <td>{item.patientName}</td>
                    <td>{item.concern}</td>
                    <td>{doctors.find((doctor) => doctor.id === item.preferredDoctorId)?.fullName || '—'}</td>
                    <td>{item.bookingInfo}</td>
                    <td>{normalizeDate(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
      <header className="page-header">
        <h2>Patient Check-in</h2>
      </header>

      <section className="card">
        <div className="form-grid">
          <input
            placeholder="Search by name, ID, or phone"
            value={checkInForm.search}
            onChange={(event) => setCheckInForm({ ...checkInForm, search: event.target.value })}
          />
          <select
            value={checkInForm.appointmentId}
            onChange={(event) => setCheckInForm({ ...checkInForm, appointmentId: event.target.value })}
          >
            <option value="">Select appointment</option>
            {filteredCheckInCandidates.map((appointment) => (
              <option key={appointment.id} value={appointment.id}>
                #{appointment.id} | {appointment.patient.firstName} {appointment.patient.lastName} | {appointment.doctor.fullName} | {normalizeDate(appointment.startTime)}
              </option>
            ))}
          </select>
        </div>
        <div className="table-actions" style={{ marginTop: '10px' }}>
          <button type="button" onClick={() => applyCheckInStatus('ARRIVED')}>Mark Arrived</button>
          <button type="button" onClick={() => applyCheckInStatus('IN_CONSULTATION')}>In Consultation</button>
          <button type="button" onClick={() => applyCheckInStatus('DONE')}>Done</button>
        </div>
        {message ? <p className="success">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="card">
        <h3>Live Waiting Room</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Status</th>
                <th>Arrived At</th>
              </tr>
            </thead>
            <tbody>
              {waitingRoom.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.patientName}</td>
                  <td>{entry.doctorName}</td>
                  <td>{entry.status}</td>
                  <td>{normalizeDate(entry.arrivedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
