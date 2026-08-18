from django.contrib.auth import get_user_model
from rest_framework import serializers

from ai.models import AIAgent, AIProvider
from catalog.models import Brand, Category, Inventory, Product, ProductImage, ProductVariant, Review
from orders.models import (
    Coupon,
    Order,
    OrderItem,
    OrderStatusHistory,
    Payment,
    VodafoneCashProof,
)

User = get_user_model()


class AdminOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product_name",
            "sku",
            "variant",
            "color",
            "unit_price",
            "discount",
            "quantity",
            "total",
        )


class AdminStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_email = serializers.SerializerMethodField()

    class Meta:
        model = OrderStatusHistory
        fields = ("id", "prev_status", "new_status", "reason", "changed_by_email", "created_at")

    def get_changed_by_email(self, obj):
        return obj.changed_by.email if obj.changed_by else None


class AdminPaymentSerializer(serializers.ModelSerializer):
    verified_by_email = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = (
            "id",
            "method",
            "status",
            "amount",
            "verified_by_email",
            "verified_at",
            "rejection_reason",
            "created_at",
        )

    def get_verified_by_email(self, obj):
        return obj.verified_by.email if obj.verified_by else None


class AdminProofSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = VodafoneCashProof
        fields = ("id", "sender_number", "reference", "image_url", "note", "submitted_at")

    def get_image_url(self, obj):
        if obj.proof_image:
            return self.context["request"].build_absolute_uri(obj.proof_image.url)
        return None


class AdminOrderListSerializer(serializers.ModelSerializer):
    payment_status = serializers.SerializerMethodField()
    payment_method = serializers.CharField(source="payment.method", default="")
    item_count = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id",
            "order_number",
            "status",
            "payment_method",
            "payment_status",
            "full_name",
            "phone",
            "customer_email",
            "total",
            "item_count",
            "created_at",
        )

    def get_payment_status(self, obj):
        payment = getattr(obj, "payment", None)
        return payment.status if payment else None

    def get_item_count(self, obj):
        return obj.items.count()

    def get_customer_email(self, obj):
        return obj.user.email if obj.user else None


class AdminOrderDetailSerializer(AdminOrderListSerializer):
    items = AdminOrderItemSerializer(many=True, read_only=True)
    payment = AdminPaymentSerializer(read_only=True)
    proofs = serializers.SerializerMethodField()
    status_history = AdminStatusHistorySerializer(many=True, read_only=True)
    coupon_code = serializers.SerializerMethodField()

    class Meta(AdminOrderListSerializer.Meta):
        fields = AdminOrderListSerializer.Meta.fields + (
            "subtotal",
            "discount",
            "shipping_fee",
            "coupon_code",
            "whatsapp",
            "governorate_name",
            "city_name",
            "area",
            "address_detail",
            "landmark",
            "notes",
            "estimated_delivery_days",
            "inventory_policy",
            "is_demo",
            "updated_at",
            "items",
            "payment",
            "proofs",
            "status_history",
        )

    def get_proofs(self, obj):
        payment = getattr(obj, "payment", None)
        if payment is None:
            return []
        qs = payment.proofs.all()
        return AdminProofSerializer(qs, many=True, context=self.context).data

    def get_coupon_code(self, obj):
        return obj.coupon.code if obj.coupon else None


class AdminCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = (
            "id",
            "name_ar",
            "name_en",
            "slug",
            "parent",
            "seo_title",
            "seo_description",
            "is_active",
            "sort_order",
        )


class AdminBrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ("id", "name", "slug", "description", "is_active")


class AdminProductListSerializer(serializers.ModelSerializer):
    brand_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    min_price = serializers.SerializerMethodField()
    total_stock = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "name_ar",
            "name_en",
            "slug",
            "brand_name",
            "category_name",
            "status",
            "is_featured",
            "is_best_seller",
            "min_price",
            "total_stock",
            "created_at",
            "updated_at",
        )

    def get_brand_name(self, obj):
        return obj.brand.name if obj.brand else None

    def get_category_name(self, obj):
        return obj.category.name_ar if obj.category else None

    def get_min_price(self, obj):
        value = getattr(obj, "min_price_agg", None)
        if value is not None:
            return value
        return obj.min_price


