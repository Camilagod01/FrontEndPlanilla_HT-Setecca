import { useEffect, useState } from "react";
import { listEmployees } from "../services/employees";

export default function Employees() {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      const res = await listEmployees(page);
      setData(res.data ?? res); // si backend devuelve {data:[]}
    })();
  }, [page]);

  return (
    <div className="p-6">
      <h2>Empleados</h2>
      <table>
        <thead><tr><th>ID</th><th>Nombre</th><th>Puesto</th></tr></thead>
        <tbody>
          {data.map(e=>(
            <tr key={e.id}>
              <td>{e.id}</td>
              <td>{e.first_name} {e.last_name}</td>
              <td>{e.position ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <button onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
        <span>Página {page}</span>
        <button onClick={()=>setPage(p=>p+1)}>Next</button>
      </div>
    </div>
  );
}
