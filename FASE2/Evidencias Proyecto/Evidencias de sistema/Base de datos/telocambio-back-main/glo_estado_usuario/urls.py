from django.urls import path
from .views import EstadoUsuarioListView, EstadoUsuarioDetailView

urlpatterns = [
    path("", EstadoUsuarioListView.as_view(), name="estado_usuario_list"),
    path("<int:id>", EstadoUsuarioDetailView.as_view(), name="estado_usuario_detail"),
]
