import React, { useEffect, useRef } from "react";

type Tone = "danger" | "warning" | "success" | "neutral";

type Props = {
  open: boolean;
  title?: string;
  /** Si pasas children, `message` se ignora. */
  message?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Cambia colores del header y botón confirmar */
  tone?: Tone;
  /** Deshabilita botones mientras se procesa */
  disabled?: boolean;
  children?: React.ReactNode;
};

const toneStyles: Record<
  Tone,
  {
    accent: string; // fondo del header
    accentLight: string; // fondo del cuerpo
    border: string;
    iconBg: string;
    title: string;
    subtitle: string;
    text: string;
    confirmBtn: string;
    cancelBtn: string;
    subtitleText: string;
  }
> = {
  danger: {
    accent: "bg-rose-600",
    accentLight: "bg-rose-50",
    border: "border-rose-200",
    iconBg: "bg-rose-500",
    title: "text-white",
    subtitle: "text-rose-100",
    text: "text-rose-900",
    confirmBtn:
      "bg-rose-600 text-white border border-rose-600 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-white hover:text-rose-600 hover:border-rose-600 transition-colors",
    cancelBtn:
      "bg-white text-slate-800 border border-slate-300 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-slate-50 hover:border-slate-400 transition-colors",
  },
  warning: {
    accent: "bg-amber-500",
    accentLight: "bg-amber-50",
    border: "border-amber-200",
    iconBg: "bg-amber-400",
    title: "text-white",
    subtitle: "text-amber-100",
    text: "text-amber-900",
    confirmBtn:
      "bg-amber-500 text-white border border-amber-500 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-white hover:text-amber-600 hover:border-amber-500 transition-colors",
    cancelBtn:
      "bg-white text-slate-800 border border-slate-300 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-slate-50 hover:border-slate-400 transition-colors",
    subtitleText: "Revisa bien antes de continuar.",
  },
  success: {
    accent: "bg-emerald-600",
    accentLight: "bg-emerald-50",
    border: "border-emerald-200",
    iconBg: "bg-emerald-500",
    title: "text-white",
    subtitle: "text-emerald-100",
    text: "text-emerald-900",
    confirmBtn:
      "bg-emerald-600 text-white border border-emerald-600 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-white hover:text-emerald-600 hover:border-emerald-600 transition-colors",
    cancelBtn:
      "bg-white text-slate-800 border border-slate-300 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-slate-50 hover:border-slate-400 transition-colors",
    subtitleText: "Confirma para continuar.",
  },
  neutral: {
    accent: "bg-slate-700",
    accentLight: "bg-slate-50",
    border: "border-slate-200",
    iconBg: "bg-slate-600",
    title: "text-white",
    subtitle: "text-slate-200",
    text: "text-slate-900",
    confirmBtn:
      "bg-slate-700 text-white border border-slate-700 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-white hover:text-slate-800 hover:border-slate-700 transition-colors",
    cancelBtn:
      "bg-white text-slate-800 border border-slate-300 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-slate-50 hover:border-slate-400 transition-colors",
    subtitleText: "Confirma la acción.",
  },
};

export default function ConfirmModal({
  open,
  title = "Confirmar acción",
  message = "¿Deseas continuar?",
  confirmText = "Sí, continuar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
  tone = "neutral",
  disabled = false,
  children,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Cerrar con ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  // Enfocar botón confirmar al abrir
  useEffect(() => {
    if (open) setTimeout(() => confirmBtnRef.current?.focus(), 0);
  }, [open]);

  if (!open) return null;

  const t = toneStyles[tone];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/40"
        aria-hidden
        onClick={onCancel}
      />
      {/* Panel */}
      <div
        className="fixed inset-0 z-[101] grid place-items-center p-4"
        role="dialog"
        aria-modal="true"
      >
        <div
          ref={panelRef}
          className={`w-full max-w-md rounded-3xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.35)] border ${t.border}`}
        >
          {/* HEADER rojo con esquinas redondeadas y sin icono cortado */}
          <div
            className={`relative ${t.accent} px-6 pt-6 pb-5 text-center rounded-t-3xl`}
          >
            {/* Icono dentro del header, centrado */}
            <div className="flex justify-center mb-2">
              <div className="rounded-full bg-white shadow-md p-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${t.iconBg} text-white text-base`}
                >
                  ⚠️
                </div>
              </div>
            </div>

            <h2 className={`text-base sm:text-lg font-semibold ${t.title}`}>
              {title}
            </h2>
            <p className={`mt-1 text-xs sm:text-sm ${t.subtitle}`}>
              {t.subtitleText}
            </p>

            {/* Botón cerrar */}
            <button
              className="absolute right-4 top-4 rounded-full bg-white/10 px-2 py-1 text-sm text-white hover:bg-white/20"
              onClick={onCancel}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          {/* CUERPO */}
          <div className={`${t.accentLight} px-6 py-5`}>
            <div className={`text-sm leading-relaxed ${t.text} text-center space-y-1`}>
              {children ?? message}
            </div>
          </div>

          {/* BOTONES */}
          <div className="flex items-center justify-center gap-3 px-6 py-4 bg-white border-t">
            <button
              className={`${t.cancelBtn} disabled:opacity-60`}
              onClick={onCancel}
              disabled={disabled}
            >
              {cancelText}
            </button>
            <button
              ref={confirmBtnRef}
              className={`${t.confirmBtn} disabled:opacity-60 flex items-center gap-2`}
              onClick={onConfirm}
              disabled={disabled}
              aria-busy={disabled || undefined}
            >
              {tone === "danger" && <span>🗑️</span>}
              <span>{confirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
