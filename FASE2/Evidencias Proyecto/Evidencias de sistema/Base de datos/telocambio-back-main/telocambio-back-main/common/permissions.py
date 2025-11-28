from rest_framework.permissions import BasePermission
from rest_framework_simplejwt.tokens import AccessToken

# ==== ROLES (ajusta si tus seeds cambian) ====
ROLE_ADMIN = 1
ROLE_MOD   = 2
ROLE_RES   = 3


# ==== CLAIMS UNIVERSAL ====
def get_claim(request, key, default=None):
    """
    Extrae un claim del token JWT sin importar el formato:
      - dict (cuando DRF ya lo decodificó)
      - AccessToken (objeto de SimpleJWT)
      - str (cuando llega el token crudo en el header)
    """
    token = getattr(request, "auth", None)
    if token is None:
        return default

    # Caso 1: token ya es dict
    if isinstance(token, dict):
        return token.get(key, default)

    # Caso 2: token es AccessToken (objeto JWT válido)
    if hasattr(token, "get"):
        try:
            return token.get(key, default)
        except Exception:
            pass

    # Caso 3: token es string plano JWT
    if isinstance(token, str):
        try:
            access = AccessToken(token)
            return access.get(key, default)
        except Exception:
            return default

    return default


# ==== PERMISOS GENERALES ====
class IsAdmin(BasePermission):
    """Permite acceso solo a administradores."""
    def has_permission(self, request, view):
        return get_claim(request, "rol_usuario_id") == ROLE_ADMIN


class IsAdminOrModerator(BasePermission):
    """Permite acceso a administradores o moderadores."""
    def has_permission(self, request, view):
        role = get_claim(request, "rol_usuario_id")
        return role in (ROLE_ADMIN, ROLE_MOD)


class IsCommunityActive(BasePermission):
    """
    Permite la petición si:
      - el usuario es Admin, o
      - el token no tiene comunidad (None), o
      - la comunidad del token está ACTIVA (estado_comunidad_id == 1).
    """
    def has_permission(self, request, view):
        role = get_claim(request, "rol_usuario_id")
        if role == ROLE_ADMIN:
            return True

        com_id = get_claim(request, "comunidad_id")
        if not com_id:
            return True

        try:
            from ges_comunidad.models import Comunidad
            com = Comunidad.objects.only("id", "estado_comunidad_id").get(id=int(com_id))
        except Exception:
            return False

        return (com.estado_comunidad_id or 0) == 1  # 1 = Activa


# ==== UTILIDADES ====
def enforce_same_community_or_admin(request, comunidad_id: int):
    """Lanza error si el usuario no es admin ni pertenece a la misma comunidad."""
    role = get_claim(request, "rol_usuario_id")
    if role == ROLE_ADMIN:
        return
    token_com = get_claim(request, "comunidad_id")
    if not token_com or int(token_com) != int(comunidad_id):
        raise PermissionError("No autorizado para otra comunidad")


def enforce_active_community_or_admin(request):
    """Lanza error si la comunidad del token no está activa (excepto admin)."""
    role = get_claim(request, "rol_usuario_id")
    if role == ROLE_ADMIN:
        return
    com_id = get_claim(request, "comunidad_id")
    if not com_id:
        return
    from ges_comunidad.models import Comunidad
    try:
        com = Comunidad.objects.only("id", "estado_comunidad_id").get(id=int(com_id))
    except Comunidad.DoesNotExist:
        raise PermissionError("Comunidad no válida")
    if (com.estado_comunidad_id or 0) != 1:
        raise PermissionError("Comunidad suspendida")
