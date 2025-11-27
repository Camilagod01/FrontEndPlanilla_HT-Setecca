import { http } from "@/api/https";

export interface AguinaldoEmployee {
  id: number;
  code: string;
  full_name: string;
}

export interface AguinaldoPeriod {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

export interface AguinaldoItem {
  employee: AguinaldoEmployee;
  period: AguinaldoPeriod;
  base_total: number;
  aguinaldo: number;
  currency: string;
}

export interface AguinaldoIndexResponse {
  as_of: string;
  items: AguinaldoItem[];
}

/**
 * GET /api/aguinaldo
 * Opcional: asOf en formato YYYY-MM-DD
 */
export async function getAguinaldo(asOf?: string): Promise<AguinaldoIndexResponse> {
  const res = await http.get('/aguinaldo', {
    params: asOf ? { as_of: asOf } : {},
  });
  return res.data;
}


export async function getEmployeeAguinaldoByCode(
  code: string,
  asOf?: string
): Promise<AguinaldoItem> {
  const res = await http.get(`/aguinaldo/by-code/${code}`, {
    params: asOf ? { as_of: asOf } : {},
  });
  return res.data;
}

