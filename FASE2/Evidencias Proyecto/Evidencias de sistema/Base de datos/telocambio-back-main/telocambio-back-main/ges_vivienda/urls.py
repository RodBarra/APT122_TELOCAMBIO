from django.urls import path
from .views import ViviendaListView
urlpatterns = [ path("list", ViviendaListView.as_view()) ]
