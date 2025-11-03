import { useState } from "react";
import {
  importEmployees,
  downloadEmployeesTemplate,
  type ImportResult,
} from "@/services/employeesImport";

export default function ImportEmployeesModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState<boolean>(true);
  const [delimiter, setDelimiter] = useState<"," | ";">(",");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
        try {
            setError(null);
            setResult(null);
            if (!file) { setError("Selecciona un archivo CSV."); return; }
            setLoading(true);

            const res = await importEmployees(file, { dryRun, delimiter });
            setResult(res);
        } catch (e: any) {
            const msg =
            e?.response?.data?.message ??
            (e?.response?.data?.errors &&
                Object.values(e.response.data.errors).flat().join(" | ")) ??
            "No se pudo importar el CSV.";
            setError(String(msg));
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow p-6 w-[520px]">
        <h2 className="text-lg font-semibold mb-3">Importar empleados (CSV)</h2>

        {/* Campo de archivo */}
        <div className="grid gap-3 mb-4">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          {/* Opciones */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
              />
              Simular (no guardar)
            </label>

            <label className="flex items-center gap-2">
              Delimitador
              <select
                className="border rounded px-2 py-1"
                value={delimiter}
                onChange={(e) =>
                  setDelimiter(
                    e.target.value === ";" ? ";" : ","
                  )
                }
              >
                <option value=",">, (coma)</option>
                <option value=";">; (punto y coma)</option>
              </select>
            </label>

            <button
              type="button"
              className="text-blue-600 underline"
              onClick={downloadEmployeesTemplate}
            >
              Descargar plantilla
            </button>
          </div>
        </div>

        {/* Errores */}
        {error && (
          <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </div>
        )}

        {/* Resultado */}
        {result && (
          <div className="mb-3 text-sm border rounded p-3 bg-gray-50 space-y-1">
            <div>✔️ Creados: {result.created ?? 0}</div>
            <div>🔁 Actualizados: {result.updated ?? 0}</div>
            <div>❌ Inválidos: {result.invalid_rows ?? 0}</div>
            {result.errors_csv_url && (
              <a
                className="text-blue-600 underline"
                href={result.errors_csv_url}
                target="_blank"
                rel="noreferrer"
              >
                Descargar errores CSV
              </a>
            )}
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-2">
          <button className="border rounded px-3 py-2" onClick={onClose}>
            Cerrar
          </button>
          <button
            className="bg-emerald-600 text-white rounded px-4 py-2 disabled:opacity-60"
            onClick={handleUpload}
            disabled={loading || !file}
          >
            {loading ? "Procesando..." : "Validar / Importar"}
          </button>
        </div>
      </div>
    </div>
  );
}
