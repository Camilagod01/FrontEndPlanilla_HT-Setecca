import api from "./api";
import qs from "qs";

export interface StatementHours {
  from: string;
  to: string;
  total: number;
  regular_1x: number;
  overtime_15: number;
  double_20: number;
  paid_hours: number;
  sick_50pct_days: number;
  sick_0pct_days: number;
  [key: string]: any;
}

export interface StatementEmployee {
  id: number;
  code: string;
  name: string;
  salary_type?: "monthly" | "hourly";
  salary_amount?: number;
  salary_currency?: "CRC" | "USD" | string;
}

export interface StatementPeriod {
  from: string;
  to: string;
}

export interface StatementResponse {
  employee: StatementEmployee;
  period: StatementPeriod;
  hours: StatementHours;
  incomes: { label: string; amount: number }[];
  deductions: { label: string; amount: number }[];
  total_gross: number;
  total_deductions: number;
  net: number;
  currency: "CRC" | "USD" | string;
  exchange_rate: number;
}

export async function getStatement(
  employeeCode: string,
  from: string,
  to: string
): Promise<StatementResponse> {
  const res = await api.get(`/statements/by-code/${employeeCode}`, {
    params: { from, to },
  });

  const data = res.data;

  const rawHours = data.hours || {};

  // 🔹 Normalizamos horas y días de incapacidad
  const hours: StatementHours = {
    ...rawHours,

    from: rawHours.from,
    to: rawHours.to,
    total: rawHours.total ?? 0,

    // Compatibilidad entre nombres "nuevos" y "viejos"
    regular_1x: rawHours.regular_1x ?? rawHours.hours_1x ?? 0,
    overtime_15: rawHours.overtime_15 ?? rawHours.hours_1_5x ?? 0,
    double_20: rawHours.double_20 ?? rawHours.hours_2x ?? 0,
    paid_hours: rawHours.paid_hours ?? 0,

    // ⚠️ Aquí está la clave para que el front no muestre 0.00
    sick_50pct_days:
      rawHours.sick_50pct_days ??
      rawHours.sick_days_50 ??
      rawHours.sick_50_days ??
      0,

    sick_0pct_days:
      rawHours.sick_0pct_days ??
      rawHours.sick_days_0 ??
      rawHours.sick_0_days ??
      0,
  };

  const employee: StatementEmployee = {
    id: data.employee.id,
    code: data.employee.code,
    name: data.employee.name ?? data.employee.full_name ?? "",
    salary_type: data.employee.salary_type,
    salary_amount: data.employee.salary_amount,
    salary_currency: data.employee.salary_currency,
  };

  const period: StatementPeriod = data.period ?? data.range;

  const incomes: { label: string; amount: number }[] =
    data.incomes ?? data.earnings?.items ?? [];

  const deductions: { label: string; amount: number }[] =
    data.deductions ?? data.discounts ?? [];

  const total_gross: number =
    data.total_gross ?? data.earnings?.gross ?? 0;

  const total_deductions: number =
    data.total_deductions ?? data.deductions?.total ?? 0;

  const net: number = data.net ?? data.summary?.net ?? 0;

  const currency: string =
    data.currency ?? data.summary?.currency ?? "CRC";

  const exchange_rate: number = data.exchange_rate ?? 1;

  return {
    employee,
    period,
    hours,
    incomes,
    deductions,
    total_gross,
    total_deductions,
    net,
    currency,
    exchange_rate,
  };
}

export async function exportStatement(
  employeeId: number,
  from: string,
  to: string,
  type: "pdf" | "excel",
  filenameHint?: string
): Promise<void> {
  const query = qs.stringify({ from, to, type }, { encode: true });
  const url = `/statements/${employeeId}/export?${query}`;

  const response = await api.get<Blob>(url, { responseType: "blob" });

  const blob = new Blob([response.data], {
    type:
      type === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);

  const base =
    filenameHint ??
    `estado_${employeeId}_${from.replaceAll("-", "")}_a_${to.replaceAll(
      "-",
      ""
    )}`;
  link.download = type === "pdf" ? `${base}.pdf` : `${base}.xlsx`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
