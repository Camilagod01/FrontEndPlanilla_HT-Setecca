import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/login";
import Dashboard from "../pages/Dashboard";
import Employees from "../pages/Employees";          // lista de empleados
import ProtectedRoute from "./ProtectedRoute";
import EmployeesProbe from "../pages/EmployeesProbe"; // pruebas o lista temporal
import EmployeeProfilePage from "../pages/EmployeeProfilePage"; // 👈 nuevo
import EmployeeCreatePage from "../pages/EmployeeCreatePage";   // 👈 nuevo

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Público */}
        <Route path="/login" element={<Login />} />

        {/* Protegido */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />

          {/* Empleados */}
          <Route path="/employees" element={<Employees />} />
          <Route path="/employees/new" element={<EmployeeCreatePage />} />
          <Route path="/employees/:id" element={<EmployeeProfilePage />} />

          {/* Ruta de pruebas (si aún la usas) */}
          <Route path="/employeesList" element={<EmployeesProbe />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}