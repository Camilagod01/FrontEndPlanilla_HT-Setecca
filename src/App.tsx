import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import EmployeeProfilePage from "./pages/EmployeeProfilePage";
import EmployeeCreatePage from "./pages/EmployeeCreatePage";
import ProtectedRoute from "./routes/ProtectedRoute";
import Layout from "./components/Layout";
import TimeEntries from "./pages/TimeEntriesPage";
import PositionsPage from "./pages/PositionsPage";
import AttendanceReportPage from "./pages/AttendanceReportPage";
import AdvancesPage from "./pages/AdvancesPage";
import LoansPage from "./pages/LoansPage";
import SickLeavesPage from "./pages/SickLeavesPage";
import VacationsPage from "./pages/VacationsPage";
import AbsencesPage from "./pages/AbsencesPage";
import HolidaysPage from "./pages/HolidaysPage";
import PayrollSettingsPage from "./pages/PayrollSettingsPage";
import JustificationsPage from "./pages/JustificationsPage";
import ReportsSummaryPage from "./pages/ReportsSummaryPage";
import StatementPage from "./pages/StatementPage";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Público */}
        <Route path="/login" element={<Login />} />

        {/* Protegido + Layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>

            {/* Redirect al dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Empleados */}
            <Route path="/employees" element={<Employees />} />
            <Route path="/employees/new" element={<EmployeeCreatePage />} />
            <Route path="/employees/:id" element={<EmployeeProfilePage />} />

            {/* Puestos */}
            <Route path="/positions" element={<PositionsPage />} />

            {/* Marcaciones */}
            <Route path="/time-entries" element={<TimeEntries />} />

            {/* Reportes */}
            <Route path="/reports/attendance" element={<AttendanceReportPage />} />

            {/* Adelantos */}
            <Route path="/advances" element={<AdvancesPage />} />
            <Route path="/loans" element={<LoansPage />} />
          
            {/* Licencias Médicas Discapacidades */}
            <Route path="/sick-leaves" element={<SickLeavesPage />} />

            {/* Vacaciones */}
          <Route path="/vacations" element={<VacationsPage />} />

            {/* Permisos */}
          <Route path="/absences" element={<AbsencesPage />} />

            {/* Feriados */}  
          <Route path="/holidays" element={<HolidaysPage />} />

            {/* Configuración de Planilla */}
            <Route path="/settings/payroll" element={<PayrollSettingsPage />} />

            {/* Justificaciones */}
            <Route path="/justifications" element={<JustificationsPage />} />

            {/* Resumen de Reportes */}
            <Route path="/reports/summary" element={<ReportsSummaryPage />} />

            {/* Estado de Cuenta */}
            <Route path="/statement" element={<StatementPage />} />
            <Route path="/employees/:id/statement" element={<StatementPage />} />

          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<div style={{ padding: 24 }}>404 — Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}
