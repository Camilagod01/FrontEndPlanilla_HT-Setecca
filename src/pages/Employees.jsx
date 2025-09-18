import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listEmployees } from "../services/employees";



export default function Employees() {
  const navigate = useNavigate();

  // estado UI
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // datos
  const [resp, setResp] = useState(null);   // respuesta completa de Laravel {data, meta, links}
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // debounce para búsqueda (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // cargar lista
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const r = await listEmployees({ page, search: debounced, perPage });
        setResp(r);
      } catch (e) {
        console.error(e);
        setError("No se pudieron cargar los empleados.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [page, debounced, perPage]);

  const rows = useMemo(() => (Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : [])), [resp]);
  const meta = resp?.meta ?? { current_page: page, last_page: page, total: rows.length };

  const goPrev = () => setPage(p => Math.max(1, p - 1));
  const goNext = () => setPage(p => meta?.last_page ? Math.min(meta.last_page, p + 1) : p + 1);

  const onRowClick = (id) => navigate(`/employees/${id}`);

  return (
    <div>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Empleados</h2>

          <div className="flex items-center gap-2">
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="border rounded px-2 py-1"
              title="Elementos por página"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>

            <button
              onClick={() => navigate("/employees/new")}
              className="px-3 py-2 border rounded"
            >
              Agregar empleado
            </button>
          </div>
        </div>

        <div className="mb-4">
          <input
            className="w-full md:w-96 border rounded px-3 py-2"
            placeholder="Buscar por código, nombre o email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {loading && <div className="py-8">Cargando…</div>}
        {error && <div className="py-4 text-red-600">{error}</div>}

        {!loading && !error && (
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2">ID</th>
                  <th className="text-left px-4 py-2">Código</th>
                  <th className="text-left px-4 py-2">Nombre</th>
                  <th className="text-left px-4 py-2">Puesto</th>
                  <th className="text-left px-4 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(e => (
                  <tr
                    key={e.id}
                    className="border-t hover:bg-gray-50 cursor-pointer"
                    onClick={() => onRowClick(e.id)}  // ← click fila → perfil
                  >
                    <td className="px-4 py-2">{e.id}</td>
                    <td className="px-4 py-2">{e.code ?? "-"}</td>
                    
                    <td className="px-4 py-2">{[e.first_name, e.last_name].filter(Boolean).join(" ") || "-"}</td>
                    <td className="px-4 py-2">{e.position ?? "-"}</td>
                    <td className="px-4 py-2">{e.status ?? "active"}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                      No hay resultados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Página {meta.current_page ?? page} de {meta.last_page ?? 1}
          </div>
          <div className="space-x-2">
            <button
              className="px-3 py-2 border rounded disabled:opacity-50"
              onClick={goPrev}
              disabled={(meta.current_page || 1) <= 1}
            >
              Anterior
            </button>
            <button
              className="px-3 py-2 border rounded disabled:opacity-50"
              onClick={goNext}
              disabled={(meta.current_page || 1) >= (meta.last_page || 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
