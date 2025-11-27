import { useEffect, useMemo, useState } from "react";
import type React from "react";
import {
  getVacations,
  type Vacation,
  type VacationFilters,
  type VacationsPaginated,
  type VacationsResponse,
  type VacationStatus,
} from "../api/vacations";

type Props = {
  employeeId: number;
};

const box: React.CSSProperties = {
  padding: 12,
  border: "1px solid #eee",
  borderRadius: 8,
  background: "#fff",
};

const td: React.CSSProperties = {
  padding: "8px 6px",
  borderBottom: "1px solid #eee",
};

const th: React.CSSProperties = {
  ...td,
  fontWeight: 600,
  background: "#fafafa",
};

export default function EmployeeVacationsTab({ employeeId }: Props) {
  const [items, setItems] = useState<Vacation[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filtros simples (solo dentro de este empleado)
  const [status, setStatus] = useState<"" | VacationStatus>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  // Total de días aprobados (solo para mostrar un resumen)
  const totalApprovedDays = useMemo(
    () =>
      items
        .filter((v) => v.status === "approved")
        .reduce((sum, v) => sum + (v.days ?? 0), 0),
    [items]
  );

  async function fetchVacations() {
    setLoading(true);
    setErrorMsg(null);

    try {
      const filters: VacationFilters = {
        employee_id: employeeId,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
        page: 1,
        per_page: 50,
      };

      const res: VacationsResponse = await getVacations(filters);
      const list: Vacation[] = Array.isArray(res)
        ? (res as Vacation[])
        : ((res as VacationsPaginated).data ?? []);

      setItems(list);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message ?? "Error al cargar vacaciones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Cargar al montar y cuando cambie employeeId
    fetchVacations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  return (
    <div className="space-y-3">
      {/* Filtros propios de este empleado */}
      <section style={box}>
        <strong>Vacaciones de este empleado</strong>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "160px 160px 160px auto",
            gap: 8,
            marginTop: 8,
            alignItems: "end",
          }}
        >
          <div>
            <div style={{ marginBottom: 6 }}>Estado</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              style={{ width: "100%" }}
            >
              <option value="">Todos</option>
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
            </select>
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Desde</div>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Hasta</div>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={fetchVacations} disabled={loading}>
              Buscar
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus("");
                setFrom("");
                setTo("");
                fetchVacations();
              }}
              disabled={loading}
            >
              Limpiar
            </button>
          </div>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: "#555" }}>
          Días aprobados (solo registros con estado <b>approved</b>):{" "}
          <b>{totalApprovedDays}</b>
        </div>
      </section>

      {/* Listado para ESTE empleado */}
      <section style={box}>
        <strong>Historial de vacaciones</strong>

        {errorMsg && (
          <div style={{ color: "crimson", marginTop: 8 }}>{errorMsg}</div>
        )}

        {loading ? (
          <div style={{ marginTop: 8 }}>Cargando…</div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: 8,
            }}
          >
            <thead>
              <tr>
                <th style={th}>Inicio</th>
                <th style={th}>Fin</th>
                <th style={th}>Días</th>
                <th style={th}>Estado</th>
                <th style={th}>Notas</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td style={td} colSpan={5}>
                    Sin registros de vacaciones para este empleado
                  </td>
                </tr>
              ) : (
                items.map((v) => (
                  <tr key={v.id}>
                    <td style={td}>{v.start_date}</td>
                    <td style={td}>{v.end_date}</td>
                    <td style={td}>{v.days}</td>
                    <td style={td}>
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: 6,
                          background:
                            v.status === "pending"
                              ? "#ffeaa7"
                              : v.status === "approved"
                              ? "#55efc4"
                              : "#fab1a0",
                        }}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td style={td}>{v.notes ?? ""}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
