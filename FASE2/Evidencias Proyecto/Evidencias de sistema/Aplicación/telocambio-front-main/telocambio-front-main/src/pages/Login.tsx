import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type AlertProps = { message: string; onClose: () => void };

const AlertPopup = ({ message, onClose }: AlertProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-xl">
      <p className="text-lg text-slate-800">{message}</p>
      <button
        onClick={onClose}
        className="btn btn-primary mt-4 flex justify-center px-8"
      >
        Cerrar
      </button>
    </div>
  </div>
);

type Errors = Partial<Record<"correo" | "password", string>>;

export default function Login() {
  const { login, loading, user } = useAuth();
  const nav = useNavigate();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [alertMessage, setAlertMessage] = useState<string>("");
  const [errors, setErrors] = useState<Errors>({});

  const validate = (field?: keyof Errors): boolean => {
    const newErrors: Errors = { ...errors };

    if (field === "correo" || !field) {
      if (!correo) newErrors.correo = "Por favor, ingresa tu correo.";
      else if (!/\S+@\S+\.\S+/.test(correo)) newErrors.correo = "El formato del correo no es válido.";
      else delete newErrors.correo;
    }

    if (field === "password" || !field) {
      if (!password) newErrors.password = "Por favor, ingresa tu contraseña.";
      else delete newErrors.password;
    }

    setErrors(newErrors);
    if (!field) return Object.keys(newErrors).length === 0;
    return false;
  };

  const redirectByRole = (rol: 1 | 2 | 3) => {
    if (rol === 1) {
      // Admin
      nav("/mod/usuarios", { replace: true });
    } else if (rol === 2) {
      // Moderador
      nav("/publicaciones", { replace: true });
    } else {
      // Residente
      nav("/publicaciones", { replace: true });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAlertMessage("");

    if (!validate()) return;

    try {
      const data = await login(correo, password); // ahora devuelve LoginResp
      const rol = data?.user?.rol_usuario_id ?? user?.rol_usuario_id ?? 3;
      redirectByRole(rol as 1 | 2 | 3);
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.reason ||
        "No se pudo iniciar sesión. Verifica tus datos.";
      setAlertMessage(msg);
    }
  };

  return (
    <section className="relative">
      {alertMessage && (
        <AlertPopup message={alertMessage} onClose={() => setAlertMessage("")} />
      )}

      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: "url('/hero-login.jpg')" }}
        aria-hidden
      />
      <div className="absolute inset-0 -z-10 bg-black/35" aria-hidden />

      <div className="min-h-[calc(100vh-64px)] grid place-items-center px-4 py-8">
        <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl md:grid md:grid-cols-2">
          {/* Panel lateral */}
          <div className="hidden flex-col items-center justify-center bg-indigo-600 p-12 text-center md:flex">
            <img
              src="/logo-telocambio.png"
              alt="Logo TeLoCambio"
              className="w-40"
            />
            <h2 className="mt-6 text-2xl font-bold text-white">
              Bienvenido de vuelta
            </h2>
            <p className="mt-2 text-indigo-100">
              Accede a tu comunidad para descubrir nuevas oportunidades de intercambio.
            </p>
          </div>

          {/* Formulario */}
          <div className="p-8">
            <h2 className="text-2xl font-bold text-slate-900">Inicia sesión</h2>
            <p className="mb-6 text-slate-600">Ingresa tus credenciales para continuar</p>

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Correo</label>
                <input
                  type="email"
                  onBlur={() => validate("correo")}
                  className={`input w-full ${errors.correo ? "border-red-500" : "focus:ring-brand/30"}`}
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="tu@correo.cl"
                />
                {errors.correo && <p className="text-xs text-red-600">{errors.correo}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Contraseña</label>
                <input
                  type="password"
                  onBlur={() => validate("password")}
                  className={`input w-full ${errors.password ? "border-red-500" : "focus:ring-brand/30"}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
              </div>

              <button className="btn-primary flex w-full justify-center pt-2 pb-2" disabled={loading}>
                {loading ? "Ingresando..." : "Iniciar sesión"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-600">
              <div>
                ¿No tienes cuenta?{" "}
                <Link to="/register" className="font-medium text-indigo-600 hover:underline">
                  Crear cuenta
                </Link>
              </div>
              <div className="mt-2">
                <span className="font-medium text-slate-400">
                  {/* En el futuro: ¿Olvidó su clave? */}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
