import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Spinner from "../../components/Spinner";
import { AlertErr } from "../../components/Alert";
import ConfirmModal from "../../components/ConfirmModal";
import {
  getIntercambio,
  confirmarRealizado,
  accionIntercambio,
  valorarIntercambio,
  getMiValoracion,
} from "../../services/intercambios";
import { getPublicacion } from "../../services/publicaciones";
import { useAuth } from "../../context/AuthContext";
import type { Intercambio, Publicacion } from "../../types";
import { buildTelHref, buildWhatsappHref } from "../../utils/phone";

/* ───────────────────────── helpers UI ───────────────────────── */

const estadoChip: Record<
  number,
  { text: string; cls: string; ring: string }
> = {
  1: {
    text: "Pendiente",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    ring: "ring-amber-200",
  },
  4: {
    text: "Aceptado",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
    ring: "ring-blue-200",
  },
  2: {
    text: "Finalizado",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ring: "ring-emerald-200",
  },
  3: {
    text: "Cancelado",
    cls: "bg-rose-50 text-rose-700 border-rose-200",
    ring: "ring-rose-200",
  },
};

function StatusChip({ estado }: { estado: number }) {
  const o =
    estadoChip[estado] ??
    {
      text: "—",
      cls: "bg-gray-100 text-gray-600 border-gray-200",
      ring: "ring-gray-200",
    };
  return (
    <span className={`text-xs px-2 py-1 rounded border ${o.cls}`}>{o.text}</span>
  );
}

function metaFmt(dateStr?: string) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

/* ───────────────────────── rating modal (inline) ───────────────────────── */

function Star({
  filled,
  onClick,
  onMouseEnter,
  onMouseLeave,
  label,
}: {
  filled: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={[
        "mx-1 text-3xl md:text-4xl leading-none transition-all duration-150 ease-out",
        filled
          ? "text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]"
          : "text-slate-300 hover:text-amber-300",
        " hover:scale-110 active:scale-95"
      ].join(" ")}
    >
      {filled ? "★" : "☆"}
    </button>
  );
}

