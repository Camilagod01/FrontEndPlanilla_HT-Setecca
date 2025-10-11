import api from "@/lib/api";

export async function getAttendanceReport(params: {
  from: string;
  to: string;
  search?: string;
  employee_id?: number;
}) {
  const res = await api.get("/reports/attendance", { params });
  return res.data;
}

export function downloadAttendanceCSV(params: {
  from: string;
  to: string;
  search?: string;
  employee_id?: number;
}) {
  const q = new URLSearchParams(params as any).toString();
  window.open(`/api/reports/attendance/export?${q}`, "_blank");
}
