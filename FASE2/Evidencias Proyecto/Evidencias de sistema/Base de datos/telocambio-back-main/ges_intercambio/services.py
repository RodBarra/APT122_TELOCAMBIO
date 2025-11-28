# ges_intercambio/services.py
from django.utils import timezone
from django.db import IntegrityError
from django.db.models import Q
from rest_framework.exceptions import ValidationError

from .models import Intercambio, IntercambioConfirmacion
from common.permissions import ROLE_ADMIN
from ges_publicacion.models import Publicacion, ESTADO_REALIZADA

ESTADO_PENDIENTE  = 1
ESTADO_FINALIZADO = 2
ESTADO_CANCELADO  = 3
ESTADO_ACEPTADO   = 4  # NUEVO


def _marcar_publicaciones_realizadas(intercambio: Intercambio):
    """
    Marca ambas publicaciones del intercambio como REALIZADA (si no lo están).
    """
    try:
        pub_sol = Publicacion.objects.get(id=intercambio.publicacion_solicitada_id)
        pub_ofr = Publicacion.objects.get(id=intercambio.publicacion_ofrecida_id)
        now = timezone.now()
        if pub_sol.estado_publicacion_id != ESTADO_REALIZADA:
            pub_sol.estado_publicacion_id = ESTADO_REALIZADA
            pub_sol.actualizada_en = now
            pub_sol.save(update_fields=["estado_publicacion_id", "actualizada_en"])
        if pub_ofr.estado_publicacion_id != ESTADO_REALIZADA:
            pub_ofr.estado_publicacion_id = ESTADO_REALIZADA
            pub_ofr.actualizada_en = now
            pub_ofr.save(update_fields=["estado_publicacion_id", "actualizada_en"])
    except Publicacion.DoesNotExist:
        # No rompemos el flujo si faltara alguna.
        pass


def _cancelar_otros_pendientes(intercambio: Intercambio, actor_usuario_id: int):
    """
    Al finalizar un intercambio, cancelamos automáticamente cualquier otro
    intercambio PENDIENTE o ACEPTADO que involucre alguna de las dos publicaciones,
    en cualquier rol (solicitada u ofrecida).
    """
    ids = [intercambio.publicacion_solicitada_id, intercambio.publicacion_ofrecida_id]
    now = timezone.now()

    (Intercambio.objects
        .filter(
            comunidad_id=intercambio.comunidad_id,
            estado_intercambio_id__in=[ESTADO_PENDIENTE, ESTADO_ACEPTADO],
        )
        .exclude(id=intercambio.id)
        .filter(Q(publicacion_solicitada_id__in=ids) | Q(publicacion_ofrecida_id__in=ids))
        .update(
            estado_intercambio_id=ESTADO_CANCELADO,
            ultimo_estado_por_usuario_id=actor_usuario_id,
            actualizado_en=now
        )
    )


def cambiar_estado(intercambio: Intercambio, nuevo_estado: int, actor_usuario_id: int, rol_id: int):
    """
    Reglas:
      - PENDIENTE -> ACEPTADO  (solo RECEPTOR o Admin)
      - PENDIENTE|ACEPTADO -> CANCELADO (cualquiera de las partes o Admin)
      - FINALIZADO se logra vía confirmar_realizado() cuando ambas partes confirman.
    """
    estado = intercambio.estado_intercambio_id
    es_admin = (rol_id == ROLE_ADMIN)
    es_solicitante = (actor_usuario_id == intercambio.solicitante_usuario_id)
    es_receptor = (actor_usuario_id == intercambio.receptor_usuario_id)

    if nuevo_estado == ESTADO_ACEPTADO:
        if estado != ESTADO_PENDIENTE:
            raise ValidationError("Solo se puede aceptar un intercambio pendiente.")
        if not (es_receptor or es_admin):
            raise ValidationError("Solo el receptor puede aceptar la oferta.")
    elif nuevo_estado == ESTADO_CANCELADO:
        if estado not in (ESTADO_PENDIENTE, ESTADO_ACEPTADO):
            raise ValidationError("Solo se puede cancelar si está pendiente o aceptado.")
        if not (es_solicitante or es_receptor or es_admin):
            raise ValidationError("Solo participantes o admin pueden cancelar.")
    else:
        raise ValidationError("Estado inválido. Usa 'aceptar' o 'cancelar'.")

    intercambio.estado_intercambio_id = nuevo_estado
    intercambio.ultimo_estado_por_usuario_id = actor_usuario_id
    intercambio.actualizado_en = timezone.now()
    intercambio.save(update_fields=["estado_intercambio_id", "ultimo_estado_por_usuario_id", "actualizado_en"])
    return intercambio


def confirmar_realizado(intercambio: Intercambio, actor_usuario_id: int):
    """
    Registra la confirmación del actor. Cuando confirman AMBAS partes,
    pasa a FINALIZADO, marca publicaciones como REALIZADA y cancela
    automáticamente otras ofertas pendientes relacionadas a esas publicaciones.
    """
    if intercambio.estado_intercambio_id != ESTADO_ACEPTADO:
        raise ValidationError("Solo se puede confirmar un intercambio aceptado/en curso.")

    # idempotente
    try:
        IntercambioConfirmacion.objects.create(
            intercambio_id=intercambio.id,
            usuario_id=actor_usuario_id,
            confirmado_en=timezone.now(),
        )
    except IntegrityError:
        # ya había confirmado
        pass

    partes = {intercambio.solicitante_usuario_id, intercambio.receptor_usuario_id}
    confirmantes = set(
        IntercambioConfirmacion.objects
        .filter(intercambio_id=intercambio.id)
        .values_list("usuario_id", flat=True)
    )
    if partes.issubset(confirmantes):
        intercambio.estado_intercambio_id = ESTADO_FINALIZADO
        intercambio.ultimo_estado_por_usuario_id = actor_usuario_id
        intercambio.actualizado_en = timezone.now()
        intercambio.save(update_fields=["estado_intercambio_id", "ultimo_estado_por_usuario_id", "actualizado_en"])

        # Publicaciones quedan marcadas como REALIZADA
        _marcar_publicaciones_realizadas(intercambio)

        # 🔒 Regla nueva: cancelar automáticamente otros pendientes relacionados
        _cancelar_otros_pendientes(intercambio, actor_usuario_id)

    return intercambio
