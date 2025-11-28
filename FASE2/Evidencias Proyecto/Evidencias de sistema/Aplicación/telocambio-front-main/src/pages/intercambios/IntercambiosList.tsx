// src/pages/intercambios/IntercambiosList.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Spinner from "../../components/Spinner";
import { AlertErr } from "../../components/Alert";
import { listIntercambios } from "../../services/intercambios";
import { getPublicacion } from "../../services/publicaciones";
import type { Intercambio, Publicacion } from "../../types";

type Box = "inbox" | "outbox";

/* ───────────────────────── etiquetas & estilos ───────────────────────── */

const ESTADO = {
  PEND: 1,
  FIN: 2,
  CANC: 3,
  ACEP: 4,
} as const;

const estadoLabel: Record<number, string> = {
  [ESTADO.PEND]: "Pendiente",
  [ESTADO.ACEP]: "Aceptado",
  [ESTADO.FIN]: "Finalizado",
  [ESTADO.CANC]: "Cancelado",
};

const estadoChipCls: Record<number, string> = {
  [ESTADO.PEND]: "bg-amber-50 text-amber-700 border-amber-200",
  [ESTADO.ACEP]: "bg-blue-50 text-blue-700 border-blue-200",
  [ESTADO.FIN]: "bg-emerald-50 text-emerald-700 border-emerald-200",
  [ESTADO.CANC]: "bg-rose-50 text-rose-700 border-rose-200",
};

