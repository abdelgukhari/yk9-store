from decimal import Decimal

from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import ShippingRate, StoreShippingSettings
from .serializers import ShippingRateSerializer, StoreShippingSettingsSerializer


class GovernorateListWithRatesView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ShippingRateSerializer
    queryset = ShippingRate.objects.filter(is_active=True, governorate__is_active=True)


class ShippingRateView(generics.GenericAPIView):
    """Calculate shipping for a governorate given a subtotal."""

    permission_classes = [AllowAny]

    def post(self, request):
        governorate_id = request.data.get("governorate_id")
        subtotal = Decimal(str(request.data.get("subtotal", "0")))
        rate = ShippingRate.objects.filter(
            governorate_id=governorate_id, is_active=True
        ).select_related("governorate").first()
        if not rate:
            return Response(
                {"detail": "Governorate not found."}, status=status.HTTP_404_NOT_FOUND
            )
        settings = StoreShippingSettings.get()
        global_threshold = settings.free_shipping_threshold
        free_threshold = global_threshold if global_threshold is not None else rate.free_shipping_threshold
        cost = Decimal("0.00")
        free = bool(free_threshold and subtotal >= free_threshold)
        if not free:
            cost = rate.price
        return Response(
            {
                "governorate": rate.governorate.name_ar,
                "shipping_cost": cost,
                "free_shipping": free,
                "free_shipping_threshold": free_threshold or None,
                "estimated_delivery_days": rate.estimated_delivery_days,
            }
        )


class StoreShippingSettingsView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = StoreShippingSettingsSerializer

    def get(self, request):
        settings = StoreShippingSettings.get()
        return Response(self.get_serializer(settings).data)