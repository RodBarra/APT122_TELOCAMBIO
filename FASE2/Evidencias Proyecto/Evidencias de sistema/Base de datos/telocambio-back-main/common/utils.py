def get_claim(request, key, default=None):
    token = getattr(request, "auth", None)
    if token is None:
        return default
    try:
        return token.get(key, default)  # type: ignore[call-arg]
    except Exception:
        pass
    try:
        return token[key]  # type: ignore[index]
    except Exception:
        return default

def user_ctx(request):
    rol_id = get_claim(request, "rol_usuario_id")
    return {
        "usuario_id": get_claim(request, "user_id") or get_claim(request, "sub"),
        "rol_usuario_id": rol_id,
        "comunidad_id": get_claim(request, "comunidad_id"),
        "is_admin": (rol_id == 1),
    }
