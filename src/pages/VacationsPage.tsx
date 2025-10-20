import { useEffect, useMemo, useState } from "react";
import EmployeeSelect from "../components/EmployeeSelect";
import {
  getVacations,
  createVacation,
  updateVacation,
  deleteVacation,
  type Vacation,
  type VacationCreate,
  type VacationFilters,
  type VacationsPaginated,
  type VacationsResponse,
  type VacationStatus,
  setVacationStatus,       
} from "../api/vacations";

const box: React.CSSProperties = { padding: 12, border: "1px solid #eee", borderRadius: 8, background: "#fff" };
const td: React.CSSProperties = { padding: "8px 6px", borderBottom: "1px solid #eee" };
const th: React.CSSProperties = { ...td, fontWeight: 600, background: "#fafafa" };
const rowActions: React.CSSProperties = { display: "flex", gap: 6, flexWrap: "wrap" };

type FormState = {
  employee_id?: number;
  start_date: string;
  end_date: string;
  status: VacationStatus;
  notes?: string;
};

export default function VacationsPage() {
  // Filtros
  const [fEmployeeId, setFEmployeeId] = useState<number | undefined>(undefined);
  const [fStatus, setFStatus] = useState<"" | VacationStatus>("");
  const [fFrom, setFFrom] = useState<string>("");
  const [fTo, setFTo] = useState<string>("");

  // Listado
  const [items, setItems] = useState<Vacation[]>([]);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; per_page: number; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form crear
  const [form, setForm] = useState<FormState>({
    employee_id: undefined,
    start_date: "",
    end_date: "",
    status: "pending",
    notes: "",
  });
  const formValid = useMemo(() => {
    return !!form.employee_id && !!form.start_date && !!form.end_date;
  }, [form]);

  async function fetchData(goToPage?: number) {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params: VacationFilters = {
        employee_id: fEmployeeId,
        status: fStatus || undefined,
        from: fFrom || undefined,
        to: fTo || undefined,
        page: goToPage ?? page,
        per_page: 10,
      };
      const res: VacationsResponse = await getVacations(params);
      const list: Vacation[] = Array.isArray(res) ? (res as Vacation[]) : ((res as VacationsPaginated).data ?? []);
      const metaObj = Array.isArray(res) ? null : ((res as any).meta ?? null);
      setItems(list);
      setMeta(metaObj);
      if (goToPage) setPage(goToPage);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message ?? "Error al cargar vacaciones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid) return;
    try {
      const payload: VacationCreate = {
        employee_id: form.employee_id!,
        start_date: form.start_date,
        end_date: form.end_date,
        status: form.status,
        notes: form.notes?.trim() || undefined,
      };
      const created = await createVacation(payload);
      setItems((prev) => [created, ...prev]);
      setForm({ employee_id: undefined, start_date: "", end_date: "", status: "pending", notes: "" });
      alert("Vacación creada");
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Error al crear vacación");
    }
  }

  /*async function onApprove(id: number) {
    try {
      const updated = await updateVacation(id, { status: "approved" });
      setItems((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "No se pudo aprobar");
    }
  }*/

    async function onApprove(id: number) {
  try {
    const updated = await setVacationStatus(id, "approved");
    setItems((prev) => prev.map((r) => (r.id === id ? updated : r)));
  } catch (e: any) {
    alert(e?.response?.data?.message ?? "No se pudo aprobar");
  }
}

 /* async function onReject(id: number) {
    try {
      const updated = await updateVacation(id, { status: "rejected" });
      setItems((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "No se pudo rechazar");
    }
  }*/

    async function onReject(id: number) {
  try {
    const updated = await setVacationStatus(id, "rejected");
    setItems((prev) => prev.map((r) => (r.id === id ? updated : r)));
  } catch (e: any) {
    alert(e?.response?.data?.message ?? "No se pudo rechazar");
  }
}

  async function onDelete(id: number) {
    if (!confirm("¿Eliminar vacación?")) return;
    try {
      await deleteVacation(id);
      setItems((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "No se pudo eliminar");
    }
  }

  function resetFilters() {
    setFEmployeeId(undefined);
    setFStatus("");
    setFFrom("");
    setFTo("");
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Vacaciones</h2>

      {/* Filtros */}
      <section style={{ ...box, marginBottom: 12 }}>
        <strong>Filtros</strong>
        <div style={{ display: "grid", gridTemplateColumns: "320px 160px 160px 160px 160px auto", gap: 8, marginTop: 8, alignItems: "center" }}>
          <div>
            <div style={{ marginBottom: 6 }}>Empleado</div>
            <EmployeeSelect
              value={fEmployeeId}
              onChange={(id) => setFEmployeeId(id)}
              placeholder="Seleccione empleado…"
            />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Estado</div>
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value as any)}>
              <option value="">Todos</option>
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
            </select>
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Desde</div>
            <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Hasta</div>
            <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} />
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
            <button onClick={() => fetchData(1)} disabled={loading}>Buscar</button>
            <button onClick={resetFilters} disabled={loading}>Limpiar</button>
          </div>
        </div>
      </section>

      {/* Crear */}
      <section style={{ ...box, marginBottom: 12 }}>
        <strong>Crear vacación</strong>
        <form onSubmit={onCreate} style={{ display: "grid", gridTemplateColumns: "320px 160px 160px 160px auto", gap: 8, marginTop: 8, alignItems: "end" }}>
          <div>
            <div style={{ marginBottom: 6 }}>Empleado</div>
            <EmployeeSelect
              value={form.employee_id}
              onChange={(id) => setForm((f) => ({ ...f, employee_id: id }))}
              placeholder="Seleccione empleado…"
            />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Inicio</div>
            <input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Fin</div>
            <input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Estado</div>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as VacationStatus }))}>
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={!formValid}>Crear</button>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ marginTop: 6 }}>Notas</div>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              style={{ width: "100%" }}
            />
          </div>
        </form>
      </section>

      {/* Listado */}
      <section style={{ ...box }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <strong>Resultados</strong>
          {meta && <small>Total: {meta.total}</small>}
        </div>

        {errorMsg && <div style={{ color: "crimson", marginBottom: 8 }}>{errorMsg}</div>}
        {loading ? (
          <div>Cargando…</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>ID</th>
                <th style={th}>Empleado</th>
                <th style={th}>Inicio</th>
                <th style={th}>Fin</th>
                <th style={th}>Días</th>
                <th style={th}>Estado</th>
                <th style={th}>Notas</th>
                <th style={th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td style={td} colSpan={8}>Sin registros</td></tr>
              ) : (
                items.map((r) => (
                  <tr key={r.id}>
                    <td style={td}>{r.id}</td>
                    <td style={td}>
                      {r.employee?.code ? `${r.employee.code} — ` : ""}
                      {(r.employee?.first_name ?? "").trim()} {(r.employee?.last_name ?? "").trim()}
                    </td>
                    <td style={td}>{r.start_date}</td>
                    <td style={td}>{r.end_date}</td>
                    <td style={td}>{r.days}</td>
                    <td style={td}>
                      <span style={{ padding: "2px 6px", borderRadius: 6, background: r.status === "pending" ? "#ffeaa7" : r.status === "approved" ? "#55efc4" : "#fab1a0" }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={td}>{r.notes ?? ""}</td>
                    <td style={{ ...td }}>
                      <div style={rowActions}>
                        <button onClick={() => onApprove(r.id)} disabled={r.status === "approved"}>Aprobar</button>
                        <button onClick={() => onReject(r.id)} disabled={r.status === "rejected"}>Rechazar</button>
                        <button onClick={() => onDelete(r.id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Paginación simple */}
        {meta && meta.last_page > 1 && (
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button disabled={page <= 1} onClick={() => fetchData(page - 1)}>Anterior</button>
            <span>Página {page} de {meta.last_page}</span>
            <button disabled={page >= meta.last_page} onClick={() => fetchData(page + 1)}>Siguiente</button>
          </div>
        )}
      </section>
    </div>
  );
}
