// src/components/form/Field.tsx
import React from "react";

type FieldProps = {
  label?: string;
  /** Contenido del campo (input/select/etc.) */
  children: React.ReactNode;
  /** Texto de ayuda (solo se muestra si no hay error) */
  hint?: string;
  /** Mensaje de error (se muestra una única vez, con alto contraste) */
  error?: string;
  /** (Opcional) id del control para asociar el label via htmlFor */
  htmlFor?: string;
  /** (Opcional) clases extra para el contenedor */
  className?: string;
};

export function Field({
  label,
  children,
  hint,
  error,
  htmlFor,
  className = "",
}: FieldProps) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label}
        </label>
      )}

      {children}

      {/* Hint solo si no hay error */}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}

      {/* Error ÚNICO, con estilo de alto contraste */}
      {error && (
        <div className="mt-1">
          <span
            role="alert"
            className="inline-block text-sm font-semibold text-red-700 bg-red-50/95 border border-red-300 px-2 py-1 rounded-md shadow-sm"
          >
            {error}
          </span>
        </div>
      )}
    </div>
  );
}

export default Field;
