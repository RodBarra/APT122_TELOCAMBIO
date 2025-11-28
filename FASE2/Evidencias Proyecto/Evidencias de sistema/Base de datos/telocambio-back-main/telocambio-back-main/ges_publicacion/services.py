# ges_publicacion/services.py
from datetime import datetime
from django.db import models
from rest_framework.exceptions import ValidationError
from .models import Publicacion, ImagenPublicacion

# Estados de publicación
ESTADO_ACTIVA    = 1
ESTADO_OCULTA    = 2
ESTADO_REALIZADA = 3

# Estados de intercambio
ESTADO_INT_PENDIENTE  = 1
ESTADO_INT_FINALIZADO = 2
ESTADO_INT_CANCELADO  = 3
ESTADO_INT_ACEPTADO   = 4

MAX_ACTIVAS_POR_USUARIO = 5
MAX_TOTALES_POR_USUARIO = 10


def _esta_bloqueada(publicacion_id: int) -> bool:
    """
    Una publicación queda BLOQUEADA si participa en algún intercambio
    en estado ACEPTADO (4) o FINALIZADO (2).
    """
    from ges_intercambio.models import Intercambio
    return Intercambio.objects.filter(
        estado_intercambio_id__in=[ESTADO_INT_ACEPTADO, ESTADO_INT_FINALIZADO]
    ).filter(
        models.Q(publicacion_solicitada_id=publicacion_id) |
        models.Q(publicacion_ofrecida_id=publicacion_id)
    ).exists()


def validar_limite_publicaciones_activas(usuario_id: int):
    """Límite 5 SOLO para publicaciones ACTIVAS (estado=1)."""
    activas = Publicacion.objects.filter(
        propietario_usuario_id=usuario_id,
        estado_publicacion_id=ESTADO_ACTIVA,
    ).count()
    if activas >= MAX_ACTIVAS_POR_USUARIO:
        raise ValidationError("Has alcanzado el límite de 5 publicaciones activas.")


def validar_limite_total_publicaciones(usuario_id: int):
    """Límite 10 totales por usuario (activas + ocultas + realizadas)."""
    totales = Publicacion.objects.filter(propietario_usuario_id=usuario_id).count()
    if totales >= MAX_TOTALES_POR_USUARIO:
        raise ValidationError("Has alcanzado el límite total de 10 publicaciones por usuario.")


def validar_publicable(pub_id: int):
    if ImagenPublicacion.objects.filter(publicacion_id=pub_id).count() < 1:
        raise ValidationError("Para activar una publicación necesitas al menos 1 imagen.")


def assert_permite_edicion(pub: Publicacion):
    """
    Bloquea cualquier intento de edición (título, descripción, imágenes, etc.)
    si la publicación está realizada o bloqueada por un intercambio aceptado/finalizado.
    """
    if pub.estado_publicacion_id == ESTADO_REALIZADA:
        raise ValidationError("La publicación está realizada y no permite cambios.")
    if _esta_bloqueada(pub.id):
        raise ValidationError(
            "La publicación está vinculada a un intercambio aceptado/finalizado y no permite cambios."
        )


def cambiar_estado(pub: Publicacion, nuevo_estado: int, es_owner: bool, es_moderador: bool):
    """
    Cambia el estado de la publicación validando:
      - permisos
      - reglas de bloqueo por intercambio
      - límites y requisitos (imágenes)
    """
    # Regla global: si está realizada o bloqueada → no se permiten cambios
    if pub.estado_publicacion_id == ESTADO_REALIZADA:
        raise ValidationError("La publicación está realizada y no permite cambios.")
    if _esta_bloqueada(pub.id):
        raise ValidationError(
            "La publicación está vinculada a un intercambio aceptado/finalizado y no permite cambios."
        )

    if nuevo_estado == ESTADO_ACTIVA:
        if not (es_owner or es_moderador):
            raise ValidationError("No autorizado para activar.")
        validar_publicable(pub.id)
        validar_limite_publicaciones_activas(pub.propietario_usuario_id)

    elif nuevo_estado == ESTADO_OCULTA:
        if not (es_owner or es_moderador):
            raise ValidationError("No autorizado para ocultar.")

    elif nuevo_estado == ESTADO_REALIZADA:
        if not es_owner:
            raise ValidationError("Solo el propietario puede marcar como realizada.")

    else:
        raise ValidationError("Estado inválido.")

    pub.estado_publicacion_id = nuevo_estado
    pub.actualizada_en = datetime.utcnow()
    pub.save()
    return pub
