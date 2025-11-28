from rest_framework import serializers
from .models import TipoPublicacion

class TipoPublicacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoPublicacion
        fields = ["id", "nombre"]
