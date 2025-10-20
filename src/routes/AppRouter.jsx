import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/login";
import Dashboard from "../pages/Dashboard";
import Employees from "../pages/Employees";          // lista de empleados
import ProtectedRoute from "./ProtectedRoute";
import EmployeeProfilePage from "../pages/EmployeeProfilePage";
import EmployeeCreatePage from "../pages/EmployeeCreatePage";
import TimeEntriesPage from '../pages/TimeEntriesPage';
import PositionsPage from "../pages/PositionsPage";
import AdvancesPage from "@/pages/AdvancesPage";



export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
       <Route path="/" element={<HomePage />} />
      <Route path="/advances" element={<AdvancesPage />} />

        {/* Público */}
        <Route path="/login" element={<Login />} />

        {/* Protegido */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />

          {/* Empleados */}
          <Route path="/employees" element={<Employees />} />
          <Route path="/employees/new" element={<EmployeeCreatePage />} />
          <Route path="/employees/:id" element={<EmployeeProfilePage />} />
          <Route path="/positions" element={<PositionsPage />} />
          <Route path="/time-entries" element={<TimeEntriesPage />} />



        </Route>
      </Routes>
    </BrowserRouter>
  );
}