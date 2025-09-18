import { useEffect, useState } from "react";
import api from "../lib/api";

export default function EmployeesProbe() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.get("/employees")
      .then(res => setData(res.data))
      .catch(e => setErr(e.response?.data || e.message));
  }, []);

  if (err) return <pre>{JSON.stringify(err, null, 2)}</pre>;
  if (!data) return <p>Cargando...</p>;
  return (
    <div>
      <p>Total: {data.total}</p>
      <ul>
        {data.data.slice(0,5).map(e => (
          <li key={e.id}>{e.code} — {e.first_name} {e.last_name}</li>
        ))}
      </ul>
    </div>
  );
}
