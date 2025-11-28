from django.db import IntegrityError
from django.utils import timezone
from typing import Optional, Dict
from .models import Notificacion

def _safe_create(**kwargs) -> Optional[Notificacion]:
    """
    Crea respetando el índice único (tipo, receptor, intercambio) cuando aplica.
    Si choca, no explota el flujo.
    """
    try:
        return Notificacion.objects.create(**kwargs)
    except IntegrityError:
        return None

def notify_oferta_recibida(comunidad_id: int, intercambio_id: int, receptor_usuario_id: int,
                           actor_usuario_id: int, publicacion_id: Optional[int] = None):
    _safe_create(
        comunidad_id=comunidad_id,
        receptor_usuario_id=receptor_usuario_id,
        actor_usuario_id=actor_usuario_id,
        tipo="OFERTA_RECIBIDA",
        titulo="Nueva oferta de intercambio",
        mensaje="Te enviaron una oferta por tu publicación.",
        intercambio_id=intercambio_id,
        publicacion_id=publicacion_id,
        link_url=f"/intercambios/{intercambio_id}",
        payload={},
        creada_en=timezone.now(),
    )

def notify_oferta_aceptada(comunidad_id: int, intercambio_id: int, receptor_usuario_id: int,
                           actor_usuario_id: int, publicacion_id: Optional[int] = None):
    _safe_create(
        comunidad_id=comunidad_id,
        receptor_usuario_id=receptor_usuario_id,
        actor_usuario_id=actor_usuario_id,
        tipo="OFERTA_ACEPTADA",
        titulo="Tu oferta fue aceptada",
        mensaje="El receptor aceptó tu oferta. Puedes coordinar y marcar realizado.",
        intercambio_id=intercambio_id,
        publicacion_id=publicacion_id,
        link_url=f"/intercambios/{intercambio_id}",
        payload={},
        creada_en=timezone.now(),
    )

def notify_marcado_realizado(comunidad_id: int, intercambio_id: int, receptor_usuario_id: int,
                             actor_usuario_id: int):
    _safe_create(
        comunidad_id=comunidad_id,
        receptor_usuario_id=receptor_usuario_id,
        actor_usuario_id=actor_usuario_id,
        tipo="INTERCAMBIO_MARCADO_REALIZADO",
        titulo="La otra parte marcó como realizado",
        mensaje="La contraparte marcó el intercambio como realizado. Confirma si ya se concretó.",
        intercambio_id=intercambio_id,
        link_url=f"/intercambios/{intercambio_id}",
        payload={},
        creada_en=timezone.now(),
    )

def notify_finalizado_pend_valorar(comunidad_id: int, intercambio_id: int, receptor_usuario_id: int,
                                   actor_usuario_id: Optional[int] = None, extra_payload: Optional[Dict]=None):
    _safe_create(
        comunidad_id=comunidad_id,
        receptor_usuario_id=receptor_usuario_id,
        actor_usuario_id=actor_usuario_id,
        tipo="INTERCAMBIO_FINALIZADO_PENDIENTE_VALORACION",
        titulo="Intercambio finalizado",
        mensaje="El intercambio fue finalizado. ¡Deja tu valoración!",
        intercambio_id=intercambio_id,
        link_url=f"/intercambios/{intercambio_id}#valorar",
        payload=extra_payload or {},
        creada_en=timezone.now(),
    )
