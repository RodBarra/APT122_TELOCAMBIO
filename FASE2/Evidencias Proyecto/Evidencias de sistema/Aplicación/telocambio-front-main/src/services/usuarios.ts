// src/services/usuarios.ts
import { http } from "../lib/http";

export type UsuarioLite = {
  id: number;
  comunidad_id: number | null;
  comunidad_nombre?: string | null;
  correo: string;
  nombre: string;
  apellidos: string;
  telefono?: string | null;
  rol_usuario_id: 1 | 2 | 3;
  estado_usuario_id: number;
  registrado_en?: string | null;
  actualizado_en?: string | null;
};

export type MeResponse = {
  id: number;
  correo: string;
  nombre?: string;
  apellidos?: string;
  telefono?: string;
  promedio_rating?: number;
  cantidad_ratings?: number;
  intercambios_realizados?: number;
  publicaciones_activas?: number;
  rol_usuario_id?: 1 | 2 | 3;
  rol_nombre?: string | null;
};

export type UsuarioListResponse = {
  items: UsuarioLite[];
  total: number;
  page: number;
  page_size: number;
};

export type UsuarioListParams = {
  comunidad_id?: number;
  q?: string;
  rol?: 1 | 2 | 3;
  estado?: number;
  ordering?: string;
  page?: number;
  page_size?: number;
};

export const UsuariosApi = {
  list: (params?: UsuarioListParams) =>
    http.get<UsuarioListResponse>("/usuarios/", { params }),

  update: (id: number, patch: Partial<UsuarioLite>) =>
    http.put(`/usuarios/${id}`, patch),

  delete: (id: number) =>
    http.delete(`/usuarios/${id}`),

  createModerador: (payload: {
    comunidad_id: number;
    correo: string;
    password: string;
    nombre: string;
    apellidos: string;
    telefono?: string;
  }) => http.post("/usuarios/moderador", payload),
};

// ===== PERFIL =====

// obtengo "yo" (datos del que está logeado)
export async function getMe(): Promise<{
  id: number;
  correo: string;
  nombre?: string;
  apellidos?: string;
  telefono?: string;
}> {
  return await http.get("/usuarios/me/");
}

// update "yo"
export async function updateMe(payload: {
  nombre?: string;
  apellidos?: string;
  telefono?: string;
}): Promise<void> {
  await http.patch("/usuarios/me/", payload);
}

// perfil público de otro usuario
export async function getUsuarioPublico(id: number) {
  return await http.get(`/usuarios/publico/${id}`);
}
