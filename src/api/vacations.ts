import { http } from "./https";

export type VacationStatus = "pending" | "approved" | "rejected";

export interface Vacation {
  id: number;
  employee_id: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  days: number;
  status: VacationStatus;
  notes?: string;
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

export type VacationsPaginated = {
  data: Vacation[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type VacationsResponse = Vacation[] | VacationsPaginated;

export interface VacationFilters {
  employee_id?: number | string;
  status?: VacationStatus | "";
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  page?: number;
  per_page?: number;
}

export interface VacationCreate {
  employee_id: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  status: VacationStatus;
  notes?: string;
}

export interface VacationUpdate {
  start_date?: string;
  end_date?: string;
  days?: number;
  status?: VacationStatus;
  notes?: string;
}

export async function getVacations(params?: VacationFilters): Promise<VacationsResponse> {
  const res = await http.get<VacationsResponse>("/vacations", { params });
  return res.data;
}

export async function getVacation(id: number): Promise<Vacation> {
  const res = await http.get<Vacation>(`/vacations/${id}`);
  return res.data;
}

export async function createVacation(payload: VacationCreate): Promise<Vacation> {
  const res = await http.post<Vacation>("/vacations", payload);
  return res.data;
}

export async function updateVacation(id: number, payload: VacationUpdate): Promise<Vacation> {
  const res = await http.patch<Vacation>(`/vacations/${id}`, payload);
  return res.data;
}

export async function deleteVacation(id: number): Promise<void> {
  await http.delete(`/vacations/${id}`);
}


export async function setVacationStatus(id: number, status: VacationStatus): Promise<Vacation> {
  const res = await http.patch<Vacation>(`/vacations/${id}/status`, { status });
  return res.data;
}
