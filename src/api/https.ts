// Configura baseURL y fuerza Authorization en cada request
import axios from "axios";




const baseURL =
  (import.meta.env.VITE_API_BASE_URL?.trim() as string | undefined) ||
  "http://127.0.0.1:8000/api";

export const http = axios.create({
  baseURL,
  // Si lo necesita la API
  withCredentials: false,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// Inyecta Bearer desde localStorage en TODAS las solicitudes
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token"); // Debe existir
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Log mínimo para depurar desde consola del navegador
  if (import.meta.env.DEV) {
    // @ts-expect-error solo para depuración
    config.__dbg = { baseURL: config.baseURL, url: config.url, hasAuth: !!token };
  }
  return config;
});

// Reintenta detectar 401 y mostrar pista clara
http.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401) {
      console.warn("401 Unauthenticated — Revisa que el token esté en localStorage como 'auth_token' y que sea válido.");
    }
    return Promise.reject(error);
  }
);

// Utilidad rápida para verificar en consola
export async function __pingAuth() {
  // Endpoint público simple; cambiar si tienes otro
  // Si lo necesita la API, usa algún endpoint protegido corto, por ejemplo /advances
  try {
    const res = await http.get("/advances", { params: { per_page: 1 } });
    return { ok: true, status: res.status };
  } catch (e: any) {
    return {
      ok: false,
      status: e?.response?.status,
      data: e?.response?.data,
    };
  }
}
