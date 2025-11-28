from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),

    # OpenAPI/Swagger
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),

    # === Apps 
    # Sprint 1
    path("auth/", include("authapp.urls")),
    path("catalogos/rol-usuario/", include("glo_rol_usuario.urls")),
    path("catalogos/estado-usuario/", include("glo_estado_usuario.urls")),
    path("catalogos/estado-comunidad/", include("glo_estado_comunidad.urls")),
    path("catalogos/estado-padron/", include("glo_estado_padron.urls")),
    path("comunidades/", include("ges_comunidad.urls")),
    path("comunidades/", include("ges_padron.urls")),
    path("usuarios/", include("ges_usuario.urls")),

    # Sprint 2
    path("catalogos/categoria/", include("glo_categoria.urls")),
    path("catalogos/tipo-publicacion/", include("glo_tipo_publicacion.urls")),
    path("catalogos/condicion-publicacion/", include("glo_condicion_publicacion.urls")),
    path("catalogos/estado-publicacion/", include("glo_estado_publicacion.urls")),
    path("publicaciones/", include("ges_publicacion.urls")),

    # Sprint 3 - Intercambios / Ofertas / Notificaciones
    path("intercambios/", include("ges_intercambio.urls")),
    path("notificaciones/", include("ges_notificacion.urls")),
]
