from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import TipoPublicacion
from .serializers import TipoPublicacionSerializer

class TipoPublicacionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TipoPublicacion.objects.all()
    serializer_class = TipoPublicacionSerializer
    permission_classes = [IsAuthenticated]
