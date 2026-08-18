from django.contrib import admin

from .models import (
    Address,
    Cart,
    CartItem,
    Coupon,
    InventoryReservation,
    Order,
    OrderItem,
    OrderStatusHistory,
    Payment,
    Shipment,
    VodafoneCashProof,
    Wishlist,
)


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product_name", "sku", "color", "unit_price", "discount", "quantity", "total")


class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    readonly_fields = ("prev_status", "new_status", "changed_by", "reason", "created_at")


class ProofInline(admin.TabularInline):
    model = VodafoneCashProof
    extra = 0
    readonly_fields = ("sender_number", "reference", "proof_image", "note", "submitted_at")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "status", "payment_method", "total", "full_name", "phone", "governorate_name", "created_at")
    list_filter = ("status", "payment_method", "governorate_name")
    search_fields = ("order_number", "full_name", "phone")
    inlines = (OrderItemInline, OrderStatusHistoryInline)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("order", "method", "status", "amount", "verified_by", "verified_at")
    list_filter = ("method", "status")
    inlines = (ProofInline,)


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ("cart", "variant", "quantity")


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ("code", "type", "value", "min_subtotal", "usage_limit", "used_count", "is_active", "valid_until")
    list_filter = ("type", "is_active")


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ("user", "full_name", "phone", "governorate", "city")


admin.site.register(Cart)
admin.site.register(Wishlist)
admin.site.register(Shipment)
admin.site.register(InventoryReservation)
admin.site.register(OrderStatusHistory)
admin.site.register(VodafoneCashProof)