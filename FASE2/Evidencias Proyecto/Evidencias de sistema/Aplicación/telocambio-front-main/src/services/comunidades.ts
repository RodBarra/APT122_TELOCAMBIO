import { http } from "../lib/http";

export type Comunidad = {
  id: number;
  nombre: string;
  tipo_id: 1 | 2;
  direccion?: string | null;
  correo_contacto_admin?: string | null;
  estado_comunidad_id?: number | null;
  codigo: string;
  creado_en?: string;
  moderador_correo?: string | null; 
};

export type ComunidadListParams = {
  q?: string;
  tipo_id?: 1 | 2;
  estado?: number;
  ordering?: string;
  page?: number;
  page_size?: number;
  sin_moderador?: number; // 1 => solo comunidades sin moderador
};

export type ComunidadListResponse = {
  items: Comunidad[];
  total: number;
  page: number;
  page_size: number;
};

export const ComunidadesApi = {
  list: (params?: ComunidadListParams) =>
    http.get<ComunidadListResponse>("/comunidades/list", { params }),

  create: (payload: {
    nombre: string;
    tipo_id: 1 | 2;
    direccion?: string;
    codigo: string;
  }) => http.post("/comunidades/", payload),

  get: (id: number) => http.get<Comunidad>(`/comunidades/${id}`),

  update: (id: number, patch: Partial<Pick<Comunidad, "nombre" | "estado_comunidad_id">>) =>
    http.put(`/comunidades/${id}`, patch),
};
