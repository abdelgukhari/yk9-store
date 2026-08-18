from django.urls import path

from . import views

app_name = "shipping"

urlpatterns = [
    path("governorates/", views.GovernorateListWithRatesView.as_view(), name="governorates"),
    path("rate/", views.ShippingRateView.as_view(), name="rate"),
    path("settings/", views.StoreShippingSettingsView.as_view(), name="settings"),
]