// src/lib/fmtDate.ts

export const fmtDate = (d?: string | null) => {
  if (!d) return "-";
  const x = new Date(d);
  if (isNaN(x.getTime())) {
    // fallback: si viene algo raro, recortamos YYYY-MM-DD
    return String(d).slice(0, 10);
  }
  return x.toLocaleDateString("es-CR"); // dd/mm/yyyy
  //return x.toLocaleDateString("es-CR"); // dd/mm/aaaa
};
