# ges_intercambio/serializers.py
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from django.db.models import Q

from .models import (
    Intercambio,
    Vivienda,
    IntercambioConfirmacion,
    ValoracionUsuario,
)
from ges_publicacion.models import Publicacion
from authapp.models import Usuario  # para datos de contacto y actualización de promedio

ESTADO_PENDIENTE  = 1
ESTADO_FINALIZADO = 2
ESTADO_CANCELADO  = 3
ESTADO_ACEPTADO   = 4


class IntercambioCreateSerializer(serializers.ModelSerializer):
    creada_en = serializers.DateTimeField(source="creado_en", read_only=True)
    actualizada_en = serializers.DateTimeField(source="actualizado_en", read_only=True)

    class Meta:
        model = Intercambio
        fields = [
            "id",
            "comunidad_id",
            "estado_intercambio_id",
            "solicitante_usuario_id",
            "receptor_usuario_id",
            "publicacion_solicitada_id",
            "publicacion_ofrecida_id",
            "creada_en",
            "actualizada_en",
        ]
        # read_only por scoping/servidor
        read_only_fields = [
            "id",
            "comunidad_id",
            "estado_intercambio_id",
            "solicitante_usuario_id",
            "receptor_usuario_id",
            "creada_en",
            "actualizada_en",
        ]

    def validate(self, attrs):
        token_user_id = int(self.context["usuario_id"])
        token_com_id = int(self.context["comunidad_id"])

        pub_sol_id = int(self.initial_data.get("publicacion_solicitada_id") or 0)
        pub_ofr_id = int(self.initial_data.get("publicacion_ofrecida_id") or 0)
        if not pub_sol_id or not pub_ofr_id:
            raise serializers.ValidationError("Debes indicar publicaciones solicitada y ofrecida.")
        if pub_sol_id == pub_ofr_id:
            raise serializers.ValidationError("Las publicaciones deben ser distintas.")

        try:
            pub_sol = Publicacion.objects.get(id=pub_sol_id)
            pub_ofr = Publicacion.objects.get(id=pub_ofr_id)
        except Publicacion.DoesNotExist:
            raise serializers.ValidationError("Alguna publicación no existe.")

        if int(pub_sol.comunidad_id) != token_com_id or int(pub_ofr.comunidad_id) != token_com_id:
            raise serializers.ValidationError("Las publicaciones deben pertenecer a tu comunidad.")

        if int(pub_ofr.propietario_usuario_id) != token_user_id:
            raise serializers.ValidationError("Solo puedes ofrecer publicaciones que te pertenecen.")
        receptor_id = int(pub_sol.propietario_usuario_id)
        if receptor_id == token_user_id:
            raise serializers.ValidationError("No puedes proponer un intercambio contigo mismo.")

        # --- Regla anti-duplicado en cualquier sentido ---
        # Bloquea si ya existe una oferta PENDIENTE o ACEPTADA entre estas dos publicaciones,
        # ya sea (solicitada=pub_sol, ofrecida=pub_ofr) o invertida (solicitada=pub_ofr, ofrecida=pub_sol).
        existe_en_cualquier_sentido = Intercambio.objects.filter(
            comunidad_id=token_com_id,
            estado_intercambio_id__in=[ESTADO_PENDIENTE, ESTADO_ACEPTADO],
        ).filter(
            Q(publicacion_solicitada_id=pub_sol_id, publicacion_ofrecida_id=pub_ofr_id)
            | Q(publicacion_solicitada_id=pub_ofr_id, publicacion_ofrecida_id=pub_sol_id)
        ).exists()

        if existe_en_cualquier_sentido:
            raise serializers.ValidationError(
                "Ya existe una oferta pendiente/aceptada entre estas dos publicaciones (en cualquier sentido)."
            )

        # (La regla anterior subsume el duplicado exacto; dejamos esto por claridad, no sobra)
        ya_existe_mi_pendiente = Intercambio.objects.filter(
            comunidad_id=token_com_id,
            estado_intercambio_id=ESTADO_PENDIENTE,
            solicitante_usuario_id=token_user_id,
            publicacion_solicitada_id=pub_sol_id,
            publicacion_ofrecida_id=pub_ofr_id,
        ).exists()
        if ya_existe_mi_pendiente:
            raise serializers.ValidationError(
                "Ya tienes una oferta PENDIENTE con esa publicación para este anuncio."
            )

        attrs.update(
            comunidad_id=token_com_id,
            estado_intercambio_id=ESTADO_PENDIENTE,
            solicitante_usuario_id=token_user_id,
            receptor_usuario_id=receptor_id,
            publicacion_solicitada_id=pub_sol_id,
            publicacion_ofrecida_id=pub_ofr_id,
        )
        return attrs

    def create(self, validated_data):
        return Intercambio.objects.create(**validated_data)


class IntercambioListSerializer(serializers.ModelSerializer):
    creada_en = serializers.DateTimeField(source="creado_en", read_only=True)
    actualizada_en = serializers.DateTimeField(source="actualizado_en", read_only=True)

    class Meta:
        model = Intercambio
        fields = [
            "id",
            "comunidad_id",
            "estado_intercambio_id",
            "solicitante_usuario_id",
            "receptor_usuario_id",
            "publicacion_solicitada_id",
            "publicacion_ofrecida_id",
            "creada_en",
            "actualizada_en",
        ]


