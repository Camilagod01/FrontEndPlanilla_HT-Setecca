import { useEffect, useMemo, useState } from "react";
import {
  getJustifications,
  createJustification,
  updateJustification,
  updateJustificationStatus,
  deleteJustification,
  type Justification,
  type JustificationCreate,
  type JustificationUpdate,
  type JustificationsResponse,
  type JustificationsPaginated,
  type JustificationFilters,
  type JustificationStatus,
  type JustificationType,
} from "@/api/justifications";
import { http } from "@/api/https";

type EmpOption = { id: number; label: string };

const box: React.CSSProperties = { padding: 12, border: "1px solid #eee", borderRadius: 8, background: "#fff" };
const td: React.CSSProperties = { padding: "8px 6px", borderBottom: "1px solid #eee" };
const th: React.CSSProperties = { ...td, fontWeight: 600, background: "#fafafa" };
const rowActions: React.CSSProperties = { display: "flex", gap: 6, flexWrap: "wrap" };
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "200px 1fr", gap: 8, alignItems: "center" };

type FormState = {
  employee_id: number | "";
  date: string;
  from_time?: string;
  to_time?: string;
  type: JustificationType;
  reason?: string;
  notes?: string;
  status?: JustificationStatus;
};

export default function JustificationsPage() {
  // Filtros
  const [fEmployee, setFEmployee] = useState<string>("");
  const [fFrom, setFFrom] = useState<string>("");
  const [fTo, setFTo] = useState<string>("");
  const [fType, setFType] = useState<"" | JustificationType>("");
  const [fStatus, setFStatus] = useState<"" | JustificationStatus>("");

  // Datos
  const [items, setItems] = useState<Justification[]>([]);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; per_page: number; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Empleados para selects
  const [empOpts, setEmpOpts] = useState<EmpOption[]>([]);

  // Formulario
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({
    employee_id: "",
    date: "",
    from_time: "",
    to_time: "",
    type: "late",
    reason: "",
    notes: "",
    status: "pending",
  });

  const timeVisible = useMemo(() => form.type !== "absence", [form.type]);

  const formValid = useMemo(() => {
    const empOk = typeof form.employee_id === "number" && form.employee_id > 0;
    const dateOk = !!form.date;
    const typeOk = ["late", "early_leave", "absence", "other"].includes(form.type);
    if (!empOk || !dateOk || !typeOk) return false;

    if (timeVisible) {
      if (form.from_time && !/^\d{2}:\d{2}$/.test(form.from_time)) return false;
      if (form.to_time && !/^\d{2}:\d{2}$/.test(form.to_time)) return false;
    }
    return true;
  }, [form, timeVisible]);

  /*async function loadEmployees() {   //Modelo pasado antes de justifaciones
    try {
      const res = await http.get<{ id: number; label: string }[]>("/employees/options");
      setEmpOpts(res.data ?? []);
    } catch {
      setEmpOpts([]);
    }
  }*/

async function loadEmployees() {
  try {
    const res = await http.get("/employees/options");
    const raw = res.data;

    // Acepta varios formatos y los normaliza a { id, label }
    let options: EmpOption[] = [];

    const normalizeOne = (r: any): EmpOption | null => {
      if (!r) return null;
      const id = Number(r.id ?? r.value ?? r.key ?? r.employee_id);
      const label =
        r.label ??
        r.full_name ??
        (r.first_name || r.last_name
          ? `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim()
          : undefined) ??
        r.code ??
        (id ? `#${id}` : undefined);

      if (!id || !label) return null;
      return { id, label };
    };

    if (Array.isArray(raw)) {
      options = raw.map(normalizeOne).filter(Boolean) as EmpOption[];
    } else if (raw?.data && Array.isArray(raw.data)) {
      options = raw.data.map(normalizeOne).filter(Boolean) as EmpOption[];
    } else {
      const one = normalizeOne(raw);
      options = one ? [one] : [];
    }

    setEmpOpts(options);
  } catch {
    setEmpOpts([]);
  }
}





  async function fetchData(goToPage?: number) {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params: JustificationFilters = {
        employee_id: fEmployee || undefined,
        from: fFrom || undefined,
        to: fTo || undefined,
        type: fType || undefined,
        status: fStatus || undefined,
        page: goToPage ?? page,
        per_page: 10,
      };
      const res: JustificationsResponse = await getJustifications(params);
      const list: Justification[] = Array.isArray(res) ? (res as Justification[]) : ((res as JustificationsPaginated).data ?? []);
      const metaObj = Array.isArray(res) ? null : ((res as any).meta ?? null);
      setItems(list);
      setMeta(metaObj);
      if (goToPage) setPage(goToPage);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message ?? "Error al cargar justificaciones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetFilters() {
    setFEmployee("");
    setFFrom("");
    setFTo("");
    setFType("");
    setFStatus("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid) return;

    try {
      if (editingId) {
        const payload: JustificationUpdate = {
          employee_id: typeof form.employee_id === "number" ? form.employee_id : undefined,
          date: form.date,
          from_time: timeVisible ? (form.from_time || null) : null,
          to_time: timeVisible ? (form.to_time || null) : null,
          type: form.type,
          reason: form.reason || undefined,
          notes: form.notes || undefined,
          status: form.status || undefined,
        };
        const updated = await updateJustification(editingId, payload);
        setItems((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
        setEditingId(null);
      } else {
        const payload: JustificationCreate = {
          employee_id: form.employee_id as number,
          date: form.date,
          from_time: timeVisible ? (form.from_time || null) : null,
          to_time: timeVisible ? (form.to_time || null) : null,
          type: form.type,
          reason: form.reason || undefined,
          notes: form.notes || undefined,
          status: form.status || "pending",
        };
        const created = await createJustification(payload);
        setItems((prev) => [created, ...prev]);
      }

      setForm({
        employee_id: "",
        date: "",
        from_time: "",
        to_time: "",
        type: "late",
        reason: "",
        notes: "",
        status: "pending",
      });
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "No se pudo guardar");
    }
  }

  function onEdit(r: Justification) {
    setEditingId(r.id);
    setForm({
      employee_id: r.employee_id,
      date: r.date,
      from_time: r.from_time ?? "",
      to_time: r.to_time ?? "",
      type: r.type,
      reason: r.reason ?? "",
      notes: r.notes ?? "",
      status: r.status,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onDelete(id: number) {
    if (!confirm("¿Eliminar justificación?")) return;
    try {
      await deleteJustification(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setForm({
          employee_id: "",
          date: "",
          from_time: "",
          to_time: "",
          type: "late",
          reason: "",
          notes: "",
          status: "pending",
        });
      }
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "No se pudo eliminar");
    }
  }

  async function setStatus(id: number, status: JustificationStatus) {
    try {
      const updated = await updateJustificationStatus(id, status);
      setItems((prev) => prev.map((x) => (x.id === id ? updated : x)));
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "No se pudo actualizar estado");
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Justificaciones</h2>

      {/* Filtros */}
      <section style={{ ...box, marginBottom: 12 }}>
        <strong>Filtros</strong>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 160px 160px 160px auto", gap: 8, marginTop: 8, alignItems: "end" }}>
          <div>
            <div style={{ marginBottom: 6 }}>Empleado</div>
            <select value={fEmployee} onChange={(e) => setFEmployee(e.target.value)}>
              <option value="">Todos</option>
              {empOpts.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
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
          <div>
            <div style={{ marginBottom: 6 }}>Tipo</div>
            <select value={fType} onChange={(e) => setFType(e.target.value as any)}>
              <option value="">Todos</option>
              <option value="late">late</option>
              <option value="early_leave">early_leave</option>
              <option value="absence">absence</option>
              <option value="other">other</option>
            </select>
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
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => fetchData(1)} disabled={loading}>Buscar</button>
            <button onClick={resetFilters} disabled={loading}>Limpiar</button>
          </div>
        </div>
      </section>

      {/* Crear / Editar */}
      <section style={{ ...box, marginBottom: 12 }}>
        <strong>{editingId ? `Editar #${editingId}` : "Crear justificación"}</strong>
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, marginTop: 8 }}>
          <div style={grid2}>
            <label>Empleado</label>
            <select
              value={form.employee_id}
              onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value ? Number(e.target.value) : "" }))}
            >
              <option value="">Seleccione…</option>
              {empOpts.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>

          <div style={grid2}>
            <label>Fecha</label>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </div>

          <div style={grid2}>
            <label>Tipo</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as JustificationType }))}
            >
              <option value="late">late</option>
              <option value="early_leave">early_leave</option>
              <option value="absence">absence</option>
              <option value="other">other</option>
            </select>
          </div>

          {timeVisible && (
            <>
              <div style={grid2}>
                <label>Desde (HH:mm)</label>
                <input type="time" value={form.from_time} onChange={(e) => setForm((f) => ({ ...f, from_time: e.target.value }))} />
              </div>
              <div style={grid2}>
                <label>Hasta (HH:mm)</label>
                <input type="time" value={form.to_time} onChange={(e) => setForm((f) => ({ ...f, to_time: e.target.value }))} />
              </div>
            </>
          )}

          <div style={grid2}>
            <label>Motivo</label>
            <input type="text" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Motivo corto" />
          </div>

          <div style={grid2}>
            <label>Notas</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={!formValid}>{editingId ? "Guardar" : "Crear"}</button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm({
                    employee_id: "",
                    date: "",
                    from_time: "",
                    to_time: "",
                    type: "late",
                    reason: "",
                    notes: "",
                    status: "pending",
                  });
                }}
              >
                Cancelar
              </button>
            )}
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
                <th style={th}>Fecha</th>
                <th style={th}>Tipo</th>
                <th style={th}>Hora Desde</th>
                <th style={th}>Hora Hasta</th>
                <th style={th}>Estado</th>
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
                    <td style={td}>{r.employee?.full_name || r.employee?.first_name ? `${r.employee?.first_name ?? ""} ${r.employee?.last_name ?? ""}`.trim() : r.employee_id}</td>
                    <td style={td}>{r.date}</td>
                    <td style={td}>{r.type}</td>
                    <td style={td}>{r.from_time ?? ""}</td>
                    <td style={td}>{r.to_time ?? ""}</td>
                    <td style={td}>
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: 6,
                          background:
                            r.status === "pending" ? "#ffeaa7" :
                            r.status === "approved" ? "#55efc4" : "#fab1a0",
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td style={td}>
                      <div style={rowActions}>
                        <button onClick={() => onEdit(r)}>Editar</button>
                        <button onClick={() => setStatus(r.id, "approved")} disabled={r.status === "approved"}>Aprobar</button>
                        <button onClick={() => setStatus(r.id, "rejected")} disabled={r.status === "rejected"}>Rechazar</button>
                        <button onClick={() => setStatus(r.id, "pending")} disabled={r.status === "pending"}>Pendiente</button>
                        <button onClick={() => onDelete(r.id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

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
