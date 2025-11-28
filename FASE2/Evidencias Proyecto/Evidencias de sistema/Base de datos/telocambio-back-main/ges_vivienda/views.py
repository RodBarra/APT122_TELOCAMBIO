from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes
from .models import Vivienda
from common.permissions import IsAdminOrModerator, get_claim

class ViviendaListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrModerator]

    @extend_schema(parameters=[OpenApiParameter("comunidad_id", int, OpenApiParameter.QUERY, required=False)],
                   responses={200: OpenApiTypes.OBJECT})
    def get(self, request):
        role = get_claim(request, "rol_usuario_id")
        token_com = get_claim(request, "comunidad_id")
        comunidad_id = request.query_params.get("comunidad_id")
        if role != 1:
            comunidad_id = token_com
        qs = Vivienda.objects.all()
        if comunidad_id: qs = qs.filter(comunidad_id=comunidad_id)
        data = [{"id": v.id, "comunidad_id": v.comunidad_id, "torre": v.torre,
                 "direccion_texto": v.direccion_texto, "numero": v.numero} for v in qs[:300]]
        return Response({"items": data})
