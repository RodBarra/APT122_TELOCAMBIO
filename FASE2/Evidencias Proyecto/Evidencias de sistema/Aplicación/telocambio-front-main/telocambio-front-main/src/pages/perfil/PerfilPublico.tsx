// src/pages/perfil/PerfilPublico.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getUsuarioPublico } from "../../services/usuarios";
import { AlertErr } from "../../components/Alert";

type MiniValoracion = { puntaje: number; comentario?: string; creado_en?: string };

// Toma el primer valor no vacío entre varias llaves
function pick<T = any>(obj: any, ...keys: string[]): T | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v as T;
  }
  return undefined;
}

export default function PerfilPublico() {
  const { id } = useParams();
  const nav = useNavigate();
  const uid = Number(id);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => {
    (async () => {
      setErr(null);
      try {
        setLoading(true);
        const r = await getUsuarioPublico(uid);
        // Soporta respuestas { data: {...} } o planas
        const payload =
          r && typeof r === "object" && "data" in (r as any) ? (r as any).data : r;
        setData(payload);
      } catch (e: any) {
        setErr(e?.message || "No se pudo cargar el perfil.");
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  const safeBack = () => {
    if (window.history.length > 1) nav(-1);
    else nav("/publicaciones");
  };

  if (loading)
    return (
      <div className="relative min-h-screen antialiased">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: "url('/bg-perfiles.png')" }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/45 via-slate-900/10 to-slate-900/45" />
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="rounded-2xl bg-white/85 backdrop-blur-xl shadow-2xl ring-1 ring-black/5 p-6">
            Cargando perfil público…
          </div>
        </div>
      </div>
    );

  if (err)
    return (
      <div className="relative min-h-screen antialiased">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: "url('/bg-perfiles.png')" }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/45 via-slate-900/10 to-slate-900/45" />
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="rounded-2xl bg-white/90 backdrop-blur-xl shadow-2xl ring-1 ring-black/5 p-6">
            <AlertErr>{err}</AlertErr>
          </div>
        </div>
      </div>
    );

  if (!data) return null;

  // ── Normalización de datos básicos ──
  const base = data?.usuario && typeof data.usuario === "object" ? data.usuario : data;

  const nombre =
    pick<string>(base, "nombre", "nombre_usuario", "nombres", "first_name", "name") ||
    pick<string>(data, "nombre", "nombre_usuario", "nombres", "first_name", "name") ||
    "";

  const apellidos =
    [
      pick<string>(base, "apellidos", "apellido", "last_name"),
      [pick<string>(base, "apellido_paterno"), pick<string>(base, "apellido_materno")]
        .filter(Boolean)
        .join(" ") || undefined,
      pick<string>(data, "apellidos", "apellido", "last_name"),
    ].find((s) => s && String(s).trim() !== "") || "";

  const telefono = pick<string>(base, "telefono") ?? pick<string>(data, "telefono") ?? "";
  const correo =
    pick<string>(base, "correo", "email") ?? pick<string>(data, "correo", "email") ?? "";

  const fullName = [nombre, apellidos]
    .map((s) => (s || "").trim())
    .filter(Boolean)
    .join(" ");

  const inicial = (fullName || correo || "U")[0]?.toUpperCase() ?? "U";

  // ── Rol normalizado ──
  const rolNombreFromPayload =
    pick<string>(data, "rol_nombre", "rolNombre", "rol") ??
    pick<string>(base, "rol_nombre", "rolNombre", "rol");

  const rolId = Number(
    pick<any>(data, "rol_usuario_id", "rolId") ??
      pick<any>(base, "rol_usuario_id", "rolId")
  );

  let rolNombre: string;
  if (rolNombreFromPayload && rolNombreFromPayload.trim().length > 0) {
    rolNombre = rolNombreFromPayload;
  } else if (rolId === 1) {
    rolNombre = "Admin";
  } else if (rolId === 2) {
    rolNombre = "Moderador";
  } else if (rolId === 3) {
    rolNombre = "Residente";
  } else {
    rolNombre = "Residente";
  }

  // ── Stats normalizados ──
  const promedio =
    Number(pick<any>(data, "promedio_rating", "rating_promedio", "promedio") ?? 0) || 0;
  const cantidadRatings =
    Number(
      pick<any>(data, "cantidad_ratings", "ratings_count", "calificaciones") ?? 0
    ) || 0;
  const intercambios =
    Number(pick<any>(data, "intercambios_realizados", "intercambios") ?? 0) || 0;
  const publicaciones =
    Number(pick<any>(data, "publicaciones_activas", "publicaciones") ?? 0) || 0;

  // ── Últimas valoraciones ──
  const ultimas_valoraciones: MiniValoracion[] = Array.isArray(
    base?.ultimas_valoraciones
  )
    ? base.ultimas_valoraciones
    : Array.isArray(data?.ultimas_valoraciones)
    ? data.ultimas_valoraciones
    : [];

  const bgUrl = "/bg-perfiles.png";

  return (
    <div className="relative min-h-screen antialiased">
      {/* Fondo ilustración perfiles */}
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url('${bgUrl}')` }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/45 via-slate-900/10 to-slate-900/45" />

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl bg-white/90 backdrop-blur-xl shadow-2xl ring-1 ring-black/5 p-6 md:p-8">
          {/* Header con botón volver + título centrado */}
          <div className="relative flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={safeBack}
              className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium bg-blue-600 text-white border border-blue-600 hover:bg-white hover:text-blue-600 transition-colors"
            >
              &larr; Volver
            </button>

            <h1 className="absolute left-1/2 -translate-x-1/2 text-xl sm:text-2xl font-bold">
              Perfil público
            </h1>

            {/* Espaciador invisible para mantener el título realmente centrado */}
            <div aria-hidden="true" className="w-[80px]" />
          </div>

          {/* Grid principal: Perfil + Resumen */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.3fr)] gap-6">
            {/* Card perfil (solo lectura) */}
            <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 md:p-8 flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="relative mb-4">
                <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-3xl md:text-4xl font-bold text-white shadow-lg ring-4 ring-white/80 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-xl">
                  {inicial}
                </div>
              </div>

              {/* Nombre + Rol */}
              <h2 className="text-lg md:text-xl font-semibold text-slate-900">
                {fullName || "Usuario"}
              </h2>
              <div className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200 gap-1">
                <span className="text-xs">🏡</span>
                <span>{rolNombre}</span>
              </div>

              <p className="mt-3 max-w-md text-xs sm:text-sm text-slate-500">
                Este es el perfil público que otros residentes ven al coordinar trueques
                con esta persona dentro de la comunidad.
              </p>

              {/* Datos de contacto (solo lectura) */}
              <div className="mt-6 w-full max-w-lg space-y-3 text-left">
                <InfoRow label="Nombre completo">
                  {fullName || "No informado"}
                </InfoRow>
                <InfoRow label="Correo electrónico">
                  {correo ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="font-mono text-sm">
                        {showEmail ? correo : maskEmail(correo)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowEmail((v) => !v)}
                        className="text-xs font-medium text-blue-600 hover:underline hover:text-blue-700"
                      >
                        {showEmail ? "Ocultar" : "Mostrar"}
                      </button>
                    </span>
                  ) : (
                    "No disponible públicamente"
                  )}
                </InfoRow>
                <InfoRow label="Teléfono">
                  {telefono || "Sin teléfono público"}
                </InfoRow>
              </div>
            </div>

            {/* Card Resumen (similar a MiPerfil) */}
            <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5 md:p-6 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <span>📊 Resumen</span>
                    {cantidadRatings > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-[2px] text-[11px] font-semibold text-amber-700 border border-amber-200">
                        ⭐ {promedio.toFixed(2)} / 5
                      </span>
                    )}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 max-w-xs">
                    Un vistazo rápido a su reputación y actividad dentro de la comunidad.
                  </p>
                </div>
              </div>

              {/* Bloque principal: promedio grande */}
              <div className="rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50/40 p-4 mb-4 flex items-center gap-4 shadow-[0_12px_30px_rgba(255,193,7,0.15)]">
                <div className="h-12 w-12 rounded-full bg-amber-400/90 flex items-center justify-center text-xl shadow-md">
                  ⭐
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                    Promedio de calificación
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900 tabular-nums">
                      {promedio.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      basado en la experiencia de otros residentes
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats secundarios */}
              <div className="grid grid-cols-1 xs:grid-cols-3 gap-3">
                <Stat
                  label="Calificaciones recibidas"
                  value={cantidadRatings ?? 0}
                  kind="ratings"
                />
                <Stat
                  label="Intercambios realizados"
                  value={intercambios ?? 0}
                  kind="trades"
                />
                <Stat
                  label="Publicaciones activas"
                  value={publicaciones ?? 0}
                  kind="posts"
                />
              </div>

              {cantidadRatings > 0 && (
                <p className="mt-4 text-[11px] text-slate-500">
                  Su reputación se construye con cada trueque. Mantener una buena
                  comunicación y cumplir los acuerdos ayuda a mantener un buen puntaje.
                </p>
              )}
            </div>
          </div>

          {/* Últimas valoraciones (full width) */}
          <div className="mt-6">
            <Section
              title="💬 Últimas valoraciones"
              emptyText="Aún no tiene valoraciones públicas."
              isEmpty={ultimas_valoraciones.length === 0}
            >
              <ul className="space-y-3">
                {ultimas_valoraciones.slice(0, 6).map((v, i) => {
                  const puntaje = Number(v.puntaje || 0);
                  const estrellasLlenas = "★".repeat(puntaje);
                  const estrellasVacias = "☆".repeat(Math.max(0, 5 - puntaje));
                  return (
                    <li
                      key={i}
                      className="rounded-xl border bg-slate-50/70 p-3 sm:p-4 flex items-start gap-3 hover:bg-white hover:shadow-md hover:-translate-y-[1px] transition-all duration-150"
                    >
                      <div className="mt-0.5 h-9 w-9 rounded-full bg-amber-100 grid place-items-center text-base">
                        ⭐
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-900">
                            Puntaje: {puntaje}/5
                          </div>
                          <div className="text-sm text-amber-500">
                            <span className="tracking-tight">
                              {estrellasLlenas}
                              <span className="text-slate-300">{estrellasVacias}</span>
                            </span>
                          </div>
                        </div>
                        {v.comentario && (
                          <div className="text-xs text-slate-600 mt-0.5">
                            {v.comentario}
                          </div>
                        )}
                        {v.creado_en && (
                          <div className="mt-1 text-[11px] text-slate-500">
                            {new Date(v.creado_en).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────── UI helpers ────────────────── */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;

  // como Discord: solo muestra el dominio, todo el local en asteriscos
  const maskedLocal = "*".repeat(Math.max(local.length, 10));
  return `${maskedLocal}@${domain}`;
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className="text-sm text-slate-900 break-all">{children}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  kind,
}: {
  label: string;
  value: string | number;
  kind: "ratings" | "trades" | "posts";
}) {
  let icon = "•";
  let bg = "from-slate-50 to-slate-100";
  let iconBg = "bg-slate-100";
  if (kind === "ratings") {
    icon = "💬";
    bg = "from-sky-50 to-sky-100";
    iconBg = "bg-sky-100";
  } else if (kind === "trades") {
    icon = "🔁";
    bg = "from-emerald-50 to-emerald-100";
    iconBg = "bg-emerald-100";
  } else if (kind === "posts") {
    icon = "📦";
    bg = "from-indigo-50 to-indigo-100";
    iconBg = "bg-indigo-100";
  }

  return (
    <div className={`group rounded-2xl border border-slate-100 bg-gradient-to-br ${bg} p-3 sm:p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}>
      <div className="flex items-center gap-2">
        <div
          className={`h-8 w-8 rounded-full ${iconBg} flex items-center justify-center text-base`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium text-slate-600 truncate">{label}</div>
          <div className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  emptyText,
  children,
  isEmpty,
}: {
  title: string;
  emptyText: string;
  children: React.ReactNode;
  isEmpty: boolean;
}) {
  return (
    <div className="bg-white border rounded-2xl shadow-sm p-4 sm:p-5">
      <h2 className="font-semibold mb-3 text-sm flex items-center gap-1">
        {title}
      </h2>
      {isEmpty ? <Empty text={emptyText} /> : children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="py-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
