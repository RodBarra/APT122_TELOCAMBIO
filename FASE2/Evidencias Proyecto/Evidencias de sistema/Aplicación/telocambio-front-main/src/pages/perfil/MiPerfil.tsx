// src/pages/perfil/MiPerfil.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getMe, updateMe } from "../../services/usuarios";
import { AlertErr, AlertOk } from "../../components/Alert";
import { Field } from "../../components/form";

type MiniValoracion = {
  puntaje: number;
  comentario?: string;
  creado_en?: string;
};

type FormErrors = Partial<{
  nombre: string;
  apellidos: string;
  telefono: string;
}>;

// Normaliza la respuesta de getMe() por si viene envuelta en {data:{...}} o similar
function normalizeMe(resp: any) {
  if (!resp) return {};
  if (resp.data && typeof resp.data === "object") return resp.data;
  if (resp.result && typeof resp.result === "object") return resp.result;
  return resp;
}

export default function MiPerfil() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [me, setMe] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Form datos personales
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Resumen
  const [promedio, setPromedio] = useState<number | null>(null);
  const [cantidadRatings, setCantidadRatings] = useState<number | null>(null);
  const [intercambiosRealizados, setIntercambiosRealizados] = useState<number | null>(null);
  const [publicacionesActivas, setPublicacionesActivas] = useState<number | null>(null);

  // Valoraciones
  const [ultimasValoraciones, setUltimasValoraciones] = useState<MiniValoracion[]>([]);

  const rolNombre = useMemo(() => {
    if (user?.rol_usuario_id === 1) return "Admin";
    if (user?.rol_usuario_id === 2) return "Moderador";
    if (user?.rol_usuario_id === 3) return "Residente";
    return "Usuario";
  }, [user?.rol_usuario_id]);

  useEffect(() => {
    (async () => {
      setErr(null);
      try {
        setLoading(true);

        // 1) Perfil /usuarios/me/
        const raw = await getMe();
        const dto = normalizeMe(raw);
        setMe(dto);

        setNombre(dto?.nombre ?? "");
        setApellidos(dto?.apellidos ?? "");
        setTelefono(dto?.telefono ?? "");
        setCorreo(dto?.correo ?? user?.correo ?? "");

        setPromedio(typeof dto?.promedio_rating === "number" ? dto.promedio_rating : null);
        setCantidadRatings(
          typeof dto?.cantidad_ratings === "number" ? dto.cantidad_ratings : null
        );
        setIntercambiosRealizados(
          typeof dto?.intercambios_realizados === "number"
            ? dto.intercambios_realizados
            : null
        );
        setPublicacionesActivas(
          typeof dto?.publicaciones_activas === "number"
            ? dto.publicaciones_activas
            : null
        );

        // 2) Valoraciones
        if (!Array.isArray(dto?.ultimas_valoraciones)) {
          try {
            const modU = await import("../../services/usuarios");
            if (typeof (modU as any).listValoraciones === "function") {
              const r2 = await (modU as any).listValoraciones({
                mine: true,
                limit: 6,
                ordering: "-creado_en",
              });
              const vals = Array.isArray(r2?.results)
                ? r2.results
                : Array.isArray(r2)
                ? r2
                : [];
              setUltimasValoraciones(
                vals.map((v: any) => ({
                  puntaje: Number(v.puntaje),
                  comentario: v.comentario,
                  creado_en: v.creado_en,
                }))
              );
            }
          } catch {
            /* opcional */
          }
        } else {
          setUltimasValoraciones(dto.ultimas_valoraciones);
        }
      } catch (e: any) {
        setErr(e?.message || "No se pudo cargar tu perfil.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!nombre.trim()) e.nombre = "Ingresa tu nombre.";
    if (!apellidos.trim()) e.apellidos = "Ingresa tus apellidos.";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (saving) return;
    setOk(null);
    setErr(null);
    if (!validate()) return;

    try {
      setSaving(true);
      await updateMe({ nombre, apellidos, telefono });
      setOk("Datos actualizados correctamente.");
    } catch (e: any) {
      setErr(e?.message || "No se pudo actualizar.");
    } finally {
      setSaving(false);
    }
  };

  const fullName = useMemo(
    () =>
      [nombre || me?.nombre || "", apellidos || me?.apellidos || ""]
        .map((s) => (s || "").trim())
        .filter(Boolean)
        .join(" "),
    [nombre, apellidos, me]
  );

  const correoFinal = correo || me?.correo || user?.correo || "";
  const telefonoFinal = telefono || me?.telefono || "";
  const inicial = (fullName || correoFinal || "U")[0]?.toUpperCase?.() ?? "U";

  const bgUrl = "/bg-perfiles.png";

  if (loading && !me) {
    return (
      <div className="relative min-h-screen antialiased">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: `url('${bgUrl}')` }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/40 via-slate-900/10 to-slate-900/40" />
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="rounded-2xl bg-white/85 backdrop-blur-xl shadow-2xl ring-1 ring-black/5 p-6">
            Cargando tu perfil…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen antialiased">
      {/* Fondo tipo landing */}
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url('${bgUrl}')` }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/40 via-slate-900/10 to-slate-900/40" />

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl bg-white/85 backdrop-blur-xl shadow-2xl ring-1 ring-black/5 p-6 md:p-8">
          {/* Header con volver + título centrado */}
          <div className="relative flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={() => nav("/publicaciones")}
              className="inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-sm font-semibold bg-blue-600 text-white border border-blue-600 hover:bg-white hover:text-blue-600 transition-colors"
            >
              ← Volver
            </button>

            <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold">
              Mi perfil
            </h1>

            {/* Espaciador para balancear flex */}
            <div aria-hidden="true" className="w-[88px]" />
          </div>

          {err && (
            <div className="mb-3">
              <AlertErr>{err}</AlertErr>
            </div>
          )}
          {ok && (
            <div className="mb-3">
              <AlertOk>{ok}</AlertOk>
            </div>
          )}

          {/* GRID PRINCIPAL: Datos personales + Resumen */}
          <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
            {/* Card DATOS PERSONALES (izquierda) */}
            <div className="bg-white/95 border border-slate-200 rounded-2xl shadow-sm p-6 md:p-7 hover:shadow-xl hover:-translate-y-[1px] transition-all duration-200">
              <form onSubmit={onSubmit} noValidate>
                <div className="flex flex-col items-center text-center">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-emerald-400 shadow-lg ring-4 ring-white flex items-center justify-center text-3xl font-bold text-white transform transition-transform duration-200 hover:scale-105">
                      {inicial}
                    </div>
                    <span className="absolute -bottom-1 -right-1 inline-flex items-center justify-center h-7 w-7 rounded-full bg-white shadow-md text-xs text-slate-500">
                      👤
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="text-lg font-semibold text-slate-900">
                      {fullName || "Tu nombre"}
                    </div>
                    <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 border border-blue-100">
                      <span>Rol:</span>
                      <span>{rolNombre}</span>
                    </div>
                    <p className="mt-3 text-xs text-slate-500 max-w-md">
                      Actualiza tus datos de contacto para que otros residentes puedan
                      coordinar trueques contigo de forma segura.
                    </p>
                  </div>
                </div>

                {/* Campos del formulario */}
                <div className="mt-6 space-y-4 max-w-md mx-auto">
                  <Field label="Nombre" error={formErrors.nombre}>
                    <input
                      className={`input text-sm ${
                        formErrors.nombre ? "border-rose-300" : ""
                      }`}
                      value={nombre}
                      onChange={(e) => {
                        setNombre(e.target.value);
                        if (formErrors.nombre) {
                          setFormErrors((prev) => ({ ...prev, nombre: undefined }));
                        }
                      }}
                      autoComplete="given-name"
                      placeholder="Ingresa tu nombre"
                    />
                  </Field>

                  <Field label="Apellidos" error={formErrors.apellidos}>
                    <input
                      className={`input text-sm ${
                        formErrors.apellidos ? "border-rose-300" : ""
                      }`}
                      value={apellidos}
                      onChange={(e) => {
                        setApellidos(e.target.value);
                        if (formErrors.apellidos) {
                          setFormErrors((prev) => ({ ...prev, apellidos: undefined }));
                        }
                      }}
                      autoComplete="family-name"
                      placeholder="Ingresa tus apellidos"
                    />
                  </Field>

                  <Field label="Teléfono (opcional)" error={formErrors.telefono}>
                    <input
                      className="input text-sm"
                      value={telefono}
                      onChange={(e) => {
                        setTelefono(e.target.value);
                        if (formErrors.telefono) {
                          setFormErrors((prev) => ({ ...prev, telefono: undefined }));
                        }
                      }}
                      autoComplete="tel"
                      placeholder="Ej: 9 1234 5678"
                    />
                  </Field>

                  <Field label="Correo electrónico">
                    <input
                      className="input text-sm bg-slate-50 cursor-not-allowed border-slate-200"
                      value={correoFinal}
                      readOnly
                    />
                  </Field>
                </div>

                <div className="mt-6 flex justify-center">
                  <button
                    disabled={saving}
                    type="submit"
                    className="inline-flex items-center justify-center rounded-xl px-6 h-11 text-sm font-semibold bg-blue-600 text-white border border-blue-600 hover:bg-white hover:text-blue-600 transition-colors disabled:opacity-60"
                  >
                    {saving ? "Guardando…" : "Guardar cambios"}
                  </button>
                </div>
              </form>
            </div>

            {/* Card RESUMEN (derecha) */}
              <div className="bg-white/95 border border-slate-200 rounded-2xl shadow-sm p-6 md:p-7 flex flex-col hover:shadow-2xl hover:-translate-y-[2px] transition-all duration-300">
                <div>
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    📊 Resumen
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Un vistazo rápido a tu reputación y actividad dentro de la comunidad.
                  </p>
                </div>

                {/* Bloque principal de promedio (full width, grande) */}
                <div className="mt-4 rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 via-white to-amber-50 p-4 flex items-center justify-between gap-4 shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-amber-400/90 flex items-center justify-center text-2xl shadow-md animate-pulse">
                      ⭐
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                        Promedio de calificación
                      </div>
                      <div className="text-[11px] text-amber-700/80">
                        Basado en la experiencia de otros residentes.
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl md:text-4xl font-bold text-slate-900 leading-none">
                      {promedio != null ? promedio.toFixed(2) : "0.00"}
                    </div>
                  </div>
                </div>

                {/* Lista de métricas (cada una ocupa todo el ancho) */}
                <div className="mt-5 space-y-3">
                  <ResumenItem
                    icon="💬"
                    label="Calificaciones recibidas"
                    description="Vecinos que han valorado tus trueques."
                    value={cantidadRatings ?? 0}
                  />
                  <ResumenItem
                    icon="🔁"
                    label="Intercambios realizados"
                    description="Trueques que llegaron a concretarse."
                    value={intercambiosRealizados ?? 0}
                  />
                  <ResumenItem
                    icon="📦"
                    label="Publicaciones activas"
                    description="Anuncios que tienes visibles en este momento."
                    value={publicacionesActivas ?? 0}
                  />
                </div>

                {cantidadRatings !== null && cantidadRatings > 0 && (
                  <p className="mt-4 text-[11px] text-slate-500">
                    Tu reputación se construye con cada trueque. Mantén una comunicación clara
                    y respeta los acuerdos para seguir sumando ⭐ buenas experiencias.
                  </p>
                )}
              </div>
          </div>

          {/* ÚLTIMAS VALORACIONES */}
          <div className="mt-7">
            <Section
              title="💬 Últimas valoraciones"
              emptyText="Aún no tienes valoraciones."
            >
              <ul className="space-y-3">
                {ultimasValoraciones.slice(0, 6).map((v, i) => {
                  const estrellasLlenas = "★".repeat(v.puntaje);
                  const estrellasVacias = "☆".repeat(Math.max(0, 5 - v.puntaje));
                  return (
                    <li
                      key={i}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex items-start gap-3 hover:bg-white hover:shadow-md hover:-translate-y-[1px] transition-all duration-150"
                    >
                      <div className="mt-0.5 h-9 w-9 rounded-full bg-emerald-100 grid place-items-center text-lg">
                        ⭐
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-slate-900">
                            Puntaje: {v.puntaje}/5
                          </div>
                          <div className="text-sm text-amber-500">
                            <span className="tracking-tight">
                              {estrellasLlenas}
                              <span className="text-slate-300">{estrellasVacias}</span>
                            </span>
                          </div>
                        </div>
                        {v.comentario && (
                          <div className="mt-1 text-xs text-slate-600">
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
function ResumenItem({
  icon,
  label,
  description,
  value,
}: {
  icon: string;
  label: string;
  description: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 flex items-center justify-between gap-3 shadow-sm hover:bg-white hover:shadow-md hover:-translate-y-[1px] transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-lg shadow">
          {icon}
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900">{label}</div>
          <div className="text-[11px] text-slate-500">{description}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xl md:text-2xl font-bold text-slate-900 leading-none">
          {value}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  emptyText,
  children,
}: {
  title: string;
  emptyText: string;
  children: React.ReactNode;
}) {
  const isEmpty =
    !children || (Array.isArray(children) && (children as any[]).length === 0);
  return (
    <div className="bg-white/95 border border-slate-200 rounded-2xl shadow-sm p-5 md:p-6">
      <h2 className="font-semibold mb-3 flex items-center gap-2">{title}</h2>
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
