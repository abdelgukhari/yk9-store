from rest_framework import serializers

from .models import Brand, Category, Product, ProductImage, ProductVariant, Review


class CategorySerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ("id", "name_ar", "name_en", "slug", "image_url", "children")

    def get_image_url(self, obj):
        if obj.image:
            return self.context["request"].build_absolute_uri(obj.image.url)
        return None

    def get_children(self, obj):
        qs = obj.children.filter(is_active=True)
        if not qs.exists():
            return []
        return CategorySerializer(qs, many=True, context=self.context).data


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ("id", "name", "slug")


class ProductVariantSerializer(serializers.ModelSerializer):
    stock = serializers.IntegerField(read_only=True)
    discount_percent = serializers.IntegerField(read_only=True)

    class Meta:
        model = ProductVariant
        fields = (
            "id",
            "color",
            "color_hex",
            "sku",
            "price",
            "compare_at_price",
            "discount_percent",
            "stock",
            "is_active",
        )


class ProductListSerializer(serializers.ModelSerializer):
    brand = BrandSerializer(read_only=True)
    image_url = serializers.SerializerMethodField()
    min_price = serializers.SerializerMethodField()
    discount_percent = serializers.SerializerMethodField()
    rating_avg = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    variant_id = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "name_ar",
            "name_en",
            "slug",
            "brand",
            "category",
            "image_url",
            "min_price",
            "discount_percent",
            "rating_avg",
            "reviews_count",
            "is_featured",
            "is_best_seller",
            "battery_life_hours",
            "noise_cancellation",
            "variant_id",
            "in_stock",
        )

    def get_image_url(self, obj):
        img = obj.images.order_by("sort_order", "id").first()
        if img and img.image:
            return self.context["request"].build_absolute_uri(img.image.url)
        return None

    def get_min_price(self, obj):
        return obj.min_price

    def get_discount_percent(self, obj):
        prices = obj.variants.filter(is_active=True, compare_at_price__gt=0)
        percents = [
            int((v.compare_at_price - v.price) / v.compare_at_price * 100)
            for v in prices
            if v.compare_at_price > v.price
        ]
        return max(percents, default=0)

    def get_rating_avg(self, obj):
        reviews = obj.reviews.filter(is_approved=True)
        if not reviews.exists():
            return None
        total = sum(r.rating for r in reviews)
        return round(total / reviews.count(), 1)

    def get_reviews_count(self, obj):
        return obj.reviews.filter(is_approved=True).count()

    def get_variant_id(self, obj):
        variant = obj.variants.filter(is_active=True).first()
        return variant.id if variant else None

    def get_in_stock(self, obj):
        variants = obj.variants.filter(is_active=True)
        for v in variants:
            inv = getattr(v, "inventory", None)
            if inv is not None and inv.available > 0:
                return True
        return False


class ProductDetailSerializer(ProductListSerializer):
    variants = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    specifications = serializers.SerializerMethodField()
    related = serializers.SerializerMethodField()

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + (
            "description",
            "charging_type",
            "bluetooth_version",
            "water_resistance",
            "warranty_months",
            "box_contents",
            "specifications",
            "variants",
            "images",
            "related",
        )

    def get_variants(self, obj):
        qs = obj.variants.filter(is_active=True)
        return ProductVariantSerializer(qs, many=True, context=self.context).data

    def get_images(self, obj):
        result = []
        for img in obj.images.order_by("sort_order", "id"):
            if img.image:
                result.append(
                    {
                        "url": self.context["request"].build_absolute_uri(img.image.url),
                        "alt": img.alt or obj.name_ar,
                    }
                )
        return result

    def get_specifications(self, obj):
        return [{"key": s.key, "value": s.value} for s in obj.specifications.order_by("sort_order", "id")]

    def get_related(self, obj):
        qs = (
            Product.objects.filter(category=obj.category, status=Product.Status.ACTIVE)
            .exclude(pk=obj.pk)
            .distinct()[:4]
        )
        return ProductListSerializer(qs, many=True, context=self.context).data


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ("id", "product", "guest_name", "rating", "comment", "created_at")
        read_only_fields = ("id", "product", "created_at")
