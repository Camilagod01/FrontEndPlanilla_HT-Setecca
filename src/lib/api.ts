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

import axios, { AxiosHeaders, InternalAxiosRequestConfig } from "axios";

const isViteDev = window.location.hostname === "localhost" && window.location.port === "5173";
const API_BASE = isViteDev
  ? "http://127.0.0.1:8000/api"                 // Laravel artisan serve
  : "http://localhost:8080/BackEnd_HT_Setecca/public/api"; // Apache

console.log("API_BASE =", API_BASE);

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false, // si usas cookies/Sanctum, pon true
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const headers =
    config.headers instanceof AxiosHeaders ? config.headers : new AxiosHeaders(config.headers);
  const token = localStorage.getItem("token");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  config.headers = headers;
  return config;
});

export default api;


/* ============================================================
   =============== Tipos básicos de dominio ===================
   ============================================================ */

export interface Position {
  id: number;
  name: string;
}

export interface Employee {
  id: number;
  code?: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  position_id?: number | null;
  position?: Position | null; // ← para mostrar position.name
  // agrega aquí otros campos que uses (status, hire_date, etc.)
}

/* ============================================================
   ===== Endpoints para Positions / Employee Position =========
   ============================================================ */

// Lista de puestos (para el <select>)
export async function listPositions(): Promise<Position[]> {
  const { data } = await api.get<Position[]>("/positions");
  return data;
}

// Traer un empleado (y su relación position)
export async function getEmployee(employeeId: number): Promise<Employee> {
  // Si en backend usas include=position, déjalo; si no, el controlador ya hace load('position')
  const { data } = await api.get<Employee>(`/employees/${employeeId}?include=position`);
  return data;
}

// Actualizar SOLO el puesto del empleado
export async function updateEmployeePosition(
  employeeId: number,
  position_id: number | null
): Promise<Employee> {
  // Ruta dedicada que sugerimos en Laravel: PATCH /employees/:id/position
  const { data } = await api.patch<Employee>(`/employees/${employeeId}/position`, { position_id });
  return data; // viene con .position cargado para refrescar la UI
}


/* ============================================================
   =============== Tipos para /metrics/hours ==================
   ============================================================ */

export interface EmployeeHoursDay { date: string; hours: number }

export interface EmployeeHoursResponse {
  employee_id: number;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  total_hours: number;
  overtime: {
    daily_hours: number;
    weekly_hours: number;
    multipliers: { daily: number; weekly: number };
  };
  days: EmployeeHoursDay[];
}

// ===== Función para GET /api/metrics/hours =====
export async function fetchEmployeeHours(params: {
  employee_id: number;
  from: string;
  to: string;
}) {
  const { data } = await api.get<EmployeeHoursResponse>("/metrics/hours", { params });
  return data;
}

/* ============================================================
   ============ Utilidades (CSV Export) ============
   ============================================================ */


// Helper para construir nombre de archivo con rango
function buildExportFilename(prefix: string, params: { from?: string; to?: string }) {
  const now = new Date();
  const hhmm = now.toISOString().slice(11,16).replace(":", "");
  
  let rango = "hoy";
  if (params.from && params.to) {
    rango = `${params.from}_a_${params.to}`;
  } else if (params.from) {
    rango = `desde_${params.from}`;
  } else if (params.to) {
    rango = `hasta_${params.to}`;
  }

  return `${prefix}_${rango}_${hhmm}.csv`;
}


// ✅ ÚNICA función exportTimeEntriesCSV
export async function exportTimeEntriesCSV(params: {
  employee?: string; from?: string; to?: string; status?: 'completo'|'pendiente_salida'|'anómala';
} = {}) {
  const q = new URLSearchParams();
  if (params.employee) q.set("employee", params.employee);
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  if (params.status) q.set("status", params.status);
  q.set("format", "csv");

  const url = `/exports/time-entries?${q.toString()}`;
  console.log("GET", api.defaults.baseURL + url);

  try {
    const res = await api.get(url, { responseType: "blob" });
    const blob = res.data as Blob;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
  a.download = buildExportFilename("marcaciones", params);

    a.click();
    URL.revokeObjectURL(a.href);
  } catch (err: any) {
    // Intenta leer texto del error si vino HTML/JSON
    let detail = "";
    if (err?.response?.data instanceof Blob) {
      try { detail = await err.response.data.text(); } catch {}
    } else if (err?.response?.data) {
      detail = typeof err.response.data === "string" ? err.response.data : JSON.stringify(err.response.data);
    }
    const status = err?.response?.status ?? "NETWORK";
    console.error("Export error", status, detail);
    throw new Error(`HTTP ${status} ${detail?.slice(0,200) || ""}`.trim());
  }



}





