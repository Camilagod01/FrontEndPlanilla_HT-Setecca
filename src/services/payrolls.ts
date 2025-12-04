import api from "./api";

export interface RunPayrollPayload {
  employee_id: number;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

export interface RunPayrollResponse {
  ok?: boolean;
  payroll?: {
    id: number;
    employee_id: number;
    period_from: string;
    period_to: string;
    gross: number;
    deductions: number;
    net: number;
    currency: string;
  };
  // fallback por si el endpoint devuelve directamente el modelo
  id?: number;
  gross?: number;
  deductions?: number;
  net?: number;
  currency?: string;
}

export async function runPayroll(
  payload: RunPayrollPayload
): Promise<RunPayrollResponse> {
  const res = await api.post("/payrolls/run", payload);
  return res.data;
}
