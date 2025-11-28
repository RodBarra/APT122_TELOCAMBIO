export default function Ofertas() {
  // --- CAMBIO: NUEVO ESTILO UNIFICADO PARA LOS BOTONES ---
  const unifiedCtaStyle =
    "w-full inline-flex items-center justify-center rounded-xl border border-indigo-600 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition-colors duration-200 " +
    "hover:bg-indigo-600 hover:text-white " + // Efecto al pasar sobre el botón
    "group-hover:bg-indigo-600 group-hover:text-white"; // Efecto al pasar sobre la tarjeta

  const plans = [
    {
      name: "Básico",
      users: "Hasta 50 usuarios por comunidad",
      price: "29.990",
      highlight: false,
      color: "from-sky-50 to-white",
      ctaStyle: unifiedCtaStyle,
    },
    {
      name: "Medio",
      users: "Hasta 150 usuarios por comunidad",
      price: "59.990",
      highlight: true,
      color: "from-blue-50 to-white",
      ctaStyle: unifiedCtaStyle,
    },
    {
      name: "Grande",
      users: "Hasta 400 usuarios por comunidad",
      price: "119.990",
      highlight: false,
      color: "from-indigo-50 to-white",
      ctaStyle: unifiedCtaStyle,
    },
  ];

  const Feature = ({ children }: { children: React.ReactNode }) => (
    <li className="flex items-start gap-2">
      <span className="mt-1">✅</span>
      <span>{children}</span>
    </li>
  );

  return (
    <main>
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: "url('/hero-planes.jpg')" }}
          aria-hidden
        />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/35 via-white/10 to-white/92"
          aria-hidden
        />
        <div className="mx-auto max-w-7xl px-4 py-16">
          {/* HEADER A ANCHO COMPLETO */}
          <div className="rounded-2xl bg-white/90 backdrop-blur px-6 py-7 shadow-xl ring-1 ring-black/5">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-500">
              Planes mensuales por comunidad
            </p>
            <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
              Planes para tu{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
                comunidad
              </span>
            </h1>
            <p className="mt-3 text-base sm:text-lg text-slate-700">
              Elige el plan ideal. Todos incluyen{" "}
              <span className="font-semibold text-slate-900">
                autenticación por padrón, publicaciones internas, ofertas de
                intercambio y panel para moderadores.
              </span>{" "}
              Precios en CLP (+IVA).
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs sm:text-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 border border-slate-200 text-slate-700">
                <span className="text-base">🔒</span>
                <span>Acceso por padrón y rol</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 border border-slate-200 text-slate-700">
                <span className="text-base">🏢</span>
                <span>Diseñado para comunidades cerradas</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 border border-slate-200 text-slate-700">
                <span className="text-base">💬</span>
                <span>Soporte por correo incluido</span>
              </span>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className={[
                  "relative group rounded-2xl border p-6 shadow-sm bg-gradient-to-b transition-all duration-300",
                  p.highlight ? "ring-2 ring-blue-600 border-transparent" : "border-slate-200",
                  "hover:ring-2 hover:ring-blue-600 hover:border-transparent",
                  p.color,
                ].join(" ")}
              >
                <div className="absolute inset-0 rounded-2xl bg-black/0 transition-colors group-hover:bg-black/5" />

                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-2xl font-bold">{p.name}</h3>
                      <p className="mt-1 text-[15px] text-slate-700">
                        <span className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1 text-sm font-medium text-white">
                          {p.users}
                        </span>
                      </p>
                    </div>
                    {p.highlight && (
                      <span className="text-xs rounded-full bg-indigo-600 text-white px-2 py-0.5 font-semibold">
                        Recomendado
                      </span>
                    )}
                  </div>

                  <div className="mt-5">
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-extrabold text-slate-900">
                        ${p.price}
                      </span>
                      <span className="mb-1 text-slate-500">/ mes</span>
                    </div>
                  </div>

                  <ul className="mt-5 space-y-2 text-sm text-slate-700">
                    <Feature>Acceso seguro por padrón y rol</Feature>
                    <Feature>Publicaciones internas por comunidad</Feature>
                    <Feature>Ofertas de intercambio y negociación</Feature>
                    <Feature>Panel de moderación</Feature>
                    <Feature>Soporte por email en horario hábil</Feature>
                  </ul>

                  <button
                    className={["w-full", "mt-6", p.ctaStyle].join(" ")}
                    aria-label={`Contratar plan ${p.name}`}
                  >
                    Contratar
                  </button>

                  <p className="mt-3 text-xs text-slate-500">
                    Sin permanencia. Cancela cuando quieras.
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl bg-white/80 backdrop-blur border border-slate-200 p-6">
            <h2 className="text-lg font-semibold">Comparativa rápida</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-sm text-slate-500">Usuarios activos</div>
                <div className="mt-1 text-2xl font-bold">50 / 150 / 400</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-sm text-slate-500">Soporte</div>
                <div className="mt-1 text-2xl font-bold">Email</div>
                <div className="text-xs text-slate-500">
                  Prioridad mayor en plan Grande
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-sm text-slate-500">Funciones</div>
                <div className="mt-1 text-2xl font-bold">Completas</div>
                <div className="text-xs text-slate-500">
                  Todas las funciones en todos los planes
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-6">
            <h2 className="text-lg font-semibold">Add-ons opcionales</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {/* ... (contenido de add-ons) ... */}
            </div>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold">¿Cómo se cuentan los usuarios?</h3>
              <p className="mt-2 text-sm text-slate-600">
                Se consideran usuarios activos de una comunidad durante el mes.
                Si superan el límite del plan elegido, puedes subir de plan en
                cualquier momento.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold">¿Hay permanencia mínima?</h3>
              <p className="mt-2 text-sm text-slate-600">
                No. Puedes cancelar cuando quieras. El cobro es mes a mes, por
                comunidad.
              </p>
            </div>
          </div>

          <div className="mt-12 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-6">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  ¿Listo para comenzar en tu comunidad?
                </h3>
                <p className="text-slate-600">
                  Te ayudamos con el setup inicial y la carga del padrón.
                </p>
              </div>
              <a
                href="/contacto"
                className="inline-flex items-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-700"
              >
                Hablar con ventas
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
