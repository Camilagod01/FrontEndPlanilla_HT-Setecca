import { http } from "@/api/https";

export type AbsenceKind = "full_day" | "hours";
export type AbsenceStatus = "pending" | "approved" | "rejected";

export interface Absence {
  id: number;
  employee_id: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  kind: AbsenceKind;
  hours?: number | null; // Si lo necesita la tabla
  reason?: string | null;
  status: AbsenceStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  employee?: {
    id: number;
    code?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
  };
}

export type AbsencesPaginated = {
  data: Absence[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type AbsencesResponse = Absence[] | AbsencesPaginated;

export interface AbsenceFilters {
  employee_id?: number | string;
  kind?: AbsenceKind | "";
  status?: AbsenceStatus | "";
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  page?: number;
  per_page?: number;
}

export interface AbsenceCreate {
  employee_id: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  kind: AbsenceKind;
  hours?: number;     // Requerido cuando kind='hours'
  reason?: string;
  status: AbsenceStatus;
  notes?: string;
}

export interface AbsenceUpdate {
  employee_id?: number;
  start_date?: string;
  end_date?: string;
  kind?: AbsenceKind;
  hours?: number | null;
  reason?: string | null;
  status?: AbsenceStatus;
  notes?: string | null;
}

export async function getAbsences(params?: AbsenceFilters): Promise<AbsencesResponse> {
  const res = await http.get<AbsencesResponse>("/absences", { params });
  return res.data;
}

export async function getAbsence(id: number): Promise<Absence> {
  const res = await http.get<Absence>(`/absences/${id}`);
  return res.data;
}

export async function createAbsence(payload: AbsenceCreate): Promise<Absence> {
  const res = await http.post<Absence>("/absences", payload);
  return res.data;
}

export async function updateAbsence(id: number, payload: AbsenceUpdate): Promise<Absence> {
  const res = await http.patch<Absence>(`/absences/${id}`, payload);
  return res.data;
}

export async function deleteAbsence(id: number): Promise<void> {
  await http.delete(`/absences/${id}`);
}

export async function setAbsenceStatus(id: number, status: AbsenceStatus): Promise<Absence> {
  // Si lo necesita la API: se puede usar updateAbsence(id,{status})
  const res = await http.patch<Absence>(`/absences/${id}`, { status });
  return res.data;
}
