from django.urls import path
from .views import PadronAddView, PadronListView, PadronItemView

urlpatterns = [
    # POST   /comunidades/{comunidad_id}/padron
    path("<int:comunidad_id>/padron", PadronAddView.as_view(), name="padron_add"),

    # GET    /comunidades/{comunidad_id}/padron/list
    path("<int:comunidad_id>/padron/list", PadronListView.as_view(), name="padron_list"),

    # PATCH/DELETE  /comunidades/{comunidad_id}/padron/{id}
    path("<int:comunidad_id>/padron/<int:id>", PadronItemView.as_view(), name="padron_item"),
]
