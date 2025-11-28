from django.db import models

class EstadoPublicacion(models.Model):
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=20)  # Activa/Oculta/Realizada

    class Meta:
        managed = False
        db_table = "estado_publicacion"
        ordering = ["id"]
