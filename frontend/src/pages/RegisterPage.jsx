import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { getAuthValue, setAuthSession } from '../services/authStorage';

const ROLE_OPTIONS = [
  { value: 'RECEPTIONIST', label: 'Receptionist', icon: '🏥', desc: 'Front desk & scheduling' },
  { value: 'DOCTOR',       label: 'Doctor',       icon: '⚕️', desc: 'Clinical diagnosis & notes' },
  { value: 'PATIENT',      label: 'Patient',      icon: '🩺', desc: 'Access your health records' },
];

function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)             score++;
  if (/[A-Z]/.test(pw))           score++;
  if (/[0-9]/.test(pw))           score++;
  if (/[^A-Za-z0-9]/.test(pw))   score++;
  if (score <= 1) return { score, label: 'Weak',   color: '#ef4444' };
  if (score === 2) return { score, label: 'Fair',   color: '#f59e0b' };
  if (score === 3) return { score, label: 'Good',   color: '#10b981' };
  return               { score: 4, label: 'Strong', color: '#059669' };
}

export default function RegisterPage() {
  const token = getAuthValue('token');
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'RECEPTIONIST' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  if (token) return <Navigate to="/app" replace />;

  const pwStrength = getPasswordStrength(form.password);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { data } = await authApi.register(form);
      setAuthSession(data);
      setSuccess('Account created! Redirecting…');
      setTimeout(() => navigate('/app'), 800);
    } catch (err) {
      if (!err?.response) {
        setError('Cannot reach server. Please start the backend API at http://localhost:8080 and try again.');
      } else {
        setError(err?.response?.data?.error || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* ── Left brand panel ── */}
      <div className="auth-brand-panel">
        <div className="auth-brand-panel__inner">
          <div className="auth-logo">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="10" fill="rgba(255,255,255,0.15)" />
              <path d="M18 8v20M8 18h20" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
            <span>MediTrack</span>
          </div>

          <div className="auth-brand-panel__content">
            <h2>Join the future<br />of healthcare.</h2>
            <p>Create your account and become part of a community transforming patient care through technology.</p>
          </div>

          <div className="auth-feature-list">
            {[
              { icon: '🔒', text: 'HIPAA-compliant data security' },
              { icon: '📊', text: 'Real-time analytics dashboard' },
              { icon: '📱', text: 'Works on any device, anywhere' },
              { icon: '⚡', text: 'Instant appointment scheduling' },
            ].map((item) => (
              <div className="auth-feature-item" key={item.text}>
                <span className="auth-feature-item__icon">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          <div className="auth-ecg-wrapper">
            <svg className="auth-ecg" viewBox="0 0 600 80" preserveAspectRatio="none">
              <path
                className="auth-ecg-line"
                pathLength="1000"
                d="M0,40 L55,40 L75,40 L88,10 L100,70 L112,18 L122,40 L165,40 L185,40 L195,13 L207,67 L218,22 L228,40 L285,40 L305,40 L316,7 L328,73 L340,16 L350,40 L405,40 L425,40 L436,11 L448,69 L460,20 L470,40 L525,40 L545,40 L556,14 L568,66 L580,24 L590,40 L600,40"
                fill="none"
                stroke="rgba(255,255,255,0.75)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
        <div className="auth-brand-deco auth-brand-deco--1" />
        <div className="auth-brand-deco auth-brand-deco--2" />
        <div className="auth-brand-deco auth-brand-deco--3" />
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-form-panel">
        <div className="auth-form-panel__inner">
          <div className="auth-form-header">
            <div className="auth-form-icon auth-form-icon--register">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            </div>
            <div>
              <h1>Create account</h1>
              <p>Set up your MediTrack profile</p>
            </div>
          </div>

          {error && (
            <div className="auth-alert auth-alert--error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}
          {success && (
            <div className="auth-alert auth-alert--success">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              {success}
            </div>
          )}

          <form onSubmit={submit} className="auth-form">
            {/* Username + Email row */}
            <div className="auth-form-row">
              <div className="auth-field">
                <label className="auth-field__label">Username</label>
                <div className="auth-field__input-wrap">
                  <span className="auth-field__icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    className="auth-field__input"
                    placeholder="Choose a username"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-field__label">Email</label>
                <div className="auth-field__input-wrap">
                  <span className="auth-field__icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <input
                    className="auth-field__input"
                    type="email"
                    placeholder="you@hospital.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="auth-field">
              <label className="auth-field__label">Password</label>
              <div className="auth-field__input-wrap">
                <span className="auth-field__icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  className="auth-field__input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="new-password"
                />
                <button type="button" className="auth-field__toggle" onClick={() => setShowPw(!showPw)} aria-label="Toggle password visibility">
                  {showPw ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              {form.password && (
                <div className="auth-pw-strength">
                  <div className="auth-pw-strength__bars">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="auth-pw-strength__bar"
                        style={{ background: i <= pwStrength.score ? pwStrength.color : '#e2e8f0' }}
                      />
                    ))}
                  </div>
                  <span className="auth-pw-strength__label" style={{ color: pwStrength.color }}>
                    {pwStrength.label}
                  </span>
                </div>
              )}

              <ul className="auth-pw-reqs">
                {[
                  { ok: form.password.length >= 8,       text: 'At least 8 characters' },
                  { ok: /[A-Z]/.test(form.password),     text: 'One uppercase letter' },
                  { ok: /[0-9]/.test(form.password),     text: 'One number' },
                  { ok: /[^A-Za-z0-9]/.test(form.password), text: 'One special character' },
                ].map(({ ok, text }) => (
                  <li key={text} className={`auth-pw-reqs__item${ok ? ' auth-pw-reqs__item--met' : ''}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      {ok
                        ? <polyline points="20 6 9 17 4 12" />
                        : <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>}
                    </svg>
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            {/* Role selector */}
            <div className="auth-field">
              <label className="auth-field__label">Role</label>
              <div className="auth-role-selector">
                {ROLE_OPTIONS.map((r) => (
                  <label
                    key={r.value}
                    className={`auth-role-option${form.role === r.value ? ' auth-role-option--selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={form.role === r.value}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                    />
                    <span className="auth-role-option__icon">{r.icon}</span>
                    <span className="auth-role-option__label">{r.label}</span>
                    <span className="auth-role-option__desc">{r.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className={`auth-submit-btn${loading ? ' auth-submit-btn--loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <><span className="auth-spinner" /> Creating account…</>
              ) : (
                <>
                  Create Account
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/login">Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
