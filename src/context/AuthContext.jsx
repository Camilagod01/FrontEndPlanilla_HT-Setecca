import { createContext, useEffect, useMemo, useState } from "react";
import api from "../services/api"; // nuestro cliente Axios

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Al montar, si hay token intenta cargar /me
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setReady(true);
      return;
    }
    api
      .get("/me")
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  async function signIn(email, password) {
    const { data } = await api.post("/login", { email, password });
    // backend devuelve { user, token }
    if (data?.token) localStorage.setItem("token", data.token);
    setUser(data?.user ?? null);
    return true;
  }

  function signOut() {
    localStorage.removeItem("token");
    setUser(null);
    // llamamos /logout pero no bloqueamos si falla
    return api.post("/logout").catch(() => {});
  }

  const value = useMemo(
    () => ({
      user,
      ready,
      isAuthenticated: !!user,
      signIn,
      signOut,
    }),
    [user, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
