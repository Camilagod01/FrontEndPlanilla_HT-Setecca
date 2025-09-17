import axios from 'axios';

// Detecta si estamos corriendo con Vite en puerto 5173
const isViteDev = window.location.hostname === 'localhost' && window.location.port === '5173';

const API_BASE = isViteDev
  ? 'http://127.0.0.1:8000/api' // back con artisan
  : 'http://localhost:8080/BackEnd_HT_Setecca/public/api'; // back con Apache

console.log('API_BASE =', API_BASE);

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers.Accept = 'application/json';
  return config;
});

export default api;



