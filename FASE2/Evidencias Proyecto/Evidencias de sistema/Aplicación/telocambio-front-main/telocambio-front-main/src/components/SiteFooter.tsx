import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Componente reutilizable para los enlaces (ajustado para fondo oscuro)
const FooterLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <li>
    <Link 
      to={to} 
      className="block px-2 py-1 rounded-md text-slate-300 hover:bg-blue-500 hover:text-white transition-all duration-200 hover:-translate-y-0.5"
    >
      {children}
    </Link>
  </li>
);

export default function SiteFooter() {
  const { user } = useAuth();

  const isAdmin = user?.rol_usuario_id === 1;
  const isMod   = user?.rol_usuario_id === 2;
  const isRes   = user?.rol_usuario_id === 3;
  
  const bgUrl = "/ciudadfooter.jpg"; // <-- IMAGEN DE FONDO APLICADA

  return (
    <footer className="relative mt-0">
      {/* Fondo con imagen */}
      <div
        className="absolute inset-0 -z-10 bg-contain bg-bottom"
        style={{ backgroundImage: `url('${bgUrl}')` }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/60 via-slate-900/80 to-slate-900" />

      {/* Contenedor principal (ahora con fondo oscuro) */}
      <div className="relative z-10">
        {/* línea decorativa */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400" />

        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="grid gap-10 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <img src="/logo-telocambio.png" alt="TeLoCambio" className="h-12" />
              </div>
              <p className="mt-3 text-sm text-slate-300 max-w-xs">
                Intercambios seguros dentro de tu edificio o condominio.
              </p>
            </div>

            {/* CASO 1: Usuario LOGUEADO */}
            {user && (
              <div>
                <h4 className="font-semibold text-white">Navegación</h4>
                <ul className="mt-3 space-y-1 text-sm">
                  {isAdmin && (
                    <>
                      <FooterLink to="/mod/usuarios">Usuarios</FooterLink>
                      <FooterLink to="/admin/comunidades">Comunidades</FooterLink>
                    </>
                  )}
                  {isMod && (
                    <>
                      <FooterLink to="/publicaciones">Publicaciones</FooterLink>
                      <FooterLink to="/intercambios">Intercambios</FooterLink>
                      <FooterLink to="/mod/usuarios">Usuarios</FooterLink>
                      <FooterLink to="/mod/padron">Padrón</FooterLink>
                    </>
                  )}
                  {isRes && (
                    <>
                      <FooterLink to="/publicaciones">Publicaciones</FooterLink>
                      <FooterLink to="/intercambios">Intercambios</FooterLink>
                    </>
                  )}
                </ul>
              </div>
            )}

            {/* CASO 2: Usuario NO LOGUEADO */}
            {!user && (
              <div>
                <h4 className="font-semibold text-white">Producto</h4>
                <ul className="mt-3 space-y-1 text-sm">
                  <FooterLink to="/planes">Planes</FooterLink>
                  <FooterLink to="/nosotros">Nosotros</FooterLink>
                  <FooterLink to="/como-funciona">Cómo funciona</FooterLink>                  
                  <FooterLink to="/contacto">Contacto</FooterLink>
                </ul>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-white">Soporte</h4>
              <ul className="mt-3 space-y-1 text-sm">
                <li>
                </li>
                <li>
                  <a 
                    href="mailto:hola@telocambio.cl" 
                    className="block px-2 py-1 rounded-md text-slate-300 hover:bg-blue-500 hover:text-white transition-all duration-200 hover:-translate-y-0.5"
                  >
                    hola@telocambio.cl
                  </a>
                </li>
              </ul>
            </div>

            {!user ? (
              <div>
                <h4 className="font-semibold text-white">Novedades</h4>
                <p className="mt-3 text-sm text-slate-300">Déjanos tu correo para enterarte de mejoras y lanzamientos.</p>
                
                {/* --- INICIO DE LA MODIFICACIÓN (FORM RESPONSIVO) --- */}
                <form className="mt-4 flex flex-col sm:flex-row gap-2">
                  <input 
                    type="email" 
                    placeholder="tu@correo.cl" 
                    className="input w-full h-10 bg-slate-800 border-slate-700 text-white placeholder-slate-400" 
                  />
                  <button 
                    type="submit"
                    className="btn bg-white text-blue-500 border border-blue-500 hover:bg-blue-500 hover:text-white transition-colors h-10 rounded-xl px-4 text-sm w-full sm:w-auto"
                  >
                    Suscribirme
                  </button>
                </form>
                {/* --- FIN DE LA MODIFICACIÓN --- */}

              </div>
            ) : (
              <div>
                <h4 className="font-semibold text-white">Comunidad</h4>
                <p className="mt-3 text-sm text-slate-300">
                  Fomentando la economía circular y la confianza entre vecinos.
                </p>
              </div>
            )}

          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-700 pt-6 text-sm text-slate-400 md:flex-row">
            <p>© {new Date().getFullYear()} TeLoCambio. Todos los derechos reservados.</p>
            
            <div className="flex gap-4">
              <Link to="/terminos" className="text-slate-400 hover:text-white hover:underline transition-colors">Términos</Link>
              <Link to="/privacidad" className="text-slate-400 hover:text-white hover:underline transition-colors">Privacidad</Link>
              
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}