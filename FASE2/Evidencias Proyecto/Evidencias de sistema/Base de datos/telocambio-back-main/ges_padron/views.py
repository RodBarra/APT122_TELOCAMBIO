# ges_padron/views.py
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import connection
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes

from .models import PadronAutorizado
from .serializers import PadronAddSerializer, PadronUpdateSerializer
from common.utils import user_ctx
from common.permissions import IsCommunityActive, ROLE_MOD


# ---- helpers ---------------------------------------------------------------

def _can_manage_padron(ctx, comunidad_id: int) -> bool:
    """Admin puede todo; Moderador solo su comunidad."""
    return ctx["is_admin"] or (ctx["rol_usuario_id"] == ROLE_MOD and ctx["comunidad_id"] == comunidad_id)


# ---- crear / upsert --------------------------------------------------------

class PadronAddView(APIView):
    permission_classes = [IsAuthenticated, IsCommunityActive]

    @extend_schema(
        request=PadronAddSerializer,
        parameters=[OpenApiParameter("comunidad_id", int, OpenApiParameter.PATH)],
        responses={201: OpenApiTypes.OBJECT},
        description="Agrega (o re-habilita) un correo al padrón de la comunidad."
    )
    def post(self, request, comunidad_id: int):
        ctx = user_ctx(request)
        if not _can_manage_padron(ctx, comunidad_id):
            return Response({"detail": "Prohibido"}, status=403)

        ser = PadronAddSerializer(data=request.data)
        if not ser.is_valid():
            return Response({"errors": ser.errors}, status=400)
        d = ser.validated_data

        with connection.cursor() as cur:
            cur.execute(
                """
                INSERT INTO padron_autorizado
                  (comunidad_id, correo, estado_padron_id, cargado_por_correo, cargado_en,
                   habilitado, usado)
                VALUES (%s, lower(%s), 1, %s, NOW(), TRUE, FALSE)
                ON CONFLICT (comunidad_id, correo)
                DO UPDATE SET
                  habilitado = TRUE,                 -- re-habilita si ya existía
                  usado = padron_autorizado.usado    -- no tocar 'usado' aquí
                RETURNING id
                """,
                [comunidad_id, d["correo"], (getattr(request.user, "email", None) or "moderador@local")]
            )
            new_id = cur.fetchone()[0]

        return Response({"ok": True, "id": new_id}, status=201)


# ---- listado (+ autolimpieza) ---------------------------------------------

class PadronListView(APIView):
    permission_classes = [IsAuthenticated, IsCommunityActive]

    @extend_schema(
        parameters=[
            OpenApiParameter("comunidad_id", int, OpenApiParameter.PATH),
            OpenApiParameter("q", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
            OpenApiParameter("estado", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False,
                             description="Libre | Usado"),
            OpenApiParameter("habilitado", OpenApiTypes.BOOL, OpenApiParameter.QUERY, required=False),
        ],
        responses={200: OpenApiTypes.OBJECT},
        description="Lista correos del padrón (con filtros). Limpia registros > 30 días antes de listar."
    )
    def get(self, request, comunidad_id: int):
        ctx = user_ctx(request)
        if not _can_manage_padron(ctx, comunidad_id):
            return Response({"detail": "Prohibido"}, status=403)

        # --- autolimpieza: elimina cualquier registro de esta comunidad con antigüedad > 30d
        with connection.cursor() as cur:
            cur.execute(
                """
                DELETE FROM padron_autorizado
                 WHERE comunidad_id = %s
                   AND cargado_en < (NOW() - INTERVAL '30 days')
                """,
                [comunidad_id]
            )

        q = (request.query_params.get("q") or "").strip()
        estado = (request.query_params.get("estado") or "").strip().lower()  # "libre"|"usado"|"" 
        habilitado = request.query_params.get("habilitado")

        qs = PadronAutorizado.objects.filter(comunidad_id=comunidad_id).order_by("-cargado_en")

        if q:
            qs = qs.filter(correo__icontains=q)

        if estado in ("libre", "usado"):
            qs = qs.filter(usado=(estado == "usado"))

        if habilitado is not None:
            hv = str(habilitado).lower()
            if hv in ("true", "1"):
                qs = qs.filter(habilitado=True)
            elif hv in ("false", "0"):
                qs = qs.filter(habilitado=False)

        items = [{
            "id": it.id,
            "correo": it.correo,
            "habilitado": it.habilitado,
            "usado": it.usado,
            "cargado_en": it.cargado_en,
            "estado": "Usado" if it.usado else "Libre",
        } for it in qs[:500]]

        return Response({"items": items})


# ---- editar correo (solo si Libre) / borrar -------------------------------

class PadronItemView(APIView):
    """
    PATCH: editar correo SOLO si usado = false (estado Libre).
    DELETE: eliminar registro.
    """
    permission_classes = [IsAuthenticated, IsCommunityActive]

    @extend_schema(
        parameters=[
            OpenApiParameter("comunidad_id", int, OpenApiParameter.PATH),
            OpenApiParameter("id", int, OpenApiParameter.PATH),
        ],
        request=PadronUpdateSerializer,
        responses={200: OpenApiTypes.OBJECT},
        description="Actualiza el correo de un registro del padrón si está en estado Libre."
    )
    def patch(self, request, comunidad_id: int, id: int):
        ctx = user_ctx(request)
        if not _can_manage_padron(ctx, comunidad_id):
            return Response({"detail": "Prohibido"}, status=403)

        ser = PadronUpdateSerializer(data=request.data, partial=True)
        if not ser.is_valid():
            return Response({"errors": ser.errors}, status=400)

        new_correo = ser.validated_data.get("correo")
        if not new_correo:
            return Response({"detail": "Nada para actualizar"}, status=400)

        try:
            p = PadronAutorizado.objects.get(id=id, comunidad_id=comunidad_id)
        except PadronAutorizado.DoesNotExist:
            return Response({"detail": "No encontrado"}, status=404)

        if p.usado:
            return Response({"detail": "No se puede editar un padrón ya usado"}, status=400)

        # respetar unique (comunidad_id, correo); lower() para normalizar
        with connection.cursor() as cur:
            cur.execute(
                """
                UPDATE padron_autorizado
                   SET correo = lower(%s)
                 WHERE id = %s AND comunidad_id = %s
                """,
                [new_correo, id, comunidad_id]
            )

        return Response({"ok": True})

    @extend_schema(
        parameters=[
            OpenApiParameter("comunidad_id", int, OpenApiParameter.PATH),
            OpenApiParameter("id", int, OpenApiParameter.PATH),
        ],
        responses={200: OpenApiTypes.OBJECT},
        description="Elimina un registro del padrón."
    )
    def delete(self, request, comunidad_id: int, id: int):
        ctx = user_ctx(request)
        if not _can_manage_padron(ctx, comunidad_id):
            return Response({"detail": "Prohibido"}, status=403)

        with connection.cursor() as cur:
            cur.execute(
                "DELETE FROM padron_autorizado WHERE id = %s AND comunidad_id = %s",
                [id, comunidad_id]
            )
            count = cur.rowcount

        if count == 0:
            return Response({"detail": "No encontrado"}, status=404)
        return Response({"ok": True, "deleted": id})
