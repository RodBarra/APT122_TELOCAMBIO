// src/components/Navbar.tsx
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useRef, useState } from "react";
import { getBadge } from "../services/notificaciones";

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [notifBadge, setNotifBadge] = useState<number | null>(null); 

  if (!user) return null;

  const isAdmin = user.rol_usuario_id === 1;
  const isMod = user.rol_usuario_id === 2;
  const isRes = user.rol_usuario_id === 3;
  const isInComunidad = isMod || isRes;

  // --------- Comunidad (solo mod / res) ----------
  const comunidadNombreFromUser =
    (user as any).comunidad_nombre ??
    (user as any).comunidad?.nombre ??
    null;

  // Código de comunidad (solo lo usaremos para moderadores)
  const comunidadCodigoFromUser =
    (user as any).comunidad_codigo ??
    (user as any).comunidad?.codigo ??
    null;

  const comunidadLabel =
    isInComunidad && comunidadNombreFromUser
      ? comunidadNombreFromUser
      : isInComunidad && (user as any).comunidad_id
      ? `Comunidad #${(user as any).comunidad_id}`
      : null;

  const rolLabel = isAdmin
    ? "Administrador"
    : isMod
    ? "Moderador"
    : isRes
    ? "Residente"
    : "Usuario";

  // Home por rol
  const homePath = isAdmin ? "/mod/usuarios" : "/publicaciones";

  // ACTIVO SOLO EN /perfil (no en /perfil/:id)
  const isMyProfile = location.pathname === "/perfil";

  // Redirección inicial
useEffect(() => {
  const path = location.pathname;
  if (isAdmin) {
    if (path === "/" || path === "/dashboard" || path === "/login") {
      nav("/mod/usuarios", { replace: true });
    }
  } else if (isMod || isRes) {
    if (path === "/" || path === "/dashboard" || path === "/login") {
      nav("/publicaciones", { replace: true });
    }
  }
}, [isAdmin, isMod, isRes, location.pathname, nav]);

