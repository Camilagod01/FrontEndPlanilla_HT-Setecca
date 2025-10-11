import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import api from "../lib/api";
import { EmployeeHoursCard } from "../pages/EmployeeHoursCard";
import { useEmployeeHours } from "../lib/useEmployeeHours";
import { downloadBlob } from "../lib/downloadBlob";
import type { Position } from "../types/position";
import SickLeavesTab from "@/components/SickLeavesTab";

// ===== Tipos mínimos (flexibles para no romper) =====
type Maybe<T> = T | null | undefined;

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  code?: string;
  email?: string;
  position_id?: number | null;
  position?: Position | null;
  department?: string;
  work_shift?: string; // jornada
  start_date?: string; // YYYY-MM-DD
  status?: string; // active|inactive (backend)
}

interface TimeEntry {
  id: number;
  work_date: string;
  check_in?: string | null;
  check_out?: string | null;
  notes?: string | null;
  source?: string | null;
}

/** ==== Helper: calcula tarifa por hora a partir del puesto ====
 * Regla:
 *  - Si salary_type === 'hourly', usar default_salary_amount; si viene vacío, caer a base_hourly_rate (legacy).
 *  - Si salary_type === 'monthly', no mostramos tarifa por hora (rate=0) a menos que decidas una fórmula.
 */
function getHourlyFromPosition(
  p?: Position | null
): { rate: number; currency: string; monthly?: number } {
  const currency = p?.default_salary_currency ?? p?.currency ?? "CRC";
  if (!p) return { rate: 0, currency };

  // 1) Si es hourly y viene default_salary_amount -> úsalo
  if (p.salary_type === "hourly") {
    const r = Number(p.default_salary_amount ?? p.base_hourly_rate);
    return { rate: Number.isFinite(r) && r > 0 ? r : 0, currency };
  }

  // 2) Si existe base_hourly_rate (legacy), úsalo aunque salary_type sea monthly
  const legacy = Number(p.base_hourly_rate);
  if (Number.isFinite(legacy) && legacy > 0) return { rate: legacy, currency };

  // 3) Si es monthly, convierte a hora con un divisor estándar
  const monthly = Number(p.default_salary_amount);
  if (p.salary_type === "monthly" && Number.isFinite(monthly) && monthly > 0) {
    const HOURS_PER_MONTH = 173.33; // 8h * 5d * 4.333w
    const derived = monthly / HOURS_PER_MONTH;
    return { rate: derived, currency, monthly };
  }

  return { rate: 0, currency };
}

