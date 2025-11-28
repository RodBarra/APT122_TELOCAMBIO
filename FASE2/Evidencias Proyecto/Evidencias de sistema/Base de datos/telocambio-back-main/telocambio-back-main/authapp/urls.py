from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import LoginView, VerifyAccessView, RegisterView

urlpatterns = [
    path("login", LoginView.as_view(), name="login"),
    path("verify-access", VerifyAccessView.as_view(), name="verify_access"),
    path("register", RegisterView.as_view(), name="register"),
    # Nuevo: refresh del token de acceso
    path("refresh", TokenRefreshView.as_view(), name="token_refresh"),
]
