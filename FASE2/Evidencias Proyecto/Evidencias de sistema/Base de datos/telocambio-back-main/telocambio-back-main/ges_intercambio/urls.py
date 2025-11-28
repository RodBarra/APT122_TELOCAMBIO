from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import IntercambioViewSet

router = DefaultRouter()
router.register(r"intercambios", IntercambioViewSet, basename="intercambios")

urlpatterns = [
    path("", include(router.urls)),
]
