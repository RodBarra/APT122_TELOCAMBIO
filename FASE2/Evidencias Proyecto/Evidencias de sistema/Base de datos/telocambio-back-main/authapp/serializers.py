from rest_framework import serializers

class LoginSerializer(serializers.Serializer):
    correo = serializers.EmailField()
    password = serializers.CharField()

class RegisterSerializer(serializers.Serializer):
    codigo = serializers.CharField()  # código de comunidad
    correo = serializers.EmailField()
    password = serializers.CharField(min_length=8)
    nombre = serializers.CharField(max_length=60)
    apellidos = serializers.CharField(max_length=60)
    telefono = serializers.CharField(max_length=30, required=False, allow_blank=True)

    # residencia
    torre = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=120)
    direccion_texto = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=120)
    numero = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=30)
