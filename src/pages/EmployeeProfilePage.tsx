import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import api from "../lib/api";
import { EmployeeHoursCard } from "../pages/EmployeeHoursCard";
import { useEmployeeHours } from "../lib/useEmployeeHours";
import { downloadBlob } from "../lib/downloadBlob";
import type { Position } from "../types/position";
import SickLeavesTab from "@/components/SickLeavesTab";
import EmployeeVacationsTab from "../components/EmployeeVacationsTab";
import { getEmployeeAguinaldoByCode, AguinaldoItem } from "@/api/aguinaldo";
import { getLoanPayments, updateLoanPayment, type LoanPayment } from "@/api/loans";

// ===== Tipos mínimos =====
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
  work_shift?: "diurna" | "nocturna" | "mixta" | null;
  hire_date?: string; // YYYY-MM-DD
  status?: string; // active|inactive
}

interface TimeEntry {
  id: number;
  work_date: string;
  check_in?: string | null;
  check_out?: string | null;
  notes?: string | null;
  source?: string | null;
}

// ==== Parámetros de planilla para calcular horas del mes ====
type PayrollSettings = {
  workday_hours_diurnal: number | string | null;
  workday_hours_nocturnal: number | string | null;
};

/**
 * Calcula cuántas horas "normales" se esperan en un mes:
 * - Usa los parámetros de planilla (diurnas/nocturnas)
 * - Usa la jornada del empleado (diurna / nocturna / mixta)
 * - Cuenta solo Lunes–Sábado (Domingo se deja fuera porque es doble si se trabaja)
 */
function computeStandardMonthHours(
  settings: PayrollSettings | null,
  workShift: "diurna" | "nocturna" | "mixta" | null | undefined,
  referenceDate?: string
): number {
  if (!settings) {
    return 173.33; // fallback clásico
  }

  const ref = referenceDate ? dayjs(referenceDate) : dayjs(); // mes actual por defecto
  const daysInMonth = ref.daysInMonth();

  const diurnal =
    settings.workday_hours_diurnal != null
      ? Number(settings.workday_hours_diurnal)
      : 8;
  const nocturnal =
    settings.workday_hours_nocturnal != null
      ? Number(settings.workday_hours_nocturnal)
      : 6;

  const isNight = workShift === "nocturna";
  const dailyHours = isNight ? nocturnal : diurnal;

  let total = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = ref.date(day);
    const dow = d.day(); // 0 = Domingo, 1 = Lunes, ... 6 = Sábado
    if (dow === 0) continue; // saltamos domingos
    total += dailyHours;
  }

  return total > 0 ? total : 173.33;
}

/** ==== Helper: calcula tarifa por hora a partir del puesto + planilla ==== */
function getHourlyFromPosition(
  p?: Position | null,
  opts?: {
    payrollSettings?: PayrollSettings | null;
    workShift?: "diurna" | "nocturna" | "mixta" | null;
    referenceDate?: string; // opcional
  }
): { rate: number; currency: string; monthly?: number } {
  const currency = p?.default_salary_currency ?? p?.currency ?? "CRC";
  if (!p) return { rate: 0, currency };

  const standardMonthHours = computeStandardMonthHours(
    opts?.payrollSettings ?? null,
    opts?.workShift ?? null,
    opts?.referenceDate
  );
  const HOURS_PER_MONTH = standardMonthHours > 0 ? standardMonthHours : 173.33;

  // 1) Caso salario por hora
  if (p.salary_type === "hourly") {
    const r = Number(p.default_salary_amount ?? p.base_hourly_rate);
    const rate = Number.isFinite(r) && r > 0 ? r : 0;

    if (rate > 0) {
      const monthly = rate * HOURS_PER_MONTH;
      return { rate, currency, monthly };
    }

    return { rate: 0, currency };
  }

  // 2) Caso "legacy" base_hourly_rate con salario mensual desconocido
  const legacy = Number(p.base_hourly_rate);
  if (Number.isFinite(legacy) && legacy > 0) {
    const monthly = legacy * HOURS_PER_MONTH;
    return { rate: legacy, currency, monthly };
  }

  // 3) Caso salario mensual (salary_type === "monthly")
  const monthly = Number(p.default_salary_amount);
  if (p.salary_type === "monthly" && Number.isFinite(monthly) && monthly > 0) {
    const derived = monthly / HOURS_PER_MONTH;
    return { rate: derived, currency, monthly };
  }

  return { rate: 0, currency };
}

/** ===== Helper formato fecha estándar dd/mm/yyyy ===== */
function formatDate(raw?: string | null) {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    return raw.slice(0, 10);
  }
  return d.toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// DD/MM/YYYY para otros casos
const fmtDate = (d?: string | null) => {
  if (!d) return "-";
  const x = new Date(d);
  if (isNaN(x.getTime())) return String(d).slice(0, 10);
  return x.toLocaleDateString("es-CR");
};

