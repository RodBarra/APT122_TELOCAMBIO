from django.urls import path
from .views import RolUsuarioListView, RolUsuarioDetailView

urlpatterns = [
    path("", RolUsuarioListView.as_view(), name="rol_usuario_list"),
    path("<int:id>", RolUsuarioDetailView.as_view(), name="rol_usuario_detail"),
]
