import axios, { AxiosHeaders, InternalAxiosRequestConfig } from "axios";
import type { Position, Employee, SalaryType, Currency } from "../types";

/* ============================================================
   =============== Configuración base de Axios =================
   ============================================================ */

const isViteDev =
  window.location.hostname === "localhost" && window.location.port === "5173";

const API_BASE = isViteDev
  ? "http://127.0.0.1:8000/api" // Laravel artisan serve
  : "http://localhost:8080/BackEnd_HT_Setecca/public/api"; // Apache

console.log("API_BASE =", API_BASE);

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false, // si usas cookies/Sanctum, pon true
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const headers =
    config.headers instanceof AxiosHeaders
      ? config.headers
      : new AxiosHeaders(config.headers);
  const token = localStorage.getItem("token");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  config.headers = headers;
  return config;
});

export default api;

/* ============================================================
   ==================== Positions API =========================
   ============================================================ */

/** Lista de puestos (paginado o plano); normaliza a array + meta */
export async function listPositions(params?: {
  search?: string;
  active?: boolean;
  page?: number;
  per_page?: number;
}): Promise<{ data: Position[]; meta: { current_page: number; last_page: number } }> {
  const res = await api.get("/positions", { params });
  const raw: any = res.data;
  const data: Position[] = Array.isArray(raw) ? raw : raw?.data ?? [];
  const meta = Array.isArray(raw)
    ? { current_page: 1, last_page: 1 }
    : {
        current_page: raw?.current_page ?? 1,
        last_page: raw?.last_page ?? 1,
      };
  return { data, meta };
}

/** Versión “flat” si quieres traer lista simple para selects */
export async function listPositionsFlat(fields = "id,code,name"): Promise<Position[]> {
  const res = await api.get("/positions", { params: { flat: 1, fields } });
  return (res.data ?? []) as Position[];
}

/** Crear puesto */
export async function createPosition(payload: {
  code: string;
  name: string;
  salary_type: SalaryType; // "monthly" | "hourly"
  default_salary_amount?: number | null;
  default_salary_currency: Currency; // "CRC" | "USD"
  // compat opcional (legacy)
  base_hourly_rate?: number | null;
  currency?: Currency;
  is_active?: boolean;
}): Promise<Position> {
  const { data } = await api.post<Position>("/positions", payload);
  return data;
}

/** Actualizar puesto */
export async function updatePosition(
  id: number,
  payload: Partial<{
    code: string;
    name: string;
    salary_type: SalaryType;
    default_salary_amount: number | null;
    default_salary_currency: Currency;
    base_hourly_rate?: number | null; // compat
    currency?: Currency; // compat
    is_active?: boolean;
  }>
): Promise<Position> {
  const { data } = await api.patch<Position>(`/positions/${id}`, payload);
  return data;
}

/** Eliminar / desactivar puesto (según backend) */
export async function deletePosition(id: number) {
  const { data } = await api.delete(`/positions/${id}`);
  return data;
}

/* ============================================================
   ============== Employees + Position update =================
   ============================================================ */

/** Traer un empleado (backend ya hace load('position')) */
export async function getEmployee(employeeId: number): Promise<Employee> {
  const { data } = await api.get<Employee>(`/employees/${employeeId}`, {
    params: { include: "position" },
  });
  return (data as any)?.data ?? data;
}

/** Actualizar SOLO el puesto del empleado */
export async function updateEmployeePosition(
  employeeId: number,
  position_id: number | null,
  use_position_salary?: boolean
): Promise<Employee> {
  const { data } = await api.patch<Employee>(
    `/employees/${employeeId}/position`,
    { position_id, use_position_salary }
  );
  return data;
}

/* ============================================================
   =============== Tipos y API de /metrics/hours ==============
   ============================================================ */

export interface EmployeeHoursDay {
  date: string;
  hours: number;
}

export interface EmployeeHoursResponse {
  employee_id: number;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  total_hours: number;
  overtime: {
    daily_hours: number;
    weekly_hours: number;
    multipliers: { daily: number; weekly: number };
  };
  days: EmployeeHoursDay[];
}

export async function fetchEmployeeHours(params: {
  employee_id: number;
  from: string;
  to: string;
}) {
  const { data } = await api.get<EmployeeHoursResponse>("/metrics/hours", {
    params,
  });
  return data;
}

/* ============================================================
   ===================== Export CSV global ====================
   ============================================================ */

function buildExportFilename(prefix: string, params: { from?: string; to?: string }) {
  const now = new Date();
  const hhmm = now.toISOString().slice(11, 16).replace(":", "");

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

export async function exportTimeEntriesCSV(params: {
  employee?: string;
  from?: string;
  to?: string;
  status?: "completo" | "pendiente_salida" | "anómala";
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
    let detail = "";
    if (err?.response?.data instanceof Blob) {
      try {
        detail = await err.response.data.text();
      } catch {}
    } else if (err?.response?.data) {
      detail =
        typeof err.response.data === "string"
          ? err.response.data
          : JSON.stringify(err.response.data);
    }
    const status = err?.response?.status ?? "NETWORK";
    console.error("Export error", status, detail);
    throw new Error(`HTTP ${status} ${detail?.slice(0, 200) || ""}`.trim());
  }
}
