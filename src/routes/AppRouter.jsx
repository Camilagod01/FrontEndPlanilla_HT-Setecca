// src/routes/AppRouter.jsx
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import Login from "../pages/login";

import ProtectedRoute from "./ProtectedRoute";
import Layout from "@/components/Layout";
import Dashboard from "../pages/Dashboard";
import Employees from "../pages/Employees";
import EmployeeProfilePage from "../pages/EmployeeProfilePage";
import EmployeeCreatePage from "../pages/EmployeeCreatePage";
import TimeEntriesPage from "../pages/TimeEntriesPage";
import PositionsPage from "../pages/PositionsPage";
import AdvancesPage from "@/pages/AdvancesPage";
import StatementPage from "../pages/StatementPage";
import LoansPage from "@/pages/LoansPage";
import VacationsPage from "../pages/VacationsPage";
import AbsencesPage from "../pages/AbsencesPage";
import HolidaysPage from "../pages/HolidaysPage";
import PayrollSettingsPage from "../pages/PayrollSettingsPage";
import JustificationsPage from "../pages/JustificationsPage";
import ReportsSummaryPage from "../pages/ReportsSummaryPage";
import SickLeavesPage from "../pages/SickLeavesPage";
import AttendanceReportPage from "../pages/AttendanceReportPage";
//import AttendanceReportPage from "@/pages/AttendanceReportPage";
import EmployeeAttendancePage from "@/pages/EmployeeAttendancePage";




function NotFound() {
  return (
    <div style={{ padding: 24 }}>
      <h2>404 — Not Found</h2>
      <a href="#/login">Ir a login</a>
    </div>
  );
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Público */}
      <Route path="/login" element={<Login />} />

      {/* Protegido */}
      <Route element={<ProtectedRoute />}>
        {/* Monta el layout una sola vez */}
        <Route element={<Layout />}>
          {/* Redirección raíz al dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/employees/new" element={<EmployeeCreatePage />} />
          <Route path="/employees/:id" element={<EmployeeProfilePage />} />
          <Route path="/positions" element={<PositionsPage />} />
          <Route path="/time-entries" element={<TimeEntriesPage />} />
          <Route path="/advances" element={<AdvancesPage />} />
          <Route path="/statement" element={<StatementPage />} />
          <Route path="/loans" element={<LoansPage />} />
          <Route path="/vacations" element={<VacationsPage />} />
          <Route path="/absences" element={<AbsencesPage />} />
          <Route path="/employees/:id/statement" element={<StatementPage />} />
          <Route path="/statement" element={<StatementPage />} />
          <Route path="/holidays" element={<HolidaysPage />} />
          <Route path="/settings/payroll" element={<PayrollSettingsPage />} />
          <Route path="/justifications" element={<JustificationsPage />} />
          <Route path="/reports/summary" element={<ReportsSummaryPage />} />
          <Route path="/sick-leaves" element={<SickLeavesPage />} />
          <Route path="/attendance" element={<AttendanceReportPage />} />
          {/*<Route path="/employees/:id/attendance" element={<EmployeeAttendancePage />} />*/}
          {/*<Route path="/attendance-report" element={<AttendanceReportPage />} />*/}
          <Route path="reports/attendance" element={<AttendanceReportPage />} />


        </Route>
      </Route>

      {/* Catch-all: cualquier otra ruta manda a /login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
