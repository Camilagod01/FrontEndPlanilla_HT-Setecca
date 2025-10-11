import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import SickBadge from "@/components/SickBadge";
import {
  listSickLeaves,
  createSickLeave,
  updateSickLeave,
  deleteSickLeave,
  SickLeave,
  SickType,
} from "@/services/sickLeaves";

type Props = {
  employeeId: number;
};

type FormState = {
  id?: number;
  start_date: string;
  end_date: string;
  type: SickType;
  notes?: string;
};

function toISO(d: string | Date) {
  return dayjs(d).format("YYYY-MM-DD");
}

export default function SickLeavesTab({ employeeId }: Props) {
  const [items, setItems] = useState<SickLeave[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>({
    start_date: toISO(new Date()),
    end_date: toISO(new Date()),
    type: "50pct",
    notes: "",
  });

  const dateRange = useMemo(() => {
    const start = dayjs().startOf("month").format("YYYY-MM-DD");
    const end = dayjs().endOf("month").format("YYYY-MM-DD");
    return { start, end };
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      setErr(null);
      const res = await listSickLeaves({
        employee_id: employeeId,
        from: dateRange.start,
        to: dateRange.end,
        per_page: 100,
      });
      // si viene paginado, res.data; si no, res tal cual
      const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setItems(rows);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "No se pudieron cargar las incapacidades.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  function openCreate() {
    setForm({
      start_date: toISO(new Date()),
      end_date: toISO(new Date()),
      type: "50pct",
      notes: "",
    });
    setOpen(true);
  }

  function openEdit(row: SickLeave) {
    setForm({
      id: row.id,
      start_date: toISO(row.start_date),
      end_date: toISO(row.end_date),
      type: row.type,
      notes: row.notes || "",
    });
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      employee_id: employeeId,
      start_date: form.start_date,
      end_date: form.end_date,
      type: form.type,
      notes: form.notes,
    };

    try {
      setLoading(true);
      setErr(null);
      if (form.id) {
        await updateSickLeave(form.id, {
          start_date: form.start_date,
          end_date: form.end_date,
          type: form.type,
          notes: form.notes,
        });
      } else {
        await createSickLeave(payload);
      }
      setOpen(false);
      await fetchData();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "No se pudo guardar la incapacidad.");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: number) {
    if (!confirm("¿Eliminar esta incapacidad?")) return;
    try {
      setLoading(true);
      await deleteSickLeave(id);
      await fetchData();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "No se pudo eliminar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Incapacidades</h3>
        <button
          onClick={openCreate}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700"
        >
          Nueva
        </button>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="overflow-x-auto border rounded-xl bg-white/70">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Rango</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Notas</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                  Cargando…
                </td>
              </tr>
            )}

            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                  Sin registros en el mes.
                </td>
              </tr>
            )}

            {!loading &&
              items.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">
                    {dayjs(row.start_date).format("DD/MM/YYYY")} —{" "}
                    {dayjs(row.end_date).format("DD/MM/YYYY")}
                  </td>
                  <td className="px-3 py-2">
                    <SickBadge type={row.type} />
                  </td>
                  <td className="px-3 py-2 text-gray-700">{row.notes || "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => openEdit(row)}
                        className="px-2 py-1 rounded border text-xs hover:bg-gray-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onDelete(row.id)}
                        className="px-2 py-1 rounded border text-xs text-red-700 border-red-200 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Modal simple */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">
                {form.id ? "Editar incapacidad" : "Nueva incapacidad"}
              </h4>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={onSubmit} className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Desde</label>
                  <input
                    type="date"
                    className="w-full rounded border px-2 py-1.5"
                    value={form.start_date}
                    onChange={(e) => setForm((s) => ({ ...s, start_date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Hasta</label>
                  <input
                    type="date"
                    className="w-full rounded border px-2 py-1.5"
                    value={form.end_date}
                    onChange={(e) => setForm((s) => ({ ...s, end_date: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Tipo</label>
                <select
                  className="w-full rounded border px-2 py-1.5"
                  value={form.type}
                  onChange={(e) => setForm((s) => ({ ...s, type: e.target.value as SickType }))}
                  required
                >
                  <option value="50pct">50%</option>
                  <option value="0pct">0%</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Notas</label>
                <textarea
                  className="w-full rounded border px-2 py-1.5"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                  placeholder="Detalle (opcional)…"
                />
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 rounded border text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
