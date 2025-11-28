import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Privacidad() {
  const nav = useNavigate();
  // Usamos el mismo fondo que Términos para mantener consistencia en las páginas legales
  const bgUrl = "/bg-departamento.png"; 
  const { user } = useAuth();

  return (
    <div
      className="relative min-h-screen antialiased bg-cover bg-center py-10 px-4"
      style={{ backgroundImage: `url('${bgUrl}')` }}
    >
      {/* Overlay de gradiente */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/40 via-slate-900/10 to-slate-900/40" />

      {/* Contenedor principal translúcido */}
      <div className="mx-auto max-w-4xl rounded-2xl bg-white/85 backdrop-blur-xl shadow-2xl ring-1 ring-black/5 p-6 md:p-8">
        
        {/* Título y Volver */}
        <div className="relative flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => {
                if (user) nav("/publicaciones");
                else nav("/login");
                }}
            className="btn bg-white text-blue-500 border border-blue-500 hover:bg-blue-500 hover:text-white transition-colors px-3 py-1.5 rounded-xl"
          >
            &larr; Volver
          </button>
          
          <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 text-center">
            Política de Privacidad
          </h1>
          
          <div aria-hidden="true"></div> {/* Espaciador */}
        </div>

        {/* --- INICIO DE LA MODIFICACIÓN (CONTENIDO EN TARJETAS) --- */}
        <main className="max-w-none flex flex-col gap-6">
          
          {/* Card 0: Introducción */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <p className="text-lg text-slate-700">
              Tu privacidad es fundamental para TeLoCambio. Esta política detalla cómo manejamos tu información personal de manera segura y transparente, siempre dentro del entorno cerrado de tu comunidad.
            </p>
          </div>

          {/* Card 1: Información */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">🔒 1. Información que Recolectamos</h2>
            <p className="text-slate-600 mb-4">
              Recolectamos solo la información estrictamente necesaria para el funcionamiento de la plataforma:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li><strong>Datos de Identificación:</strong> Nombre, apellidos y correo electrónico.</li>
              <li><strong>Datos de Contacto:</strong> Teléfono (opcional), que solo se comparte cuando subes una publicación.</li>
              <li><strong>Datos de Comunidad:</strong> Requerimos un "Código de Comunidad" y validamos tu correo contra el "Padrón" oficial (lista de correos autorizados) proveído por la administración.</li>
              <li><strong>Datos de Actividad:</strong> Las publicaciones que creas, las ofertas que envías/recibes y las calificaciones que otorgas.</li>
            </ul>
          </div>

          {/* Card 2: Uso */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">🎯 2. Cómo Usamos tu Información</h2>
            <p className="text-slate-600 mb-4">
              Tu información se usa exclusivamente para:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li><strong>Validar tu Pertenencia:</strong> Confirmar que eres un residente autorizado de la comunidad (vía Padrón y Código).</li>
              <li><strong>Gestionar la Plataforma:</strong> Permitir a los Moderadores y Administradores aprobar nuevos usuarios y gestionar reportes.</li>
              <li><strong>Facilitar el Trueque:</strong> Mostrar tu nombre en tus publicaciones y compartir tu contacto (teléfono) solo después de que un intercambio sea aceptado por ambas partes.</li>
              <li><strong>Construir Confianza:</strong> Mostrar tu reputación (calificaciones) basada en intercambios finalizados.</li>
            </ul>
          </div>

          {/* Card 3: Seguridad */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">🛡️ 3. Aislamiento y Seguridad (Multi-Tenencia)</h2>
            <p className="text-slate-600 mb-4">
              Tu información está protegida y aislada.
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li><strong>Aislamiento Total:</strong> Tus publicaciones, ofertas y datos de perfil solo son visibles para otros miembros verificados de *tu* comunidad. Nadie fuera de ella puede ver tu actividad.</li>
              <li><strong>Seguridad de Acceso:</strong> Usamos autenticación segura (JWT) y roles (RBAC) para asegurar que solo usuarios autorizados accedan a la información.</li>
              <li><strong>Contraseñas:</strong> Tu contraseña se almacena de forma encriptada (hashing) y nunca es visible para nosotros ni para el administrador.</li>
            </ul>
          </div>

          {/* Card 4: Exclusiones */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">🚫 4. Lo que NUNCA Hacemos con tus Datos</h2>
            <p className="text-slate-600 mb-4">
              Nos comprometemos a un manejo ético de tu información:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li><strong>No Vendemos tus Datos:</strong> Jamás venderemos o arrendaremos tu información personal a terceros.</li>
              <li><strong>Sin Geolocalización:</strong> No rastreamos tu ubicación precisa ni usamos mapas.</li>
              <li><strong>Sin Datos Sensibles:</strong> No solicitamos ni almacenamos datos de pago (la plataforma no procesa dinero) ni verificaciones de identidad avanzadas (como RUT o biometría).</li>
              <li><strong>Sin Acceso a Mensajes:</strong> No tenemos un chat interno. La coordinación final ocurre en plataformas externas (como WhatsApp), por lo que no tenemos acceso a esas conversaciones.</li>
            </ul>
          </div>
            
          {/* Card 5: Derechos */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">✏️ 5. Tus Derechos</h2>
            <p className="text-slate-600 mb-4">
              Tienes control sobre tu información:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Puedes <strong>editar</strong> tu información de perfil (nombre, teléfono, contraseña) en cualquier momento desde "Mi Perfil".</li>
              <li>Puedes <strong>deshabilitar</strong> tu cuenta si ya no deseas participar en la plataforma.</li>
              <li>Puedes <strong>reportar</strong> cualquier publicación o usuario que consideres que infringe las normas de la comunidad o tu privacidad.</li>
            </ul>
          </div>
        </main>
        {/* --- FIN DE LA MODIFICACIÓN --- */}
      </div>
    </div>
  );
}