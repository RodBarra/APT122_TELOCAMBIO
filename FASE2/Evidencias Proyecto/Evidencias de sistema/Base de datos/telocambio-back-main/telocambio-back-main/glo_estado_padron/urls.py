from django.urls import path
from .views import EstadoPadronListView, EstadoPadronDetailView

urlpatterns = [
    path("", EstadoPadronListView.as_view(), name="estado_padron_list"),
    path("<int:id>", EstadoPadronDetailView.as_view(), name="estado_padron_detail"),
]
