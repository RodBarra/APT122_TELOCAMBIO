import { http } from "../lib/http";

export type PadronItem = {
  id: number;
  comunidad_id?: number;
  correo: string;
  habilitado: boolean;
  usado: boolean;
  cargado_en: string;
  estado: "Libre" | "Usado";
};

export type PadronListResponse = {
  items: PadronItem[];
};

const base = (comunidadId: number) => `/comunidades/${comunidadId}/padron`;

export const PadronApi = {
  list: (
    comunidadId: number,
    params?: { q?: string; estado?: "Libre" | "Usado"; habilitado?: boolean }
  ) => http.get<PadronListResponse>(`${base(comunidadId)}/list`, { params }),

  add: (comunidadId: number, body: { correo: string }) =>
    http.post<{ ok: boolean; id: number }>(`${base(comunidadId)}`, body),

  updateCorreo: (comunidadId: number, id: number, correo: string) =>
    http.patch<{ ok: boolean }>(`${base(comunidadId)}/${id}`, { correo }),

  remove: (comunidadId: number, id: number) =>
    http.delete<{ ok: boolean; deleted: number }>(`${base(comunidadId)}/${id}/delete`),
};
