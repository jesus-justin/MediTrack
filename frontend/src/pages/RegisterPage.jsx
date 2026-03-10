import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';

const roles = ['RECEPTIONIST', 'DOCTOR', 'PATIENT'];

export default function RegisterPage() {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'RECEPTIONIST'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (token) return <Navigate to="/app" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const { data } = await authApi.register(form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role);
      setSuccess('Registration successful. Redirecting...');
      setTimeout(() => navigate('/app'), 500);
    } catch (err) {
      setError(err?.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="login-screen">
      <div className="login-orb" />
      <form className="login-card glass" onSubmit={submit}>
        <h1>Create Account</h1>
        <p>Set up a MediTrack user profile</p>

        <label>Username</label>
        <input
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          required
        />

        <label>Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />

        <label>Password</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />

        <label>Role</label>
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {roles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        {error ? <small className="error">{error}</small> : null}
        {success ? <small className="success">{success}</small> : null}

        <button type="submit">Register</button>
        <small>
          Already have an account? <Link to="/login">Login</Link>
        </small>
      </form>
    </div>
  );
}
