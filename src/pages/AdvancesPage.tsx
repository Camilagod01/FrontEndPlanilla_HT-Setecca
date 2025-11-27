import EmployeeSelect from "@/components/EmployeeSelect";
import { useEffect, useMemo, useState } from "react";
import {
  getAdvances,
  createAdvance,
  updateAdvance,
  deleteAdvance,
  type Advance,
  type AdvancesResponse,
} from "@/api/advances";
import { fmtDate } from "@/lib/fmtDate";



type Paginated<T> = {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

const emptyForm: Partial<Advance> = {
  employee_id: undefined,
  amount: undefined,
  currency: "CRC",
  granted_at: new Date().toISOString().slice(0, 10),
  notes: "",
  status: "pending",
};

export default function AdvancesPage() {
  const [items, setItems] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const [form, setForm] = useState<Partial<Advance>>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [meta, setMeta] = useState<Paginated<Advance>["meta"]>();

  const fetchData = async (goToPage?: number) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const params: Record<string, any> = {};
      if (employeeId.trim()) params.employee_id = employeeId.trim();
      if (status.trim()) params.status = status.trim();
      params.page = goToPage ?? page;
      params.per_page = 10;

      const res: AdvancesResponse = await getAdvances(params);

      let list: Advance[] = [];
      let metaObj: Paginated<Advance>["meta"] | undefined = undefined;

      if (Array.isArray(res)) {
        list = res;
      } else {
        list = res.data ?? [];
        metaObj = res.meta;
      }

      setItems(list);
      setMeta(metaObj);
      if (goToPage) setPage(goToPage);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message ?? "Error al cargar adelantos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalText = useMemo(() => {
    if (!meta) return "";
    return `Mostrando página ${meta.current_page} de ${meta.last_page} • Total ${meta.total}`;
  }, [meta]);

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg(null);
      if (!form.employee_id || !form.amount || !form.currency || !form.granted_at) {
        setErrorMsg("employee_id, amount, currency y granted_at son requeridos");
        return;
      }

      const payload: Partial<Advance> = {
        employee_id: Number(form.employee_id),
        amount: Number(form.amount),
        currency: form.currency as "CRC" | "USD",
        granted_at: form.granted_at!,
        notes: form.notes ?? "",
        status: (form.status as Advance["status"]) ?? "pending",
      };

      await createAdvance(payload);
      setForm({ ...emptyForm });
      await fetchData(1);
    } catch (e: any) {
      setErrorMsg(
        e?.response?.data?.message ??
          (e?.response?.data?.errors && JSON.stringify(e.response.data.errors)) ??
          "Error al crear"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const markApplied = async (id: number) => {
    try {
      await updateAdvance(id, { status: "applied" });
      await fetchData();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Error al actualizar");
    }
  };

  const cancelAdvance = async (id: number) => {
    try {
      await updateAdvance(id, { status: "cancelled" });
      await fetchData();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Error al actualizar");
    }
  };

  const removeAdvance = async (id: number) => {
    if (!confirm("¿Eliminar adelanto?")) return;
    try {
      await deleteAdvance(id);
      await fetchData();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Error al eliminar");
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Adelantos</h2>

      <section style={{ marginBottom: 16, display: "grid", gap: 8 }}>
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 600 }}>
          <strong>Nuevo adelanto</strong>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label>
        Empleado
        <EmployeeSelect
         value={form.employee_id}
        onChange={(id) => setForm((f) => ({ ...f, employee_id: id }))}
        placeholder="Seleccione empleado…"
        />
        </label>




            <label>
              Monto
              <input
                type="number"
                step="0.01"
                value={form.amount ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                placeholder="Ej. 120000"
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <label>
              Moneda
              <select
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as any }))}
              >
                <option value="CRC">CRC</option>
                <option value="USD">USD</option>
              </select>
            </label>

            <label>
              Fecha otorgado
              <input
                type="date"
                value={form.granted_at ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, granted_at: e.target.value }))}
              />
            </label>

            <label>
              Estado
              <select
                value={form.status ?? "pending"}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
              >
                <option value="pending">pending</option>
                <option value="applied">applied</option>
                <option value="cancelled">cancelled</option>
              </select>
            </label>
          </div>

          <label>
            Notas
            <input
              type="text"
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Detalle opcional"
            />
          </label>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button type="submit" disabled={submitting}>
              {submitting ? "Guardando..." : "Crear adelanto"}
            </button>
            {errorMsg && <span style={{ color: "crimson" }}>{errorMsg}</span>}
          </div>
        </form>
      </section>

      <section style={{ marginBottom: 8 }}>
        <strong>Filtros</strong>
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Empleado ID"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            style={{ width: 140 }}
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 160 }}>
            <option value="">Todos</option>
            <option value="pending">pending</option>
            <option value="applied">applied</option>
            <option value="cancelled">cancelled</option>
          </select>
          <button onClick={() => fetchData(1)} disabled={loading}>
            {loading ? "Cargando..." : "Aplicar"}
          </button>
        </div>
      </section>

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <strong>Listado</strong>
          <small>{totalText}</small>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>ID</th>
                <th style={th}>Empleado</th>
                <th style={th}>Monto</th>
                <th style={th}>Moneda</th>
                <th style={th}>Fecha</th>
                <th style={th}>Estado</th>
                <th style={th}>Notas</th>
                <th style={th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 8, textAlign: "center" }}>
                    Sin registros
                  </td>
                </tr>
              )}
              {items.map((a) => (
                <tr key={a.id}>
                  <td style={td}>{a.id}</td>
                  <td style={td}>{a.employee_id}</td>
                  <td style={td}>{Number(a.amount).toFixed(2)}</td>
                  <td style={td}>{a.currency}</td>
                  <td style={td}>{fmtDate(a.granted_at as any)}</td>

                  <td style={td}>
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: 6,
                        background:
                          a.status === "pending"
                            ? "#ffeaa7"
                            : a.status === "applied"
                            ? "#55efc4"
                            : "#fab1a0",
                      }}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td style={td}>{a.notes ?? ""}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => markApplied(a.id)} disabled={a.status !== "pending"}>
                        Aplicar
                      </button>
                      <button onClick={() => cancelAdvance(a.id)} disabled={a.status === "applied"}>
                        Cancelar
                      </button>
                      <button onClick={() => removeAdvance(a.id)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {meta && meta.last_page > 1 && (
          <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => fetchData(Math.max(1, page - 1))} disabled={page <= 1}>
              ◀
            </button>
            <span>
              {page} / {meta.last_page}
            </span>
            <button
              onClick={() => fetchData(Math.min(meta.last_page, page + 1))}
              disabled={page >= meta.last_page}
            >
              ▶
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: 8,
  borderBottom: "1px solid #ddd",
  background: "#fafafa",
};

const td: React.CSSProperties = {
  padding: 8,
  borderBottom: "1px solid #eee",
};
