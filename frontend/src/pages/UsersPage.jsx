import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { userApi } from '../services/api';
import { getAuthValue } from '../services/authStorage';

const roles = ['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PATIENT'];

const initialForm = {
  username: '',
  email: '',
  password: '',
  role: 'RECEPTIONIST',
  enabled: true
};

export default function UsersPage() {
  const role = getAuthValue('role');
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const formSectionRef = useRef(null);
  const usernameInputRef = useRef(null);

  const load = async () => {
    const { data } = await userApi.list();
    setUsers(data);
  };

  useEffect(() => {
    load();
  }, []);

  if (role !== 'ADMIN') {
    return <Navigate to="/app" replace />;
  }

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingId) {
        await userApi.update(editingId, form);
        setSuccess('User updated successfully.');
      } else {
        await userApi.create(form);
        setSuccess('User created successfully.');
      }
      resetForm();
      load();
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to save user.');
    }
  };

  const editUser = (user) => {
    setEditingId(user.id);
    setForm({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      enabled: user.enabled
    });
    setError('');
    setSuccess('');

    // Bring the edit form into view so the action is always visible to the user.
    requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      usernameInputRef.current?.focus();
    });
  };

  const deleteUser = async (user) => {
    setError('');
    setSuccess('');
    try {
      await userApi.remove(user.id);
      if (editingId === user.id) {
        resetForm();
      }
      setSuccess(`Deleted user ${user.username}.`);
      load();
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to delete user.');
    }
  };

  return (
    <div>
      <header className="page-header">
        <h2>User Administration</h2>
        <p>Create, update, and remove platform users across all four roles.</p>
      </header>

      <section className="card" ref={formSectionRef}>
        <form className="form-grid" onSubmit={submit}>
          <input
            ref={usernameInputRef}
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder={editingId ? 'New password (optional)' : 'Password'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={!editingId}
          />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {roles.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            <span>Enabled</span>
          </label>
          <div className="form-actions-inline">
            <button type="submit">{editingId ? 'Update User' : 'Add User'}</button>
            {editingId ? <button type="button" onClick={resetForm}>Cancel Edit</button> : null}
          </div>
        </form>

        {error ? <small className="error">{error}</small> : null}
        {success ? <small className="success">{success}</small> : null}
      </section>

      <section className="card">
        <h3>All Users</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="users-row" onClick={() => editUser(user)}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.enabled ? 'Enabled' : 'Disabled'}</td>
                  <td>{user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button" onClick={(e) => {
                        e.stopPropagation();
                        editUser(user);
                      }}>
                        Edit
                      </button>
                      <button type="button" onClick={(e) => {
                        e.stopPropagation();
                        deleteUser(user);
                      }}>
                        Delete
                      </button>
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