// Badge de notificaciones no leídas
useEffect(() => {
  let alive = true;

  const refresh = () => {
    getBadge()
      .then((res) => {
        if (!alive) return;
        setNotifBadge(res.no_leidas ?? 0);
      })
      .catch(() => {
        if (!alive) return;
        setNotifBadge(null);
      });
  };

  // Primera carga
  refresh();

  // Escucha eventos globales
  window.addEventListener("notif-updated", refresh);

  return () => {
    alive = false;
    window.removeEventListener("notif-updated", refresh);
  };
}, []);

  // Cerrar panel al click afuera o ESC
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest("[data-menu-toggle]")) return;
      if (!panelRef.current) return;
      if (!panelRef.current.contains(target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // Bloqueo de scroll al abrir panel mobile
  useEffect(() => {
    const cls = "overflow-hidden";
    if (open) {
      document.documentElement.classList.add(cls);
      document.body.classList.add(cls);
    } else {
      document.documentElement.classList.remove(cls);
      document.body.classList.remove(cls);
    }
    return () => {
      document.documentElement.classList.remove(cls);
      document.body.classList.remove(cls);
    };
  }, [open]);

  const handleLogout = () => {
    logout();
    nav("/login");
  };

  const Item = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "relative px-3 py-2 text-sm font-medium transition-colors",
          isActive ? "text-slate-900" : "text-slate-600 hover:text-slate-900",
          "after:absolute after:left-3 after:right-3 after:-bottom-[2px] after:h-[3px] after:rounded-full",
          "after:bg-gradient-to-r after:from-blue-500 after:to-emerald-500",
          isActive
            ? "after:scale-x-100 after:opacity-100"
            : "after:scale-x-0 after:opacity-0 hover:after:scale-x-100 hover:after:opacity-100",
          "after:transition after:duration-300 after:ease-out after:origin-center",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );

  const NavItemsDesktop = () => (
    <div className="hidden md:flex items-center gap-1">
      {isAdmin && (
        <>
          <Item to="/mod/usuarios">Usuarios</Item>
          <Item to="/admin/comunidades">Comunidades</Item>
        </>
      )}
      {isMod && (
        <>
          <Item to="/publicaciones">Publicaciones</Item>
          <Item to="/intercambios">Intercambios</Item>
          <Item to="/mod/usuarios">Usuarios</Item>
          <Item to="/mod/padron">Padrón</Item>
        </>
      )}
      {isRes && (
        <>
          <Item to="/publicaciones">Publicaciones</Item>
          <Item to="/intercambios">Intercambios</Item>
        </>
      )}
    </div>
  );

  const ProfileEmail = () => (
    <NavLink
      to="/perfil"
      end
      className={({ isActive }) =>
        [
          "relative hidden sm:block max-w-[28ch] truncate text-xs transition-colors",
          isActive ? "text-slate-900" : "text-slate-600 hover:text-slate-900",
          "after:absolute after:left-0 after:right-0 after:-bottom-[2px] after:h-[2px] after:rounded-full",
          "after:bg-gradient-to-r after:from-blue-500 after:to-emerald-500",
          isActive
            ? "after:scale-x-100 after:opacity-100"
            : "after:scale-x-0 after:opacity-0 hover:after:scale-x-100 hover:after:opacity-100",
          "after:transition after:duration-300 after:ease-out after:origin-center",
        ].join(" ")
      }
      title={user.correo}
    >
      {user.correo}
    </NavLink>
  );

  const ProfileButton = () => {
    const nombre = (user as any).nombre ?? "";
    const apellidos = (user as any).apellidos ?? "";
    const inicialBase = (nombre || apellidos || user.correo || "?").trim();
    const inicial = inicialBase ? inicialBase[0].toUpperCase() : "?";

    return (
      <Link
        to="/perfil"
        className={[
          "relative inline-flex h-9 w-9 items-center justify-center rounded-full",
          "border border-slate-300 bg-white shadow hover:bg-slate-50",
          "focus:outline-none focus:ring-2 focus:ring-blue-500",
          isMyProfile ? "ring-2 ring-blue-500" : "ring-0",
        ].join(" ")}
        aria-label="Perfil"
        title="Perfil"
      >
        <span className="text-xs font-semibold text-slate-800">{inicial}</span>
      </Link>
    );
  };

  return (
    <>
      {/* NAVBAR PRINCIPAL */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <nav className="mx-auto max-w-7xl h-16 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Botón menú mobile */}
            <button
              type="button"
              data-menu-toggle
              className="md:hidden p-2 rounded-md hover:bg-slate-100"
              onClick={() => setOpen(true)}
              aria-label="Abrir menú"
              aria-expanded={open}
              aria-controls="mobile-menu"
            >
              ☰
            </button>

            {/* Logo + nav desktop */}
            <div className="flex items-center gap-3">
              <Link to={homePath} className="flex items-center gap-3">
                <img src="/logo-telocambio.png" alt="TeLoCambio" className="h-8" />
              </Link>
              <NavItemsDesktop />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ProfileEmail />
            <ProfileButton />

            <Link
              to="/notificaciones"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Notificaciones"
              title="Notificaciones"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="h-5 w-5 text-slate-700"
                strokeWidth="1.8"
              >
                <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
                <path d="M9 17a3 3 0 0 0 6 0" />
              </svg>

              {/* Badge rojo si hay no leídas */}
              {notifBadge !== null && notifBadge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
                  {notifBadge > 9 ? "9+" : notifBadge}
                </span>
              )}
            </Link>

            <button
              onClick={handleLogout}
              className="hidden sm:inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow hover:bg-slate-50"
            >
              Cerrar sesión
            </button>
          </div>
        </nav>
      </header>

      {/* BANDA DE COMUNIDAD (debajo del navbar, sin tocar lo de arriba) */}
      {isInComunidad && comunidadLabel && (
        <div className="border-b border-slate-100 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              {/* Comunidad actual + (código para moderador) */}
              <div className="flex items-center justify-center sm:justify-start gap-2 min-w-0">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-400 to-sky-500 text-white shadow-sm text-lg">
                  🏘️
                </div>
                <div className="min-w-0 text-center sm:text-left">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Comunidad actual
                  </div>

                  {/* Nombre + código en una sola fila */}
                  <div className="mt-0.5 flex items-center justify-center sm:justify-start gap-2">
                    <div className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                      {comunidadLabel}
                    </div>

                    {/* Código visible SOLO para moderadores */}
                    {/* Código visible SOLO para moderador — badge premium */}
                    {isMod && comunidadCodigoFromUser && (
                      <span
                        className="
                          inline-flex items-center 
                          rounded-xl 
                          bg-gradient-to-r from-emerald-500 to-sky-600
                          text-white 
                          shadow-md 
                          px-4 py-1.5 
                          text-xs sm:text-sm font-bold tracking-wide
                          border border-white/10
                          [text-shadow:0px_1px_2px_rgba(0,0,0,0.35)]
                        "
                      >
                        <span className="mr-1 opacity-95 font-semibold">Código:</span>
                        <span className="font-mono">{comunidadCodigoFromUser}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>


              {/* Rol + mensaje de contexto */}
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 text-[11px] text-slate-600">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-0.5 border border-slate-200">
                  <span className="text-xs" aria-hidden="true">
                    👤
                  </span>
                  <span className="font-medium">{rolLabel}</span>
                </span>

                <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/95 text-slate-50 px-3 py-0.5 text-[10px] shadow-sm">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"
                    aria-hidden="true"
                  />
                  <span className="whitespace-nowrap sm:whitespace-normal">
                    Estás navegando dentro de tu comunidad
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Backdrop + Panel Mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        ref={panelRef}
        id="mobile-menu"
        className={`fixed z-50 inset-y-0 left-0 w-80 bg-white shadow-2xl border-r border-slate-200 transform transition-transform will-change-transform md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
        role="dialog"
        aria-modal="true"
      >
        {/* Header mobile con logo + close */}
        <div className="sticky top-0 border-b bg-white px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <Link
              to={homePath}
              className="flex items-center gap-3"
              onClick={() => setOpen(false)}
            >
              <img src="/logo-telocambio.png" alt="TeLoCambio" className="h-8" />
            </Link>
            <button
              className="p-2 rounded-md hover:bg-slate-100"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
            >
              ✕
            </button>
          </div>

          {/* Tarjeta de usuario / comunidad */}
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 flex gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white grid place-items-center text-sm font-semibold">
              {(user as any).nombre?.[0]?.toUpperCase() ??
                (user as any).apellidos?.[0]?.toUpperCase() ??
                (user.correo || "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">
                {(user as any).nombre || (user as any).apellidos
                  ? `${(user as any).nombre ?? ""} ${(user as any).apellidos ?? ""}`.trim()
                  : user.correo}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {user.correo}
              </div>
              <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-600">
                <span className="inline-flex items-center rounded-full bg-white border border-slate-200 px-2 py-0.5">
                  👤 {rolLabel}
                </span>
                {isInComunidad && comunidadLabel && (
                  <span className="inline-flex items-center rounded-full bg-white border border-slate-200 px-2 py-0.5 max-w-[11rem] truncate">
                    🏘 <span className="ml-1 truncate">{comunidadLabel}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contenido scrollable */}
        <div className="h-[calc(100vh-112px)] overflow-y-auto">
          {/* Navegación principal */}
          <nav className="px-4 pt-4 pb-3 space-y-1 text-sm">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Navegación
            </p>

            {isAdmin && (
              <>
                <NavLink
                  to="/mod/usuarios"
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-3 py-2 ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-50"
                    }`
                  }
                >
                  👥 <span>Usuarios</span>
                </NavLink>
                <NavLink
                  to="/admin/comunidades"
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-3 py-2 ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-50"
                    }`
                  }
                >
                  🏘 <span>Comunidades</span>
                </NavLink>
              </>
            )}

            {isMod && (
              <>
                <NavLink
                  to="/publicaciones"
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-3 py-2 ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-50"
                    }`
                  }
                >
                  📦 <span>Publicaciones</span>
                </NavLink>
                <NavLink
                  to="/intercambios"
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-3 py-2 ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-50"
                    }`
                  }
                >
                  🔁 <span>Intercambios</span>
                </NavLink>
                <NavLink
                  to="/mod/usuarios"
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-3 py-2 ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-50"
                    }`
                  }
                >
                  👥 <span>Usuarios</span>
                </NavLink>
                <NavLink
                  to="/mod/padron"
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-3 py-2 ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-50"
                    }`
                  }
                >
                  📋 <span>Padrón</span>
                </NavLink>
              </>
            )}

            {isRes && (
              <>
                <NavLink
                  to="/publicaciones"
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-3 py-2 ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-50"
                    }`
                  }
                >
                  📦 <span>Publicaciones</span>
                </NavLink>
                <NavLink
                  to="/intercambios"
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-3 py-2 ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-50"
                    }`
                  }
                >
                  🔁 <span>Intercambios</span>
                </NavLink>
              </>
            )}
          </nav>

          {/* Accesos universales (Mobile) */}
          <div className="mt-2 px-4 pb-5 border-t pt-4 space-y-2">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Cuenta
            </p>

            <NavLink
              to="/notificaciones"
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-50"
                }`
              }
            >
              🔔 <span>Notificaciones</span>
            </NavLink>

            <NavLink
              to="/perfil"
              end
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-50"
                }`
              }
            >
              👤 <span>Perfil</span>
            </NavLink>

            <div className="pt-3 border-t">
              <div className="mb-2 truncate text-slate-500 text-xs">
                {user.correo}
              </div>
              <button
                className="w-full inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow hover:bg-slate-50"
                onClick={handleLogout}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
