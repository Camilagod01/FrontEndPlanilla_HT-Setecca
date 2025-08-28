import { useEffect, useState } from "react";
import { me, login as loginSvc, logout as logoutSvc } from "../services/auth";
import { AuthContext } from "./AuthContextObject";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const u = await me();
        setUser(u);
      } catch {
        // sin sesión: continuar
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (email, password) => {
    const data = await loginSvc(email, password);
    setUser(data.user);
  };

  const signOut = async () => {
    await logoutSvc();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
