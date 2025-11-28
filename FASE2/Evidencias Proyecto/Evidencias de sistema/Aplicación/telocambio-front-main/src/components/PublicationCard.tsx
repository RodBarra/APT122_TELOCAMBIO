// src/components/PublicationCard.tsx
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import type { PublicacionListItem } from "../types";

type Props = {
  item: PublicacionListItem;
  showActions?: boolean;
  onEdit?: (id: number) => void;
  onToggleVisibility?: (item: PublicacionListItem) => Promise<void> | void;
  onDone?: (id: number) => Promise<void> | void; // compatibilidad
  onDelete?: (id: number) => Promise<void> | void; // abre modal en el padre
  highlight?: string;
};

const ESTADO_LABEL: Record<number, string> = {
  1: "Activa",
  2: "Oculta",
  3: "Realizada",
};

function Highlight({ text, needle }: { text: string; needle?: string }) {
  if (!needle) return <>{text}</>;

  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, "ig");
  const parts = text.split(re);

  return (
    <>
      {parts.map((part, idx) =>
        idx % 2 === 1 ? (
          <mark key={idx} className="bg-yellow-200/70 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={idx}>{part}</span>
        )
      )}
    </>
  );
}

export default function PublicationCard({
  item,
  showActions = false,
  onEdit,
  onToggleVisibility,
  onDone,
  onDelete,
  highlight,
}: Props) {
  const img =
    item.primera_imagen && item.primera_imagen.trim().length > 0
      ? item.primera_imagen
      : "/img/no-image.png";

  // Total de imágenes (soporta distintos formatos desde el backend)
  const totalImagenes: number | null =
    typeof (item as any).imagenes_count === "number"
      ? (item as any).imagenes_count
      : Array.isArray((item as any).imagenes)
      ? (item as any).imagenes.length
      : null;

  const estadoTxt = ESTADO_LABEL[item.estado_publicacion_id] ?? "—";
  const isOculta = item.estado_publicacion_id === 2;
  const toggleTitle = isOculta ? "Hacer visible" : "Ocultar publicación";
  const enIntercambio = item.intercambio_en_progreso === true;

  const estadoChipClass = useMemo(() => {
    if (item.estado_publicacion_id === 2) return "bg-amber-500 text-white";
    if (item.estado_publicacion_id === 3) return "bg-emerald-700 text-white";
    return "bg-slate-700 text-white";
  }, [item.estado_publicacion_id]);

  const ofertasCount =
    typeof (item as any).ofertas_count_pendientes === "number"
      ? (item as any).ofertas_count_pendientes
      : typeof (item as any).ofertas_count_total === "number"
      ? (item as any).ofertas_count_total
      : null;

  const fechaStr = useMemo(() => {
    try {
      return new Date(item.creada_en).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "";
    }
  }, [item.creada_en]);

  return (
    <div
        className={`rounded-2xl border shadow-sm overflow-hidden flex flex-col 
                    bg-white/95 backdrop-blur-[1px]
                    hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200
                    ${enIntercambio ? "border-blue-300 bg-blue-50/60" : "border-slate-200"}`}
      >
      <Link
        to={`/publicaciones/${item.id}`}
        className="block group focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-white"
      >
        <div className="relative bg-gradient-to-b from-slate-100 to-white">
      {/* marco suave / “passepartout” */}
      <div className="p-2">
        <div className="aspect-[4/3] md:aspect-square overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)]">
          <img
            src={img}
            alt={item.titulo}
            className="w-full h-full object-cover object-center select-none transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        </div>
      </div>

          {item.estado_publicacion_id !== 1 && (
            <span
              className={[
                "absolute top-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-sm",
                estadoChipClass,
              ].join(" ")}
              title={`Estado: ${estadoTxt}`}
              aria-label={`Estado: ${estadoTxt}`}
            >
              {estadoTxt}
            </span>
          )}

          {ofertasCount !== null && (
            <span
              className="absolute top-2 right-2 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/90 text-slate-700 border border-slate-200 shadow-sm"
              title="Ofertas recibidas"
            >
              <span>Ofertas de Trueque</span>
              <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 rounded-full bg-blue-600 text-white text-[11px] font-semibold px-1">
                {ofertasCount}
              </span>
            </span>
          )}

          {/* Indicador de cantidad de imágenes (solo si hay más de una) */}
          {totalImagenes !== null && totalImagenes > 1 && (
            <span
              className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full 
                         bg-black/55 text-white shadow-sm backdrop-blur-sm"
              title={`Esta publicación tiene ${totalImagenes} imágenes`}
            >
              <span aria-hidden="true">🖼️</span>
              <span>
                1<span className="mx-0.5">/</span>
                {totalImagenes}
              </span>
            </span>
          )}
        </div>

        <div className="p-3">
          <h3 className="font-semibold leading-snug text-slate-900 line-clamp-2 min-h-[2.5rem]">
            <Highlight text={item.titulo} needle={highlight} />
          </h3>

          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
            <span aria-hidden="true">📅</span>
            <span>{fechaStr}</span>
          </div>

          {/* ⭐ NUEVO: aviso de intercambio en proceso */}
          {enIntercambio && (
            <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-[11px] px-3 py-1.5 flex items-center gap-2">
              <span className="text-base" aria-hidden="true">
                🔄
              </span>
              <span className="leading-snug">
                Esta publicación está{" "}
                <b>en proceso de intercambio</b>.
              </span>
            </div>
          )}
        </div>
      </Link>

      {showActions && (
  <div className="mt-auto border-t border-slate-200 bg-slate-50 px-3 py-3">
    {/* Desktop / tablet grande: 3 botones en fila */}
    <div className="hidden sm:flex items-center gap-2 flex-nowrap justify-center">
      <button
        type="button"
        className="inline-flex items-center justify-center px-2.5 py-1.5 text-[11px] font-semibold rounded-lg 
                   bg-white text-blue-500 border border-blue-500 
                   hover:bg-blue-500 hover:text-white transition-colors"
        onClick={() => onEdit && onEdit(item.id)}
      >
        ✏️ Editar
      </button>

      <button
        type="button"
        className="inline-flex items-center justify-center px-2.5 py-1.5 text-[11px] font-semibold rounded-lg 
                   bg-white text-blue-500 border border-blue-500 
                   hover:bg-blue-500 hover:text-white transition-colors"
        onClick={() => onToggleVisibility && onToggleVisibility(item)}
        title={toggleTitle}
      >
        {isOculta ? "👁️ Mostrar" : "🙈 Ocultar"}
      </button>

      <button
        type="button"
        className="inline-flex items-center justify-center px-3 py-1.5 text-[11px] font-semibold rounded-lg 
                   bg-rose-600 text-white border border-rose-600 
                   hover:bg-white hover:text-rose-600 transition-colors"
        onClick={() => onDelete && onDelete(item.id)}
        title="Eliminar publicación"
      >
        🗑️ Eliminar
      </button>
    </div>

    {/* Mobile: Editar + Ocultar arriba, Eliminar abajo centrado */}
    <div className="flex sm:hidden flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 inline-flex items-center justify-center px-2.5 py-1.5 text-[11px] font-semibold rounded-lg 
                     bg-white text-blue-500 border border-blue-500 
                     hover:bg-blue-500 hover:text-white transition-colors"
          onClick={() => onEdit && onEdit(item.id)}
        >
          ✏️ Editar
        </button>

        <button
          type="button"
          className="flex-1 inline-flex items-center justify-center px-2.5 py-1.5 text-[11px] font-semibold rounded-lg 
                     bg-white text-blue-500 border border-blue-500 
                     hover:bg-blue-500 hover:text-white transition-colors"
          onClick={() => onToggleVisibility && onToggleVisibility(item)}
          title={toggleTitle}
        >
          {isOculta ? "👁️ Mostrar" : "🙈 Ocultar"}
        </button>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          className="w-full max-w-[150px] inline-flex items-center justify-center px-3 py-1.5 text-[11px] font-semibold rounded-lg 
                     bg-rose-600 text-white border border-rose-600 
                     hover:bg-white hover:text-rose-600 transition-colors"
          onClick={() => onDelete && onDelete(item.id)}
          title="Eliminar publicación"
        >
          🗑️ Eliminar
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
