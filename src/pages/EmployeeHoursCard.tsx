import React from "react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import SickBadge from "@/components/SickBadge";

dayjs.extend(isoWeek);

type DayRow = {
  date: string;
  weekday?: string;
  expected?: number | string | null;
  worked?: number | string | null;
  extra_day?: number | string | null;

  // Campos que manda el backend en HoursCalculatorService
  regular_1x?: number | string | null;
  overtime_15x?: number | string | null;
  double_20x?: number | string | null;
  is_sunday?: boolean;
  is_holiday?: boolean;

  sick_type?: "50pct" | "0pct" | null;
  sick_note?: string | null;
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

  // legacy
  extra_day?: number | string | null;
  extra_week?: number | string | null;

  // nuevos campos del backend
  hours_1x?: number | string | null;
  hours_1_5x?: number | string | null;
  hours_2x?: number | string | null;

  days: DayRow[];
  weeks?: WeekRow[];
}

type Props = {
  result: EmployeeHoursResponse | null;
  loading: boolean;
  error: string | null;
  hourlyRate: number;      // Tarifa base por hora
  currency?: string;       // CRC | USD
};

// Helpers seguros
function num(v: unknown, dflt = 0): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n as number) ? (n as number) : dflt;
}
function fmt(v: unknown, digits = 2): string {
  return num(v).toFixed(digits);
}

function formatMoney(amount: number, currency = "CRC") {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function EmployeeHoursCard({
  result,
  loading,
  error,
  hourlyRate,
  currency = "CRC",
}: Props) {
  if (loading)
    return (
      <div className="p-4 rounded-2xl shadow bg-white/70">
        Cargando horas…
      </div>
    );
  if (error)
    return (
      <div className="p-4 rounded-2xl shadow bg-white/70 text-red-600">
        Error: {error}
      </div>
    );
  if (!result) return null;

  // Horas globales
  const total = num(result.total);
  const extraDay = num(result.extra_day);
  const extraWeek = num(result.extra_week);

  // Horas por tipo de pago (usando nuevos campos del backend)
  const h1x = num((result as any).hours_1x);
  const h15x = num((result as any).hours_1_5x ?? result.extra_day);
  const h2x = num((result as any).hours_2x);

  // Cálculo salarial usando la tarifa por hora
  const rate = Number.isFinite(hourlyRate) ? hourlyRate : 0;
  const pay1x = rate * h1x;
  const pay15x = rate * 1.5 * h15x;
  const pay2x = rate * 2 * h2x;
  const totalPay = pay1x + pay15x + pay2x;

  // Horas 2× y días con pago doble (domingos/feriados TRABAJADOS)
  const hours2x = h2x;
  const daysWithDouble = (result.days || []).filter((d) => {
    const d2x = num((d as any).double_20x);
    return d2x > 0;
  }).length;

  return (
    <div className="p-4 rounded-2xl shadow bg-white/70 grid gap-4">
      {/* Header + resumen rápido */}
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="text-xl font-semibold">Horas trabajadas</h3>
          {rate > 0 && (
            <div className="text-sm text-gray-600">
              Total: {total.toFixed(2)} h · Estimado:{" "}
              {formatMoney(totalPay, currency)}
            </div>
          )}
        </div>
        <span className="text-sm text-gray-500">
          {result.from ? dayjs(result.from).format("DD/MM/YYYY") : "—"} —{" "}
          {result.to ? dayjs(result.to).format("DD/MM/YYYY") : "—"}
        </span>
      </div>

      {/* KPIs de horas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Total" value={total.toFixed(2)} suffix="h" />
        <Stat label="Extra (día)" value={fmt(result.extra_day)} suffix="h" />
        <Stat label="Extra (semana)" value={fmt(result.extra_week)} suffix="h" />
      </div>

      {/* Resumen salarial estimado */}
      {rate > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 border-t pt-3">
          <div className="sm:col-span-1">
            <div className="text-sm text-gray-500">Estimado total</div>
            <div className="text-lg font-semibold">
              {formatMoney(totalPay, currency)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Pago base (1×)</div>
            <div className="text-sm font-medium">
              {formatMoney(pay1x, currency)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Extras 1.5×</div>
            <div className="text-sm font-medium">
              {formatMoney(pay15x, currency)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Horas 2×</div>
            <div className="text-sm font-medium">
              {formatMoney(pay2x, currency)}
            </div>
          </div>
        </div>
      )}

      {/* Resumen 2× (domingos / feriados) */}
      <div className="border-t pt-3">
        <div className="text-sm">
          <span className="font-medium">Horas 2× (dom./feriado)</span>:{" "}
          <span className="font-semibold">{hours2x.toFixed(2)} h</span>
        </div>
        <div className="text-xs text-gray-600">
          Días con pago doble: {daysWithDouble} (domingos o feriados trabajados
          dentro del rango).
        </div>
      </div>

      {/* Desglose diario */}
      {(result.days?.length ?? 0) > 0 && (
        <div className="border-t pt-3">
          <h4 className="font-medium mb-2">Desglose diario</h4>
          <ul className="grid gap-2">
            {result.days.map((d) => {
              const worked = num(d.worked);
              const expected = num(d.expected);
              const wd = d.weekday ?? dayjs(d.date).format("ddd");
              const extraDayHours = num((d as any).overtime_15x);
              const doubleDayHours = num((d as any).double_20x);

              const isHoliday = (d as any).is_holiday;
              const isSunday = (d as any).is_sunday;

              return (
                <li
                  key={d.date}
                  className="p-3 rounded-lg border bg-white/60 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Columna fecha + badges */}
                  <div className="flex items-center gap-2">
                    <div className="text-gray-700 font-medium">
                      {dayjs(d.date).format("DD/MM")}{" "}
                      <span className="text-xs text-gray-500">
                        ({wd})
                      </span>
                    </div>

                    {/* Badge feriado / domingo */}
                    {(isHoliday || isSunday) && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 border border-blue-200">
                        {isHoliday ? "Feriado" : "Domingo"}
                      </span>
                    )}

                    {/* Badge de incapacidad (con tooltip) */}
                    {(() => {
                      const sType =
                        d.sick_type === "50pct" || d.sick_type === "0pct"
                          ? d.sick_type
                          : null;

                      if (!sType) return null;

                      const title = d.sick_note
                        ? d.sick_note
                        : sType === "50pct"
                        ? "Incapacidad 50% (cuenta para métricas; costo 50% en payroll futuro)"
                        : "Incapacidad 0% (no cuenta horas trabajadas)";

                      return (
                        <span title={title}>
                          <SickBadge type={sType} />
                        </span>
                      );
                    })()}
                  </div>

                  {/* Columna horas */}
                  <div className="text-sm">
                    <span className="font-semibold">{worked.toFixed(2)} h</span>
                    <span className="text-gray-500">
                      {" "}
                      / {expected.toFixed(2)} h
                    </span>

                    {extraDayHours > 0 && (
                      <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-50 border border-amber-200">
                        +{extraDayHours.toFixed(2)} h extra (1.5×)
                      </span>
                    )}

                    {doubleDayHours > 0 && (
                      <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-rose-50 border border-rose-200">
                        {doubleDayHours.toFixed(2)} h a 2×
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Desglose por semana */}
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
              const end = start.endOf("isoWeek");

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
