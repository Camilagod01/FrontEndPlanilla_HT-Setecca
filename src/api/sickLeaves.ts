import { http } from "./https";

export type SickProvider = "CCSS" | "INS" | "OTHER";
export type SickStatus = "pending" | "approved" | "rejected";

export interface SickLeave {
  id: number;
  employee_id: number;
  start_date: string;
  end_date: string;
  total_days: number;
  provider: SickProvider;
  coverage_percent: number;
  status: SickStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  employee?: {
    id: number;
    code?: string;
    first_name?: string;
    last_name?: string;
  };
}

export type SickLeavesPaginated = {
  data: SickLeave[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type SickLeavesResponse = SickLeave[] | SickLeavesPaginated;

export interface SickLeaveFilters {
  employee_id?: number | string;
  status?: SickStatus | "";
  provider?: SickProvider | "";
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}

export interface SickLeaveCreate {
  employee_id: number;
  start_date: string;
  end_date: string;
  provider: SickProvider;
  coverage_percent: number;
  status: SickStatus;
  notes?: string;
}

export interface SickLeaveUpdate {
  start_date?: string;
  end_date?: string;
  provider?: SickProvider;
  coverage_percent?: number;
  status?: SickStatus;
  notes?: string;
}

export async function getSickLeaves(params?: SickLeaveFilters): Promise<SickLeavesResponse> {
  const res = await http.get<SickLeavesResponse>("/sick-leaves", { params });
  return res.data;
}

export async function getSickLeave(id: number): Promise<SickLeave> {
  const res = await http.get<SickLeave>(`/sick-leaves/${id}`);
  return res.data;
}

export async function createSickLeave(payload: SickLeaveCreate): Promise<SickLeave> {
  const res = await http.post<SickLeave>("/sick-leaves", payload);
  return res.data;
}

export async function updateSickLeave(id: number, payload: SickLeaveUpdate): Promise<SickLeave> {
  const res = await http.patch<SickLeave>(`/sick-leaves/${id}`, payload);
  return res.data;
}

export async function deleteSickLeave(id: number): Promise<void> {
  await http.delete(`/sick-leaves/${id}`);
}
