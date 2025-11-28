export default function Nosotros() {
  const Value = ({
    title,
    text,
    icon,
  }: {
    title: string;
    text: string;
    icon: string;
  }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
      <div className="text-2xl">{icon}</div>
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-slate-600 text-sm">{text}</p>
    </div>
  );

  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 -z-10 bg-cover bg-center" 
          style={{ backgroundImage: "url('/edificio.jpg')" }} 
          aria-hidden 
        />
        <div className="absolute inset-0 -z-10 bg-white/70" aria-hidden />

        <div className="mx-auto max-w-7xl px-4 py-16 grid gap-10 md:grid-cols-2 items-center">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
              Intercambios simples y seguros dentro de tu comunidad
            </h1>
            <p className="mt-4 text-lg text-slate-700">
              En <span className="font-semibold">TeLoCambio</span> ayudamos a
              condominios y edificios a reutilizar, donar e{" "}
              <span className="font-semibold">intercambiar</span> bienes y
              servicios de forma interna y confiable. La experiencia está
              diseñada para vecinos, administraciones y comités.
            </p>

            <div className="mt-6 grid max-w-lg gap-3 text-sm">
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
                🔒 Accesos por padrón y roles (Admin / Moderador / Residente).
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
                🔄 Publicaciones internas, ofertas y negociación por comunidad.
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
                🧭 Herramientas de moderación y reportes para la administración.
              </div>
            </div>

            {/* --- CAMBIOS DE TAMAÑO Y POSICIÓN AQUÍ --- */}
            <div className="mt-8 grid grid-cols-2 max-w-lg gap-3 mX-auto mr-12">
              <a
                href="/ofertas"
                className="inline-flex items-center justify-center rounded-xl border border-indigo-600 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition-colors duration-200 hover:bg-indigo-600 hover:text-white"
              >
                Ver planes
              </a>
              <a
                href="/contacto"
                className="inline-flex items-center justify-center rounded-xl border border-indigo-600 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition-colors duration-200 hover:bg-indigo-600 hover:text-white"
              >
                Hablar con nosotros
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/60">
              <img
                src="/about-hero.jpg"
                alt="Vecinos interactuando en la comunidad"
                className="w-full h-[420px] object-cover"
              />
            </div>
            <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[28px] bg-gradient-to-r from-indigo-200/40 to-sky-200/40 blur-2xl" />
          </div>
        </div>
      </section>

      {/* VALORES */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-xl font-semibold">Nuestros valores</h2>
        <div className="mt-2 grid gap-6 md:grid-cols-3">
          <Value
            icon=""
            title="Confianza 🤝"
            text="Generamos un entorno exclusivo y seguro. Verificamos a cada miembro con el padrón oficial para asegurar que todas las interacciones sean únicamente entre vecinos, promoviendo la confianza y el respeto en cada intercambio."
          />
          <Value
            icon=""
            title="Reutilización 🌱"
            text="Nuestro compromiso es con la sostenibilidad. Impulsamos una economía circular promoviendo intercambios que aprovechan los recursos de manera responsable. Cada trueque ayuda a reducir el desperdicio y genera un impacto positivo real en tu comunidad y en el medio ambiente."
          />
          <Value
            icon=""
            title="Simpleza ⚡"
            text="La eficiencia es el corazón de nuestra plataforma. Desde una interfaz limpia hasta notificaciones inteligentes, todo está diseñado para una interacción ágil y directa. Nos comprometemos a ofrecer un proceso que respeta tu tiempo y te conecta con tu comunidad sin fricciones."
          />
        </div>
      </section>
    </main>
  );
}