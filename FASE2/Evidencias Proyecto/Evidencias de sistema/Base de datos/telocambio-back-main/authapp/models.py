from django.db import models

class Usuario(models.Model):
    id = models.AutoField(primary_key=True)
    comunidad_id = models.IntegerField(null=True, blank=True)
    vivienda_id = models.IntegerField(null=True, blank=True)
    correo = models.CharField(max_length=120)
    password_hash = models.CharField(max_length=255)
    nombre = models.CharField(max_length=60)
    apellidos = models.CharField(max_length=60)
    telefono = models.CharField(max_length=30, null=True, blank=True)
    rol_usuario_id = models.IntegerField()
    estado_usuario_id = models.IntegerField()
    promedio_rating = models.DecimalField(max_digits=3, decimal_places=2)
    cantidad_ratings = models.IntegerField()
    registrado_en = models.DateTimeField()
    actualizado_en = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "usuario"
