from django.db import models

NOTIF_TIPO_CHOICES = (
    ("OFERTA_RECIBIDA", "Oferta recibida"),
    ("OFERTA_ACEPTADA", "Oferta aceptada"),
    ("INTERCAMBIO_MARCADO_REALIZADO", "Intercambio marcado realizado"),
    ("INTERCAMBIO_FINALIZADO_PENDIENTE_VALORACION", "Intercambio finalizado, pendiente de valoración"),
)

class Notificacion(models.Model):
    id = models.BigAutoField(primary_key=True)
    comunidad_id = models.IntegerField()
    receptor_usuario_id = models.IntegerField()
    actor_usuario_id = models.IntegerField(null=True, blank=True)

    tipo = models.CharField(max_length=64, choices=NOTIF_TIPO_CHOICES)
    titulo = models.CharField(max_length=140)
    mensaje = models.CharField(max_length=500)

    intercambio_id = models.IntegerField(null=True, blank=True)
    publicacion_id = models.IntegerField(null=True, blank=True)

    link_url = models.TextField(null=True, blank=True)
    payload = models.JSONField(default=dict)

    creada_en = models.DateTimeField()
    leida_en = models.DateTimeField(null=True, blank=True)
    eliminada_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = "notificacion"
        ordering = ["-creada_en"]
