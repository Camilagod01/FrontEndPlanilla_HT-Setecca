/*import axios from 'axios';

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
*/








/*
// src/lib/api.ts  (FRONTEND)
import axios, { AxiosHeaders, InternalAxiosRequestConfig } from "axios";

const API_BASE = import.meta.env.VITE_API_BASE;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false, // si usas Sanctum por cookies → true
});

// Interceptor compatible con Axios v1 (tipos y headers seguros)
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Asegurar que headers exista y sea settable
  if (!config.headers) {
    config.headers = new AxiosHeaders();
  }

  const setHeader = (k: string, v: string) => {
    if (config.headers instanceof AxiosHeaders) {
      config.headers.set(k, v);
    } else {
      // Fallback por si el tipo es objeto plano
      (config.headers as Record<string, string>)[k] = v;
    }
  };

  // No poner Authorization en /login o /register
  const url = String(config.url ?? "");
  const isAuthFree = url.includes("/login") || url.includes("/register");

  setHeader("Accept", "application/json");

  if (!isAuthFree) {
    const token = localStorage.getItem("token");
    if (token) setHeader("Authorization", `Bearer ${token}`);
  }

  return config;
});

export default api;
*/








// src/lib/api.ts (FRONTEND)
import axios, { AxiosHeaders, InternalAxiosRequestConfig } from 'axios';

// Detecta si estamos en Vite dev (5173)
const isViteDev =
  window.location.hostname === 'localhost' && window.location.port === '5173';

const API_BASE = isViteDev
  ? 'http://127.0.0.1:8000/api' // back con artisan
  : 'http://localhost:8080/BackEnd_HT_Setecca/public/api'; // back con Apache

console.log('API_BASE =', API_BASE);

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false, // si usas Sanctum por cookies → true
});

// Interceptor con los mismos headers que ya te funcionaban, pero TS-safe
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Normaliza headers a AxiosHeaders
  const headers =
    config.headers instanceof AxiosHeaders
      ? config.headers
      : new AxiosHeaders(config.headers);

  const token = localStorage.getItem('token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  headers.set('Accept', 'application/json');

  config.headers = headers; // <- importante: asignar AxiosHeaders
  return config;
});

export default api;
