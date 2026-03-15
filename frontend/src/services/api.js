import axios from 'axios';
import { getAuthValue } from './authStorage';

const API_HOST = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const API_BASE = import.meta.env.VITE_API_BASE_URL || `http://${API_HOST}:8081/api`;
const DEFAULT_BACKEND_WAIT_ATTEMPTS = 15;
const DEFAULT_BACKEND_WAIT_DELAY_MS = 2000;

const api = axios.create({
  baseURL: API_BASE
});

api.interceptors.request.use((config) => {
  const token = getAuthValue('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: (payload) => api.post('/auth/login', payload)
};

export const userApi = {
  list: () => api.get('/users'),
  create: (payload) => api.post('/users', payload),
  update: (id, payload) => api.put(`/users/${id}`, payload),
  remove: (id) => api.delete(`/users/${id}`)
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
  updateStatus: (id, status) => api.patch(`/appointments/${id}/status`, null, { params: { status } }),
  arrange: (id, payload) => api.patch(`/appointments/${id}/arrange`, payload),
  receptionSlots: ({ doctorId, date, durationMinutes = 30, limit = 8 }) =>
    api.get('/appointments/reception/slots', { params: { doctorId, date, durationMinutes, limit } })
};

export const consultationApi = {
  list: () => api.get('/consultations'),
  create: (appointmentId, payload) => api.post(`/consultations/${appointmentId}`, payload),
  timeline: (patientId) => api.get(`/consultations/timeline/${patientId}`)
};

export const analyticsApi = {
  dashboard: () => api.get('/analytics/dashboard')
};

export const healthApi = {
  status: () => api.get('/health')
};

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

export const waitForBackendReady = async ({ attempts = DEFAULT_BACKEND_WAIT_ATTEMPTS, delayMs = DEFAULT_BACKEND_WAIT_DELAY_MS } = {}) => {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const { data } = await api.get('/health', { timeout: 3000 });
      if (data?.status === 'UP') {
        return true;
      }
    } catch {
      // Ignore transient startup failures and retry.
    }

    if (i < attempts - 1) {
      await sleep(delayMs);
    }
  }

  return false;
};

export const notificationApi = {
  doctorUpcoming: () => api.get('/notifications/doctor-upcoming'),
  patientReminders: () => api.get('/notifications/patient-reminders')
};

export const patientChatApi = {
  message: (payload) => api.post('/patient-chatbot/message', payload)
};

export const adminAnalyticsApi = {
  systemStats: () => api.get('/admin/system-stats')
};

export const adminPanelApi = {
  search: (q) => api.get('/admin/search', { params: { q } }),
  audit: (limit = 20) => api.get('/admin/audit', { params: { limit } }),
  reportsSummary: () => api.get('/admin/reports/summary'),
  reportsSummaryCsv: () => api.get('/admin/reports/summary.csv', { responseType: 'blob' }),
  runMaintenance: () => api.post('/admin/workflows/run-maintenance')
};

export default api;
