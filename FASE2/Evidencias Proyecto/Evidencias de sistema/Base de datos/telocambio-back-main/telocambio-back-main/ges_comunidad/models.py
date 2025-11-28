from django.db import models

class Comunidad(models.Model):
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=120)
    tipo_id = models.IntegerField()  # 1=Departamento, 2=Condominio
    direccion = models.CharField(max_length=120, null=True, blank=True)
    correo_contacto_admin = models.CharField(max_length=120, null=True, blank=True)  # ahora permite NULL
    estado_comunidad_id = models.IntegerField(null=True, blank=True)  # 1=Activa
    creado_en = models.DateTimeField()
    codigo = models.CharField(max_length=32)  # único por comunidad

    class Meta:
        managed = False
        db_table = "comunidad"
