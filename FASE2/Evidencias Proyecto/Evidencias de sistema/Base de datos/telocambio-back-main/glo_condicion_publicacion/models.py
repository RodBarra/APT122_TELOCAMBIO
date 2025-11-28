from django.db import models

class CondicionPublicacion(models.Model):
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=20)  # Nuevo/Usado/Malo

    class Meta:
        managed = False
        db_table = "condicion_publicacion"
        ordering = ["id"]
