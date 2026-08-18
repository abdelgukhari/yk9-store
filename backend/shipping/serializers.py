from rest_framework import serializers

from .models import City, Governorate, ShippingRate, StoreShippingSettings


class CitySerializer(serializers.ModelSerializer):
    class Meta:
        model = City
        fields = ("id", "name_ar")


class ShippingRateSerializer(serializers.ModelSerializer):
    cities = serializers.SerializerMethodField()

    class Meta:
        model = ShippingRate
        fields = (
            "id",
            "governorate",
            "governorate_name",
            "price",
            "free_shipping_threshold",
            "estimated_delivery_days",
            "is_active",
            "cities",
        )

    governorate_name = serializers.CharField(source="governorate.name_ar", read_only=True)

    def get_cities(self, obj):
        qs = obj.governorate.cities.all()
        return CitySerializer(qs, many=True).data


class StoreShippingSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreShippingSettings
        fields = ("free_shipping_threshold", "default_estimated_delivery_days")