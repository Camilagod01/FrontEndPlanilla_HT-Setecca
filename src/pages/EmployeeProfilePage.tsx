import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import api from "../lib/api"; // OJO: estás en /pages → sube a /lib
import {EmployeeHoursCard} from "../pages/EmployeeHoursCard";
import { useEmployeeHours } from "../lib/useEmployeeHours";

import { downloadBlob } from "../lib/downloadBlob";




// ===== Tipos mínimos (flexibles para no romper) =====
type Maybe<T> = T | null | undefined;

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  code?: string;
  email?: string;
  position?: string;
  department?: string;
  work_shift?: string;   // jornada
  start_date?: string;   // YYYY-MM-DD
  status?: string;       // activo|inactivo|suspendido|...
}

interface TimeEntry {
  id: number;
  work_date: string;
  check_in?: string | null;
  check_out?: string | null;
  notes?: string | null;
  source?: string | null;
}

// ===== Página principal =====
export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [emp, setEmp] = useState<Maybe<Employee>>(null);
  const [loadingEmp, setLoadingEmp] = useState<boolean>(true);
  const [tab, setTab] = useState<
    "general" | "hours" | "punches" | "finance" | "vacations" | "bonus"
  >("general");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingEmp(true);
        const res = await api.get(`/employees/${id}`);
        if (alive) setEmp(res.data as Employee);
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

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">
        Perfil: {emp.first_name} {emp.last_name} {emp.code ? `( #${emp.code} )` : ""}
      </h1>
      <div className="text-sm text-gray-600 mb-4">
        {[emp.department, emp.position].filter(Boolean).join(" · ")}
      </div>

      <div className="flex gap-2 mb-6">
        {(
          [
            ["general", "Datos generales"],
            ["hours", "Horas laboradas"],
            ["punches", "Marcaciones"],
            ["finance", "Finanzas"],
            ["vacations", "Vacaciones"],
            ["bonus", "Aguinaldo"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-2 rounded ${
              tab === key ? "bg-black text-white" : "bg-gray-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "general" && <GeneralSection emp={emp} onUpdated={setEmp} />}
      {tab === "hours" && <HoursSection empId={Number(id)} />}
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

/* ===== (a) Datos generales — PATCH /api/employees/:id ===== */
function GeneralSection({
  emp,
  onUpdated,
}: {
  emp: Employee;
  onUpdated: (e: Employee) => void;
}) {
  const [form, setForm] = useState({
    email: emp.email ?? "",
    position: emp.position ?? "",
    work_shift: emp.work_shift ?? "",
    start_date: emp.start_date ?? "",
    status: emp.status ?? "activo",
  });
  const [saving, setSaving] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSave = async () => {
    try {
      setSaving(true);
      const res = await api.patch(`/employees/${emp.id}`, form);
      onUpdated(res.data as Employee);
      alert("Cambios guardados");
    } catch (err) {
      console.error(err);
      alert("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 max-w-xl">
      <label className="grid gap-1">
        <span>Email</span>
        <input className="border p-2 rounded" name="email" value={form.email} onChange={onChange} />
      </label>
      <label className="grid gap-1">
        <span>Puesto</span>
        <input
          className="border p-2 rounded"
          name="position"
          value={form.position}
          onChange={onChange}
        />
      </label>
      <label className="grid gap-1">
        <span>Jornada</span>
        <select
          className="border p-2 rounded"
          name="work_shift"
          value={form.work_shift}
          onChange={onChange}
        >
          <option value="">Selecciona…</option>
          <option value="diurna">Diurna</option>
          <option value="nocturna">Nocturna</option>
          <option value="mixta">Mixta</option>
        </select>
      </label>
      <label className="grid gap-1">
        <span>Fecha inicio</span>
        <input
          type="date"
          className="border p-2 rounded"
          name="start_date"
          value={form.start_date}
          onChange={onChange}
        />
      </label>
      <label className="grid gap-1">
        <span>Estado</span>
        <select
          className="border p-2 rounded"
          name="status"
          value={form.status}
          onChange={onChange}
        >
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
          <option value="suspendido">Suspendido</option>
        </select>
      </label>

      <button disabled={saving} onClick={onSave} className="bg-blue-600 text-white px-4 py-2 rounded">
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </div>
  );
}

/* ===== (b) Horas — GET /api/metrics/hours?employee_id&from&to ===== */
function HoursSection({ empId }: { empId: number }) {
  const [from, setFrom] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [to, setTo] = useState(dayjs().endOf("month").format("YYYY-MM-DD"));

  // Hook que llama a fetchEmployeeHours y devuelve {data, loading, error}
  const { data, loading, error } = useEmployeeHours(empId, from, to);

  return (
    <div className="grid gap-3">
      <div className="flex gap-2 items-end">
        <label className="grid">
          <span>Desde</span>
          <input
            type="date"
            className="border p-2 rounded"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="grid">
          <span>Hasta</span>
          <input
            type="date"
            className="border p-2 rounded"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        {/* No hace falta botón “Aplicar”: cambiar fechas refresca el hook */}
      </div>

      <EmployeeHoursCard result={data} loading={loading} error={error} />
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
    status === "ok" ? "completo" :
    status === "incompleta" ? "pendiente_salida" :
    status === "anomala" ? "anómala" : "";

  const fetchEntries = async (p = page) => {
    try {
      setLoading(true);
      const res = await api.get("/time-entries", {
        params: { employee_id: empId, date: date || undefined, status: status || undefined, page: p },
      });

      const d = res.data as any;
      if (Array.isArray(d)) {
        setRows(d as TimeEntry[]);
        setMeta({ current_page: 1, last_page: 1 });
      } else {
        setRows((d?.data ?? []) as TimeEntry[]);
        setMeta({ current_page: d?.current_page ?? p, last_page: d?.last_page ?? 1 });
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

      // usar from/to del bloque de export; si no, cae al filtro 'date' de la tabla
      if (from) params.set("from", from);
      if (to)   params.set("to", to);
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

  // ids para accesibilidad
  const dateId = `date-${empId}`;
  const statusId = `status-${empId}`;
  const fromId = `from-${empId}`;
  const toId = `to-${empId}`;

  return (
    <div className="grid gap-4">
      {/* Filtros para la TABLA */}
      <div className="flex flex-wrap gap-2 items-end">
        <label className="grid">
          <span>Fecha (tabla)</span>
          <input
            id={dateId}
            type="date"
            className="border p-2 rounded"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <label className="grid">
          <span>Status</span>
          <select
            id={statusId}
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
          <input
            id={fromId}
            type="date"
            className="border p-2 rounded"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>

        <label className="grid">
          <span>Hasta (export)</span>
          <input
            id={toId}
            type="date"
            className="border p-2 rounded"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
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
  const [totals, setTotals] = useState({ advances: 0, loans: 0, garnishments: 0 });

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

      setTotals({ advances: advancesSum, loans: loansSum, garnishments: garnSum });
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
      <div className="text-3xl font-semibold">{loading ? "…" : `₡${Number(value).toLocaleString()}`}</div>
    </div>
  );
}