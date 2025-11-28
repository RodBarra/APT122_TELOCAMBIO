import { FormEvent, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ComunidadesApi } from "../../services/comunidades";
import type { Comunidad } from "../../services/comunidades";
import { UsuariosApi } from "../../services/usuarios";
import { AlertOk, AlertErr } from "../../components/Alert";
import { Field } from "../../components/form";

type FormState = {
  comunidad_id: number;
  tipo_id: 1 | 2; // Añadido tipo_id al FormState si 'CrearComunidad' también lo maneja
  nombre: string;
  direccion: string;
  codigo: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

// Ajustado al formulario de Crear Comunidad
const initialForm: FormState = {
  comunidad_id: 0, // Esto parece ser de Crear Moderador, lo dejaré por si acaso
  tipo_id: 1,
  nombre: "",
  direccion: "",
  codigo: "",
};

function normalizeCodigo(raw: string) {
  const up = (raw || "").toUpperCase().replace(/\s+/g, "-");
  return up.replace(/[^A-Z0-9-]/g, "-");
}

function validateForm(f: FormState): Errors {
  const e: Errors = {};

  const nombre = f.nombre.trim();
  if (!nombre) e.nombre = "El nombre es obligatorio.";
  else if (nombre.length < 3) e.nombre = "Mínimo 3 caracteres.";
  else if (nombre.length > 120) e.nombre = "Máximo 120 caracteres.";

  if (![1, 2].includes(f.tipo_id)) e.tipo_id = "Selecciona un tipo válido.";

  if (f.direccion && f.direccion.length > 120) e.direccion = "Máximo 120 caracteres.";

  const cod = f.codigo.trim();
  if (!cod) e.codigo = "Ingresa el código de comunidad.";
  else if (!/^[A-Z0-9-]{3,32}$/.test(cod)) {
    e.codigo = "Usa mayúsculas, números y guiones (3–32). Ej: DPT-LOSROBLES-001";
  }

  return e;
}

// Nota: El nombre del archivo es AdminCreateComunidad.tsx pero el componente se llama CrearComunidad.
// Asumo que el nombre correcto del componente es AdminCreateComunidad
export default function AdminCreateComunidad() { 
  const [params] = useSearchParams();
  const preId = Number(params.get("comunidad_id") || 0); // Esto es de Moderador, ¿seguro que va aquí?
  const nav = useNavigate();

  const [coms, setComs] = useState<Comunidad[]>([]); // Esto es de Moderador
  const [form, setForm] = useState<FormState>(initialForm);

  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false); // No se usa en tu código, pero lo dejo
  const [okBanner, setOkBanner] = useState<string | null>(null);
  const [errBanner, setErrBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const touchField = (k: keyof FormState) => {
    const e = validateForm(form);
    setErrors((prev) => ({ ...prev, [k]: e[k] }));
  };

  // Este useEffect es de Crear Moderador, no aplica a Crear Comunidad.
  // Lo comento para evitar confusiones.
  // useEffect(() => {
  //   ComunidadesApi.list({ page_size: 1000, sin_moderador: 1 as any })
  //     .then(({ data }) => setComs((data.items || []).filter((c) => !c.moderador_correo)))
  //     .catch(async () => {
  //       try {
  //         const { data } = await ComunidadesApi.list({ page_size: 1000 });
  //         setComs((data.items || []).filter((c) => !c.moderador_correo));
  //       } catch {
  //         /* noop */
  //       }
  //     });
  // }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setOkBanner(null);
    setErrBanner(null);

    const eNow = validateForm(form);
    setErrors(eNow);
    if (Object.keys(eNow).length > 0) return;

    setLoading(true);
    try {
      await ComunidadesApi.create({
        nombre: form.nombre.trim(),
        tipo_id: form.tipo_id,
        direccion: form.direccion.trim() || undefined,
        codigo: form.codigo.trim(),
      });
      setOkBanner("Comunidad creada correctamente.");
      setForm(initialForm);
      setErrors({});
    } catch (err: any) {
      const payload = err?.response?.data;
      const msg =
        payload?.detail ||
        payload?.errors ||
        "No se pudo crear la comunidad. Revisa los datos.";
      setErrBanner(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  // Fondo de la página según tipo
  const pageBg =
    form.tipo_id === 1
      ? "url('/bg-departamento.png')"
      : "url('/bg-condominio.png')";
      
  const activeClass = "bg-blue-500 text-white shadow";
  const inactiveClass = "bg-white text-blue-500 border border-blue-500 hover:bg-blue-500 hover:text-white";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center px-4 py-10 transition-all duration-300"
      style={{ backgroundImage: pageBg }}
    >
      <div
        className="max-w-3xl w-full rounded-xl shadow-2xl p-8 bg-cover bg-center"
        style={{ backgroundImage: "url('/fondoformulario.jpg')" }}
      >
        
        {/* --- INICIO DE LA MODIFICACIÓN (TÍTULO Y BOTÓN VOLVER) --- */}
        <div className="relative flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => nav("/admin/comunidades")} // Vuelve a la lista de comunidades
            className="btn bg-white text-blue-500 border border-blue-500 hover:bg-blue-500 hover:text-white transition-colors px-3 py-1.5 rounded-xl"
          >
            &larr; Volver
          </button>
          
          <h1 className="absolute left-1/2 -translate-x-1/2 text-3xl font-extrabold tracking-tight text-gray-900">
            Crear comunidad
          </h1>
          
          <div aria-hidden="true"></div> {/* Espaciador */}
        </div>
        {/* --- FIN DE LA MODIFICACIÓN --- */}

        {okBanner && (
          <div className="mb-4">
            <AlertOk>{okBanner}</AlertOk>
          </div>
        )}
        {errBanner && (
          <div className="mb-4">
            <AlertErr>{errBanner}</AlertErr>
          </div>
        )}

        <form className="space-y-6" onSubmit={onSubmit} noValidate>
          {/* Nombre */}
          <Field label="Nombre" error={errors.nombre} htmlFor="nombre">
            <input
              id="nombre"
              className={`input w-full ${
                errors.nombre ? "border-red-300 focus:ring-red-300" : ""
              }`}
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              onBlur={() => touchField("nombre")}
              placeholder="Ej: Condominio Los Robles"
              maxLength={120}
              aria-invalid={!!errors.nombre}
            />
          </Field>

          {/* Tipo */}
          <Field label="Tipo" error={errors.tipo_id}>
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                className={`btn px-4 py-2 text-sm rounded-md transition-colors ${
                  form.tipo_id === 1 ? activeClass : inactiveClass
                }`}
                onClick={() => {
                  set("tipo_id", 1);
                  touchField("tipo_id");
                }}
                aria-pressed={form.tipo_id === 1}
              >
                Departamento
              </button>
              <button
                type="button"
                className={`btn px-4 py-2 text-sm rounded-md transition-colors ${
                  form.tipo_id === 2 ? activeClass : inactiveClass
                }`}
                onClick={() => {
                  set("tipo_id", 2);
                  touchField("tipo_id");
                }}
                aria-pressed={form.tipo_id === 2}
              >
                Condominio
              </button>
            </div>
          </Field>

          {/* Dirección */}
          <Field
            label="Dirección (opcional)"
            error={errors.direccion}
            htmlFor="direccion"
          >
            <input
              id="direccion"
              className={`input w-full ${
                errors.direccion ? "border-red-300 focus:ring-red-300" : ""
              }`}
              value={form.direccion}
              onChange={(e) => set("direccion", e.target.value)}
              onBlur={() => touchField("direccion")}
              placeholder="Ej: Av. Siempre Viva 742"
              maxLength={120}
              aria-invalid={!!errors.direccion}
            />
          </Field>

          {/* Código */}
          <Field label="Código" error={errors.codigo} htmlFor="codigo">
            <input
              id="codigo"
              className={`input w-full ${
                errors.codigo ? "border-red-300 focus:ring-red-300" : ""
              }`}
              value={form.codigo}
              onChange={(e) => set("codigo", normalizeCodigo(e.target.value))}
              onBlur={() => {
                set("codigo", normalizeCodigo(form.codigo));
                touchField("codigo");
              }}
              placeholder="DPT-LOSROBLES-001"
              maxLength={32}
              aria-invalid={!!errors.codigo}
            />
          </Field>

          {/* --- INICIO DE LA MODIFICACIÓN (BOTONES CENTRADOS) --- */}
          <div className="flex justify-center gap-2 pt-4">
            <button
              type="submit"
              className="btn inline-flex items-center rounded-lg px-[30px] py-[10px] text-sm font-semibold shadow-sm transition-colors duration-200 bg-white text-blue-500 border border-blue-500 hover:bg-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Creando..." : "Crear comunidad"}
            </button>
          </div>
          {/* --- FIN DE LA MODIFICACIÓN --- */}
        </form>
      </div>
    </div>
  );
}