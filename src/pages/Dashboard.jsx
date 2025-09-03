import TopNav from "../components/TopNav";
import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div>
      <TopNav />
      <main className="p-6">
        <h2>Dashboard</h2>
        <ul>
          <li><Link to="/employees">Ir a Empleados</Link></li>
        </ul>
      </main>
    </div>
  );
}