function StatusChip({ estado }: { estado: number }) {
  const cls =
    estadoChipCls[estado] || "bg-gray-100 text-gray-800 border-gray-200";
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded border ${cls}`}>
      {estadoLabel[estado] || "—"}
    </span>
  );
}

function meta(dateStr?: string) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

/* ───────────────────────── item enriquecido ───────────────────────── */

type RichItem = Intercambio & {
  _sol?: Publicacion | null;
  _ofr?: Publicacion | null;
};

type PubMiniProps = {
  pub?: Publicacion | null;
  id: number;
  to: string;
  highlight?: boolean;
  label: string;
};

function getTipoFromPub(pub?: Publicacion | null): string {
  if (!pub) return "Producto / Servicio / Regalo";

  const anyPub: any = pub;

  // Si viene texto, lo usamos directo (por si en el futuro el API lo manda)
  if (anyPub.tipo_nombre || anyPub.tipo || anyPub.tipoNombre) {
    return anyPub.tipo_nombre || anyPub.tipo || anyPub.tipoNombre;
  }

  // Mapeo por ID (ajusta si en tu dominio es al revés)
  switch (anyPub.tipo_publicacion_id) {
    case 1:
      return "Servicio";
    case 2:
      return "Producto";
    case 3:
      return "Regalo";
    default:
      return "Producto / Servicio";
  }
}

// Mapa local de categorías por ID (lo mismo que usas en otras pantallas)
const CATEGORIA_LABEL: Record<number, string> = {
  1: "Electrónica, Hogar y Tecnología",
  2: "Ropa, Moda y Calzado",
  3: "Belleza, Salud y Cuidado Personal",
  4: "Deportes, Fitness y Aire Libre",
  5: "Juguetes, Niños y Bebés",
  6: "Mascotas",
  7: "Automotriz y Herramientas",
  8: "Libros, Arte, Música y Coleccionables",
  9: "Servicios",
  10: "Otros",
};

const CONDICION_LABEL: Record<number, string> = {
  1: "Nuevo",
  2: "Usado",
  3: "Reacondicionado",
  4: "Para repuestos",
  5: "Otro",
};

function getCategoriaFromPub(pub?: Publicacion | null): string {
  if (!pub) return "No especificada";
  const anyPub: any = pub;
  // Si ya viene texto desde el backend, lo respetamos
  if (anyPub.categoria_nombre || anyPub.categoria || anyPub.categoriaNombre) {
    return anyPub.categoria_nombre || anyPub.categoria || anyPub.categoriaNombre;
  }
  // Si solo viene el ID, mapeamos
  const id = anyPub.categoria_id as number | undefined;
  if (id && CATEGORIA_LABEL[id]) return CATEGORIA_LABEL[id];
  return "No especificada";
}

function getCondicionFromPub(pub?: Publicacion | null): string {
  if (!pub) return "No informada";
  const anyPub: any = pub;
  // Si ya viene texto desde el backend, lo respetamos
  if (anyPub.condicion_nombre || anyPub.condicion || anyPub.condicionNombre) {
    return anyPub.condicion_nombre || anyPub.condicion || anyPub.condicionNombre;
  }
  // Si solo viene el ID, mapeamos
  const id = anyPub.condicion_publicacion_id as number | undefined;
  if (id && CONDICION_LABEL[id]) return CONDICION_LABEL[id];
  return "No informada";
}

function getPublicadoPorFromPub(pub?: Publicacion | null): string {
  if (!pub) return "Otro residente de tu comunidad";
  const anyPub: any = pub;

  // Si backend ya manda un nombre "bonito", lo usamos
  if (
    anyPub.publicado_por_nombre ||
    anyPub.creador_nombre ||
    anyPub.usuario_nombre
  ) {
    return (
      anyPub.publicado_por_nombre ||
      anyPub.creador_nombre ||
      anyPub.usuario_nombre
    );
  }

  // Armamos desde propietario_nombre + propietario_apellidos
  const nom = anyPub.propietario_nombre as string | undefined;
  const ape = anyPub.propietario_apellidos as string | undefined;

  const full = [nom, ape].filter(Boolean).join(" ").trim();
  if (full) return full;

  return "Otro residente de tu comunidad";
}

function PubMini({ pub, id, to, highlight, label }: PubMiniProps) {
  const img = pub?.imagenes?.[0]?.url || "/img/no-image.png";
  const title = pub?.titulo || `Publicación #${id}`;

  // Intentamos varios nombres posibles que pudiera mandar el backend
  const categoriaRaw =
    (pub as any)?.categoria_nombre ||
    (pub as any)?.categoria ||
    (pub as any)?.categoriaNombre ||
    null;

  const tipoRaw =
    (pub as any)?.tipo_nombre ||
    (pub as any)?.tipo ||
    (pub as any)?.tipoNombre ||
    null;

  const condicionRaw =
    (pub as any)?.condicion_nombre ||
    (pub as any)?.condicion ||
    (pub as any)?.condicionNombre ||
    null;

  const publicadoPorRaw =
    (pub as any)?.publicado_por_nombre ||
    (pub as any)?.creador_nombre ||
    (pub as any)?.usuario_nombre ||
    null;

  // Fallbacks para que siempre se vea algo
    const categoria = categoriaRaw ?? getCategoriaFromPub(pub);
  const tipo = tipoRaw ?? getTipoFromPub(pub);
  const condicion = condicionRaw ?? getCondicionFromPub(pub);
  const publicadoPor =
    publicadoPorRaw ?? getPublicadoPorFromPub(pub);

  return (
    <div
      className={[
        "relative group rounded-xl border bg-slate-50/80 p-3 md:p-4 h-full",
        "transition-all duration-200",
        highlight
          ? "ring-2 ring-blue-500/80 border-blue-300 bg-blue-50/60 shadow-md hover:-translate-y-0.5 hover:shadow-lg"
          : "border-slate-200 hover:-translate-y-0.5 hover:shadow-sm",
      ].join(" ")}
    >
      {/* cabecera de la card */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-semibold text-slate-600">
          {label}
        </div>
        {highlight && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 text-white px-2 py-0.5 text-[10px] font-semibold shadow-sm">
            ⭐ Tu publicación
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        {/* Información a la izquierda */}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-800 truncate">
            {title}
          </div>

          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-500">
            <div>
              <span className="font-semibold text-slate-600">
                Categoría:{" "}
              </span>
              {categoria}
            </div>
            <div>
              <span className="font-semibold text-slate-600">
                Tipo:{" "}
              </span>
              {tipo}
            </div>
            <div>
              <span className="font-semibold text-slate-600">
                Condición:{" "}
              </span>
              {condicion}
            </div>
            <div className="sm:col-span-2">
              <span className="font-semibold text-slate-600">
                Publicado por:{" "}
              </span>
              {publicadoPor}
            </div>
          </div>

          <Link
            to={to}
            className="mt-3 inline-flex text-xs text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
            Ver publicación
          </Link>
        </div>

        {/* Imagen a la derecha */}
        <img
          src={img}
          alt={title}
          className="w-16 h-16 md:w-20 md:h-20 rounded-lg object-cover border shadow-sm flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
        />
      </div>
    </div>
  );
}

function Item({ it, box }: { it: RichItem; box: Box }) {
  const isMineSolicitada = box === "inbox";
  const isMineOfrecida = box === "outbox";

  return (
    <div className="rounded-2xl border bg-white p-4 md:p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* encabezado intercambio */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-sm shadow-sm">
            🔁
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600">
              <span className="font-semibold text-slate-900">
                Intercambio #{it.id}
              </span>
              <span className="hidden sm:inline text-slate-400">·</span>
              <span className="inline-flex items-center gap-1">
                <span className="text-[11px]">📅</span>
                <span className="text-[11px] sm:text-xs">
                  Creado {meta((it as any).creada_en)}
                </span>
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Revisa las dos publicaciones involucradas en este trueque.
            </p>
          </div>
        </div>
      </div>

      {/* comparación con flecha + botón central */}
      <div className="mt-2 grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <PubMini
          pub={it._sol}
          id={it.publicacion_solicitada_id}
          to={`/publicaciones/${it.publicacion_solicitada_id}`}
          highlight={isMineSolicitada}
          label="Publicación solicitada"
        />

        <div className="flex flex-col items-center justify-center gap-3 py-3">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="h-[2px] w-12 md:w-16 bg-slate-300 rounded-full" />
            <span className="text-2xl">⇄</span>
            <span className="h-[2px] w-12 md:w-16 bg-slate-300 rounded-full" />
          </div>
          <Link
            to={`/intercambios/${it.id}`}
            className="inline-flex items-center justify-center rounded-xl px-4 py-1.5 text-xs sm:text-sm font-semibold 
                       bg-blue-600 text-white border border-blue-600 
                       hover:bg-white hover:text-blue-600 hover:border-blue-600 
                       transition-all duration-200 shadow-sm active:scale-[0.97]"
          >
            Ver detalle del intercambio
          </Link>
        </div>

        <PubMini
          pub={it._ofr}
          id={it.publicacion_ofrecida_id}
          to={`/publicaciones/${it.publicacion_ofrecida_id}`}
          highlight={isMineOfrecida}
          label="Publicación ofrecida"
        />
      </div>

      {it.estado_intercambio_id === ESTADO.ACEP && (
        <div className="mt-3 text-[11px] sm:text-xs text-slate-500">
          En curso: ambas partes deben confirmar como <b>realizado</b> para
          marcar el trueque como finalizado.
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── página ───────────────────────── */

export default function IntercambiosList() {
  const [sp, setSp] = useSearchParams();

  const box = (sp.get("box") as Box) || "inbox"; // inbox = recibidos
  const estado = (Number(sp.get("estado")) ||
    ESTADO.ACEP) as 1 | 2 | 3 | 4;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<RichItem[]>([]);

  // cache simple por ID para evitar N+1 duplicado
  const pubCache = new Map<number, Publicacion | null>();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const resp = await listIntercambios({ box, estado, page_size: 100 });
        const base = (resp.results || []) as RichItem[];

        const ids = new Set<number>();
        base.forEach((x) => {
          ids.add(x.publicacion_solicitada_id);
          ids.add(x.publicacion_ofrecida_id);
        });

        await Promise.all(
          Array.from(ids).map(async (id) => {
            if (pubCache.has(id)) return;
            try {
              const p = await getPublicacion(id);
              pubCache.set(id, p);
            } catch {
              pubCache.set(id, null);
            }
          })
        );

        const rich = base.map((x) => ({
          ...x,
          _sol: pubCache.get(x.publicacion_solicitada_id) ?? null,
          _ofr: pubCache.get(x.publicacion_ofrecida_id) ?? null,
        }));

        setItems(rich);
      } catch (e: any) {
        setErr(e?.message || "No se pudieron cargar los intercambios.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box, estado]);

  const setBox = (b: Box) => {
    sp.set("box", b);
    setSp(sp, { replace: true });
  };
  const setEstado = (v: number) => {
    sp.set("estado", String(v));
    setSp(sp, { replace: true });
  };

  const title = useMemo(
    () => (box === "inbox" ? "Intercambios recibidos" : "Intercambios enviados"),
    [box]
  );

  const estadoTexto = estadoLabel[estado] ?? "";
  const bgUrl = "/bg-publicaciones.png";

  // colores para los toggles grandes
  const inboxActive =
    "bg-emerald-600 text-white border-emerald-600 shadow-sm hover:bg-emerald-600";
  const inboxInactive =
    "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50";

  const outboxActive =
    "bg-amber-500 text-white border-amber-500 shadow-sm hover:bg-amber-500";
  const outboxInactive =
    "bg-white text-amber-700 border-amber-300 hover:bg-amber-50";

  return (
    <div className="relative min-h-screen antialiased">
      {/* Fondo */}
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url('${bgUrl}')` }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/45 via-slate-900/10 to-slate-900/55" />

      {/* Contenedor principal */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 2xl:px-0 py-10 w-full max-w-[1600px]">
        <div className="rounded-2xl bg-white/90 backdrop-blur-xl shadow-2xl ring-1 ring-black/5 p-6 md:p-8 transition-all duration-300">
          {/* HEADER */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
            <div className="transition-transform duration-300 md:group-hover:translate-y-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
                Panel de intercambios
              </p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                {title} 🔁
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Gestiona el estado de tus trueques dentro de tu comunidad. Vista
                filtrada por estado:{" "}
                <span className="font-semibold">{estadoTexto}</span>.
              </p>
            </div>
          </div>

          {/* FILTROS – Paso 1 y Paso 2 lado a lado en pantallas grandes */}
          <div className="mb-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* CARD 1: TIPO DE INTERCAMBIOS */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 sm:p-5 h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
                    ⇄
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                      Paso 1
                    </p>
                    <h2 className="text-sm sm:text-base font-semibold text-slate-900">
                      Tipo de intercambios
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Elige si quieres ver los intercambios que te han enviado o
                      los que tú iniciaste.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Recibidos */}
                  <button
                    type="button"
                    onClick={() => setBox("inbox")}
                    className={`inline-flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold border transition-all duration-200 transform active:scale-[0.97] w-full ${
                      box === "inbox" ? inboxActive : inboxInactive
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                        📥
                      </span>
                      <div className="text-left">
                        <div>Recibidos</div>
                        <div className="text-[11px] opacity-90 font-normal">
                          Intercambios donde otras personas te ofrecieron algo.
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Enviados */}
                  <button
                    type="button"
                    onClick={() => setBox("outbox")}
                    className={`inline-flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold border transition-all duration-200 transform active:scale-[0.97] w-full ${
                      box === "outbox" ? outboxActive : outboxInactive
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                        📤
                      </span>
                      <div className="text-left">
                        <div>Enviados</div>
                        <div className="text-[11px] opacity-90 font-normal">
                          Intercambios que tú iniciaste hacia otras personas.
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* CARD 2: ESTADO DEL INTERCAMBIO */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 sm:p-5 h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md">
                    ✔
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
                      Paso 2
                    </p>
                    <h2 className="text-sm sm:text-base font-semibold text-slate-900">
                      Estado del intercambio
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Ahora selecciona el estado del intercambio que quieres
                      revisar.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 justify-items-stretch">
                  {[ESTADO.PEND, ESTADO.ACEP, ESTADO.FIN, ESTADO.CANC].map(
                    (e) => {
                      const isActive = estado === e;
                      const baseCls =
                        "inline-flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 rounded-2xl px-3 py-2 text-xs sm:text-sm border transition-all duration-200 transform hover:-translate-y-0.5 w-full";
                      let colorCls = "";
                      if (e === ESTADO.PEND) {
                        colorCls = isActive
                          ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                          : "bg-amber-50 text-amber-800 border-amber-200";
                      } else if (e === ESTADO.ACEP) {
                        colorCls = isActive
                          ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                          : "bg-blue-50 text-blue-800 border-blue-200";
                      } else if (e === ESTADO.FIN) {
                        colorCls = isActive
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200";
                      } else if (e === ESTADO.CANC) {
                        colorCls = isActive
                          ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                          : "bg-rose-50 text-rose-800 border-rose-200";
                      }
                      const desc =
                        e === ESTADO.PEND
                          ? "Esperando respuesta"
                          : e === ESTADO.ACEP
                          ? "Aceptado, en curso"
                          : e === ESTADO.FIN
                          ? "Trueque finalizado"
                          : "Intercambio cancelado";

                      return (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setEstado(e)}
                          className={`${baseCls} ${colorCls}`}
                        >
                          <span className="font-semibold text-[11px] sm:text-xs">
                            {estadoLabel[e]}
                          </span>
                          <span className="text-[10px] font-normal opacity-90">
                            {desc}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>

                <p className="mt-3 text-[11px] text-slate-500 text-center">
                  Toca una opción para ver solo los intercambios en ese estado.
                </p>
              </div>
            </div>
          </div>

          {/* ERRORES */}
          {err && <AlertErr>{err}</AlertErr>}

          {/* CONTENIDO */}
          {loading ? (
            <div className="py-16 flex justify-center">
              <Spinner />
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mb-4 animate-pulse">
                <span className="text-3xl">📭</span>
              </div>
              <h2 className="text-lg font-semibold mb-1">
                No hay intercambios para este filtro
              </h2>
              <p className="text-gray-500 mb-2">
                Prueba cambiando entre recibidos/enviados o seleccionando otro
                estado.
              </p>
              <p className="text-xs text-slate-400">
                Recuerda que los intercambios se generan desde las publicaciones
                cuando aceptas o envías una oferta.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((it) => (
                <Item key={it.id} it={it} box={box} />
              ))}
            </div>
          )}

          {/* Guía rápida de estados estilo diagrama */}
          <div className="mt-10 text-xs text-slate-600">
            <div className="rounded-2xl border bg-slate-50 p-4 sm:p- transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <h3 className="text-center text-sm font-semibold text-slate-800 mb-3">
                Guía rápida de estados
              </h3>

              {/* Contenedor limitado para que no se abra demasiado en desktop */}
              <div className="max-w-3xl mx-auto">
                {/* Estados – desktop: horizontal (desde md = 768px) */}
                <div className="hidden md:flex items-center justify-center gap-16 mb-3">
                  <StatusChip estado={ESTADO.PEND} />
                  <span className="text-slate-800 text-sm mx-7">➨</span>
                  <StatusChip estado={ESTADO.ACEP} />
                  <span className="text-slate-800 text-sm mx-7">➨</span>
                  <StatusChip estado={ESTADO.FIN} />
                </div>

                {/* Estados – mobile / tablet chica: vertical */}
                <div className="flex md:hidden flex-col items-center gap-1 mb-3">
                  <StatusChip estado={ESTADO.PEND} />
                  <span className="text-slate-800 text-xs">↓</span>
                  <StatusChip estado={ESTADO.ACEP} />
                  <span className="text-slate-800 text-xs">↓</span>
                  <StatusChip estado={ESTADO.FIN} />
                </div>

                {/* Descripciones – desktop: alineadas bajo cada estado */}
                <div className="hidden sm:flex justify-between gap-6 text-[11px] mt-1">
                  <p className="flex-1 text-center text-slate-500">
                    Se crea la oferta y queda esperando respuesta.
                  </p>
                  <p className="flex-1 text-center text-slate-500">
                    El receptor acepta la oferta y el trueque queda en curso.
                  </p>
                  <p className="flex-1 text-center text-slate-500">
                    Ambas partes confirman que el trueque se realizó.
                  </p>
                </div>

                {/* Descripciones – mobile: una bajo otra */}
                <div className="sm:hidden mt-1 flex flex-col items-center gap-2 text-[11px]">
                  <p className="text-center text-slate-500 max-w-xs">
                    Se crea la oferta y queda esperando respuesta.
                  </p>
                  <p className="text-center text-slate-500 max-w-xs">
                    El receptor acepta la oferta y el trueque queda en curso.
                  </p>
                  <p className="text-center text-slate-500 max-w-xs">
                    Ambas partes confirman que el trueque se realizó.
                  </p>
                </div>
              </div>

              <p className="mt-3 text-[11px] text-center text-slate-500">
                En cualquier momento, una oferta puede ser cancelada y pasará al
                estado{" "}
                <span className="inline-block align-middle ml-1">
                  <StatusChip estado={ESTADO.CANC} />
                </span>
                .
              </p>
            </div>
          </div>     
        </div>
      </div>
    </div>
  );
}
