from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.db.models import Q, Exists, OuterRef
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes

from .models import Comunidad
from authapp.models import Usuario
from .serializers import ComunidadCreateSerializer, ComunidadUpdateSerializer
from common.utils import user_ctx
from common.permissions import ROLE_MOD, IsCommunityActive


def row_to_dict(row, cols):
    return {col: val for col, val in zip(cols, row)}


class ComunidadCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=ComunidadCreateSerializer, responses={201: OpenApiTypes.OBJECT})
    def post(self, request):
        ctx = user_ctx(request)
        if not ctx["is_admin"]:
            return Response({"detail": "Solo Admin puede crear comunidades"}, status=403)

        ser = ComunidadCreateSerializer(data=request.data)
        if not ser.is_valid():
            return Response({"errors": ser.errors}, status=400)
        d = ser.validated_data

        # SQL directo por managed=False
        # Dejamos correo_contacto_admin en NULL al crear
        with connection.cursor() as cur:
            cur.execute(
                """
                INSERT INTO comunidad (nombre, tipo_id, direccion, correo_contacto_admin,
                                       estado_comunidad_id, codigo, creado_en)
                VALUES (%s,%s,%s,NULL,%s,%s, NOW())
                RETURNING id
                """,
                [
                    d["nombre"], d["tipo_id"], d.get("direccion"),
                    d.get("estado_comunidad_id", 1), d["codigo"]
                ]
            )
            new_id = cur.fetchone()[0]

        return Response({"ok": True, "id": new_id}, status=201)


class ComunidadDetailView(APIView):
    # Importante: bloquea a miembros de comunidades suspendidas; Admin pasa igual
    permission_classes = [IsAuthenticated, IsCommunityActive]

    @extend_schema(parameters=[OpenApiParameter("id", int, OpenApiParameter.PATH)], responses={200: OpenApiTypes.OBJECT})
    def get(self, request, id: int):
        ctx = user_ctx(request)
        try:
            com = Comunidad.objects.get(id=id)
        except Comunidad.DoesNotExist:
            return Response({"detail": "No encontrada"}, status=404)

        # Solo Admin o miembros de esa comunidad
        if not (ctx["is_admin"] or ctx["comunidad_id"] == com.id):
            return Response({"detail": "Prohibido"}, status=403)

        data = {
            "id": com.id, "nombre": com.nombre, "tipo_id": com.tipo_id,
            "direccion": com.direccion, "correo_contacto_admin": com.correo_contacto_admin,
            "estado_comunidad_id": com.estado_comunidad_id, "codigo": com.codigo,
            "creado_en": com.creado_en,
        }
        return Response(data)

    @extend_schema(
        parameters=[OpenApiParameter("id", int, OpenApiParameter.PATH)],
        request=ComunidadUpdateSerializer,
        responses={200: OpenApiTypes.OBJECT}
    )
    def put(self, request, id: int):
        ctx = user_ctx(request)
        if not ctx["is_admin"]:
            return Response({"detail": "Solo Admin puede editar"}, status=403)

        ser = ComunidadUpdateSerializer(data=request.data)
        if not ser.is_valid():
            return Response({"errors": ser.errors}, status=400)

        d = ser.validated_data
        if not d:
            return Response({"detail": "Nada para actualizar"}, status=400)

        # Solo nombre y estado_comunidad_id son editables (ya restringido por serializer)
        Comunidad.objects.filter(id=id).update(**d)
        return Response({"ok": True, "id": id})


class ComunidadListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter("q", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False,
                             description="Busca por nombre o código"),
            OpenApiParameter("tipo_id", OpenApiTypes.INT, OpenApiParameter.QUERY, required=False),
            OpenApiParameter("estado", OpenApiTypes.INT, OpenApiParameter.QUERY, required=False),
            OpenApiParameter("ordering", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False,
                             description="Campos: id, nombre, tipo_id, estado_comunidad_id, codigo, creado_en. Usa '-' para descendente."),
            OpenApiParameter("page", OpenApiTypes.INT, OpenApiParameter.QUERY, required=False),
            OpenApiParameter("page_size", OpenApiTypes.INT, OpenApiParameter.QUERY, required=False),
            OpenApiParameter("sin_moderador", OpenApiTypes.INT, OpenApiParameter.QUERY, required=False,
                             description="1 para listar solo comunidades sin moderador asignado"),
        ],
        responses={200: OpenApiTypes.OBJECT}
    )
    def get(self, request):
        ctx = user_ctx(request)
        if not ctx["is_admin"]:
            return Response({"detail": "Solo Admin puede listar todas"}, status=403)

        q = (request.query_params.get("q") or "").strip()
        tipo_id = request.query_params.get("tipo_id")
        estado = request.query_params.get("estado")
        sin_moderador = request.query_params.get("sin_moderador") in ("1", "true", "True")
        ordering = request.query_params.get("ordering") or "-creado_en"
        page = int(request.query_params.get("page") or 1)
        page_size = int(request.query_params.get("page_size") or 10)

        qs = Comunidad.objects.all()

        if q:
            qs = qs.filter(Q(nombre__icontains=q) | Q(codigo__icontains=q))
        if tipo_id:
            qs = qs.filter(tipo_id=int(tipo_id))
        if estado:
            qs = qs.filter(estado_comunidad_id=int(estado))

        if sin_moderador:
            subq_mod = Usuario.objects.filter(rol_usuario_id=ROLE_MOD, comunidad_id=OuterRef("id"))
            qs = qs.annotate(tiene_mod=Exists(subq_mod)).filter(tiene_mod=False)

        allowed = {"id", "nombre", "tipo_id", "estado_comunidad_id", "codigo", "creado_en"}
        ord_key = ordering.lstrip("-")
        if ord_key not in allowed:
            ordering = "-creado_en"
        qs = qs.order_by(ordering)

        total = qs.count()
        start = max(0, (page - 1) * page_size)
        end = start + page_size
        page_qs = list(qs[start:end])

        com_ids = [c.id for c in page_qs]
        mod_map = {}
        if com_ids:
            mods = (
                Usuario.objects
                .filter(rol_usuario_id=ROLE_MOD, comunidad_id__in=com_ids)
                .only("comunidad_id", "correo")
                .order_by("id")
            )
            seen = set()
            for m in mods:
                if m.comunidad_id not in seen:
                    mod_map[m.comunidad_id] = m.correo
                    seen.add(m.comunidad_id)

        items = [{
            "id": c.id,
            "nombre": c.nombre,
            "tipo_id": c.tipo_id,
            "estado_comunidad_id": c.estado_comunidad_id,
            "codigo": c.codigo,
            "creado_en": c.creado_en,
            "moderador_correo": mod_map.get(c.id),
        } for c in page_qs]

        return Response({
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
        })
