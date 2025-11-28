from django.urls import path
from .views import EstadoComunidadListView, EstadoComunidadDetailView

urlpatterns = [
    path("", EstadoComunidadListView.as_view(), name="estado_comunidad_list"),
    path("<int:id>", EstadoComunidadDetailView.as_view(), name="estado_comunidad_detail"),
]
