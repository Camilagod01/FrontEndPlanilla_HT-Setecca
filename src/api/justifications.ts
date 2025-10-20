import { http } from "@/api/https";

export type JustificationType = "late" | "early_leave" | "absence" | "other";
export type JustificationStatus = "pending" | "approved" | "rejected";

export interface Justification {
  id: number;
  employee_id: number;
  date: string;          // YYYY-MM-DD
  from_time?: string | null; // HH:mm
  to_time?: string | null;   // HH:mm
  type: JustificationType;
  reason?: string | null;
  notes?: string | null;
  status: JustificationStatus;
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

export type JustificationsPaginated = {
  data: Justification[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type JustificationsResponse = Justification[] | JustificationsPaginated;

export interface JustificationFilters {
  employee_id?: number | string;
  from?: string;   // YYYY-MM-DD
  to?: string;     // YYYY-MM-DD
  type?: JustificationType | "";
  status?: JustificationStatus | "";
  page?: number;
  per_page?: number;
}

export interface JustificationCreate {
  employee_id: number;
  date: string;
  from_time?: string | null; // HH:mm
  to_time?: string | null;   // HH:mm
  type: JustificationType;
  reason?: string | null;
  notes?: string | null;
  status?: JustificationStatus; // default pending
}

export interface JustificationUpdate {
  employee_id?: number;
  date?: string;
  from_time?: string | null;
  to_time?: string | null;
  type?: JustificationType;
  reason?: string | null;
  notes?: string | null;
  status?: JustificationStatus;
}

export async function getJustifications(params?: JustificationFilters): Promise<JustificationsResponse> {
  const res = await http.get<JustificationsResponse>("/justifications", { params });
  return res.data;
}

export async function getJustification(id: number): Promise<Justification> {
  const res = await http.get<Justification>(`/justifications/${id}`);
  return res.data;
}

export async function createJustification(payload: JustificationCreate): Promise<Justification> {
  const res = await http.post<Justification>("/justifications", payload);
  return res.data;
}

export async function updateJustification(id: number, payload: JustificationUpdate): Promise<Justification> {
  const res = await http.patch<Justification>(`/justifications/${id}`, payload);
  return res.data;
}

export async function updateJustificationStatus(id: number, status: JustificationStatus): Promise<Justification> {
  const res = await http.patch<Justification>(`/justifications/${id}/status`, { status });
  return res.data;
}

export async function deleteJustification(id: number): Promise<void> {
  await http.delete(`/justifications/${id}`);
}
