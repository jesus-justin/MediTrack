import axios from 'axios';

const API_BASE = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: (payload) => api.post('/auth/login', payload),
  register: (payload) => api.post('/auth/register', payload)
};

export const patientApi = {
  list: (q) => api.get('/patients', { params: { q } }),
  create: (payload) => api.post('/patients', payload)
};

export const doctorApi = {
  list: (q) => api.get('/doctors', { params: { q } }),
  create: (payload) => api.post('/doctors', payload),
  workload: () => api.get('/doctors/workload')
};

export const appointmentApi = {
  list: () => api.get('/appointments'),
  create: (payload) => api.post('/appointments', payload),
  updateStatus: (id, status) => api.patch(`/appointments/${id}/status`, null, { params: { status } })
};

export const consultationApi = {
  create: (appointmentId, payload) => api.post(`/consultations/${appointmentId}`, payload),
  timeline: (patientId) => api.get(`/consultations/timeline/${patientId}`)
};

export const analyticsApi = {
  dashboard: () => api.get('/analytics/dashboard')
};

export default api;
