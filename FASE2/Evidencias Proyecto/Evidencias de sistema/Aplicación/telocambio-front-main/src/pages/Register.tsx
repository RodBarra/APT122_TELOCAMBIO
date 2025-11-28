import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertErr, AlertOk } from "../components/Alert";
import { Field } from "../components/form";
import { AuthApi } from "../services/auth";
import { normalizePhoneCL } from "../utils/phone";

type Tipo = "departamento" | "condominio";
type Errors = Partial<Record<
  "codigo" | "correo" | "password" | "nombre" | "apellidos" | "telefono" | "torre" | "numero" | "direccion_texto",
  string
>>;
type VerifyState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "ok"; tipo_id: 1 | 2 }
  | { status: "error"; reason: string; detail?: string };

/* ——— Encabezado de sección (chip + título + divisor) ——— */
function Section({
  step,
  title,
  children,
}: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="pb-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">
          {step}
        </span>
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="relative mb-5">
        <div className="h-[2px] w-full rounded-full bg-gradient-to-r from-indigo-200 via-slate-200 to-transparent" />
      </div>
      {children}
    </section>
  );
}

export default function Register() {
  const nav = useNavigate();

  const [tipo, setTipo] = useState<Tipo>("departamento");
  const [form, setForm] = useState({
    codigo: "", correo: "", password: "", nombre: "", apellidos: "",
    telefono: "", torre: "", direccion_texto: "", numero: "",
  });

  const [verify, setVerify] = useState<VerifyState>({ status: "idle" });
  const [errBanner, setErrBanner] = useState<string | null>(null);
  const [okBanner, setOkBanner] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Fondo según tipo
  const bgUrl = tipo === "departamento" ? "/bg-departamento.png" : "/bg-condominio.png";

  // Verificación código+correo (debounced)
  const emailOk = /\S+@\S+\.\S+/.test(form.correo);
  const codeOk = !!form.codigo?.trim();
  const tRef = useRef<number | null>(null);

  useEffect(() => {
    if (tRef.current) window.clearTimeout(tRef.current);
    if (!emailOk || !codeOk) { setVerify({ status: "idle" }); return; }
    setVerify({ status: "checking" });
    tRef.current = window.setTimeout(async () => {
      try {
        const { data } = await AuthApi.verifyAccess({
          codigo: form.codigo.trim(),
          correo: form.correo.trim(),
        });
        if (data?.ok && (data.tipo_id === 1 || data.tipo_id === 2)) {
          setVerify({ status: "ok", tipo_id: data.tipo_id });
        } else {
          setVerify({ status: "error", reason: data?.reason || "codigo_invalido" });
        }
      } catch (e: any) {
        const reason = e?.response?.data?.reason || e?.response?.data?.detail || "codigo_invalido";
        setVerify({ status: "error", reason });
      }
    }, 400);
  }, [form.codigo, form.correo, emailOk, codeOk]);

  const friendlyVerifyError: Record<string, string> = {
    codigo_invalido: "El código de comunidad no existe.",
    correo_no_autorizado: "Tu correo no está autorizado en el padrón de esta comunidad.",
    correo_no_habilitado: "Tu correo está en el padrón pero aún no ha sido habilitado.",
    correo_ya_usado: "Este correo ya fue utilizado para registrarse.",
    faltan_residencia: "Faltan datos de residencia (torre/dirección y número).",
  };

  const tipoFromId = (id?: 1 | 2) => (id === 1 ? "departamento" : id === 2 ? "condominio" : undefined);

  const validate = (): boolean => {
    const e: Errors = {};
    if (!form.codigo) e.codigo = "Ingresa el código de comunidad.";
    if (!form.correo) e.correo = "Ingresa tu correo.";
    else if (!/\S+@\S+\.\S+/.test(form.correo)) e.correo = "Formato de correo inválido.";
    if (!form.password || form.password.length < 8) e.password = "La contraseña debe tener al menos 8 caracteres.";
    if (!form.nombre) e.nombre = "Ingresa tu nombre.";
    if (!form.apellidos) e.apellidos = "Ingresa tus apellidos.";
    // Teléfono obligatorio y en formato chileno
    if (!form.telefono) {
      e.telefono = "Ingresa tu teléfono móvil.";
    } else if (!normalizePhoneCL(form.telefono)) {
      e.telefono = "Ingresa un número chileno válido (ej: +56912345678 o 912345678).";
    }
    if (tipo === "departamento") {
      if (!form.torre) e.torre = "Ingresa la torre/edificio.";
      if (!form.numero) e.numero = "Ingresa el número del depto.";
    } else {
      if (!form.direccion_texto) e.direccion_texto = "Ingresa la dirección.";
      if (!form.numero) e.numero = "Ingresa el número de la vivienda.";
    }
    if (verify.status === "ok") {
      const esperado = tipoFromId((verify as any).tipo_id);
      if (esperado && esperado !== tipo) {
        e.codigo = `El código ingresado corresponde a un ${esperado}. Cambia el tipo o corrige el código.`;
      }
    } else if (verify.status === "error") {
      e.codigo = friendlyVerifyError[(verify as any).reason] || "Código o correo inválido para la comunidad.";
    } else if (verify.status === "checking") {
      e.codigo = "Verificando código…";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setErrBanner(null);
  setOkBanner(null);

  // Validaciones de frontend
  if (!validate()) return;

  // Ya pasó la validación, así que esto NO debería ser null
  const normalizedTelefono = normalizePhoneCL(form.telefono)!;

  setLoading(true);

  try {
    await AuthApi.register({
      ...form,
      telefono: normalizedTelefono, // <- se envía siempre en formato +569XXXXXXXX
    });

    setOkBanner("Cuenta creada con éxito. Ahora puedes iniciar sesión.");
    setTimeout(() => nav("/login"), 1000);
  } catch (e: any) {
    const reason = e?.response?.data?.reason;
    const msg =
      friendlyVerifyError[reason] ||
      e?.response?.data?.detail ||
      "No se pudo crear la cuenta. Revisa los datos.";
    setErrBanner(msg);
  } finally {
    setLoading(false);
  }
};


  // badge para el label del código
  const verifyBadge = (() => {
    if (verify.status === "checking")
      return <span className="ml-2 rounded-full bg-amber-100 text-amber-800 text-[11px] px-2 py-0.5">Verificando…</span>;
    if (verify.status === "ok")
      return <span className="ml-2 rounded-full bg-emerald-100 text-emerald-800 text-[11px] px-2 py-0.5">Código verificado</span>;
    if (verify.status === "error")
      return <span className="ml-2 rounded-full bg-rose-100 text-rose-800 text-[11px] px-2 py-0.5">Código/Correo inválido</span>;
    return null;
  })();

  return (
    <div className="relative min-h-screen antialiased">
      {/* Fondo dinámico */}
      <div className="absolute inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: `url('${bgUrl}')` }} />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/40 via-slate-900/20 to-slate-900/40" />

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-xl shadow-2xl ring-1 ring-black/5">
          {/* Panel izquierdo (más ordenado + logo grande) */}
          <aside className="hidden md:flex flex-col justify-center items-center text-center bg-gradient-to-b from-indigo-700/95 to-indigo-900/95 text-white p-10">
            <img
              src="/logo-telocambio.png"
              alt="TeLoCambio"
              className="h-16 md:h-20 w-auto object-contain"
            />
            <h2 className="mt-8 text-2xl md:text-3xl font-bold">Bienvenido/a a TeLoCambio</h2>
            <p className="mt-3 max-w-sm text-indigo-100">
              Únete con tu código de comunidad y empieza a intercambiar de forma segura.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-indigo-100/90">
              <li className="flex items-center gap-2 justify-center"><span>✅</span> Acceso por padrón y roles</li>
              <li className="flex items-center gap-2 justify-center"><span>✅</span> Solo tu edificio/condominio</li>
              <li className="flex items-center gap-2 justify-center"><span>✅</span> Intercambios simples y seguros</li>
            </ul>
          </aside>

          {/* Formulario (derecha) */}
          <section className="p-6 md:p-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-slate-900">Crear cuenta</h1>
              <p className="text-slate-600 mt-2">Necesitas un código y estar en el padrón de tu comunidad.</p>
            </div>

            {okBanner && <div className="mb-4"><AlertOk>{okBanner}</AlertOk></div>}
            {errBanner && <div className="mb-4"><AlertErr>{errBanner}</AlertErr></div>}

            <form onSubmit={onSubmit} noValidate>
              {/* 1. Tipo */}
              <Section step={1} title="Selecciona tu tipo de vivienda">
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    className={`rounded-lg py-2 text-sm font-semibold transition-all ${tipo === "departamento" ? "bg-white shadow" : "text-slate-600 hover:bg-slate-200"}`}
                    onClick={() => setTipo("departamento")}
                    aria-pressed={tipo === "departamento"}
                  >
                    Departamento
                  </button>
                  <button
                    type="button"
                    className={`rounded-lg py-2 text-sm font-semibold transition-all ${tipo === "condominio" ? "bg-white shadow" : "text-slate-600 hover:bg-slate-200"}`}
                    onClick={() => setTipo("condominio")}
                    aria-pressed={tipo === "condominio"}
                  >
                    Condominio
                  </button>
                </div>
              </Section>

              {/* 2. Acceso */}
              <Section step={2} title="Datos de acceso">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Field
                      label={<span className="inline-flex items-center">Código de comunidad {verifyBadge}</span>}
                      error={errors.codigo}
                      hint={
                        verify.status === "ok" && !errors.codigo
                          ? `Código verificado: ${ (verify as any).tipo_id === 1 ? "Departamento" : "Condominio" }`
                          : undefined
                      }
                    >
                      <input
                        className={`input ${errors.codigo ? "border-red-300" : ""}`}
                        value={form.codigo}
                        onChange={(e) => set("codigo", e.target.value)}
                        placeholder="Ej: COMUNIDAD-123"
                        autoComplete="one-time-code"
                      />
                    </Field>
                  </div>

                  <Field label="Correo" error={errors.correo}>
                    <input
                      type="email"
                      className={`input ${errors.correo ? "border-red-300" : ""}`}
                      value={form.correo}
                      onChange={(e) => set("correo", e.target.value)}
                      autoComplete="email"
                    />
                  </Field>

                  <Field label="Contraseña" error={errors.password}>
                    <input
                      type="password"
                      className={`input ${errors.password ? "border-red-300" : ""}`}
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      autoComplete="new-password"
                    />
                  </Field>
                </div>
              </Section>

              {/* 3. Personales */}
              <Section step={3} title="Datos personales">
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Nombre" error={errors.nombre}>
                    <input
                      className={`input ${errors.nombre ? "border-red-300" : ""}`}
                      value={form.nombre}
                      onChange={(e) => set("nombre", e.target.value)}
                      autoComplete="given-name"
                    />
                  </Field>
                  <Field label="Apellidos" error={errors.apellidos}>
                    <input
                      className={`input ${errors.apellidos ? "border-red-300" : ""}`}
                      value={form.apellidos}
                      onChange={(e) => set("apellidos", e.target.value)}
                      autoComplete="family-name"
                    />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Teléfono móvil" error={errors.telefono}>
                      <input
                        className={`input ${errors.telefono ? "border-red-300" : ""}`}
                        value={form.telefono}
                        onChange={(e) => set("telefono", e.target.value)}
                        autoComplete="tel"
                        placeholder="+56912345678 o 912345678"
                      />
                    </Field>
                  </div>
                </div>
              </Section>

              {/* 4. Vivienda */}
              <Section step={4} title="Tu vivienda">
                <div className="grid md:grid-cols-2 gap-4">
                  {tipo === "departamento" ? (
                    <>
                      <Field label="Torre/Edificio" error={errors.torre}>
                        <input
                          className={`input ${errors.torre ? "border-red-300" : ""}`}
                          value={form.torre}
                          onChange={(e) => set("torre", e.target.value)}
                          placeholder="Torre A"
                          autoComplete="address-level2"
                        />
                      </Field>
                      <Field label="N° Depto" error={errors.numero}>
                        <input
                          className={`input ${errors.numero ? "border-red-300" : ""}`}
                          value={form.numero}
                          onChange={(e) => set("numero", e.target.value)}
                          placeholder="101"
                          autoComplete="address-line2"
                        />
                      </Field>
                    </>
                  ) : (
                    <>
                      <Field label="Dirección" error={errors.direccion_texto}>
                        <input
                          className={`input ${errors.direccion_texto ? "border-red-300" : ""}`}
                          value={form.direccion_texto}
                          onChange={(e) => set("direccion_texto", e.target.value)}
                          placeholder="Av. Siempre Viva #123"
                          autoComplete="street-address"
                        />
                      </Field>
                      <Field label="N° Vivienda" error={errors.numero}>
                        <input
                          className={`input ${errors.numero ? "border-red-300" : ""}`}
                          value={form.numero}
                          onChange={(e) => set("numero", e.target.value)}
                          placeholder="23"
                          autoComplete="address-line2"
                        />
                      </Field>
                    </>
                  )}
                </div>
              </Section>

                <button
                    className="btn-primary w-full justify-center"
                    disabled={loading}
                  >
                    {loading ? "Creando cuenta..." : "Registrarme"}
                </button>

            </form>
            

            <div className="mt-6 text-center text-sm text-slate-600">
              <div>
                ¿Ya tienes cuenta?{" "}
                <Link to="/login" className="font-medium text-indigo-600 hover:underline">
                  Inicia sesión
                </Link>
              </div>
              <div className="mt-2">
                <span className="font-medium text-slate-400 select-none">¿Olvidó su clave?</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
