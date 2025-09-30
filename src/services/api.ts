import axios from "axios";

const api = axios.create({
  // con el proxy de Vite basta usar path relativo
  baseURL: "/api",
  withCredentials: false,
});

// Adjunta el token en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // o desde tu AuthContext si lo prefieres
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
