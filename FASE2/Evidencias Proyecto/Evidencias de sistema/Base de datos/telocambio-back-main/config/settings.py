import os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "unsafe-secret")
DEBUG = os.getenv("DJANGO_DEBUG", "False") == "True"

# Si no hay var de entorno, por defecto habilita localhost/127.0.0.1
_env_hosts = [h.strip() for h in os.getenv("DJANGO_ALLOWED_HOSTS", "").split(",") if h.strip()]
ALLOWED_HOSTS = _env_hosts or ["127.0.0.1", "localhost"]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Terceros
    "corsheaders",            # <<< agregado
    "rest_framework",
    "drf_spectacular",

    # Apps propias
    "common",
    "authapp",
    "ges_usuario",
    "ges_comunidad",
    "ges_padron",
    "ges_vivienda",
    "glo_rol_usuario",
    "glo_estado_usuario",
    "glo_estado_comunidad",
    "glo_estado_padron",
    "ges_publicacion",
    "glo_categoria",
    "glo_tipo_publicacion",
    "glo_condicion_publicacion",
    "glo_estado_publicacion",
    "ges_intercambio",
    "ges_notificacion"
]

MIDDLEWARE = [
    # <<< CORS MUY ARRIBA
    "corsheaders.middleware.CorsMiddleware",

    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',  # maneja OPTIONS también
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                "django.template.context_processors.debug",
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Postgres Supabase 
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("SUPABASE_DB_NAME", "postgres"),
        "USER": os.getenv("SUPABASE_DB_USER", "postgres"),
        "PASSWORD": os.getenv("SUPABASE_DB_PASSWORD"),
        "HOST": os.getenv("SUPABASE_DB_HOST"),
        "PORT": os.getenv("SUPABASE_DB_PORT", "5432"),
        "OPTIONS": {"sslmode": "require"},
    }
}

# DRF + JWT 
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",

    # ✅ PAGINACIÓN GLOBAL
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,  # tamaño por defecto
    "PAGE_SIZE_QUERY_PARAM": "page_size",  # permitir override ?page_size=...
    "MAX_PAGE_SIZE": 50,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "TeLoCambio API",
    "DESCRIPTION": "API para comunidades, publicaciones, intercambios y ratings.",
    "VERSION": "0.1.0",
}

STATIC_URL = 'static/'

# ---------- CORS / CSRF ----------
# Orígenes permitidos para el front (Vite)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Si ves errores de CSRF al hacer POST desde el front:
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Si en el futuro envías cookies cross-site (no necesario con JWT por header):
from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),  # ajusta si quieres más
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
}
