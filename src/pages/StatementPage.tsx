import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getStatement, exportStatement, StatementResponse } from "../services/statement";
import dayjs from "dayjs";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function StatementPage() {
  const query = useQuery();
  const navigate = useNavigate();

  // Prefill desde ?employee_code= y fechas
  const initialCode = useMemo(() => query.get("employee_code") ?? "", [query]);
  const [employeeCode, setEmployeeCode] = useState<string>(initialCode);

  const [from, setFrom] = useState(
    query.get("from") ?? dayjs().startOf("month").format("YYYY-MM-DD")
  );
  const [to, setTo] = useState(
    query.get("to") ?? dayjs().endOf("month").format("YYYY-MM-DD")
  );

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StatementResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-consultar si viene ?employee_code=...&auto=1
  useEffect(() => {
    if (initialCode && query.get("auto") === "1") {
      handleFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFetch() {
    setError(null);
    setData(null);

    if (!employeeCode.trim() || !from || !to) {
      setError("Completa el código de empleado y el rango de fechas.");
      return;
    }

    try {
      setLoading(true);

      // Servicio por CÓDIGO de empleado (ej. emp-0003)
      const res = await getStatement(employeeCode.trim(), from, to);
      setData(res);

      // Persistir filtros en la URL
      const search = new URLSearchParams({
        employee_code: employeeCode.trim(),
        from,
        to,
      });
      navigate({ search: `?${search.toString()}` }, { replace: true });
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "No se pudo obtener el estado."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(type: "pdf" | "excel") {
    if (!data) return;
    const filenameHint = `estado_${data.employee.code}_${data.period.from.replaceAll(
      "-",
      ""
    )}_a_${data.period.to.replaceAll("-", "")}`;

    try {
      // El export aún usa el ID interno que viene en la respuesta
      await exportStatement(
        data.employee.id,
        data.period.from,
        data.period.to,
        type,
        filenameHint
      );
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          `No se pudo exportar a ${type.toUpperCase()}`
      );
    }
  }

  const currency = data?.currency ?? "CRC";
  const nf = useMemo(
    () =>
      new Intl.NumberFormat("es-CR", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }),
    [currency]
  );


  

  // ===================== NUEVO: normalizar campos de horas =====================
  const hours = data?.hours as any | undefined;

  const sick50 = hours
    ? (hours.sick_days_50 ?? hours.sick_50pct_days ?? 0)
    : 0;

  const sick0 = hours
    ? (hours.sick_days_0 ?? hours.sick_0pct_days ?? 0)
    : 0;
  // ============================================================================

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Estado de cuenta</h1>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-4 mb-6 grid gap-3 md:grid-cols-5">
        <div className="md:col-span-2">
          <label className="text-sm text-gray-600">Código empleado</label>
          <input
            type="text"
            className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
            placeholder="Ej. emp-0003"
            value={employeeCode}
            onChange={(e) => setEmployeeCode(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Formato sugerido: <code>emp-0001</code>
          </p>
        </div>

        <div>
          <label className="text-sm text-gray-600">Desde</label>
          <input
            type="date"
            className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Hasta</label>
          <input
            type="date"
            className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={handleFetch}
            className="w-full inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white px-4 py-2 font-medium hover:bg-indigo-700 disabled:opacity-60"
            disabled={loading || !employeeCode.trim()}
          >
            {loading ? "Cargando..." : "Consultar"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <div className="text-gray-500 text-sm">Empleado</div>
                <div className="font-semibold">
                  {data.employee.name}{" "}
                  <span className="text-gray-500">({data.employee.code})</span>
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-sm">Período</div>
                <div className="font-semibold">
                  {data.period.from} – {data.period.to}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-sm">Moneda</div>
                <div className="font-semibold">{data.currency}</div>
              </div>
              <div>
                <div className="text-gray-500 text-sm">Tipo de cambio</div>
                <div className="font-semibold">
                  ₡{data.exchange_rate.toFixed(2)} / USD
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold mb-3">Resumen de horas</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              {/*<Stat label="Horas 1x" value={data.hours.regular_1x} />
              <Stat label="Horas 1.5x" value={data.hours.overtime_15} />
              <Stat label="Horas 2x" value={data.hours.double_20} />
               Aquí usamos los valores normalizados 
              <Stat label="Incap. 50%" value={sick50} />
              <Stat label="Incap. 0%" value={sick0} />*/}



                <Stat label="Horas 1x" value={data.hours.regular_1x} />
                <Stat label="Horas 1.5x" value={data.hours.overtime_15} />
                <Stat label="Horas 2x" value={data.hours.double_20} />
                <Stat label="Incap. 50%" value={sick50} />
                <Stat label="Incap. 0%" value={sick0} />



            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold mb-3">Ingresos</h3>
              <Table rows={data.incomes} nf={nf} total={data.total_gross} />
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold mb-3">Deducciones</h3>
              <Table
                rows={data.deductions}
                nf={nf}
                total={data.total_deductions}
                negative
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-lg">
              <span className="text-gray-600">Neto:</span>{" "}
              <span className="font-semibold">
                {nf.format(data.net)} {data.currency}
              </span>

              {/* Equivalente en colones cuando la moneda es USD y hay tipo de cambio */}
              {data.currency === "USD" && data.exchange_rate && (
                <div className="text-sm text-gray-500 mt-1">
                  ≈ ₡{nf.format(data.net * data.exchange_rate)} CRC{" "}
                  <span className="text-xs">
                    (al tipo de cambio {data.exchange_rate.toFixed(2)})
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleExport("pdf")}
                className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
              >
                Exportar PDF
              </button>
              <button
                onClick={() => handleExport("excel")}
                className="inline-flex items-center rounded-lg bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700"
              >
                Exportar Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  const safeValue = typeof value === "number" ? value : 0;

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="text-gray-500 text-xs">{label}</div>
      <div className="font-semibold">{safeValue.toFixed(2)}</div>
    </div>
  );
}

function Table({
  rows,
  nf,
  total,
  negative = false,
}: {
  rows: { label: string; amount: number }[];
  nf: Intl.NumberFormat;
  total: number;
  negative?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-600">
              Concepto
            </th>
            <th className="px-3 py-2 text-right font-medium text-gray-600">
              Monto
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="px-3 py-2">{r.label}</td>
              <td
                className={`px-3 py-2 text-right ${
                  negative ? "text-red-600" : "text-emerald-700"
                }`}
              >
                {nf.format(r.amount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50">
            <td className="px-3 py-2 font-semibold">Total</td>
            <td
              className={`px-3 py-2 text-right font-semibold ${
                negative ? "text-red-700" : "text-emerald-800"
              }`}
            >
              {nf.format(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
