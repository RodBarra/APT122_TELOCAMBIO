import { createContext, useContext, useMemo, useState } from "react";
import { AuthApi, type LoginResp, type JwtUser } from "../services/auth";

type AuthCtx = {
  user: JwtUser | null;
  access: string | null;
  // ⬇️ ahora login devuelve LoginResp para que el caller pueda redirigir por rol
  login: (correo: string, password: string, codigo?: string) => Promise<LoginResp>;
  logout: () => void;
  loading: boolean;
  booted: boolean;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  access: null,
  login: async () => {
    // Este valor por defecto no se usa porque siempre envolvemos con el provider,
    // pero dejamos una implementación que cumple el tipo.
    throw new Error("AuthContext not mounted");
  },
  logout: () => {},
  loading: false,
  booted: false,
});

function getInitialAuth() {
  const access = localStorage.getItem("tk_access");
  const refresh = localStorage.getItem("tk_refresh");
  const rawUser = localStorage.getItem("tk_user");
  let user: JwtUser | null = null;
  if (rawUser) {
    try {
      user = JSON.parse(rawUser);
    } catch {
      user = null;
    }
  }
  return { access: access || null, refresh: refresh || null, user };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const init = getInitialAuth();

  const [user, setUser] = useState<JwtUser | null>(init.user);
  const [access, setAccess] = useState<string | null>(init.access);
  const [loading, setLoading] = useState(false);

  // Si más adelante haces chequeos iniciales/refresh, aquí puedes cambiar este flag.
  const booted = true;

  const login = async (
    correo: string,
    password: string,
    codigo?: string
  ): Promise<LoginResp> => {
    setLoading(true);
    try {
      const res = await AuthApi.login(correo, password, codigo);
      const data = res.data as LoginResp;
      setAccess(data.access);
      setUser(data.user);
      localStorage.setItem("tk_access", data.access);
      localStorage.setItem("tk_refresh", data.refresh);
      localStorage.setItem("tk_user", JSON.stringify(data.user));
      return data; // ⬅️ devolvemos el payload para que el caller decida la ruta
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setAccess(null);
    localStorage.removeItem("tk_access");
    localStorage.removeItem("tk_refresh");
    localStorage.removeItem("tk_user");
  };

  const value = useMemo(
    () => ({ user, access, login, logout, loading, booted }),
    [user, access, loading, booted]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
