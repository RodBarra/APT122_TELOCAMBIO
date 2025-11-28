import { FormEvent, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom"; // --- MODIFICACIÓN: Importar useNavigate ---
import { ComunidadesApi } from "../../services/comunidades";
import type { Comunidad } from "../../services/comunidades";
import { UsuariosApi } from "../../services/usuarios";
import { AlertOk, AlertErr } from "../../components/Alert";
import { Field } from "../../components/form";

type FormState = {
  comunidad_id: number;
  correo: string;
  password: string;
  nombre: string;
  apellidos: string;
  telefono: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

export default function CrearComunidad() {
  const [params] = useSearchParams();
  const preId = Number(params.get("comunidad_id") || 0);
  const nav = useNavigate(); // --- MODIFICACIÓN: Inicializar useNavigate ---

  const [coms, setComs] = useState<Comunidad[]>([]);
  const [form, setForm] = useState<FormState>({
    comunidad_id: preId || 0,
    correo: "",
    password: "",
    nombre: "",
    apellidos: "",
    telefono: "",
  });

  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    ComunidadesApi.list({ page_size: 1000, sin_moderador: 1 as any })
      .then(({ data }) => setComs((data.items || []).filter((c) => !c.moderador_correo)))
      .catch(async () => {
        try {
          const { data } = await ComunidadesApi.list({ page_size: 1000 });
          setComs((data.items || []).filter((c) => !c.moderador_correo));
        } catch {
          /* noop */
        }
      });
  }, []);

  const validate = (f: FormState): Errors => {
    const e: Errors = {};
    if (!f.comunidad_id) e.comunidad_id = "Selecciona una comunidad.";

    const correo = f.correo.trim();
    if (!correo) e.correo = "Correo es obligatorio.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) e.correo = "Correo inválido.";

    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(f.password)) {
      e.password = "Mínimo 8, con 1 mayúscula y 1 número.";
    }

    if (!f.nombre.trim()) e.nombre = "Nombre es obligatorio.";
    if (!f.apellidos.trim()) e.apellidos = "Apellidos son obligatorios.";

    return e;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setOk(null);
    setErr(null);
    setSubmitted(true);

    const eNow = validate(form);
    setErrors(eNow);
    if (Object.keys(eNow).length > 0) return;

    setLoading(true);
    try {
      await UsuariosApi.createModerador({
        comunidad_id: form.comunidad_id,
        correo: form.correo.trim(),
        password: form.password,
        nombre: form.nombre.trim(),
        apellidos: form.apellidos.trim(),
        telefono: form.telefono.trim() || undefined,
      });
      setOk("Moderador creado correctamente.");

      setForm({
        comunidad_id: preId || 0,
        correo: "",
        password: "",
        nombre: "",
        apellidos: "",
        telefono: "",
      });
      setErrors({});
      setSubmitted(false);
    } catch (e: any) {
      const payload = e?.response?.data;
      const msg =
        payload?.detail ||
        payload?.errors ||
        "No se pudo crear la comunidad.";
      setErr(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const showErr = (key: keyof Errors) => submitted && !!errors[key];

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/hero-planes.jpg')" }}
    >
      <div
        className="max-w-xl w-full rounded-xl shadow-2xl p-8 bg-cover bg-center"
        style={{
          backgroundImage: "url('/fondoformulario.jpg')",
        }}
      >
        
        {/* --- INICIO DE LA MODIFICACIÓN (TÍTULO Y BOTÓN VOLVER) --- */}
        <div className="relative flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => nav(-1)} // Vuelve a la página anterior
            disabled={loading}
            className="btn bg-white text-blue-500 border border-blue-500 hover:bg-blue-500 hover:text-white transition-colors px-3 py-1.5 rounded-xl"
          >
            &larr; Volver
          </button>
          
          <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold text-center text-gray-900">
            Crear Moderador
          </h1>
          
          <div aria-hidden="true"></div> {/* Espaciador */}
        </div>
        {/* --- FIN DE LA MODIFICACIÓN --- */}


        {ok && (
          <div className="mb-4">
            <AlertOk>{ok}</AlertOk>
          </div>
        )}
        {err && (
          <div className="mb-4">
            <AlertErr>{err}</AlertErr>
          </div>
        )}

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          {/* Comunidad */}
          <div>
            <label className="label">Comunidad</label>
            <select
              className={`input w-full ${
                showErr("comunidad_id") ? "border-red-300 focus:ring-red-300" : ""
              }`}
              value={form.comunidad_id}
              onChange={(e) => set("comunidad_id", Number(e.target.value))}
            >
              <option value={0}>Selecciona...</option>
              {coms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.codigo})
                </option>
              ))}
            </select>
            {showErr("comunidad_id") && (
              <p className="mt-1 text-xs text-red-600">{errors.comunidad_id}</p>
            )}
          </div>

          {/* Correo */}
          <Field label="Correo" error={showErr("correo") ? errors.correo : undefined}>
            <input
              className={`input w-full ${
                showErr("correo") ? "border-red-300 focus:ring-red-300" : ""
              }`}
              value={form.correo}
              onChange={(e) => set("correo", e.target.value)}
              placeholder="moderador@comunidad.cl"
              inputMode="email"
            />
          </Field>

          {/* Contraseña */}
          <Field label="Contraseña" error={showErr("password") ? errors.password : undefined}>
            <input
              className={`input w-full ${
                showErr("password") ? "border-red-300 focus:ring-red-300" : ""
              }`}
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="Mín. 8, 1 mayúscula, 1 número"
            />
          </Field>

          {/* Nombre */}
          <Field label="Nombre" error={showErr("nombre") ? errors.nombre : undefined}>
            <input
              className={`input w-full ${
                showErr("nombre") ? "border-red-300 focus:ring-red-300" : ""
              }`}
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)}
            />
          </Field>

          {/* Apellidos */}
          <Field label="Apellidos" error={showErr("apellidos") ? errors.apellidos : undefined}>
            <input
              className={`input w-full ${
                showErr("apellidos") ? "border-red-300 focus:ring-red-300" : ""
              }`}
              value={form.apellidos}
              onChange={(e) => set("apellidos", e.target.value)}
            />
          </Field>

          {/* Teléfono */}
          <Field label="Teléfono (opcional)">
            <input
              className="input w-full"
              value={form.telefono}
              onChange={(e) => set("telefono", e.target.value)}
            />
          </Field>

          {/* --- INICIO DE LA MODIFICACIÓN (BOTÓN CENTRADO) --- */}
          <div className="flex justify-center pt-4">
            <button
              type="submit"
              className="inline-flex items-center rounded-lg border border-blue-500 bg-white px-[30px] py-[10px] text-sm font-semibold text-blue-500 shadow-sm transition-colors hover:bg-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Creando..." : "Crear Moderador"}
            </button>
          </div>
          {/* --- FIN DE LA MODIFICACIÓN --- */}
        </form>
      </div>
    </div>
  );
}