from rest_framework import serializers
class ViviendaSerializer(serializers.Serializer):
    comunidad_id = serializers.IntegerField()
    torre = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    direccion_texto = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    numero = serializers.CharField()