// ===== Página principal =====
export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [emp, setEmp] = useState<Maybe<Employee>>(null);
  const [loadingEmp, setLoadingEmp] = useState<boolean>(true);
  const [tab, setTab] = useState<
    "general" | "hours" | "sick" | "punches" | "finance" | "vacations" | "bonus"
  >("general");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingEmp(true);
        const res = await api.get(`/employees/${id}`, { params: { include: "position" } });
        if (alive) setEmp((res.data?.data ?? res.data) as Employee);
      } catch (err) {
        console.error(err);
        alert("No se pudo cargar el empleado");
      } finally {
        if (alive) setLoadingEmp(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (loadingEmp) return <div className="p-4">Cargando empleado…</div>;
  if (!emp) return <div className="p-4">No se encontró el empleado.</div>;

  const { rate: hourlyRate, currency: hourlyCurrency } = getHourlyFromPosition(emp.position);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">
        Perfil: {emp.first_name} {emp.last_name} {emp.code ? `( #${emp.code} )` : ""}
      </h1>
      <div className="text-sm text-gray-600 mb-4">
        {[emp.department, emp.position?.name].filter(Boolean).join(" · ")}
      </div>

      <div className="flex gap-2 mb-6">
        {(
          [
            ["general", "Datos generales"],
            ["hours", "Horas laboradas"],
            ["sick", "Incapacidades"],
            ["punches", "Marcaciones"],
            ["finance", "Finanzas"],
            ["vacations", "Vacaciones"],
            ["bonus", "Aguinaldo"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-2 rounded ${tab === key ? "bg-black text-white" : "bg-gray-100"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "general" && <GeneralSection emp={emp} onUpdated={setEmp} />}

      {tab === "hours" && (
        <HoursSection empId={Number(id)} hourlyRate={hourlyRate} currency={hourlyCurrency} />
      )}

      {tab === "sick" && <SickLeavesTab employeeId={emp.id} />}
      {tab === "punches" && <PunchesSection empId={Number(id)} />}
      {tab === "finance" && <FinanceSection empId={Number(id)} />}
      {tab === "vacations" && <Placeholder text="Vacaciones (pendiente de diseño y API)" />}
      {tab === "bonus" && <Placeholder text="Aguinaldo (pendiente de diseño y API)" />}
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return <div className="p-4 border rounded bg-yellow-50">{text}</div>;
}

/* ===== (a) Datos generales — PUT /api/employees/:id y PATCH /api/employees/:id/position ===== */
function GeneralSection({
  emp,
  onUpdated,
}: {
  emp: Employee;
  onUpdated: (e: Employee) => void;
}) {
  const [form, setForm] = useState({
    email: emp.email ?? "",
    work_shift: emp.work_shift ?? "",
    start_date: emp.start_date ?? "",
    status: emp.status === "inactive" ? "inactive" : "active",
  });
  const [saving, setSaving] = useState(false);

  // === Edición de puesto ===
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedPos, setSelectedPos] = useState<number | "">(emp.position_id ?? "");
  const [savingPos, setSavingPos] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/positions", { params: { per_page: 100 } });
        const raw = res.data as any;
        const list: Position[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        setPositions(list);
        setSelectedPos(emp.position_id ?? "");
      } catch (e) {
        console.error(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emp.id]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSave = async () => {
    try {
      setSaving(true);
      await api.put(`/employees/${emp.id}`, form);
      const rereq = await api.get(`/employees/${emp.id}`, { params: { include: "position" } });
      const fresh = (rereq.data as any)?.data ?? rereq.data;
      onUpdated(fresh as Employee);
      alert("Cambios guardados");
    } catch (err: any) {
      console.error("PUT /employees error", err?.response?.status, err?.response?.data);
      alert(err?.response?.data?.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const onSavePosition = async () => {
    try {
      setSavingPos(true);
      const payload = {
        position_id: selectedPos === "" ? null : Number(selectedPos),
      };
      const up = await api.patch(`/employees/${emp.id}/position`, payload);

      const fresh = (up.data as any) ?? null;
      if (fresh && (fresh.position || fresh.position_id !== undefined)) {
        onUpdated(fresh as Employee);
      } else {
        const rereq = await api.get(`/employees/${emp.id}`, { params: { include: "position" } });
        onUpdated(((rereq.data as any)?.data ?? rereq.data) as Employee);
      }
      alert("Puesto actualizado");
    } catch (e: any) {
      console.error("update position error", e?.response?.status, e?.response?.data);
      alert(e?.response?.data?.message || "No se pudo actualizar el puesto");
    } finally {
      setSavingPos(false);
    }
  };

  const { rate: salaryRate, currency: salaryCurrency, monthly } =
    getHourlyFromPosition(emp.position);

  <p>
    <strong>Salario base por hora:</strong>{" "}
    {salaryRate > 0
      ? `${salaryCurrency === "USD" ? "$" : "₡"}${salaryRate.toLocaleString()} ${salaryCurrency}`
      : "—"}
  </p>

  {/* Si viene mensual, muéstralo explícito también */}
  {typeof monthly === "number" && monthly > 0 && (
    <p className="text-sm text-gray-600">
      Salario base mensual:{" "}
      {`${salaryCurrency === "USD" ? "$" : "₡"}${monthly.toLocaleString()} ${salaryCurrency}`}
      {" "} (tarifa horaria estimada con 173.33 h/mes)
    </p>
  )}

  return (
    <div className="grid gap-4 max-w-2xl">
      {/* Tarjeta de puesto y salario — con editor */}
      <div className="border rounded p-3">
        <h3 className="font-medium mb-2">Puesto y salario</h3>

        {/* Selector de puesto */}
        <div className="flex flex-wrap items-end gap-2 mb-3">
          <label className="grid">
            <span className="text-sm">Puesto</span>
            <select
              className="border p-2 rounded min-w-[240px]"
              value={selectedPos}
              onChange={(e) => setSelectedPos(e.target.value === "" ? "" : Number(e.target.value))}
            >
              <option value="">(sin puesto)</option>
              {(Array.isArray(positions) ? positions : []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.code ? `(${p.code})` : ""}
                </option>
              ))}
            </select>
          </label>
          <button
            className="px-3 py-2 border rounded disabled:opacity-50"
            disabled={savingPos || (emp.position_id ?? "") === selectedPos}
            onClick={onSavePosition}
          >
            {savingPos ? "Guardando…" : "Guardar puesto"}
          </button>
        </div>

        <p>
          <strong>Puesto:</strong>{" "}
          {emp.position?.name ? `${emp.position.name}${emp.position.code ? ` (${emp.position.code})` : ""}` : "—"}
        </p>
        <p>
          <strong>Salario base por hora:</strong>{" "}
          {salaryRate > 0
            ? `${salaryCurrency === "USD" ? "$" : "₡"}${salaryRate.toLocaleString()} ${salaryCurrency}`
            : "—"}
        </p>
      </div>

      {/* Campos editables */}
      <label className="grid gap-1">
        <span>Email</span>
        <input className="border p-2 rounded" name="email" value={form.email} onChange={onChange} />
      </label>

      <label className="grid gap-1">
        <span>Jornada</span>
        <select className="border p-2 rounded" name="work_shift" value={form.work_shift} onChange={onChange}>
          <option value="">Selecciona…</option>
          <option value="diurna">Diurna</option>
          <option value="nocturna">Nocturna</option>
          <option value="mixta">Mixta</option>
        </select>
      </label>

      <label className="grid gap-1">
        <span>Fecha inicio</span>
        <input type="date" className="border p-2 rounded" name="start_date" value={form.start_date} onChange={onChange} />
      </label>

      <label className="grid gap-1">
        <span>Estado</span>
        <select className="border p-2 rounded" name="status" value={form.status} onChange={onChange}>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </label>

      <button disabled={saving} onClick={onSave} className="bg-blue-600 text-white px-4 py-2 rounded">
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </div>
  );
}

/* ===== (b) Horas — GET /api/metrics/hours?employee_id&from&to ===== */
function HoursSection({
  empId,
  hourlyRate,
  currency = "CRC",
}: {
  empId: number;
  hourlyRate: number;
  currency?: string;
}) {
  const [from, setFrom] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [to, setTo] = useState(dayjs().endOf("month").format("YYYY-MM-DD"));

  const { data, loading, error } = useEmployeeHours(empId, from, to);

  // Helpers
  const toNum = (v: any, def = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  };
  const pickNum = (...vals: any[]) => {
    for (const v of vals) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return 0;
  };

  // Normaliza estructura (algunos backends anidan en .data/.result)
  const raw: any = data ?? {};
  const d: any = raw?.data ?? raw?.result ?? raw;

  // Días (para sumar horas si no viene total)
  const daysArr: any[] =
    Array.isArray(d?.days) ? d.days : Array.isArray(d?.data?.days) ? d.data.days : [];

  const sumDays = daysArr.reduce((acc, it) => acc + toNum(it?.hours ?? it?.h, 0), 0);

  // Total de horas
  const total = toNum(d?.total_hours ?? d?.totalHours ?? d?.total, sumDays);

  // Overtime: intentar muchas formas de clave
  const ot: any = d?.overtime ?? d?.ot ?? {};

  // Umbral diario para fallback (por defecto 8h)
  const dailyThreshold = toNum(ot?.daily_threshold ?? d?.rules?.daily_base ?? d?.rules?.dailyLimit, 8);

  // Horas extra (día)
  let dailyOH = pickNum(
    ot?.daily_hours,
    ot?.dailyHours,
    ot?.daily,
    ot?.day,
    ot?.day_hours,
    ot?.dayHours,
    ot?.daily?.hours,
    ot?.day?.hours,
    d?.extra_day,
    d?.extraDay
  );
  if (!dailyOH && daysArr.length) {
    dailyOH = daysArr.reduce((acc, it) => {
      const h = toNum(it?.hours ?? it?.h, 0);
      return acc + Math.max(0, h - dailyThreshold);
    }, 0);
  }

  // Horas extra (semana)
  const weeklyOH = pickNum(
    ot?.weekly_hours,
    ot?.weeklyHours,
    ot?.weekly,
    ot?.week,
    ot?.week_hours,
    ot?.weekHours,
    ot?.weekly?.hours,
    ot?.week?.hours,
    d?.extra_week,
    d?.extraWeek
  );

  // Multiplicadores (defaults razonables si no llegan)
  const mult: any = ot?.multipliers ?? ot?.mult ?? {};
  const mDaily = toNum(mult?.daily ?? mult?.dailyMultiplier, 1.5);
  const mWeekly = toNum(mult?.weekly ?? mult?.weeklyMultiplier, 2);

  // Horas regulares (no negativas)
  const regularHours = Math.max(0, total - dailyOH - weeklyOH);

  // Cálculo de salario
  const rate = toNum(hourlyRate, 0);
  const payRegular = regularHours * rate;
  const payDailyOT = dailyOH * rate * mDaily;
  const payWeeklyOT = weeklyOH * rate * mWeekly;
  const payTotal = payRegular + payDailyOT + payWeeklyOT;

  const money = (n: number) =>
    `${currency === "USD" ? "$" : "₡"}${n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;

  return (
    <div className="grid gap-3">
      {/* Filtros de rango */}
      <div className="flex gap-2 items-end">
        <label className="grid">
          <span>Desde</span>
          <input type="date" className="border p-2 rounded" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="grid">
          <span>Hasta</span>
          <input type="date" className="border p-2 rounded" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      {/* Card existente de horas */}
      <EmployeeHoursCard result={data} loading={loading} error={error} />

      {/* Salario estimado según puesto */}
      <div className="mt-4 border rounded p-3">
        <h3 className="font-medium mb-2">Salario estimado</h3>

        {rate <= 0 ? (
          <div className="text-sm text-red-700">
            Este empleado no tiene definida una tarifa por hora en su puesto.
          </div>
        ) : (
          <div className="text-sm space-y-1">
            <div>
              <strong>Tarifa:</strong> {money(rate)} / hora
            </div>
            <div className="mt-2">
              <strong>Horas del período:</strong> {total.toFixed(2)} h
            </div>
            <ul className="list-disc pl-5">
              <li>Regulares: {regularHours.toFixed(2)} h → {money(payRegular)}</li>
              <li>Extra (día): {dailyOH.toFixed(2)} h × {mDaily} → {money(payDailyOT)}</li>
              <li>Extra (semana): {weeklyOH.toFixed(2)} h × {mWeekly} → {money(payWeeklyOT)}</li>
            </ul>
            <div className="mt-2 text-lg">
              <strong>Total estimado: {money(payTotal)}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== (c) Marcaciones — GET /api/time-entries?employee_id=&date=&status=&page= ===== */
function PunchesSection({ empId }: { empId: number }) {
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<TimeEntry[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1 });
  const [loading, setLoading] = useState(false);

  // --- controles para export ---
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);

  // mapea el status de la UI al que espera el backend
  const statusApi =
    status === "ok"
      ? "completo"
      : status === "incompleta"
      ? "pendiente_salida"
      : status === "anomala"
      ? "anómala"
      : "";

  const fetchEntries = async (p = page) => {
    try {
      setLoading(true);
      const res = await api.get("/time-entries", {
        params: {
          employee_id: empId,
          date: date || undefined,
          status: status || undefined,
          page: p,
        },
      });

      const d = res.data as any;
      if (Array.isArray(d)) {
        setRows(d as TimeEntry[]);
        setMeta({ current_page: 1, last_page: 1 });
      } else {
        setRows((d?.data ?? []) as TimeEntry[]);
        setMeta({
          current_page: d?.current_page ?? p,
          last_page: d?.last_page ?? 1,
        });
      }
    } catch (err) {
      console.error(err);
      alert("No se pudo cargar marcaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => {
    setPage(1);
    fetchEntries(1);
  };

  // Exportar CSV por empleado
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();

      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (!from && !to && date) {
        params.set("from", date);
        params.set("to", date);
      }

      if (statusApi) params.set("status", statusApi);
      params.set("format", "csv");

      const res = await api.get(
        `/employees/${empId}/time-entries/export?${params.toString()}`,
        { responseType: "blob" }
      );

      const ff = (s?: string | null) => (s && s.trim()) || "all";
      const fname = `marcaciones_emp${empId}_${ff(params.get("from"))}_${ff(
        params.get("to")
      )}_${statusApi || "todos"}.csv`;
      downloadBlob(res.data, fname);
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.message || "No se pudo exportar");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="grid gap-4">
      {/* Filtros para la TABLA */}
      <div className="flex flex-wrap gap-2 items-end">
        <label className="grid">
          <span>Fecha (tabla)</span>
          <input
            type="date"
            className="border p-2 rounded"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <label className="grid">
          <span>Status</span>
          <select
            className="border p-2 rounded"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="ok">OK</option>
            <option value="incompleta">Incompleta</option>
            <option value="anomala">Anómala</option>
          </select>
        </label>

        <button onClick={applyFilters} className="bg-gray-900 text-white px-4 py-2 rounded">
          {loading ? "Buscando…" : "Filtrar"}
        </button>
      </div>

      {/* Controles para EXPORT por empleado */}
      <div className="flex flex-wrap gap-2 items-end">
        <label className="grid">
          <span>Desde (export)</span>
          <input type="date" className="border p-2 rounded" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>

        <label className="grid">
          <span>Hasta (export)</span>
          <input type="date" className="border p-2 rounded" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>

        <button
          onClick={handleExportCSV}
          className="px-3 py-2 border rounded disabled:opacity-50"
          disabled={exporting}
          aria-label="Exportar marcaciones del empleado en CSV"
          title="Exportar CSV"
        >
          {exporting ? "Exportando…" : "Exportar CSV"}
        </button>

        <div className="text-xs text-gray-500">
          Tip: si no defines “Desde/Hasta”, usa la fecha del filtro de tabla.
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-auto border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-2">Fecha</th>
              <th className="text-left p-2">Entrada</th>
              <th className="text-left p-2">Salida</th>
              <th className="text-left p-2">Notas</th>
              <th className="text-left p-2">Origen</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.work_date}</td>
                <td className="p-2">{r.check_in ?? "-"}</td>
                <td className="p-2">{r.check_out ?? "-"}</td>
                <td className="p-2">{r.notes ?? ""}</td>
                <td className="p-2">{r.source ?? ""}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="p-3" colSpan={5}>
                  Sin registros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center gap-2">
        <button
          disabled={meta.current_page <= 1}
          onClick={() => {
            const p = meta.current_page - 1;
            setPage(p);
            fetchEntries(p);
          }}
          className="px-3 py-1 border rounded"
        >
          «
        </button>
        <div>
          Página {meta.current_page} / {meta.last_page}
        </div>
        <button
          disabled={meta.current_page >= meta.last_page}
          onClick={() => {
            const p = meta.current_page + 1;
            setPage(p);
            fetchEntries(p);
          }}
          className="px-3 py-1 border rounded"
        >
          »
        </button>
      </div>
    </div>
  );
}

/* ===== (d) Finanzas — advances, loans, garnishments ===== */
function FinanceSection({ empId }: { empId: number }) {
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState({
    advances: 0,
    loans: 0,
    garnishments: 0,
  });

  const fetchFinance = async () => {
    try {
      setLoading(true);
      const [adv, loans, garn] = await Promise.all([
        api.get("/finances/advances", { params: { employee_id: empId } }),
        api.get("/finances/loans", { params: { employee_id: empId } }),
        api.get("/finances/garnishments", { params: { employee_id: empId } }),
      ]);

      const sum = (data: any, pick: (x: any) => number) => {
        if (Array.isArray(data)) return data.reduce((a, b) => a + (pick(b) || 0), 0);
        if (typeof data?.total === "number") return data.total;
        return 0;
      };

      const advancesSum = sum(adv.data, (x) => x.amount ?? x.total ?? 0);
      const loansSum = sum(loans.data, (x) => x.balance ?? x.amount ?? x.total ?? 0);
      const garnSum = sum(garn.data, (x) => x.amount ?? x.total ?? 0);

      setTotals({
        advances: advancesSum,
        loans: loansSum,
        garnishments: garnSum,
      });
    } catch (err) {
      console.error(err);
      alert("No se pudo cargar finanzas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinance();
  }, [empId]);

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Metric title="Adelantos" value={totals.advances} loading={loading} />
      <Metric title="Préstamos" value={totals.loans} loading={loading} />
      <Metric title="Embargos" value={totals.garnishments} loading={loading} />
    </div>
  );
}

function Metric({ title, value, loading }: { title: string; value: number; loading: boolean }) {
  return (
    <div className="p-4 border rounded">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-3xl font-semibold">
        {loading ? "…" : `₡${Number(value).toLocaleString()}`}
      </div>
    </div>
  );
}