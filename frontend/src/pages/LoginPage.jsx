import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { authApi, healthApi, waitForBackendReady } from '../services/api';
import { getAuthValue, setAuthSession } from '../services/authStorage';

const SERVER_UNREACHABLE_MESSAGE = 'Cannot reach server. MediTrack services are not running yet. Use start-meditrack.ps1 or enable auto-start.';

export default function LoginPage() {
  const token = getAuthValue('token');
  const [form, setForm] = useState({ username: 'admin', password: 'Admin@123' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [backendStatus, setBackendStatus] = useState('CHECKING');
  const warmupPromiseRef = useRef(null);
  const navigate = useNavigate();

  if (token) return <Navigate to="/app" replace />;

  useEffect(() => {
    let cancelled = false;
    let timer;

    const ensureBackendReady = () => {
      if (!warmupPromiseRef.current) {
        warmupPromiseRef.current = waitForBackendReady({ timeoutMs: 45000, intervalMs: 350 })
          .finally(() => {
            warmupPromiseRef.current = null;
          });
      }

      return warmupPromiseRef.current;
    };

    const checkBackend = async () => {
      try {
        const { data } = await healthApi.status({ timeout: 1000 });
        if (!cancelled) {
          const nextStatus = data?.status === 'UP' ? 'READY' : 'STARTING';
          setBackendStatus(nextStatus);
          if (nextStatus === 'READY') {
            setError((current) => (current === SERVER_UNREACHABLE_MESSAGE ? '' : current));
          }
          timer = setTimeout(checkBackend, nextStatus === 'READY' ? 15000 : 800);
        }
      } catch {
        if (!cancelled) {
          setBackendStatus('STARTING');
          ensureBackendReady();
          timer = setTimeout(checkBackend, 800);
        }
      }
    };

    checkBackend();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  const backendBadgeClass =
    backendStatus === 'READY'
      ? 'auth-health-badge auth-health-badge--ready'
      : backendStatus === 'CHECKING'
        ? 'auth-health-badge auth-health-badge--checking'
        : 'auth-health-badge auth-health-badge--starting';

  const backendBadgeText =
    backendStatus === 'READY'
      ? 'System ready'
      : backendStatus === 'CHECKING'
        ? 'Checking backend'
        : 'Backend starting';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (backendStatus !== 'READY') {
        const pendingWarmup = warmupPromiseRef.current || waitForBackendReady({ timeoutMs: 45000, intervalMs: 350 });
        warmupPromiseRef.current = pendingWarmup;

        const isReady = await pendingWarmup;
        if (!isReady) {
          setBackendStatus('STARTING');
          setError(SERVER_UNREACHABLE_MESSAGE);
          return;
        }

        setBackendStatus('READY');
      }

      const { data } = await authApi.login(form);
      setAuthSession(data);
      navigate('/app');
    } catch (err) {
      if (!err?.response) {
        setBackendStatus('STARTING');
        // If backend is still booting, reuse pending warm-up and retry once automatically.
        const pendingWarmup = warmupPromiseRef.current || waitForBackendReady({ timeoutMs: 45000, intervalMs: 350 });
        warmupPromiseRef.current = pendingWarmup;
        const isReady = await pendingWarmup;
        if (isReady) {
          try {
            const { data } = await authApi.login(form);
            setAuthSession(data);
            navigate('/app');
            return;
          } catch (retryErr) {
            if (retryErr?.response) {
              setError(retryErr?.response?.data?.error || 'Login failed');
            } else {
              setError(SERVER_UNREACHABLE_MESSAGE);
            }
          }
        } else {
          setError(SERVER_UNREACHABLE_MESSAGE);
        }
      } else {
        setError(err?.response?.data?.error || 'Login failed');
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
            <h2>Empowering care,<br />connecting healers.</h2>
            <p>A unified platform for hospital staff to manage patient journeys, appointments, and clinical notes — all in one place.</p>
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

          <div className="auth-stats">
            <div className="auth-stat">
              <span className="auth-stat__number">2,400+</span>
              <span className="auth-stat__label">Doctors</span>
            </div>
            <div className="auth-stat">
              <span className="auth-stat__number">180K</span>
              <span className="auth-stat__label">Appointments</span>
            </div>
            <div className="auth-stat">
              <span className="auth-stat__number">99.8%</span>
              <span className="auth-stat__label">Uptime</span>
            </div>
          </div>

          <div className="auth-trust-strip">
            {[['🔒','HIPAA'], ['☁️','Cloud'], ['✅','ISO 27001']].map(([icon, label]) => (
              <div className="auth-trust-badge" key={label}>
                <span className="auth-trust-badge__icon">{icon}</span>
                {label}
              </div>
            ))}
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
            <div className="auth-form-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            </div>
            <div>
              <h1>Welcome back</h1>
              <p>Sign in to your account to continue</p>
              <div className={backendBadgeClass} aria-live="polite">
                <span className="auth-health-badge__dot" />
                {backendBadgeText}
              </div>
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

          <form onSubmit={submit} className="auth-form">
            {/* Username */}
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
                  placeholder="Enter your username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                  autoComplete="username"
                />
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
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="current-password"
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
            </div>

            <button
              type="submit"
              className={`auth-submit-btn${loading ? ' auth-submit-btn--loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <><span className="auth-spinner" /> Signing in...</>
              ) : (
                <>
                  Sign In
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="auth-demo-hint">
            <span className="auth-demo-hint__label">Demo credentials</span>
            <code>admin</code> / <code>Admin@123</code>
          </div>

          <div className="auth-footer">
            <p>Need access? Contact an administrator to create your account.</p>
            <p><Link to="/">← Back to home</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
