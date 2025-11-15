import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getEmployeeAttendanceFromTimeEntries,
  AttendanceEntry,
} from "@/lib/attendance";

export default function EmployeeAttendancePage() {
  const { id } = useParams<{ id: string }>(); // viene de /employees/:id/attendance
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // si luego quieres filtros de fecha, aquí es donde se manejarían
  const [from] = useState<string | undefined>(undefined);
  const [to] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!id) return;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const data = await getEmployeeAttendanceFromTimeEntries(id, {
          from,
          to,
          // status: "completo", // si quieres solo registros completos
        });

        setEntries(data.data);
      } catch (e) {
        console.error(e);
        setError("No se pudo cargar la asistencia.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, from, to]);

  if (!id) return <p>Empleado no especificado.</p>;
  if (loading) return <p>Cargando asistencia...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Asistencia del empleado</h1>

      {entries.length === 0 ? (
        <p>No hay registros de asistencia para este empleado.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Entrada</th>
              <th>Salida</th>
              <th>Horas</th>
              <th>Estado</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{e.work_date}</td>
                <td>{e.check_in ?? "-"}</td>
                <td>{e.check_out ?? "-"}</td>
                <td>{e.hours_worked ?? "-"}</td>
                <td>{e.status ?? "-"}</td>
                <td>{e.notes ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
