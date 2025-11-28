from django.db import models

class Categoria(models.Model):
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=120)

    class Meta:
        managed = False            # mapeamos tabla existente, sin migraciones
        db_table = "categoria"
        ordering = ["nombre"]      # opcional: orden alfabético por defecto

    def __str__(self):
        return self.nombre
