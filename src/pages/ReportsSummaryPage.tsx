import { useEffect, useMemo, useState } from "react";
import { getReportSummary, type ReportRow } from "@/api/reports";
import { http } from "@/api/https";

type EmpOption = { id: number; label: string };

const box: React.CSSProperties = {
  padding: 12,
  border: "1px solid #eee",
  borderRadius: 8,
  background: "#fff",
};
const td: React.CSSProperties = {
  padding: "8px 6px",
  borderBottom: "1px solid #eee",
  textAlign: "right",
};
const th: React.CSSProperties = {
  ...td,
  fontWeight: 600,
  background: "#fafafa",
};

export default function ReportsSummaryPage() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const firstDay = `${yyyy}-${mm}-01`;
  const lastDay = new Date(yyyy, today.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(lastDay);
  const [employeeId, setEmployeeId] = useState<string>("");

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [empOpts, setEmpOpts] = useState<EmpOption[]>([]);

  const canSearch = useMemo(() => !!from && !!to, [from, to]);

  async function loadEmployees() {
    try {
      const res = await http.get("/employees/options");
      const raw = res.data;
      const normalize = (r: any): EmpOption | null => {
        const id = Number(r?.id ?? r?.value ?? r?.employee_id);
        const label =
          r?.label ??
          r?.full_name ??
          (r?.first_name || r?.last_name
            ? `${r?.first_name ?? ""} ${r?.last_name ?? ""}`.trim()
            : undefined) ??
          r?.code ??
          (id ? `#${id}` : undefined);
        if (!id || !label) return null;
        return { id, label };
      };
      const opts = Array.isArray(raw)
        ? (raw.map(normalize).filter(Boolean) as EmpOption[])
        : Array.isArray(raw?.data)
        ? (raw.data.map(normalize).filter(Boolean) as EmpOption[])
        : [];
      setEmpOpts(opts);
    } catch {
      setEmpOpts([]);
    }
  }

  async function fetchData() {
    if (!canSearch) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getReportSummary({
        from,
        to,
        employee_id: employeeId ? Number(employeeId) : undefined,
      });
      setRows(data);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message ?? "Error al cargar reporte");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = rows.reduce(
    (acc, r) => {
      acc.adv_pend += r.advances?.pending_amount ?? 0;
      acc.adv_app += r.advances?.applied_amount ?? 0;
      acc.loan_cnt += r.loans?.created_count ?? 0;
      acc.loan_pri += r.loans?.principal_sum ?? 0;
      acc.pay_paid += r.loan_payments?.paid ?? 0;
      acc.pay_pend += r.loan_payments?.pending ?? 0;
      acc.pay_skip += r.loan_payments?.skipped ?? 0;
      acc.sick += r.sick_leaves_days ?? 0;
      acc.vac += r.vacations_days ?? 0;
      acc.abs_h += r.absences?.hours ?? 0;
      acc.abs_d += r.absences?.days ?? 0;
      acc.j_pend += r.justifications?.pending ?? 0;
      acc.j_app += r.justifications?.approved ?? 0;
      acc.j_rej += r.justifications?.rejected ?? 0;
      return acc;
    },
    {
      adv_pend: 0,
      adv_app: 0,
      loan_cnt: 0,
      loan_pri: 0,
      pay_paid: 0,
      pay_pend: 0,
      pay_skip: 0,
      sick: 0,
      vac: 0,
      abs_h: 0,
      abs_d: 0,
      j_pend: 0,
      j_app: 0,
      j_rej: 0,
    }
  );

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Reporte resumido</h2>

      {/* Filtros */}
      <section style={{ ...box, marginBottom: 12 }}>
        <strong>Filtros</strong>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "160px 160px 1fr auto",
            gap: 8,
            marginTop: 8,
            alignItems: "end",
          }}
        >
          <div>
            <div style={{ marginBottom: 6 }}>Desde</div>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6 }}>Hasta</div>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6 }}>Empleado</div>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">Todos</option>
              {empOpts.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={fetchData} disabled={!canSearch || loading}>
              {loading ? "Buscando…" : "Buscar"}
            </button>
            <button
              onClick={() => {
                setEmployeeId("");
                setFrom(firstDay);
                setTo(lastDay);
              }}
              disabled={loading}
            >
              Limpiar
            </button>
          </div>
        </div>
      </section>

      {/* Tabla */}
      <section style={{ ...box }}>
        {errorMsg && (
          <div style={{ color: "crimson", marginBottom: 8 }}>{errorMsg}</div>
        )}
        {loading ? (
          <div>Cargando…</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: "left" }}>Empleado</th>
                <th style={th}>Adv Pend</th>
                <th style={th}>Adv Aplic</th>
                <th style={th}>Préstamos Creados</th>
                <th style={th}>Principal</th>
                <th style={th}>Cuotas Pagadas</th>
                <th style={th}>Cuotas Pend</th>
                <th style={th}>Cuotas Omit</th>
                <th style={th}>Incap Días</th>
                <th style={th}>Vac Días</th>
                <th style={th}>Aus Horas</th>
                <th style={th}>Aus Días</th>
                <th style={th}>Just Pend</th>
                <th style={th}>Just Aprob</th>
                <th style={th}>Just Rech</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    style={{ ...td, textAlign: "left" }}
                    colSpan={15}
                  >
                    Sin datos
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.employee.id}>
                    <td style={{ ...td, textAlign: "left" }}>
                      {r.employee.full_name ||
                        r.employee.code ||
                        `#${r.employee.id}`}
                    </td>
                    <td style={td}>
                      {Number(r.advances.pending_amount ?? 0).toFixed(2)}
                    </td>
                    <td style={td}>
                      {Number(r.advances.applied_amount ?? 0).toFixed(2)}
                    </td>
                    <td style={td}>{r.loans.created_count}</td>
                    <td style={td}>
                      {Number(r.loans.principal_sum ?? 0).toFixed(2)}
                    </td>
                    <td style={td}>{r.loan_payments.paid}</td>
                    <td style={td}>{r.loan_payments.pending}</td>
                    <td style={td}>{r.loan_payments.skipped}</td>
                    <td style={td}>
                      {Number(r.sick_leaves_days ?? 0).toFixed(2)}
                    </td>
                    <td style={td}>
                      {Number(r.vacations_days ?? 0).toFixed(2)}
                    </td>
                    <td style={td}>
                      {Number(r.absences.hours ?? 0).toFixed(2)}
                    </td>
                    <td style={td}>
                      {Number(r.absences.days ?? 0).toFixed(2)}
                    </td>
                    <td style={td}>{r.justifications.pending}</td>
                    <td style={td}>{r.justifications.approved}</td>
                    <td style={td}>{r.justifications.rejected}</td>
                  </tr>
                ))
              )}
            </tbody>

            {rows.length > 0 && (
              <tfoot>
                <tr>
                  <th style={{ ...th, textAlign: "left" }}>Totales</th>
                  <th style={th}>
                    {Number(total.adv_pend).toFixed(2)}
                  </th>
                  <th style={th}>
                    {Number(total.adv_app).toFixed(2)}
                  </th>
                  <th style={th}>{total.loan_cnt}</th>
                  <th style={th}>
                    {Number(total.loan_pri).toFixed(2)}
                  </th>
                  <th style={th}>{total.pay_paid}</th>
                  <th style={th}>{total.pay_pend}</th>
                  <th style={th}>{total.pay_skip}</th>
                  <th style={th}>
                    {Number(total.sick).toFixed(2)}
                  </th>
                  <th style={th}>
                    {Number(total.vac).toFixed(2)}
                  </th>
                  <th style={th}>
                    {Number(total.abs_h).toFixed(2)}
                  </th>
                  <th style={th}>
                    {Number(total.abs_d).toFixed(2)}
                  </th>
                  <th style={th}>{total.j_pend}</th>
                  <th style={th}>{total.j_app}</th>
                  <th style={th}>{total.j_rej}</th>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </section>
    </div>
  );
}
