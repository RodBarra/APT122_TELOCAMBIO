// src/types.ts

/** ====== AUTH / USER ====== */
export type JwtUser = {
  id: number;
  correo: string;
  rol_usuario_id: 1 | 2 | 3; // 1=Admin, 2=Moderador, 3=Residente
  comunidad_id: number | null;
  nombre?: string;
  apellidos?: string;
};

export type LoginResp = {
  access: string;
  refresh: string;
  user: JwtUser;
};
export type LoginResponse = LoginResp;

/** ====== COMUNIDADES ====== */
export type Comunidad = {
  id: number;
  nombre: string;
  tipo_id: 1 | 2;
  direccion?: string | null;
  correo_contacto_admin: string;
  estado_comunidad_id?: number | null;
  codigo: string;
};

/** ====== PADRÓN ====== */
export type PadronItem = {
  id: number;
  comunidad_id: number;
  correo: string;
  habilitado: boolean;
  usado: boolean;
  torre?: string | null;
  direccion_texto?: string | null;
  numero?: string | null;
  estado_padron_id?: number;
};

export type PadronListResponse = {
  total?: number;
  items: PadronItem[];
};

/** ====== USUARIOS (módulo moderador) ====== */
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

// --- Marketplace (Sprint 2) ---
export type Categoria = {
  id: number;
  nombre: string;
};

export type ImagenPublicacion = {
  id: number;
  url: string;
  posicion: number;
  creada_en?: string;
};

export type Publicacion = {
  id: number;
  comunidad_id: number;
  propietario_usuario_id: number;
  categoria_id: number;
  tipo_publicacion_id: 1 | 2 | 3; // 1=Servicio, 2=Producto, 3=Regalo
  titulo: string;
  descripcion?: string | null;
  condicion_publicacion_id: 1 | 2 | 3; // alias de condicion_producto_id
  estado_publicacion_id: 1 | 2 | 3;    // 1=Activa, 2=Oculta, 3=Realizada
  creada_en: string;
  actualizada_en: string;
  imagenes?: ImagenPublicacion[];

  // Enriquecimientos opcionales
  propietario_nombre?: string | null;
  propietario_apellidos?: string | null;

  // NUEVO: contadores (si el backend los incluye)
  ofertas_count_total?: number;
  ofertas_count_pendientes?: number;

  bloqueada?: boolean; 
};

export type PublicacionListItem = {
  id: number;
  titulo: string;
  categoria_id: number;
  tipo_publicacion_id: number;
  condicion_publicacion_id: number;
  estado_publicacion_id: 1 | 2 | 3; 
  creada_en: string;
  actualizada_en: string;
  primera_imagen?: string | null;
  ofertas_count_total?: number;
  ofertas_count_pendientes?: number;
  bloqueada?: boolean;
  intercambio_en_progreso?: boolean;
};

export type PageMeta = {
  page: number;
  page_size: number;
  total: number;
};

/** ====== Intercambios (Sprint 3) ====== */
export type IntercambioCounterparty = {
  id: number;
  nombre: string | null;
  apellidos: string | null;
  telefono: string | null;
  // ahora viene un objeto vivienda (no solo el id)
  vivienda: {
    torre: string | null;
    direccion_texto: string | null;
    numero: string | null;
  } | null;
};

export type Intercambio = {
  id: number;
  comunidad_id: number;
  // incluye el estado 4 = Aceptado (el front ya lo usa)
  estado_intercambio_id: 1 | 2 | 3 | 4; // 1=Pendiente, 2=Finalizado, 3=Cancelado, 4=Aceptado
  solicitante_usuario_id: number;
  receptor_usuario_id: number;
  publicacion_solicitada_id: number;
  publicacion_ofrecida_id: number;
  ultimo_estado_por_usuario_id?: number | null;

  // API expone alias (DRF mapea desde creado_en/actualizado_en)
  creada_en: string;
  actualizada_en: string;

  // ✅ NUEVO: banderas de confirmación que envía el detalle
  // - confirmo_solicitada: confirmó el DUEÑO de la PUBLICACIÓN SOLICITADA (receptor)
  // - confirmo_ofrecida:  confirmó el DUEÑO de la PUBLICACIÓN OFRECIDA (solicitante)
  confirmo_solicitada?: boolean;
  confirmo_ofrecida?: boolean;

  // Datos de contraparte para coordinar
  counterparty?: IntercambioCounterparty | null;
};

export type IntercambioListResponse = {
  results: Intercambio[];
  meta?: PageMeta;
};

// ===== Notificaciones =====
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

// Perfil público
export type UserPublic = {
  id: number;
  nombre?: string;
  apellidos?: string;
  telefono?: string | null;
  promedio_rating?: number | null;
  cantidad_ratings?: number | null;
  intercambios_realizados?: number;
  publicaciones_activas?: number;
  ultimas_valoraciones?: Array<{
    puntaje: number;
    comentario?: string | null;
    creado_en?: string;
  }>;
};
