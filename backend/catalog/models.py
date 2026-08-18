from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils.text import slugify

from common.validators import validate_uploaded_image


class Category(models.Model):
    name_ar = models.CharField(max_length=128)
    name_en = models.CharField(max_length=128, blank=True)
    slug = models.SlugField(max_length=160, unique=True, blank=True)
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="children"
    )
    image = models.FileField(
        upload_to="categories/", null=True, blank=True, validators=[validate_uploaded_image]
    )
    seo_title = models.CharField(max_length=160, blank=True)
    seo_description = models.CharField(max_length=320, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("sort_order", "name_ar")

    def __str__(self):
        return self.name_ar

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name_ar or self.name_en)
            slug, n = base, 2
            while Category.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug, n = f"{base}-{n}", n + 1
            self.slug = slug
        super().save(*args, **kwargs)


class Brand(models.Model):
    name = models.CharField(max_length=128)
    slug = models.SlugField(max_length=160, unique=True, blank=True)
    logo = models.FileField(
        upload_to="brands/", null=True, blank=True, validators=[validate_uploaded_image]
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)
            slug, n = base, 2
            while Brand.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug, n = f"{base}-{n}", n + 1
            self.slug = slug
        super().save(*args, **kwargs)


class Product(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"

    name_ar = models.CharField(max_length=255)
    name_en = models.CharField(max_length=255, blank=True)
    model = models.CharField(max_length=128, blank=True)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    brand = models.ForeignKey(
        Brand, on_delete=models.PROTECT, related_name="products"
    )
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="products"
    )
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    is_featured = models.BooleanField(default=False)
    is_best_seller = models.BooleanField(default=False)

    battery_life_hours = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    charging_type = models.CharField(max_length=64, blank=True)
    bluetooth_version = models.CharField(max_length=16, blank=True)
    water_resistance = models.CharField(max_length=64, blank=True)
    noise_cancellation = models.BooleanField(default=False)
    warranty_months = models.PositiveIntegerField(default=12)
    box_contents = models.TextField(blank=True)

    seo_title = models.CharField(max_length=160, blank=True)
    seo_description = models.CharField(max_length=320, blank=True)

    is_demo = models.BooleanField(default=False, help_text="Seed/demo data, needs admin review")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return self.name_ar

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name_ar or self.name_en)
            slug, n = base, 2
            while Product.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug, n = f"{base}-{n}", n + 1
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def min_price(self):
        prices = self.variants.filter(is_active=True).values_list("price", flat=True)
        return min(prices, default=Decimal("0.00"))


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="images"
    )
    image = models.FileField(upload_to="products/", validators=[validate_uploaded_image])
    alt = models.CharField(max_length=255, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("sort_order", "id")


class ProductVariant(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="variants"
    )
    color = models.CharField(max_length=64)
    color_hex = models.CharField(max_length=9, blank=True)
    sku = models.CharField(max_length=64, unique=True, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    compare_at_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("id",)

    def __str__(self):
        return f"{self.product.name_ar} - {self.color}"

    @property
    def stock(self):
        return getattr(self.inventory, "quantity", 0)

    @property
    def discount_percent(self):
        if self.compare_at_price and self.compare_at_price > self.price:
            return int(
                (self.compare_at_price - self.price)
                / self.compare_at_price
                * 100
            )
        return 0


class ProductSpecification(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="specifications"
    )
    key = models.CharField(max_length=128)
    value = models.CharField(max_length=255)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("sort_order", "id")

    def __str__(self):
        return f"{self.key}: {self.value}"


class Inventory(models.Model):
    variant = models.OneToOneField(
        ProductVariant, on_delete=models.CASCADE, related_name="inventory"
    )
    quantity = models.PositiveIntegerField(default=0)
    reserved_quantity = models.PositiveIntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=5)

    @property
    def available(self):
        return max(0, self.quantity - self.reserved_quantity)

    def __str__(self):
        return f"{self.variant.sku}: {self.available} available"


class Review(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="reviews"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviews",
    )
    guest_name = models.CharField(max_length=128, blank=True)
    rating = models.PositiveSmallIntegerField(choices=[(i, str(i)) for i in range(1, 6)])
    comment = models.TextField(blank=True)
    is_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.product.name_ar} - {self.rating}★"