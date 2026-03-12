import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { getAuthValue, setAuthSession } from '../services/authStorage';

export default function LoginPage() {
  const token = getAuthValue('token');
  const [form, setForm] = useState({ username: 'admin', password: 'Admin@123' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  if (token) return <Navigate to="/app" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await authApi.login(form);
      setAuthSession(data);
      navigate('/app');
    } catch (err) {
      if (!err?.response) {
        setError('Cannot reach server. Please wait a few seconds and try again.');
        return;
      }
      setError(err?.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="login-screen">
      <div className="login-orb" />
      <form className="login-card glass" onSubmit={submit}>
        <h1>MediTrack</h1>
        <p>Sign in to manage patient journeys</p>
        <label>Username</label>
        <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <label>Password</label>
        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error ? <small className="error">{error}</small> : null}
        <button type="submit">Login</button>
        <small>
          New here? <Link to="/register">Create account</Link>
        </small>
        <small>
          <Link to="/">Back to landing page</Link>
        </small>
      </form>
    </div>
  );
}
