// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import Login from "../pages/login";
// import ProtectedRoute from "./ProtectedRoute";
// import Layout from "@/components/Layout";
// import Dashboard from "../pages/Dashboard";
// import Employees from "../pages/Employees";
// import EmployeeProfilePage from "../pages/EmployeeProfilePage";
// import EmployeeCreatePage from "../pages/EmployeeCreatePage";
// import TimeEntriesPage from "../pages/TimeEntriesPage";
// import PositionsPage from "../pages/PositionsPage";
// import AdvancesPage from "@/pages/AdvancesPage";
// import StatementPage from "../pages/StatementPage";

// function NotFound() {
//   return (
//     <div style={{ padding: 24 }}>
//       <h2>404 — Not Found</h2>
//       <a href="/">Ir al inicio</a>
//     </div>
//   );
// }

// export default function AppRouter() {
//   return (
//     <BrowserRouter>
//       <Routes>
//         {/* Público */}
//         <Route path="/login" element={<Login />} />

//         {/* Protegido */}
//         <Route element={<ProtectedRoute />}>
//           {/* Monta el Layout una sola vez y adentro todas las rutas */}
//           <Route element={<Layout />}>
//             {/* Redirige raíz a dashboard */}
//             <Route path="/" element={<Navigate to="/dashboard" replace />} />

//             <Route path="/dashboard" element={<Dashboard />} />
//             <Route path="/employees" element={<Employees />} />
//             <Route path="/employees/new" element={<EmployeeCreatePage />} />
//             <Route path="/employees/:id" element={<EmployeeProfilePage />} />
//             <Route path="/positions" element={<PositionsPage />} />
//             <Route path="/time-entries" element={<TimeEntriesPage />} />
//             <Route path="/advances" element={<AdvancesPage />} />

//             {/* Estado de cuenta */}
//             <Route path="/statement" element={<StatementPage />} />
//             <Route path="/employees/:id/statement" element={<StatementPage />} />
//           </Route>
//         </Route>

//         {/* Catch-all */}
//         <Route path="*" element={<NotFound />} />
//       </Routes>
//     </BrowserRouter>
//   );
// }
