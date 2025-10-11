export type Currency = "CRC" | "USD";
export type SalaryType = "monthly" | "hourly";

export interface Position {
  id: number;
  code: string;
  name: string;

  // Compatibilidad con el modelo anterior
  base_hourly_rate?: number | string | null;
  currency?: "CRC" | "USD" | string | null;

  // Campos nuevos de salario
  salary_type: "monthly" | "hourly";
  default_salary_amount?: number | string | null;
  default_salary_currency: "CRC" | "USD";

  // Estado
  is_active?: boolean;

  // Metadatos
  created_at?: string;
  updated_at?: string;
}
