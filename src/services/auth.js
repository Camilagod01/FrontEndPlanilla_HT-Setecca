import api from "../api/client";

export const csrf = () => api.get("/sanctum/csrf-cookie"); // Laravel la expone fuera de /api
export const login = async (email, password) => {
  await csrf();
  const res = await api.post("/login", { email, password });
  return res.data; // { user: ... }
};
export const me = () => api.get("/me").then(r => r.data);
export const logout = () => api.post("/logout");
