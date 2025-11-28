# ges_publicacion/views.py
from django.utils import timezone
from django.db.models import Q, Exists, OuterRef, Subquery, Count, IntegerField
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import ValidationError

from common.permissions import get_claim
from .models import Publicacion, ImagenPublicacion
from .serializers import (
    PublicacionCreateUpdateSerializer,
    PublicacionListSerializer,
    PublicacionDetailSerializer,
    ImagenPublicacionSerializer,
)
from .filters import filtrar
from .storage import upload_files_publication, delete_publication_files
from .services import (
    cambiar_estado,
    assert_permite_edicion,
    ESTADO_ACTIVA,
    ESTADO_OCULTA,
    ESTADO_REALIZADA,
    validar_limite_total_publicaciones,
)

# Estados intercambio
ESTADO_INT_PENDIENTE = 1
ESTADO_INT_FINALIZADO = 2
ESTADO_INT_CANCELADO = 3
ESTADO_INT_ACEPTADO = 4

# =============================
# Helpers
# =============================

def _valerr_to_str(ex: ValidationError) -> str:
    d = getattr(ex, "detail", ex)
    if isinstance(d, (list, tuple)) and d:
        return str(d[0])
    if isinstance(d, dict):
        for v in d.values():
            if isinstance(v, (list, tuple)) and v:
                return str(v[0])
            return str(v)
    return str(d)


def _reemplazar_imagenes_db(publicacion_id: int, imagenes_payload):
    ImagenPublicacion.objects.filter(publicacion_id=publicacion_id).delete()
    nuevas = []
    now = timezone.now()
    for i, img in enumerate(imagenes_payload[:4]):
        nuevas.append(
            ImagenPublicacion(
                publicacion_id=publicacion_id,
                url=img["url"],
                posicion=i,
                creada_en=now,
            )
        )
    ImagenPublicacion.objects.bulk_create(nuevas)
    return nuevas


# =============================
# VIEWSET PRINCIPAL
# =============================

class PublicacionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Publicacion.objects.all()

    def get_serializer_class(self):
        if self.action == "list":
            return PublicacionListSerializer
        if self.action == "retrieve":
            return PublicacionDetailSerializer
        return PublicacionCreateUpdateSerializer

    # =============================
    # QUERYSET OPTIMIZADO
    # =============================
    def get_queryset(self):
        request = self.request
        comunidad_id = get_claim(request, "comunidad_id")
        usuario_id = get_claim(request, "usuario_id")

        qs = Publicacion.objects.filter(comunidad_id=comunidad_id)

        if self.action == "list":
            mine = request.query_params.get("mine") == "true"

            from ges_intercambio.models import Intercambio

            # ---- Primera imagen ----
            primera_img_sq = ImagenPublicacion.objects.filter(
                publicacion_id=OuterRef("id")
            ).order_by("posicion").values("url")[:1]

            # ---- Base intercambios ----
            interc_base = Intercambio.objects.filter(
                Q(publicacion_solicitada_id=OuterRef("id")) |
                Q(publicacion_ofrecida_id=OuterRef("id"))
            )

            ofertas_total_sq = interc_base.annotate(
                c=Count("id")
            ).values("c")[:1]

            ofertas_pend_sq = interc_base.filter(
                estado_intercambio_id=ESTADO_INT_PENDIENTE
            ).annotate(
                c=Count("id")
            ).values("c")[:1]

            bloqueada_sq = interc_base.filter(
                estado_intercambio_id__in=[ESTADO_INT_ACEPTADO, ESTADO_INT_FINALIZADO]
            )

            en_progreso_sq = interc_base.filter(
                estado_intercambio_id__in=[1, 4]  # pendiente o aceptado
            )

            # ——— SCOPING ———
            if mine and usuario_id:
                qs = qs.filter(propietario_usuario_id=usuario_id)

                estado_str = request.query_params.get("estado_publicacion_id")
                if estado_str:
                    try:
                        qs = qs.filter(estado_publicacion_id=int(estado_str))
                    except ValueError:
                        pass
                else:
                    # solo activas u ocultas
                    qs = qs.filter(
                        estado_publicacion_id__in=[ESTADO_ACTIVA, ESTADO_OCULTA]
                    )
            else:
                qs = qs.filter(estado_publicacion_id=ESTADO_ACTIVA)

                if usuario_id:
                    qs = qs.exclude(propietario_usuario_id=usuario_id)

                qs = qs.exclude(estado_publicacion_id=ESTADO_REALIZADA)

                # eliminar bloqueadas del feed
                qs = qs.annotate(bloqueada=Exists(bloqueada_sq)).filter(bloqueada=False)

            # filtros (q, categoria, orden, etc)
            qs = filtrar(qs, request.query_params)

            # ---- ANOTACIONES ----
            qs = qs.annotate(
                primera_imagen=Subquery(primera_img_sq),
                ofertas_count_total=Subquery(ofertas_total_sq, output_field=IntegerField()),
                ofertas_count_pendientes=Subquery(ofertas_pend_sq, output_field=IntegerField()),
                intercambio_en_progreso=Exists(en_progreso_sq),
            )

        return qs

     # =============================
    # CREATE
    # =============================
    def create(self, request, *args, **kwargs):
        comunidad_id = get_claim(request, "comunidad_id")
        usuario_id = get_claim(request, "usuario_id")

        try:
            validar_limite_total_publicaciones(usuario_id)
        except ValidationError as ex:
            return Response({"detail": _valerr_to_str(ex)}, status=400)

        data = request.data.copy()
        data["comunidad_id"] = comunidad_id
        data["propietario_usuario_id"] = usuario_id
        data["estado_publicacion_id"] = ESTADO_OCULTA

        serializer = PublicacionCreateUpdateSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        pub = serializer.save(
            creada_en=timezone.now(),
            actualizada_en=timezone.now()
        )

        return Response({"success": True, "data": PublicacionDetailSerializer(pub).data}, status=201)

    # =============================
    # UPDATE
    # =============================
    def update(self, request, *args, **kwargs):
        pub = self.get_object()
        comunidad_id = get_claim(request, "comunidad_id")
        usuario_id = get_claim(request, "usuario_id")
        rol_id = get_claim(request, "rol_usuario_id")

        if pub.comunidad_id != comunidad_id:
            return Response({"detail": "Scoping inválido."}, status=403)

        es_owner = pub.propietario_usuario_id == usuario_id
        es_mod = rol_id in (1, 2)

        try:
            assert_permite_edicion(pub)
        except ValidationError as ex:
            return Response({"detail": _valerr_to_str(ex)}, status=400)

        data = request.data.copy()
        for k in ["comunidad_id", "propietario_usuario_id", "estado_publicacion_id"]:
            data.pop(k, None)

        serializer = PublicacionCreateUpdateSerializer(pub, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        pub = serializer.save(actualizada_en=timezone.now())

        return Response({"success": True, "data": PublicacionDetailSerializer(pub).data})

    # =============================
    # DELETE
    # =============================
    def destroy(self, request, *args, **kwargs):
        pub = self.get_object()
        comunidad_id = get_claim(request, "comunidad_id")
        usuario_id = get_claim(request, "usuario_id")
        rol_id = get_claim(request, "rol_usuario_id")

        if pub.comunidad_id != comunidad_id:
            return Response({"detail": "Scoping inválido."}, status=403)

        es_owner = pub.propietario_usuario_id == usuario_id
        es_mod = rol_id in (1, 2)

        try:
            assert_permite_edicion(pub)
        except ValidationError as ex:
            return Response({"detail": _valerr_to_str(ex)}, status=400)

        if es_owner:
            urls = list(
                ImagenPublicacion.objects
                .filter(publicacion_id=pub.id)
                .values_list("url", flat=True)
            )
            try:
                delete_publication_files(urls)
            except Exception:
                pass

            ImagenPublicacion.objects.filter(publicacion_id=pub.id).delete()
            pub.delete()
            return Response(status=204)

        if es_mod:
            try:
                cambiar_estado(pub, ESTADO_OCULTA, es_owner=False, es_moderador=True)
            except ValidationError as ex:
                return Response({"detail": _valerr_to_str(ex)}, status=400)
            return Response(status=204)

        return Response({"detail": "No autorizado."}, status=403)

    # =============================
    # PATCH ESTADO
    # =============================
    @action(detail=True, methods=["patch"], url_path="estado")
    def cambiar_estado_action(self, request, pk=None):
        pub = self.get_object()
        comunidad_id = get_claim(request, "comunidad_id")
        usuario_id = get_claim(request, "usuario_id")
        rol_id = get_claim(request, "rol_usuario_id")

        if pub.comunidad_id != comunidad_id:
            return Response({"detail": "Scoping inválido."}, status=403)

        es_owner = pub.propietario_usuario_id == usuario_id
        es_mod = rol_id in (1, 2)

        nuevo_estado = int(request.data.get("estado_publicacion_id", 0))

        try:
            cambiar_estado(pub, nuevo_estado, es_owner, es_mod)
        except ValidationError as ex:
            return Response({"detail": _valerr_to_str(ex)}, status=400)

        return Response({"success": True, "data": {"estado": pub.estado_publicacion_id}})

    # =============================
    # POST IMÁGENES (por URL)
    # =============================
    @action(detail=True, methods=["post"], url_path="imagenes")
    def gestionar_imagenes(self, request, pk=None):
        pub = self.get_object()
        comunidad_id = get_claim(request, "comunidad_id")
        usuario_id = get_claim(request, "usuario_id")
        rol_id = get_claim(request, "rol_usuario_id")

        if pub.comunidad_id != comunidad_id:
            return Response({"detail": "Scoping inválido."}, status=403)

        es_owner = pub.propietario_usuario_id == usuario_id
        es_mod = rol_id in (1, 2)

        try:
            assert_permite_edicion(pub)
        except ValidationError as ex:
            return Response({"detail": _valerr_to_str(ex)}, status=400)

        payload = request.data if isinstance(request.data, list) else request.data.get("imagenes", [])
        if not isinstance(payload, list):
            return Response({"detail": "Se espera lista de imágenes."}, status=400)

        old_urls = list(
            ImagenPublicacion.objects.filter(publicacion_id=pub.id).values_list("url", flat=True)
        )

        nuevas = _reemplazar_imagenes_db(pub.id, payload)

        info_msg = None
        if pub.estado_publicacion_id == ESTADO_OCULTA and len(nuevas) > 0:
            try:
                cambiar_estado(pub, ESTADO_ACTIVA, es_owner, es_mod)
            except ValidationError as ex:
                info_msg = _valerr_to_str(ex)

        new_urls = {img["url"] for img in payload if "url" in img}
        to_delete = [u for u in old_urls if u not in new_urls]

        try:
            delete_publication_files(to_delete)
        except Exception:
            pass

        pub.actualizada_en = timezone.now()
        pub.save(update_fields=["actualizada_en"])

        data = ImagenPublicacionSerializer(nuevas, many=True).data
        resp = {"success": True, "msg": "Imágenes actualizadas", "data": data}
        if info_msg:
            resp["info"] = info_msg
        return Response(resp)

    # =============================
    # POST IMÁGENES/UPLOAD
    # =============================
    @action(
        detail=True,
        methods=["post"],
        url_path="imagenes/upload",
        parser_classes=[MultiPartParser, FormParser],
    )
    def upload_imagenes(self, request, pk=None):
        pub = self.get_object()
        comunidad_id = get_claim(request, "comunidad_id")
        usuario_id = get_claim(request, "usuario_id")
        rol_id = get_claim(request, "rol_usuario_id")

        if pub.comunidad_id != comunidad_id:
            return Response({"detail": "Scoping inválido."}, status=403)

        es_owner = pub.propietario_usuario_id == usuario_id
        es_mod = rol_id in (1, 2)

        try:
            assert_permite_edicion(pub)
        except ValidationError as ex:
            return Response({"detail": _valerr_to_str(ex)}, status=400)

        files = request.FILES.getlist("files")
        if not files:
            return Response({"detail": "No se adjuntaron archivos."}, status=400)
        if len(files) > 4:
            return Response({"detail": "Máximo 4 imágenes."}, status=400)

        prepared = [(f.name, f.read(), f.content_type) for f in files]
        uploaded = upload_files_publication(pub.id, prepared)

        return Response({"success": True, "msg": "Imágenes subidas.", "data": uploaded})