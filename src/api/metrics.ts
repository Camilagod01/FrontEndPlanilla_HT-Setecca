// src/api/metrics.ts
import { http } from "./https";

export type HoursDay = {
  date: string;
  weekday: string;
  expected: number;
  worked: number;
  regular_1x: number;
  overtime_15x: number;
  double_20x: number;
  is_sunday: boolean;
  is_holiday: boolean;
  holiday_paid_without_work: boolean;
  sick_leave_type: string | null;
  raw_worked: number;
};

export type EmployeeHoursResponse = {
  from: string;
  to: string;
  total: number;
  extra_day: number;
  extra_week: number;
  sick_50pct_days: number;
  sick_0pct_days: number;
  days: HoursDay[];
  weeks: Array<{
    week: string;
    worked: number;
    extra_week: number;
  }>;
};

export async function getEmployeeHoursSummary(params: {
  employee_id: number;
  from: string;
  to: string;
}) {
  const res = await http.get<EmployeeHoursResponse>("/metrics/hours", {
    params,
  });
  return res.data;
}
