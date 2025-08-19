import axios from 'axios';

const baseURL = import.meta.env.VITE_APP_API_URL || 'http://localhost:3001';

console.log(`Frontend a conectar-se à API em ${baseURL}`);

const api = axios.create({
  baseURL: baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;