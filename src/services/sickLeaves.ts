import api from './api';

export type SickType = '50pct' | '0pct';

export type SickLeave = {
  id: number;
  employee_id: number;
  start_date: string;   // 'YYYY-MM-DD'
  end_date: string;     // 'YYYY-MM-DD'
  type: SickType;
  notes?: string | null;
  status?: string;      // 'approved' (por ahora)
  created_at?: string;
  updated_at?: string;
};

export type SickLeaveFilters = {
  employee_id?: number | string;
  from?: string;   // 'YYYY-MM-DD'
  to?: string;     // 'YYYY-MM-DD'
  page?: number;
  per_page?: number;
};

export async function listSickLeaves(params: SickLeaveFilters = {}) {
  const { data } = await api.get('/sick-leaves', { params });
  return data; // paginado de Laravel
}

export async function createSickLeave(payload: {
  employee_id: number;
  start_date: string;
  end_date: string;
  type: SickType;
  notes?: string;
}) {
  const { data } = await api.post('/sick-leaves', payload);
  return data as SickLeave;
}

export async function updateSickLeave(
  id: number,
  payload: Partial<Pick<SickLeave, 'start_date' | 'end_date' | 'type' | 'notes'>>
) {
  const { data } = await api.patch(`/sick-leaves/${id}`, payload);
  return data as SickLeave;
}

export async function deleteSickLeave(id: number) {
  const { data } = await api.delete(`/sick-leaves/${id}`);
  return data as { status: string; message?: string };
}