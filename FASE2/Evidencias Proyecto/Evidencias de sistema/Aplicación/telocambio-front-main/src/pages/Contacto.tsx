import { useState } from "react";

const AlertPopup = ({ message, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-xl">
      <p className="text-lg text-slate-800">{message}</p>
      <button
        onClick={onClose}
        className="btn btn-primary mt-4 flex justify-center px-8" // Centrado también en este botón
      >
        Cerrar
      </button>
    </div>
  </div>
);

export default function Contacto() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const MAX_MESSAGE_CHARS = 500;
  const MAX_SUBJECT_CHARS = 50;

  const handleSubmit = (e) => {
    e.preventDefault();

    // --- MENSAJES DE VALIDACIÓN MEJORADOS ---
    if (name.trim().length < 1) {
      setAlertMessage("Por favor, ingrese su nombre.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setAlertMessage("Por favor, ingrese una dirección de correo válida.");
      return;
    }
    if (subject.trim().length < 5) {
      setAlertMessage("El asunto debe tener al menos 5 caracteres.");
      return;
    }
    if (message.trim().length < 5) {
      setAlertMessage("El mensaje debe tener al menos 5 caracteres.");
      return;
    }

    // --- MENSAJE DE ÉXITO MEJORADO ---
    setAlertMessage("¡Mensaje enviado con éxito!");

    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
  };

  return (
    <main className="relative min-h-screen">
      
      {alertMessage && (
        <AlertPopup
          message={alertMessage}
          onClose={() => setAlertMessage("")}
        />
      )}

      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: "url('/condominio.png')" }}
        aria-hidden
      />
      <div className="absolute inset-0 -z-10 bg-slate-900/40" aria-hidden />

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid items-stretch gap-8 md:grid-cols-2">
          
          <div className="overflow-hidden rounded-2xl">
            <img
              src="/contact-side.jpg"
              alt="Soporte TeLoCambio"
              className="h-full w-full object-cover"
            />
          </div>

          <form
            className="rounded-2xl bg-white p-6 shadow-lg"
            onSubmit={handleSubmit}
          >
            <h1 className="text-3xl font-bold tracking-tight">Contacto</h1>
            <p className="mt-2 text-slate-600">
              ¿Quieres una demo o cotizar para tu edificio? Escríbenos.
            </p>

            <div className="mt-6 grid gap-4">
              <input
                name="nombre"
                className="input"
                placeholder="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                name="correo"
                className="input"
                type="email"
                placeholder="Correo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              
              <div>
                <input
                  name="asunto"
                  className="input w-full"
                  placeholder="Asunto"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={MAX_SUBJECT_CHARS}
                />
                <p className="mt-1 text-right text-sm text-slate-500">
                  {subject.length} / {MAX_SUBJECT_CHARS}
                </p>
              </div>
              
              <div>
                <textarea
                  name="mensaje"
                  className="input h-28 w-full"
                  placeholder="Cuéntanos de tu comunidad..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={MAX_MESSAGE_CHARS}
                />
                <p className="mt-1 text-right text-sm text-slate-500">
                  {message.length} / {MAX_MESSAGE_CHARS}
                </p>
              </div>

              {/* --- BOTÓN CENTRADO --- */}
              <button
                type="submit"
                className="btn btn-primary flex justify-center"
              >
                Enviar
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div>
                📧{" "}
                <a
                  className="text-blue-600 hover:underline"
                  href="mailto:hola@telocambio.cl"
                >
                  hola@telocambio.cl
                </a>
              </div>
              <div className="mt-1">🕑 Lunes a viernes 9:00–18:00</div>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}