import { useEffect, useMemo, useState } from "react";
import {
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  type Holiday,
  type HolidayCreate,
  type HolidaysPaginated,
  type HolidaysResponse,
  type HolidayFilters,
  type HolidayUpdate,
  type HolidayScope,
} from "../api/holidays";

const box: React.CSSProperties = { padding: 12, border: "1px solid #eee", borderRadius: 8, background: "#fff" };
const td: React.CSSProperties = { padding: "8px 6px", borderBottom: "1px solid #eee" };
const th: React.CSSProperties = { ...td, fontWeight: 600, background: "#fafafa" };
const rowActions: React.CSSProperties = { display: "flex", gap: 6, flexWrap: "wrap" };

type FormState = {
  date: string;
  name: string;
  scope: HolidayScope;
  paid: boolean;
};

export default function HolidaysPage() {
  // Filtros
  const [fYear, setFYear] = useState<string>("");
  const [fMonth, setFMonth] = useState<string>("");
  const [fFrom, setFFrom] = useState<string>("");
  const [fTo, setFTo] = useState<string>("");
  const [fScope, setFScope] = useState<"" | HolidayScope>("");
  const [fPaid, setFPaid] = useState<"" | "true" | "false">("");

  // Listado
  const [items, setItems] = useState<Holiday[]>([]);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; per_page: number; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Crear/Editar
  const [form, setForm] = useState<FormState>({
    date: "",
    name: "",
    scope: "national",
    paid: true,
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const formValid = useMemo(() => {
    return !!form.date && !!form.name && !!form.scope;
  }, [form]);

  async function fetchData(goToPage?: number) {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params: HolidayFilters = {
        year: fYear || undefined,
        month: fMonth || undefined,
        from: fFrom || undefined,
        to: fTo || undefined,
        scope: fScope || undefined,
        paid: fPaid === "" ? undefined : fPaid,
        page: goToPage ?? page,
        per_page: 10,
      };
      const res: HolidaysResponse = await getHolidays(params);
      const list: Holiday[] = Array.isArray(res) ? (res as Holiday[]) : ((res as HolidaysPaginated).data ?? []);
      const metaObj = Array.isArray(res) ? null : ((res as any).meta ?? null);
      setItems(list);
      setMeta(metaObj);
      if (goToPage) setPage(goToPage);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message ?? "Error al cargar feriados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid) return;

    try {
      if (editingId) {
        const payload: HolidayUpdate = {
          date: form.date,
          name: form.name,
          scope: form.scope,
          paid: form.paid,
        };
        const updated = await updateHoliday(editingId, payload);
        setItems((prev) => prev.map((h) => (h.id === editingId ? updated : h)));
        setEditingId(null);
      } else {
        const payload: HolidayCreate = {
          date: form.date,
          name: form.name,
          scope: form.scope,
          paid: form.paid,
        };
        const created = await createHoliday(payload);
        setItems((prev) => [created, ...prev]);
      }
      setForm({ date: "", name: "", scope: "national", paid: true });
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "No se pudo guardar el feriado");
    }
  }

  function onEdit(h: Holiday) {
    setEditingId(h.id);
    setForm({
      date: h.date ?? "",
      name: h.name ?? "",
      scope: h.scope,
      paid: !!h.paid,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onDelete(id: number) {
    if (!confirm("¿Eliminar feriado?")) return;
    try {
      await deleteHoliday(id);
      setItems((prev) => prev.filter((h) => h.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setForm({ date: "", name: "", scope: "national", paid: true });
      }
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "No se pudo eliminar");
    }
  }

  function resetFilters() {
    setFYear("");
    setFMonth("");
    setFFrom("");
    setFTo("");
    setFScope("");
    setFPaid("");
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Feriados</h2>

      {/* Filtros */}
      <section style={{ ...box, marginBottom: 12 }}>
        <strong>Filtros</strong>
        <div style={{ display: "grid", gridTemplateColumns: "120px 120px 160px 160px 160px 120px auto", gap: 8, marginTop: 8, alignItems: "end" }}>
          <div>
            <div style={{ marginBottom: 6 }}>Año</div>
            <input type="number" value={fYear} onChange={(e) => setFYear(e.target.value)} placeholder="2025" />
          </div>
          <div>
            <div style={{ marginBottom: 6 }}>Mes</div>
            <input type="number" min={1} max={12} value={fMonth} onChange={(e) => setFMonth(e.target.value)} placeholder="1-12" />
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
            <div style={{ marginBottom: 6 }}>Ámbito</div>
            <select value={fScope} onChange={(e) => setFScope(e.target.value as any)}>
              <option value="">Todos</option>
              <option value="national">national</option>
              <option value="company">company</option>
            </select>
          </div>
          <div>
            <div style={{ marginBottom: 6 }}>Pagado</div>
            <select value={fPaid} onChange={(e) => setFPaid(e.target.value as any)}>
              <option value="">Todos</option>
              <option value="true">sí</option>
              <option value="false">no</option>
            </select>
          </div>
          
          <div
  style={{
    gridColumn: "1 / -1",
    marginTop: 8,
    display: "flex",
    gap: 8,
    justifyContent: "flex-start",
  }}
>
  <button
    onClick={() => fetchData(1)}
    disabled={loading}
    className="px-3 py-2 bg-blue-600 text-gray-800 rounded hover:bg-blue-700 disabled:opacity-50"
    type="button"
  >
    {loading ? "Buscando…" : "Buscar"}
  </button>

  <button
    onClick={resetFilters}
    disabled={loading}
    className="px-3 py-2 border rounded hover:bg-gray-100 disabled:opacity-50"
    type="button"
  >
    Limpiar
  </button>
</div>


        </div>
      </section>

      {/* Crear / Editar */}
      <section style={{ ...box, marginBottom: 12 }}>
        <strong>{editingId ? `Editar feriado #${editingId}` : "Crear feriado"}</strong>
        <form onSubmit={onSubmit} style={{ display: "grid", gridTemplateColumns: "160px 1fr 160px 120px auto", gap: 8, marginTop: 8, alignItems: "end" }}>
          <div>
            <div style={{ marginBottom: 6 }}>Fecha</div>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Nombre</div>
            <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nombre feriado" />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Ámbito</div>
            <select value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as HolidayScope }))}>
              <option value="national">national</option>
              <option value="company">company</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              id="paidChk"
              type="checkbox"
              checked={form.paid}
              onChange={(e) => setForm((f) => ({ ...f, paid: e.target.checked }))}
            />
            <label htmlFor="paidChk">Pagado</label>
          </div>

          {/* Botones Crear / Guardar / Cancelar */}
<div
  style={{
    gridColumn: "1 / -1",
    marginTop: 10,
    display: "flex",
    gap: 10,
    justifyContent: "flex-start",
  }}
>
  
  <button
  type="submit"
  disabled={!formValid}
  className="px-4 py-2 rounded border border-gray-400 bg-white text-[#000] font-semibold hover:bg-gray-100 disabled:opacity-50"
>
  {editingId ? "Guardar" : "Crear"}
</button>


  {editingId && (
    <button
      type="button"
      onClick={() => {
        setEditingId(null);
        setForm({ date: "", name: "", scope: "national", paid: true });
      }}
      className="px-4 py-2 rounded border hover:bg-gray-100 text-black"
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
                <th style={th}>Fecha</th>
                <th style={th}>Nombre</th>
                <th style={th}>Ámbito</th>
                <th style={th}>Pagado</th>
                <th style={th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td style={td} colSpan={6}>Sin registros</td></tr>
              ) : (
                items.map((r) => (
                  <tr key={r.id}>
                    <td style={td}>{r.id}</td>
                    <td style={td}>{r.date}</td>
                    <td style={td}>{r.name}</td>
                    <td style={td}>{r.scope}</td>
                    <td style={td}>{r.paid ? "sí" : "no"}</td>
                    <td style={td}>
                      <div style={rowActions}>
                        <button onClick={() => onEdit(r)}>Editar</button>
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
