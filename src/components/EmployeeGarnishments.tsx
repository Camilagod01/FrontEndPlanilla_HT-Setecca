import { useEffect, useState } from "react";
import {
  listGarnishmentsByEmployee,
  createGarnishment,
  updateGarnishment,
  deleteGarnishment,
} from "@/api";

type Garn = {
  id: number;
  employee_id: number;
  order_no?: string | null;
  mode: "percent" | "amount";
  value: number;
  start_date: string;
  end_date?: string | null;
  priority: number;
  active: boolean;
};

export default function EmployeeGarnishments({ employeeId }: { employeeId: number }) {
  const [items, setItems] = useState<Garn[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // formulario simple
  const [form, setForm] = useState<Partial<Garn>>({
    mode: "percent",
    value: 10,
    start_date: new Date().toISOString().slice(0,10),
    end_date: null,
    priority: 1,
    active: true,
    order_no: "",
  });

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await listGarnishmentsByEmployee(employeeId);
      setItems(Array.isArray(data) ? data : []);
    } catch (e:any) {
      setErr("No se pudieron cargar los embargos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [employeeId]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const payload = {
        employee_id: employeeId,
        mode: (form.mode as "percent"|"amount") ?? "percent",
        value: Number(form.value ?? 0),
        start_date: form.start_date || new Date().toISOString().slice(0,10),
        end_date: form.end_date || null,
        priority: Number(form.priority ?? 1),
        active: Boolean(form.active ?? true),
        order_no: form.order_no || "",
      };
      await createGarnishment(payload as any);
      await load();
    } catch (e:any) {
      setErr("Error al crear embargo");
    }
  }

  async function onToggleActive(g: Garn) {
    setErr("");
    try {
const payload = {
      // envía todos los campos que el backend suele validar
      mode: g.mode,                             // "percent" | "amount"
      value: Number(g.value),                   // asegurar número
      start_date: g.start_date,                 // "YYYY-MM-DD"
      end_date: g.end_date ?? null,             // o null
      priority: Number(g.priority),             // asegurar número
      order_no: g.order_no ?? null,             // si existe en tu modelo
      employee_id: g.employee_id,               // incluye si tu API lo exige
      active: !g.active,                        // <-- toggle
    };

      await updateGarnishment(g.id, payload as any);
      //await updateGarnishment(g.id, { active: !g.active });
      await load();
    } catch (e:any) {
      //setErr("Error al actualizar");
      const msg =
      e?.response?.data?.message ||
      (e?.response?.data ? JSON.stringify(e.response.data) : "") ||
      e?.message ||
      "Error al actualizar";
    setErr(msg);
    }
  }

  async function onDelete(g: Garn) {
    if (!confirm("¿Eliminar embargo?")) return;
    setErr("");
    try {
      await deleteGarnishment(g.id);
      await load();
    } catch (e:any) {
      setErr("Error al eliminar");
    }
  }

  if (loading) return <div>Cargando embargos…</div>;
  return (
    <div>
      {err && <div style={{ color: "crimson", marginBottom: 8 }}>{err}</div>}

      <h3 style={{ margin: "8px 0" }}>Embargos</h3>

      {/* listado */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
        <thead>
          <tr>
            <th style={th}>ID</th>
            <th style={th}>Orden</th>
            <th style={th}>Modo</th>
            <th style={th}>Valor</th>
            <th style={th}>Inicio</th>
            <th style={th}>Fin</th>
            <th style={th}>Prioridad</th>
            <th style={th}>Activo</th>
            <th style={th}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map(g => (
            <tr key={g.id}>
              <td style={td}>{g.id}</td>
              <td style={td}>{g.order_no || "—"}</td>
              <td style={td}>{g.mode}</td>
              <td style={td}>{g.value}</td>
              <td style={td}>{g.start_date?.slice(0,10)}</td>
              <td style={td}>{g.end_date ? g.end_date.slice(0,10) : "—"}</td>
              <td style={td}>{g.priority}</td>
              <td style={td}>{g.active ? "Sí" : "No"}</td>
              <td style={td}>
                <button onClick={() => onToggleActive(g)} style={{ marginRight: 6 }}>
                  {g.active ? "Desactivar" : "Activar"}
                </button>
                <button onClick={() => onDelete(g)} style={{ color: "crimson" }}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td style={td} colSpan={9}>Sin embargos</td></tr>
          )}
        </tbody>
      </table>

      {/* crear rápido */}
      <form onSubmit={onCreate} style={{ display: "grid", gap: 8, maxWidth: 600 }}>
        <h4>Nuevo embargo</h4>
        <div style={{ display: "flex", gap: 8 }}>
          <label style={{ flex: 1 }}>
            Orden #
            <input
              value={form.order_no ?? ""}
              onChange={e => setForm(f => ({ ...f, order_no: e.target.value }))}
            />
          </label>
          <label style={{ width: 180 }}>
            Modo
            <select
              value={form.mode ?? "percent"}
              onChange={e => setForm(f => ({ ...f, mode: e.target.value as any }))}
            >
              <option value="percent">percent (%)</option>
              <option value="amount">amount (CRC)</option>
            </select>
          </label>
          <label style={{ width: 160 }}>
            Valor
            <input
              type="number" step="0.01"
              value={form.value ?? 0}
              onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <label>
            Inicio
            <input
              type="date"
              value={form.start_date ?? ""}
              onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
            />
          </label>
          <label>
            Fin
            <input
              type="date"
              value={form.end_date ?? "" as any}
              onChange={e => setForm(f => ({ ...f, end_date: e.target.value || null }))}
            />
          </label>
          <label style={{ width: 120 }}>
            Prioridad
            <input
              type="number"
              value={form.priority ?? 1}
              onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={!!form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
            />
            Activo
          </label>
        </div>

        <button type="submit">Crear embargo</button>
      </form>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", borderBottom: "1px solid #ddd", padding: "6px 4px" };
const td: React.CSSProperties = { borderBottom: "1px solid #f0f0f0", padding: "6px 4px" };
