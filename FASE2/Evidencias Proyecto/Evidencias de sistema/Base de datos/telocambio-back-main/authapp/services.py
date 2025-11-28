# authapp/services.py
import bcrypt
from django.db import transaction, IntegrityError
from django.utils import timezone

from authapp.models import Usuario
from ges_comunidad.models import Comunidad
from ges_padron.models import PadronAutorizado
from ges_vivienda.models import Vivienda


def verificar_en_padron(codigo: str, correo: str):
    correo = correo.lower().strip()
    try:
        com = Comunidad.objects.get(codigo=codigo)
    except Comunidad.DoesNotExist:
        return {"ok": False, "reason": "codigo_invalido"}

    try:
        p = PadronAutorizado.objects.get(comunidad_id=com.id, correo=correo)
    except PadronAutorizado.DoesNotExist:
        return {"ok": False, "reason": "correo_no_autorizado", "contacto": com.correo_contacto_admin}

    if not p.habilitado:
        return {"ok": False, "reason": "correo_no_habilitado"}
    if p.usado:
        return {"ok": False, "reason": "correo_ya_usado"}

    return {"ok": True, "comunidad_id": com.id, "tipo_id": com.tipo_id}


def _norm(s: str | None) -> str | None:
    """
    Normaliza strings de residencia: trim y colapso de espacios internos.
    """
    if s is None:
        return None
    s = (s or "").strip()
    if not s:
        return None
    # colapsa espacios internos
    s = " ".join(s.split())
    return s


def _norm_torre(s: str | None) -> str | None:
    """
    Torre/edificio en mayúsculas y normalizado.
    """
    s = _norm(s)
    return s.upper() if s else None


def _get_or_create_vivienda(comunidad_id: int, tipo_id: int,
                            torre: str | None,
                            direccion_texto: str | None,
                            numero: str | None) -> int:
    """
    Devuelve el id de vivienda existente o la crea de forma segura.
    - Depto (tipo_id=1): usa (comunidad_id, torre, numero)
    - Condo (tipo_id!=1): usa (comunidad_id, direccion_texto, numero)
    Los índices únicos parciales que ya tienes en Supabase evitan duplicados:
      - uq_vivienda_depto (comunidad_id, torre, numero) WHERE torre IS NOT NULL
      - uq_vivienda_condo (comunidad_id, direccion_texto, numero) WHERE direccion_texto IS NOT NULL
    """

    torre = _norm_torre(torre)
    direccion_texto = _norm(direccion_texto)
    numero = _norm(numero)

    # Seguridad: validaciones mínimas según tipo
    if tipo_id == 1:
        # Departamento
        if not (torre and numero):
            raise ValueError("Datos de residencia incompletos para departamento (torre, numero).")
        where = {"comunidad_id": comunidad_id, "torre": torre, "numero": numero}
        create_payload = {"comunidad_id": comunidad_id, "torre": torre, "numero": numero, "direccion_texto": None}
    else:
        # Condominio
        if not (direccion_texto and numero):
            raise ValueError("Datos de residencia incompletos para condominio (direccion_texto, numero).")
        where = {"comunidad_id": comunidad_id, "direccion_texto": direccion_texto, "numero": numero}
        create_payload = {"comunidad_id": comunidad_id, "direccion_texto": direccion_texto, "numero": numero, "torre": None}

    # 1) Intento de búsqueda rápida
    v = Vivienda.objects.filter(**where).only("id").first()
    if v:
        return v.id

    # 2) Crear y cubrir concurrencia con el índice único parcial
    try:
        v = Vivienda.objects.create(**create_payload)
        return v.id
    except IntegrityError:
        # Otro request la creó entre tanto; la buscamos de nuevo
        v = Vivienda.objects.filter(**where).only("id").first()
        if v:
            return v.id
        # Si aún no aparece, relanzamos
        raise


def crear_usuario_registrado(
    codigo,
    correo,
    password,
    nombre,
    apellidos,
    telefono=None,
    torre=None,
    direccion_texto=None,
    numero=None,
):
    ver = verificar_en_padron(codigo, correo)
    if not ver.get("ok"):
        return ver

    com_id = ver["comunidad_id"]
    tipo_id = ver["tipo_id"]

    # Reglas de residencia (coinciden con el frontend)
    if tipo_id == 1:  # Departamento
        if not (torre and numero):
            return {"ok": False, "reason": "faltan_residencia", "campos": ["torre", "numero"]}
    else:  # Condominio
        if not (direccion_texto and numero):
            return {"ok": False, "reason": "faltan_residencia", "campos": ["direccion_texto", "numero"]}

    # Hasheo y timestamps
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    now = timezone.now()

    with transaction.atomic():
        # 1) Crear/obtener vivienda
        vivienda_id = _get_or_create_vivienda(
            comunidad_id=com_id,
            tipo_id=tipo_id,
            torre=torre,
            direccion_texto=direccion_texto,
            numero=numero,
        )

        # 2) Crear usuario residente enlazado a esa vivienda
        u = Usuario.objects.create(
            comunidad_id=com_id,
            vivienda_id=vivienda_id,          # <<< ENLACE A VIVIENDA
            correo=correo.lower().strip(),
            password_hash=hashed,
            nombre=(nombre or "").strip(),
            apellidos=(apellidos or "").strip(),
            telefono=(telefono or "").strip() if telefono else None,
            rol_usuario_id=3,     # Residente
            estado_usuario_id=1,  # Activo
            promedio_rating=0.00,
            cantidad_ratings=0,
            registrado_en=now,
            actualizado_en=now,
        )

        # 3) Marcar padrón como usado
        PadronAutorizado.objects.filter(
            comunidad_id=com_id, correo=correo.lower().strip()
        ).update(usado=True)

    return {"ok": True, "usuario_id": u.id, "comunidad_id": com_id, "vivienda_id": vivienda_id}
