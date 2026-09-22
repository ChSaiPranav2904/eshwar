import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8087',
});

function getDeviceId() {
  const key = 'fraudshieldDeviceId';
  let value = localStorage.getItem(key);
  if (!value) {
    value = `${navigator.userAgent.slice(0, 40)}-${crypto.randomUUID?.() || Date.now()}`;
    localStorage.setItem(key, value);
  }
  return value;
}

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['X-Device-Id'] = getDeviceId();
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      // Only redirect if not already on login
      if (window.location.pathname !== '/login') {
        toast.error('Session expired. Please log in again.');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
