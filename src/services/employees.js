import api from "../api/client";
export const listEmployees = (page=1) =>
  api.get(`/employees?page=${page}`).then(r => r.data);
