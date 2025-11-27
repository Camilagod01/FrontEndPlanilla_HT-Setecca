import { useState } from "react";
import { useAuth } from "../context/useAuth";
import { useNavigate, useLocation } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard";

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (e) {
      setErr("Credenciales inválidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Encabezado superior */}
        <header className="login-header">
          <div className="login-brand">
            <div className="login-logo">HT SETECCA</div>
            <div className="login-subtitle">Panel administrativo</div>
          </div>
        </header>

        {/* Contenido principal */}
        <section className="login-body">
          <h1 className="login-title">Iniciar sesión</h1>
          <p className="login-description">
            Ingrese sus credenciales para acceder al sistema.
          </p>

          {err && <div className="login-error">{err}</div>}

          <form onSubmit={onSubmit} className="login-form">
            <label className="login-field">
              <span>Email</span>
              <input
                type="email"
                className="login-input"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                autoComplete="username"
                required
              />
            </label>

            <label className="login-field">
              <span>Contraseña</span>
              <input
                type="password"
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="login-button"
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </section>

        {/* Footer */}
        <footer className="login-footer">
          <span>© 2025 HT SETECCA — Uso interno</span>
        </footer>
      </div>
    </div>
  );
}
