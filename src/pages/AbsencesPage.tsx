import { useEffect, useMemo, useState } from "react";
import EmployeeSelect from "../components/EmployeeSelect";
import {
  getAbsences,
  createAbsence,
  updateAbsence,
  deleteAbsence,
  setAbsenceStatus,
  type Absence,
  type AbsenceCreate,
  type AbsenceFilters,
  type AbsencesPaginated,
  type AbsencesResponse,
  type AbsenceKind,
  type AbsenceStatus,
} from "../api/absences";

const box: React.CSSProperties = { padding: 12, border: "1px solid #eee", borderRadius: 8, background: "#fff" };
const td: React.CSSProperties = { padding: "8px 6px", borderBottom: "1px solid #eee" };
const th: React.CSSProperties = { ...td, fontWeight: 600, background: "#fafafa" };
const rowActions: React.CSSProperties = { display: "flex", gap: 6, flexWrap: "wrap" };

type FormState = {
  employee_id?: number;
  start_date: string;
  end_date: string;
  kind: AbsenceKind;       // 'full_day' | 'hours'
  hours?: number | "";     // Si lo necesita la tabla: requerido cuando kind='hours'
  status: AbsenceStatus;   // 'pending' | 'approved' | 'rejected'
  reason?: string;
  notes?: string;
};

