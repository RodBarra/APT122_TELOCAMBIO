# ges_usuario/serializers.py
from rest_framework import serializers
import re

# ====== EXISTENTES ======
class UsuarioUpdateSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=60, required=False)
    apellidos = serializers.CharField(max_length=60, required=False)
    telefono = serializers.CharField(max_length=30, required=False, allow_blank=True)
    estado_usuario_id = serializers.IntegerField(required=False)
    rol_usuario_id = serializers.IntegerField(required=False)


class UsuarioCreateModeradorSerializer(serializers.Serializer):
    comunidad_id = serializers.IntegerField()
    correo = serializers.EmailField()
    password = serializers.CharField()
    nombre = serializers.CharField(max_length=60)
    apellidos = serializers.CharField(max_length=60)
    telefono = serializers.CharField(max_length=30, required=False, allow_blank=True)

    def validate_password(self, value: str):
        # Min 8, 1 mayúscula, 1 dígito
        if not (len(value) >= 8 and re.search(r"[A-Z]", value) and re.search(r"\d", value)):
            raise serializers.ValidationError("La contraseña debe tener mínimo 8 caracteres, 1 mayúscula y 1 número.")
        return value

    def validate_correo(self, value: str):
        return value.strip().lower()


# ====== NUEVOS: /usuarios/me/ y perfil público ======

class MeSerializer(serializers.Serializer):
    """
    Serializer plano que normaliza las llaves esperadas por el front:
    { id, correo, nombre, apellidos, telefono, promedio_rating, cantidad_ratings,
      intercambios_realizados, publicaciones_activas, rol_usuario_id, rol_nombre }
    """
    id = serializers.IntegerField(read_only=True)
    correo = serializers.EmailField(read_only=True)
    nombre = serializers.CharField(max_length=60, required=False, allow_blank=True)
    apellidos = serializers.CharField(max_length=60, required=False, allow_blank=True)
    telefono = serializers.CharField(max_length=30, required=False, allow_blank=True)

    promedio_rating = serializers.FloatField(required=False, allow_null=True)
    cantidad_ratings = serializers.IntegerField(required=False, allow_null=True)
    intercambios_realizados = serializers.IntegerField(required=False, allow_null=True)
    publicaciones_activas = serializers.IntegerField(required=False, allow_null=True)

    rol_usuario_id = serializers.IntegerField(required=False, allow_null=True)
    rol_nombre = serializers.CharField(required=False, allow_null=True)

    def to_representation(self, instance):
        """
        Soporta que instance sea:
        - authapp.models.Usuario (caso normal)
        - o un dict con los campos ya calculados (por si en el futuro lo usamos así)
        """
        if isinstance(instance, dict):
            # si ya viene como dict, lo devolvemos “normalizado”
            return {
                "id": instance.get("id"),
                "correo": instance.get("correo") or "",
                "nombre": instance.get("nombre") or "",
                "apellidos": instance.get("apellidos") or "",
                "telefono": instance.get("telefono") or "",
                "promedio_rating": float(instance.get("promedio_rating") or 0),
                "cantidad_ratings": int(instance.get("cantidad_ratings") or 0),
                "intercambios_realizados": int(instance.get("intercambios_realizados") or 0),
                "publicaciones_activas": int(instance.get("publicaciones_activas") or 0),
                "rol_usuario_id": instance.get("rol_usuario_id"),
                "rol_nombre": instance.get("rol_nombre"),
            }

        # instance = Usuario
        return {
            "id": instance.id,
            "correo": getattr(instance, "correo", None) or getattr(instance, "email", ""),
            "nombre": getattr(instance, "nombre", "") or "",
            "apellidos": getattr(instance, "apellidos", "") or "",
            "telefono": getattr(instance, "telefono", "") or "",
            "promedio_rating": float(getattr(instance, "promedio_rating", 0) or 0),
            "cantidad_ratings": int(getattr(instance, "cantidad_ratings", 0) or 0),
            "intercambios_realizados": int(getattr(instance, "intercambios_realizados", 0) or 0),
            "publicaciones_activas": int(getattr(instance, "publicaciones_activas", 0) or 0),
            "rol_usuario_id": getattr(instance, "rol_usuario_id", None),
            "rol_nombre": getattr(instance, "rol_nombre", None),
        }

    def update(self, instance, validated_data):
        # solo permitimos editar estos campos
        for k in ("nombre", "apellidos", "telefono"):
            if k in validated_data:
                setattr(instance, k, validated_data.get(k) or None)
        instance.save(update_fields=[f for f in ("nombre", "apellidos", "telefono") if hasattr(instance, f)])
        return instance



class PublicUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nombre = serializers.CharField(allow_null=True, required=False)
    apellidos = serializers.CharField(allow_null=True, required=False)
    telefono = serializers.CharField(allow_null=True, required=False)
    correo = serializers.CharField(allow_null=True, required=False)
    promedio_rating = serializers.FloatField(allow_null=True, required=False)
    cantidad_ratings = serializers.IntegerField(allow_null=True, required=False)
    intercambios_realizados = serializers.IntegerField(required=False)
    publicaciones_activas = serializers.IntegerField(required=False)
    ultimas_valoraciones = serializers.ListField(child=serializers.DictField(), required=False)
    rol_usuario_id = serializers.IntegerField(required=False, allow_null=False)
    rol_nombre = serializers.CharField(required=False, allow_null=True)
