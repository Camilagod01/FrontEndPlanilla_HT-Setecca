import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Employees from "../pages/Employees";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login/>} />
        <Route element={<ProtectedRoute/>}>
          <Route path="/" element={<Dashboard/>} />
          <Route path="/employees" element={<Employees/>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
