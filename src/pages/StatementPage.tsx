import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import api from "@/api";
import { getEmployeeHoursSummary } from "@/api/metrics";



type Statement = {
  employee: {
    id: number;
    code: string;
    name: string;
    position?: string | null;

    // Datos salariales completos
    salary_type: "monthly" | "hourly";
    salary_source?: string | null;       // position_monthly, employee_hourly, etc.
    monthly_salary_est: number;          // salario mensual estimado

    // Compatibilidad con lo que ya usaba el front
    salary_amount: number;
    salary_currency: "CRC" | "USD";
  };
  period: { from: string; to: string };
  hours: {
    regular_1x: number;
    overtime_15: number;
    double_20: number;
    sick_50pct_days: number;
    sick_0pct_days: number;
  };
  incomes: { label: string; amount: number }[];
  deductions: { label: string; amount: number }[];
  total_gross: number;
  total_deductions: number;
  net: number;
  currency: "CRC" | "USD";
  exchange_rate: number;
};




function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}



export default function StatementPage() {
  const { id } = useParams(); // /employees/:id/statement  ó /statement?employee_id=9
  const [sp] = useSearchParams();
  //const q = new URLSearchParams(useLocation().search);
  const employeeId = useMemo(() => {
    const q = sp.get("employee_id");
    return Number(id ?? q);
  }, [id, sp]);

  const [data, setData] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // filtros simples ?from=YYYY-MM-DD&to=YYYY-MM-DD
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");


  // Estado para las horas (desde /api/metrics/hours)
  const [hours, setHours] = useState<null | {
    total: number;
    extra_day: number;
    extra_week: number;
    sick_50pct_days: number;
    sick_0pct_days: number;
    regular_1x: number;
    overtime_15: number;
    double_20: number;
  }>(null);


    const paidHours = useMemo(() => {
    if (hours) {
      return (
        (hours.regular_1x ?? 0) +
        (hours.overtime_15 ?? 0) +
        (hours.double_20 ?? 0)
      );
    }

    // Fallback a lo que venga de la API de estado de cuenta,
    // por si no hay métricas cargadas
    if (data?.hours) {
      return (
        (data.hours.regular_1x ?? 0) +
        (data.hours.overtime_15 ?? 0) +
        (data.hours.double_20 ?? 0)
      );
    }

    return 0;
  }, [hours, data]);




    async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await api.get(`/statements/${employeeId}`, {
        params: { from: from || undefined, to: to || undefined },
      });
      const stmt = res.data as Statement;
      setData(stmt);

      // --- NUEVO: pedir métricas de horas para este empleado ---
      try {
        const metrics: any = await getEmployeeHoursSummary({
          employee_id: employeeId,
          from: from || stmt.period.from,
          to: to || stmt.period.to,
        });

        const days: any[] = Array.isArray(metrics.days) ? metrics.days : [];
        const sumField = (field: string) =>
          days.reduce((acc: number, d: any) => acc + (d?.[field] ?? 0), 0);

        setHours({
          total: metrics.total ?? 0,
          extra_day: metrics.extra_day ?? 0,
          extra_week: metrics.extra_week ?? 0,
          sick_50pct_days: metrics.sick_50pct_days ?? 0,
          sick_0pct_days: metrics.sick_0pct_days ?? 0,
          regular_1x: sumField("regular_1x"),
          overtime_15: sumField("overtime_15x"),
          double_20: sumField("double_20x"),
        });
      } catch (e) {
        console.error("No se pudo cargar métricas de horas", e);
        setHours(null);
      }
      // --- FIN BLOQUE NUEVO ---

    } catch (e: any) {
      console.error(e);
      setErr("No se pudo cargar el estado de cuenta");
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    if (employeeId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  if (!employeeId) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold">Estado de cuenta</h2>
        <p>Falta el parámetro <code>employee_id</code> o <code>:id</code> en la ruta.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Estado de cuenta — Empleado #{employeeId}
        </h2>
        <Link
          className="px-3 py-2 rounded-md bg-slate-200 hover:bg-slate-300"
          to={`/employees/${employeeId}`}
        >
          ← Volver al perfil
        </Link>
      </div>

      {/* Filtros de periodo */}
      <div className="flex gap-2 items-end">
        <div>
          <label className="block text-sm">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-sm">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <button
          onClick={load}
          className="px-3 py-2 rounded bg-indigo-600 text-white"
        >
          Aplicar
        </button>
      </div>

      {loading && <p>Cargando…</p>}
      {err && <p className="text-red-600">{err}</p>}
      {!loading && data && (
        <>
          {/* Resumen encabezado */}
          <div className="rounded-lg border p-4 grid gap-2 md:grid-cols-4">
  <div>
    <div className="text-sm text-slate-500">Empleado</div>
    <div className="font-medium">
      {data.employee.name} ({data.employee.code})
    </div>
  </div>

  <div>
    <div className="text-sm text-slate-500">Período</div>
    <div className="font-medium">
      {data.period.from} — {data.period.to}
    </div>
  </div>

  <div>
    <div className="text-sm text-slate-500">Moneda</div>
    <div className="font-medium">{data.currency}</div>
  </div>

  <div>
    <div className="text-sm text-slate-500">Salario base estimado</div>
    <div className="font-medium">
      {Number(data.employee.salary_amount || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
      })}{" "}
      {data.employee.salary_currency}{" "}
      <span className="text-xs text-slate-500">
        ({data.employee.salary_type === "hourly" ? "por hora" : "mensual"})
      </span>
    </div>
  </div>
</div>


                   {/* Horas */}
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold mb-2">Horas</h3>

            {/* Texto pequeño para indicar que viene de métricas si aplica */}
            {hours && (
  <div className="mb-2 text-xs text-slate-500">
    <p>
      Datos calculados desde /api/metrics/hours (
      horas trabajadas: {hours.total?.toFixed(2)} h,
      horas pagadas: {paidHours.toFixed(2)} h,
      extra día: {hours.extra_day?.toFixed(2)} h,
      extra semana: {hours.extra_week?.toFixed(2)} h
      )
    </p>

    <p>
      (total: {hours.total.toFixed(2)} h, extra día: {hours.extra_day.toFixed(2)} h,
      extra semana: {hours.extra_week.toFixed(2)} h)
    </p>

    {hours.total === 0 && paidHours > 0 && (
      <p className="mt-1 text-[11px] text-amber-700">
        Nota: en este período no hay horas registradas como trabajadas,
        pero se pagan horas (por ejemplo, feriados no laborados).
      </p>
    )}
  </div>
)}



            <ul className="grid md:grid-cols-3 gap-2 text-sm">
              <li>
                1x:{" "}
                <b>
                  {(
                    hours?.regular_1x ??
                    data.hours.regular_1x
                  ).toFixed(2)}
                </b>
              </li>
              <li>
                1.5x:{" "}
                <b>
                  {(
                    hours?.overtime_15 ??
                    data.hours.overtime_15
                  ).toFixed(2)}
                </b>
              </li>
              <li>
                2x:{" "}
                <b>
                  {(
                    hours?.double_20 ??
                    data.hours.double_20
                  ).toFixed(2)}
                </b>
              </li>
              <li>
                Incap. 50% (días):{" "}
                <b>
                  {hours?.sick_50pct_days ?? data.hours.sick_50pct_days}
                </b>
              </li>
              <li>
                Incap. 0% (días):{" "}
                <b>
                  {hours?.sick_0pct_days ?? data.hours.sick_0pct_days}
                </b>
              </li>

              {/* Extras solo si tenemos métricas */}
              {hours && (
                <>
                  <li>
                    Extra día (horas):{" "}
                    <b>{hours.extra_day.toFixed(2)}</b>
                  </li>
                  <li>
                    Extra semana (horas):{" "}
                    <b>{hours.extra_week.toFixed(2)}</b>
                  </li>
                </>
              )}
            </ul>
          </div>


          {/* Ingresos / Deducciones */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-2">Ingresos</h3>
              <table className="w-full text-sm">
                <tbody>
                  {data.incomes.map((i, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-1 pr-2">{i.label}</td>
                      <td className="py-1 text-right">
                        {i.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 text-right font-medium">
                Bruto: {data.total_gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-2">Deducciones</h3>
              <table className="w-full text-sm">
                <tbody>
                  {data.deductions.map((d, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-1 pr-2">{d.label}</td>
                      <td className="py-1 text-right">
                        {d.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 text-right font-medium">
                Deducciones: {data.total_deductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Neto + export */}
          <div className="rounded-lg border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className={`text-lg font-semibold ${data.net >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              Neto: {data.net.toLocaleString(undefined, { minimumFractionDigits: 2 })} {data.currency}
            </div>
            <div className="flex gap-2">
              <a
                className="px-3 py-2 rounded bg-slate-200 hover:bg-slate-300"
                href={`${api.defaults.baseURL}/statements/${employeeId}/export?type=pdf${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`}
                target="_blank"
                rel="noreferrer"
              >
                Exportar PDF
              </a>
              <a
                className="px-3 py-2 rounded bg-slate-200 hover:bg-slate-300"
                href={`${api.defaults.baseURL}/statements/${employeeId}/export?type=excel${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`}
                target="_blank"
                rel="noreferrer"
              >
                Exportar Excel
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
