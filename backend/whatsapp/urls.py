from django.urls import path

from . import views

app_name = "whatsapp"

urlpatterns = [
    path("contact/", views.ContactLinkView.as_view(), name="contact"),
    path("order-confirmation/", views.OrderConfirmationLinkView.as_view(), name="order-confirmation"),
]