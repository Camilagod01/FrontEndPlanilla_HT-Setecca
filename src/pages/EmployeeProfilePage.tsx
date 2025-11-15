//import { useEffect, useState } from "react";
//import { useParams } from "react-router-dom";
import { getEmployee } from "@/api"; // tu src/api/index.ts
import EmployeeGarnishments from "@/components/EmployeeGarnishments";
import React, { useEffect, useState } from "react"; // o añade useState a tu import existente
import { Link, useParams } from "react-router-dom";
import { exportStatementPDF, exportStatementXLSX } from "@/api"; // asegúrate del path




type Employee = {
  id: number;
  code: string;
  first_name: string;
  last_name: string;
  email: string;
  position_id: number | null;
  position_name?: string | null;
  status: "active" | "inactive";
  garnish_cap_rate?: number | null;
};

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [emp, setEmp] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [tab, setTab] = useState<"perfil"|"embargos"|"horas"|"estado">("perfil");
  


  useEffect(() => {
    let mounted = true;
    async function load() {
      setErr("");
      setLoading(true);
      try {
        const data = await getEmployee(Number(id));
        if (mounted) setEmp(data);
      } catch (e: any) {
        if (mounted) setErr("No se pudo cargar el empleado");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (id) load();
    return () => {
      mounted = false;
    };
  }, [id]);


  
  if (loading) return <div style={{ padding: 16 }}>Cargando…</div>;
  if (err) return <div style={{ padding: 16, color: "crimson" }}>{err}</div>;
  if (!emp) return <div style={{ padding: 16 }}>Sin datos</div>;


 // --- NUEVO: estado local para la pestaña activa ---
  
  return (
    <div style={{ padding: 16 }}>
      <h1>Empleado #{emp.id} — {emp.first_name} {emp.last_name}</h1>

      {/* barra de tabs tipo botones */}
      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <button
          onClick={() => setTab("perfil")}
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: tab==="perfil"?"#eef":"#fff" }}>
          Perfil
        </button>
        <button
          onClick={() => setTab("embargos")}
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: tab==="embargos"?"#eef":"#fff" }}>
          Embargos
        </button>
        <button
          onClick={() => setTab("horas")}
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: tab==="horas"?"#eef":"#fff" }}>
          Horas
        </button>
        <button
          onClick={() => setTab("estado")}
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: tab==="estado"?"#eef":"#fff" }}>
          Estado de cuenta
        </button>




      </div>

      {/* CONTENIDO por pestaña */}
      {tab === "perfil" && (
        <div style={{ marginTop: 12 }}>
          <p><b>Código:</b> {emp.code}</p>
          <p><b>Email:</b> {emp.email}</p>
          <p><b>Estado:</b> {emp.status}</p>
          <p><b>Puesto:</b> {emp.position_name ?? "(sin puesto)"}</p>
          <p><b>Tope de embargos:</b> {emp.garnish_cap_rate ?? "—"}</p>
        </div>
      )}

      {tab === "embargos" && (
        <div style={{ marginTop: 12 }}>
          <EmployeeGarnishments employeeId={emp.id} />
          <div id="embargos-slot">Cargando embargos…</div>
        </div>
      )}

      {tab === "horas" && (
        <div style={{ marginTop: 12 }}>
          (Pendiente: métrica de horas)
        </div>
      )}

     {tab === "estado" && (
  <div style={{ paddingTop: 16 }}>
    <Link
      to={`/employees/${emp.id}/statement`}
      className="px-3 py-2 rounded bg-indigo-600 text-white"
    >
      Ver estado de cuenta detallado
    </Link>
  </div>
)}
    </div>
  );



async function onExport(type: "pdf" | "excel") {
  if (!emp?.id) return;
  try {
    const blob =
      type === "pdf"
? await exportStatementPDF(emp.id)
: await exportStatementXLSX(emp.id);


    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const suf = type === "pdf" ? "pdf" : "xlsx";
    a.download = `estado_${emp.code || emp.id}.${suf}`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (e) {
    console.error("Export error", e);
    alert("No se pudo exportar el estado.");
  }
}

  
}
