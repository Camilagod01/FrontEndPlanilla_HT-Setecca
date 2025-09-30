import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

interface Employee {
  id: number;
  code: string;
  first_name: string;
  last_name: string;
}

type Status = "completo" | "pendiente_salida" | "anomalia";

export interface TimeEntry {
  id: number;
  employee?: Employee;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  notes: string | null;
  status: Status;
}

interface Meta {
  current_page: number;
  last_page: number;
}

interface Editing {
  id: number;
  check_in: string;
  check_out: string;
  notes: string;
  summary: string;
  orig: {
    check_in: string;
    check_out: string;
    notes: string;
  };
}

const fmtToSql = (s: string) => (s ? s.replace("T", " ").slice(0, 19) : "");

export default function TimeEntries() {
  const [rows, setRows] = useState<TimeEntry[]>([]);
  const [meta, setMeta] = useState<Meta>({ current_page: 1, last_page: 1 });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // filtros
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [qInput, setQInput] = useState("");
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [statusInput, setStatusInput] = useState("");     

  const applyFilters = () => {
    setPage(1);
    setQ(qInput.trim());
    setFrom(fromInput);
    setTo(toInput);
    setStatus(statusInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === "Enter") applyFilters();
  };

  // edición
  const [editing, setEditing] = useState<Editing | null>(null);

  const params = useMemo(() => {
    const p: Record<string, any> = { page };
    if (q) p.q = q;
    if (from) p.from = from;
    if (to) p.to = to;
    if (status) p.status = status;
    return p;
  }, [q, from, to, status, page]);

  const normalizeList = (payload: any): TimeEntry[] => {
    // Si viene paginador Laravel
    if (payload && Array.isArray(payload.data)) return payload.data as TimeEntry[];
    // Si el endpoint devolviera array plano
    if (Array.isArray(payload)) return payload as TimeEntry[];
    return [];
  };

  const normalizeMeta = (payload: any): Meta => ({
    current_page: Number(payload?.current_page ?? 1),
    last_page: Number(payload?.last_page ?? 1),
  });

  const load = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api.get("/time-entries", { params });
      const payload = res.data;
      const list = normalizeList(payload);
      setRows(list); // nunca undefined
      setMeta(normalizeMeta(payload));
    } catch (e: any) {
      console.error(e);
      setRows([]); // evita undefined → .map seguro
      setMeta({ current_page: 1, last_page: 1 });
      setErrorMsg(e?.response?.data?.message || "No se pudo cargar marcaciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const toLocal = (dt?: string | null) =>
      dt ? dt.slice(0, 16).replace(" ", "T") : "";

      const openEdit = (row: TimeEntry) => {
      const ci = toLocal(row.check_in);
      const co = toLocal(row.check_out);
      const nt = row.notes || "";
      setEditing({
        id: row.id,
        check_in: ci,
        check_out: co,
        notes: nt,
        summary: `${row.employee?.code} · ${row.employee?.first_name} ${row.employee?.last_name} · ${row.work_date}`,
        orig: { check_in: ci, check_out: co, notes: nt },
    });
  };

  const fmtToSql = (s: string) => {
  if (!s) return null;               // si está vacío, significa “limpiar”
  const v = s.replace("T", " ");
  return v.length === 16 ? v + ":00" : v.slice(0, 19);
};

const saveEdit = async () => {
    if (!editing) return;

    const payload: Record<string, any> = {};
    // Solo incluir si cambió
    if (editing.check_in !== editing.orig.check_in) {
      payload.check_in = fmtToSql(editing.check_in); // puede ser null si usuario la vació
    }
    if (editing.check_out !== editing.orig.check_out) {
      payload.check_out = fmtToSql(editing.check_out);
    }
    if (editing.notes !== editing.orig.notes) {
      payload.notes = editing.notes || null;
    }

    // Si no hay cambios, no pegamos a la API
    if (Object.keys(payload).length === 0) {
      setEditing(null);
      return;
    }

    try {
      setLoading(true);
      await api.patch(`/time-entries/${editing.id}`, payload);
      setEditing(null);
      await load();
    } catch (e: any) {
      console.error(e);
      const msg =
        e?.response?.data?.message ||
        (e?.response?.data?.errors && JSON.stringify(e.response.data.errors)) ||
        "No se pudo guardar la marcación.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Marcaciones</h2>

      {/* Filtros */}
      <div className="grid md:grid-cols-6 gap-2 mb-4">
        <input
          placeholder="Buscar empleado (código/nombre)"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <input
          type="date"
          value={fromInput}
          onChange={(e) => setFromInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <input
          type="date"
          value={toInput}
          onChange={(e) => setToInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <select
          value={statusInput}
          onChange={(e) => setStatusInput(e.target.value)}
          onKeyDown={handleKeyDown}
        >
          <option value="">Todos los estados</option>
          <option value="completo">Completo</option>
          <option value="pendiente_salida">Pendiente de salida</option>
          <option value="anomalia">Anomalía</option>
        </select>

        {/* Botón Buscar → aplica filtros y dispara el load vía useEffect */}
        <button onClick={applyFilters}>Buscar</button>

        {/* Limpiar → borra inputs y filtros aplicados */}
        <button
          onClick={() => {
            setQInput(""); setFromInput(""); setToInput(""); setStatusInput("");
            setQ(""); setFrom(""); setTo(""); setStatus(""); setPage(1);
          }}
        >
          Limpiar
        </button>
      </div>




      {errorMsg && (
        <div className="mb-3 text-sm text-red-700 bg-red-100 rounded p-2">{errorMsg}</div>
      )}

      {/* Tabla */}
      <div className="overflow-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 border">Empleado</th>
              <th className="p-2 border">Fecha</th>
              <th className="p-2 border">Entrada</th>
              <th className="p-2 border">Salida</th>
              <th className="p-2 border">Estado</th>
              <th className="p-2 border">Notas</th>
              <th className="p-2 border">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id}>
                <td className="p-2 border">
                  {r.employee?.code} · {r.employee?.first_name} {r.employee?.last_name}
                </td>
                <td className="p-2 border">{r.work_date}</td>
                <td className="p-2 border">{r.check_in?.slice(11, 16) || "-"}</td>
                <td className="p-2 border">{r.check_out?.slice(11, 16) || "-"}</td>
                <td className="p-2 border">
                  <span
                    className={
                      r.status === "completo"
                        ? "px-2 py-1 rounded bg-green-100 text-green-700"
                        : r.status === "pendiente_salida"
                        ? "px-2 py-1 rounded bg-amber-100 text-amber-700"
                        : "px-2 py-1 rounded bg-red-100 text-red-700"
                    }
                  >
                    {r.status}
                  </span>
                </td>
                <td className="p-2 border">{r.notes || ""}</td>
                <td className="p-2 border">
                  <button onClick={() => openEdit(r)}>Editar</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td className="p-2 border" colSpan={7}>
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center gap-2 mt-3">
        <button disabled={meta.current_page <= 1} onClick={() => setPage((p) => p - 1)}>
          Anterior
        </button>
        <span>
          Página {meta.current_page} de {meta.last_page}
        </span>
        <button
          disabled={meta.current_page >= meta.last_page}
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente
        </button>
      </div>

      {/* Modal edición */}
      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white p-4 rounded w-full max-w-md">
            <h3 className="font-semibold mb-2">Editar marcación</h3>
            <p className="text-xs text-gray-500 mb-3">{editing.summary}</p>

            <label className="block mb-2 text-sm">Entrada</label>
            <input
              type="datetime-local"
              value={editing.check_in}
              onChange={(e) =>
                setEditing((s) => (s ? { ...s, check_in: e.target.value } : s))
              }
            />

            <label className="block mt-3 mb-2 text-sm">Salida</label>
            <input
              type="datetime-local"
              value={editing.check_out}
              onChange={(e) =>
                setEditing((s) => (s ? { ...s, check_out: e.target.value } : s))
              }
            />

            <label className="block mt-3 mb-2 text-sm">Notas</label>
            <textarea
              value={editing.notes}
              onChange={(e) =>
                setEditing((s) => (s ? { ...s, notes: e.target.value } : s))
              }
            />

            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => setEditing(null)}>Cancelar</button>
              <button onClick={saveEdit}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
