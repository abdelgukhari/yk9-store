from decimal import Decimal

from django.conf import settings
from django.db import models


class Governorate(models.Model):
    name_ar = models.CharField(max_length=128, unique=True)
    name_en = models.CharField(max_length=128, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("sort_order", "name_ar")

    def __str__(self):
        return self.name_ar


class City(models.Model):
    governorate = models.ForeignKey(
        Governorate, on_delete=models.CASCADE, related_name="cities"
    )
    name_ar = models.CharField(max_length=128)
    name_en = models.CharField(max_length=128, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("name_ar",)
        unique_together = ("governorate", "name_ar")

    def __str__(self):
        return f"{self.name_ar} ({self.governorate.name_ar})"


class ShippingRate(models.Model):
    governorate = models.OneToOneField(
        Governorate, on_delete=models.CASCADE, related_name="shipping_rate"
    )
    price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    free_shipping_threshold = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Subtotal at or above this value ships free for this governorate.",
    )
    estimated_delivery_days = models.PositiveIntegerField(default=3)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("governorate__name_ar",)

    def __str__(self):
        return f"{self.governorate.name_ar}: {self.price} EGP"


class StoreShippingSettings(models.Model):
    free_shipping_threshold = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Global free-shipping threshold (overrides per-governorate when set).",
    )
    default_estimated_delivery_days = models.PositiveIntegerField(default=3)
    inventory_reservation_policy = models.CharField(
        max_length=20,
        choices=[
            ("none", "No reservation"),
            ("hold", "Reserve until confirmation"),
            ("deduct", "Deduct immediately"),
        ],
        default="hold",
    )
    reservation_hours = models.PositiveIntegerField(
        default=48, help_text="How long a held reservation lasts."
    )

    class Meta:
        verbose_name = "Store shipping settings"
        verbose_name_plural = "Store shipping settings"

    def save(self, *args, **kwargs):
        if not self.pk and StoreShippingSettings.objects.exists():
            raise ValueError("Only a single StoreShippingSettings row is allowed.")
        super().save(*args, **kwargs)

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj