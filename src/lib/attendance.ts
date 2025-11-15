// src/lib/attendance.ts
import api from "./api"; // mismo api que usan otras páginas

export interface AttendanceEntry {
  id: number;
  employee_id: number;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  source: string | null;
  notes: string | null;
  hours_worked?: number | null;
  status?: string; // completo | pendiente_salida | anomalia
}

export interface AttendanceListResponse {
  data: AttendanceEntry[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export async function getEmployeeAttendanceFromTimeEntries(
  employeeId: number | string,
  params?: {
    from?: string;
    to?: string;
    status?: string;
    page?: number;
    per_page?: number;
  }
): Promise<AttendanceListResponse> {
  const response = await api.get<AttendanceListResponse>("/time-entries", {
    params: {
      employee_id: employeeId,
      from: params?.from,
      to: params?.to,
      status: params?.status,
      page: params?.page ?? 1,
      per_page: params?.per_page ?? 50,
    },
  });

  return response.data;
}
