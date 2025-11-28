from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TipoPublicacionViewSet

router = DefaultRouter()
router.register(r'', TipoPublicacionViewSet, basename='tipo-publicacion')
urlpatterns = [path('', include(router.urls))]
