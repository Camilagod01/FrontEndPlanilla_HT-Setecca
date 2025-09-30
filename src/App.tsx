import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import EmployeeProfilePage from "./pages/EmployeeProfilePage";
import EmployeeCreatePage from "./pages/EmployeeCreatePage";
import ProtectedRoute from "./routes/ProtectedRoute"; // ya lo tienes
import Layout from "./components/Layout";             // lo creamos en el paso 3
import TimeEntries from './pages/TimeEntriesPage';

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

            {/* (opcional) Lista de pruebas */}
            <Route path="/time-entries" element={<TimeEntries />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<div style={{ padding: 24 }}>404 — Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}
