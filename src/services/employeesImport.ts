import api from "@/lib/api";

export type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  invalid_rows: number;
  errors_csv_url?: string;
};

export async function importEmployees(
  file: File,
  opts: { dryRun: boolean; delimiter: "," | ";" }
): Promise<ImportResult> {
  const fd = new FormData();
  fd.append("file", file);
  // El backend valida boolean estrictamente: usa 'true'/'false' en snake_case
  fd.append("dry_run", opts.dryRun ? "true" : "false");
  fd.append("delimiter", opts.delimiter);

  const { data } = await api.post<ImportResult>("/employees/import", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function downloadEmployeesTemplate() {
  const blob = new Blob(
    [
      "employee_code,first_name,last_name,email,position_code\n",
      "emp-0001,Nombre,Apellido,correo@example.com,POS-001\n",
    ],
    { type: "text/csv;charset=utf-8" }
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "empleados_template.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}