export default function AbsencesPage() {
  // Filtros
  const [fEmployeeId, setFEmployeeId] = useState<number | undefined>(undefined);
  const [fKind, setFKind] = useState<"" | AbsenceKind>("");
  const [fStatus, setFStatus] = useState<"" | AbsenceStatus>("");
  const [fFrom, setFFrom] = useState<string>("");
  const [fTo, setFTo] = useState<string>("");

  // Listado y estado de UI
  const [items, setItems] = useState<Absence[]>([]);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; per_page: number; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form crear
  const [form, setForm] = useState<FormState>({
    employee_id: undefined,
    start_date: "",
    end_date: "",
    kind: "full_day",
    hours: "",
    status: "pending",
    reason: "",
    notes: "",
  });

  const formValid = useMemo(() => {
    const baseOk = !!form.employee_id && !!form.start_date && !!form.end_date && !!form.kind && !!form.status;
    if (!baseOk) return false;
    if (form.kind === "hours") {
      const h = typeof form.hours === "string" ? Number(form.hours) : form.hours ?? 0;
      return !Number.isNaN(h) && h >= 0.25 && h <= 12;
    }
    return true;
  }, [form]);

  async function fetchData(goToPage?: number) {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params: AbsenceFilters = {
        employee_id: fEmployeeId,
        kind: fKind || undefined,
        status: fStatus || undefined,
        from: fFrom || undefined,
        to: fTo || undefined,
        page: goToPage ?? page,
        per_page: 10,
      };
      const res: AbsencesResponse = await getAbsences(params);
      const list: Absence[] = Array.isArray(res) ? (res as Absence[]) : ((res as AbsencesPaginated).data ?? []);
      const metaObj = Array.isArray(res) ? null : ((res as any).meta ?? null);
      setItems(list);
      setMeta(metaObj);
      if (goToPage) setPage(goToPage);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message ?? "Error al cargar permisos");
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
      const payload: AbsenceCreate = {
        employee_id: form.employee_id!,
        start_date: form.start_date,
        end_date: form.end_date,
        kind: form.kind,
        status: form.status,
        reason: form.reason?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
        ...(form.kind === "hours" ? { hours: Number(form.hours) } : {}),
      };
      const created = await createAbsence(payload);
      setItems((prev) => [created, ...prev]);
      // Reset mínimo
      setForm({
        employee_id: undefined,
        start_date: "",
        end_date: "",
        kind: "full_day",
        hours: "",
        status: "pending",
        reason: "",
        notes: "",
      });
      alert("Permiso creado");
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Error al crear permiso");
    }
  }

  async function onApprove(id: number) {
    try {
      const updated = await setAbsenceStatus(id, "approved");
      setItems((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "No se pudo aprobar");
    }
  }

  async function onReject(id: number) {
    try {
      const updated = await setAbsenceStatus(id, "rejected");
      setItems((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "No se pudo rechazar");
    }
  }

  async function onDelete(id: number) {
    if (!confirm("¿Eliminar permiso?")) return;
    try {
      await deleteAbsence(id);
      setItems((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "No se pudo eliminar");
    }
  }

  function resetFilters() {
    setFEmployeeId(undefined);
    setFKind("");
    setFStatus("");
    setFFrom("");
    setFTo("");
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Permisos / Ausencias</h2>


      {/* Filtros */}
      <section style={{ ...box, marginBottom: 12 }}>
        <strong>Filtros</strong>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "320px 140px 160px 160px 160px",
            gap: 8,
            marginTop: 8,
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ marginBottom: 6 }}>Empleado</div>
            <EmployeeSelect
              value={fEmployeeId}
              onChange={(id) => setFEmployeeId(id)}
              placeholder="Seleccione empleado…"
            />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Tipo</div>
            <select
              value={fKind}
              onChange={(e) => setFKind(e.target.value as any)}
            >
              <option value="">Todos</option>
              <option value="full_day">full_day</option>
              <option value="hours">hours</option>
            </select>
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Estado</div>
            <select
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value as any)}
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
              value={fFrom}
              onChange={(e) => setFFrom(e.target.value)}
            />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Hasta</div>
            <input
              type="date"
              value={fTo}
              onChange={(e) => setFTo(e.target.value)}
            />
          </div>

          {/* Botones Buscar / Limpiar dentro de la tarjeta, abajo de los filtros */}
          <div
            style={{
              gridColumn: "1 / -1",
              marginTop: 4,
              display: "flex",
              gap: 8,
              justifyContent: "flex-start",
            }}
          >
            <button
              type="button"
              onClick={() => fetchData(1)}
              disabled={loading}
              className="px-3 py-2 bg-blue-600 text-gray-800 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Buscando…" : "Buscar"}
            </button>

            <button
              type="button"
              onClick={resetFilters}
              disabled={loading}
              className="px-3 py-2 border rounded hover:bg-gray-100 disabled:opacity-50"
            >
              Limpiar
            </button>
          </div>
        </div>
      </section>

      {/* Crear */}
      <section style={{ ...box, marginBottom: 12 }}>
        <strong>Crear permiso</strong>
        <form
          onSubmit={onCreate}
          style={{
            display: "grid",
            gridTemplateColumns: "320px 150px 150px 140px 160px",
            gap: 8,
            marginTop: 8,
            alignItems: "end",
          }}
        >
          <div>
            <div style={{ marginBottom: 6 }}>Empleado</div>
            <EmployeeSelect
              value={form.employee_id}
              onChange={(id) =>
                setForm((f) => ({ ...f, employee_id: id }))
              }
              placeholder="Seleccione empleado…"
            />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Inicio</div>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) =>
                setForm((f) => ({ ...f, start_date: e.target.value }))
              }
            />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Fin</div>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) =>
                setForm((f) => ({ ...f, end_date: e.target.value }))
              }
            />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Tipo</div>
            <select
              value={form.kind}
              onChange={(e) => {
                const k = e.target.value as AbsenceKind;
                setForm((f) => ({
                  ...f,
                  kind: k,
                  hours: k === "hours" ? f.hours || "" : "",
                }));
              }}
            >
              <option value="full_day">full_day</option>
              <option value="hours">hours</option>
            </select>
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Horas</div>
            <input
              type="number"
              min={0.25}
              max={12}
              step={0.25}
              disabled={form.kind !== "hours"}
              value={form.kind === "hours" ? form.hours ?? "" : ""}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({
                  ...f,
                  hours: v === "" ? "" : Number(v),
                }));
              }}
            />
          </div>

         

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ marginTop: 6 }}>Motivo</div>
            <input
              type="text"
              value={form.reason ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, reason: e.target.value }))
              }
              placeholder="Razón breve (opcional)"
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ marginTop: 6 }}>Notas</div>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={2}
              style={{ width: "100%" }}
            />
          </div>


               {/* Botón Crear alineado a la izquierda, dentro de la tarjeta */}
          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              gap: 8,
              justifyContent: "flex-start",
              alignItems: "center",
              marginTop: 4,
            }}
          >
            <button
  type="submit"
  disabled={!formValid}
  style={{ color: "black" }}
  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 font-semibold hover:bg-indigo-700 disabled:opacity-60"
>
  Crear
</button>
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
                <th style={th}>Tipo</th>
                <th style={th}>Horas</th>
                <th style={th}>Estado</th>
                <th style={th}>Motivo</th>
                <th style={th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td style={td} colSpan={9}>Sin registros</td></tr>
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
                    <td style={td}>{r.kind}</td>
                    <td style={td}>{r.kind === "hours" ? (r.hours ?? 0).toString() : "-"}</td>
                    <td style={td}>
                      <span style={{ padding: "2px 6px", borderRadius: 6, background:
                        r.status === "pending" ? "#ffeaa7" :
                        r.status === "approved" ? "#55efc4" : "#fab1a0" }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={td}>{r.reason ?? ""}</td>
                    <td style={{ ...td }}>
                      <div style={rowActions}>
                        <button onClick={() => onApprove(r.id)} disabled={r.status === "approved"}>Aprobar</button>
                        <button onClick={() => onReject(r.id)}  disabled={r.status === "rejected"}>Rechazar</button>
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
