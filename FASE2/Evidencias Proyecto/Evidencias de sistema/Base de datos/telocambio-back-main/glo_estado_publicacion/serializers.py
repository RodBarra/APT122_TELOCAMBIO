from rest_framework import serializers
from .models import EstadoPublicacion

class EstadoPublicacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstadoPublicacion
        fields = ["id", "nombre"]
