import React, { useEffect, useState } from "react";
import { http } from "@/api/https";

interface FinanceSectionProps {
  empId: number;
}

// Tipos simples, no pasa nada si algún campo viene undefined
interface Advance {
  id: number;
  issued_at?: string;
  amount: number;
  currency?: string;
  status?: string;
  notes?: string;
}

interface Loan {
  id: number;
  start_date?: string;
  principal?: number;
  balance?: number;
  currency?: string;
  status?: string;
  description?: string;
}

interface Garnishment {
  id: number;
  description?: string;
  amount?: number;
  currency?: string;
  active?: boolean;
}

const formatCurrency = (value: number | undefined, currency?: string) => {
  const n = typeof value === "number" ? value : 0;
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: currency || "CRC",
  }).format(n);
};

const FinanceSection: React.FC<FinanceSectionProps> = ({ empId }) => {
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [garnishments, setGarnishments] = useState<Garnishment[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!empId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [advRes, loanRes, garnRes] = await Promise.all([
          http.get("/advances", { params: { employee_id: empId } }),
          http.get("/loans", { params: { employee_id: empId } }),
          http.get("/garnishments", { params: { employee_id: empId } }),
        ]);

        setAdvances(advRes.data?.data ?? advRes.data ?? []);
        setLoans(loanRes.data?.data ?? loanRes.data ?? []);
        setGarnishments(garnRes.data?.data ?? garnRes.data ?? []);
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar las finanzas de este empleado.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [empId]);

  if (loading) {
    return <div>Cargando finanzas…</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Adelantos */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Adelantos</h2>
        {advances.length === 0 ? (
          <p className="text-sm text-gray-600">
            Este empleado no tiene adelantos registrados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 border">Fecha</th>
                  <th className="px-2 py-1 border">Monto</th>
                  <th className="px-2 py-1 border">Estado</th>
                  <th className="px-2 py-1 border">Notas</th>
                </tr>
              </thead>
              <tbody>
                {advances.map((a) => (
                  <tr key={a.id}>
                    <td className="px-2 py-1 border">
                      {a.issued_at?.slice(0, 10) ?? "-"}
                    </td>
                    <td className="px-2 py-1 border">
                      {formatCurrency(a.amount, a.currency)}
                    </td>
                    <td className="px-2 py-1 border">
                      {a.status ?? "-"}
                    </td>
                    <td className="px-2 py-1 border">
                      {a.notes ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Préstamos */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Préstamos</h2>
        {loans.length === 0 ? (
          <p className="text-sm text-gray-600">
            Este empleado no tiene préstamos registrados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 border">Fecha</th>
                  <th className="px-2 py-1 border">Monto original</th>
                  <th className="px-2 py-1 border">Saldo</th>
                  <th className="px-2 py-1 border">Estado</th>
                  <th className="px-2 py-1 border">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((l) => (
                  <tr key={l.id}>
                    <td className="px-2 py-1 border">
                      {l.start_date?.slice(0, 10) ?? "-"}
                    </td>
                    <td className="px-2 py-1 border">
                      {formatCurrency(l.principal, l.currency)}
                    </td>
                    <td className="px-2 py-1 border">
                      {formatCurrency(l.balance, l.currency)}
                    </td>
                    <td className="px-2 py-1 border">
                      {l.status ?? "-"}
                    </td>
                    <td className="px-2 py-1 border">
                      {l.description ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Embargos */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Embargos</h2>
        {garnishments.length === 0 ? (
          <p className="text-sm text-gray-600">
            Este empleado no tiene embargos registrados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 border">Descripción</th>
                  <th className="px-2 py-1 border">Monto</th>
                  <th className="px-2 py-1 border">Estado</th>
                </tr>
              </thead>
              <tbody>
                {garnishments.map((g) => (
                  <tr key={g.id}>
                    <td className="px-2 py-1 border">
                      {g.description ?? "-"}
                    </td>
                    <td className="px-2 py-1 border">
                      {formatCurrency(g.amount, g.currency)}
                    </td>
                    <td className="px-2 py-1 border">
                      {g.active ? "Activo" : "Inactivo"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default FinanceSection;
