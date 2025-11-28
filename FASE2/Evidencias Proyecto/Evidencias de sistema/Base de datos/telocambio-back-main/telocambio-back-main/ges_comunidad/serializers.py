from rest_framework import serializers

class ComunidadCreateSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=120)
    tipo_id = serializers.IntegerField()  # 1 o 2
    direccion = serializers.CharField(max_length=120, required=False, allow_blank=True, allow_null=True)
    # correo_contacto_admin se elimina del create; quedará NULL hasta asignar moderador
    codigo = serializers.CharField(max_length=32)
    estado_comunidad_id = serializers.IntegerField(required=False, default=1)

class ComunidadUpdateSerializer(serializers.Serializer):
    # Solo estos dos campos son editables
    nombre = serializers.CharField(max_length=120, required=False)
    estado_comunidad_id = serializers.IntegerField(required=False)
