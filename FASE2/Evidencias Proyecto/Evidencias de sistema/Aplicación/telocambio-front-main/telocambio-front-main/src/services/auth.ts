import { http } from "../lib/http";

export type JwtUser = {
  id: number;
  correo: string;
  rol_usuario_id: number;
  comunidad_id: number | null;
  comunidad_nombre: string | null;
  comunidad_codigo: string | null;
};

export type LoginResp = {
  access: string;
  refresh: string;
  user: JwtUser;
};

export const AuthApi = {
  login: (correo: string, password: string, codigo?: string) =>
    http.post<LoginResp>("/auth/login", { correo, password, codigo }),

  register: (payload: any) => http.post("/auth/register", payload),

  refresh: (refresh: string) => http.post<{ access: string }>("/auth/refresh", { refresh }),

  verifyAccess: (payload: { codigo: string; correo: string }) =>
    http.post<{ ok: boolean; comunidad_id?: number; tipo_id?: 1 | 2; reason?: string }>(
      "/auth/verify-access",
      payload
    ),
};
