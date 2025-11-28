from django.utils import timezone
from django.db import IntegrityError
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from common.permissions import get_claim
from .models import Intercambio, ValoracionUsuario
from .serializers import (
    IntercambioCreateSerializer,
    IntercambioListSerializer,
    IntercambioDetailSerializer,
    IntercambioAccionSerializer,
    ValoracionUsuarioCreateSerializer,
)
from .services import (
    cambiar_estado,
    confirmar_realizado,
    ESTADO_PENDIENTE,
    ESTADO_FINALIZADO,
    ESTADO_CANCELADO,
    ESTADO_ACEPTADO,
)

# === Notificaciones ===
from ges_notificacion.utils import (
    notify_oferta_recibida,
    notify_oferta_aceptada,
    notify_marcado_realizado,
    notify_finalizado_pend_valorar,
)


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


class IntercambioViewSet(viewsets.ModelViewSet):
    """
    Endpoints:
      - POST   /intercambios/                   (crear oferta)
      - GET    /intercambios/?box=inbox|outbox&estado=1..4&publicacion_solicitada_id=ID
      - GET    /intercambios/{id}/
      - PATCH  /intercambios/{id}/aceptar/               -> estado 4
      - PATCH  /intercambios/{id}/cancelar/              -> estado 3
      - PATCH  /intercambios/{id}/confirmar-realizado/   -> finaliza si confirman ambas partes
      - POST   /intercambios/{id}/valorar/               -> ⭐ nueva valoración (1..5 + comentario)
    """
    permission_classes = [IsAuthenticated]
    queryset = Intercambio.objects.all()

    def get_serializer_class(self):
        if self.action == "list":
            return IntercambioListSerializer
        if self.action == "retrieve":
            return IntercambioDetailSerializer
        if self.action in ("create",):
            return IntercambioCreateSerializer
        return IntercambioDetailSerializer

    # -------------------- scoping & filtros --------------------
    def get_queryset(self):
        request = self.request
        comunidad_id = int(get_claim(request, "comunidad_id") or 0)
        usuario_id = int(get_claim(request, "usuario_id") or 0)

        qs = Intercambio.objects.filter(comunidad_id=comunidad_id)

        if self.action in ("list",):
            box = (request.query_params.get("box") or "").lower().strip()
            estado = request.query_params.get("estado")
            pub_solicitada = request.query_params.get("publicacion_solicitada_id")
            pub_ofrecida = request.query_params.get("publicacion_ofrecida_id")

            from django.db.models import Q
            if box == "inbox":
                qs = qs.filter(receptor_usuario_id=usuario_id)
            elif box == "outbox":
                qs = qs.filter(solicitante_usuario_id=usuario_id)
            else:
                qs = qs.filter(Q(receptor_usuario_id=usuario_id) | Q(solicitante_usuario_id=usuario_id))

            if estado:
                try:
                    qs = qs.filter(estado_intercambio_id=int(estado))
                except ValueError:
                    pass

            if pub_solicitada:
                try:
                    qs = qs.filter(publicacion_solicitada_id=int(pub_solicitada))
                except ValueError:
                    pass

            if pub_ofrecida:
                try:
                    qs = qs.filter(publicacion_ofrecida_id=int(pub_ofrecida))
                except ValueError:
                    pass

        return qs.order_by("-creado_en")

    # -------------------- crear oferta --------------------
    def create(self, request, *args, **kwargs):
        serializer = IntercambioCreateSerializer(
            data=request.data,
            context={
                "request": request,
                "usuario_id": get_claim(request, "usuario_id"),
                "comunidad_id": get_claim(request, "comunidad_id"),
            },
        )
        serializer.is_valid(raise_exception=True)
        try:
            obj = serializer.save(
                creado_en=timezone.now(),
                actualizado_en=timezone.now(),
            )
        except IntegrityError:
            return Response(
                {"detail": "No puedes repetir la misma oferta mientras exista otra pendiente."},
                status=400,
            )

        # === Notificación: oferta recibida (al RECEPTOR) ===
        try:
            notify_oferta_recibida(
                comunidad_id=int(get_claim(request, "comunidad_id")),
                intercambio_id=obj.id,
                receptor_usuario_id=obj.receptor_usuario_id,
                actor_usuario_id=obj.solicitante_usuario_id,
                publicacion_id=obj.publicacion_solicitada_id,
            )
        except Exception:
            pass  # No romper flujo si notificación falla

        out = IntercambioDetailSerializer(obj, context={"request": request}).data
        return Response({"success": True, "data": out}, status=status.HTTP_201_CREATED)

    # -------------------- asegurar scoping en retrieve --------------------
    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        token_com = int(get_claim(request, "comunidad_id") or 0)
        if int(obj.comunidad_id) != token_com:
            return Response({"detail": "Scoping inválido."}, status=403)
        uid = int(get_claim(request, "usuario_id") or 0)
        if uid not in (obj.solicitante_usuario_id, obj.receptor_usuario_id):
            return Response({"detail": "No autorizado."}, status=403)
        return Response(IntercambioDetailSerializer(obj, context={"request": request, "usuario_id": uid}).data)

    # -------------------- aceptar (a estado 4) --------------------
    @action(detail=True, methods=["patch"], url_path="aceptar")
    def aceptar(self, request, pk=None):
        obj = self.get_object()
        token_com = int(get_claim(request, "comunidad_id") or 0)
        if int(obj.comunidad_id) != token_com:
            return Response({"detail": "Scoping inválido."}, status=403)

        uid = int(get_claim(request, "usuario_id") or 0)
        rol_id = int(get_claim(request, "rol_usuario_id") or 0)

        serializer = IntercambioAccionSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        try:
            obj = cambiar_estado(obj, ESTADO_ACEPTADO, uid, rol_id)
        except ValidationError as ex:
            return Response({"detail": _valerr_to_str(ex)}, status=400)

        # === Notificación: oferta aceptada (al SOLICITANTE) ===
        try:
            notify_oferta_aceptada(
                comunidad_id=obj.comunidad_id,
                intercambio_id=obj.id,
                receptor_usuario_id=obj.solicitante_usuario_id,
                actor_usuario_id=obj.receptor_usuario_id,
                publicacion_id=obj.publicacion_solicitada_id,
            )
        except Exception:
            pass

        return Response({"success": True, "data": IntercambioDetailSerializer(obj, context={"request": request, "usuario_id": uid}).data})

    # -------------------- cancelar --------------------
    @action(detail=True, methods=["patch"], url_path="cancelar")
    def cancelar(self, request, pk=None):
        obj = self.get_object()
        token_com = int(get_claim(request, "comunidad_id") or 0)
        if int(obj.comunidad_id) != token_com:
            return Response({"detail": "Scoping inválido."}, status=403)

        uid = int(get_claim(request, "usuario_id") or 0)
        rol_id = int(get_claim(request, "rol_usuario_id") or 0)

        serializer = IntercambioAccionSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        try:
            obj = cambiar_estado(obj, ESTADO_CANCELADO, uid, rol_id)
        except ValidationError as ex:
            return Response({"detail": _valerr_to_str(ex)}, status=400)
        return Response({"success": True, "data": IntercambioDetailSerializer(obj, context={"request": request, "usuario_id": uid}).data})

    # -------------------- confirmar realizado (doble OK) --------------------
    @action(detail=True, methods=["patch"], url_path="confirmar-realizado")
    def confirmar_realizado_view(self, request, pk=None):
        obj = self.get_object()
        token_com = int(get_claim(request, "comunidad_id") or 0)
        if int(obj.comunidad_id) != token_com:
            return Response({"detail": "Scoping inválido."}, status=403)

        uid = int(get_claim(request, "usuario_id") or 0)

        estado_previo = obj.estado_intercambio_id
        try:
            obj = confirmar_realizado(obj, uid)
        except ValidationError as ex:
            return Response({"detail": _valerr_to_str(ex)}, status=400)

        # Notificación según resultado
        try:
            if obj.estado_intercambio_id == ESTADO_FINALIZADO and estado_previo != ESTADO_FINALIZADO:
                # Finalizado → notificar a AMBOS (pendiente valoración)
                notify_finalizado_pend_valorar(
                    comunidad_id=obj.comunidad_id,
                    intercambio_id=obj.id,
                    receptor_usuario_id=obj.solicitante_usuario_id,
                    actor_usuario_id=uid,
                    extra_payload={},
                )
                notify_finalizado_pend_valorar(
                    comunidad_id=obj.comunidad_id,
                    intercambio_id=obj.id,
                    receptor_usuario_id=obj.receptor_usuario_id,
                    actor_usuario_id=uid,
                    extra_payload={},
                )
            else:
                # Aún no finaliza → el actor marcó realizado → avisar a la otra parte
                other = obj.receptor_usuario_id if uid == obj.solicitante_usuario_id else obj.solicitante_usuario_id
                notify_marcado_realizado(
                    comunidad_id=obj.comunidad_id,
                    intercambio_id=obj.id,
                    receptor_usuario_id=other,
                    actor_usuario_id=uid,
                )
        except Exception:
            pass

        return Response({"success": True, "data": IntercambioDetailSerializer(obj, context={"request": request, "usuario_id": uid}).data})

     # -------------------- valorar (POST) --------------------
    @action(detail=True, methods=["post"], url_path="valorar")
    def valorar(self, request, pk=None):
        intercambio = self.get_object()
        token_com = int(get_claim(request, "comunidad_id") or 0)
        if int(intercambio.comunidad_id) != token_com:
            return Response({"detail": "Scoping inválido."}, status=403)

        uid = int(get_claim(request, "usuario_id") or 0)

        ser = ValoracionUsuarioCreateSerializer(
            data=request.data,
            context={"request": request, "usuario_id": uid, "intercambio": intercambio},
        )
        ser.is_valid(raise_exception=True)
        try:
            valor = ser.save()
        except ValidationError as ex:
            return Response({"detail": _valerr_to_str(ex)}, status=400)
        except IntegrityError:
            return Response({"detail": "Ya enviaste una valoración para este intercambio."}, status=400)

        return Response({"success": True, "data": {"intercambio_id": intercambio.id, "ok": True}}, status=201)

    # -------------------- NUEVO: obtener mi valoración (GET) --------------------
    @action(detail=True, methods=["get"], url_path="valoracion/mia")
    def mi_valoracion(self, request, pk=None):
        intercambio = self.get_object()
        token_com = int(get_claim(request, "comunidad_id") or 0)
        if int(intercambio.comunidad_id) != token_com:
            return Response({"detail": "Scoping inválido."}, status=403)

        uid = int(get_claim(request, "usuario_id") or 0)

        try:
            v = ValoracionUsuario.objects.get(intercambio_id=intercambio.id, calificador_usuario_id=uid)
        except ValoracionUsuario.DoesNotExist:
            # 200 vacío para evitar ruidos en logs/UX
            return Response({"success": True, "data": None}, status=200)

        return Response({"puntaje": v.puntaje, "comentario": v.comentario or ""})
