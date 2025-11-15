import axios, { AxiosHeaders, InternalAxiosRequestConfig } from "axios";


/* ============================================================
   =============== Configuración base de Axios =================
   ============================================================ */

const isViteDev =
  window.location.hostname === "localhost" && window.location.port === "5173";

const API_BASE = isViteDev
  ? "http://127.0.0.1:8000/api" // Laravel artisan serve
  : "http://localhost:8080/BackEnd_HT_Setecca/public/api"; // Apache local (Laragon)

console.log("API_BASE =", API_BASE);

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
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
   =============== Employees + Garnishments ===================
   ============================================================ */

// === Employees ===
export async function getEmployee(id: number) {
  const { data } = await api.get(`/employees/${id}`, { params: { include: "position" } });
  return (data as any)?.data ?? data;
}





export async function updateEmployee(
  id: number,
  payload: Partial<{
    first_name: string;
    last_name: string;
    email: string;
    status: "active" | "inactive";
    garnish_cap_rate: number | null;
  }>
) {
  const { data } = await api.patch(`/employees/${id}`, payload);
  return (data as any)?.data ?? data;
}

export async function updateEmployeePosition(
  employeeId: number,
  position_id: number | null,
  use_position_salary?: boolean
) {
  const { data } = await api.patch(`/employees/${employeeId}/position`, {
    position_id,
    use_position_salary,
  });
  return data;
}

// === Garnishments ===
export interface Garnishment {
  id: number;
  employee_id: number;
  order_no?: string | null;
  mode: "percent" | "amount";
  value: number;
  start_date: string;
  end_date?: string | null;
  priority: number;
  active: boolean;
}

export async function listGarnishmentsByEmployee(employee_id: number) {
  const { data } = await api.get(`/garnishments`, { params: { employee_id } });
  return (data as any)?.data ?? data ?? [];
}

export async function createGarnishment(payload: Omit<Garnishment, "id">) {
  const { data } = await api.post(`/garnishments`, payload);
  return (data as any)?.data ?? data;
}

export async function updateGarnishment(id: number, payload: Partial<Garnishment>) {
  const { data } = await api.patch(`/garnishments/${id}`, payload);
  return (data as any)?.data ?? data;
}

export async function deleteGarnishment(id: number) {
  const { data } = await api.delete(`/garnishments/${id}`);
  return data;
}


/* ============================================================
   ===================== Statements API =======================
   ============================================================ */

export interface StatementResp {
  employee: {
    id: number;
    code: string;
    name: string;
    salary_type: "monthly" | "hourly";
    salary_amount: number;
    salary_currency: "CRC" | "USD";
  };
  period: { from: string; to: string };
  hours: {
    regular_1x: number;
    overtime_15: number;
    double_20: number;
    sick_50pct_days: number;
    sick_0pct_days: number;
  };
  incomes: { label: string; amount: number }[];
  deductions: { label: string; amount: number }[];
  total_gross: number;
  total_deductions: number;
  net: number;
  currency: "CRC" | "USD";
  exchange_rate: number;
}

/** Trae el estado por id numérico o por código (string) */
export async function getStatement(
  idOrCode: number | string,
  params?: { from?: string; to?: string }
): Promise<StatementResp> {
  const { data } = await api.get(`/statements/${idOrCode}`, { params });
  return data as StatementResp;
}

/** Descarga export (pdf o xlsx). type: "pdf" | "excel" | "xlsx" */
export async function exportStatement(
  employeeId: number,
  opts: { from?: string; to?: string; type?: "pdf" | "excel" | "xlsx" } = {}
) {
  const q = new URLSearchParams();
  if (opts.from) q.set("from", opts.from);
  if (opts.to) q.set("to", opts.to);
  if (opts.type) q.set("type", opts.type);

  const url = `/statements/${employeeId}/export?` + q.toString();
  const res = await api.get(url, { responseType: "blob" });

  // nombre de archivo sencillo
  const now = new Date().toISOString().slice(0, 10);
  const filename =
    (opts.type === "excel" || opts.type === "xlsx")
      ? `estado_${employeeId}_${now}.xlsx`
      : `estado_${employeeId}_${now}.pdf`;

  const blob = res.data as Blob;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}




// ===== Estado de cuenta: export (PDF/XLSX) =====
export async function exportStatementPDF(employeeId: number, params: { from?: string; to?: string } = {}) {
  const q = new URLSearchParams({ type: "pdf" });
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);

  const url = `/statements/${employeeId}/export?${q.toString()}`;
  const res = await api.get(url, { responseType: "blob" });
  return res.data as Blob;
}

export async function exportStatementXLSX(employeeId: number, params: { from?: string; to?: string } = {}) {
  const q = new URLSearchParams({ type: "excel" });
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);

  const url = `/statements/${employeeId}/export?${q.toString()}`;
  const res = await api.get(url, { responseType: "blob" });
  return res.data as Blob;
}




/* ============================================================
   ========================= Loans ============================
   ============================================================ */

export interface Loan {
  id: number;
  employee_id: number;
  principal: number;
  balance: number;
  created_at: string;
  status?: "active" | "closed";
  notes?: string | null;
}

export interface LoanInput {
  employee_id: number;
  principal: number;
  notes?: string | null;
}

export async function listLoans(params?: {
  search?: string;
  employee_id?: number;
  page?: number;
  per_page?: number;
}) {
  const { data } = await api.get(`/loans`, { params });
  // backend devuelve paginado { current_page, data, ... }
  return data;
}

export async function createLoan(payload: LoanInput) {
  const { data } = await api.post(`/loans`, payload);
  // algunos endpoints devuelven {data: {...}} y otros plano:
  return (data as any)?.data ?? data;
}

export async function getLoan(id: number) {
  const { data } = await api.get(`/loans/${id}`);
  return (data as any)?.data ?? data;
}

export async function updateLoan(
  id: number,
  payload: Partial<Pick<Loan, "notes" | "status" | "balance">>
) {
  const { data } = await api.patch(`/loans/${id}`, payload);
  return (data as any)?.data ?? data;
}

export async function deleteLoan(id: number) {
  const { data } = await api.delete(`/loans/${id}`);
  return data;
}
