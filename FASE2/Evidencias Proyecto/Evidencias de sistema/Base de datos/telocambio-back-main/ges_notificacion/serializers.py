from rest_framework import serializers
from .models import Notificacion

class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = [
            "id", "tipo", "titulo", "mensaje",
            "intercambio_id", "publicacion_id",
            "link_url", "payload",
            "creada_en", "leida_en",
        ]
