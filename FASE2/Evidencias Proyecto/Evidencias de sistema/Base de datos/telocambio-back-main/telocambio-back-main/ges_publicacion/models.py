from django.db import models
from django.utils import timezone

ESTADO_ACTIVA = 1
ESTADO_OCULTA = 2
ESTADO_REALIZADA = 3


class Publicacion(models.Model):
    id = models.AutoField(primary_key=True)
    comunidad_id = models.IntegerField()
    propietario_usuario_id = models.IntegerField()
    categoria_id = models.IntegerField()
    tipo_publicacion_id = models.IntegerField()
    titulo = models.CharField(max_length=120)
    descripcion = models.TextField(null=True, blank=True)
    condicion_producto_id = models.IntegerField()
    estado_publicacion_id = models.IntegerField()  # 1=Activa, 2=Oculta, 3=Realizada
    creada_en = models.DateTimeField()
    actualizada_en = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "publicacion"
        ordering = ["-creada_en"]

    def __str__(self):
        return f"[{self.id}] {self.titulo}"

    def touch(self):
        self.actualizada_en = timezone.now()
        self.save(update_fields=["actualizada_en"])


class ImagenPublicacion(models.Model):
    id = models.AutoField(primary_key=True)
    publicacion_id = models.IntegerField()
    url = models.TextField()
    posicion = models.SmallIntegerField(default=0)
    creada_en = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = "imagen_publicacion"
        ordering = ["posicion"]
        unique_together = (("publicacion_id", "posicion"),)

    def __str__(self):
        return f"img pub={self.publicacion_id} pos={self.posicion}"


class ModeracionPublicacion(models.Model):
    id = models.AutoField(primary_key=True)
    publicacion_id = models.IntegerField()
    moderador_usuario_id = models.IntegerField()
    motivo = models.TextField(null=True, blank=True)
    creada_en = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = "moderacion_publicacion"

    def __str__(self):
        return f"mod pub={self.publicacion_id} by {self.moderador_usuario_id}"
