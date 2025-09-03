import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function TopNav() {
  const { signOut, user } = useAuth();
  return (
    <nav style={{display:"flex", gap:12, padding:12, borderBottom:"1px solid #eee"}}>
      <Link to="/">Dashboard</Link>
      <Link to="/employees">Empleados</Link>
      <Link to="/employeesList">Lista</Link>
      <div style={{marginLeft:"auto"}}>
        {user?.name && <span style={{marginRight:12}}>Hola, {user.name}</span>}
        <button onClick={signOut}>Salir</button>
      </div>
    </nav>
  );
}
