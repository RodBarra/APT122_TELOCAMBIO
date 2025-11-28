from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Categoria
from .serializers import CategoriaSerializer

class CategoriaViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CategoriaSerializer

    def get_queryset(self):
        return Categoria.objects.only("id", "nombre").all()
