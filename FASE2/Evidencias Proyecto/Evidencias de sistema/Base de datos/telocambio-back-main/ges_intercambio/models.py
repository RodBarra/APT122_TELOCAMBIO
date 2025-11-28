# ges_intercambio/models.py
from django.db import models


class EstadoIntercambio(models.Model):
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=60)

    class Meta:
        managed = False
        db_table = "estado_intercambio"
        ordering = ["id"]

    def __str__(self):
        return self.nombre


class Intercambio(models.Model):
    id = models.AutoField(primary_key=True)

    comunidad_id = models.IntegerField()
    # 1=Pendiente, 2=Finalizado, 3=Cancelado, 4=Aceptado
    estado_intercambio_id = models.IntegerField()

    # roles
    solicitante_usuario_id = models.IntegerField()
    receptor_usuario_id = models.IntegerField()

    # publicaciones
    publicacion_solicitada_id = models.IntegerField()
    publicacion_ofrecida_id = models.IntegerField()

    # trazabilidad
    ultimo_estado_por_usuario_id = models.IntegerField(null=True, blank=True)

    # confirmaciones (tabla aparte)
    # nombres reales en BD
    creado_en = models.DateTimeField()
    actualizado_en = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "intercambio"
        ordering = ["-creado_en"]

    def __str__(self):
        return f"Intercambio #{self.id} (sol:{self.solicitante_usuario_id} -> rec:{self.receptor_usuario_id})"


# ----- Tablas auxiliares sin migraciones (managed=False) -----

class IntercambioConfirmacion(models.Model):
    id = models.AutoField(primary_key=True)
    intercambio_id = models.IntegerField()
    usuario_id = models.IntegerField()
    confirmado_en = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "intercambio_confirmacion"
        unique_together = (("intercambio_id", "usuario_id"),)


class ValoracionUsuario(models.Model):
    """
    Representa la tabla valoracion_usuario:
    - UNIQUE (intercambio_id, calificador_usuario_id)
    """
    id = models.AutoField(primary_key=True)
    intercambio_id = models.IntegerField()
    calificador_usuario_id = models.IntegerField()
    calificado_usuario_id = models.IntegerField()
    puntaje = models.SmallIntegerField()  # 1..5
    comentario = models.CharField(max_length=255, null=True, blank=True)
    creado_en = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "valoracion_usuario"
        unique_together = (("intercambio_id", "calificador_usuario_id"),)


class Vivienda(models.Model):
    id = models.AutoField(primary_key=True)
    comunidad_id = models.IntegerField()
    torre = models.CharField(max_length=255, null=True, blank=True)
    direccion_texto = models.CharField(max_length=255, null=True, blank=True)
    numero = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        managed = False
        db_table = "vivienda"
