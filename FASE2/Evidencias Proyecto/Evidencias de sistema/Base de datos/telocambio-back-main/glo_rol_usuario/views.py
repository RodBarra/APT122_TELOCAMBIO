from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes
from .models import RolUsuario

class RolUsuarioListView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        operation_id="catalogos_rol_usuario_list",
        tags=["catalogos"],
        responses={200: OpenApiTypes.OBJECT},
        description="Lista de roles de usuario."
    )
    def get(self, request):
        items = list(RolUsuario.objects.all().order_by("id").values("id", "nombre"))
        return Response({"items": items})

class RolUsuarioDetailView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        operation_id="catalogos_rol_usuario_retrieve",
        tags=["catalogos"],
        parameters=[OpenApiParameter("id", int, OpenApiParameter.PATH)],
        responses={200: OpenApiTypes.OBJECT, 404: OpenApiTypes.OBJECT},
        description="Detalle de rol de usuario por ID."
    )
    def get(self, request, id: int):
        try:
            it = RolUsuario.objects.values("id", "nombre").get(id=id)
            return Response(it)
        except RolUsuario.DoesNotExist:
            return Response({"detail": "No encontrado"}, status=404)
