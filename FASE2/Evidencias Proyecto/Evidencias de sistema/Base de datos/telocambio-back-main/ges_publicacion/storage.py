import os
import mimetypes
import time
import requests
from typing import List, Tuple

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "publicaciones")

MAX_IMAGES = 4
MAX_BYTES = 5 * 1024 * 1024  # 5MB
ALLOWED = {"image/jpeg", "image/jpg", "image/png", "image/webp"}


def _pick_supabase_key() -> str:
    """
    Prioriza SERVICE_ROLE; si no hay, usa ANON_KEY.
    Acepta tanto llaves sb_secret_/sb_publishable_ como JWT antiguos (eyJ...).
    """
    service = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
    anon = (os.getenv("SUPABASE_ANON_KEY") or "").strip()
    key = service or anon
    if not SUPABASE_URL:
        raise RuntimeError("Falta SUPABASE_URL en backend.")
    if not key:
        raise RuntimeError(
            "Faltan credenciales Supabase. Define SUPABASE_SERVICE_ROLE_KEY o SUPABASE_ANON_KEY."
        )
    return key


def _guess_ext(mime: str) -> str:
    if "png" in mime:
        return "png"
    if "webp" in mime:
        return "webp"
    return "jpg"


def _public_url(path: str) -> str:
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{path}"


def _key_from_public_url(public_url: str) -> str | None:
    """
    Convierte una URL pública a la key interna del objeto en el bucket.
    Ej:
      https://<proj>.supabase.co/storage/v1/object/public/<BUCKET>/publicaciones/7/img.jpg
      ->  'publicaciones/7/img.jpg'
    """
    if not public_url:
        return None
    prefix = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/"
    if public_url.startswith(prefix):
        return public_url[len(prefix):]
    # fallback si viniese de dominio CDN/firmada pero contiene '/<bucket>/'
    marker = f"/{BUCKET}/"
    if marker in public_url:
        return public_url.split(marker, 1)[1]
    return None


def delete_publication_files(urls: List[str]) -> None:
    """
    Borra objetos del bucket a partir de sus URLs públicas.
    Usa DELETE /storage/v1/object/<bucket>/<key>.
    Ignora 404 y silencia otros errores para no romper el flujo de app.
    """
    if not urls:
        return
    supabase_key = _pick_supabase_key()
    for u in urls:
        key = _key_from_public_url(u)
        if not key:
            continue
        endpoint = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{key}"
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
        }
        try:
            resp = requests.delete(endpoint, headers=headers, timeout=30)
            if resp.status_code not in (200, 204, 404):
                # opcional: loggear warning aquí
                pass
        except Exception:
            pass


def upload_files_publication(pub_id: int, files: List[Tuple[str, bytes, str]]) -> List[dict]:
    """
    Sube 1..4 archivos al bucket y devuelve [{"url": str, "posicion": int}].
    'files' es [(nombre_original, contenido_bytes, mime)]
    """
    supabase_key = _pick_supabase_key()

    if len(files) == 0:
        return []
    if len(files) > MAX_IMAGES:
        raise ValueError("Máximo 4 imágenes por publicación.")

    out = []
    for i, (name, content, mime) in enumerate(files):
        mime = mime or mimetypes.guess_type(name or "")[0] or "application/octet-stream"
        if mime not in ALLOWED:
            raise ValueError("Formato no permitido. Usa JPG/PNG/WEBP.")
        if len(content) > MAX_BYTES:
            raise ValueError("La imagen supera 5MB.")

        ext = _guess_ext(mime)
        ts = int(time.time() * 1000)
        path = f"publicaciones/{pub_id}/pos_{i}_{ts}.{ext}"

        url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{path}?upsert=true"
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": mime,
            "x-upsert": "true",
        }
        resp = requests.post(url, headers=headers, data=content, timeout=30)
        if resp.status_code not in (200, 201):
            raise RuntimeError(f"Error subiendo a storage: {resp.status_code} {resp.text}")

        out.append({"url": _public_url(path), "posicion": i})
    return out
