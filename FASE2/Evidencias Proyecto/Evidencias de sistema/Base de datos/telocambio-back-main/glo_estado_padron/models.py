from django.db import models

class EstadoPadron(models.Model):
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=30)

    class Meta:
        managed = False
        db_table = "estado_padron"
