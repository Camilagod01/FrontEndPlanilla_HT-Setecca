import api from "./api";
import qs from "qs";

export interface StatementResponse {
  employee: {
    id: number;
    code: string;
    name: string;
    salary_type: "monthly" | "hourly";
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
}

export async function getStatement(employeeCode: string, from: string, to: string) {
  const res = await api.get(`/statements/by-code/${employeeCode}`, {
    params: { from, to },
  });
  return res.data;
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
