from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EstadoPublicacionViewSet

router = DefaultRouter()
router.register(r'', EstadoPublicacionViewSet, basename='estado-publicacion')
urlpatterns = [path('', include(router.urls))]
