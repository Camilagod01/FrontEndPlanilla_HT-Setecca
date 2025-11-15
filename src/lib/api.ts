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


/* ============================================================
   =============== Employees extra (A–C completo) ==============
   ============================================================ */

/** Listado paginado + búsqueda + orden */
export async function listEmployees(params?: {
  per_page?: number;
  search?: string;
  sort?: string;
  dir?: "asc" | "desc";
}) {
  const res = await api.get("/employees", { params });
  // backend devuelve paginator con { current_page, data, ... }
  return res.data; // { current_page, data, ... }
}

/** Opciones minimalistas para selects (id, code, full_name) */
export async function employeesOptions() {
  const res = await api.get("/employees/options");
  return res.data; // { data: [{id, code, full_name}, ...] }
}

/** Crear empleado */
export async function createEmployee(payload: {
  code: string;
  first_name: string;
  last_name: string;
  email: string;
  status: "active" | "inactive";
  position_id?: number | null;
  garnish_cap_rate?: number | null;
}) {
  const res = await api.post("/employees", payload);
  return res.data; // { data: Employee }
}

/** Actualizar campos del empleado */
export async function updateEmployee(
  id: number,
  payload: Partial<{
    code: string;
    first_name: string;
    last_name: string;
    email: string;
    status: "active" | "inactive";
    garnish_cap_rate: number | null;
  }>
) {
  const res = await api.patch(`/employees/${id}`, payload);
  return res.data; // { data: Employee }
}

/** Eliminar empleado */
export async function deleteEmployee(id: number) {
  const res = await api.delete(`/employees/${id}`);
  return res.data; // { ok: true, id, msg }
}

/* ============================================================
   ==================== Garnishments API ======================
   ============================================================ */

export type GarnishmentMode = "amount" | "percent";
export interface Garnishment {
  id: number;
  employee_id: number;
  mode: GarnishmentMode;
  value: number;
  start_date: string; // YYYY-MM-DD
  end_date?: string | null;
  priority?: number;
  active: boolean;
  order_no?: string | null;
  notes?: string | null;
}

/** Listar embargos (opcionalmente por empleado) */
export async function listGarnishments(params?: { employee_id?: number }) {
  const res = await api.get("/garnishments", { params });
  return res.data; // { data: Garnishment[] } o similar
}

export async function showGarnishment(id: number) {
  const res = await api.get(`/garnishments/${id}`);
  return res.data; // { data: Garnishment }
}

export async function createGarnishment(payload: {
  employee_id: number;
  mode: GarnishmentMode;
  value: number;
  start_date: string;
  end_date?: string | null;
  priority?: number;
  active?: boolean;
  order_no?: string | null;
  notes?: string | null;
}) {
  const res = await api.post(`/garnishments`, payload);
  return res.data; // { data: Garnishment }
}

export async function updateGarnishment(
  id: number,
  payload: Partial<{
    mode: GarnishmentMode;
    value: number;
    start_date: string;
    end_date: string | null;
    priority: number;
    active: boolean;
    order_no: string | null;
    notes: string | null;
  }>
) {
  const res = await api.patch(`/garnishments/${id}`, payload);
  return res.data; // { data: Garnishment }
}

export async function deleteGarnishment(id: number) {
  const res = await api.delete(`/garnishments/${id}`);
  return res.data; // { ok: true, id, ... }
}

/* ============================================================
   =================== Payroll Preview API ====================
   ============================================================ */

/** Previsualizar planilla con tope de embargos */
export async function previewPayroll(params: {
  employee_id: number;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}) {
  // tu backend acepta GET (y también tiene match GET|POST)
  const res = await api.get("/payroll/preview", { params });
  return res.data; // { ok, stage, money, garnish_cap, garnishments, ... }
}
