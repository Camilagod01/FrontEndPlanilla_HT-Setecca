import { http } from "@/api/https";

export type Currency = "CRC" | "USD";
export type LoanStatus = "active" | "closed";
export type PaymentStatus = "pending" | "paid" | "skipped";
export type PaymentSource = "payroll" | "manual";

export interface Loan {
  id: number;
  employee_id: number;
  amount: number;
  principal?: number;
  currency: Currency;
  granted_at: string;
  start_date?: string;
  status: LoanStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LoanPayment {
  id: number;
  loan_id: number;
  due_date: string;
  amount: number;
  status: PaymentStatus;
  source: PaymentSource;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export type LoansPaginated = {
  data: Loan[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type LoansResponse = Loan[] | LoansPaginated;

export interface LoanScheduleNext {
  mode: "next";
  intervalDays?: number;
}
export interface LoanScheduleNth {
  mode: "nth";
  n: number;
  intervalDays?: number;
}
export interface LoanScheduleCustom {
  mode: "custom";
  installments: Array<{ due_date: string; amount: number; remarks?: string }>;
}
export type LoanSchedule = LoanScheduleNext | LoanScheduleNth | LoanScheduleCustom;

export interface CreateLoanPayload {
  employee_id: number;
  amount: number;
  principal?: number;
  currency: Currency;
  granted_at: string;
  start_date?: string;
  status?: LoanStatus;
  notes?: string;
  schedule: LoanSchedule;
}

export async function getLoans(params?: Record<string, any>): Promise<LoansResponse> {
  const res = await http.get<unknown>("/loans", { params });
  return res.data as LoansResponse;
}

export async function getLoan(id: number): Promise<Loan> {
  const res = await http.get<Loan>(`/loans/${id}`);
  return res.data;
}

export async function createLoan(payload: CreateLoanPayload): Promise<Loan> {
  const res = await http.post<Loan>("/loans", payload);
  return res.data;
}

export async function updateLoan(id: number, payload: Partial<Loan>): Promise<Loan> {
  const res = await http.patch<Loan>(`/loans/${id}`, payload);
  return res.data;
}

export async function deleteLoan(id: number): Promise<void> {
  await http.delete(`/loans/${id}`);
}

export async function getLoanPayments(loanId: number): Promise<LoanPayment[]> {
  const res = await http.get<LoanPayment[]>(`/loans/${loanId}/payments`);
  return res.data;
}

export async function updateLoanPayment(id: number, payload: Partial<LoanPayment> & { action?: "mark_paid" | "mark_skipped" | "reschedule" }): Promise<LoanPayment> {
  const res = await http.patch<LoanPayment>(`/loan-payments/${id}`, payload);
  return res.data;
}
