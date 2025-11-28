from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.permissions import get_claim
from .models import Notificacion
from .serializers import NotificacionSerializer

class NotificacionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Endpoints:
      - GET    /notificaciones/?soloNoLeidas=true|false
      - GET    /notificaciones/badge/           -> { no_leidas }
      - PATCH  /notificaciones/{id}/leer/       -> marca como leída
      - PATCH  /notificaciones/leer-todas/      -> marca todas como leídas
      - DELETE /notificaciones/{id}/            -> soft delete
    """
    permission_classes = [IsAuthenticated]
    serializer_class = NotificacionSerializer
    queryset = Notificacion.objects.all()

    def get_queryset(self):
        request = self.request
        com_id = int(get_claim(request, "comunidad_id") or 0)
        uid = int(get_claim(request, "usuario_id") or 0)
        solo_no_leidas = (request.query_params.get("soloNoLeidas") or "").lower() in ("1", "true", "t", "yes", "y")

        qs = (Notificacion.objects
              .filter(comunidad_id=com_id, receptor_usuario_id=uid, eliminada_en__isnull=True))

        if solo_no_leidas:
            qs = qs.filter(leida_en__isnull=True)

        return qs.order_by("-creada_en")

    @action(detail=False, methods=["get"], url_path="badge")
    def badge(self, request):
        com_id = int(get_claim(request, "comunidad_id") or 0)
        uid = int(get_claim(request, "usuario_id") or 0)
        count = (Notificacion.objects
                 .filter(comunidad_id=com_id, receptor_usuario_id=uid, eliminada_en__isnull=True, leida_en__isnull=True)
                 .count())
        return Response({"no_leidas": count})

    @action(detail=True, methods=["patch"], url_path="leer")
    def marcar_leida(self, request, pk=None):
        com_id = int(get_claim(request, "comunidad_id") or 0)
        uid = int(get_claim(request, "usuario_id") or 0)
        try:
            n = Notificacion.objects.get(id=int(pk), comunidad_id=com_id, receptor_usuario_id=uid, eliminada_en__isnull=True)
        except Notificacion.DoesNotExist:
            return Response({"detail": "No encontrada."}, status=404)

        if n.leida_en is None:
            n.leida_en = timezone.now()
            n.save(update_fields=["leida_en"])
        return Response({"success": True})

    @action(detail=False, methods=["patch"], url_path="leer-todas")
    def marcar_todas_leidas(self, request):
        com_id = int(get_claim(request, "comunidad_id") or 0)
        uid = int(get_claim(request, "usuario_id") or 0)
        now = timezone.now()
        updated = (Notificacion.objects
                   .filter(comunidad_id=com_id, receptor_usuario_id=uid, eliminada_en__isnull=True, leida_en__isnull=True)
                   .update(leida_en=now))
        return Response({"success": True, "marcadas": updated})

    def destroy(self, request, *args, **kwargs):
        com_id = int(get_claim(request, "comunidad_id") or 0)
        uid = int(get_claim(request, "usuario_id") or 0)
        try:
            n = Notificacion.objects.get(id=int(kwargs.get("pk")), comunidad_id=com_id, receptor_usuario_id=uid, eliminada_en__isnull=True)
        except Notificacion.DoesNotExist:
            return Response({"detail": "No encontrada."}, status=404)
        n.eliminada_en = timezone.now()
        n.save(update_fields=["eliminada_en"])
        return Response({"success": True})
