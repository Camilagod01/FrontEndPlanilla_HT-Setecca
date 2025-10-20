import { http } from "@/api/https";

export interface PayrollSetting {
  id: number;
  workday_hours: number;
  overtime_threshold: number;
  base_currency: "CRC" | "USD";
  fx_mode: "none" | "manual" | "daily";
  fx_source: string;
  rounding_mode: "none" | "half_up" | "down" | "up";
  created_at?: string;
  updated_at?: string;
}

/** Obtiene el registro único de configuración de planilla */
export async function getPayrollSettings(): Promise<PayrollSetting> {
  const res = await http.get<PayrollSetting>("/payroll-settings");
  return res.data;
}

/** Actualiza el registro único de configuración de planilla */
export async function updatePayrollSettings(
  payload: Partial<PayrollSetting>
): Promise<PayrollSetting> {
  const res = await http.patch<PayrollSetting>("/payroll-settings", payload);
  return res.data;
}
