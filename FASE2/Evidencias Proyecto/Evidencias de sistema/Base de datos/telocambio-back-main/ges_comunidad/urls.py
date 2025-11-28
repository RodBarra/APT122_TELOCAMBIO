from django.urls import path
from .views import ComunidadCreateView, ComunidadDetailView, ComunidadListView

urlpatterns = [
    path("", ComunidadCreateView.as_view(), name="comunidad_create"),            # POST /comunidades/
    path("list", ComunidadListView.as_view(), name="comunidad_list"),            # GET  /comunidades/list (Admin)
    path("<int:id>", ComunidadDetailView.as_view(), name="comunidad_detail"),    # GET/PUT /comunidades/{id}
]
