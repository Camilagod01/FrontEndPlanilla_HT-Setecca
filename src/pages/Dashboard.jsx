import { useEffect, useState } from "react";
import { http } from "@/api/https";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const firstDay = `${yyyy}-${mm}-01`;
  const lastDay = new Date(yyyy, today.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(lastDay);

  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  async function loadTotals() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await http.get("/metrics/hours", {
        params: { from, to, group_by: "employee" },
      });
      setTotals(res.data.totals || { total: 0, extra_day: 0, extra_week: 0 });
    } catch (e) {
      setErrorMsg(
        e?.response?.data?.message ?? "Error al cargar métricas de horas"
      );
      setTotals(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTotals();
  }, []);

  const card = {
    padding: 16,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 16, fontSize: 24, fontWeight: 600 }}>
        Dashboard
      </h1>

      <section
        style={{
          marginBottom: 16,
          padding: 12,
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          background: "#ffffff",
        }}
      >
        <strong>Período</strong>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 8,
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Desde</div>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Hasta</div>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <button
            onClick={loadTotals}
            disabled={loading || !from || !to}
            style={{ padding: "6px 12px" }}
          >
            Actualizar
          </button>
        </div>
      </section>

      {errorMsg && (
        <div style={{ color: "crimson", marginBottom: 12 }}>{errorMsg}</div>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <div style={card}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
            Horas totales trabajadas
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            {loading || !totals ? "…" : totals.total.toFixed(2)}
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
            Horas extra por día
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            {loading || !totals ? "…" : totals.extra_day.toFixed(2)}
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
            Horas extra por semana
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            {loading || !totals ? "…" : totals.extra_week.toFixed(2)}
          </div>
        </div>
      </section>


              {/* Accesos rápidos a reportes */}
      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          Accesos rápidos
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Link
            to="/reports/attendance"
            style={{
              padding: "8px 14px",
              borderRadius: 9999,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              textDecoration: "none",
            }}
          >
            Ver reporte de asistencia
          </Link>

          <Link
            to="/reports/summary"
            style={{
              padding: "8px 14px",
              borderRadius: 9999,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              textDecoration: "none",
            }}
          >
            Ver reporte resumido
          </Link>
        </div>
      </section>


    </div>
  );
}