// ===== Página principal =====
export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // === Parámetros de planilla (diurnas/nocturnas) ===
  const [payrollSettings, setPayrollSettings] = useState<PayrollSettings | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const res = await fetch("/api/payroll-settings", {
          headers: { Accept: "application/json" },
          credentials: "include",
        });

        if (!res.ok) {
          console.error("Error cargando payroll-settings", res.status);
          return;
        }

        const data = await res.json();
        if (!isMounted) return;

        setPayrollSettings({
          workday_hours_diurnal: data.workday_hours_diurnal ?? null,
          workday_hours_nocturnal: data.workday_hours_nocturnal ?? null,
        });
      } catch (err) {
        console.error("Fallo al obtener payroll-settings", err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const [emp, setEmp] = useState<Maybe<Employee>>(null);
  const [loadingEmp, setLoadingEmp] = useState<boolean>(true);
  const [tab, setTab] = useState<
    | "general"
    | "hours"
    | "sick"
    | "punches"
    | "finance"
    | "vacations"
    | "bonus"
    | "statement"
  >("general");

  const [aguinaldo, setAguinaldo] = useState<AguinaldoItem | null>(null);
  const [loadingAguinaldo, setLoadingAguinaldo] = useState(false);
  const [errorAguinaldo, setErrorAguinaldo] = useState<string | null>(null);

  // Carga de empleado
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingEmp(true);
        const res = await api.get(`/employees/${id}`, {
          params: { include: "position" },
        });
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

  // === Cálculo de salario base (hora y mensual) según puesto + planilla + calendario ===
  const hourlyInfo = emp
    ? getHourlyFromPosition(emp.position, {
        payrollSettings,
        workShift: emp.work_shift ?? null,
        // referenceDate: emp.hire_date ?? undefined, // opcional
      })
    : { rate: 0, currency: "CRC", monthly: undefined };

  const salaryRate = hourlyInfo.rate;
  const salaryCurrency = hourlyInfo.currency;
  const monthly = hourlyInfo.monthly ?? 0;

  // Cargar aguinaldo del empleado
  useEffect(() => {
    if (!emp || !emp.code) return;

    const asOf = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const loadAguinaldo = async () => {
      try {
        setLoadingAguinaldo(true);
        setErrorAguinaldo(null);

        const data = await getEmployeeAguinaldoByCode(emp.code ?? "", asOf);
        setAguinaldo(data);
      } catch (err) {
        console.error(err);
        setErrorAguinaldo("No se pudo cargar el aguinaldo de este empleado.");
        setAguinaldo(null);
      } finally {
        setLoadingAguinaldo(false);
      }
    };

    loadAguinaldo();
  }, [emp]);

  if (loadingEmp)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl px-4 py-3 text-sm text-slate-700">
          Cargando empleado…
        </div>
      </div>
    );

  if (!emp)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-rose-200 text-rose-700 shadow-sm rounded-2xl px-4 py-3 text-sm">
          No se encontró el empleado.
        </div>
      </div>
    );

  const statusLabel =
    emp.status === "inactive" ? "Inactivo" : emp.status ? "Activo" : "Activo";
  const statusColor =
    emp.status === "inactive"
      ? "bg-rose-50 text-rose-700 border border-rose-200"
      : "bg-emerald-50 text-emerald-700 border border-emerald-200";

  const workShift = emp.work_shift ?? "diurna";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8">
        {/* Header de perfil */}
        <div className="mb-5 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 flex flex-wrap items-center gap-2">
                <span>
                  Perfil: {emp.first_name} {emp.last_name}
                </span>
                {emp.code && (
                  <span className="text-sm font-medium text-slate-500">
                    (#{emp.code})
                  </span>
                )}
              </h1>
              <div className="mt-1 text-sm text-slate-500 flex flex-wrap gap-2">
                {[emp.department, emp.position?.name]
                  .filter(Boolean)
                  .map((chunk, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1">
                      {idx > 0 && (
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                      )}
                      <span>{chunk}</span>
                    </span>
                  ))}
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end gap-2 text-xs text-slate-500">
              <div
                className={`inline-flex items-center px-2 py-1 rounded-full ${statusColor}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current/60 mr-1.5" />
                <span className="font-medium text-[11px] uppercase tracking-wide">
                  {statusLabel}
                </span>
              </div>
              <div className="space-y-0.5 text-xs">
                <div className="flex gap-1">
                  <span className="font-medium text-slate-600">ID interno:</span>
                  <span className="text-slate-800">{emp.id}</span>
                </div>
                {emp.hire_date && (
                  <div className="flex gap-1">
                    <span className="font-medium text-slate-600">
                      Fecha inicio:
                    </span>
                    <span className="text-slate-800">
                      {formatDate(emp.hire_date)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-5">
            <div className="inline-flex flex-wrap gap-1 bg-slate-100/80 border border-slate-200 rounded-xl p-1">
              {(
                [
                  ["general", "Datos generales"],
                  ["hours", "Horas laboradas"],
                  ["sick", "Incapacidades"],
                  ["punches", "Marcaciones"],
                  ["finance", "Finanzas"],
                  ["vacations", "Vacaciones"],
                  ["bonus", "Aguinaldo"],
                  ["statement", "Estado de cuenta"],
                ] as const
              ).map(([key, label]) => {
                const active = tab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={[
                      "px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors",
                      active
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Contenido de pestañas */}
        {tab === "general" && (
          <GeneralSection
            emp={emp}
            onUpdated={setEmp}
            payrollSettings={payrollSettings}
          />
        )}

        {tab === "hours" && (
  <HoursSection emp={emp} payrollSettings={payrollSettings} />
)}


        {tab === "sick" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
            <SickLeavesTab employeeId={emp.id} />
          </div>
        )}

        {tab === "punches" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
            <PunchesSection empId={Number(id)} />
          </div>
        )}

        {tab === "finance" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
            <FinanceSection empId={Number(id)} />
          </div>
        )}

        {tab === "vacations" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
            <EmployeeVacationsTab employeeId={emp.id} />
          </div>
        )}

        {tab === "bonus" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
            <h2 className="text-lg font-semibold mb-3 text-slate-900">
              Aguinaldo
            </h2>

            {loadingAguinaldo && <p>Cargando aguinaldo…</p>}

            {errorAguinaldo && (
              <p className="text-red-600 text-sm">{errorAguinaldo}</p>
            )}

            {!loadingAguinaldo && !errorAguinaldo && aguinaldo && (
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/80 text-sm space-y-1.5">
                <p className="text-slate-600">
                  Período considerado:{" "}
                  <strong className="text-slate-900">
                    {aguinaldo.period.from} — {aguinaldo.period.to}
                  </strong>
                </p>
                <p>
                  Base (salarios acumulados):{" "}
                  <strong className="text-slate-900">
                    {new Intl.NumberFormat("es-CR", {
                      style: "currency",
                      currency: aguinaldo.currency || "CRC",
                    }).format(aguinaldo.base_total)}
                  </strong>
                </p>
                <p>
                  Aguinaldo estimado:{" "}
                  <strong className="text-slate-900">
                    {new Intl.NumberFormat("es-CR", {
                      style: "currency",
                      currency: aguinaldo.currency || "CRC",
                    }).format(aguinaldo.aguinaldo)}
                  </strong>
                </p>
              </div>
            )}

            {!loadingAguinaldo && !errorAguinaldo && !aguinaldo && (
              <p className="text-sm text-slate-600">
                No hay información de aguinaldo para este empleado.
              </p>
            )}
          </div>
        )}

        {tab === "statement" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
            <StatementShortcut
              employeeCode={emp.code}
              onOpen={(code, from, to) => {
                navigate(
                  `/statement?employee_code=${encodeURIComponent(
                    code
                  )}&from=${from}&to=${to}&auto=1`
                );
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== (a) Datos generales ===== */

function GeneralSection({
  emp,
  onUpdated,
  payrollSettings,
}: {
  emp: Employee;
  onUpdated: (e: Employee) => void;
  payrollSettings: PayrollSettings | null;
}) {
  const [form, setForm] = useState({
    first_name: emp.first_name ?? "",
    last_name: emp.last_name ?? "",
    code: emp.code ?? "",
    email: emp.email ?? "",
    work_shift: emp.work_shift ?? "",
    hire_date: emp.hire_date ?? "",
    status: emp.status === "inactive" ? "inactive" : "active",
  });

  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedPos, setSelectedPos] = useState<number | "">(
    emp.position_id ?? ""
  );

  useEffect(() => {
    setForm({
      first_name: emp.first_name ?? "",
      last_name: emp.last_name ?? "",
      code: emp.code ?? "",
      email: emp.email ?? "",
      work_shift: emp.work_shift ?? "",
      hire_date: emp.hire_date ?? "",
      status: emp.status === "inactive" ? "inactive" : "active",
    });
    setSelectedPos(emp.position_id ?? "");
  }, [
    emp.id,
    emp.first_name,
    emp.last_name,
    emp.code,
    emp.email,
    emp.work_shift,
    emp.hire_date,
    emp.status,
    emp.position_id,
  ]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/positions", { params: { per_page: 100 } });
        const raw = res.data as any;
        const list: Position[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
          ? raw.data
          : [];
        setPositions(list);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [emp.id]);

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSave = async () => {
    try {
      setSaving(true);
      await api.put(`/employees/${emp.id}`, form);

      if ((emp.position_id ?? "") !== selectedPos) {
        const payload = {
          position_id: selectedPos === "" ? null : Number(selectedPos),
        };
        await api.patch(`/employees/${emp.id}/position`, payload);
      }

      const rereq = await api.get(`/employees/${emp.id}`, {
        params: { include: "position" },
      });
      const fresh = (rereq.data as any)?.data ?? rereq.data;
      onUpdated(fresh as Employee);

      setEditMode(false);
      alert("Cambios guardados");
    } catch (err: any) {
      console.error(
        "PUT /employees / position error",
        err?.response?.status,
        err?.response?.data
      );
      alert(err?.response?.data?.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const onCancelEdit = () => {
    setForm({
      first_name: emp.first_name ?? "",
      last_name: emp.last_name ?? "",
      code: emp.code ?? "",
      email: emp.email ?? "",
      work_shift: emp.work_shift ?? "",
      hire_date: emp.hire_date ?? "",
      status: emp.status === "inactive" ? "inactive" : "active",
    });
    setSelectedPos(emp.position_id ?? "");
    setEditMode(false);
  };

  const allPositions = Array.isArray(positions) ? positions : [];

  let positionForSalary: Position | undefined = emp.position as any;

  if (typeof selectedPos === "number") {
    const found = allPositions.find((p) => p.id === selectedPos);
    if (found) {
      positionForSalary = found;
    }
  }

  const { rate: salaryRate, currency: salaryCurrency, monthly } =
    getHourlyFromPosition(positionForSalary, {
      payrollSettings,
      workShift: (emp.work_shift ?? null) as any,
      referenceDate: emp.hire_date ?? undefined,
    });

  return (
    <div className="grid gap-4 max-w-4xl">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">
              Datos generales del empleado
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Información básica, puesto asignado y salario base.
            </p>
          </div>
          {!editMode && (
            <button
              className="text-xs md:text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 font-medium text-slate-700"
              onClick={() => setEditMode(true)}
            >
              Editar datos
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Nombre */}
          <label className="grid gap-1 text-sm">
            <span className="text-slate-600">Nombre</span>
            {editMode ? (
              <input
                className="border border-slate-300 focus:border-slate-500 focus:ring-1 focus:ring-slate-500/40 rounded-lg px-3 py-2 text-sm outline-none"
                name="first_name"
                value={form.first_name}
                onChange={onChange}
              />
            ) : (
              <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900">
                {emp.first_name || "—"}
              </div>
            )}
          </label>

          {/* Apellidos */}
          <label className="grid gap-1 text-sm">
            <span className="text-slate-600">Apellidos</span>
            {editMode ? (
              <input
                className="border border-slate-300 focus:border-slate-500 focus:ring-1 focus:ring-slate-500/40 rounded-lg px-3 py-2 text-sm outline-none"
                name="last_name"
                value={form.last_name}
                onChange={onChange}
              />
            ) : (
              <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900">
                {emp.last_name || "—"}
              </div>
            )}
          </label>

          {/* Código empleado */}
          <label className="grid gap-1 text-sm">
            <span className="text-slate-600">Código empleado</span>
            {editMode ? (
              <input
                className="border border-slate-300 focus:border-slate-500 focus:ring-1 focus:ring-slate-500/40 rounded-lg px-3 py-2 text-sm outline-none"
                name="code"
                value={form.code}
                onChange={onChange}
              />
            ) : (
              <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900">
                {emp.code || "—"}
              </div>
            )}
          </label>

          {/* ID interno */}
          <label className="grid gap-1 text-sm">
            <span className="text-slate-600">ID interno</span>
            <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900">
              {emp.id}
            </div>
          </label>

          {/* Puesto asignado */}
          <label className="grid gap-1 text-sm">
            <span className="text-slate-600">Puesto asignado</span>
            {editMode ? (
              <select
                className="border border-slate-300 focus:border-slate-500 focus:ring-1 focus:ring-slate-500/40 rounded-lg px-3 py-2 text-sm outline-none"
                value={selectedPos}
                onChange={(e) =>
                  setSelectedPos(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
              >
                <option value="">(sin puesto)</option>
                {(Array.isArray(positions) ? positions : []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.code ? `(${p.code})` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900">
                {(() => {
                  if (emp.position?.name) {
                    return `${emp.position.name}${
                      emp.position.code ? ` (${emp.position.code})` : ""
                    }`;
                  }
                  if (typeof selectedPos === "number") {
                    const p = positions.find((p) => p.id === selectedPos);
                    if (p) {
                      return `${p.name}${p.code ? ` (${p.code})` : ""}`;
                    }
                  }
                  return "—";
                })()}
              </div>
            )}
          </label>

          {/* Fecha inicio */}
          <label className="grid gap-1 text-sm">
            <span className="text-slate-600">Fecha inicio</span>
            {editMode ? (
              <input
                type="date"
                className="border border-slate-300 focus:border-slate-500 focus:ring-1 focus:ring-slate-500/40 rounded-lg px-3 py-2 text-sm outline-none"
                name="hire_date"
                value={form.hire_date}
                onChange={onChange}
              />
            ) : (
              <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900">
                {emp.hire_date ? formatDate(emp.hire_date) : "—"}
              </div>
            )}
          </label>

          {/* Estado */}
          <label className="grid gap-1 text-sm">
            <span className="text-slate-600">Estado</span>
            {editMode ? (
              <select
                className="border border-slate-300 focus:border-slate-500 focus:ring-1 focus:ring-slate-500/40 rounded-lg px-3 py-2 text-sm outline-none"
                name="status"
                value={form.status}
                onChange={onChange}
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            ) : (
              <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900">
                {emp.status === "inactive" ? "Inactivo" : "Activo"}
              </div>
            )}
          </label>

          {/* Email */}
          <label className="grid gap-1 text-sm">
            <span className="text-slate-600">Email</span>
            {editMode ? (
              <input
                className="border border-slate-300 focus:border-slate-500 focus:ring-1 focus:ring-slate-500/40 rounded-lg px-3 py-2 text-sm outline-none"
                name="email"
                value={form.email}
                onChange={onChange}
              />
            ) : (
              <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900">
                {emp.email || "—"}
              </div>
            )}
          </label>

          {/* Jornada */}
          <label className="grid gap-1 text-sm">
            <span className="text-slate-600">Jornada</span>
            {editMode ? (
              <select
                className="border border-slate-300 focus:border-slate-500 focus:ring-1 focus:ring-slate-500/40 rounded-lg px-3 py-2 text-sm outline-none"
                name="work_shift"
                value={form.work_shift}
                onChange={onChange}
              >
                <option value="">Selecciona…</option>
                <option value="diurna">Diurna</option>
                <option value="nocturna">Nocturna</option>
                <option value="mixta">Mixta</option>
              </select>
            ) : (
              <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900">
                {emp.work_shift || "—"}
              </div>
            )}
          </label>

          {/* Salario hora */}
          <label className="grid gap-1 text-sm">
            <span className="text-slate-600">Salario base por hora</span>
            <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900">
              {salaryRate > 0
                ? `${
                    salaryCurrency === "USD" ? "$" : "₡"
                  }${salaryRate.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} ${salaryCurrency}`
                : "—"}
            </div>
          </label>

          {/* Salario mensual */}
          <label className="grid gap-1 text-sm">
            <span className="text-slate-600">Salario base mensual</span>
            <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
              {typeof monthly === "number" && monthly > 0
                ? `${
                    salaryCurrency === "USD" ? "$" : "₡"
                  }${monthly.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} ${salaryCurrency} (estimado)`
                : "—"}
            </div>
          </label>
        </div>

        {editMode && (
          <div className="flex flex-wrap gap-2 mt-5">
            <button
              disabled={saving}
              onClick={onSave}
              className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function HoursSection({
  emp,
  payrollSettings,
}: {
  emp: Employee;
  payrollSettings: PayrollSettings | null;
}) {
  const empId = emp.id;

  // Rango de fechas por defecto (mes actual)
  const [from, setFrom] = useState(
    dayjs().startOf("month").format("YYYY-MM-DD")
  );
  const [to, setTo] = useState(dayjs().endOf("month").format("YYYY-MM-DD"));

  // Cargar horas desde el backend
  const { data, loading, error } = useEmployeeHours(empId, from, to);

  // === Cargar puestos para poder calcular tarifa real ===
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/positions", { params: { per_page: 200 } });
        const raw = res.data as any;
        const list: Position[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
          ? raw.data
          : [];
        setPositions(list);
      } catch (e) {
        console.error("Error cargando positions en HoursSection", e);
      }
    })();
  }, [empId]);

  // Buscar el puesto con datos completos de salario
  let positionForSalary: Position | null = (emp.position as any) ?? null;

  if (
    (!positionForSalary ||
      (positionForSalary.default_salary_amount == null &&
        positionForSalary.base_hourly_rate == null)) &&
    emp.position_id
  ) {
    const found = positions.find((p) => p.id === emp.position_id);
    if (found) {
      positionForSalary = found;
    }
  }

  // Jornada
  const workShift =
    (emp as any).work_shift ?? emp.work_shift ?? ("diurna" as any);

  // Calcular tarifa/hora y moneda usando helper global + parámetros de planilla
  const { rate: rawRate, currency } = getHourlyFromPosition(
    positionForSalary ?? undefined,
    {
      payrollSettings,
      workShift,
    }
  );

  const rate = Number(rawRate) || 0;

  // 🔍 Debug para ver qué está usando exactamente
  console.log("HoursSection salary debug →", {
    empId,
    positionForSalary,
    workShift,
    payrollSettings,
    rate,
    currency,
  });

  // === Helpers numéricos ===
  const toNum = (v: any, def = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  };

  const raw: any = data ?? {};
  const d: any = raw?.data ?? raw?.result ?? raw;

  // Buckets enviados por el backend (HoursCalculatorService)
  const h1 = toNum(
    d?.hours_1x ?? d?.hours1x ?? d?.regular_1x ?? d?.regular_hours,
    0
  );
  const h15 = toNum(
    d?.hours_1_5x ?? d?.hours15x ?? d?.overtime_15x ?? d?.overtime_day,
    0
  );
  const h2 = toNum(
    d?.hours_2x ?? d?.hours2x ?? d?.double_20x ?? d?.overtime_week,
    0
  );

  const payRegular = h1 * rate;
  const payDailyOT = h15 * rate * 1.5;
  const payDouble = h2 * rate * 2;
  const payTotal = payRegular + payDailyOT + payDouble;

  const money = (n: number) =>
    `${currency === "USD" ? "$" : "₡"}${n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;

  return (
    <div className="grid gap-3">
      {/* Filtros de fecha */}
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
      </div>

      {/* Tarifa + resumen salarial usando 1× / 1.5× / 2× */}
      <div className="p-3 rounded-xl bg-gray-50 border flex flex-col gap-1 text-sm">
        <div>
          <span className="text-gray-500 mr-1">Tarifa base:</span>
          <span className="font-semibold">
            {rate > 0
              ? money(rate).replace(/(\sCRC|\sUSD)$/, "") + ` /h`
              : "—"}
          </span>
        </div>
        <div>
          <span className="text-gray-500 mr-1">
            Estimado total (1× + 1.5× + 2×):
          </span>
          <span className="font-semibold">
            {rate > 0 ? money(payTotal) : "—"}
          </span>
        </div>
      </div>

      {/* Card principal de horas (desglose diario y semanal) */}
      <EmployeeHoursCard
        result={data as any}
        loading={loading}
        error={error as any}
        hourlyRate={rate}
        currency={currency}
      />
    </div>
  );
}



/* ===== (c) Marcaciones ===== */

function PunchesSection({ empId }: { empId: number }) {
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<TimeEntry[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1 });
  const [loading, setLoading] = useState(false);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);

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
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <label className="grid text-sm">
          <span className="text-slate-600 mb-1">Fecha (tabla)</span>
          <input
            type="date"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500/40 outline-none"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <label className="grid text-sm">
          <span className="text-slate-600 mb-1">Estado</span>
          <select
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500/40 outline-none"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="ok">OK</option>
            <option value="incompleta">Incompleta</option>
            <option value="anomala">Anómala</option>
          </select>
        </label>

        <button
          onClick={applyFilters}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          {loading ? "Buscando…" : "Filtrar"}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <label className="grid text-sm">
          <span className="text-slate-600 mb-1">Desde (export)</span>
          <input
            type="date"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500/40 outline-none"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>

        <label className="grid text-sm">
          <span className="text-slate-600 mb-1">Hasta (export)</span>
          <input
            type="date"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500/40 outline-none"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          disabled={exporting}
          aria-label="Exportar marcaciones del empleado en CSV"
          title="Exportar CSV"
        >
          {exporting ? "Exportando…" : "Exportar CSV"}
        </button>

        <div className="text-xs text-slate-500">
          Tip: si no defines “Desde/Hasta”, se usa la fecha del filtro de tabla.
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-auto border border-slate-200 rounded-xl shadow-sm bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-medium text-slate-600">
                Fecha
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-slate-600">
                Entrada
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-slate-600">
                Salida
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-slate-600">
                Notas
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-slate-600">
                Origen
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-800">
                  {formatDate(r.work_date)}
                </td>
                <td className="px-3 py-2 text-slate-800">
                  {r.check_in ? formatDate(r.check_in as any) : "-"}
                </td>
                <td className="px-3 py-2 text-slate-800">
                  {r.check_out ? formatDate(r.check_out as any) : "-"}
                </td>
                <td className="px-3 py-2 text-slate-700">{r.notes ?? ""}</td>
                <td className="px-3 py-2 text-slate-700">{r.source ?? ""}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="px-3 py-3 text-sm text-slate-500" colSpan={5}>
                  Sin registros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <button
          disabled={meta.current_page <= 1}
          onClick={() => {
            const p = meta.current_page - 1;
            setPage(p);
            fetchEntries(p);
          }}
          className="px-3 py-1 border border-slate-300 rounded-lg bg-white disabled:opacity-40"
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
          className="px-3 py-1 border border-slate-300 rounded-lg bg-white disabled:opacity-40"
        >
          »
        </button>
      </div>
    </div>
  );
}

