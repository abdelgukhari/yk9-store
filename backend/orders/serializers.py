from rest_framework import serializers

from common.validators import validate_egyptian_mobile
from .models import (
    Address,
    Cart,
    CartItem,
    Order,
    OrderItem,
    OrderStatusHistory,
    Payment,
    PaymentStatus,
    VodafoneCashProof,
    Wishlist,
)
from .services import OrderError, get_shipping_rate


class CartItemSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(source="variant.product_id", read_only=True)
    product_name = serializers.CharField(source="variant.product.name_ar", read_only=True)
    product_slug = serializers.CharField(source="variant.product.slug", read_only=True)
    color = serializers.CharField(source="variant.color", read_only=True)
    color_hex = serializers.CharField(source="variant.color_hex", read_only=True)
    sku = serializers.CharField(source="variant.sku", read_only=True)
    price = serializers.DecimalField(source="variant.price", max_digits=12, decimal_places=2, read_only=True)
    compare_at_price = serializers.DecimalField(
        source="variant.compare_at_price", max_digits=12, decimal_places=2, read_only=True
    )
    line_total = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    stock = serializers.IntegerField(source="variant.inventory.available", read_only=True)

    class Meta:
        model = CartItem
        fields = (
            "id",
            "variant",
            "product_id",
            "product_name",
            "product_slug",
            "color",
            "color_hex",
            "sku",
            "price",
            "compare_at_price",
            "line_total",
            "quantity",
            "stock",
            "image_url",
        )

    def get_line_total(self, obj):
        return obj.variant.price * obj.quantity

    def get_image_url(self, obj):
        img = obj.variant.product.images.order_by("sort_order", "id").first()
        if img and img.image:
            return self.context["request"].build_absolute_uri(img.image.url)
        return None


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    coupon = serializers.CharField(source="coupon.code", read_only=True)

    class Meta:
        model = Cart
        fields = ("id", "items", "subtotal", "item_count", "coupon")

    def get_subtotal(self, obj):
        return sum((i.variant.price * i.quantity for i in obj.items.all()), 0)

    def get_item_count(self, obj):
        return sum(i.quantity for i in obj.items.all())


class AddressSerializer(serializers.ModelSerializer):
    governorate_name = serializers.CharField(source="governorate.name_ar", read_only=True)
    city_name = serializers.CharField(source="city.name_ar", read_only=True)

    class Meta:
        model = Address
        fields = (
            "id",
            "full_name",
            "phone",
            "whatsapp",
            "governorate",
            "governorate_name",
            "city",
            "city_name",
            "area",
            "detail",
            "landmark",
            "notes",
            "is_default",
        )

    def validate_phone(self, value):
        validate_egyptian_mobile(value)
        return value

    def validate_whatsapp(self, value):
        if value:
            validate_egyptian_mobile(value)
        return value


class CheckoutSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=128)
    phone = serializers.CharField(max_length=15)
    whatsapp = serializers.CharField(max_length=15, required=False, allow_blank=True)
    governorate_id = serializers.IntegerField()
    city_name = serializers.CharField(max_length=128, required=False, allow_blank=True)
    area = serializers.CharField(max_length=128, required=False, allow_blank=True)
    detail = serializers.CharField(max_length=255)
    landmark = serializers.CharField(max_length=128, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    payment_method = serializers.ChoiceField(choices=("COD", "VODAFONE_CASH"))
    coupon_code = serializers.CharField(required=False, allow_blank=True)
    save_address = serializers.BooleanField(default=False)

    def validate_phone(self, value):
        validate_egyptian_mobile(value)
        return value

    def validate_whatsapp(self, value):
        if value:
            validate_egyptian_mobile(value)
        return value

    def validate_governorate_id(self, value):
        get_shipping_rate(value)
        return value

    def address_dict(self):
        return {
            "governorate_id": self.validated_data["governorate_id"],
            "city_name": self.validated_data.get("city_name", ""),
            "area": self.validated_data.get("area", ""),
            "detail": self.validated_data["detail"],
            "landmark": self.validated_data.get("landmark", ""),
            "full_name": self.validated_data["full_name"],
            "phone": self.validated_data["phone"],
            "whatsapp": self.validated_data.get("whatsapp", ""),
        }


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = (
            "product_name",
            "sku",
            "variant",
            "color",
            "unit_price",
            "discount",
            "quantity",
            "total",
        )


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusHistory
        fields = ("new_status", "reason", "created_at")


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    payment_status = serializers.SerializerMethodField()
    payment_rejection_reason = serializers.SerializerMethodField()
    proofs = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "order_number",
            "status",
            "payment_method",
            "payment_status",
            "payment_rejection_reason",
            "proofs",
            "subtotal",
            "discount",
            "shipping_fee",
            "total",
            "governorate_name",
            "city_name",
            "address_detail",
            "estimated_delivery_days",
            "created_at",
            "items",
            "status_history",
        )

    def get_payment_status(self, obj):
        payment = getattr(obj, "payment", None)
        if payment:
            return payment.status
        return None

    def get_payment_rejection_reason(self, obj):
        payment = getattr(obj, "payment", None)
        if payment:
            return payment.rejection_reason
        return ""

    def get_proofs(self, obj):
        payment = getattr(obj, "payment", None)
        if payment:
            return VodafoneCashProofSerializer(
                payment.proofs.all(), many=True, context=self.context
            ).data
        return []


class VodafoneCashProofSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = VodafoneCashProof
        fields = ("id", "sender_number", "reference", "image_url", "note", "submitted_at")

    def get_image_url(self, obj):
        if obj.proof_image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.proof_image.url)
            return obj.proof_image.url
        return None


class VodafoneProofSubmitSerializer(serializers.Serializer):
    order_number = serializers.CharField(max_length=32)
    phone = serializers.CharField(max_length=15)
    sender_number = serializers.CharField(max_length=15)
    reference = serializers.CharField(max_length=128, required=False, allow_blank=True)
    proof_image = serializers.FileField()
    note = serializers.CharField(required=False, allow_blank=True)

    def validate_phone(self, value):
        validate_egyptian_mobile(value)
        return value

    def validate_sender_number(self, value):
        validate_egyptian_mobile(value)
        return value


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ("id", "method", "status", "amount", "rejection_reason", "created_at")


class WishlistSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(source="product.id", read_only=True)
    product_name = serializers.CharField(source="product.name_ar", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    min_price = serializers.DecimalField(source="product.min_price", max_digits=12, decimal_places=2, read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Wishlist
        fields = ("id", "product_id", "product_name", "product_slug", "min_price", "image_url", "created_at")

    def get_image_url(self, obj):
        img = obj.product.images.order_by("sort_order", "id").first()
        if img and img.image:
            return self.context["request"].build_absolute_uri(img.image.url)
        return None