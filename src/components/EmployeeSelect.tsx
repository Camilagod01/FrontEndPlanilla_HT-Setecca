import { useEffect, useMemo, useState } from "react";
import { http } from "@/api/https";

type Employee = {
  id: number;
  code?: string;
  first_name?: string;
  last_name?: string;
};

type Props = {
  value?: number;
  onChange: (employeeId?: number) => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function EmployeeSelect({ value, onChange, placeholder = "Seleccione empleado...", disabled }: Props) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  const selected = useMemo(() => items.find((e) => e.id === value), [items, value]);

  const fetchEmployees = async (search?: string) => {
    try {
      setLoading(true);
      // Si lo necesita la API: ajusta los nombres de query (q, search, code, etc.)
      const res = await http.get<Employee[]>("/employees/options", {
  params: { q: search ?? "", per_page: 20 },
});


      const data = Array.isArray(res.data) ? res.data : (res.data as any).data ?? [];
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees("");
  }, []);

  // Buscar con Enter
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      fetchEmployees(q.trim());
    }
  };

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Buscar por nombre o código"
          disabled={disabled}
          style={{ flex: 1 }}
        />
        <button type="button" onClick={() => fetchEmployees(q.trim())} disabled={disabled || loading}>
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </div>

      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        disabled={disabled || loading}
      >
        <option value="">{placeholder}</option>
        {items.map((e) => (
          <option key={e.id} value={e.id}>
            {e.code ? `${e.code} — ` : ""}{(e.first_name ?? "").trim()} {(e.last_name ?? "").trim()} (#{e.id})
          </option>
        ))}
      </select>

      {selected && (
        <small>
          Seleccionado: {(selected.first_name ?? "").trim()} {(selected.last_name ?? "").trim()} (#{selected.id})
        </small>
      )}
    </div>
  );
}
