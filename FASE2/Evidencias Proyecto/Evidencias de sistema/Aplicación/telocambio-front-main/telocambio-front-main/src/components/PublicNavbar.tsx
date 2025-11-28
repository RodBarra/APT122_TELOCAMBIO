import { Link, NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

export default function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); }, [pathname]);

  const Item = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "relative px-3 py-2 text-sm font-medium transition-colors",
          isActive ? "text-slate-900" : "text-slate-600 hover:text-slate-900",
          // subrayado animado
          "after:absolute after:left-3 after:right-3 after:-bottom-[2px] after:h-[3px] after:rounded-full",
          "after:bg-gradient-to-r after:from-blue-500 after:to-emerald-500",
          isActive ? "after:scale-x-100 after:opacity-100"
                   : "after:scale-x-0 after:opacity-0 hover:after:scale-x-100 hover:after:opacity-100",
          "after:transition after:duration-300 after:ease-out",
          "after:origin-center",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <nav className="mx-auto max-w-7xl h-16 px-4 flex items-center justify-between">
        {/* Logo solo */}
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo-telocambio.png" alt="TeLoCambio" className="h-8" />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          <Item to="/planes">Planes</Item>
          <Item to="/nosotros">Nosotros</Item>
          <Item to="/como-funciona">Cómo funciona</Item>
          <Item to="/contacto">Contacto</Item>
          <Link
            to="/login"
            className="ml-2 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
          >
            Iniciar sesión
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-slate-100"
          aria-label="Abrir menú"
          onClick={() => setOpen(v => !v)}
        >
          ☰
        </button>
      </nav>

      {/* Panel mobile */}
      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-2 py-2 flex flex-col">
            <Item to="/planes">Planes</Item>
            <Item to="/nosotros">Nosotros</Item>
            <Item to="/como-funciona">Cómo funciona</Item>
            <Item to="/contacto">Contacto</Item>
            <Link to="/login" className="btn btn-primary mt-2 w-full">Iniciar sesión</Link>
          </div>
        </div>
      )}
    </header>
  );
}
