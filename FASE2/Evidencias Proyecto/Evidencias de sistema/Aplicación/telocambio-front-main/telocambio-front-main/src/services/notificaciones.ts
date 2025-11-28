// src/services/notificaciones.ts
import { http } from "../lib/http";

export type NotificationType =
  | "OFERTA_RECIBIDA"
  | "OFERTA_ACEPTADA"
  | "INTERCAMBIO_MARCADO_REALIZADO"
  | "INTERCAMBIO_FINALIZADO_PENDIENTE_VALORACION";

export type Notification = {
  id: number;
  tipo: NotificationType;
  titulo: string;
  mensaje: string;
  intercambio_id?: number | null;
  publicacion_id?: number | null;
  link_url?: string | null;
  payload?: Record<string, any>;
  creada_en: string;
  leida_en?: string | null;
};

type ListParams = {
  soloNoLeidas?: boolean;
  page?: number;
  page_size?: number;
};

export async function getBadge(): Promise<{ no_leidas: number }> {
  // axios: http.get -> AxiosResponse, sacamos .data
  const res = await http.get<{ no_leidas: number }>("/notificaciones/badge/");
  return res.data;
}

export async function listNotificaciones(
  params: ListParams = {}
): Promise<Notification[]> {
  const q = new URLSearchParams();
  if (params.soloNoLeidas) q.set("soloNoLeidas", "true");
  if (params.page) q.set("page", String(params.page));
  if (params.page_size) q.set("page_size", String(params.page_size));
  const qs = q.toString();
  const url = `/notificaciones/${qs ? `?${qs}` : ""}`;

  // Puede devolver directamente un array o un objeto { results: [...] }
  const res = await http.get<Notification[] | { results: Notification[] }>(url);
  const data = res.data as any;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results as Notification[];

  return [];
}

export async function marcarLeida(id: number): Promise<void> {
  await http.patch(`/notificaciones/${id}/leer/`, {});
  window.dispatchEvent(new CustomEvent("notif-updated")); 
}

export async function marcarTodasLeidas(): Promise<{ marcadas: number }> {
  const res = await http.patch<{ marcadas: number }>(
    `/notificaciones/leer-todas/`,
    {}
  );
  window.dispatchEvent(new CustomEvent("notif-updated"));
  return res.data;
}

export async function eliminarNotif(id: number): Promise<void> {
  await http.delete(`/notificaciones/${id}/`);
  window.dispatchEvent(new CustomEvent("notif-updated"));
}
