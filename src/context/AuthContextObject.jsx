import { createContext, useEffect, useState } from "react";
import api from "../lib/api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    api.get("/me")
      .then(({ data }) => setUser(data))
      .catch(() => {
        // token inválido → limpiar
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (email, password) => {
    const { data } = await api.post("/login", { email, password });
    // data = { user: {...}, token: "3|...." }
    localStorage.setItem("token", data.token);
    setUser(data.user);
    return data.user;
  };

  const signOut = async () => {
    try {
      await api.post("/logout"); // invalida el token en backend
    } catch {
      // si falla por token inválido, igual limpiamos local
    } finally {
      localStorage.removeItem("token");
      setUser(null);
    }
  };

  const value = { user, loading, signIn, signOut, setUser };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
