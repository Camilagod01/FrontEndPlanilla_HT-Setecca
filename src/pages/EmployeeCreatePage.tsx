import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Suspense } from "react";
import ImportEmployeesModal from "@/components/ImportEmployeesModal";

type Errors = Record<string, string[]>;

type Position = {
  id: number;
  code: string;
  name: string;
  base_hourly_rate: number | string;
  currency: string;
};

export default function EmployeeCreatePage() {
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [openImport, setOpenImport] = useState(false);

  // Campos: code, first_name, last_name, email, position, hire_date, status
  const [form, setForm] = useState({
    code: "",
    first_name: "",
    last_name: "",
    email: "",
    position: "",
    hire_date: "",
    status: "active",
    position_id: undefined as number | undefined,
    work_shift: "diurna",
  });

    // Lista de puestos
  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(true);


  // justo después de los useState, antes del return
const handleChange = (e: any) => {
  const { name, value } = e.target;
  setForm((prev: any) => ({
    ...prev,
    [name]: value,
  }));
};





  const setField = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "position_id") {
      setForm((prev) => ({ ...prev, position_id: value ? Number(value) : undefined }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };
  // Validación mínima cliente
  const validateClient = () => {
    const errs: Errors = {};
    if (!form.first_name.trim()) errs.first_name = ["El nombre es requerido"];
    if (!form.last_name.trim()) errs.last_name = ["El apellido es requerido"];
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) errs.email = ["Correo inválido"];
    if (form.hire_date && new Date(form.hire_date) > new Date()) errs.hire_date = ["La fecha no puede ser futura"];
    if (!form.position_id) errs.position_id = ["Selecciona un puesto"];
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

   // Cargar puestos
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/positions");
        const list = Array.isArray(data) ? data : data?.data ?? [];
        if (mounted) setPositions(list);
      } catch (e) {
        console.error("No se pudieron cargar los puestos", e);
      } finally {
        if (mounted) setLoadingPositions(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  //Enviar

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
        position_id: form.position_id, 
        work_shift: form.work_shift,

      };
      
      const res = await api.post("/employees", payload);

// El backend devuelve { data: { ...empleado... } }
const raw = res.data as any;
const emp = raw.data ?? raw;

if (!emp?.id) {
  alert("Empleado creado, pero no se pudo obtener el ID para redirigir.");
  return;
}

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
            <span className="mb-1 font-medium">Puesto *</span>

            {loadingPositions && <p className="text-sm text-gray-600">Cargando puestos…</p>}

            {!loadingPositions && positions.length === 0 && (
              <p className="text-sm text-gray-600">No hay puestos. Crea algunos primero.</p>
            )}

            

            {!loadingPositions && positions.length > 0 && (
  <select
    name="position_id"
    className="border rounded p-2 w-full"
    value={form.position_id ?? ""}
    onChange={setField}
    required
    {...(fieldErr("position_id")
      ? { "aria-invalid": true, "aria-describedby": errId("position_id") }
      : {})}
  >
    <option value="">Selecciona un puesto…</option>
    {positions.map((p) => (
      <option key={p.id} value={p.id}>
        {p.name}
      </option>
    ))}
  </select>
)}





            {fieldErr("position_id") && (
              <span id={errId("position_id")} className="text-red-600 text-sm" role="alert">
                {fieldErr("position_id")}
              </span>
            )}
          </div>
        </div>




            <div className="flex flex-col">
  <label className="text-sm font-medium text-gray-700">
    Jornada
  </label>
  <select
    name="work_shift"
    value={form.work_shift}
    onChange={(e) =>
  setForm((prev) => ({
    ...prev,
    work_shift: e.target.value,
  }))
}

    className="mt-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
  >
    <option value="diurna">Diurna</option>
    <option value="nocturna">Nocturna</option>
    <option value="mixta">Mixta</option>
  </select>
  <p className="text-xs text-gray-500 mt-1">
    Se usa para calcular las horas estándar mensuales (diurna/nocturna).
  </p>
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

        {openImport && <ImportEmployeesModal onClose={() => setOpenImport(false)} />}

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="inline-flex items-center justify-center rounded-lg bg-indigo-600 text-gray-800 px-4 py-2 font-semibold hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "Guardando…" : "Crear empleado"}
          </button>
          <button
            type="button"
            className="border rounded px-3 py-2"
            onClick={() => setOpenImport(true)}
          >
            Importar empleados (CSV)
          </button>
          <button type="button" onClick={() => nav(-1)} className="border px-4 py-2 rounded">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
