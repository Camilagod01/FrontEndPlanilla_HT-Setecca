import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

type Errors = Record<string, string[]>;

export default function EmployeeCreatePage() {
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  // Campos válidos según tu tabla: employees (code, first_name, last_name, email, position, hire_date, status)
  const [form, setForm] = useState({
    code: "",
    first_name: "",
    last_name: "",
    email: "",
    position: "",
    hire_date: "",        // <-- en tu DB se llama hire_date
    status: "active",     // <-- enum: active | inactive
  });

  const setField = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateClient = () => {
    const errs: Errors = {};
    if (!form.first_name.trim()) errs.first_name = ["El nombre es requerido"];
    if (!form.last_name.trim())  errs.last_name  = ["El apellido es requerido"];
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) errs.email = ["Correo inválido"];
    if (form.hire_date && new Date(form.hire_date) > new Date()) errs.hire_date = ["La fecha no puede ser futura"];
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateClient()) return;

    try {
      setSaving(true);
      setErrors({});
      // Enviamos SOLO campos válidos para tu tabla:
      const payload = {
        code: form.code || undefined,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email || undefined,
        position: form.position || undefined,
        hire_date: form.hire_date || undefined,
        status: form.status || "active",
      };
      const res = await api.post("/employees", payload);
      const emp = res.data;
      // Redirige al perfil
      nav(`/employees/${emp.id}`);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.errors) {
        setErrors(data.errors as Errors);
      } else {
        alert("No se pudo crear el empleado");
        console.error(err);
      }
    } finally {
      setSaving(false);
    }
  };

  const fieldErr = (k: keyof typeof form) => errors[k]?.[0];

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Agregar empleado</h1>

      <form onSubmit={submit} className="grid gap-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="grid">
            <label className="mb-1">Nombre *</label>
            <input name="first_name" className="border p-2 rounded" value={form.first_name} onChange={setField} />
            {fieldErr("first_name") && <span className="text-red-600 text-sm">{fieldErr("first_name")}</span>}
          </div>
          <div className="grid">
            <label className="mb-1">Apellido *</label>
            <input name="last_name" className="border p-2 rounded" value={form.last_name} onChange={setField} />
            {fieldErr("last_name") && <span className="text-red-600 text-sm">{fieldErr("last_name")}</span>}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="grid">
            <label className="mb-1">Email</label>
            <input name="email" className="border p-2 rounded" value={form.email} onChange={setField} />
            {fieldErr("email") && <span className="text-red-600 text-sm">{fieldErr("email")}</span>}
          </div>
          <div className="grid">
            <label className="mb-1">Puesto</label>
            <input name="position" className="border p-2 rounded" value={form.position} onChange={setField} />
            {fieldErr("position") && <span className="text-red-600 text-sm">{fieldErr("position")}</span>}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="grid">
            <label className="mb-1">Fecha de contratación</label>
            <input type="date" name="hire_date" className="border p-2 rounded" value={form.hire_date} onChange={setField} />
            {fieldErr("hire_date") && <span className="text-red-600 text-sm">{fieldErr("hire_date")}</span>}
          </div>

          <div className="grid">
            <label className="mb-1">Estado</label>
            <select name="status" className="border p-2 rounded" value={form.status} onChange={setField}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {fieldErr("status") && <span className="text-red-600 text-sm">{fieldErr("status")}</span>}
          </div>

          <div className="grid">
            <label className="mb-1">Código (único)</label>
            <input name="code" className="border p-2 rounded" value={form.code} onChange={setField} placeholder="EMP-001" />
            {fieldErr("code") && <span className="text-red-600 text-sm">{fieldErr("code")}</span>}
          </div>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded">
            {saving ? "Guardando…" : "Crear empleado"}
          </button>
          <button type="button" onClick={() => nav(-1)} className="border px-4 py-2 rounded">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
