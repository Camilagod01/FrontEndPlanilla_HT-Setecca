import { NavLink, Outlet, useNavigate } from "react-router-dom";

export default function Layout() {
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  const link = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2 rounded-lg ${isActive ? "bg-gray-200" : "hover:bg-gray-100"}`;

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "240px 1fr" }}>
      {/* Sidebar */}
      <aside style={{ borderRight: "1px solid #eee", padding: 16, background: "#fff" }}>
        <h1 style={{ fontWeight: 700, marginBottom: 16 }}>HT SE TECCA</h1>

        <nav style={{ display: "grid", gap: 6 }}>
          <NavLink to="/dashboard" className={link}>Dashboard</NavLink>
          <NavLink to="/employees" className={link}>Empleados</NavLink>
          <NavLink to="/employees/new" className={link}>Agregar empleado</NavLink>
          <NavLink to="/positions" className={link}>Puestos</NavLink>
          <NavLink to="/time-entries" className={link}>Marcaciones</NavLink>

          <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>Reportes</div>
          <NavLink to="/reports/attendance" className={link}>Asistencia</NavLink>
        </nav>

        <button onClick={logout} style={{ marginTop: 16 }}>
          Cerrar sesión
        </button>
      </aside>

      {/* Main */}
      <main style={{ background: "#f7f7f7" }}>
        <header
          style={{
            height: 56,
            background: "#fff",
            borderBottom: "1px solid #eee",
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
          }}
        >
          <strong>Navegación</strong>
        </header>
        <div style={{ padding: 24 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
