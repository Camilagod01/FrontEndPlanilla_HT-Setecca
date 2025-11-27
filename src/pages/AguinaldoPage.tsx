import React, { useEffect, useState } from 'react';
import { getAguinaldo, AguinaldoIndexResponse, AguinaldoItem } from '@/api/aguinaldo';
const todayISO = () => new Date().toISOString().slice(0, 10);

const formatCurrency = (value: number, currency: string) => {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: currency || 'CRC',
    minimumFractionDigits: 2,
  }).format(value);
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
      setError('No se pudo cargar el cálculo de aguinaldo.');
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

  return (
    <div className="page-container">
      <h1>Aguinaldo</h1>

      <form onSubmit={handleSubmit} style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <label>
          Fecha de corte:
          <input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            style={{ marginLeft: '0.5rem' }}
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Calculando…' : 'Actualizar'}
        </button>
      </form>

      {error && <div style={{ color: 'red' }}>{error}</div>}

      {data && (
        <>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>
            Fecha de corte usada: <strong>{data.as_of}</strong>
          </p>

          <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
            <table className="table table-striped table-hover">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Empleado</th>
                  <th>Período</th>
                  <th>Base (salarios acumulados)</th>
                  <th>Aguinaldo</th>
                  <th>Moneda</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center' }}>
                      No hay empleados activos para calcular aguinaldo.
                    </td>
                  </tr>
                )}

                {data.items.map((item: AguinaldoItem) => (
                  <tr key={item.employee.id}>
                    <td>{item.employee.code}</td>
                    <td>{item.employee.full_name}</td>
                    <td>
                      {item.period.from} — {item.period.to}
                    </td>
                    <td>{formatCurrency(item.base_total, item.currency)}</td>
                    <td>
                      <strong>{formatCurrency(item.aguinaldo, item.currency)}</strong>
                    </td>
                    <td>{item.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/*NUEVO BLOQUE: TOTAL DE AGUINALDO */}
    
                {/* 👇 NUEVO BLOQUE: TOTALES POR MONEDA */}
{data.items.length > 0 && (() => {
  const totalCRC = data.items
    .filter(item => item.currency === "CRC")
    .reduce((sum, item) => sum + item.aguinaldo, 0);

  const totalUSD = data.items
    .filter(item => item.currency === "USD")
    .reduce((sum, item) => sum + item.aguinaldo, 0);

  return (
    <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
      {totalCRC > 0 && (
        <div><strong>Total aguinaldo (CRC): {formatCurrency(totalCRC, "CRC")}</strong></div>
      )}
      {totalUSD > 0 && (
        <div><strong>Total aguinaldo (USD): {formatCurrency(totalUSD, "USD")}</strong></div>
      )}
      {(totalCRC === 0 && totalUSD === 0) && (
        <div><strong>Total aguinaldo: ₡0.00</strong></div>
      )}
    </div>
  );
})()}


        </>
      )}

      {loading && !data && <p>Cargando cálculo de aguinaldo…</p>}
    </div>
  );
};

export default AguinaldoPage;
