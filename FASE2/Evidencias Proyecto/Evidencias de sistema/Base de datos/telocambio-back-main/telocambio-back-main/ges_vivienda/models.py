from django.db import models

class Vivienda(models.Model):
    id = models.AutoField(primary_key=True)
    comunidad_id = models.IntegerField()
    torre = models.CharField(max_length=120, null=True, blank=True)          # para Depto
    direccion_texto = models.CharField(max_length=120, null=True, blank=True) # para Condominio
    numero = models.CharField(max_length=30)

    class Meta:
        managed = False
        db_table = "vivienda"
