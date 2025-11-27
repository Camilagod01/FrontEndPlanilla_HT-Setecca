import { NavLink, Outlet, useNavigate } from "react-router-dom";

export default function Layout() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    "nav-link" + (isActive ? " nav-link-active" : "");

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">HT</div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-title">HT SETECCA</span>
            <span className="sidebar-brand-subtitle">Panel administrativo</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* Sección: Panel */}
          <div className="nav-section">
            <div className="nav-section-title">Panel de administración</div>
            <div className="nav-section-list">
              <NavLink to="/dashboard" className={navLinkClass}>
                <span className="nav-dot" />
                Dashboard
              </NavLink>
              <NavLink to="/statement" className={navLinkClass}>
                <span className="nav-dot" />
                Estado de cuenta
              </NavLink>
              <NavLink to="/reports/summary" className={navLinkClass}>
                <span className="nav-dot" />
                Resumen de reportes
              </NavLink>
            </div>
          </div>

          {/* Sección: Gestión de personal */}
          <div className="nav-section">
            <div className="nav-section-title">Gestión de personal</div>
            <div className="nav-section-list">
              <NavLink to="/employees" className={navLinkClass}>
                <span className="nav-dot" />
                Empleados
              </NavLink>
              <NavLink to="/employees/new" className={navLinkClass}>
                <span className="nav-dot" />
                Agregar empleado
              </NavLink>
              <NavLink to="/positions" className={navLinkClass}>
                <span className="nav-dot" />
                Puestos
              </NavLink>
            </div>
          </div>

          {/* Sección: Asistencia y tiempo */}
          <div className="nav-section">
            <div className="nav-section-title">Asistencia y tiempo</div>
            <div className="nav-section-list">
              <NavLink to="/time-entries" className={navLinkClass}>
                <span className="nav-dot" />
                Marcaciones
              </NavLink>
              <NavLink to="/sick-leaves" className={navLinkClass}>
                <span className="nav-dot" />
                Incapacidades
              </NavLink>
              <NavLink to="/vacations" className={navLinkClass}>
                <span className="nav-dot" />
                Vacaciones
              </NavLink>
              <NavLink to="/absences" className={navLinkClass}>
                <span className="nav-dot" />
                Permisos / Ausencias
              </NavLink>
              <NavLink to="/justifications" className={navLinkClass}>
                <span className="nav-dot" />
                Justificaciones
              </NavLink>
              <NavLink to="/holidays" className={navLinkClass}>
                <span className="nav-dot" />
                Feriados
              </NavLink>
            </div>
          </div>

          {/* Sección: Finanzas */}
          <div className="nav-section">
            <div className="nav-section-title">Finanzas</div>
            <div className="nav-section-list">
              <NavLink to="/advances" className={navLinkClass}>
                <span className="nav-dot" />
                Adelantos
              </NavLink>
              <NavLink to="/loans" className={navLinkClass}>
                <span className="nav-dot" />
                Préstamos
              </NavLink>
              <NavLink to="/aguinaldo" className={navLinkClass}>
                <span className="nav-dot" />
                Aguinaldo
              </NavLink>
              <NavLink to="/settings/payroll" className={navLinkClass}>
                <span className="nav-dot" />
                Configuración de planilla
              </NavLink>
            </div>
          </div>
        </nav>

        <button className="btn-logout" onClick={logout}>
          Cerrar sesión
        </button>
      </aside>

      {/* MAIN */}
      <main className="app-main">
        <header className="app-header">
          <div className="header-left">
            <h1 className="header-title">Panel de administración</h1>
            <p className="header-subtitle">
              Control de personal, asistencias y finanzas en un solo lugar.
            </p>
          </div>
          <div className="header-right">
            <div className="user-pill">
              <div className="user-avatar">C</div>
              <div>
                <div className="user-name">Contaduría</div>
                <div className="user-role">Administradora</div>
              </div>
            </div>
          </div>
        </header>

        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
