from django.db import transaction
from .models import PadronAutorizado

def padron_add(comunidad_id:int, correo:str, cargado_por:str, torre=None, direccion_texto=None, numero=None):
    with transaction.atomic():
        item, created = PadronAutorizado.objects.get_or_create(
            comunidad_id=comunidad_id, correo=correo.lower(),
            defaults=dict(
                estado_padron_id=1,
                cargado_por_correo=cargado_por,
                habilitado=True, usado=False,
                torre=torre, direccion_texto=direccion_texto, numero=numero,
            )
        )
        if not created:
            item.habilitado = True
            if torre: item.torre = torre
            if direccion_texto: item.direccion_texto = direccion_texto
            if numero: item.numero = numero
            item.save()
        return item
