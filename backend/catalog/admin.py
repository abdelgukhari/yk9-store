from django.contrib import admin

from .models import Brand, Category, Inventory, Product, ProductImage, ProductSpecification, ProductVariant, Review


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 0


class ProductSpecificationInline(admin.TabularInline):
    model = ProductSpecification
    extra = 0


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name_ar", "slug", "parent", "is_active", "sort_order")
    list_filter = ("is_active",)
    search_fields = ("name_ar", "name_en")


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active")
    search_fields = ("name",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name_ar", "brand", "category", "status", "min_price", "is_demo", "updated_at")
    list_filter = ("status", "brand", "category", "is_demo")
    search_fields = ("name_ar", "name_en", "model")
    inlines = (ProductImageInline, ProductVariantInline, ProductSpecificationInline)
    prepopulated_fields = {"slug": ("name_en",)}


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ("variant", "quantity", "reserved_quantity", "available", "low_stock_threshold")
    search_fields = ("variant__sku",)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("product", "guest_name", "user", "rating", "is_approved", "created_at")
    list_filter = ("is_approved", "rating")
    search_fields = ("product__name_ar", "guest_name")