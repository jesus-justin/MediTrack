import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { appointmentApi, consultationApi, doctorApi } from '../services/api';
import { getAuthValue } from '../services/authStorage';
import {
  PORTAL_KEYS,
  appendCollectionItem,
  nextPortalId,
  readCollection,
  upsertCollectionItem,
  writePortalValue
} from '../services/portalStore';

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function parsePatientId(value) {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export default function PatientWorkspacePage({ mode = 'records' }) {
  const role = getAuthValue('role') || 'PATIENT';
  const username = getAuthValue('username') || '';

  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [profile, setProfile] = useState(() => {
    const saved = readCollection(PORTAL_KEYS.PATIENT_PROFILE).find((entry) => entry.username === username);
    return saved || {
      id: nextPortalId(PORTAL_KEYS.PATIENT_PROFILE),
      username,
      patientId: '',
      fullName: '',
      contactNumber: '',
      address: '',
      insurance: '',
      emergencyContact: '',
      notifications: true,
      preferredChannel: 'EMAIL'
    };
  });

  const [prescriptions, setPrescriptions] = useState(() => readCollection(PORTAL_KEYS.PRESCRIPTIONS));
  const [bills, setBills] = useState(() => readCollection(PORTAL_KEYS.PATIENT_BILLS));
  const [messages, setMessages] = useState(() => readCollection(PORTAL_KEYS.MESSAGES));
  const [refillRequests, setRefillRequests] = useState(() => readCollection(PORTAL_KEYS.REFILL_REQUESTS));
  const [timelineRows, setTimelineRows] = useState([]);

  const [messageForm, setMessageForm] = useState({ recipient: '', recipientRole: 'DOCTOR', content: '' });
  const [newAppointment, setNewAppointment] = useState({ doctorId: '', startTime: '', endTime: '', reason: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([appointmentApi.list(), doctorApi.list('')])
      .then(([appointmentRes, doctorRes]) => {
        setAppointments(appointmentRes.data || []);
        setDoctors(doctorRes.data || []);
      })
      .catch(() => {
        setError('Unable to load patient workspace data right now.');
      });
  }, []);

  if (role !== 'PATIENT') {
    return <Navigate to="/app" replace />;
  }

  const patientId = parsePatientId(profile.patientId);

  const myAppointments = useMemo(() => {
    if (!patientId) return [];
    return appointments
      .filter((appointment) => appointment.patient?.id === patientId)
      .sort((left, right) => new Date(right.startTime) - new Date(left.startTime));
  }, [appointments, patientId]);

  const myPrescriptions = useMemo(() => {
    if (!patientId) return [];
    return prescriptions.filter((entry) => entry.patientId === patientId);
  }, [prescriptions, patientId]);

  const myBills = useMemo(() => {
    if (!patientId) return [];
    return bills.filter((entry) => entry.patientId === patientId);
  }, [bills, patientId]);

  const myMessages = useMemo(() => {
    return messages
      .filter((entry) => entry.sender === username || entry.recipient === username)
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  }, [messages, username]);

  const saveProfile = (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    const list = readCollection(PORTAL_KEYS.PATIENT_PROFILE);
    const withoutCurrent = list.filter((entry) => entry.username !== username);
    writePortalValue(PORTAL_KEYS.PATIENT_PROFILE, [{ ...profile, username }, ...withoutCurrent]);
    setMessage('Profile saved.');
  };

  const sendMessage = (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!messageForm.recipient.trim() || !messageForm.content.trim()) {
      setError('Recipient and message are required.');
      return;
    }

    const payload = {
      id: nextPortalId(PORTAL_KEYS.MESSAGES),
      sender: username,
      senderRole: 'PATIENT',
      recipient: messageForm.recipient,
      recipientRole: messageForm.recipientRole,
      content: messageForm.content,
      createdAt: new Date().toISOString()
    };

    const updated = appendCollectionItem(PORTAL_KEYS.MESSAGES, payload);
    setMessages(updated);
    setMessageForm({ recipient: '', recipientRole: 'DOCTOR', content: '' });
    setMessage('Message sent.');
  };

  const requestRefill = (prescriptionId) => {
    const record = prescriptions.find((entry) => entry.id === prescriptionId);
    if (!record) return;

    const refill = {
      id: nextPortalId(PORTAL_KEYS.REFILL_REQUESTS),
      prescriptionId,
      patientId,
      patientUsername: username,
      medication: record.medication,
      status: 'REQUESTED',
      createdAt: new Date().toISOString()
    };

    const updated = appendCollectionItem(PORTAL_KEYS.REFILL_REQUESTS, refill);
    setRefillRequests(updated);
    setMessage(`Refill request sent for ${record.medication}.`);
  };

  const payBill = (billId) => {
    const current = bills.find((entry) => entry.id === billId);
    if (!current) return;
    const updated = upsertCollectionItem(PORTAL_KEYS.PATIENT_BILLS, { ...current, paymentStatus: 'PAID' });
    setBills(updated);
    setMessage(`Bill #${billId} marked as paid.`);
  };

  const loadTimeline = async () => {
    if (!patientId) {
      setError('Set your Patient ID in My Profile first.');
      return;
    }

    try {
      const { data } = await consultationApi.timeline(patientId);
      setTimelineRows(data || []);
    } catch {
      setTimelineRows([]);
    }
  };

  const bookAppointment = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!patientId) {
      setError('Set your Patient ID in My Profile before booking appointments.');
      return;
    }

    try {
      await appointmentApi.create({
        patientId,
        doctorId: Number(newAppointment.doctorId),
        startTime: newAppointment.startTime,
        endTime: newAppointment.endTime,
        reason: newAppointment.reason,
        notes: 'Booked by patient portal'
      });
      setMessage('Appointment booked successfully.');
      setNewAppointment({ doctorId: '', startTime: '', endTime: '', reason: '' });
      const refreshed = await appointmentApi.list();
      setAppointments(refreshed.data || []);
    } catch {
      setError('Could not book appointment. Please verify doctor and slot availability.');
    }
  };

  if (mode === 'profile') {
    return (
      <div>
        <header className="page-header"><h2>My Profile</h2></header>
        <section className="card">
          <form className="form-grid" onSubmit={saveProfile}>
            <input placeholder="Patient ID" value={profile.patientId} onChange={(event) => setProfile({ ...profile, patientId: event.target.value })} required />
            <input placeholder="Full name" value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} required />
            <input placeholder="Contact number" value={profile.contactNumber} onChange={(event) => setProfile({ ...profile, contactNumber: event.target.value })} />
            <input placeholder="Address" value={profile.address} onChange={(event) => setProfile({ ...profile, address: event.target.value })} />
            <input placeholder="Insurance information" value={profile.insurance} onChange={(event) => setProfile({ ...profile, insurance: event.target.value })} />
            <input placeholder="Emergency contact" value={profile.emergencyContact} onChange={(event) => setProfile({ ...profile, emergencyContact: event.target.value })} />
            <select value={profile.preferredChannel} onChange={(event) => setProfile({ ...profile, preferredChannel: event.target.value })}>
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
              <option value="APP">In-app</option>
            </select>
            <label className="checkbox-row">
              <input type="checkbox" checked={profile.notifications} onChange={(event) => setProfile({ ...profile, notifications: event.target.checked })} />
              <span>Enable notifications</span>
            </label>
            <button type="submit">Save Profile</button>
          </form>
          {message ? <p className="success">{message}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </section>
      </div>
    );
  }

  if (mode === 'messages') {
    return (
      <div>
        <header className="page-header"><h2>Messages</h2></header>
        <section className="card">
          <form className="form-grid" onSubmit={sendMessage}>
            <input placeholder="Recipient username" value={messageForm.recipient} onChange={(event) => setMessageForm({ ...messageForm, recipient: event.target.value })} required />
            <select value={messageForm.recipientRole} onChange={(event) => setMessageForm({ ...messageForm, recipientRole: event.target.value })}>
              <option value="DOCTOR">Doctor</option>
              <option value="RECEPTIONIST">Receptionist</option>
            </select>
            <textarea placeholder="Message" value={messageForm.content} onChange={(event) => setMessageForm({ ...messageForm, content: event.target.value })} required />
            <button type="submit">Send Message</button>
          </form>
        </section>
        <section className="card">
          <h3>Conversation History</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>From</th><th>To</th><th>Message</th><th>Date</th></tr></thead>
              <tbody>{myMessages.map((entry) => <tr key={entry.id}><td>{entry.sender}</td><td>{entry.recipient}</td><td>{entry.content}</td><td>{formatDateTime(entry.createdAt)}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  if (mode === 'prescriptions') {
    return (
      <div>
        <header className="page-header"><h2>Prescriptions</h2></header>
        <section className="card">
          <h3>Active & Past Prescriptions</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Prescribed</th><th>Actions</th></tr></thead>
              <tbody>
                {myPrescriptions.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.medication}</td>
                    <td>{entry.dosage}</td>
                    <td>{entry.frequency}</td>
                    <td>{formatDateTime(entry.createdAt)}</td>
                    <td><button type="button" onClick={() => requestRefill(entry.id)}>Request Refill</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card">
          <h3>Refill Requests</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Medication</th><th>Status</th><th>Requested</th></tr></thead>
              <tbody>{refillRequests.filter((entry) => entry.patientUsername === username).map((entry) => <tr key={entry.id}><td>{entry.medication}</td><td>{entry.status}</td><td>{formatDateTime(entry.createdAt)}</td></tr>)}</tbody>
            </table>
          </div>
          {message ? <p className="success">{message}</p> : null}
        </section>
      </div>
    );
  }

  if (mode === 'bills') {
    const outstanding = myBills.filter((entry) => entry.paymentStatus !== 'PAID').reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    return (
      <div>
        <header className="page-header"><h2>My Bills</h2></header>
        <section className="card"><h3>Outstanding Balance: ${outstanding.toFixed(2)}</h3></section>
        <section className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Invoice</th><th>Amount</th><th>Status</th><th>Insurance</th><th>Actions</th></tr></thead>
              <tbody>
                {myBills.map((entry) => (
                  <tr key={entry.id}>
                    <td>#{entry.id}</td>
                    <td>${Number(entry.amount).toFixed(2)}</td>
                    <td>{entry.paymentStatus}</td>
                    <td>{entry.paymentStatus === 'INSURANCE_CLAIM' ? 'In Review' : 'N/A'}</td>
                    <td>{entry.paymentStatus !== 'PAID' ? <button type="button" onClick={() => payBill(entry.id)}>Pay Now</button> : 'Paid'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {message ? <p className="success">{message}</p> : null}
        </section>
      </div>
    );
  }

  if (mode === 'records') {
    return (
      <div>
        <header className="page-header"><h2>My Health Records</h2></header>
        <section className="card">
          <div className="table-actions">
            <button type="button" onClick={loadTimeline}>Load Timeline</button>
          </div>
          {!patientId ? <p className="error">Set your Patient ID in My Profile to load records.</p> : null}
        </section>

        <section className="card">
          <h3>Diagnoses & Visit Summary</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Diagnosis</th><th>Prescription</th><th>Summary</th></tr></thead>
              <tbody>
                {timelineRows.map((entry, index) => (
                  <tr key={`${entry.createdAt}-${index}`}>
                    <td>{formatDateTime(entry.createdAt)}</td>
                    <td>{entry.diagnosis}</td>
                    <td>{entry.prescription}</td>
                    <td>{entry.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h3>Book Appointment</h3>
          <form className="form-grid" onSubmit={bookAppointment}>
            <select value={newAppointment.doctorId} onChange={(event) => setNewAppointment({ ...newAppointment, doctorId: event.target.value })} required>
              <option value="">Select doctor</option>
              {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>)}
            </select>
            <input type="datetime-local" value={newAppointment.startTime} onChange={(event) => setNewAppointment({ ...newAppointment, startTime: event.target.value })} required />
            <input type="datetime-local" value={newAppointment.endTime} onChange={(event) => setNewAppointment({ ...newAppointment, endTime: event.target.value })} required />
            <input placeholder="Reason" value={newAppointment.reason} onChange={(event) => setNewAppointment({ ...newAppointment, reason: event.target.value })} required />
            <button type="submit">Book Appointment</button>
          </form>
          {message ? <p className="success">{message}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </section>

        <section className="card">
          <h3>My Appointment History</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Doctor</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {myAppointments.map((entry) => (
                  <tr key={entry.id}><td>{entry.id}</td><td>{entry.doctor?.fullName}</td><td>{formatDateTime(entry.startTime)}</td><td>{entry.status}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return null;
}
