import React, { useEffect, useState } from "react";
import { getAguinaldo, AguinaldoIndexResponse, AguinaldoItem } from "@/api/aguinaldo";

const todayISO = () => new Date().toISOString().slice(0, 10);

const formatCurrency = (value: number, currency: string) => {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: currency || "CRC",
    minimumFractionDigits: 2,
  }).format(value);
};

// Estilos reutilizables (mismo estilo de "tarjeta" que en otros módulos)
const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  padding: 16,
  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
  marginBottom: 16,
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: 8,
  borderBottom: "1px solid #e5e7eb",
  background: "#f9fafb",
  fontSize: 13,
};

const td: React.CSSProperties = {
  padding: 8,
  borderBottom: "1px solid #f3f4f6",
  fontSize: 13,
};

const AguinaldoPage: React.FC = () => {
  const [asOf, setAsOf] = useState<string>(todayISO());
  const [data, setData] = useState<AguinaldoIndexResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (date: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAguinaldo(date);
      setData(res);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar el cálculo de aguinaldo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(asOf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(asOf);
  };

  // Totales por moneda
  let totalCRC = 0;
  let totalUSD = 0;
  if (data && data.items.length > 0) {
    for (const item of data.items) {
      if (item.currency === "CRC") {
        totalCRC += item.aguinaldo;
      } else if (item.currency === "USD") {
        totalUSD += item.aguinaldo;
      }
    }
  }

  return (
    <div className="page-container">
      <h1 style={{ marginBottom: 12 }}>Aguinaldo</h1>

      {/* Tarjeta de filtros / fecha de corte */}
      <section style={cardStyle}>
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "center",
          }}
        >
          <label style={{ fontSize: 14 }}>
            <span style={{ marginRight: 8 }}>Fecha de corte:</span>
            <input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              style={{
                padding: "4px 6px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                fontSize: 14,
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="px-3 py-2 bg-blue-600 text-gray-800 rounded hover:bg-blue-700 disabled:opacity-50"
            style={{ fontSize: 14 }}
          >
            {loading ? "Calculando…" : "Actualizar"}
          </button>
        </form>

        <p
          style={{
            fontSize: 12,
            color: "#6b7280",
            marginTop: 8,
          }}
        >
          Fecha de corte usada: <strong>{data?.as_of ?? asOf}</strong>
        </p>

        {error && (
          <div
            style={{
              marginTop: 8,
              padding: "8px 10px",
              borderRadius: 6,
              background: "#fef2f2",
              color: "#b91c1c",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}
      </section>

      {/* Tarjeta con tabla + totales */}
      <section style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            alignItems: "baseline",
            marginBottom: 8,
          }}
        >
          <div>
            <strong>Resumen de aguinaldo</strong>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Cálculo acumulado por empleado según salarios del período.
            </div>
          </div>
        </div>

        {loading && !data && <p style={{ fontSize: 14 }}>Cargando cálculo de aguinaldo…</p>}

        {data && (
          <>
            <div style={{ overflowX: "auto", marginTop: 4 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Código</th>
                    <th style={th}>Empleado</th>
                    <th style={th}>Período</th>
                    <th style={th}>Base (salarios acumulados)</th>
                    <th style={th}>Aguinaldo</th>
                    <th style={th}>Moneda</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: 12, textAlign: "center", fontSize: 13 }}>
                        No hay empleados activos para calcular aguinaldo.
                      </td>
                    </tr>
                  )}

                  {data.items.map((item: AguinaldoItem) => (
                    <tr key={item.employee.id}>
                      <td style={td}>{item.employee.code}</td>
                      <td style={td}>{item.employee.full_name}</td>
                      <td style={td}>
                        {item.period.from} — {item.period.to}
                      </td>
                      <td style={td}>{formatCurrency(item.base_total, item.currency)}</td>
                      <td style={{ ...td, fontWeight: 600 }}>
                        {formatCurrency(item.aguinaldo, item.currency)}
                      </td>
                      <td style={td}>{item.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales alineados, dentro de la misma tarjeta */}
            <div
              style={{
                borderTop: "1px solid #e5e7eb",
                marginTop: 12,
                paddingTop: 8,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                alignItems: "flex-end",
                fontSize: 13,
              }}
            >
              {totalCRC > 0 && (
                <div>
                  <strong>Total aguinaldo (CRC): </strong>
                  <span>{formatCurrency(totalCRC, "CRC")}</span>
                </div>
              )}
              {totalUSD > 0 && (
                <div>
                  <strong>Total aguinaldo (USD): </strong>
                  <span>{formatCurrency(totalUSD, "USD")}</span>
                </div>
              )}
              {totalCRC === 0 && totalUSD === 0 && (
                <div>
                  <strong>Total aguinaldo: </strong>
                  <span>₡0,00</span>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default AguinaldoPage;
