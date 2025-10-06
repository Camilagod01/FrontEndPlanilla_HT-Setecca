// src/pages/EmployeeHoursCard.tsx
import React from "react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(isoWeek);

type DayRow = {
  date: string;
  weekday?: string;
  expected?: number | string | null;
  worked?: number | string | null;
  extra_day?: number | string | null;
};

type WeekRow = {
  week: string;
  worked?: number | string | null;
  extra_week?: number | string | null;
};

export interface EmployeeHoursResponse {
  from: string;
  to: string;
  total?: number | string | null;
  extra_day?: number | string | null;
  extra_week?: number | string | null;
  days: DayRow[];
  weeks?: WeekRow[];
}

type Props = {
  result: EmployeeHoursResponse | null;
  loading: boolean;
  error: string | null;
};

// Helpers seguros
function num(v: unknown, dflt = 0): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n as number) ? (n as number) : dflt;
}
function fmt(v: unknown, digits = 2): string {
  return num(v).toFixed(digits);
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-50 border border-emerald-200">
      {children}
    </span>
  );
}

export default function EmployeeHoursCard({ result, loading, error }: Props) {
  // 🔍 Debug temporal para ver datos que llegan del backend
  console.log("EmployeeHoursCard result →", result);

  if (loading)
    return (
      <div className="p-4 rounded-xl shadow bg-white/70">Cargando horas…</div>
    );
  if (error)
    return (
      <div className="p-4 rounded-xl shadow bg-white/70 text-red-600">
        Error: {error}
      </div>
    );
  if (!result) return null;

  const total = fmt(result.total);
  const extraDay = fmt(result.extra_day);
  const extraWeek = fmt(result.extra_week);

  return (
    <div className="p-4 rounded-2xl shadow bg-white/70 grid gap-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xl font-semibold">Horas trabajadas</h3>
        <span className="text-sm text-gray-500">
          {result.from ? dayjs(result.from).format("DD/MM/YYYY") : "—"} —{" "}
          {result.to ? dayjs(result.to).format("DD/MM/YYYY") : "—"}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Total" value={total} suffix="h" />
        <Stat label="Extra (día)" value={extraDay} suffix="h" />
        <Stat label="Extra (semana)" value={extraWeek} suffix="h" />
      </div>

      {/* Desglose por semana (más claro) */}
      {(result.weeks?.length ?? 0) > 0 && (
        <div className="border-t pt-3">
          <h4 className="font-medium mb-2">Desglose semanal</h4>
          <ul className="grid gap-2">
            {result.weeks!.map((w) => {
              const expectedWeekly = 48;
              const worked = num(w.worked);
              const extra = num(w.extra_week);
              const pct = Math.max(
                0,
                Math.min(100, Math.round((worked / expectedWeekly) * 100))
              );

              // Parse "2025-W40" → rango Lunes–Domingo (ISO)
              const [y, wkRaw] = String(w.week).split("-W");
              const year = Number(y);
              const wk = Number(wkRaw);
              const start = dayjs(`${year}-01-01`)
                .add(wk - 1, "week")
                .startOf("week");

              const end = start.endOf("isoWeek"); // Domingo

              return (
                <li key={w.week} className="p-3 rounded-lg border bg-white/60">
                  <div className="flex items-baseline justify-between">
                    <div className="text-gray-700 font-medium">
                      Semana {w.week}{" "}
                      <span className="text-xs text-gray-500">
                        ({start.format("DD/MM")}–{end.format("DD/MM")})
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold">
                        {worked.toFixed(2)} h
                      </span>
                      <span className="text-gray-500">
                        {" "}
                        / {expectedWeekly} h
                      </span>
                      {extra > 0 && (
                        <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-50 border border-amber-200">
                          +{extra.toFixed(2)} h extra
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barra de progreso simple */}
                  <div className="mt-2 h-2 w-full rounded bg-gray-100">
                    <div
                      className="h-2 rounded bg-gray-400"
                      style={{ width: `${pct}%` }}
                      aria-label={`Progreso semanal ${pct}%`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-gray-50 border">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">
        {value}
        {suffix ? ` ${suffix}` : ""}
      </div>
    </div>
  );
}

export { EmployeeHoursCard };