function RatingModal({
  open,
  onClose,
  onSubmit,
  busy,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comentario?: string) => Promise<void>;
  busy: boolean;
  error: string | null;
}) {
  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [comentario, setComentario] = useState<string>("");

  useEffect(() => {
    if (!open) {
      setRating(0);
      setHover(0);
      setComentario("");
    }
  }, [open]);

  if (!open) return null;

  const finalHover = hover || rating;

  const LABELS: Record<number, { text: string; emoji: string }> = {
    1: { text: "Muy mala experiencia", emoji: "😞" },
    2: { text: "Podría ser mejor", emoji: "😕" },
    3: { text: "Intercambio correcto", emoji: "🙂" },
    4: { text: "Muy buena experiencia", emoji: "😊" },
    5: { text: "Excelente, todo perfecto", emoji: "🤩" },
  };

  const mood = LABELS[finalHover] ?? {
    text: "Elige una valoración de 1 a 5 ⭐",
    emoji: "⭐",
  };

  const remaining = 500 - comentario.length;
  const nearLimit = remaining <= 50;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-[fadeIn_0.18s_ease-out]">
        {/* Header */}
        <div className="px-5 py-4 border-b bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 text-white">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur text-2xl">
              ⭐
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold truncate">
                Calificar contraparte
              </h3>
              <p className="text-xs md:text-sm text-white/80">
                Valora tu experiencia (1 a 5 estrellas) y ayuda a la comunidad a
                confiar más en los trueques.
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Stars */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  filled={n <= finalHover}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  label={`${n} estrella${n > 1 ? "s" : ""}`}
                />
              ))}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-[11px] md:text-xs text-slate-700">
              <span aria-hidden="true" className="text-base">
                {mood.emoji}
              </span>
              <span className="whitespace-nowrap md:whitespace-normal">
                {mood.text}
              </span>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              Comentario (opcional)
              <span className="text-[11px] font-normal text-slate-400">
                Cuéntanos cómo fue el trato, la puntualidad, etc.
              </span>
            </label>
            <textarea
              className="input mt-1 w-full min-h-[110px] resize-y text-sm"
              placeholder="Ej: Me entregó el producto muy rápido, fue puntual y el trueque salió perfecto 🙌."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              maxLength={500}
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Sé respetuoso: tu opinión ayuda a otros usuarios.
              </span>
              <span
                className={
                  "font-medium " +
                  (nearLimit ? "text-amber-600" : "text-slate-400")
                }
              >
                {comentario.length}/500
              </span>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 flex items-start gap-2">
              <span className="mt-[2px]" aria-hidden="true">
                ⚠️
              </span>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t bg-slate-50/80 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
          <button
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100 transition-all duration-150 active:scale-[0.98] disabled:opacity-60"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          <button
            className={[
              "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm",
              "bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500",
              "hover:from-blue-500 hover:via-indigo-500 hover:to-emerald-400",
              "transition-all duration-150 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed",
            ].join(" ")}
            onClick={async () => {
              if (rating < 1 || rating > 5) return;
              await onSubmit(
                rating,
                comentario?.trim() ? comentario.trim() : undefined
              );
            }}
            disabled={busy || rating < 1}
          >
            {busy ? "Enviando valoración…" : "Enviar valoración"}
            {!busy && (
              <span aria-hidden="true" className="ml-2">
                🚀
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── component ───────────────────────── */

export default function IntercambioDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const interId = Number(id);
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [inter, setInter] = useState<Intercambio | null>(null);

  const [pubSol, setPubSol] = useState<Publicacion | null>(null);
  const [pubOfr, setPubOfr] = useState<Publicacion | null>(null);

  // barra de acciones
  const [busy, setBusy] = useState(false);
  const [bizErr, setBizErr] = useState<string | null>(null);

  // modal confirmar acción (aceptar / cancelar / realizado)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTone, setModalTone] = useState<"success" | "danger">("success");
  const [modal, setModal] = useState<{
    title: string;
    message: string;
    action: "aceptar" | "cancelar" | "realizado" | null;
  }>({ title: "", message: "", action: null });

  // Overrides locales para actualización optimista de confirmaciones
  const [localConfirm, setLocalConfirm] = useState<{
    solicitada?: boolean;
    ofrecida?: boolean;
  }>({});

  // rating
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingErr, setRatingErr] = useState<string | null>(null);
  const [miValoracion, setMiValoracion] = useState<{
    puntaje: number;
    comentario?: string;
  } | null>(null);

  // ⬇️ fetch con bandera para preservar overrides locales (evita volver a gris)
  const fetchIt = async (preserveLocal = false) => {
    setErr(null);
    setBizErr(null);
    setLoading(true);
    try {
      const data = await getIntercambio(interId);
      setInter(data);
      const [sol, ofr] = await Promise.allSettled([
        getPublicacion(data.publicacion_solicitada_id),
        getPublicacion(data.publicacion_ofrecida_id),
      ]);
      if (sol.status === "fulfilled") setPubSol(sol.value);
      if (ofr.status === "fulfilled") setPubOfr(ofr.value);

      // cargar si ya califiqué
      try {
        const mine = await getMiValoracion(interId);
        if (mine && typeof mine.puntaje === "number") {
          setMiValoracion({
            puntaje: mine.puntaje,
            comentario: mine.comentario,
          });
        } else {
          setMiValoracion(null);
        }
      } catch {
        setMiValoracion(null);
      }

      if (!preserveLocal) setLocalConfirm({});
    } catch (e: any) {
      setErr(e?.message || "No se pudo cargar el intercambio.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isFinite(interId)) {
      setErr("Identificador de intercambio inválido.");
      setLoading(false);
      return;
    }
    fetchIt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interId]);

  const solImg = useMemo(() => pubSol?.imagenes?.[0]?.url ?? null, [pubSol]);
  const ofrImg = useMemo(() => pubOfr?.imagenes?.[0]?.url ?? null, [pubOfr]);

  // quién es el usuario respecto del intercambio (para reglas visuales)
  const isOwnerOfSolicitada =
    !!user && !!pubSol && pubSol.propietario_usuario_id === user.id; // inbox
  const isOwnerOfOfrecida =
    !!user && !!pubOfr && pubOfr.propietario_usuario_id === user.id; // outbox
  const soyParte = isOwnerOfSolicitada || isOwnerOfOfrecida;

  // ─── Derivar confirmaciones de cada lado ───
  const derivedSolicitada = useMemo(() => {
    const anyInter = inter as any;
    return Boolean(
      anyInter?.realizado_solicitada ??
        anyInter?.confirmo_solicitada ??
        anyInter?.solicitada_confirmada ??
        false
    );
  }, [inter]);

  const derivedOfrecida = useMemo(() => {
    const anyInter = inter as any;
    return Boolean(
      anyInter?.realizado_ofrecida ??
        anyInter?.confirmo_ofrecida ??
        anyInter?.ofrecida_confirmada ??
        false
    );
  }, [inter]);

  // Confirmaciones efectivas considerando overrides locales (optimista)
  const confSolicitada = localConfirm.solicitada ?? derivedSolicitada;
  const confOfrecida = localConfirm.ofrecida ?? derivedOfrecida;

  // Yo confirmé? y la contraparte?
  const yoConfirme = isOwnerOfSolicitada
    ? confSolicitada
    : isOwnerOfOfrecida
    ? confOfrecida
    : false;
  const contraparteConfirmo = isOwnerOfSolicitada
    ? confOfrecida
    : isOwnerOfOfrecida
    ? confSolicitada
    : false;

  // Estado visible (si ambos confirmaron en aceptado, mostramos finalizado)
  const visibleEstado = useMemo(() => {
    if (!inter) return 0;
    if (inter.estado_intercambio_id === 4 && confSolicitada && confOfrecida)
      return 2; // Finalizado
    return inter.estado_intercambio_id;
  }, [inter, confSolicitada, confOfrecida]);

  const bgUrl = "/bg-publicaciones.png";
  const safeBack = () => nav(-1);

  if (loading) {
    return (
      <div className="relative min-h-screen antialiased">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: `url('${bgUrl}')` }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/40 via-slate-900/10 to-slate-900/40" />
        <div className="py-16">
          <Spinner />
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="relative min-h-screen antialiased">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: `url('${bgUrl}')` }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/40 via-slate-900/10 to-slate-900/40" />
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="rounded-2xl bg-white/85 backdrop-blur-xl shadow-2xl ring-1 ring-black/5 p-6 md:p-8">
            <AlertErr>{err}</AlertErr>
          </div>
        </div>
      </div>
    );
  }

  if (!inter) {
    return (
      <div className="relative min-h-screen antialiased">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: `url('${bgUrl}')` }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/40 via-slate-900/10 to-slate-900/40" />
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="rounded-2xl bg-white/85 backdrop-blur-xl shadow-2xl ring-1 ring-black/5 p-6 md:p-8">
            <AlertErr>No se encontró el intercambio.</AlertErr>
          </div>
        </div>
      </div>
    );
  }

  const chip = estadoChip[visibleEstado];
  const cp: any = (inter as any).counterparty;
  
  /* ───────────────────────── datos derivados de contraparte ───────────────────────── */
  const cpNombre =
  cp && ([cp.nombre, cp.apellidos].filter(Boolean).join(" ") || `Usuario #${cp.id}`);

  // 1) Número crudo tal como viene del backend
