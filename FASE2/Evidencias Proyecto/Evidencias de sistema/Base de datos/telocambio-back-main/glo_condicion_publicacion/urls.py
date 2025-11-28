from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CondicionPublicacionViewSet

router = DefaultRouter()
router.register(r'', CondicionPublicacionViewSet, basename='condicion-publicacion')
urlpatterns = [path('', include(router.urls))]
