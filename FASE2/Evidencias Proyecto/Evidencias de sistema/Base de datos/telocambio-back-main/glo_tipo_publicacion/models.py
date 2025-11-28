from django.db import models

class TipoPublicacion(models.Model):
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=20)

    class Meta:
        managed = False
        db_table = "tipo_publicacion"
        ordering = ["id"]
