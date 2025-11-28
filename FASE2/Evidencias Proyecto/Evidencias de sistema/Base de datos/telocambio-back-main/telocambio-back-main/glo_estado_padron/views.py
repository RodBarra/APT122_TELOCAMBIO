from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes
from .models import EstadoPadron

class EstadoPadronListView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        operation_id="catalogos_estado_padron_list",
        tags=["catalogos"],
        responses={200: OpenApiTypes.OBJECT},
        description="Lista de estados del padrón."
    )
    def get(self, request):
        items = list(EstadoPadron.objects.all().order_by("id").values("id", "nombre"))
        return Response({"items": items})

class EstadoPadronDetailView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        operation_id="catalogos_estado_padron_retrieve",
        tags=["catalogos"],
        parameters=[OpenApiParameter("id", int, OpenApiParameter.PATH)],
        responses={200: OpenApiTypes.OBJECT, 404: OpenApiTypes.OBJECT},
        description="Detalle de estado del padrón por ID."
    )
    def get(self, request, id: int):
        try:
            it = EstadoPadron.objects.values("id", "nombre").get(id=id)
            return Response(it)
        except EstadoPadron.DoesNotExist:
            return Response({"detail": "No encontrado"}, status=404)
