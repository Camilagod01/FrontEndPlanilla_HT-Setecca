import axios from 'axios';

const API_BASE =
  window.location.port === '5173'
    ? 'http://127.0.0.1:8000/api' // cuando usas Vite (desarrollo)
    : 'http://localhost:8080/BackEnd_HT_Setecca/public/api'; // cuando abre bajo Apache

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false, // usamos Bearer token
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers.Accept = 'application/json';
  return config;
});

export default api;