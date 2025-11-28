from rest_framework import serializers
from .models import CondicionPublicacion

class CondicionPublicacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CondicionPublicacion
        fields = ["id", "nombre"]
