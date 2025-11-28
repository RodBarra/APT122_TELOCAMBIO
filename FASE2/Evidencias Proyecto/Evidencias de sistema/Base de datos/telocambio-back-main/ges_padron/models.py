from django.db import models

class PadronAutorizado(models.Model):
    id = models.AutoField(primary_key=True)
    comunidad_id = models.IntegerField()
    correo = models.CharField(max_length=120)
    estado_padron_id = models.IntegerField()   # 1=Disponible, 2=Usado (o lo que uses)
    cargado_por_correo = models.CharField(max_length=120)
    cargado_en = models.DateTimeField()
    habilitado = models.BooleanField()
    usado = models.BooleanField()

    # OJO: ya NO declaramos torre/direccion_texto/numero
    # porque las columnas se eliminaron en la BD.

    class Meta:
        managed = False
        db_table = "padron_autorizado"
