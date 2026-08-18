from django.contrib import admin

from .models import City, Governorate, ShippingRate, StoreShippingSettings


class CityInline(admin.TabularInline):
    model = City
    extra = 0


@admin.register(Governorate)
class GovernorateAdmin(admin.ModelAdmin):
    list_display = ("name_ar", "name_en", "is_active", "sort_order")
    list_filter = ("is_active",)
    inlines = (CityInline,)


@admin.register(ShippingRate)
class ShippingRateAdmin(admin.ModelAdmin):
    list_display = ("governorate", "price", "free_shipping_threshold", "estimated_delivery_days", "is_active")
    list_filter = ("is_active",)
    search_fields = ("governorate__name_ar",)


@admin.register(StoreShippingSettings)
class StoreShippingSettingsAdmin(admin.ModelAdmin):
    list_display = ("free_shipping_threshold", "default_estimated_delivery_days", "inventory_reservation_policy", "reservation_hours")