import { Navigate } from 'react-router-dom';
import PatientChatbotCard from '../components/PatientChatbotCard';
import { getAuthValue } from '../services/authStorage';

export default function AssistancePage() {
  const role = getAuthValue('role');

  if (role !== 'PATIENT') {
    return <Navigate to="/app" replace />;
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h2>Patient Assistance</h2>
          <p>Chat with the AI assistant for appointment and follow-up guidance.</p>
        </div>
      </header>

      <PatientChatbotCard />
    </div>
  );
}
