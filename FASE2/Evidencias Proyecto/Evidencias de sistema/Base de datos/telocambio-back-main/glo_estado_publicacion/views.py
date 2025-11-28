from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import EstadoPublicacion
from .serializers import EstadoPublicacionSerializer

class EstadoPublicacionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EstadoPublicacion.objects.all()
    serializer_class = EstadoPublicacionSerializer
    permission_classes = [IsAuthenticated]
