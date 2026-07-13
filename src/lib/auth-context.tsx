import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSession, loginUser, logoutUser, registerUser } from "./store";
import type { User } from "./types";

interface AuthCtx {
  user: User | null;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUser(getSession());
    setHydrated(true);
    const onStorage = () => setUser(getSession());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        hydrated,
        login: async (email, password) => {
          const u = await loginUser(email, password);
          setUser(u);
        },
        register: async (name, email, password) => {
          const u = await registerUser(name, email, password);
          setUser(u);
        },
        logout: () => {
          logoutUser();
          setUser(null);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
