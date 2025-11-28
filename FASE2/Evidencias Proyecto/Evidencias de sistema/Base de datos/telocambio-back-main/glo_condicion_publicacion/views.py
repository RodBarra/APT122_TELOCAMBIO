from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import CondicionPublicacion
from .serializers import CondicionPublicacionSerializer

class CondicionPublicacionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CondicionPublicacion.objects.all()
    serializer_class = CondicionPublicacionSerializer
    permission_classes = [IsAuthenticated]
