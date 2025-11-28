from rest_framework import serializers

class PadronAddSerializer(serializers.Serializer):
    correo = serializers.EmailField()

class PadronUpdateSerializer(serializers.Serializer):
    # Solo permitimos cambiar el correo y solo si usado = False (se valida en la vista)
    correo = serializers.EmailField()
