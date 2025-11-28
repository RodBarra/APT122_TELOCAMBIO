# ges_publicacion/filters.py
from django.db.models import Q, Count, Subquery, OuterRef, IntegerField
from django.db.models.functions import Coalesce


def filtrar(qs, params):
    q = (params.get("q") or "").strip()
    categoria_id = params.get("categoria_id")
    estado_id = params.get("estado_publicacion_id")
    orden = (params.get("orden") or "").strip()
    # valores esperados:
    # 'recientes' | 'alfabetico' | 'ofertas_desc' | 'ofertas_asc'

    # --------- BÚSQUEDA POR TEXTO ---------
    if q:
        qs = qs.filter(Q(titulo__icontains=q) | Q(descripcion__icontains=q))

    # --------- FILTRO POR CATEGORÍA ---------
    if categoria_id:
        qs = qs.filter(categoria_id=categoria_id)

    # --------- FILTRO POR ESTADO ---------
    if estado_id:
        qs = qs.filter(estado_publicacion_id=estado_id)

    # --------- ORDEN POR CANTIDAD DE OFERTAS PENDIENTES ---------
    if orden in ("ofertas_desc", "ofertas_asc"):
        from ges_intercambio.models import Intercambio

        # Subquery: cuenta SOLO las ofertas PENDIENTES (estado=1)
        subquery = (
            Intercambio.objects
            .filter(
                Q(publicacion_solicitada_id=OuterRef("id")) |
                Q(publicacion_ofrecida_id=OuterRef("id")),
                estado_intercambio_id=1,   # PENDIENTE
            )
            .annotate(c=Count("id"))
            .values("c")[:1]
        )

        # Si no tiene pendientes, queda en 0 (no NULL) para ordenar limpio
        qs = qs.annotate(
            ofertas_pendientes=Coalesce(
                Subquery(subquery, output_field=IntegerField()),
                0,
            )
        )

        if orden == "ofertas_desc":
            # Más pendientes primero; para empates, más reciente primero
            return qs.order_by("-ofertas_pendientes", "-creada_en")
        else:  # ofertas_asc
            # Menos pendientes primero; empates, más reciente primero
            return qs.order_by("ofertas_pendientes", "-creada_en")

    # --------- ORDEN ALFABÉTICO ---------
    if orden == "alfabetico":
        return qs.order_by("titulo")

    # --------- DEFAULT: MÁS RECIENTES ---------
    return qs.order_by("-creada_en")
