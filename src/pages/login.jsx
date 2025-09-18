// src/pages/login.jsx
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
    <form onSubmit={onSubmit} className="p-6 max-w-sm mx-auto">
      <h1>Iniciar sesión</h1>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

      <div className="mt-2">
        <input
          placeholder="Email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          autoComplete="username"
          required
        />
      </div>

      <div className="mt-2">
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      <button type="submit" disabled={loading} className="mt-3">
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