class IntercambioDetailSerializer(serializers.ModelSerializer):
    creada_en = serializers.DateTimeField(source="creado_en", read_only=True)
    actualizada_en = serializers.DateTimeField(source="actualizado_en", read_only=True)
    counterparty = serializers.SerializerMethodField()

    # banderas de confirmación
    confirmo_solicitada = serializers.SerializerMethodField()
    confirmo_ofrecida = serializers.SerializerMethodField()

    class Meta:
        model = Intercambio
        fields = [
            "id",
            "comunidad_id",
            "estado_intercambio_id",
            "solicitante_usuario_id",
            "receptor_usuario_id",
            "publicacion_solicitada_id",
            "publicacion_ofrecida_id",
            "ultimo_estado_por_usuario_id",
            "creada_en",
            "actualizada_en",
            "counterparty",
            "confirmo_solicitada",
            "confirmo_ofrecida",
        ]

    def _confirmados_set(self, obj: Intercambio):
        return set(
            IntercambioConfirmacion.objects
            .filter(intercambio_id=obj.id)
            .values_list("usuario_id", flat=True)
        )

    def get_confirmo_solicitada(self, obj: Intercambio) -> bool:
        confirmados = self._confirmados_set(obj)
        return obj.receptor_usuario_id in confirmados

    def get_confirmo_ofrecida(self, obj: Intercambio) -> bool:
        confirmados = self._confirmados_set(obj)
        return obj.solicitante_usuario_id in confirmados

    def get_counterparty(self, obj: Intercambio):
        request = self.context.get("request")
        uid_ctx = self.context.get("usuario_id")
        uid = None

        if uid_ctx is not None:
            uid = int(uid_ctx)
        elif request and getattr(request, "auth", None):
            try:
                uid = int(getattr(request, "auth", {}).get("usuario_id"))
            except Exception:
                uid = None

        if uid not in (obj.solicitante_usuario_id, obj.receptor_usuario_id):
            return None

        target_user_id = obj.receptor_usuario_id if uid == obj.solicitante_usuario_id else obj.solicitante_usuario_id
        try:
            u = Usuario.objects.only("id", "nombre", "apellidos", "telefono", "vivienda_id").get(id=target_user_id)
        except Usuario.DoesNotExist:
            return None

        vivi = None
        if getattr(u, "vivienda_id", None):
            try:
                v = Vivienda.objects.get(id=int(u.vivienda_id))
                vivi = {
                    "torre": v.torre,
                    "direccion_texto": v.direccion_texto,
                    "numero": v.numero,
                }
            except Vivienda.DoesNotExist:
                vivi = None

        return {
            "id": u.id,
            "nombre": u.nombre,
            "apellidos": u.apellidos,
            "telefono": u.telefono,
            "vivienda": vivi,
        }


class IntercambioAccionSerializer(serializers.Serializer):
    def validate(self, attrs):
        return attrs


# ------------------- NUEVO: Crear Valoración -------------------

class ValoracionUsuarioCreateSerializer(serializers.ModelSerializer):
    """
    Crea una valoración 1..5 + comentario:
    - Solo participantes del intercambio
    - Intercambio debe estar FINALIZADO
    - 1 valoración por usuario por intercambio (UNIQUE)
    - Actualiza promedio/cantidad del usuario calificado
    """
    puntaje = serializers.IntegerField(min_value=1, max_value=5)
    comentario = serializers.CharField(max_length=255, required=False, allow_blank=True)

    class Meta:
        model = ValoracionUsuario
        fields = ["puntaje", "comentario"]

    # el view/action pasa el objeto Intercambio en context["intercambio"]
    def validate(self, attrs):
        request = self.context["request"]
        uid = int(self.context["usuario_id"])
        intercambio: Intercambio = self.context["intercambio"]

        # participante
        if uid not in (intercambio.solicitante_usuario_id, intercambio.receptor_usuario_id):
            raise serializers.ValidationError("No estás autorizado para valorar este intercambio.")

        # estado finalizado
        if int(intercambio.estado_intercambio_id) != ESTADO_FINALIZADO:
            raise serializers.ValidationError("Solo se puede valorar un intercambio FINALIZADO.")

        # ya valoró
        exists = ValoracionUsuario.objects.filter(
            intercambio_id=intercambio.id,
            calificador_usuario_id=uid,
        ).exists()
        if exists:
            raise serializers.ValidationError("Ya enviaste una valoración para este intercambio.")

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        uid = int(self.context["usuario_id"])
        intercambio: Intercambio = self.context["intercambio"]

        # a quién califico?
        calificado_id = (
            intercambio.receptor_usuario_id
            if uid == intercambio.solicitante_usuario_id
            else intercambio.solicitante_usuario_id
        )

        # insertar valoración
        valor = ValoracionUsuario.objects.create(
            intercambio_id=intercambio.id,
            calificador_usuario_id=uid,
            calificado_usuario_id=calificado_id,
            puntaje=int(validated_data["puntaje"]),
            comentario=(validated_data.get("comentario") or "").strip() or None,
            creado_en=timezone.now(),
        )

        # actualizar promedio/cantidad (usuario calificado)
        # new_avg = (old_avg * n + puntaje) / (n + 1)
        u = Usuario.objects.select_for_update().get(id=calificado_id)
        n = int(u.cantidad_ratings or 0)
        old = float(u.promedio_rating or 0.0)
        new_avg = ((old * n) + int(validated_data["puntaje"])) / (n + 1)
        u.promedio_rating = round(new_avg, 2)
        u.cantidad_ratings = n + 1
        u.save(update_fields=["promedio_rating", "cantidad_ratings"])

        return valor
