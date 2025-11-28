import { useNavigate } from "react-router-dom";
import { useState } from "react"; 
import { useAuth } from "../context/AuthContext";

export default function Terminos() {
  const nav = useNavigate();
  const bgUrl = "/bg-departamento.png"; // Fondo solicitado
  
  const [isChecked, setIsChecked] = useState(false);

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
            Términos y Condiciones
          </h1>
          
          <div aria-hidden="true"></div> {/* Espaciador */}
        </div>

        {/* --- INICIO DE LA MODIFICACIÓN (CONTENIDO EN TARJETAS) --- */}
        <main className="max-w-none flex flex-col gap-6">
          
          {/* Card 0: Introducción */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <p className="text-lg text-slate-700">
              Bienvenido a TeLoCambio. Al utilizar nuestra plataforma, aceptas cumplir con los siguientes términos. Estos lineamientos están diseñados para fomentar un ambiente seguro y fomentar la economía circular dentro de tu comunidad.
            </p>
          </div>

          {/* Card 1: Propósito */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">📜 1. Propósito y Alcance del Servicio</h2>
            <p className="text-slate-600 mb-4">
              TeLoCambio es una plataforma diseñada para facilitar el <strong>trueque (intercambio) de bienes y servicios</strong> entre residentes de una misma comunidad (condominio o edificio).
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Nuestra plataforma es un <strong>facilitador</strong>. No somos parte de ningún intercambio, no gestionamos logística ni procesamos pagos.</li>
              <li>El servicio se limita a las comunidades registradas y aprobadas.</li>
            </ul>
          </div>

          {/* Card 2: Cuentas */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">👤 2. Cuentas y Seguridad de Usuario</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li><strong>Registro:</strong> Para acceder, tu correo debe estar en el "Padrón" cargado por el moderador de tu comunidad y debes usar el "Código de Comunidad" único.</li>
              <li><strong>Verificación:</strong> No implementamos verificación avanzada (como RUT o biometría). La seguridad se basa en la confianza del padrón comunitario.</li>
              <li><strong>Responsabilidad:</strong> Eres responsable de mantener la confidencialidad de tu contraseña y de toda la actividad que ocurra en tu cuenta.</li>
            </ul>
          </div>

          {/* Card 3: Conducta */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">⚖️ 3. Conducta y Moderación</h2>
            <p className="text-slate-600 mb-4">
              El objetivo es mantener una convivencia sana. No se permite:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600 mb-4">
              <li>Publicar contenido ilegal, ofensivo, spam o irrelevante.</li>
              <li>Proporcionar información falsa sobre el estado de un producto.</li>
              <li>Utilizar la plataforma para fines comerciales externos al trueque comunitario.</li>
            </ul>
            <p className="text-slate-600">
              El Moderador y/o Administrador de la comunidad tienen la autoridad final para <strong>moderar contenido</strong>, pausar publicaciones y <strong>gestionar usuarios</strong> (suspender o deshabilitar cuentas) que no cumplan con las normas de convivencia.
            </p>
          </div>
          
          {/* Card 4: Exclusiones */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">❌ 4. Exclusiones Explícitas del Servicio</h2>
            <p className="text-slate-600 mb-4">
              Para mantener la simpleza y seguridad del proyecto, TeLoCambio <strong>NO incluye</strong>:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li><strong>Procesamiento de Pagos:</strong> La plataforma es solo para trueques. No se permite la venta de productos ni se procesan transacciones monetarias.</li>
              <li><strong>Mensajería Interna:</strong> No ofrecemos un chat. La coordinación final de la entrega (lugar, hora) debe realizarse por medios externos, como WhatsApp (facilitamos un enlace directo).</li>
              <li><strong>Logística y Despacho:</strong> No gestionamos envíos. Los usuarios son responsables de coordinar la entrega presencial en un lugar seguro.</li>
              <li><strong>Mapas y Geolocalización:</strong> No utilizamos servicios de mapas para validación de proximidad.</li>
            </ul>
          </div>
            
          {/* Card 5: Flujo */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">🔄 5. Flujo del Intercambio</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Al ofrecer un trueque, la contraparte debe aceptarlo.</li>
              <li>Una vez aceptado, los usuarios deben coordinar la entrega (vía WhatsApp o teléfono).</li>
              <li>Después de la entrega, ambas partes deben ingresar a la plataforma y marcar el intercambio como <strong>"Realizado"</strong> (Doble Confirmación).</li>
              <li>Solo tras la doble confirmación, el intercambio se considera "Finalizado" y se habilita el sistema de calificaciones.</li>
            </ul>
          </div>

          {/* Card 6: Calificación */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">⭐ 6. Sistema de Calificación</h2>
            <p className="text-slate-600">
              Después de un intercambio "Finalizado", los usuarios pueden dejar una calificación (de 1 a 5 estrellas) y un comentario opcional sobre su contraparte. Este sistema de reputación es visible para la comunidad y es clave para construir confianza.
            </p>
          </div>

          {/* Card 7: Aceptación (Sin efecto hover) */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={isChecked}
                onChange={() => setIsChecked(!isChecked)}
              />
              <span className="text-sm font-medium text-slate-800">
                He leído y acepto los términos y condiciones de TeLoCambio.
              </span>
            </label>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => {
                if (user) nav("/publicaciones");
                else nav("/login");
                }}
                disabled={!isChecked}
                className="btn inline-flex items-center justify-center rounded-xl px-6 py-3 text-base font-semibold 
                           bg-white text-blue-500 border border-blue-500 
                           hover:bg-blue-500 hover:text-white transition-colors
                           disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-blue-500"
              >
                Aceptar y Volver
              </button>
            </div>
          </div>
        </main>
        {/* --- FIN DE LA MODIFICACIÓN --- */}
      </div>
    </div>
  );
}