from .models import Comunidad

def comunidad_create(data:dict):
    return Comunidad.objects.create(**data)

def comunidad_update(comunidad_id:int, data:dict):
    Comunidad.objects.filter(id=comunidad_id).update(**data)
