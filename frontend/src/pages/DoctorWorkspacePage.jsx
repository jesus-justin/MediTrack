import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { appointmentApi, consultationApi, patientApi } from '../services/api';
import { getAuthValue } from '../services/authStorage';
import {
  PORTAL_KEYS,
  appendCollectionItem,
  nextPortalId,
  readCollection,
  upsertCollectionItem
} from '../services/portalStore';

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/dr\.?/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function DoctorWorkspacePage({ mode = 'schedule' }) {
  const role = getAuthValue('role') || 'DOCTOR';
  const username = getAuthValue('username') || '';
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [availability, setAvailability] = useState(() => readCollection(PORTAL_KEYS.AVAILABILITY));
  const [prescriptions, setPrescriptions] = useState(() => readCollection(PORTAL_KEYS.PRESCRIPTIONS));
  const [labRequests, setLabRequests] = useState(() => readCollection(PORTAL_KEYS.LAB_REQUESTS));
  const [referrals, setReferrals] = useState(() => readCollection(PORTAL_KEYS.REFERRALS));
  const [messages, setMessages] = useState(() => readCollection(PORTAL_KEYS.MESSAGES));

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [availabilityForm, setAvailabilityForm] = useState({
    day: 'Monday',
    start: '09:00',
    end: '17:00',
    mode: 'AVAILABLE',
    note: ''
  });
  const [rxForm, setRxForm] = useState({ patientId: '', medication: '', dosage: '', frequency: '', duration: '', notes: '', esign: '' });
  const [labForm, setLabForm] = useState({ patientId: '', testType: 'Blood Work', urgency: 'Routine', notes: '' });
  const [referralForm, setReferralForm] = useState({ patientId: '', specialist: '', urgency: 'Routine', reason: '', notes: '' });
  const [messageForm, setMessageForm] = useState({ recipient: '', recipientRole: 'PATIENT', content: '' });

  useEffect(() => {
    Promise.all([appointmentApi.list(), patientApi.list(''), consultationApi.list()])
      .then(([appointmentRes, patientRes, consultationRes]) => {
        setAppointments(appointmentRes.data || []);
        setPatients(patientRes.data || []);
        setConsultations(consultationRes.data || []);
      })
      .catch(() => {
        setError('Unable to load doctor workspace data.');
      });
  }, []);

  if (role !== 'DOCTOR') {
    return <Navigate to="/app" replace />;
  }

  const scopedAppointments = useMemo(() => {
    const marker = normalizeText(username);
    return appointments
      .filter((appointment) => normalizeText(appointment?.doctor?.fullName).includes(marker))
      .sort((left, right) => new Date(left.startTime) - new Date(right.startTime));
  }, [appointments, username]);

  const scopedPatientIds = useMemo(() => {
    return new Set(scopedAppointments.map((appointment) => appointment.patient?.id).filter(Boolean));
  }, [scopedAppointments]);

  const scopedPatients = useMemo(() => {
    return patients.filter((patient) => scopedPatientIds.has(patient.id));
  }, [patients, scopedPatientIds]);

  const today = new Date().toISOString().slice(0, 10);
  const todayAppointments = scopedAppointments.filter((appointment) => String(appointment.startTime || '').startsWith(today));

  const saveAvailability = (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    const doctorDisplayName = scopedAppointments[0]?.doctor?.fullName || username;

    const entry = {
      id: nextPortalId(PORTAL_KEYS.AVAILABILITY),
      doctorUsername: username,
      doctorDisplayName,
      ...availabilityForm,
      createdAt: new Date().toISOString()
    };

    const updated = appendCollectionItem(PORTAL_KEYS.AVAILABILITY, entry);
    setAvailability(updated);
    setAvailabilityForm({ day: 'Monday', start: '09:00', end: '17:00', mode: 'AVAILABLE', note: '' });
    setMessage('Availability updated. Reception booking board will reflect this schedule.');
  };

  const savePrescription = (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    const patientId = Number(rxForm.patientId);
    if (!patientId || !rxForm.esign.trim()) {
      setError('Patient and e-signature are required to issue prescription.');
      return;
    }

    const patient = patients.find((entry) => entry.id === patientId);
    const record = {
      id: nextPortalId(PORTAL_KEYS.PRESCRIPTIONS),
      patientId,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : `Patient #${patientId}`,
      doctorUsername: username,
      medication: rxForm.medication,
      dosage: rxForm.dosage,
      frequency: rxForm.frequency,
      duration: rxForm.duration,
      notes: rxForm.notes,
      signature: rxForm.esign,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE'
    };

    const updated = appendCollectionItem(PORTAL_KEYS.PRESCRIPTIONS, record);
    setPrescriptions(updated);
    setRxForm({ patientId: '', medication: '', dosage: '', frequency: '', duration: '', notes: '', esign: '' });
    setMessage('Prescription signed and sent to patient portal.');
  };

  const saveLabRequest = (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    const patientId = Number(labForm.patientId);
    if (!patientId) {
      setError('Select patient before ordering lab request.');
      return;
    }

    const patient = patients.find((entry) => entry.id === patientId);
    const request = {
      id: nextPortalId(PORTAL_KEYS.LAB_REQUESTS),
      patientId,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : `Patient #${patientId}`,
      doctorUsername: username,
      testType: labForm.testType,
      urgency: labForm.urgency,
      notes: labForm.notes,
      status: 'SENT',
      createdAt: new Date().toISOString()
    };

    const updated = appendCollectionItem(PORTAL_KEYS.LAB_REQUESTS, request);
    setLabRequests(updated);
    setLabForm({ patientId: '', testType: 'Blood Work', urgency: 'Routine', notes: '' });
    setMessage('Lab request created and sent to lab queue.');
  };

  const updateLabStatus = (id, status) => {
    const current = labRequests.find((entry) => entry.id === id);
    if (!current) return;
    const updated = upsertCollectionItem(PORTAL_KEYS.LAB_REQUESTS, { ...current, status });
    setLabRequests(updated);
  };

  const saveReferral = (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    const patientId = Number(referralForm.patientId);
    if (!patientId || !referralForm.specialist.trim()) {
      setError('Patient and specialist are required.');
      return;
    }

    const patient = patients.find((entry) => entry.id === patientId);
    const referral = {
      id: nextPortalId(PORTAL_KEYS.REFERRALS),
      patientId,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : `Patient #${patientId}`,
      specialist: referralForm.specialist,
      urgency: referralForm.urgency,
      reason: referralForm.reason,
      notes: referralForm.notes,
      doctorUsername: username,
      status: 'SENT',
      createdAt: new Date().toISOString()
    };

    const updated = appendCollectionItem(PORTAL_KEYS.REFERRALS, referral);
    setReferrals(updated);
    setReferralForm({ patientId: '', specialist: '', urgency: 'Routine', reason: '', notes: '' });
    setMessage('Referral sent and tracked.');
  };

  const updateReferralStatus = (id, status) => {
    const current = referrals.find((entry) => entry.id === id);
    if (!current) return;
    const updated = upsertCollectionItem(PORTAL_KEYS.REFERRALS, { ...current, status });
    setReferrals(updated);
  };

  const sendMessage = (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!messageForm.recipient.trim() || !messageForm.content.trim()) {
      setError('Recipient and message content are required.');
      return;
    }

    const payload = {
      id: nextPortalId(PORTAL_KEYS.MESSAGES),
      sender: username,
      senderRole: 'DOCTOR',
      recipient: messageForm.recipient,
      recipientRole: messageForm.recipientRole,
      content: messageForm.content,
      createdAt: new Date().toISOString()
    };

    const updated = appendCollectionItem(PORTAL_KEYS.MESSAGES, payload);
    setMessages(updated);
    setMessageForm({ recipient: '', recipientRole: 'PATIENT', content: '' });
    setMessage('Secure message sent.');
  };

  const inbox = useMemo(() => {
    return messages
      .filter((entry) => entry.sender === username || entry.recipient === username)
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  }, [messages, username]);

  if (mode === 'prescriptions') {
    return (
      <div>
        <header className="page-header"><h2>Write Prescription</h2></header>
        <section className="card">
          <form className="form-grid" onSubmit={savePrescription}>
            <select value={rxForm.patientId} onChange={(event) => setRxForm({ ...rxForm, patientId: event.target.value })} required>
              <option value="">Select assigned patient</option>
              {scopedPatients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.patientCode} - {patient.firstName} {patient.lastName}</option>
              ))}
            </select>
            <input placeholder="Medication name" value={rxForm.medication} onChange={(event) => setRxForm({ ...rxForm, medication: event.target.value })} required />
            <input placeholder="Dosage" value={rxForm.dosage} onChange={(event) => setRxForm({ ...rxForm, dosage: event.target.value })} required />
            <input placeholder="Frequency" value={rxForm.frequency} onChange={(event) => setRxForm({ ...rxForm, frequency: event.target.value })} required />
            <input placeholder="Duration" value={rxForm.duration} onChange={(event) => setRxForm({ ...rxForm, duration: event.target.value })} required />
            <textarea placeholder="Notes" value={rxForm.notes} onChange={(event) => setRxForm({ ...rxForm, notes: event.target.value })} />
            <input placeholder="E-signature (type full name)" value={rxForm.esign} onChange={(event) => setRxForm({ ...rxForm, esign: event.target.value })} required />
            <button type="submit">Sign & Save</button>
          </form>
          {message ? <p className="success">{message}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </section>

        <section className="card">
          <h3>Prescription History</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Patient</th><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Date</th></tr></thead>
              <tbody>
                {prescriptions.filter((entry) => entry.doctorUsername === username).map((entry) => (
                  <tr key={entry.id}><td>{entry.patientName}</td><td>{entry.medication}</td><td>{entry.dosage}</td><td>{entry.frequency}</td><td>{formatDateTime(entry.createdAt)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  if (mode === 'labs') {
    return (
      <div>
        <header className="page-header"><h2>Lab Requests</h2></header>
        <section className="card">
          <form className="form-grid" onSubmit={saveLabRequest}>
            <select value={labForm.patientId} onChange={(event) => setLabForm({ ...labForm, patientId: event.target.value })} required>
              <option value="">Select patient</option>
              {scopedPatients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.patientCode} - {patient.firstName} {patient.lastName}</option>
              ))}
            </select>
            <select value={labForm.testType} onChange={(event) => setLabForm({ ...labForm, testType: event.target.value })}>
              <option>Blood Work</option>
              <option>Urinalysis</option>
              <option>Imaging</option>
              <option>ECG</option>
            </select>
            <select value={labForm.urgency} onChange={(event) => setLabForm({ ...labForm, urgency: event.target.value })}>
              <option>Routine</option>
              <option>Priority</option>
              <option>Urgent</option>
            </select>
            <textarea placeholder="Instructions" value={labForm.notes} onChange={(event) => setLabForm({ ...labForm, notes: event.target.value })} />
            <button type="submit">Order Test</button>
          </form>
        </section>

        <section className="card">
          <h3>Requests & Results Workflow</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Patient</th><th>Test</th><th>Urgency</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {labRequests.filter((entry) => entry.doctorUsername === username).map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.patientName}</td>
                    <td>{entry.testType}</td>
                    <td>{entry.urgency}</td>
                    <td>{entry.status}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" onClick={() => updateLabStatus(entry.id, 'REVIEWED')}>Reviewed</button>
                        <button type="button" onClick={() => updateLabStatus(entry.id, 'FOLLOW_UP')}>Needs Follow-up</button>
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

  if (mode === 'referrals') {
    return (
      <div>
        <header className="page-header"><h2>Referrals</h2></header>
        <section className="card">
          <form className="form-grid" onSubmit={saveReferral}>
            <select value={referralForm.patientId} onChange={(event) => setReferralForm({ ...referralForm, patientId: event.target.value })} required>
              <option value="">Select patient</option>
              {scopedPatients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.patientCode} - {patient.firstName} {patient.lastName}</option>
              ))}
            </select>
            <input placeholder="Specialist / Provider" value={referralForm.specialist} onChange={(event) => setReferralForm({ ...referralForm, specialist: event.target.value })} required />
            <select value={referralForm.urgency} onChange={(event) => setReferralForm({ ...referralForm, urgency: event.target.value })}>
              <option>Routine</option>
              <option>Priority</option>
              <option>Urgent</option>
            </select>
            <input placeholder="Reason" value={referralForm.reason} onChange={(event) => setReferralForm({ ...referralForm, reason: event.target.value })} required />
            <textarea placeholder="Referral notes" value={referralForm.notes} onChange={(event) => setReferralForm({ ...referralForm, notes: event.target.value })} />
            <button type="submit">Send Referral</button>
          </form>
        </section>

        <section className="card">
          <h3>Referral Tracking</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Patient</th><th>Specialist</th><th>Urgency</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {referrals.filter((entry) => entry.doctorUsername === username).map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.patientName}</td>
                    <td>{entry.specialist}</td>
                    <td>{entry.urgency}</td>
                    <td>{entry.status}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" onClick={() => updateReferralStatus(entry.id, 'ACCEPTED')}>Accepted</button>
                        <button type="button" onClick={() => updateReferralStatus(entry.id, 'COMPLETED')}>Completed</button>
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

  if (mode === 'messages') {
    return (
      <div>
        <header className="page-header"><h2>Messages</h2></header>
        <section className="card">
          <form className="form-grid" onSubmit={sendMessage}>
            <input placeholder="Recipient username" value={messageForm.recipient} onChange={(event) => setMessageForm({ ...messageForm, recipient: event.target.value })} required />
            <select value={messageForm.recipientRole} onChange={(event) => setMessageForm({ ...messageForm, recipientRole: event.target.value })}>
              <option value="PATIENT">Patient</option>
              <option value="RECEPTIONIST">Receptionist</option>
              <option value="DOCTOR">Doctor</option>
            </select>
            <textarea placeholder="Secure message" value={messageForm.content} onChange={(event) => setMessageForm({ ...messageForm, content: event.target.value })} required />
            <button type="submit">Send Message</button>
          </form>
          {message ? <p className="success">{message}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </section>

        <section className="card">
          <h3>Conversation Log</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>From</th><th>To</th><th>Message</th><th>Time</th></tr></thead>
              <tbody>
                {inbox.map((entry) => (
                  <tr key={entry.id}><td>{entry.sender}</td><td>{entry.recipient}</td><td>{entry.content}</td><td>{formatDateTime(entry.createdAt)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  const myAvailability = availability.filter((entry) => entry.doctorUsername === username);
  const unsignedNotes = consultations.filter((entry) => !entry.notes || String(entry.notes).length < 20).length;

  return (
    <div>
      <header className="page-header"><h2>My Schedule</h2></header>

      <section className="card">
        <h3>Today at a Glance</h3>
        <div className="status-monitor-grid">
          <div className="card status-monitor-card" style={{ marginBottom: 0, borderColor: '#0f766e' }}>
            <h4>Today Patients</h4>
            <div className="monitor-count" style={{ color: '#0f766e' }}>{todayAppointments.length}</div>
          </div>
          <div className="card status-monitor-card" style={{ marginBottom: 0, borderColor: '#2563eb' }}>
            <h4>Pending Tasks</h4>
            <div className="monitor-count" style={{ color: '#2563eb' }}>{unsignedNotes}</div>
          </div>
          <div className="card status-monitor-card" style={{ marginBottom: 0, borderColor: '#f59e0b' }}>
            <h4>Needs Review</h4>
            <div className="monitor-count" style={{ color: '#f59e0b' }}>{labRequests.filter((entry) => entry.doctorUsername === username && entry.status !== 'REVIEWED').length}</div>
          </div>
          <div className="card status-monitor-card" style={{ marginBottom: 0, borderColor: '#7c3aed' }}>
            <h4>Referrals Open</h4>
            <div className="monitor-count" style={{ color: '#7c3aed' }}>{referrals.filter((entry) => entry.doctorUsername === username && entry.status !== 'COMPLETED').length}</div>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>Set Availability / Block Time</h3>
        <form className="form-grid" onSubmit={saveAvailability}>
          <select value={availabilityForm.day} onChange={(event) => setAvailabilityForm({ ...availabilityForm, day: event.target.value })}>
            <option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option>Saturday</option><option>Sunday</option>
          </select>
          <input type="time" value={availabilityForm.start} onChange={(event) => setAvailabilityForm({ ...availabilityForm, start: event.target.value })} required />
          <input type="time" value={availabilityForm.end} onChange={(event) => setAvailabilityForm({ ...availabilityForm, end: event.target.value })} required />
          <select value={availabilityForm.mode} onChange={(event) => setAvailabilityForm({ ...availabilityForm, mode: event.target.value })}>
            <option value="AVAILABLE">Available window</option>
            <option value="BLOCKED">Blocked time</option>
          </select>
          <input placeholder="Note (lunch, vacation, admin block)" value={availabilityForm.note} onChange={(event) => setAvailabilityForm({ ...availabilityForm, note: event.target.value })} />
          <button type="submit">Save Schedule Block</button>
        </form>
      </section>

      <section className="card">
        <h3>My Calendar Entries</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Type</th><th>Details</th><th>When</th><th>Status</th></tr></thead>
            <tbody>
              {todayAppointments.map((appointment) => (
                <tr key={`appt-${appointment.id}`}>
                  <td>Appointment</td>
                  <td>{appointment.patient.firstName} {appointment.patient.lastName}</td>
                  <td>{formatDateTime(appointment.startTime)}</td>
                  <td>{appointment.status}</td>
                </tr>
              ))}
              {myAvailability.map((entry) => (
                <tr key={`availability-${entry.id}`}>
                  <td>Availability</td>
                  <td>{entry.note || 'Clinic schedule'} ({entry.mode || 'AVAILABLE'})</td>
                  <td>{entry.day} {entry.start} - {entry.end}</td>
                  <td>Configured</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {message ? <p className="success">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </section>
    </div>
  );
}
