import { http } from "@/api/https";

export type HolidayScope = "national" | "company";

export interface Holiday {
  id: number;
  date: string;     // YYYY-MM-DD
  name: string;
  scope: HolidayScope;
  paid: boolean;
  created_at?: string;
  updated_at?: string;
}

export type HolidaysPaginated = {
  data: Holiday[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type HolidaysResponse = Holiday[] | HolidaysPaginated;

export interface HolidayFilters {
  year?: number | string;
  month?: number | string;
  from?: string;        // YYYY-MM-DD
  to?: string;          // YYYY-MM-DD
  scope?: HolidayScope | "";
  paid?: boolean | "" | "true" | "false" | 1 | 0;
  page?: number;
  per_page?: number;
}

export interface HolidayCreate {
  date: string;         // YYYY-MM-DD
  name: string;
  scope: HolidayScope;
  paid?: boolean;       // Si lo necesita la tabla
}

export interface HolidayUpdate {
  date?: string;
  name?: string;
  scope?: HolidayScope;
  paid?: boolean;
}

export async function getHolidays(params?: HolidayFilters): Promise<HolidaysResponse> {
  const res = await http.get<HolidaysResponse>("/holidays", { params });
  return res.data;
}

export async function getHoliday(id: number): Promise<Holiday> {
  const res = await http.get<Holiday>(`/holidays/${id}`);
  return res.data;
}

export async function createHoliday(payload: HolidayCreate): Promise<Holiday> {
  const res = await http.post<Holiday>("/holidays", payload);
  return res.data;
}

export async function updateHoliday(id: number, payload: HolidayUpdate): Promise<Holiday> {
  const res = await http.patch<Holiday>(`/holidays/${id}`, payload);
  return res.data;
}

export async function deleteHoliday(id: number): Promise<void> {
  await http.delete(`/holidays/${id}`);
}
