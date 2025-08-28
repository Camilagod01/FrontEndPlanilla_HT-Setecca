import { useAuth } from "../context/useAuth";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user, signOut } = useAuth();

  return (
    <div className="p-6">
      <header className="flex items-center gap-4">
        <span>Hola, {user?.name ?? "Usuario"}</span>
        <button onClick={signOut}>Salir</button>
      </header>

      <main className="mt-4">
        <h2>Dashboard</h2>
        <ul>
          <li><Link to="/employees">Ir a Empleados</Link></li>
        </ul>
      </main>
    </div>
  );
}
