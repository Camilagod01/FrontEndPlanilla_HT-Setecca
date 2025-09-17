
import api from "../lib/api";

export const listEmployees = (arg = 1) => {
  const isNumber = typeof arg === "number";
  const page     = isNumber ? arg : (arg.page ?? 1);
  const search   = isNumber ? ""  : (arg.search ?? "");
  const perPage  = isNumber ? 10  : (arg.perPage ?? 10);

  return api
    .get("/employees", { params: { page, search, per_page: perPage } })
    .then((r) => r.data);
};
