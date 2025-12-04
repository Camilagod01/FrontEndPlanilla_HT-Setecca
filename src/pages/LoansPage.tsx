import EmployeeSelect from "@/components/EmployeeSelect";
import { useEffect, useMemo, useState } from "react";
import {
  getLoans,
  getLoanPayments,
  createLoan,
  updateLoan,
  deleteLoan,
  updateLoanPayment,
  type Loan,
  type LoansResponse,
  type LoanPayment,
  type LoanSchedule,
  type Currency,
} from "@/api/loans";
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

type ScheduleMode = "next" | "nth" | "custom";

const emptyForm: {
  employee_id?: number;
  amount?: number;
  principal?: number;
  currency: Currency;
  granted_at: string;
  start_date?: string;
  status: "active" | "closed";
  notes?: string;
  mode: ScheduleMode;
  intervalDays?: number;
  n?: number;
  installments: Array<{ due_date: string; amount: number; remarks?: string }>;
} = {
  employee_id: undefined,
  amount: undefined,
  principal: undefined,
  currency: "CRC",
  granted_at: new Date().toISOString().slice(0, 10),
  start_date: new Date().toISOString().slice(0, 10),
  status: "active",
  notes: "",
  mode: "next",
  intervalDays: 14,
  n: 2,
  installments: [],
};

