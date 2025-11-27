import { useEffect, useMemo, useState } from "react";
import {
  getPayrollSettings,
  updatePayrollSettings,
  type PayrollSetting,
} from "@/api/payrollSettings";

const box: React.CSSProperties = { padding: 12, border: "1px solid #eee", borderRadius: 8, background: "#fff" };
const row: React.CSSProperties = { display: "grid", gridTemplateColumns: "220px 260px", gap: 12, alignItems: "center" };

export default function PayrollSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [form, setForm] = useState<PayrollSetting>({
  id: 0,
  workday_hours: 8,
  workday_hours_diurnal: 10,
  workday_hours_nocturnal: 6,
  overtime_threshold: 8,
  base_currency: "CRC",
  fx_mode: "none",
  fx_source: "manual",
  rounding_mode: "none",
});


  const valid = useMemo(() => {
    const wh = Number(form.workday_hours);
    const ot = Number(form.overtime_threshold);

    const fxModes: Array<PayrollSetting["fx_mode"]> = ["none", "manual", "daily", "auto"];
    const roundingModes: Array<PayrollSetting["rounding_mode"]> = [
      "none",
      "half_up",
      "down",
      "up",
    ];

    return (
      !Number.isNaN(wh) &&
      wh >= 1 &&
      wh <= 24 &&
      !Number.isNaN(ot) &&
      ot >= 1 &&
      ot <= 24 &&
      (form.base_currency === "CRC" || form.base_currency === "USD") &&
      fxModes.includes(form.fx_mode) &&
      roundingModes.includes(form.rounding_mode)
    );
  }, [form]);
  



  async function load() {
    setLoading(true);
    setErrorMsg(null);
    setOkMsg(null);
    try {
      const s = await getPayrollSettings();
      setForm(s);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message ?? "Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);



  async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setSaving(true);
  setErrorMsg(null);
  setOkMsg(null);

  try {
    const updated = await updatePayrollSettings({
      workday_hours: Number(form.workday_hours),

      // 🔹 Enviamos las horas diurna / nocturna tal cual vengan (o null)
      workday_hours_diurnal:
        form.workday_hours_diurnal != null
          ? Number(form.workday_hours_diurnal)
          : null,

      workday_hours_nocturnal:
        form.workday_hours_nocturnal != null
          ? Number(form.workday_hours_nocturnal)
          : null,

      overtime_threshold: Number(form.overtime_threshold),
      base_currency: form.base_currency,
      fx_mode: form.fx_mode,
      fx_source: form.fx_source,
      rounding_mode: form.rounding_mode,
    });

    setForm(updated);
    setOkMsg("Guardado");
  } catch (e: any) {
    setErrorMsg(e?.response?.data?.message ?? "No se pudo guardar");
  } finally {
    setSaving(false);
  }
}





  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Parámetros de Planilla</h2>

      {loading ? (
        <div>Cargando…</div>
      ) : (
        <section style={{ ...box, maxWidth: 720 }}>
          {errorMsg && <div style={{ color: "crimson", marginBottom: 8 }}>{errorMsg}</div>}
          {okMsg && <div style={{ color: "seagreen", marginBottom: 8 }}>{okMsg}</div>}

          <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
            


          <div style={row}>
  <label>Horas laborales — jornada diurna</label>
  <input
    type="number"
    step={0.25}
    min={1}
    max={24}
    value={form.workday_hours_diurnal ?? ""}
    onChange={(e) =>
      setForm((f) => ({ ...f, workday_hours_diurnal: Number(e.target.value) }))
    }
  />
</div>

<div style={row}>
  <label>Horas laborales — jornada nocturna</label>
  <input
    type="number"
    step={0.25}
    min={1}
    max={24}
    value={form.workday_hours_nocturnal ?? ""}
    onChange={(e) =>
      setForm((f) => ({ ...f, workday_hours_nocturnal: Number(e.target.value) }))
    }
  />
</div>



            <div style={row}>
              <label>Umbral de horas extra por día</label>
              <input
                type="number"
                step={0.25}
                min={1}
                max={24}
                value={form.overtime_threshold}
                onChange={(e) => setForm((f) => ({ ...f, overtime_threshold: Number(e.target.value) }))}
              />
            </div>

            <div style={row}>
              <label>Moneda base</label>
              <select
                value={form.base_currency}
                onChange={(e) => setForm((f) => ({ ...f, base_currency: e.target.value as PayrollSetting["base_currency"] }))}
              >
                <option value="CRC">CRC</option>
                <option value="USD">USD</option>
              </select>
            </div>

            <div style={row}>
              <label>Modo de tipo de cambio</label>
              <select
                value={form.fx_mode}
                onChange={(e) => setForm((f) => ({ ...f, fx_mode: e.target.value as PayrollSetting["fx_mode"] }))}
              >
                <option value="none">none</option>
                <option value="manual">manual</option>
                <option value="daily">daily</option>
              </select>
            </div>

            <div style={row}>
              <label>Fuente de tipo de cambio</label>
              <input
                type="text"
                value={form.fx_source}
                onChange={(e) => setForm((f) => ({ ...f, fx_source: e.target.value }))}
                placeholder="BCCR"
              />
            </div>

            <div style={row}>
              <label>Modo de redondeo</label>
              <select
                value={form.rounding_mode}
                onChange={(e) => setForm((f) => ({ ...f, rounding_mode: e.target.value as PayrollSetting["rounding_mode"] }))}
              >
                <option value="none">none</option>
                <option value="half_up">half_up</option>
                <option value="down">down</option>
                <option value="up">up</option>
              </select>
            </div>

           
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
  <button type="submit" disabled={saving}>
    {saving ? "Guardando…" : "Guardar"}
  </button>
  <button type="button" onClick={load} disabled={saving}>
    Recargar
  </button>
</div>




          </form>
        </section>
      )}
    </div>
  );
}