class AdminVariantSerializer(serializers.ModelSerializer):
    stock = serializers.SerializerMethodField()
    reserved_quantity = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = (
            "id",
            "color",
            "color_hex",
            "sku",
            "price",
            "compare_at_price",
            "is_active",
            "stock",
            "reserved_quantity",
        )

    def get_stock(self, obj):
        inv = getattr(obj, "inventory", None)
        return inv.quantity if inv else 0

    def get_reserved_quantity(self, obj):
        inv = getattr(obj, "inventory", None)
        return inv.reserved_quantity if inv else 0


class AdminProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ("id", "product", "image", "image_url", "alt", "sort_order")
        extra_kwargs = {"image": {"write_only": True}}

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url


class AdminProductDetailSerializer(serializers.ModelSerializer):
    brand_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    variants = AdminVariantSerializer(many=True, read_only=True)
    images = serializers.SerializerMethodField()
    specifications = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "name_ar",
            "name_en",
            "model",
            "slug",
            "brand",
            "brand_name",
            "category",
            "category_name",
            "description",
            "status",
            "is_featured",
            "is_best_seller",
            "battery_life_hours",
            "charging_type",
            "bluetooth_version",
            "water_resistance",
            "noise_cancellation",
            "warranty_months",
            "box_contents",
            "seo_title",
            "seo_description",
            "created_at",
            "updated_at",
            "variants",
            "images",
            "specifications",
        )

    def get_brand_name(self, obj):
        return obj.brand.name if obj.brand else None

    def get_category_name(self, obj):
        return obj.category.name_ar if obj.category else None

    def get_images(self, obj):
        qs = obj.images.order_by("sort_order", "id")
        return AdminProductImageSerializer(qs, many=True, context=self.context).data

    def get_specifications(self, obj):
        return [
            {"key": s.key, "value": s.value}
            for s in obj.specifications.order_by("sort_order", "id")
        ]


class AdminProductWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = (
            "id",
            "name_ar",
            "name_en",
            "model",
            "brand",
            "category",
            "description",
            "status",
            "is_featured",
            "is_best_seller",
            "battery_life_hours",
            "charging_type",
            "bluetooth_version",
            "water_resistance",
            "noise_cancellation",
            "warranty_months",
            "box_contents",
            "seo_title",
            "seo_description",
        )


class AdminVariantWriteSerializer(serializers.ModelSerializer):
    stock = serializers.IntegerField(required=False, write_only=True)

    class Meta:
        model = ProductVariant
        fields = (
            "id",
            "product",
            "color",
            "color_hex",
            "sku",
            "price",
            "compare_at_price",
            "is_active",
            "stock",
        )


class AdminCouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = (
            "id",
            "code",
            "type",
            "value",
            "min_subtotal",
            "max_discount",
            "usage_limit",
            "used_count",
            "is_active",
            "valid_from",
            "valid_until",
        )
        read_only_fields = ("id", "used_count")


class AdminReviewSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = (
            "id",
            "product",
            "product_name",
            "user_email",
            "guest_name",
            "rating",
            "comment",
            "is_approved",
            "created_at",
        )

    def get_product_name(self, obj):
        return obj.product.name_ar if obj.product else None

    def get_user_email(self, obj):
        return obj.user.email if obj.user else None


class AdminCustomerSerializer(serializers.ModelSerializer):
    orders_count = serializers.SerializerMethodField()
    total_spent = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_staff",
            "is_active",
            "is_email_verified",
            "date_joined",
            "last_login",
            "orders_count",
            "total_spent",
        )

    def get_orders_count(self, obj):
        return obj.orders.count()

    def get_total_spent(self, obj):
        from django.db.models import Sum

        return (
            obj.orders.exclude(status__in=["Cancelled", "Returned", "Refunded"]).aggregate(
                total=Sum("total")
            )["total"]
            or 0
        )


class AdminAgentSerializer(serializers.ModelSerializer):
    provider_name = serializers.SerializerMethodField()

    class Meta:
        model = AIAgent
        fields = (
            "id",
            "name",
            "description",
            "role",
            "system_instructions",
            "provider",
            "provider_name",
            "model",
            "temperature",
            "max_tokens",
            "is_active",
            "is_default",
            "created_at",
            "updated_at",
        )

    def get_provider_name(self, obj):
        return obj.provider.name if obj.provider else None


class AdminProviderSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = AIProvider
        fields = (
            "id",
            "name",
            "kind",
            "kind_label",
            "base_url",
            "model",
            "is_active",
            "is_online",
            "last_checked_at",
        )
        read_only_fields = ("is_online", "last_checked_at")