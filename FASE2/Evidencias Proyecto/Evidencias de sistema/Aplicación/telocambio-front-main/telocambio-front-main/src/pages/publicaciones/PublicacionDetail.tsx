// src/pages/publicaciones/PublicacionDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Spinner from "../../components/Spinner";
import { AlertErr } from "../../components/Alert";
import ImageCarousel from "../../components/ImageCarousel";
import OfferModal from "../../components/OfferModal";
import ConfirmModal from "../../components/ConfirmModal";
import { getCategorias, getPublicacion } from "../../services/publicaciones";
import {
  createIntercambio,
  listIntercambios,
  accionIntercambio,
  getIntercambio,
  confirmarRealizado,
  valorarIntercambio,
  getMiValoracion,
} from "../../services/intercambios";
import { useAuth } from "../../context/AuthContext";
import type { Categoria, Publicacion, Intercambio } from "../../types";

/* ───────────────── chips ───────────────── */
function StatusChip({ estado }: { estado: number }) {
  const map: Record<number, { text: string; cls: string }> = {
    1: { text: "Pendiente", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    4: { text: "Aceptado", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    2: { text: "Finalizado", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    3: { text: "Cancelado", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  };
  const o = map[estado] ?? { text: "—", cls: "bg-gray-100 text-gray-600 border-gray-200" };
  return <span className={`text-xs px-2 py-1 rounded border ${o.cls}`}>{o.text}</span>;
}

function PubStatusChip({ estado }: { estado: number }) {
  const map: Record<number, { text: string; cls: string }> = {
    1: { text: "Activa", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    2: { text: "Oculta", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    3: { text: "Realizada", cls: "bg-gray-100 text-gray-700 border-gray-200" },
  };
  const o = map[estado] ?? { text: "—", cls: "bg-gray-100 text-gray-600 border-gray-200" };
  return <span className={`text-[11px] px-1.5 py-0.5 rounded border ${o.cls}`}>{o.text}</span>;
}

function metaFmt(dateStr?: string) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

/* ───────────────── rating modal (inline) ───────────────── */

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
      className="text-2xl leading-none"
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border">
        <div className="px-5 py-4 border-b">
          <h3 className="text-lg font-semibold">Calificar contraparte</h3>
          <p className="text-sm text-slate-600 mt-1">
            Valora tu experiencia con este usuario (1 a 5 estrellas). Opcionalmente, deja un
            comentario.
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-2 justify-center">
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

          <div>
            <label className="text-sm font-medium text-slate-700">
              Comentario (opcional)
            </label>
            <textarea
              className="input mt-1 w-full min-h-[96px]"
              placeholder="Ej: Me entregó el producto muy rápido y en excelente estado."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              maxLength={500}
            />
            <div className="mt-1 text-right text-xs text-slate-400">
              {comentario.length}/500
            </div>
          </div>

          {error && (
            <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t flex items-center justify-end gap-2">
          <button
            className="btn bg-white text-blue-500 border border-blue-500 hover:bg-blue-500 hover:text-white transition-colors"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          <button
            className="btn bg-white text-blue-500 border border-blue-500 hover:bg-blue-500 hover:text-white transition-colors disabled:opacity-60"
            onClick={async () => {
              if (rating < 1 || rating > 5) return;
              await onSubmit(
                rating,
                comentario?.trim() ? comentario.trim() : undefined
              );
            }}
            disabled={busy || rating < 1}
          >
            {busy ? "Enviando…" : "Enviar valoración"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── helpers ───────────────── */
type PubMini = Pick<
  Publicacion,
  "id" | "titulo" | "estado_publicacion_id"
> & { primera_imagen?: string | null };

function toMini(pub?: Publicacion | null): PubMini | undefined {
  if (!pub) return undefined;
  const primera = pub.imagenes?.[0]?.url ?? null;
  return {
    id: pub.id,
    titulo: pub.titulo,
    estado_publicacion_id: pub.estado_publicacion_id,
    primera_imagen: primera,
  };
}

function mapOfferErrorMessage(raw?: string): string {
  const msg = (raw || "").toLowerCase();

  if (msg.includes("existe una oferta") && msg.includes("cualquier sentido")) {
    return "Ya existe una oferta entre estas dos publicaciones. No puedes duplicarla en sentido inverso.";
  }
  if (msg.includes("rechaz") || msg.includes("cancel")) {
    return "Esa combinación ya fue rechazada/cancelada. Te sugerimos ofrecer otra publicación.";
  }
  if (msg.includes("misma oferta") || msg.includes("repetir") || msg.includes("pendiente")) {
    return "Ya tienes una oferta igual pendiente. Espera la respuesta o cancélala antes de intentar nuevamente.";
  }
  if (msg.includes("dueño") || msg.includes("propietario")) {
    return "No puedes ofrecer a tu propia publicación.";
  }
  if (msg.includes("comunidad")) {
    return "El trueque debe ser dentro de tu comunidad.";
  }
  return "No se pudo crear el trueque. Inténtalo nuevamente.";
}

/* ───────────────── componente ───────────────── */
export default function PublicacionDetail() {
  const { id } = useParams();
  const pubId = Number(id);
  const nav = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [pub, setPub] = useState<Publicacion | null>(null);
  const [cats, setCats] = useState<Categoria[]>([]);

  // Ofertas
  const [misOfertas, setMisOfertas] = useState<Intercambio[]>([]);
  const [ofertasRecibidas, setOfertasRecibidas] = useState<Intercambio[]>([]);
  const [loadingOfertas, setLoadingOfertas] = useState(false);
  const [loadingRecibidas, setLoadingRecibidas] = useState(false);

  // Modal ofrecer
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [pendingMyOfferIds, setPendingMyOfferIds] = useState<number[]>([]);

  // Confirmación aceptar/cancelar
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTone, setConfirmTone] =
    useState<"success" | "danger">("success");
  const [confirmText, setConfirmText] = useState<{
    title: string;
    message: string;
    action: "aceptar" | "cancelar";
  } | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<number | null>(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  // Caché local pub
  const [pubCache, setPubCache] = useState<Record<number, PubMini>>({});

  // Cargar publicación + catálogo
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const [catsData, pubData] = await Promise.all([
          getCategorias(),
          getPublicacion(pubId),
        ]);
        setCats(catsData);
        setPub(pubData);
        const mini = toMini(pubData);
        if (mini) setPubCache((m) => ({ ...m, [mini.id]: mini }));
      } catch (e: any) {
        setErr(e?.message || "Error al cargar la publicación.");
      } finally {
        setLoading(false);
      }
    })();
  }, [pubId]);

  const soyDueno = !!user && pub && user.id === pub.propietario_usuario_id;

  // Mis ofertas (outbox)
  useEffect(() => {
    if (!user || !pubId || soyDueno) return;
    (async () => {
      try {
        setLoadingOfertas(true);
        const data = await listIntercambios({
          box: "outbox",
          publicacion_solicitada_id: pubId,
          page_size: 100,
        });
        const rows = Array.isArray(data)
          ? (data as any)
          : Array.isArray((data as any)?.results)
          ? (data as any).results
          : [];
        setMisOfertas(rows);
        setPendingMyOfferIds(
          rows
            .filter((r: Intercambio) => r.estado_intercambio_id === 1)
            .map((r: Intercambio) => r.publicacion_ofrecida_id)
        );
      } finally {
        setLoadingOfertas(false);
      }
    })();
  }, [user, pubId, soyDueno]);

  // Ofertas recibidas (inbox)
  useEffect(() => {
    if (!user || !pubId || !soyDueno) return;
    (async () => {
      try {
        setLoadingRecibidas(true);
        const data = await listIntercambios({
          box: "inbox",
          publicacion_solicitada_id: pubId,
          page_size: 100,
        });
        const rows = Array.isArray(data)
          ? (data as any)
          : Array.isArray((data as any)?.results)
          ? (data as any).results
          : [];
        setOfertasRecibidas(rows);
      } finally {
        setLoadingRecibidas(false);
      }
    })();
  }, [user, pubId, soyDueno]);

  // Prefetch publicaciones relacionadas
  useEffect(() => {
    const ids = new Set<number>();
    misOfertas.forEach((o) => ids.add(o.publicacion_ofrecida_id));
    ofertasRecibidas.forEach((o) => ids.add(o.publicacion_ofrecida_id));
    const pending = Array.from(ids).filter((id) => !pubCache[id]);
    if (pending.length === 0) return;

    (async () => {
      try {
        const results = await Promise.allSettled(
          pending.map((pid) => getPublicacion(pid))
        );
        const toMerge: Record<number, PubMini> = {};
        results.forEach((res) => {
          if (res.status === "fulfilled") {
            const mini = toMini(res.value);
            if (mini) toMerge[mini.id] = mini;
          }
        });
        if (Object.keys(toMerge).length)
          setPubCache((m) => ({ ...m, ...toMerge }));
      } catch {
        // silent
      }
    })();
  }, [misOfertas, ofertasRecibidas]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ofertas mías RECHAZADAS/CANCELADAS hacia esta publicación
  const rejectedMyOfferIds = useMemo(
    () =>
      misOfertas
        .filter((r) => r.estado_intercambio_id === 3)
        .map((r) => r.publicacion_ofrecida_id),
    [misOfertas]
  );

  // Crear oferta
  const onOfferPick = async (pubOfrecidaId: number) => {
    if (offerSubmitting) return;

    if (rejectedMyOfferIds.includes(pubOfrecidaId)) {
      const titulo = pub?.titulo?.trim() || `Publicación #${pubId}`;
      setOfferError(
        `Tu oferta para “${titulo}” con esa publicación ya fue rechazada/cancelada. Elige otra publicación para ofrecer.`
      );
      return;
    }

    setOfferError(null);
    setOfferSubmitting(true);
    try {
      await createIntercambio({
        publicacion_solicitada_id: pubId,
        publicacion_ofrecida_id: pubOfrecidaId,
      });
      const data = await listIntercambios({
        box: "outbox",
        publicacion_solicitada_id: pubId,
        page_size: 100,
      });
      const rows = Array.isArray(data)
        ? (data as any)
        : Array.isArray((data as any)?.results)
        ? (data as any).results
        : [];
      setMisOfertas(rows);
      setPendingMyOfferIds(
        rows
          .filter((r: Intercambio) => r.estado_intercambio_id === 1)
          .map((r: Intercambio) => r.publicacion_ofrecida_id)
      );
      setOfferOpen(false);
    } catch (e: any) {
      setOfferError(mapOfferErrorMessage(e?.message));
    } finally {
      setOfferSubmitting(false);
    }
  };

  // Back robusto
  const safeBack = () => {
    if (window.history.length > 1) nav(-1);
    else nav("/publicaciones");
  };

  // Acciones Aceptar / Cancelar
  const openConfirm = (o: Intercambio, action: "aceptar" | "cancelar") => {
    setSelectedOfferId(o.id);
    if (action === "aceptar") {
      setConfirmTone("success");
      setConfirmText({
        title: "Aceptar intercambio",
        message:
          "¿Confirmas que deseas aceptar este trueque? Se marcarán ambas publicaciones como realizadas.",
        action: "aceptar",
      });
    } else {
      setConfirmTone("danger");
      setConfirmText({
        title: "Rechazar (cancelar) intercambio",
        message:
          "¿Deseas rechazar este trueque? La oferta pasará a estado cancelado.",
        action: "cancelar",
      });
    }
    setConfirmOpen(true);
  };

  const doConfirmAction = async () => {
    if (!selectedOfferId || !confirmText) return;
    setConfirmSubmitting(true);
    try {
      await accionIntercambio(selectedOfferId, confirmText.action);
      if (soyDueno) {
        const inbox = await listIntercambios({
          box: "inbox",
          publicacion_solicitada_id: pubId,
          page_size: 100,
        });
        const rowsI = Array.isArray(inbox)
          ? (inbox as any)
          : Array.isArray((inbox as any)?.results)
          ? (inbox as any).results
          : [];
        setOfertasRecibidas(rowsI);
      } else {
        const out = await listIntercambios({
          box: "outbox",
          publicacion_solicitada_id: pubId,
          page_size: 100,
        });
        const rowsO = Array.isArray(out)
          ? (out as any)
          : Array.isArray((out as any)?.results)
          ? (out as any).results
          : [];
        setMisOfertas(rowsO);
      }
    } catch (e: any) {
      alert(e?.message || "No se pudo actualizar el intercambio.");
    } finally {
      setConfirmSubmitting(false);
      setConfirmOpen(false);
      setSelectedOfferId(null);
    }
  };

  const images = useMemo(
    () =>
      (pub?.imagenes ?? []).slice(0, 4).map((x) => ({
        id: x.id,
        url: x.url,
        alt: pub?.titulo ?? `Imagen ${x.posicion + 1}`,
      })),
    [pub]
  );

  const categoriaNombre = useMemo(() => {
    if (!pub) return "—";
    const c = cats.find((x) => x.id === pub.categoria_id);
    return c?.nombre ?? `#${pub.categoria_id}`;
  }, [cats, pub]);

  const autorNombre = (pub?.propietario_nombre ?? "").trim();
  const autorApellidos = (pub?.propietario_apellidos ?? "").trim();
  const autorInicial = (
    autorNombre || autorApellidos
      ? (autorNombre || autorApellidos)[0]
      : "U"
  ).toUpperCase();

  const isBloqueada = !!pub?.bloqueada;
  const puedeEditar =
    !!user &&
    (user.rol_usuario_id === 1 ||
      user.rol_usuario_id === 2 ||
      (pub && pub.propietario_usuario_id === user.id)) &&
    pub?.estado_publicacion_id !== 3 &&
    !isBloqueada;

  const blockedIds = useMemo(
    () => Array.from(new Set([...pendingMyOfferIds, ...rejectedMyOfferIds])),
    [pendingMyOfferIds, rejectedMyOfferIds]
  );

  const bgUrl = "/bg-publicaciones.png";

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

  if (err || !pub) {
    return (
      <div className="relative min-h-screen antialiased">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: `url('${bgUrl}')` }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/40 via-slate-900/10 to-slate-900/40" />
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="rounded-2xl bg-white/85 backdrop-blur-xl shadow-2xl ring-1 ring-black/5 p-6 md:p-8">
            <AlertErr>{err || "No se encontró la publicación."}</AlertErr>
          </div>
        </div>
      </div>
    );
  }

  const OfferCard = ({ o }: { o: Intercambio }) => {
    const mini = pubCache[o.publicacion_ofrecida_id];
    const estado = o.estado_intercambio_id;

    const isPendiente = estado === 1;
    const showActions = soyDueno && isPendiente;

    // Fondo según estado
    const bgByEstado = {
      1: "bg-amber-50/50 border-amber-200",      // Pendiente
      4: "bg-blue-50/60 border-blue-200",        // Aceptado
      2: "bg-emerald-50/60 border-emerald-200",  // Finalizado
      3: "bg-rose-50/60 border-rose-200",        // Cancelado
    }[estado] ?? "bg-slate-50 border-slate-200";

    return (
      <li
        className={`w-full rounded-2xl border p-4 shadow-sm
                    transition-all duration-200
                    hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white/90
                    ${bgByEstado}`}
      >
        {/* Layout interno: columna en mobile, fila en sm+ */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          {/* Imagen */}
          <div className="w-full sm:w-auto flex justify-center sm:block">
            <img
              src={mini?.primera_imagen || "/img/no-image.png"}
              alt={mini?.titulo || `Publicación`}
              className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl border shadow-sm"
            />
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            {/* Título + meta + estado */}
            <div className="min-w-0">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm truncate">
                    {mini?.titulo || `Publicación #${o.publicacion_ofrecida_id}`}
                  </h4>

                  <p className="text-xs text-gray-600 mt-0.5">
                    Oferta #{o.id} • creada {metaFmt((o as any).creada_en)}
                  </p>
                </div>

                {/* Chip de estado: debajo del título en mobile, a la derecha en desktop */}
                <div className="mt-1 sm:mt-0 sm:ml-2 self-start">
                  <StatusChip estado={estado} />
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="mt-3 flex flex-wrap gap-2">
              {/* Botón principal — Ver Intercambio (azul) */}
              <Link
                to={`/intercambios/${o.id}`}
                className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold
                          bg-blue-600 text-white border border-blue-600
                          hover:bg-white hover:text-blue-600
                          transition-all duration-200"
              >
                🔄 Ver intercambio
              </Link>

              {/* Aceptar / Rechazar (solo dueño, se mantiene igual) */}
              {showActions && (
                <>
                  <button
                    className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold 
                              bg-blue-600 text-white border border-blue-600
                              hover:bg-white hover:text-blue-600
                              transition-all duration-200"
                    onClick={() => openConfirm(o, "aceptar")}
                  >
                    ✔ Aceptar
                  </button>

                  <button
                    className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold 
                              bg-white text-rose-600 border border-rose-600
                              hover:bg-rose-600 hover:text-white
                              transition-all duration-200"
                    onClick={() => openConfirm(o, "cancelar")}
                  >
                    ✖ Rechazar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </li>
    );
  };


  const ownerProfileUrl = `/perfil/${pub.propietario_usuario_id}`;

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
          {/* Header desktop */}
          <div className="hidden sm:flex items-center justify-between mb-6">
            <button
              className="inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-sm font-semibold 
                         bg-blue-600 text-white border border-blue-600 
                         hover:bg-white hover:text-blue-600 hover:border-blue-600 transition-colors"
              onClick={safeBack}
            >
              ← Volver
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Detalle de publicación 📦
            </h1>
            <div aria-hidden="true" />
          </div>

          {/* Header mobile */}
          <div className="sm:hidden mb-6 space-y-2">
            <button
              className="inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-sm font-semibold 
                         bg-blue-600 text-white border border-blue-600 
                         hover:bg-white hover:text-blue-600 hover:border-blue-600 transition-colors"
              onClick={safeBack}
            >
              ← Volver
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              Detalle de publicación 📦
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Galería */}
            <div className="lg:col-span-7">
              <ImageCarousel
                images={images}
                aspect="aspect-[4/3] md:aspect-square"
              />
            </div>

            {/* Meta + Autor + Acciones */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border shadow-sm p-5 flex flex-col h-full">
                {/* Bloque superior: título + meta + autor */}
                <div className="flex-1 space-y-6">

            {/* TÍTULO + SUBTÍTULO */}
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight leading-snug">
                {pub.titulo}
              </h2>
              <p className="mt-1 text-sm text-gray-500 flex items-center gap-1">
                <span className="text-[15px]">🌟</span>
                Publicación disponible para trueques.
              </p>
            </div>

            {/* INFO GENERAL */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="text-lg">🧩</span> Información de la publicación
              </h3>

              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div className="text-gray-500">Categoría</div>
                <div className="font-medium">{categoriaNombre}</div>

                <div className="text-gray-500">Tipo</div>
                <div className="font-medium">
                  {pub.tipo_publicacion_id === 1
                    ? "Servicio"
                    : pub.tipo_publicacion_id === 2
                    ? "Producto"
                    : "Regalo"}
                </div>

                <div className="text-gray-500">Condición</div>
                <div className="font-medium">
                  {pub.condicion_publicacion_id === 1
                    ? "Nuevo"
                    : pub.condicion_publicacion_id === 2
                    ? "Usado"
                    : "Malo"}
                </div>

                <div className="text-gray-500">Ofertas Totales</div>
                <div className="font-semibold text-blue-600">
                  {pub.ofertas_count_total ?? 0}
                </div>

                <div className="text-gray-500">Pendientes</div>
                <div className="font-semibold text-amber-600">
                  {pub.ofertas_count_pendientes ?? 0}
                </div>
              </div>

              <hr className="border-slate-200" />

              {/* FECHAS */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2 text-gray-500">
                  📅 <span>Creada:</span>
                  <span className="font-medium text-gray-700">
                    {metaFmt((pub as any).creada_en)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-gray-500">
                  🔄 <span>Actualizada:</span>
                  <span className="font-medium text-gray-700">
                    {metaFmt((pub as any).actualizada_en)}
                  </span>
                </div>
              </div>
            </div>

            {/* PUBLICADO POR */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                <span className="text-lg">👤</span> Publicado por
              </h3>

              <Link
                to={ownerProfileUrl}
                className="flex items-center gap-3 group"
              >
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-300 to-blue-500
                                grid place-items-center text-white text-lg font-semibold shadow-sm
                                group-hover:ring-2 group-hover:ring-blue-300 transition">
                  {autorInicial}
                </div>

                <div>
                  <div className="font-semibold text-gray-900 group-hover:underline">
                    {autorNombre || autorApellidos
                      ? `${autorNombre} ${autorApellidos}`.trim()
                      : `Usuario #${pub.propietario_usuario_id}`}
                  </div>
                  <p className="text-xs text-gray-500">Miembro de tu comunidad</p>
                </div>
              </Link>
            </div>

          </div>

                {/* Acciones */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                  {!soyDueno && pub.estado_publicacion_id === 1 && !isBloqueada && (
                    <button
                      className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold 
                                bg-blue-600 text-white border border-blue-600 
                                hover:bg-white hover:text-blue-600 hover:border-blue-600 transition-colors
                                w-full sm:w-auto mx-auto"
                      onClick={() => {
                        setOfferError(null);
                        setOfferOpen(true);
                      }}
                    >
                      Ofrecer publicación
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div className="mt-6 bg-white rounded-2xl border shadow-sm p-5">
            <h2 className="text-base font-semibold mb-2">Descripción</h2>
            <p className="text-gray-700 whitespace-pre-line">
              {pub.descripcion?.trim() || "Sin descripción."}
            </p>
          </div>

          {/* Ofertas */}
          {soyDueno ? (
            <div className="mt-6 bg-white rounded-2xl border shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold">
                  Trueques ofrecidos para esta publicación
                </h2>
                {loadingRecibidas && (
                  <span className="text-xs text-gray-500">Cargando…</span>
                )}
              </div>
              {ofertasRecibidas.length === 0 ? (
                <div className="text-gray-500 text-sm">
                  Aún no has recibido ofertas.
                </div>
              ) : (
                <ul className="grid md:grid-cols-2 gap-3">
                  {ofertasRecibidas.map((o) => (
                    <OfferCard key={o.id} o={o} />
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="mt-6 bg-white rounded-2xl border shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold">
                  📥 Mis trueques ofrecidos a esta publicación 
                </h2>
                {loadingOfertas && (
                  <span className="text-xs text-gray-500">Cargando…</span>
                )}
              </div>
              {misOfertas.length === 0 ? (
                <div className="text-gray-500 text-sm">
                  Aún no has enviado ofertas para esta publicación.
                </div>
              ) : (
                <ul className="grid md:grid-cols-2 gap-3">
                  {misOfertas.map((o) => (
                    <OfferCard key={o.id} o={o} />
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Modal para elegir publicación a ofrecer */}
          <OfferModal
            open={offerOpen}
            onClose={() => {
              if (!offerSubmitting) setOfferOpen(false);
            }}
            onPick={onOfferPick}
            disableIds={blockedIds}
            errorMessage={offerError}
            submitting={offerSubmitting}
          />

          {/* Confirmación aceptar/cancelar */}
          <ConfirmModal
            open={confirmOpen}
            title={confirmText?.title}
            message={confirmText?.message}
            tone={confirmTone}
            confirmText={
              confirmText?.action === "aceptar"
                ? "Sí, aceptar"
                : "Sí, rechazar"
            }
            cancelText="Volver"
            onConfirm={doConfirmAction}
            onCancel={() => setConfirmOpen(false)}
            disabled={confirmSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
