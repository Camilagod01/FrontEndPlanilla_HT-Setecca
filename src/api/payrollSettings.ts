import api from "@/lib/api";

export type BaseCurrency = "CRC" | "USD";
export type FxMode = "none" | "manual" | "daily" | "auto";
export type RoundingMode = "none" | "half_up" | "down" | "up";

export type PayrollSetting = {
  id: number;
  workday_hours: number;
  workday_hours_diurnal?: number | null;
  workday_hours_nocturnal?: number | null;
  overtime_threshold: number;
  base_currency: BaseCurrency;
  fx_mode: FxMode;
  fx_source: string;
  fx_manual_rate?: number | null;
  rounding_mode: RoundingMode;
};

export async function getPayrollSettings(): Promise<PayrollSetting> {
  const { data } = await api.get("/payroll-settings");
  return data as PayrollSetting;
}

export async function updatePayrollSettings(payload: Partial<PayrollSetting>) {
  const { data } = await api.patch("/payroll-settings", payload);
  return data as PayrollSetting;
}

