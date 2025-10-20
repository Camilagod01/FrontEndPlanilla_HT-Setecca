import { http } from "@/api/https";

export interface ReportAdvance {
  pending_amount: number;
  applied_amount: number;
  count: number;
}

export interface ReportLoans {
  created_count: number;
  principal_sum: number;
}

export interface ReportLoanPayments {
  paid: number;
  pending: number;
  skipped: number;
}

export interface ReportAbsences {
  hours: number;
  days: number;
}

export interface ReportJustifications {
  pending: number;
  approved: number;
  rejected: number;
}

export interface ReportEmployee {
  id: number;
  code?: string;
  full_name: string;
}

export interface ReportRow {
  employee: ReportEmployee;
  advances: ReportAdvance;
  loans: ReportLoans;
  loan_payments: ReportLoanPayments;
  sick_leaves_days: number;
  vacations_days: number;
  absences: ReportAbsences;
  justifications: ReportJustifications;
}

export interface ReportFilters {
  from?: string;        // YYYY-MM-DD
  to?: string;          // YYYY-MM-DD
  employee_id?: number; // opcional
}

/** GET /reports/summary */
export async function getReportSummary(params: ReportFilters = {}): Promise<ReportRow[]> {
  const res = await http.get<ReportRow[]>("/reports/summary", { params });
  return res.data;
}
