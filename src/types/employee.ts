import type { Position } from "./position";

export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  code?: string;
  email?: string;

  // Relaciones
  position_id?: number | null;
  position?: Position | null;

  // Datos laborales
  department?: string;
  work_shift?: string;
  hire_date?: string;
  status?: string; // activo | inactivo | suspendido | etc.

  // Campos futuros (sprint 7+)
  use_position_salary?: boolean;
  salary_type?: "monthly" | "hourly";
  salary_override_amount?: number | null;
  salary_override_currency?: "CRC" | "USD" | null;

  // Auditoría
  created_at?: string;
  updated_at?: string;
}
