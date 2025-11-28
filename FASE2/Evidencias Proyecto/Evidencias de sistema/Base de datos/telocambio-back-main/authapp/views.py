import bcrypt
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema, OpenApiTypes, OpenApiExample
from .models import Usuario
from .serializers import LoginSerializer, RegisterSerializer
from .services import verificar_en_padron, crear_usuario_registrado


class LoginView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request={
            "application/json": {
                "type": "object",
                "properties": {
                    "correo": {"type": "string", "format": "email"},
                    "password": {"type": "string"},
                    "codigo": {"type": "string", "nullable": True}
                },
                "required": ["correo", "password"],
                "example": {"correo": "admin@telocambio.cl", "password": "Duoc_1234"}
            }
        },
        responses={200: OpenApiTypes.OBJECT},
        examples=[OpenApiExample("Login Admin", value={"correo":"admin@telocambio.cl","password":"Duoc_1234"})]
    )
    def post(self, request):
        correo = (request.data.get("correo") or "").strip().lower()
        password = request.data.get("password") or ""
        codigo = (request.data.get("codigo") or "").strip()  # opcional para correos presentes en varias comunidades

        if not correo or not password:
            return Response({"detail": "correo y password son requeridos"}, status=400)

        qs = Usuario.objects.filter(correo=correo)
        if codigo:
            # si el mismo correo existe en varias comunidades, filtra por código
            from ges_comunidad.models import Comunidad
            try:
                com = Comunidad.objects.get(codigo=codigo)
                qs = qs.filter(comunidad_id=com.id)
            except Comunidad.DoesNotExist:
                return Response({"detail": "codigo inválido"}, status=400)

        count = qs.count()
        if count == 0:
            return Response({"detail": "Credenciales inválidas"}, status=401)
        if count > 1:
            return Response({"detail": "Correo existe en múltiples comunidades; provee 'codigo'."}, status=400)

        u = qs.first()

        # Usuario activo
        if u.estado_usuario_id != 1:
            return Response({"detail": "Usuario no activo"}, status=403)

        # Comunidad activa (solo si el usuario pertenece a una comunidad)
        comunidad_nombre = None
        comunidad_codigo = None
        if u.comunidad_id:
            from ges_comunidad.models import Comunidad
            com = (
                Comunidad.objects
                .filter(id=u.comunidad_id)
                .only("id", "estado_comunidad_id", "nombre", "codigo")
                .first()
            )
            # Consideramos activa si estado_comunidad_id es 1 (Activa). Cualquier otro estado -> bloquea.
            if com and (com.estado_comunidad_id or 0) != 1:
                return Response({"detail": "Comunidad suspendida"}, status=403)

            if com:
                # usa nombre_publico si existe, si no nombre normal
                comunidad_nombre = getattr(com, "nombre_publico", None) or getattr(com, "nombre", None)
                comunidad_codigo = com.codigo

        # Password
        try:
            ok = bcrypt.checkpw(password.encode("utf-8"), u.password_hash.encode("utf-8"))
        except Exception:
            ok = False
        if not ok:
            return Response({"detail": "Credenciales inválidas"}, status=401)

        # usuario Django "sombra" para SimpleJWT
        dj_user, _ = User.objects.get_or_create(username=correo, defaults={"email": correo, "is_active": True})
        if not dj_user.email:
            dj_user.email = correo
            dj_user.is_active = True
            dj_user.save()

        refresh = RefreshToken.for_user(dj_user)
        # >>> AQUI VAN LOS CLAIMS QUE USAN TUS VISTAS <<<
        refresh["usuario_id"] = u.id
        refresh["rol_usuario_id"] = u.rol_usuario_id
        refresh["comunidad_id"] = u.comunidad_id
        refresh["correo"] = correo
        if comunidad_nombre:
            refresh["comunidad_nombre"] = comunidad_nombre
        if comunidad_codigo:
            refresh["comunidad_codigo"] = comunidad_codigo

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": u.id,
                "correo": correo,
                "rol_usuario_id": u.rol_usuario_id,
                "comunidad_id": u.comunidad_id,
                "comunidad_nombre": comunidad_nombre,
                "comunidad_codigo": comunidad_codigo,
            }
        }, status=200)


class VerifyAccessView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request={
            "application/json": {
                "type": "object",
                "properties": {"codigo": {"type": "string"}, "correo": {"type": "string", "format": "email"}},
                "required": ["codigo", "correo"],
                "example": {"codigo": "DPT-NORTE-001", "correo": "vecino@ejemplo.cl"}
            }
        },
        responses={200: OpenApiTypes.OBJECT},
        examples=[OpenApiExample("Verificar acceso", value={"codigo":"DPT-NORTE-001","correo":"vecino@ejemplo.cl"})]
    )
    def post(self, request):
        codigo = request.data.get("codigo")
        correo = request.data.get("correo")
        if not (codigo and correo):
            return Response({"ok": False, "reason": "faltan_parametros"}, status=400)
        res = verificar_en_padron(codigo, correo)
        return Response(res, status=200 if res.get("ok") else 400)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=RegisterSerializer,
        responses={201: OpenApiTypes.OBJECT},
        examples=[OpenApiExample(
            "Registro Depto",
            value={
                "codigo":"DPT-NORTE-001","correo":"vecino@ejemplo.cl","password":"ClaveFuerte123",
                "nombre":"Juan","apellidos":"Pérez","telefono":"912345678",
                "torre":"A","numero":"1203"
            }
        ),
        OpenApiExample(
            "Registro Condominio",
            value={
                "codigo":"CON-ROBLES-001","correo":"vecina@ejemplo.cl","password":"ClaveFuerte123",
                "nombre":"María","apellidos":"López","telefono":"922223333",
                "direccion_texto":"Pasaje El Bosque 456","numero":"12"
            }
        )]
    )
    def post(self, request):
        ser = RegisterSerializer(data=request.data)
        if not ser.is_valid():
            return Response({"ok": False, "errors": ser.errors}, status=400)
        d = ser.validated_data
        res = crear_usuario_registrado(
            d["codigo"], d["correo"], d["password"], d["nombre"], d["apellidos"],
            d.get("telefono"), d.get("torre"), d.get("direccion_texto"), d.get("numero")
        )
        return Response(res, status=201 if res.get("ok") else 400)
