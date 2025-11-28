# ges_usuario/urls.py
from django.urls import path
from .views import (
    UsuarioListView,
    UsuarioDetailView,
    ModeradorCreateView,
    MeView,
    PublicProfileView,
)

urlpatterns = [
    path("", UsuarioListView.as_view(), name="usuarios-list"),                        # GET /usuarios/
    path("<int:usuario_id>", UsuarioDetailView.as_view(), name="usuarios-detail"),   # GET/PUT/DELETE /usuarios/123
    path("moderador", ModeradorCreateView.as_view(), name="usuarios-moderador-create"),  # POST /usuarios/moderador

    # NUEVOS:
    path("me/", MeView.as_view(), name="usuarios-me"),                                # GET/PATCH /usuarios/me/
    path("publico/<int:usuario_id>/", PublicProfileView.as_view(), name="usuarios-publico"),  # GET /usuarios/publico/5/
]
