// src/lib/useEmployeeHours.ts
import { useEffect, useState } from "react";
import api from "./api";

export interface EmployeeHoursResponse {
  from: string;
  to: string;
  total: number;
  extra_day: number;
  extra_week: number;
  days: {
    date: string;
    weekday: string;
    expected: number;
    worked: number;
    extra_day: number;
  }[];
  weeks: { week: string; worked: number; extra_week: number }[];
}

export function useEmployeeHours(empId: number, from: string, to: string) {
  const [data, setData] = useState<EmployeeHoursResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!empId || !from || !to) return;
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // ✅ Forzar formato YYYY-MM-DD (sin ISO ni zona horaria)
        const params = {
          employee_id: Number(empId),
          from: String(from).slice(0, 10),
          to: String(to).slice(0, 10),
        };

        console.log("GET /metrics/hours →", params);
        const res = await api.get("/metrics/hours", { params });
        console.log("Resp /metrics/hours ←", res.data);

        if (alive) setData(res.data as EmployeeHoursResponse);
      } catch (e: any) {
        console.error(e);
        const serverMsg =
          e?.response?.data?.message ||
          (typeof e?.response?.data === "string" ? e.response.data : "") ||
          e?.message ||
          "No se pudo cargar horas";
        if (alive) setError(serverMsg);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [empId, from, to]);

  return { data, loading, error };
}
