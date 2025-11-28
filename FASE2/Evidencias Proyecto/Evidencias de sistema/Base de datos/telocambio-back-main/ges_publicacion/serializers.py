# ges_publicacion/serializers.py
from __future__ import annotations

from typing import Optional, List

from django.db.models import Q
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field, OpenApiTypes

from .models import Publicacion, ImagenPublicacion
from ges_usuario.models import Usuario
from ges_intercambio.models import Intercambio

# Estados de intercambio
ESTADO_INT_PENDIENTE  = 1
ESTADO_INT_FINALIZADO = 2
ESTADO_INT_CANCELADO  = 3
ESTADO_INT_ACEPTADO   = 4


class ImagenPublicacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagenPublicacion
        fields = ["id", "url", "posicion", "creada_en"]
        read_only_fields = ["id", "creada_en"]


class PublicacionCreateUpdateSerializer(serializers.ModelSerializer):
    # alias hacia el campo real en BD
    condicion_publicacion_id = serializers.IntegerField(source="condicion_producto_id")
    # seteados por la vista
    comunidad_id = serializers.IntegerField(write_only=True, required=False)
    propietario_usuario_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Publicacion
        fields = [
            "id",
            "comunidad_id",
            "propietario_usuario_id",
            "categoria_id",
            "tipo_publicacion_id",
            "titulo",
            "descripcion",
            "condicion_publicacion_id",
            "estado_publicacion_id",
            "creada_en",
            "actualizada_en",
        ]
        read_only_fields = ["id", "creada_en", "actualizada_en"]
        extra_kwargs = {"estado_publicacion_id": {"required": False}}

    def validate_titulo(self, val: str) -> str:
        if not (3 <= len(val) <= 120):
            raise serializers.ValidationError("El título debe tener entre 3 y 120 caracteres.")
        return val

    def validate_descripcion(self, val: Optional[str]) -> Optional[str]:
        if val and len(val) > 2000:
            raise serializers.ValidationError("La descripción no debe exceder 2000 caracteres.")
        return val


def _esta_bloqueada(pub: Publicacion) -> bool:
    return Intercambio.objects.filter(
        estado_intercambio_id__in=[ESTADO_INT_ACEPTADO, ESTADO_INT_FINALIZADO]
    ).filter(
        Q(publicacion_solicitada_id=pub.id) | Q(publicacion_ofrecida_id=pub.id)
    ).exists()


# =============================
# LIST (usa anotaciones del queryset)
# =============================
class PublicacionListSerializer(serializers.ModelSerializer):
    condicion_publicacion_id = serializers.IntegerField(source="condicion_producto_id")

    # Estas vienen anotadas desde el ViewSet (get_queryset)
    primera_imagen = serializers.CharField(read_only=True, allow_null=True)
    ofertas_count_total = serializers.IntegerField(read_only=True, allow_null=True)
    ofertas_count_pendientes = serializers.IntegerField(read_only=True, allow_null=True)
    bloqueada = serializers.BooleanField(read_only=True, allow_null=True)
    intercambio_en_progreso = serializers.BooleanField(read_only=True, allow_null=True)

    class Meta:
        model = Publicacion
        fields = [
            "id",
            "titulo",
            "categoria_id",
            "tipo_publicacion_id",
            "condicion_publicacion_id",
            "estado_publicacion_id",
            "creada_en",
            "actualizada_en",
            "primera_imagen",
            "ofertas_count_total",
            "ofertas_count_pendientes",
            "bloqueada",
            "intercambio_en_progreso",
        ]


# =============================
# DETAIL (aquí sí usamos MethodFields)
# =============================
class PublicacionDetailSerializer(serializers.ModelSerializer):
    propietario_usuario_id = serializers.IntegerField()
    condicion_publicacion_id = serializers.IntegerField(source="condicion_producto_id")
    imagenes = serializers.SerializerMethodField()

    propietario_nombre = serializers.SerializerMethodField()
    propietario_apellidos = serializers.SerializerMethodField()

    ofertas_count_total = serializers.SerializerMethodField()
    ofertas_count_pendientes = serializers.SerializerMethodField()
    bloqueada = serializers.SerializerMethodField()

    class Meta:
        model = Publicacion
        fields = [
            "id",
            "comunidad_id",
            "propietario_usuario_id",
            "propietario_nombre",
            "propietario_apellidos",
            "categoria_id",
            "tipo_publicacion_id",
            "titulo",
            "descripcion",
            "condicion_publicacion_id",
            "estado_publicacion_id",
            "creada_en",
            "actualizada_en",
            "imagenes",
            "ofertas_count_total",
            "ofertas_count_pendientes",
            "bloqueada",
        ]

    @extend_schema_field(ImagenPublicacionSerializer(many=True))
    def get_imagenes(self, obj: Publicacion) -> List[dict]:
        qs = (
            ImagenPublicacion.objects
            .filter(publicacion_id=obj.id)
            .order_by("posicion")
            .values("id", "url", "posicion", "creada_en")
        )
        return list(qs)

    def _get_owner(self, obj: Publicacion) -> Optional[Usuario]:
        try:
            return Usuario.objects.only("id", "nombre", "apellidos").get(id=obj.propietario_usuario_id)
        except Usuario.DoesNotExist:
            return None

    @extend_schema_field(OpenApiTypes.STR)
    def get_propietario_nombre(self, obj: Publicacion) -> Optional[str]:
        u = self._get_owner(obj)
        return u.nombre if u else None

    @extend_schema_field(OpenApiTypes.STR)
    def get_propietario_apellidos(self, obj: Publicacion) -> Optional[str]:
        u = self._get_owner(obj)
        return u.apellidos if u else None

    @extend_schema_field(OpenApiTypes.INT)
    def get_ofertas_count_total(self, obj: Publicacion) -> int:
        return Intercambio.objects.filter(
            Q(publicacion_solicitada_id=obj.id) | Q(publicacion_ofrecida_id=obj.id)
        ).count()

    @extend_schema_field(OpenApiTypes.INT)
    def get_ofertas_count_pendientes(self, obj: Publicacion) -> int:
        return Intercambio.objects.filter(
            Q(publicacion_solicitada_id=obj.id) | Q(publicacion_ofrecida_id=obj.id),
            estado_intercambio_id=ESTADO_INT_PENDIENTE,
        ).count()

    @extend_schema_field(OpenApiTypes.BOOL)
    def get_bloqueada(self, obj: Publicacion) -> bool:
        return _esta_bloqueada(obj)
