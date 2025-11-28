# ges_usuario/views.py
import re
import bcrypt
from django.db.models import Q, Count, Avg
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiTypes, OpenApiParameter
from django.shortcuts import get_object_or_404

from glo_rol_usuario.models import RolUsuario
from ges_publicacion.models import Publicacion
from ges_intercambio.models import Intercambio, ValoracionUsuario

from common.permissions import (
    IsAdmin,
    IsAdminOrModerator,
    IsCommunityActive,
    get_claim,
    enforce_same_community_or_admin,
    ROLE_ADMIN,
    ROLE_MOD,
)
from authapp.models import Usuario
from ges_comunidad.models import Comunidad
from .serializers import (
    UsuarioUpdateSerializer,
    UsuarioCreateModeradorSerializer,
    MeSerializer,
    PublicUserSerializer,
)

ROLE_RESIDENTE = 3


def _serialize(u: Usuario, comunidad_nombre: str | None = None):
    return {
        "id": u.id,
        "correo": u.correo,
        "nombre": u.nombre,
        "apellidos": u.apellidos,
        "telefono": u.telefono,
        "comunidad_id": u.comunidad_id,
        "comunidad_nombre": comunidad_nombre,
        "rol_usuario_id": u.rol_usuario_id,
        "estado_usuario_id": u.estado_usuario_id,
        "registrado_en": u.registrado_en.isoformat() if u.registrado_en else None,
        "actualizado_en": u.actualizado_en.isoformat() if u.actualizado_en else None,
    }


def _get_user_stats(u: Usuario) -> dict:
    """
    Calcula contadores de actividad del usuario:
    - publicaciones_activas
    - intercambios_realizados

    Ajustado a los nombres reales vistos en los modelos:
    - Publicacion: propietario_usuario_id, comunidad_id, estado_publicacion_id
    - Intercambio: solicitante_usuario_id, receptor_usuario_id, estado_intercambio_id
    """
    # 1) Intercambios FINALIZADOS donde participé
    intercambios_realizados = (
        Intercambio.objects
        .filter(
            comunidad_id=u.comunidad_id,
            estado_intercambio_id=2,  # 2 = FINALIZADO
        )
        .filter(
            Q(solicitante_usuario_id=u.id) | Q(receptor_usuario_id=u.id)
        )
        .count()
    )

    # 2) Publicaciones ACTIVAS que me pertenecen
    publicaciones_activas = (
        Publicacion.objects
        .filter(
            comunidad_id=u.comunidad_id,
            propietario_usuario_id=u.id,
            estado_publicacion_id=1,  # 1 = ACTIVA
        )
        .count()
    )

    # 3) Últimas valoraciones donde YO soy el calificado
    ratings_qs = ValoracionUsuario.objects.filter(
        calificado_usuario_id=u.id,
    )

    agg = ratings_qs.aggregate(
        cantidad=Count("id"),
        promedio=Avg("puntaje"),
    )

    cantidad_ratings = int(agg["cantidad"] or 0)
    promedio_rating = float(agg["promedio"] or 0.0)

    # 4) Últimas valoraciones donde YO soy el calificado
    ultimas_qs = ratings_qs.order_by("-creado_en")[:5]

    ultimas_valoraciones = [
        {
            "id": v.id,
            "intercambio_id": v.intercambio_id,
            "calificador_usuario_id": v.calificador_usuario_id,
            "puntaje": v.puntaje,
            "comentario": v.comentario or "",
            "creado_en": v.creado_en.isoformat(),
        }
        for v in ultimas_qs
    ]

    return {
        "intercambios_realizados": intercambios_realizados,
        "publicaciones_activas": publicaciones_activas,
        "ultimas_valoraciones": ultimas_valoraciones,
        "cantidad_ratings": cantidad_ratings,
        "promedio_rating": round(promedio_rating, 2),
    }


class UsuarioListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrModerator]

    @extend_schema(
        operation_id="usuarios_list",
        tags=["usuarios"],
        parameters=[
            OpenApiParameter("comunidad_id", int, OpenApiParameter.QUERY, required=False),
            OpenApiParameter("q", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
            OpenApiParameter("rol", int, OpenApiParameter.QUERY, required=False),
            OpenApiParameter("estado", int, OpenApiParameter.QUERY, required=False),
            OpenApiParameter("ordering", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
            OpenApiParameter("page", int, OpenApiParameter.QUERY, required=False),
            OpenApiParameter("page_size", int, OpenApiParameter.QUERY, required=False),
            OpenApiParameter(
                "include_admins",
                OpenApiTypes.INT,
                OpenApiParameter.QUERY,
                required=False,
                description="Sólo Admin: 1 para incluir admins, por defecto 0 (excluye)",
            ),
        ],
        responses={200: OpenApiTypes.OBJECT},
        description="Lista usuarios. Admin puede filtrar por comunidad/rol/estado; Moderador restringido a su comunidad y sólo residentes.",
    )
    def get(self, request):
        role = get_claim(request, "rol_usuario_id")
        token_com = get_claim(request, "comunidad_id")

        comunidad_id = request.query_params.get("comunidad_id")
        q = (request.query_params.get("q") or "").strip()
        rol = request.query_params.get("rol")
        estado = request.query_params.get("estado")
        ordering = request.query_params.get("ordering") or "-id"
        page = int(request.query_params.get("page") or 1)
        page_size = int(request.query_params.get("page_size") or 10)
        include_admins = request.query_params.get("include_admins") in ("1", "true", "True")

        qs = Usuario.objects.all()

        if role == ROLE_ADMIN:
            if not include_admins:
                qs = qs.exclude(rol_usuario_id=ROLE_ADMIN)

            if comunidad_id:
                qs = qs.filter(comunidad_id=int(comunidad_id))

            if q:
                qs = qs.filter(
                    Q(nombre__icontains=q)
                    | Q(apellidos__icontains=q)
                    | Q(correo__icontains=q)
                )

            if rol:
                qs = qs.filter(rol_usuario_id=int(rol))
            if estado:
                qs = qs.filter(estado_usuario_id=int(estado))

        else:
            qs = qs.filter(comunidad_id=token_com, rol_usuario_id=ROLE_RESIDENTE)

            if q:
                qs = qs.filter(
                    Q(nombre__icontains=q)
                    | Q(apellidos__icontains=q)
                    | Q(correo__icontains=q)
                )
            if estado:
                qs = qs.filter(estado_usuario_id=int(estado))

        allowed = {
            "id",
            "correo",
            "nombre",
            "apellidos",
            "rol_usuario_id",
            "estado_usuario_id",
            "registrado_en",
            "actualizado_en",
        }
        ord_key = ordering.lstrip("-")
        if ord_key not in allowed:
            ordering = "-id"
        qs = qs.order_by(ordering)

        total = qs.count()
        start = max(0, (page - 1) * page_size)
        end = start + page_size
        page_qs = list(qs[start:end])

        com_ids = {u.comunidad_id for u in page_qs if u.comunidad_id}
        com_map = {}
        if com_ids:
            for c in Comunidad.objects.filter(id__in=com_ids):
                com_map[c.id] = c.nombre

        items = [_serialize(u, com_map.get(u.comunidad_id)) for u in page_qs]

        return Response(
            {
                "items": items,
                "total": total,
                "page": page,
                "page_size": page_size,
            }
        )


class UsuarioDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrModerator, IsCommunityActive]

    @extend_schema(
        operation_id="usuarios_retrieve",
        tags=["usuarios"],
        responses={200: OpenApiTypes.OBJECT, 404: OpenApiTypes.OBJECT, 403: OpenApiTypes.OBJECT},
        description="Detalle de usuario por ID. Moderador sólo puede acceder a su comunidad.",
    )
    def get(self, request, usuario_id: int):
        try:
            u = Usuario.objects.get(id=usuario_id)
        except Usuario.DoesNotExist:
            return Response({"detail": "no encontrado"}, status=404)
        try:
            enforce_same_community_or_admin(request, u.comunidad_id)
        except PermissionError as ex:
            return Response({"detail": str(ex)}, status=403)

        com_name = None
        if u.comunidad_id:
            c = Comunidad.objects.filter(id=u.comunidad_id).only("id", "nombre").first()
            com_name = c.nombre if c else None
        return Response(_serialize(u, com_name))

    @extend_schema(
        operation_id="usuarios_update",
        tags=["usuarios"],
        request=UsuarioUpdateSerializer,
        responses={200: OpenApiTypes.OBJECT, 400: OpenApiTypes.OBJECT, 403: OpenApiTypes.OBJECT, 404: OpenApiTypes.OBJECT},
        description="Actualiza parcialmente un usuario. Moderador no puede cambiar roles ni editar admins.",
    )
    def put(self, request, usuario_id: int):
        try:
            u = Usuario.objects.get(id=usuario_id)
        except Usuario.DoesNotExist:
            return Response({"detail": "no encontrado"}, status=404)
        try:
            enforce_same_community_or_admin(request, u.comunidad_id)
        except PermissionError as ex:
            return Response({"detail": str(ex)}, status=403)

        requester_role = get_claim(request, "rol_usuario_id")

        if requester_role != ROLE_ADMIN:
            if "rol_usuario_id" in request.data:
                return Response({"detail": "No autorizado para cambiar rol de usuarios"}, status=403)
            if u.rol_usuario_id == ROLE_ADMIN:
                return Response({"detail": "No autorizado para editar admins"}, status=403)
            if str(request.data.get("rol_usuario_id", "")).strip() == str(ROLE_ADMIN):
                return Response({"detail": "No autorizado para asignar rol admin"}, status=403)

        ser = UsuarioUpdateSerializer(data=request.data, partial=True)
        if not ser.is_valid():
            return Response({"errors": ser.errors}, status=400)

        if not ser.validated_data:
            return Response({"detail": "Nada para actualizar"}, status=400)

        update_fields = []
        for k, v in ser.validated_data.items():
            setattr(u, k, v)
            update_fields.append(k)

        u.actualizado_en = timezone.now()
        update_fields.append("actualizado_en")

        u.save(update_fields=update_fields)
        return Response({"success": True})

    @extend_schema(
        operation_id="usuarios_delete",
        tags=["usuarios"],
        responses={204: None, 403: OpenApiTypes.OBJECT, 404: OpenApiTypes.OBJECT},
        description="Elimina un usuario. Moderador no puede eliminar admins ni fuera de su comunidad.",
    )
    def delete(self, request, usuario_id: int):
        try:
            u = Usuario.objects.get(id=usuario_id)
        except Usuario.DoesNotExist:
            return Response({"detail": "no encontrado"}, status=404)

        requester_role = get_claim(request, "rol_usuario_id")

        if requester_role != ROLE_ADMIN:
            try:
                enforce_same_community_or_admin(request, u.comunidad_id)
            except PermissionError as ex:
                return Response({"detail": str(ex)}, status=403)
            if u.rol_usuario_id == ROLE_ADMIN:
                return Response({"detail": "No autorizado para eliminar admins"}, status=403)

        u.delete()
        return Response(status=204)


class ModeradorCreateView(APIView):
    """
    Crea un moderador (rol=2) para una comunidad con reglas…
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(
        operation_id="usuarios_moderador_create",
        tags=["usuarios"],
        request=UsuarioCreateModeradorSerializer,
        responses={201: OpenApiTypes.OBJECT, 400: OpenApiTypes.OBJECT, 404: OpenApiTypes.OBJECT},
        description="Crea un moderador único por comunidad y setea comunidad.correo_contacto_admin.",
    )
    def post(self, request):
        ser = UsuarioCreateModeradorSerializer(data=request.data)
        if not ser.is_valid():
            return Response({"errors": ser.errors}, status=400)
        d = ser.validated_data

        try:
            com = Comunidad.objects.get(id=d["comunidad_id"])
        except Comunidad.DoesNotExist:
            return Response({"detail": "Comunidad no encontrada"}, status=404)

        if Usuario.objects.filter(comunidad_id=d["comunidad_id"], rol_usuario_id=ROLE_MOD).exists():
            return Response({"detail": "La comunidad ya tiene un moderador asignado"}, status=400)

        if Usuario.objects.filter(correo=d["correo"], rol_usuario_id=ROLE_MOD).exists():
            return Response({"detail": "El correo ya está usado por otro moderador"}, status=400)

        now = timezone.now()
        pw_hash = bcrypt.hashpw(d["password"].encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        u = Usuario.objects.create(
            comunidad_id=d["comunidad_id"],
            vivienda_id=None,
            correo=d["correo"],
            password_hash=pw_hash,
            nombre=d["nombre"].strip(),
            apellidos=d["apellidos"].strip(),
            telefono=(d.get("telefono") or None),
            rol_usuario_id=ROLE_MOD,
            estado_usuario_id=1,  # Activo
            promedio_rating=0,
            cantidad_ratings=0,
            registrado_en=now,
            actualizado_en=now,
        )

        Comunidad.objects.filter(id=com.id).update(correo_contacto_admin=d["correo"])

        return Response({"ok": True, "id": u.id}, status=201)


# ====== NUEVOS: /usuarios/me/ y /usuarios/publico/<id>/ ======

def _get_current_usuario(request) -> Usuario:
    """
    Resuelve el Usuario real desde los claims o el request.user.id.
    Soporta distintos nombres de claim: id, user_id, usuario_id, sub, correo.
    """
    # 1) intenta por id en claims
    for k in ("id", "user_id", "usuario_id", "sub"):
        v = get_claim(request, k)
        if v:
            try:
                return Usuario.objects.get(id=int(v))
            except (Usuario.DoesNotExist, ValueError):
                pass

    # 2) intenta por request.user.id si existe (SimpleJWT puede tenerlo)
    uid = getattr(request.user, "id", None)
    if uid:
        try:
            return Usuario.objects.get(id=int(uid))
        except (Usuario.DoesNotExist, ValueError):
            pass

    # 3) intenta por correo en claims
    for k in ("correo", "email"):
        v = get_claim(request, k)
        if v:
            u = Usuario.objects.filter(correo=v).first()
            if u:
                return u

    # Si nada funcionó → 404
    raise Usuario.DoesNotExist


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="usuarios_me_get",
        tags=["usuarios"],
        responses={200: MeSerializer},
        description="Devuelve el perfil del usuario autenticado.",
    )
    def get(self, request):
        try:
            u = _get_current_usuario(request)
        except Usuario.DoesNotExist:
            return Response({"detail": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        # Obtener nombre del rol (Admin, Moderador, Residente)
        try:
            rol_nombre = (
                RolUsuario.objects
                .values_list("nombre", flat=True)
                .get(id=u.rol_usuario_id)
            )
        except RolUsuario.DoesNotExist:
            rol_nombre = None

        # stats (intercambios, publicaciones, ultimas_valoraciones)
        stats = _get_user_stats(u)

        # Inyectar atributos “dinámicos” en la instancia antes de serializar
        u.intercambios_realizados = stats["intercambios_realizados"]
        u.publicaciones_activas = stats["publicaciones_activas"]
        u.rol_nombre = rol_nombre

        data = MeSerializer().to_representation(u)
        # añadimos stats + rol + rating al payload final
        data.update({
            "intercambios_realizados": stats["intercambios_realizados"],
            "publicaciones_activas": stats["publicaciones_activas"],
            "ultimas_valoraciones": stats["ultimas_valoraciones"],
            "rol_usuario_id": u.rol_usuario_id,
            "rol_nombre": rol_nombre,
            "promedio_rating": stats["promedio_rating"],
    "cantidad_ratings": stats["cantidad_ratings"],
        })

        return Response(data, status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="usuarios_me_patch",
        tags=["usuarios"],
        request=MeSerializer,
        responses={200: MeSerializer, 400: OpenApiTypes.OBJECT},
        description="Actualiza nombre, apellidos y teléfono del usuario autenticado.",
    )
    def patch(self, request):
        try:
            u = _get_current_usuario(request)
        except Usuario.DoesNotExist:
            return Response({"detail": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        ser = MeSerializer(data=request.data, partial=True)
        if not ser.is_valid():
            return Response({"errors": ser.errors}, status=status.HTTP_400_BAD_REQUEST)

        # Persiste cambios en el registro real de authapp.Usuario
        ser.update(u, ser.validated_data)

        # Reutilizamos la lógica de get() para devolver el payload completo
        return self.get(request)


class PublicProfileView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="usuarios_publico_get",
        tags=["usuarios"],
        responses={200: PublicUserSerializer, 404: OpenApiTypes.OBJECT},
        description="Perfil público básico por ID (mismos campos que consume el front).",
    )
    def get(self, request, usuario_id: int):
        u = get_object_or_404(Usuario, pk=usuario_id)

        # Obtener nombre del rol ( Admin, Moderador, Residente)
        try:
            rol_nombre = (
                RolUsuario.objects
                .values_list("nombre", flat=True)
                .get(id=u.rol_usuario_id)
            )
        except RolUsuario.DoesNotExist:
            rol_nombre = None

        stats = _get_user_stats(u)

        payload = {
            "id": u.id,
            "nombre": u.nombre,
            "apellidos": u.apellidos,
            "telefono": u.telefono,
            "correo": u.correo,
            "promedio_rating": stats["promedio_rating"],
            "cantidad_ratings": stats["cantidad_ratings"],
            "intercambios_realizados": stats["intercambios_realizados"],
            "publicaciones_activas": stats["publicaciones_activas"],
            "ultimas_valoraciones": stats["ultimas_valoraciones"],
            "rol_usuario_id": u.rol_usuario_id,
            "rol_nombre": rol_nombre,
        }
        return Response(PublicUserSerializer(payload).data)
