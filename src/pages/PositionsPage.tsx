import { useEffect, useState } from "react";
import type { Position, SalaryType, Currency } from "../types";
import {
  listPositions,
  createPosition,
  updatePosition,
  deletePosition,
} from "../lib/api";

export default function PositionsPage() {
  const [rows, setRows] = useState<Position[]>([]);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<"" | "1" | "0">("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1 });
  const [loading, setLoading] = useState(false);

  const fetchData = async (p = page) => {
    setLoading(true);
    try {
      const { data, meta } = await listPositions({
        search: search || undefined,
        active: active === "" ? undefined : active === "1",
        page: p,
        per_page: 20,
      });
      setRows(data);
      setMeta(meta);
      setPage(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------- modal state --------
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [form, setForm] = useState<{
    code: string;
    name: string;
    salary_type: SalaryType;
    default_salary_amount: number | "";
    default_salary_currency: Currency;
    is_active?: boolean;
  }>({
    code: "",
    name: "",
    salary_type: "hourly",
    default_salary_amount: "",
    default_salary_currency: "CRC",
    is_active: true,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      code: "",
      name: "",
      salary_type: "hourly",
      default_salary_amount: "",
      default_salary_currency: "CRC",
      is_active: true,
    });
    setOpen(true);
  };

  const openEdit = (p: Position) => {
    setEditing(p);
    setForm({
      code: p.code ?? "",
      name: p.name ?? "",
      salary_type: (p.salary_type ??
        (p.base_hourly_rate != null ? "hourly" : "monthly")) as SalaryType,
      default_salary_amount: (p.default_salary_amount ??
        p.base_hourly_rate ??
        "") as any,
      default_salary_currency: (p.default_salary_currency ??
        p.currency ??
        "CRC") as Currency,
      is_active: p.is_active ?? true,
    });
    setOpen(true);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "default_salary_amount"
          ? (value === "" ? "" : Number(value))
          : value,
    }) as any);
  };

  const canSubmit =
    form.code.trim() &&
    form.name.trim() &&
    form.salary_type &&
    form.default_salary_currency;

  const onSubmit = async () => {
    const payload: any = {
      code: form.code.trim(),
      name: form.name.trim(),
      salary_type: form.salary_type,
      default_salary_amount:
        form.default_salary_amount === "" ? null : Number(form.default_salary_amount),
      default_salary_currency: form.default_salary_currency,
      is_active: form.is_active,
    };

    // compat legacy si quisieras rellenar base_hourly_rate
    if (payload.salary_type === "hourly" && payload.default_salary_amount == null) {
      payload.base_hourly_rate = 0;
      payload.currency = payload.default_salary_currency;
    }

    if (editing) {
      await updatePosition(editing.id, payload);
    } else {
      await createPosition(payload);
    }
    setOpen(false);
    fetchData(page);
  };

  const onDelete = async (p: Position) => {
    if (!confirm(`¿Eliminar/desactivar puesto "${p.name}"?`)) return;
    await deletePosition(p.id);
    fetchData(page);
  };

  const fmtMoney = (n: number, c: Currency) =>
    `${c === "USD" ? "$" : "₡"}${Number(n).toLocaleString()} ${c}`;

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-3">Puestos</h1>

      <div className="flex items-end gap-2 mb-3">
        <label className="grid">
          <span className="text-sm">Buscar</span>
          <input
            className="border p-2 rounded"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Código o nombre"
          />
        </label>
        <label className="grid">
          <span className="text-sm">Activo</span>
          <select
            className="border p-2 rounded"
            value={active}
            onChange={(e) => setActive(e.target.value as any)}
          >
            <option value="">Todos</option>
            <option value="1">Activos</option>
            <option value="0">Inactivos</option>
          </select>
        </label>
        
        <button
  className="px-3 py-2 bg-blue-600 text-gray-800 rounded hover:bg-blue-700 disabled:opacity-60"
  onClick={() => fetchData(1)}
  disabled={loading}
>
  {loading ? "Buscando…" : "Filtrar"}
</button>


        <div className="flex-1" />
        <button className="px-3 py-2 border rounded" onClick={openCreate}>
          + Nuevo puesto
        </button>
      </div>

      <div className="overflow-auto border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-2">Código</th>
              <th className="text-left p-2">Nombre</th>
              <th className="text-left p-2">Tipo</th>
              <th className="text-left p-2">Salario base</th>
              <th className="text-left p-2">Estado</th>
              <th className="text-left p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const type = r.salary_type ?? (r.base_hourly_rate != null ? "hourly" : "monthly");
              const amount = (r.default_salary_amount ?? r.base_hourly_rate ?? 0) as number;
              const curr = (r.default_salary_currency ?? r.currency ?? "CRC") as Currency;
              return (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.code}</td>
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{type === "hourly" ? "Por hora" : "Mensual"}</td>
                  <td className="p-2">{amount ? fmtMoney(amount, curr) : "—"}</td>
                  <td className="p-2">{(r.is_active ?? true) ? "Activo" : "Inactivo"}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <button className="px-2 py-1 border rounded" onClick={() => openEdit(r)}>
                        Editar
                      </button>
                      <button className="px-2 py-1 border rounded" onClick={() => onDelete(r)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td className="p-3" colSpan={6}>
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <button
          disabled={meta.current_page <= 1}
          onClick={() => fetchData(meta.current_page - 1)}
          className="px-3 py-1 border rounded"
        >
          «
        </button>
        <div>
          Página {meta.current_page} / {meta.last_page}
        </div>
        <button
          disabled={meta.current_page >= meta.last_page}
          onClick={() => fetchData(meta.current_page + 1)}
          className="px-3 py-1 border rounded"
        >
          »
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center">
          <div className="bg-white rounded p-4 w-[520px] max-w-[95vw]">
            <h3 className="text-lg font-semibold mb-3">
              {editing ? "Editar puesto" : "Nuevo puesto"}
            </h3>

            <div className="grid gap-2">
              <label className="grid">
                <span className="text-sm">Código</span>
                <input
                  className="border p-2 rounded"
                  name="code"
                  value={form.code}
                  onChange={onChange}
                />
              </label>

              <label className="grid">
                <span className="text-sm">Nombre</span>
                <input
                  className="border p-2 rounded"
                  name="name"
                  value={form.name}
                  onChange={onChange}
                />
              </label>

              <label className="grid">
                <span className="text-sm">Tipo de salario</span>
                <select
                  className="border p-2 rounded"
                  name="salary_type"
                  value={form.salary_type}
                  onChange={onChange}
                >
                  <option value="hourly">Por hora</option>
                  <option value="monthly">Mensual</option>
                </select>
              </label>

              <div className="flex items-end gap-2">
                <label className="grid flex-1">
                  <span className="text-sm">Monto base</span>
                  <input
                    className="border p-2 rounded"
                    name="default_salary_amount"
                    value={form.default_salary_amount}
                    onChange={onChange}
                    placeholder={
                      form.salary_type === "hourly"
                        ? "Tarifa por hora"
                        : "Salario mensual"
                    }
                  />
                </label>
                <label className="grid">
                  <span className="text-sm">Moneda</span>
                  <select
                    className="border p-2 rounded"
                    name="default_salary_currency"
                    value={form.default_salary_currency}
                    onChange={onChange}
                  >
                    <option value="CRC">CRC</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
              </div>

              <label className="inline-flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  checked={form.is_active ?? true}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                />
                <span>Activo</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button className="px-3 py-2 border rounded" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button
                className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                onClick={onSubmit}
                disabled={!canSubmit}
              >
                {editing ? "Guardar cambios" : "Crear puesto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