export default function LoansPage() {
  const [items, setItems] = useState<Loan[]>([]);
  const [meta, setMeta] = useState<Paginated<Loan>["meta"]>();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  const [paymentsLoanId, setPaymentsLoanId] = useState<number | null>(null);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const fetchData = async (goToPage?: number) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const params: Record<string, any> = {};
      if (employeeId.trim()) params.employee_id = employeeId.trim();
      if (status.trim()) params.status = status.trim();
      params.page = goToPage ?? page;
      params.per_page = 10;

      const res: LoansResponse = await getLoans(params);

      let list: Loan[] = [];
      let metaObj: Paginated<Loan>["meta"] | undefined = undefined;

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
      setErrorMsg(e?.response?.data?.message ?? "Error al cargar préstamos");
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

  const buildSchedule = (): LoanSchedule => {
    if (form.mode === "next") {
      return { mode: "next", intervalDays: form.intervalDays || 14 };
    }
    if (form.mode === "nth") {
      return { mode: "nth", n: form.n || 2, intervalDays: form.intervalDays || 14 };
    }
    return { mode: "custom", installments: form.installments };
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg(null);
      if (!form.employee_id || !form.amount || !form.currency || !form.granted_at) {
        setErrorMsg("employee_id, amount, currency y granted_at son requeridos");
        return;
      }
      const payload = {
        employee_id: Number(form.employee_id),
        amount: Number(form.amount),
        principal: form.principal ? Number(form.principal) : Number(form.amount),
        currency: form.currency as Currency,
        granted_at: form.granted_at,
        start_date: form.start_date || form.granted_at,
        status: form.status,
        notes: form.notes || "",
        schedule: buildSchedule(),
      };
      await createLoan(payload);
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

  const removeLoan = async (id: number) => {
    if (!confirm("¿Eliminar préstamo?")) return;
    try {
      await deleteLoan(id);
      await fetchData();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Error al eliminar");
    }
  };

  const markLoanClosed = async (id: number) => {
    try {
      await updateLoan(id, { status: "closed" });
      await fetchData();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Error al actualizar");
    }
  };

  const openPayments = async (loanId: number) => {
    try {
      setPaymentsLoanId(loanId);
      setLoadingPayments(true);
      setPayments([]);
      const rows = await getLoanPayments(loanId);
      setPayments(rows);
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Error al obtener cuotas");
    } finally {
      setLoadingPayments(false);
    }
  };

  const markPaid = async (paymentId: number) => {
    try {
      await updateLoanPayment(paymentId, { action: "mark_paid" });
      if (paymentsLoanId) {
        const rows = await getLoanPayments(paymentsLoanId);
        setPayments(rows);
        await fetchData();
      }
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Error al marcar pagada");
    }
  };

  const markSkipped = async (paymentId: number) => {
    try {
      await updateLoanPayment(paymentId, { action: "mark_skipped" });
      if (paymentsLoanId) {
        const rows = await getLoanPayments(paymentsLoanId);
        setPayments(rows);
        await fetchData();
      }
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Error al marcar saltada");
    }
  };

  const reschedulePayment = async (paymentId: number) => {
    const newDate = prompt("Nueva fecha (YYYY-MM-DD):");
    if (!newDate) return;
    try {
      await updateLoanPayment(paymentId, { action: "reschedule", due_date: newDate });
      if (paymentsLoanId) {
        const rows = await getLoanPayments(paymentsLoanId);
        setPayments(rows);
        await fetchData();
      }
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Error al reprogramar");
    }
  };

  const addCustomInstallment = () => {
    setForm((f) => ({
      ...f,
      installments: [
        ...f.installments,
        { due_date: new Date().toISOString().slice(0, 10), amount: Number(f.amount || 0), remarks: "" },
      ],
    }));
  };

  const updateCustomInstallment = (idx: number, key: "due_date" | "amount" | "remarks", value: string) => {
    setForm((f) => {
      const arr = [...f.installments];
      if (key === "amount") {
        arr[idx][key] = Number(value);
      } else {
        arr[idx][key] = value as any;
      }
      return { ...f, installments: arr };
    });
  };

  const removeCustomInstallment = (idx: number) => {
    setForm((f) => {
      const arr = [...f.installments];
      arr.splice(idx, 1);
      return { ...f, installments: arr };
    });
  };

  const resetFilters = () => {
    setEmployeeId("");
    setStatus("");
    fetchData(1);
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Préstamos</h2>

      {/* Nuevo préstamo */}
      <section style={{ ...box, marginBottom: 12 }}>
        <strong>Nuevo préstamo</strong>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, marginTop: 8, maxWidth: 800 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
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
                placeholder="Ej. 150000"
              />
            </label>

            <label>
              Principal
              <input
                type="number"
                step="0.01"
                value={form.principal ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, principal: Number(e.target.value) }))}
                placeholder="Si no se indica, se usa Monto"
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
            <label>
              Moneda
              <select
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as Currency }))}
              >
                <option value="CRC">CRC</option>
                <option value="USD">USD</option>
              </select>
            </label>

            <label>
              Fecha otorgado
              <input
                type="date"
                value={form.granted_at}
                onChange={(e) => setForm((f) => ({ ...f, granted_at: e.target.value }))}
              />
            </label>

            <label>
              Inicio descuento
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              />
            </label>

            <label>
              Estado
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "active" | "closed" }))}
              >
                <option value="active">active</option>
                <option value="closed">closed</option>
              </select>
            </label>
          </div>

          <label>
            Notas
            <input
              type="text"
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>

          <fieldset style={{ border: "1px solid #ddd", padding: 8, borderRadius: 6 }}>
            <legend>Programación de cuotas</legend>

            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
              <label>
                Modo
                <select
                  value={form.mode}
                  onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as ScheduleMode }))}
                >
                  <option value="next">next</option>
                  <option value="nth">nth</option>
                  <option value="custom">custom</option>
                </select>
              </label>

              {(form.mode === "next" || form.mode === "nth") && (
                <label>
                  intervalDays
                  <input
                    type="number"
                    value={form.intervalDays ?? 14}
                    onChange={(e) => setForm((f) => ({ ...f, intervalDays: Number(e.target.value) }))}
                    style={{ width: 120 }}
                  />
                </label>
              )}

              {form.mode === "nth" && (
                <label>
                  n
                  <input
                    type="number"
                    value={form.n ?? 2}
                    onChange={(e) => setForm((f) => ({ ...f, n: Number(e.target.value) }))}
                    style={{ width: 100 }}
                  />
                </label>
              )}
            </div>

            {form.mode === "custom" && (
              <div style={{ display: "grid", gap: 8 }}>
                <button type="button" onClick={addCustomInstallment} style={{ width: 200 }}>
                  Agregar cuota
                </button>
                {form.installments.length === 0 && <small>No hay cuotas. Agrega al menos una.</small>}

                {form.installments.map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr auto",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <label>
                      due_date
                      <input
                        type="date"
                        value={it.due_date}
                        onChange={(e) => updateCustomInstallment(idx, "due_date", e.target.value)}
                      />
                    </label>

                    <label>
                      amount
                      <input
                        type="number"
                        step="0.01"
                        value={it.amount}
                        onChange={(e) => updateCustomInstallment(idx, "amount", e.target.value)}
                      />
                    </label>

                    <label>
                      remarks
                      <input
                        type="text"
                        value={it.remarks ?? ""}
                        onChange={(e) => updateCustomInstallment(idx, "remarks", e.target.value)}
                      />
                    </label>

                    <button type="button" onClick={() => removeCustomInstallment(idx)}>
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </fieldset>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 text-gray-800 px-4 py-2 font-semibold hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting ? "Guardando..." : "Crear préstamo"}
            </button>
            {errorMsg && <span style={{ color: "crimson" }}>{errorMsg}</span>}
          </div>
        </form>
      </section>

      {/* Filtros */}
      <section style={{ ...box, marginBottom: 12 }}>
        <strong>Filtros</strong>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "160px 160px auto",
            gap: 8,
            marginTop: 8,
            alignItems: "end",
          }}
        >
          <div>
            <div style={{ marginBottom: 6 }}>Empleado ID</div>
            <input
              type="text"
              placeholder="Ej. 17"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Estado</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">Todos</option>
              <option value="active">active</option>
              <option value="closed">closed</option>
            </select>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "flex-start",
              alignSelf: "end",
            }}
          >
            <button
              onClick={() => fetchData(1)}
              disabled={loading}
              className="px-3 py-2 bg-blue-600 text-gray-800 rounded hover:bg-blue-700 disabled:opacity-50"
              type="button"
            >
              {loading ? "Cargando..." : "Buscar"}
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

      {/* Listado */}
      <section style={{ ...box }}>
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
              {items.map((l) => (
                <tr key={l.id}>
                  <td style={td}>{l.id}</td>
                  <td style={td}>{l.employee_id}</td>
                  <td style={td}>{Number(l.amount).toFixed(2)}</td>
                  <td style={td}>{l.currency}</td>
                  <td style={td}>{fmtDate(l.granted_at as any)}</td>

                  <td style={td}>
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: 6,
                        background: l.status === "active" ? "#ffeaa7" : "#55efc4",
                      }}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td style={td}>{l.notes ?? ""}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openPayments(l.id)}>Cuotas</button>
                      <button onClick={() => markLoanClosed(l.id)} disabled={l.status === "closed"}>
                        Cerrar
                      </button>
                      <button onClick={() => removeLoan(l.id)}>Eliminar</button>
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

      {paymentsLoanId && (
        <section style={{ ...box, marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>Cuotas del préstamo #{paymentsLoanId}</strong>
            <button onClick={() => setPaymentsLoanId(null)}>Cerrar</button>
          </div>

          <div style={{ overflowX: "auto", marginTop: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>ID</th>
                  <th style={th}>Vence</th>
                  <th style={th}>Monto</th>
                  <th style={th}>Estado</th>
                  <th style={th}>Fuente</th>
                  <th style={th}>Observaciones</th>
                  <th style={th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingPayments && (
                  <tr>
                    <td colSpan={7} style={{ padding: 8 }}>
                      Cargando...
                    </td>
                  </tr>
                )}
                {!loadingPayments && payments.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 8 }}>
                      Sin cuotas
                    </td>
                  </tr>
                )}
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td style={td}>{p.id}</td>
                    <td style={td}>{fmtDate(p.due_date as any)}</td>
                    <td style={td}>{Number(p.amount).toFixed(2)}</td>
                    <td style={td}>{p.status}</td>
                    <td style={td}>{p.source}</td>
                    <td style={td}>{p.remarks ?? ""}</td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => markPaid(p.id)} disabled={p.status === "paid"}>
                          Pagar
                        </button>
                        <button onClick={() => markSkipped(p.id)} disabled={p.status !== "pending"}>
                          Omitir
                        </button>
                        <button onClick={() => reschedulePayment(p.id)}>Reprogramar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

const box: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 8,
  padding: 12,
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

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
