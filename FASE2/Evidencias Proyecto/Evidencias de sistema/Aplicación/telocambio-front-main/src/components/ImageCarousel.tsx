// src/components/ImageCarousel.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";

export type CarouselImage = { id?: number; url: string; alt?: string };

type Props = {
  images: CarouselImage[];
  aspect?: string;                // e.g., "aspect-[4/3]" | "md:aspect-square"
  rounded?: string;               // e.g., "rounded-2xl"
  showThumbnails?: boolean;
  className?: string;
  /** Si true, permite abrir la imagen en overlay/lightbox al hacer click */
  enableLightbox?: boolean;
};

export default function ImageCarousel({
  images,
  aspect = "aspect-[4/3] md:aspect-square",
  rounded = "rounded-2xl",
  showThumbnails = true,
  className = "",
  enableLightbox = true,
}: Props) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false); // lightbox
  const len = images?.length || 0;
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const deltaX = useRef(0);

  const safeImages = useMemo(
    () => (Array.isArray(images) ? images.filter((i) => !!i?.url) : []),
    [images]
  );

  useEffect(() => {
    if (index >= safeImages.length) setIndex(0);
  }, [safeImages.length, index]);

  // Key navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!safeImages.length) return;
      if (open) {
        if (e.key === "Escape") setOpen(false);
        if (e.key === "ArrowRight") setIndex((i) => Math.min(safeImages.length - 1, i + 1));
        if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      } else {
        if (e.key === "ArrowRight") setIndex((i) => Math.min(safeImages.length - 1, i + 1));
        if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [safeImages.length, open]);

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    deltaX.current = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    deltaX.current = e.touches[0].clientX - startX.current;
  };
  const onTouchEnd = () => {
    if (startX.current == null) return;
    const threshold = 50;
    if (deltaX.current > threshold) setIndex((i) => Math.max(0, i - 1));
    else if (deltaX.current < -threshold) setIndex((i) => Math.min(safeImages.length - 1, i + 1));
    startX.current = null;
    deltaX.current = 0;
  };

  if (!safeImages.length) {
    return (
      <div className={`${aspect} ${rounded} bg-gray-100 grid place-items-center ${className}`}>
        <span className="text-gray-400">Sin imágenes</span>
      </div>
    );
  }

  return (
    <>
      <div className={`w-full ${className}`}>
        <div
          ref={containerRef}
          className={`relative overflow-hidden bg-white border ${rounded}`}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className={`relative ${aspect}`}>
            <img
              src={safeImages[index]?.url}
              alt={safeImages[index]?.alt ?? `Imagen ${index + 1}`}
              className={`absolute inset-0 w-full h-full object-cover ${enableLightbox ? "cursor-zoom-in" : ""}`}
              draggable={false}
              onClick={() => enableLightbox && setOpen(true)}
            />

            {/* Controls */}
            {len > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-gray-700 rounded-full w-9 h-9 grid place-items-center shadow"
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  aria-label="Anterior"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-gray-700 rounded-full w-9 h-9 grid place-items-center shadow"
                  onClick={() => setIndex((i) => Math.min(len - 1, i + 1))}
                  aria-label="Siguiente"
                >
                  ›
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {safeImages.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-4 rounded-full ${
                        i === index ? "bg-white shadow" : "bg-black/30"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Thumbnails */}
        {showThumbnails && len > 1 && (
          <div className="mt-3 flex gap-2 justify-center">
            {safeImages.map((img, i) => (
              <button
                key={img.id ?? `${img.url}-${i}`}
                type="button"
                className={`h-16 min-w-20 w-20 overflow-hidden rounded-lg border ${
                  i === index ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() => setIndex(i)}
                aria-label={`Ver imagen ${i + 1}`}
              >
                <img src={img.url} alt={`Miniatura ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {enableLightbox && open && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/70"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed inset-0 z-[101] grid place-items-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="relative max-w-5xl w-full">
              <img
                src={safeImages[index]?.url}
                alt={safeImages[index]?.alt ?? `Imagen ${index + 1}`}
                className="w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                draggable={false}
              />
              {/* Close */}
              <button
                type="button"
                className="absolute -top-3 -right-3 bg-white text-gray-700 rounded-full w-9 h-9 shadow hover:bg-gray-50"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>
              {/* Nav */}
              {len > 1 && (
                <>
                  <button
                    type="button"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-700 rounded-full w-10 h-10 grid place-items-center shadow"
                    onClick={() => setIndex((i) => Math.max(0, i - 1))}
                    aria-label="Anterior"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-700 rounded-full w-10 h-10 grid place-items-center shadow"
                    onClick={() => setIndex((i) => Math.min(len - 1, i + 1))}
                    aria-label="Siguiente"
                  >
                    ›
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