/* ===== (d) Finanzas ===== */

interface EmployeeAdvanceRow {
  id: number;
  issued_at?: string;
  amount: number | string;
  currency?: string;
  status?: string;
  notes?: string;
}

interface EmployeeLoanRow {
  id: number;
  employee_id?: number;
  granted_at?: string;
  amount?: number | string;
  currency?: string;
  status?: string;
  notes?: string;
}

interface EmployeeGarnishmentRow {
  id: number;
  description?: string;
  amount?: number | string;
  currency?: string;
  active?: boolean;
}

const formatMoney = (
  value: number | string | undefined | null,
  currency?: string
) => {
  let n = 0;

  if (typeof value === "number") {
    n = value;
  } else if (typeof value === "string") {
    const match = value.match(/-?\d+[.,]?\d*/);
    if (match) {
      const normalized = match[0].replace(",", ".");
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) n = parsed;
    }
  }

  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: currency || "CRC",
  }).format(n);
};

function FinanceSection({ empId }: { empId: number }) {
  const [loading, setLoading] = useState(false);
  const [advances, setAdvances] = useState<EmployeeAdvanceRow[]>([]);
  const [loans, setLoans] = useState<EmployeeLoanRow[]>([]);
  const [garnishments, setGarnishments] = useState<EmployeeGarnishmentRow[]>([]);

  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const markPaymentPaid = async (paymentId: number) => {
    try {
      await updateLoanPayment(paymentId, { action: "mark_paid" });

      if (selectedLoanId) {
        const rows = await getLoanPayments(selectedLoanId);
        setPayments(rows);
      }
    } catch (err) {
      console.error(err);
      alert("No se pudo marcar como pagada la cuota.");
    }
  };

  const markPaymentSkipped = async (paymentId: number) => {
    try {
      await updateLoanPayment(paymentId, { action: "mark_skipped" });

      if (selectedLoanId) {
        const rows = await getLoanPayments(selectedLoanId);
        setPayments(rows);
      }
    } catch (err) {
      console.error(err);
      alert("No se pudo marcar como omitida la cuota.");
    }
  };

  const reschedulePayment = async (paymentId: number) => {
    const newDate = prompt("Nueva fecha (YYYY-MM-DD):");
    if (!newDate) return;

    try {
      await updateLoanPayment(paymentId, {
        action: "reschedule",
        due_date: newDate,
      });

      if (selectedLoanId) {
        const rows = await getLoanPayments(selectedLoanId);
        setPayments(rows);
      }
    } catch (err) {
      console.error(err);
      alert("No se pudo reprogramar la cuota.");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const [advRes, loanRes, garnRes] = await Promise.all([
          api.get("/advances", { params: { employee_id: empId, per_page: 100 } }),
          api.get("/loans", { params: { employee_id: empId, per_page: 100 } }),
          api.get("/garnishments", {
            params: { employee_id: empId, per_page: 100 },
          }),
        ]);

        const normalizeList = (raw: any): any[] => {
          if (Array.isArray(raw)) return raw;
          if (Array.isArray(raw?.data)) return raw.data;
          return [];
        };

        setAdvances(normalizeList(advRes.data));
        setLoans(normalizeList(loanRes.data));
        setGarnishments(normalizeList(garnRes.data));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [empId]);

  const openLoanPayments = async (loanId: number) => {
    try {
      setSelectedLoanId(loanId);
      setLoadingPayments(true);
      setPayments([]);

      const rows = await getLoanPayments(loanId);
      setPayments(rows);
    } catch (err) {
      console.error(err);
      alert("No se pudieron cargar las cuotas del préstamo.");
    } finally {
      setLoadingPayments(false);
    }
  };

  const closeLoanPayments = () => {
    setSelectedLoanId(null);
    setPayments([]);
  };

  return (
    <div className="grid gap-6">
      {/* Adelantos */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-slate-900">Adelantos</h2>
        </div>
        {advances.length === 0 ? (
          <p className="text-sm text-slate-600">
            Este empleado no tiene adelantos registrados.
          </p>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-1.5 border-b border-slate-200 text-left text-xs font-medium text-slate-600">
                    Fecha
                  </th>
                  <th className="px-2 py-1.5 border-b border-slate-200 text-left text-xs font-medium text-slate-600">
                    Monto
                  </th>
                  <th className="px-2 py-1.5 border-b border-slate-200 text-left text-xs font-medium text-slate-600">
                    Estado
                  </th>
                  <th className="px-2 py-1.5 border-b border-slate-200 text-left text-xs font-medium text-slate-600">
                    Notas
                  </th>
                </tr>
              </thead>
              <tbody>
                {advances.map((a) => {
                  const anyAdv: any = a;
                  const rawDate =
                    anyAdv.issued_at ||
                    anyAdv.date ||
                    anyAdv.created_at ||
                    "";

                  return (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="px-2 py-1.5 border-slate-100">
                        {fmtDate(rawDate)}
                      </td>
                      <td className="px-2 py-1.5 border-slate-100">
                        {formatMoney(a.amount, a.currency)}
                      </td>
                      <td className="px-2 py-1.5 border-slate-100">
                        {a.status ?? anyAdv.status ?? "-"}
                      </td>
                      <td className="px-2 py-1.5 border-slate-100">
                        {a.notes ?? anyAdv.notes ?? "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Préstamos */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-slate-900">Préstamos</h2>
        </div>

        {loans.length === 0 ? (
          <p className="text-sm text-slate-600">
            Este empleado no tiene préstamos registrados.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-2 py-1.5 border-b border-slate-200 text-left text-xs font-medium text-slate-600">
                      ID
                    </th>
                    <th className="px-2 py-1.5 border-b border-slate-200 text-left text-xs font-medium text-slate-600">
                      Fecha otorgado
                    </th>
                    <th className="px-2 py-1.5 border-b border-slate-200 text-left text-xs font-medium text-slate-600">
                      Monto original
                    </th>
                    <th className="px-2 py-1.5 border-b border-slate-200 text-left text-xs font-medium text-slate-600">
                      Estado
                    </th>
                    <th className="px-2 py-1.5 border-b border-slate-200 text-left text-xs font-medium text-slate-600">
                      Descripción
                    </th>
                    <th className="px-2 py-1.5 border-b border-slate-200 text-left text-xs font-medium text-slate-600">
                      Cuotas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((l) => {
                    const anyLoan: any = l;

                    const rawDate =
                      anyLoan.granted_at ||
                      anyLoan.start_date ||
                      anyLoan.created_at ||
                      anyLoan.date ||
                      "";

                    const original = anyLoan.amount;
                    const status = anyLoan.status ?? anyLoan.state ?? "-";
                    const description =
                      anyLoan.notes ?? anyLoan.description ?? "-";

                    return (
                      <tr key={anyLoan.id} className="border-t border-slate-100">
                        <td className="px-2 py-1.5">{anyLoan.id}</td>
                        <td className="px-2 py-1.5">{fmtDate(rawDate)}</td>
                        <td className="px-2 py-1.5">
                          {formatMoney(original, anyLoan.currency)}
                        </td>
                        <td className="px-2 py-1.5">{status}</td>
                        <td className="px-2 py-1.5">{description}</td>
                        <td className="px-2 py-1.5">
                          <button
                            className="text-xs px-2 py-1 border border-slate-300 rounded-lg hover:bg-slate-50"
                            onClick={() => openLoanPayments(anyLoan.id)}
                          >
                            Ver cuotas
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {selectedLoanId && (
              <div className="mt-4 border border-slate-200 rounded-xl p-3 bg-slate-50/60">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm text-slate-900">
                    Cuotas del préstamo #{selectedLoanId}
                  </h3>
                  <button
                    className="text-xs px-2 py-1 border border-slate-300 rounded-lg bg-white hover:bg-slate-50"
                    onClick={closeLoanPayments}
                  >
                    Cerrar
                  </button>
                </div>

                {loadingPayments && (
                  <p className="text-xs text-slate-600">Cargando cuotas…</p>
                )}

                {!loadingPayments && payments.length === 0 && (
                  <p className="text-xs text-slate-600">
                    Sin cuotas registradas.
                  </p>
                )}

                {!loadingPayments && payments.length > 0 && (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-2 py-1.5 border-b border-slate-200 text-left text-[11px] font-medium text-slate-600">
                            ID
                          </th>
                          <th className="px-2 py-1.5 border-b border-slate-200 text-left text-[11px] font-medium text-slate-600">
                            Vence
                          </th>
                          <th className="px-2 py-1.5 border-b border-slate-200 text-left text-[11px] font-medium text-slate-600">
                            Monto
                          </th>
                          <th className="px-2 py-1.5 border-b border-slate-200 text-left text-[11px] font-medium text-slate-600">
                            Estado
                          </th>
                          <th className="px-2 py-1.5 border-b border-slate-200 text-left text-[11px] font-medium text-slate-600">
                            Fuente
                          </th>
                          <th className="px-2 py-1.5 border-b border-slate-200 text-left text-[11px] font-medium text-slate-600">
                            Notas
                          </th>
                          <th className="px-2 py-1.5 border-b border-slate-200 text-left text-[11px] font-medium text-slate-600">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p) => (
                          <tr key={p.id} className="border-t border-slate-100">
                            <td className="px-2 py-1.5">{p.id}</td>
                            <td className="px-2 py-1.5">
                              {fmtDate(p.due_date)}
                            </td>
                            <td className="px-2 py-1.5">
                              {formatMoney(p.amount, "CRC")}
                            </td>
                            <td className="px-2 py-1.5">{p.status}</td>
                            <td className="px-2 py-1.5">
                              {p.source ?? "-"}
                            </td>
                            <td className="px-2 py-1.5">
                              {p.remarks ?? ""}
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex gap-1 flex-wrap">
                                <button
                                  className="text-[11px] px-2 py-1 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                                  disabled={p.status === "paid"}
                                  onClick={() => markPaymentPaid(p.id)}
                                >
                                  Pagar
                                </button>
                                <button
                                  className="text-[11px] px-2 py-1 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                                  disabled={p.status !== "pending"}
                                  onClick={() => markPaymentSkipped(p.id)}
                                >
                                  Omitir
                                </button>
                                <button
                                  className="text-[11px] px-2 py-1 border border-slate-300 rounded-lg hover:bg-slate-50"
                                  onClick={() => reschedulePayment(p.id)}
                                >
                                  Reprogramar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* Embargos */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-slate-900">Embargos</h2>
        </div>
        {garnishments.length === 0 ? (
          <p className="text-sm text-slate-600">
            Este empleado no tiene embargos registrados.
          </p>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-1.5 border-b border-slate-200 text-left text-xs font-medium text-slate-600">
                    Descripción
                  </th>
                  <th className="px-2 py-1.5 border-b border-slate-200 text-left text-xs font-medium text-slate-600">
                    Monto
                  </th>
                  <th className="px-2 py-1.5 border-b border-slate-200 text-left text-xs font-medium text-slate-600">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {garnishments.map((g) => (
                  <tr key={g.id} className="border-t border-slate-100">
                    <td className="px-2 py-1.5">{g.description ?? "-"}</td>
                    <td className="px-2 py-1.5">
                      {formatMoney(g.amount, g.currency)}
                    </td>
                    <td className="px-2 py-1.5">
                      {g.active ? "Activo" : "Inactivo"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {loading && (
        <p className="text-xs text-slate-500 mt-1">
          Cargando información financiera…
        </p>
      )}
    </div>
  );
}

/* ===== (e) Atajo a Estado de Cuenta ===== */

function StatementShortcut({
  employeeCode,
  onOpen,
}: {
  employeeCode?: string;
  onOpen: (code: string, from: string, to: string) => void;
}) {
  const [from, setFrom] = useState(
    dayjs().startOf("month").format("YYYY-MM-DD")
  );
  const [to, setTo] = useState(dayjs().endOf("month").format("YYYY-MM-DD"));

  return (
    <div className="max-w-xl">
      <h3 className="font-semibold text-slate-900 mb-3">
        Estado de cuenta
      </h3>

      {!employeeCode ? (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          Este empleado no tiene <code>code</code> asignado (ej.{" "}
          <code>emp-0003</code>).
        </div>
      ) : (
        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 text-sm space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-500 mb-0.5">Código</div>
              <div className="font-semibold text-slate-900">
                {employeeCode}
              </div>
            </div>
            <div className="text-xs text-slate-500 self-end">
              Rango de fechas
            </div>
            <label className="grid text-xs">
              <span className="text-slate-500 mb-1">Desde</span>
              <input
                type="date"
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-slate-500 focus:ring-1 focus:ring-slate-500/40 outline-none bg-white"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="grid text-xs">
              <span className="text-slate-500 mb-1">Hasta</span>
              <input
                type="date"
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-slate-500 focus:ring-1 focus:ring-slate-500/40 outline-none bg-white"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>

          <button
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium"
            onClick={() => onOpen(employeeCode, from, to)}
          >
            Ver estado de cuenta
          </button>
        </div>
      )}
    </div>
  );
}
