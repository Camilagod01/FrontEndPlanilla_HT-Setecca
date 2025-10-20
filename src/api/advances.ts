// Métodos para adelantos (advances)
import { http } from "@/api/https";

export interface Advance {
  id: number;
  employee_id: number;
  amount: number;
  currency: "CRC" | "USD";
  granted_at: string;
  notes?: string;
  status: "pending" | "applied" | "cancelled";
  created_at?: string;
  updated_at?: string;
}

export type AdvancesPaginated = {
  data: Advance[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type AdvancesResponse = Advance[] | AdvancesPaginated;

export async function getAdvances(params?: Record<string, any>): Promise<AdvancesResponse> {
  const res = await http.get<unknown>("/advances", { params });
  return res.data as AdvancesResponse;
}

export async function createAdvance(payload: Partial<Advance>) {
  const res = await http.post<Advance>("/advances", payload);
  return res.data;
}

export async function updateAdvance(id: number, payload: Partial<Advance>) {
  const res = await http.patch<Advance>(`/advances/${id}`, payload);
  return res.data;
}

export async function deleteAdvance(id: number) {
  await http.delete(`/advances/${id}`);
}