const cpTelefonoRaw: string = cp?.telefono || "";

// 2) Enlaces normalizados (solo si es un número chileno válido)
const telHref = buildTelHref(cpTelefonoRaw);
const waHref = buildWhatsappHref(cpTelefonoRaw);

// 3) Número visible en pantalla
const cpTelefono = cpTelefonoRaw;

// 4) Consideramos que “tiene teléfono” solo si pudimos construir un enlace válido
const tieneTelefono = !!telHref;

// Dirección de la contraparte
const cpDireccion =
  cp && cp.vivienda
    ? `${cp.vivienda.direccion_texto ?? "—"}${
        cp.vivienda.numero ? ` #${cp.vivienda.numero}` : ""
      }${cp.vivienda.torre ? `, Torre ${cp.vivienda.torre}` : ""}`
    : "—";

const cpInicial = cpNombre ? cpNombre.trim().charAt(0).toUpperCase() : "?";
const ownerProfileUrl = cp?.id ? `/perfil/${cp.id}` : "";

  // --- Mapas locales para mostrar textos bonitos según ID ---
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
    3: "Malo",
  };

  function getTipoFromPub(pub?: Publicacion | null): string {
    if (!pub) return "Producto / Servicio / Regalo";

    const anyPub: any = pub;

    // Si viene texto ya listo desde el backend, lo usamos directo.
    if (anyPub.tipo_nombre || anyPub.tipo || anyPub.tipoNombre) {
      return anyPub.tipo_nombre || anyPub.tipo || anyPub.tipoNombre;
    }

    // Mapeo por ID: 1 = Servicio, 2 = Producto, 3 = Regalo
    switch (anyPub.tipo_publicacion_id) {
      case 1:
        return "Servicio";
      case 2:
        return "Producto";
      case 3:
        return "Regalo";
      default:
        return "Producto / Servicio / Regalo";
    }
  }

  // helper para meta de publicación
  const buildPubMeta = (pub: Publicacion | null) => {
    const p: any = pub || {};

    // Intentamos primero textos que pudiera mandar el backend
    const categoriaRaw =
      p.categoria_nombre ?? p.categoria ?? p.categoriaNombre ?? null;

    const tipoRaw = p.tipo_nombre ?? p.tipo ?? p.tipoNombre ?? null;

    const condicionRaw =
      p.condicion_nombre ?? p.condicion ?? p.condicionNombre ?? null;

    // Fallbacks usando los IDs cuando solo vienen números
    const categoria =
      categoriaRaw ??
      (p.categoria_id && CATEGORIA_LABEL[p.categoria_id]
        ? CATEGORIA_LABEL[p.categoria_id]
        : "No especificada");

    const tipo = tipoRaw ?? getTipoFromPub(pub || null);

    const condicion =
      condicionRaw ??
      (p.condicion_publicacion_id &&
      CONDICION_LABEL[p.condicion_publicacion_id]
        ? CONDICION_LABEL[p.condicion_publicacion_id]
        : "No informada");

    return { categoria, tipo, condicion };
  };

  const solMeta = buildPubMeta(pubSol);
  const ofrMeta = buildPubMeta(pubOfr);

  // helpers de acciones
  const openAccept = () => {
    setModal({
      title: "Aceptar intercambio",
      message:
        "¿Confirmas que deseas aceptar este trueque? La otra parte verá tu aceptación. Luego podrán marcarlo como realizado.",
      action: "aceptar",
    });
    setModalTone("success");
    setModalOpen(true);
  };

  const openCancel = () => {
    setModal({
      title: "Cancelar intercambio",
      message:
        "¿Seguro que deseas cancelar este trueque? Se notificará a la otra parte y no podrá continuar.",
      action: "cancelar",
    });
    setModalTone("danger");
    setModalOpen(true);
  };

  const openDone = () => {
    setModal({
      title: "Marcar como realizado",
      message:
        "¿Confirmas que este trueque se realizó en la vida real? Cuando ambas partes confirmen, quedará finalizado.",
      action: "realizado",
    });
    setModalTone("success");
    setModalOpen(true);
  };

  const doModalAction = async () => {
    if (!modal.action) return;
    setModalOpen(false);
    setBizErr(null);
    setBusy(true);

    const prevLocal = { ...localConfirm };
    const prevInter = inter ? { ...inter } : null;

    try {
      if (modal.action === "aceptar") {
        await accionIntercambio(interId, "aceptar");
        await fetchIt();
      } else if (modal.action === "cancelar") {
        await accionIntercambio(interId, "cancelar");
        await fetchIt();
      } else if (modal.action === "realizado") {
        setLocalConfirm((c) => ({
          ...c,
          ...(isOwnerOfSolicitada ? { solicitada: true } : {}),
          ...(isOwnerOfOfrecida ? { ofrecida: true } : {}),
        }));

        if (inter && inter.estado_intercambio_id === 4) {
          const nextSolicitada = isOwnerOfSolicitada ? true : confSolicitada;
          const nextOfrecida = isOwnerOfOfrecida ? true : confOfrecida;
          if (nextSolicitada && nextOfrecida) {
            setInter({ ...inter, estado_intercambio_id: 2 });
          }
        }

        const resp = await confirmarRealizado(interId);
        if (resp?.data) setInter(resp.data);
        await fetchIt(true);
      }
    } catch (e: any) {
      setLocalConfirm(prevLocal);
      if (prevInter) setInter(prevInter as Intercambio);
      setBizErr(e?.message || "No se pudo ejecutar la acción.");
    } finally {
      setBusy(false);
    }
  };

  // Calificación: condiciones de visibilidad
  const puedoCalificar = soyParte && visibleEstado === 2 && !miValoracion;

  const enviarValoracion = async (puntaje: number, comentario?: string) => {
    setRatingErr(null);
    setRatingBusy(true);
    try {
      await valorarIntercambio(interId, { puntaje, comentario });
      setMiValoracion({ puntaje, comentario });
      setRatingOpen(false);
    } catch (e: any) {
      setRatingErr(e?.message || "No se pudo registrar tu valoración.");
    } finally {
      setRatingBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen antialiased">
      {/* Fondo */}
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url('${bgUrl}')` }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/40 via-slate-900/10 to-slate-900/40" />

      {/* Contenedor principal */}
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl bg-white/85 backdrop-blur-xl shadow-2xl ring-1 ring-black/5 p-6 md:p-8">
          {/* Botón Volver */}
          <div className="mb-4">
            <button
              className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-medium bg-blue-600 text-white border border-blue-600 hover:bg-white hover:text-blue-600 transition-colors"
              onClick={safeBack}
            >
              ← Volver
            </button>
          </div>

          {/* header con gradiente */}
          <div
            className={`rounded-2xl border shadow-sm overflow-hidden bg-white ring-1 ring-inset ${
              chip?.ring || "ring-slate-200"
            }`}
          >
            <div className="px-5 py-4 border-b bg-gradient-to-r from-slate-50 to-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-500 to-emerald-500 opacity-90" />
                  <div>
                    <h1 className="text-xl font-bold leading-tight">
                      Intercambio #{inter.id}
                    </h1>
                    <div className="text-xs text-slate-500">
                      Creado: {metaFmt((inter as any).creada_en)} · Actualizado:{" "}
                      {metaFmt((inter as any).actualizada_en)}
                    </div>
                  </div>
                </div>
                <StatusChip estado={visibleEstado} />
              </div>
            </div>
            {/* --- INICIO DE LA MODIFICACIÓN (MOVER BLOQUES DE ESTADO) --- */}
            <div className="p-5">
              
              {/* Mensaje PENDIENTE */}
              {visibleEstado === 1 && soyParte && (
                <div className="mb-6 rounded-2xl border p-5 flex flex-col items-center justify-between gap-3 bg-amber-50/40 animate-pulse text-base">
                  <div className="text-center">
                    <span className="text-xl mr-2">⏳</span>
                    {isOwnerOfSolicitada ? (
                      <>Este trueque está <b>pendiente</b>. Puedes <b>aceptarlo</b> o <b>cancelarlo</b>.</>
                    ) : (
                      <>Este trueque está <b>pendiente</b> de aceptación por la contraparte.</>
                    )}
                  </div>
                  {/* --- INICIO DE LA MODIFICACIÓN --- */}
                  <div className="flex gap-2 w-full justify-center">
                    {isOwnerOfSolicitada && (
                      <button
                        className="btn bg-emerald-600 text-white border border-emerald-600 hover:bg-white hover:text-emerald-700 hover:border-emerald-600 transition-colors disabled:opacity-60"
                        disabled={busy}
                        onClick={openAccept}
                      >
                        Aceptar
                      </button>
                    )}
                    <button
                      className="btn bg-rose-600 text-white border border-rose-600 hover:bg-white hover:text-rose-700 hover:border-rose-600 transition-colors disabled:opacity-60"
                      disabled={busy}
                      onClick={openCancel}
                    >
                      Cancelar
                    </button>
                  </div>
                  {/* --- FIN DE LA MODIFICACIÓN --- */}
                </div>
              )}

              {/* Mensaje ACEPTADO */}
              {visibleEstado === 4 && soyParte && (
                <div className="mb-6 rounded-2xl border p-5 flex flex-col items-center justify-between gap-3 bg-blue-50/35 animate-pulse text-base">
                  <div className="text-center">
                    <span className="text-xl mr-2">🤝</span>
                    ¡Intercambio aceptado! Marca como <b>realizado</b> cuando se concrete.
                  </div>
                  {/* --- INICIO DE LA MODIFICACIÓN --- */}
                  <div className="flex gap-2 w-full justify-center">
                    {!yoConfirme && (
                      <button
                        className="btn bg-emerald-600 text-white border border-emerald-600 hover:bg-white hover:text-emerald-700 hover:border-emerald-600 transition-colors disabled:opacity-60"
                        disabled={busy}
                        onClick={openDone}
                      >
                        Marcar como realizado
                      </button>
                    )}
                    {!yoConfirme && (
                      <button
                        className="btn bg-rose-600 text-white border border-rose-600 hover:bg-white hover:text-rose-700 hover:border-rose-600 transition-colors disabled:opacity-60"
                        disabled={busy}
                        onClick={openCancel}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                  {/* --- FIN DE LA MODIFICACIÓN --- */}
                </div>
              )}

              {/* Mensaje FINALIZADO */}
              {visibleEstado === 2 && soyParte && (
                <div className="mb-6 rounded-2xl border p-5 bg-emerald-50/70 text-emerald-800 animate-pulse">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-base text-center">
                      <span className="text-xl mr-2">🎉</span>
                      ¡Intercambio <b>finalizado</b>! Gracias por usar TeLoCambio.
                    </div>
                    <div className="flex items-center gap-2 justify-center">
                      {miValoracion ? (
                        <span className="inline-flex items-center gap-2 text-sm text-slate-700 bg-white border border-slate-200 rounded px-3 py-1.5">
                          Tu valoración:{" "}
                          <span className="text-amber-500 text-base">
                            {"★".repeat(miValoracion.puntaje)}
                            {"☆".repeat(Math.max(0, 5 - miValoracion.puntaje))}
                          </span>
                        </span>
                      ) : (
                        puedoCalificar && (
                          <button
                            className="btn bg-blue-600 text-white border border-blue-600 hover:bg-white hover:text-blue-600 transition-colors"
                            onClick={() => {
                              setRatingErr(null);
                              setRatingOpen(true);
                            }}
                          >
                            Calificar contraparte
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  {miValoracion?.comentario && (
                    <div className="mt-2 text-sm text-slate-700 text-center sm:text-left">
                      <span className="text-slate-500">Comentario: </span>
                      {miValoracion.comentario}
                    </div>
                  )}
                </div>
              )}
              
              {/* Mensaje CANCELADO */}
              {visibleEstado === 3 && soyParte && (
                <div className="mb-6 rounded-2xl border p-5 bg-rose-50/80 text-rose-800 text-base text-center animate-pulse">
                  <span className="text-xl mr-2">💔</span> Este intercambio fue <b>cancelado</b>.
                </div>
              )}
              
              {bizErr && (
                <div className="mb-6">
                  <AlertErr>{bizErr}</AlertErr>
                </div>
              )}

              {/* Progreso de confirmación */}
              {visibleEstado !== 3 && visibleEstado !== 2 && soyParte && (
                <div className="mb-6 rounded-2xl border bg-white/95 p-4 md:p-5">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
                    <div className="text-sm font-semibold text-slate-800">
                      Progreso de confirmación
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 max-w-md">
                      <span>🔒</span>
                      <span>
                        El intercambio se da por finalizado cuando <b>ambas partes</b> lo marcan como realizado.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {/* Tú */}
                    <div
                      className={`rounded-xl border px-3 py-2.5 flex items-center justify-between gap-3 ${
                        yoConfirme
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-slate-500 text-xs">
                          🙋
                        </span>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Tú
                          </span>
                          <span className="text-xs">
                            {isOwnerOfSolicitada ? "Publicación solicitada" : "Publicación ofrecida"}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold">
                        {yoConfirme ? "✔ Confirmado" : "Pendiente"}
                      </span>
                    </div>

                    {/* Contraparte */}
                    <div
                      className={`rounded-xl border px-3 py-2.5 flex items-center justify-between gap-3 ${
                        contraparteConfirmo
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-slate-500 text-xs">
                          🤝
                        </span>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Contraparte
                          </span>
                          <span className="text-xs">
                            Confirmación de la otra persona
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold">
                        {contraparteConfirmo ? "✔ Confirmado" : "Pendiente"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* --- FIN DE LA MODIFICACIÓN --- */}
            

              {/* tarjetas de publicaciones: imagen grande + info ordenada */}
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_auto_minmax(0,1.25fr)] gap-6 items-stretch">
                {/* solicitada */}
                <div
                  className={
                    "rounded-2xl border bg-white/95 p-4 md:p-5 flex flex-col h-full transition-all duration-200 hover:shadow-md" +
                    (isOwnerOfSolicitada
                      ? " ring-2 ring-blue-500/80 border-blue-300 bg-blue-50/40"
                      : "")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 text-xs">
                        📥
                      </span>
                      <div className="text-sm font-semibold">
                        Publicación solicitada
                      </div>
                    </div>
                    {isOwnerOfSolicitada && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 text-white px-2 py-0.5 text-[10px] font-semibold shadow-sm">
                        ⭐ Tu publicación
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-col items-center gap-4">
                    {/* IMG grande y responsiva */}
                    <div className="w-full flex justify-center">
                      <img
                        src={solImg || "/img/no-image.png"}
                        alt={
                          pubSol?.titulo ||
                          `Publicación #${inter.publicacion_solicitada_id}`
                        }
                        className="w-full max-w-sm aspect-[4/5] object-cover rounded-2xl border shadow-sm"
                      />
                    </div>

                    <div className="w-full">
                      <div className="text-base font-semibold text-slate-900 line-clamp-2">
                        {pubSol?.titulo ||
                          `Publicación #${inter.publicacion_solicitada_id}`}
                      </div>

                      {/* Info ordenada */}
                      <dl className="mt-3 space-y-1.5 text-[11px] text-slate-600">
                        <div className="flex gap-1.5">
                          <dt className="font-semibold text-slate-700 flex items-center gap-1">
                            <span>📚</span>
                            <span>Categoría:</span>
                          </dt>
                          <dd className="truncate">{solMeta.categoria}</dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="font-semibold text-slate-700 flex items-center gap-1">
                            <span>🏷️</span>
                            <span>Tipo:</span>
                          </dt>
                          <dd>{solMeta.tipo}</dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="font-semibold text-slate-700 flex items-center gap-1">
                            <span>✨</span>
                            <span>Condición:</span>
                          </dt>
                          <dd>
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 border border-slate-200 text-[10px]">
                              {solMeta.condicion}
                            </span>
                          </dd>
                        </div>
                      </dl>

                      {/* botón centrado */}
                      <div className="mt-4 w-full flex justify-center">
                        <Link
                          to={`/publicaciones/${inter.publicacion_solicitada_id}`}
                          className="btn bg-blue-600 text-white border border-blue-600 hover:bg-white hover:text-blue-600 transition-colors"
                        >
                          Ver publicación
                        </Link>

                      </div>
                    </div>
                  </div>
                </div>

                {/* flecha centrada */}
                <div className="hidden lg:flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4 text-slate-300">
                    <span className="h-12 w-[2px] bg-slate-200 rounded-full" />
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-xl animate-pulse">
                      ⇄
                    </span>
                    <span className="h-12 w-[2px] bg-slate-200 rounded-full" />
                  </div>
                </div>

                {/* ofrecida */}
                <div
                  className={
                    "rounded-2xl border bg-white/95 p-4 md:p-5 flex flex-col h-full transition-all duration-200 hover:shadow-md" +
                    (isOwnerOfOfrecida
                      ? " ring-2 ring-blue-500/80 border-blue-300 bg-blue-50/40"
                      : "")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 text-xs">
                        📤
                      </span>
                      <div className="text-sm font-semibold">
                        Publicación ofrecida
                      </div>
                    </div>
                    {isOwnerOfOfrecida && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 text-white px-2 py-0.5 text-[10px] font-semibold shadow-sm">
                        ⭐ Tu publicación
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-col items-center gap-4">
                    {/* IMG grande y responsiva */}
                    <div className="w-full flex justify-center">
                      <img
                        src={ofrImg || "/img/no-image.png"}
                        alt={
                          pubOfr?.titulo ||
                          `Publicación #${inter.publicacion_ofrecida_id}`
                        }
                        className="w-full max-w-sm aspect-[4/5] object-cover rounded-2xl border shadow-sm"
                      />
                    </div>

                    <div className="w-full">
                      <div className="text-base font-semibold text-slate-900 line-clamp-2">
                        {pubOfr?.titulo ||
                          `Publicación #${inter.publicacion_ofrecida_id}`}
                      </div>

                      {/* Info ordenada */}
                      <dl className="mt-3 space-y-1.5 text-[11px] text-slate-600">
                        <div className="flex gap-1.5">
                          <dt className="font-semibold text-slate-700 flex items-center gap-1">
                            <span>📚</span>
                            <span>Categoría:</span>
                          </dt>
                          <dd className="truncate">{ofrMeta.categoria}</dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="font-semibold text-slate-700 flex items-center gap-1">
                            <span>🏷️</span>
                            <span>Tipo:</span>
                          </dt>
                          <dd>{ofrMeta.tipo}</dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="font-semibold text-slate-700 flex items-center gap-1">
                            <span>✨</span>
                            <span>Condición:</span>
                          </dt>
                          <dd>
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 border border-slate-200 text-[10px]">
                              {ofrMeta.condicion}
                            </span>
                          </dd>
                        </div>
                      </dl>

                      {/* botón centrado */}
                      <div className="mt-4 w-full flex justify-center">
                        <Link
                          to={`/publicaciones/${inter.publicacion_ofrecida_id}`}
                          className="inline-flex items-center justify-center rounded-xl px-4 py-1.5 text-xs sm:text-sm font-semibold bg-blue-600 text-white border border-blue-600 hover:bg-white hover:text-blue-600 transition-colors"
                        >
                          Ver publicación
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* contraparte */}
              <div className="mt-7 rounded-2xl border bg-slate-50/90 p-5 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold text-lg">
                      {cpInicial}
                    </div>
                    <div>
                      <h2 className="text-base font-semibold flex items-center gap-2">
                        Datos de la contraparte
                        <span className="text-xs text-slate-400">
                          👥 Persona con quien coordinarás el trueque
                        </span>
                      </h2>
                      {visibleEstado === 2 && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                          ✅ Intercambio finalizado
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {cp ? (
                  <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)] items-start">
                    {/* Info principal */}
                    <div className="space-y-2 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-base">👤</span>
                        <span className="font-semibold">
                          {cpNombre || `Usuario #${cp.id}`}
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 text-base mt-[2px]">
                          📍
                        </span>
                        <div>
                          <span className="font-medium text-slate-600">
                            Vivienda:
                          </span>{" "}
                          <span>{cpDireccion}</span>
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-slate-500 leading-relaxed max-w-xl">
                        Coordinen un lugar y horario seguro dentro de la comunidad
                        (por ejemplo, accesos principales o zonas comunes
                        concurridas). Evita compartir información sensible como
                        claves, coordenadas exactas de GPS u otros datos privados.
                      </p>
                    </div>

                    {/* --- INICIO DE LA MODIFICACIÓN (TARJETA CONTACTO HOVER) --- */}
                    <div
                      className="
                        rounded-2xl bg-white border border-slate-200 p-4
                        flex flex-col gap-3
                        md:self-start md:-mt-8 lg:-mt-10
                        transition-all duration-300 hover:shadow-xl hover:-translate-y-2
                      "
                    >
                    {/* --- FIN DE LA MODIFICACIÓN --- */}
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                          📱
                        </span>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            Contacto
                          </span>
                          <span className="text-sm text-slate-800">
                            {tieneTelefono ? cpTelefono : "Teléfono no disponible"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-1">
                      {tieneTelefono && (
                        <>
                          {telHref && (
                            <a
                              href={telHref}
                              className="inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white border border-blue-600 hover:bg-white hover:text-blue-600 transition-colors"
                            >
                              📞 Llamar
                            </a>
                          )}

                          {waHref && (
                            <a
                              href={waHref}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold bg-emerald-500 text-white border border-emerald-500 hover:bg-white hover:text-emerald-600 transition-colors"
                            >
                              💬 WhatsApp
                            </a>
                          )}
                        </>
                      )}

                        {ownerProfileUrl && (
                          <Link
                            to={ownerProfileUrl}
                            className="inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white border border-slate-900 hover:bg-white hover:text-slate-900 transition-colors"
                          >
                            👀 Ver perfil
                          </Link>
                        )}
                      </div>

                      <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                        Usa los datos de contacto solo para coordinar este
                        intercambio. Si detectas comportamiento sospechoso, puedes
                        bloquear al usuario o reportarlo al administrador de tu
                        comunidad.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-sm">
                    No hay datos de contraparte disponibles (puede estar
                    cancelado).
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Modal de confirmación */}
          <ConfirmModal
            open={modalOpen}
            title={modal.title}
            message={modal.message}
            tone={modalTone}
            confirmText={
              modal.action === "cancelar"
                ? "Sí, cancelar"
                : modal.action === "realizado"
                ? "Sí, marcar"
                : "Sí, aceptar"
            }
            cancelText="Volver"
            onConfirm={doModalAction}
            onCancel={() => setModalOpen(false)}
            disabled={busy}
          />

          {/* Modal de calificación */}
          <RatingModal
            open={ratingOpen}
            onClose={() => setRatingOpen(false)}
            onSubmit={enviarValoracion}
            busy={ratingBusy}
            error={ratingErr}
          />
        </div>
      </div>
    </div>
  );
}