import { useEffect, useState } from 'react';
import { patientChatApi } from '../services/api';

export default function PatientChatbotCard() {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: 'Hello. I am your MediTrack assistant. Ask me about appointments, follow-ups, or how to use this portal.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return undefined;

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading || cooldownSeconds > 0) return;

    const userMessage = { role: 'user', text: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await patientChatApi.message({ message: trimmed });
      setMessages((prev) => [...prev, { role: 'bot', text: data.reply || 'I could not generate a response.' }]);
    } catch (err) {
      if (err?.response?.status === 429) {
        setCooldownSeconds(75);
      }
      setMessages((prev) => [...prev, {
        role: 'bot',
        text: err?.response?.data?.error || 'Assistant is temporarily unavailable. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card patient-chat-card">
      <div className="section-header-row">
        <h3>Patient AI Assistant</h3>
        <small>For appointments, follow-ups, and portal guidance.</small>
      </div>

      <div className="patient-chat-log" aria-live="polite">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`patient-chat-msg ${message.role === 'user' ? 'is-user' : 'is-bot'}`}>
            <span>{message.text}</span>
          </div>
        ))}
        {loading ? <div className="patient-chat-typing">Assistant is thinking...</div> : null}
      </div>

      <div className="patient-chat-input-row">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              send();
            }
          }}
          placeholder={cooldownSeconds > 0
            ? `Rate limit active. Try again in ${cooldownSeconds}s...`
            : 'Ask a question about your care journey...'}
          maxLength={1200}
          disabled={loading || cooldownSeconds > 0}
        />
        <button type="button" onClick={send} disabled={loading || cooldownSeconds > 0}>
          {cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : 'Send'}
        </button>
      </div>
    </section>
  );
}
