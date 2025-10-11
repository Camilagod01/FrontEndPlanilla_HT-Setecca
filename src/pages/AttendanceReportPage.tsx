import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import api from "@/lib/api";
import { downloadBlob } from "@/lib/downloadBlob";

type Row = {
  employee_id: number;
  code?: string;
  name: string;
  position?: string;
  regular_hours: number;
  overtime_15: number;
  overtime_20: number;
  sick_50pct_days: number;
  sick_0pct_days: number;
  attendance_days: number;
  total: number;
  extra_day: number;
  extra_week: number;
};

type ApiResponse = {
  from: string;
  to: string;
  rows: Row[];
  count: number;
};

function useDebounced<T>(value: T, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function AttendanceReportPage() {
  // Filtros (por defecto: mes actual)
  const [from, setFrom] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [to, setTo] = useState(dayjs().format("YYYY-MM-DD"));
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 400);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  const totalHours = useMemo(
    () => rows.reduce((acc, r) => acc + (r.total || 0), 0),
    [rows]
  );

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<ApiResponse>("/reports/attendance", {
        params: {
          from,
          to,
          search: debouncedSearch || undefined,
        },
      });
      setRows(res.data.rows || []);
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || "No se pudo cargar el reporte");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, debouncedSearch]);

  const exportCsv = async () => {
    try {
      const res = await api.get("/reports/attendance/export", {
        params: { from, to, search: debouncedSearch || undefined, format: "csv" },
        responseType: "blob",
      });
      const fname = `attendance_${from}_${to}.csv`;
      downloadBlob(res.data, fname);
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.message || "No se pudo exportar");
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Reporte de asistencia</h1>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
            disabled={loading}
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded border px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded border px-2 py-1"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm text-gray-600 mb-1">Buscar (nombre / código)</label>
          <input
            type="text"
            placeholder="Ej. Ana, 0012…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border px-2 py-1"
          />
        </div>
      </div>

      {/* Estado / errores */}
      {loading && <div className="p-3 rounded border bg-white/70">Cargando…</div>}
      {error && <div className="p-3 rounded border bg-red-50 text-red-700">{error}</div>}

      {/* Tabla */}
      {!loading && !error && (
        <div className="overflow-auto rounded border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <Th>Empleado</Th>
                <Th>Código</Th>
                <Th>Puesto</Th>
                <Th className="text-right">Horas reg.</Th>
                <Th className="text-right">Extra 1.5</Th>
                <Th className="text-right">Extra 2.0</Th>
                <Th className="text-right">Total</Th>
                <Th className="text-right">Días incap. 50%</Th>
                <Th className="text-right">Días incap. 0%</Th>
                <Th className="text-right">Días (rango)</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-4 text-center text-gray-500">
                    Sin resultados para el rango.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.employee_id} className="border-t">
                  <Td>{r.name}</Td>
                  <Td>{r.code || "—"}</Td>
                  <Td>{r.position || "—"}</Td>
                  <TdRight>{r.regular_hours.toFixed(2)}</TdRight>
                  <TdRight>{r.overtime_15.toFixed(2)}</TdRight>
                  <TdRight>{r.overtime_20.toFixed(2)}</TdRight>
                  <TdRight className="font-medium">{r.total.toFixed(2)}</TdRight>
                  <TdRight>{r.sick_50pct_days}</TdRight>
                  <TdRight>{r.sick_0pct_days}</TdRight>
                  <TdRight>{r.attendance_days}</TdRight>
                </tr>
              ))}
            </tbody>
            {/* Footer con totales simples */}
            {rows.length > 0 && (
              <tfoot className="bg-gray-50">
                <tr>
                  <Td colSpan={3} className="font-medium">Totales</Td>
                  <TdRight className="font-medium">
                    {rows.reduce((a, r) => a + r.regular_hours, 0).toFixed(2)}
                  </TdRight>
                  <TdRight className="font-medium">
                    {rows.reduce((a, r) => a + r.overtime_15, 0).toFixed(2)}
                  </TdRight>
                  <TdRight className="font-medium">
                    {rows.reduce((a, r) => a + r.overtime_20, 0).toFixed(2)}
                  </TdRight>
                  <TdRight className="font-semibold">{totalHours.toFixed(2)}</TdRight>
                  <TdRight className="font-medium">
                    {rows.reduce((a, r) => a + r.sick_50pct_days, 0)}
                  </TdRight>
                  <TdRight className="font-medium">
                    {rows.reduce((a, r) => a + r.sick_0pct_days, 0)}
                  </TdRight>
                  <TdRight className="font-medium">
                    {rows.reduce((a, r) => a + r.attendance_days, 0)}
                  </TdRight>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children, className = "" }: any) {
  return <th className={`px-3 py-2 text-left font-medium ${className}`}>{children}</th>;
}
function Td({ children, className = "", colSpan }: any) {
  return <td className={`px-3 py-2 ${className}`} colSpan={colSpan}>{children}</td>;
}
function TdRight({ children, className = "" }: any) {
  return <Td className={`text-right ${className}`}>{children}</Td>;
}
