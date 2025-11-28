import { request } from "../lib/http";
import type { Intercambio, IntercambioListResponse } from "../types";

/* Parámetros de listados */
type ListParams = {
  box?: "inbox" | "outbox";
  estado?: 1 | 2 | 3 | 4; // 4 = Aceptado
  publicacion_solicitada_id?: number;
  publicacion_ofrecida_id?: number;
  page?: number;
  page_size?: number;
};

/* Normalización por si el ViewSet devuelve array simple o {results, meta} */
function normalizeList(data: any): IntercambioListResponse {
  if (Array.isArray(data)) return { results: data as Intercambio[] };
  if (Array.isArray(data?.results)) return { results: data.results as Intercambio[], meta: data.meta };
  return { results: [] };
}

/* Listado */
export async function listIntercambios(params: ListParams = {}): Promise<IntercambioListResponse> {
  const qs = new URLSearchParams();
  if (params.box) qs.set("box", params.box);
  if (params.estado) qs.set("estado", String(params.estado));
  if (params.publicacion_solicitada_id) qs.set("publicacion_solicitada_id", String(params.publicacion_solicitada_id));
  if (params.publicacion_ofrecida_id) qs.set("publicacion_ofrecida_id", String(params.publicacion_ofrecida_id));
  if (params.page) qs.set("page", String(params.page));
  if (params.page_size) qs.set("page_size", String(params.page_size));

  const query = qs.toString() ? `?${qs.toString()}` : "";
  const raw = await request<any>(`/intercambios/intercambios/${query}`);
  return normalizeList(raw);
}

/* Crear */
type CreatePayload = {
  publicacion_solicitada_id: number;
  publicacion_ofrecida_id: number;
};

export async function createIntercambio(
  body: CreatePayload
): Promise<{ success: boolean; data?: Intercambio }> {
  try {
    const resp = await request<{ success: boolean; data: Intercambio }>(
      `/intercambios/intercambios/`,
      { method: "POST", body }
    );
    return resp;
  } catch (e: any) {
    const msg =
      e?.response?.data?.detail ||
      (Array.isArray(e?.response?.data?.non_field_errors) ? e.response.data.non_field_errors[0] : null) ||
      e?.message ||
      "Error al crear el intercambio.";
    throw new Error(msg);
  }
}

/* Detalle */
export async function getIntercambio(id: number): Promise<Intercambio> {
  const resp = await request<Intercambio>(`/intercambios/intercambios/${id}/`);
  return resp; // el ViewSet retorna el objeto directamente
}

/* Aceptar / Cancelar */
export async function accionIntercambio(
  id: number,
  action: "aceptar" | "cancelar"
): Promise<{ success: boolean; data?: Intercambio }> {
  try {
    const resp = await request<{ success: boolean; data: Intercambio }>(
      `/intercambios/intercambios/${id}/${action}/`,
      { method: "PATCH" }
    );
    return resp;
  } catch (e: any) {
    const msg = e?.response?.data?.detail || e?.message || "No se pudo actualizar el intercambio.";
    throw new Error(msg);
  }
}

/* Confirmar Realizado (doble OK) */
export async function confirmarRealizado(
  id: number
): Promise<{ success: boolean; data?: Intercambio }> {
  try {
    const resp = await request<{ success: boolean; data: Intercambio }>(
      `/intercambios/intercambios/${id}/confirmar-realizado/`,
      { method: "PATCH" }
    );
    return resp;
  } catch (e: any) {
    const msg = e?.response?.data?.detail || e?.message || "No se pudo confirmar el intercambio.";
    throw new Error(msg);
  }
}

/* ─────────────────────── Valoraciones ─────────────────────── */

// GET mi valoración (agregar slash final)
export async function getMiValoracion(
  id: number
): Promise<{ puntaje: number; comentario?: string } | null> {
  try {
    const data = await request<{ puntaje: number; comentario?: string }>(
      `/intercambios/intercambios/${id}/valoracion/mia/` // <-- barra final
    );
    if (typeof data?.puntaje === "number") return data;
    return null;
  } catch {
    return null;
  }
}

// POST valorar (agregar slash final)
export async function valorarIntercambio(
  id: number,
  body: { puntaje: number; comentario?: string }
): Promise<{ success: boolean }> {
  try {
    const resp = await request<{ success: boolean }>(
      `/intercambios/intercambios/${id}/valorar/`,     
      { method: "POST", body }
    );
    return resp;
  } catch (e: any) {
    const msg =
      e?.response?.data?.detail ||
      e?.message ||
      "No se pudo registrar la valoración.";
    throw new Error(msg);
  }
}

