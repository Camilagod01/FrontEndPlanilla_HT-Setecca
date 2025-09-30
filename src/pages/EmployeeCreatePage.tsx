import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

type Errors = Record<string, string[]>;

export default function EmployeeCreatePage() {
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  // Campos: code, first_name, last_name, email, position, hire_date, status
  const [form, setForm] = useState({
    code: "",
    first_name: "",
    last_name: "",
    email: "",
    position: "",
    hire_date: "",
    status: "active",
  });

  const setField = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateClient = () => {
    const errs: Errors = {};
    if (!form.first_name.trim()) errs.first_name = ["El nombre es requerido"];
    if (!form.last_name.trim()) errs.last_name = ["El apellido es requerido"];
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
      nav(`/employees/${emp.id}`);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.errors) setErrors(data.errors as Errors);
      else {
        alert("No se pudo crear el empleado");
        console.error(err);
      }
    } finally {
      setSaving(false);
    }
  };

  const fieldErr = (k: keyof typeof form) => errors[k]?.[0];
  const errId = (k: keyof typeof form) => `err-${k}`;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Agregar empleado</h1>

      <form onSubmit={submit} className="grid gap-4" noValidate>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="grid">
            <label className="mb-1" htmlFor="first_name">Nombre *</label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              className="border p-2 rounded"
              value={form.first_name}
              onChange={setField}
              autoComplete="given-name"
              required
              {...(fieldErr("first_name")
                ? { "aria-invalid": true, "aria-describedby": errId("first_name") }
                : {})}
            />
            {fieldErr("first_name") && (
              <span id={errId("first_name")} className="text-red-600 text-sm" role="alert">
                {fieldErr("first_name")}
              </span>
            )}
          </div>

          <div className="grid">
            <label className="mb-1" htmlFor="last_name">Apellido *</label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              className="border p-2 rounded"
              value={form.last_name}
              onChange={setField}
              autoComplete="family-name"
              required
              {...(fieldErr("last_name")
                ? { "aria-invalid": true, "aria-describedby": errId("last_name") }
                : {})}
            />
            {fieldErr("last_name") && (
              <span id={errId("last_name")} className="text-red-600 text-sm" role="alert">
                {fieldErr("last_name")}
              </span>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="grid">
            <label className="mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="border p-2 rounded"
              value={form.email}
              onChange={setField}
              autoComplete="email"
              {...(fieldErr("email")
                ? { "aria-invalid": true, "aria-describedby": errId("email") }
                : {})}
            />
            {fieldErr("email") && (
              <span id={errId("email")} className="text-red-600 text-sm" role="alert">
                {fieldErr("email")}
              </span>
            )}
          </div>

          <div className="grid">
            <label className="mb-1" htmlFor="position">Puesto</label>
            <input
              id="position"
              name="position"
              type="text"
              className="border p-2 rounded"
              value={form.position}
              onChange={setField}
              autoComplete="organization-title"
              {...(fieldErr("position")
                ? { "aria-invalid": true, "aria-describedby": errId("position") }
                : {})}
            />
            {fieldErr("position") && (
              <span id={errId("position")} className="text-red-600 text-sm" role="alert">
                {fieldErr("position")}
              </span>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="grid">
            <label className="mb-1" htmlFor="hire_date">Fecha de contratación</label>
            <input
              id="hire_date"
              name="hire_date"
              type="date"
              className="border p-2 rounded"
              value={form.hire_date}
              onChange={setField}
              {...(fieldErr("hire_date")
                ? { "aria-invalid": true, "aria-describedby": errId("hire_date") }
                : {})}
            />
            {fieldErr("hire_date") && (
              <span id={errId("hire_date")} className="text-red-600 text-sm" role="alert">
                {fieldErr("hire_date")}
              </span>
            )}
          </div>

          <div className="grid">
            <label className="mb-1" htmlFor="status">Estado</label>
            <select
              id="status"
              name="status"
              className="border p-2 rounded"
              value={form.status}
              onChange={setField}
              {...(fieldErr("status")
                ? { "aria-invalid": true, "aria-describedby": errId("status") }
                : {})}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {fieldErr("status") && (
              <span id={errId("status")} className="text-red-600 text-sm" role="alert">
                {fieldErr("status")}
              </span>
            )}
          </div>

          <div className="grid">
            <label className="mb-1" htmlFor="code">Código (único)</label>
            <input
              id="code"
              name="code"
              type="text"
              className="border p-2 rounded"
              value={form.code}
              onChange={setField}
              placeholder="emp-0001"
              {...(fieldErr("code")
                ? { "aria-invalid": true, "aria-describedby": errId("code") }
                : {})}
            />
            {fieldErr("code") && (
              <span id={errId("code")} className="text-red-600 text-sm" role="alert">
                {fieldErr("code")}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded">
            {saving ? "Guardando…" : "Crear empleado"}
          </button>
          <button type="button" onClick={() => nav(-1)} className="border px-4 py-2 rounded">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
