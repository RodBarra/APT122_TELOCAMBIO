import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRoleHome } from "../utils/route";

export default function RoleHomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleHome(user.rol_usuario_id)} replace />;
}
