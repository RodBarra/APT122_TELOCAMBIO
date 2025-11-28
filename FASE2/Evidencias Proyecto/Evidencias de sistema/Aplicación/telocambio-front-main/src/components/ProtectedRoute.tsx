import { Navigate, Outlet } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

type Props = {
  children?: ReactNode;
  /** 1=Admin, 2=Mod, 3=Residente */
  roles?: Array<1 | 2 | 3>;
};

function getRoleHome(rol?: 1 | 2 | 3) {
  if (rol === 1) return "/mod/usuarios"; // Admin
  return "/publicaciones";               // Mod / Residente
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { user, booted, loading } = useAuth();

  // Evita redirecciones tempranas si algún día hidratas en frío
  if (!booted || loading) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-600">
        Cargando…
      </div>
    );
  }

  // No autenticado
  if (!user) return <Navigate to="/login" replace />;

  // Sin permiso para esta ruta
  if (roles && !roles.includes(user.rol_usuario_id)) {
    return <Navigate to={getRoleHome(user.rol_usuario_id)} replace />;
  }

  // OK
  return children ? <>{children}</> : <Outlet />;
}
