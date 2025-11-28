// src/App.tsx
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

import AdminCreateComunidad from "./pages/admin/AdminCreateComunidad";
import AdminCreateModerador from "./pages/admin/AdminCreateModerador";
import AdminComunidadesList from "./pages/admin/AdminComunidadesList";
import ModUsuarios from "./pages/mod/ModUsuarios";
import ModPadron from "./pages/mod/ModPadron";

// público
import PublicNavbar from "./components/PublicNavbar";
import SiteFooter from "./components/SiteFooter";
import Ofertas from "./pages/Ofertas";
import Nosotros from "./pages/Nosotros";
import ComoFunciona from "./pages/ComoFunciona";
import Contacto from "./pages/Contacto";
import Privacidad from "./pages/Privacidad";
import Terminos from "./pages/Terminos";
import LegalShell from "./components/LayoutNeutral";

// marketplace
import {
  PublicacionesList,
  PublicacionForm,
  PublicacionDetail,
} from "./pages/publicaciones";

// intercambios
import IntercambioDetail from "./pages/intercambios/IntercambioDetail";
import IntercambiosList from "./pages/intercambios/IntercambiosList";

// PERFIL (estos son los REALES!)
import MiPerfil from "./pages/perfil/MiPerfil";
import PerfilPublico from "./pages/perfil/PerfilPublico";

// Notificaciones
import NotificationsPage from "./pages/notificaciones/NotificationsPage";

function PrivateShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

function RoleHomeFallback() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const target = user.rol_usuario_id === 1 ? "/mod/usuarios" : "/publicaciones";
  return <Navigate to={target} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* público */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<PublicShell><Login /></PublicShell>} />
      <Route path="/register" element={<PublicShell><Register /></PublicShell>} />
      <Route path="/planes" element={<PublicShell><Ofertas /></PublicShell>} />
      <Route path="/nosotros" element={<PublicShell><Nosotros /></PublicShell>} />
      <Route path="/como-funciona" element={<PublicShell><ComoFunciona /></PublicShell>} />
      <Route path="/contacto" element={<PublicShell><Contacto /></PublicShell>} />

      {/* Generales */}
      <Route
        path="/privacidad"
        element={<LegalShell><Privacidad /></LegalShell>}
      />
      <Route
        path="/terminos"
        element={<LegalShell><Terminos /></LegalShell>}
      />

      {/* Marketplace */}
      <Route
        path="/publicaciones"
        element={
          <ProtectedRoute>
            <PrivateShell>
              <PublicacionesList />
            </PrivateShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/publicaciones/nueva"
        element={
          <ProtectedRoute>
            <PrivateShell>
              <PublicacionForm />
            </PrivateShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/publicaciones/:id"
        element={
          <ProtectedRoute>
            <PrivateShell>
              <PublicacionDetail />
            </PrivateShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/publicaciones/:id/editar"
        element={
          <ProtectedRoute>
            <PrivateShell>
              <PublicacionForm />
            </PrivateShell>
          </ProtectedRoute>
        }
      />
      <Route path="/publicaciones/*" element={<Navigate to="/publicaciones" replace />} />

      {/* Intercambios */}
      <Route
        path="/intercambios"
        element={
          <ProtectedRoute>
            <PrivateShell>
              <IntercambiosList />
            </PrivateShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/intercambios/:id"
        element={
          <ProtectedRoute>
            <PrivateShell>
              <IntercambioDetail />
            </PrivateShell>
          </ProtectedRoute>
        }
      />
      <Route path="/intercambios/*" element={<Navigate to="/intercambios" replace />} />

      {/* PERFIL */}
      <Route
        path="/perfil"
        element={
          <ProtectedRoute>
            <PrivateShell>
              <MiPerfil />
            </PrivateShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/perfil/:id"
        element={
          <ProtectedRoute>
            <PrivateShell>
              <PerfilPublico />
            </PrivateShell>
          </ProtectedRoute>
        }
      />

      {/* NOTIFICACIONES */}
      <Route
        path="/notificaciones"
        element={
          <ProtectedRoute>
            <PrivateShell>
              <NotificationsPage />
            </PrivateShell>
          </ProtectedRoute>
        }
      />

      {/* Admin */}
      <Route
        path="/admin/comunidades/nueva"
        element={
          <ProtectedRoute roles={[1]}>
            <PrivateShell>
              <AdminCreateComunidad />
            </PrivateShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/moderador/nuevo"
        element={
          <ProtectedRoute roles={[1]}>
            <PrivateShell>
              <AdminCreateModerador />
            </PrivateShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/comunidades"
        element={
          <ProtectedRoute roles={[1]}>
            <PrivateShell>
              <AdminComunidadesList />
            </PrivateShell>
          </ProtectedRoute>
        }
      />

      {/* Moderador/Admin */}
      <Route
        path="/mod/usuarios"
        element={
          <ProtectedRoute roles={[1, 2]}>
            <PrivateShell>
              <ModUsuarios />
            </PrivateShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mod/padron"
        element={
          <ProtectedRoute roles={[1, 2]}>
            <PrivateShell>
              <ModPadron />
            </PrivateShell>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<RoleHomeFallback />} />
    </Routes>
  );
}
