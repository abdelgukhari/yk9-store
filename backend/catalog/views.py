from django.db.models import Min, Q
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Brand, Category, Product, Review
from .serializers import (
    BrandSerializer,
    CategorySerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    ReviewSerializer,
)


class PublicAPIViewMixin:
    permission_classes = [AllowAny]


class CategoryListView(PublicAPIViewMixin, generics.ListAPIView):
    serializer_class = CategorySerializer
    queryset = Category.objects.filter(is_active=True, parent__isnull=True)


class BrandListView(PublicAPIViewMixin, generics.ListAPIView):
    serializer_class = BrandSerializer
    queryset = Brand.objects.filter(is_active=True)


class ProductListView(PublicAPIViewMixin, generics.ListAPIView):
    serializer_class = ProductListSerializer

    def get_queryset(self):
        qs = (
            Product.objects.filter(status=Product.Status.ACTIVE, variants__is_active=True)
            .select_related("brand", "category")
            .annotate(min_price_agg=Min("variants__price"))
            .distinct()
        )
        category = self.request.query_params.get("category")
        brand = self.request.query_params.get("brand")
        search = self.request.query_params.get("search")
        sort = self.request.query_params.get("sort", "newest")
        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")

        if category:
            cat = Category.objects.filter(slug=category, is_active=True).first()
            if cat:
                descendants = set()
                children = cat.children.filter(is_active=True)
                descendants.update(children.values_list("id", flat=True))
                qs = qs.filter(category_id__in=[cat.id, *descendants])
        if brand:
            qs = qs.filter(brand__slug=brand)
        if search:
            qs = qs.filter(
                Q(name_ar__icontains=search)
                | Q(name_en__icontains=search)
                | Q(model__icontains=search)
            )
        if min_price:
            qs = qs.filter(min_price_agg__gte=min_price)
        if max_price:
            qs = qs.filter(min_price_agg__lte=max_price)

        ordering = {
            "price_asc": "min_price_agg",
            "price_desc": "-min_price_agg",
            "bestseller": "-is_best_seller",
        }
        if sort in ordering:
            qs = qs.order_by(ordering[sort])
        return qs


class ProductDetailView(PublicAPIViewMixin, generics.RetrieveAPIView):
    serializer_class = ProductDetailSerializer
    lookup_field = "slug"
    queryset = Product.objects.filter(status=Product.Status.ACTIVE)


class FeaturedProductsView(PublicAPIViewMixin, generics.ListAPIView):
    serializer_class = ProductListSerializer
    queryset = Product.objects.filter(
        status=Product.Status.ACTIVE, is_featured=True
    ).select_related("brand", "category")


class BestSellerProductsView(PublicAPIViewMixin, generics.ListAPIView):
    serializer_class = ProductListSerializer
    queryset = Product.objects.filter(
        status=Product.Status.ACTIVE, is_best_seller=True
    ).select_related("brand", "category")


class ReviewListView(PublicAPIViewMixin, generics.ListCreateAPIView):
    serializer_class = ReviewSerializer

    def get_queryset(self):
        return Review.objects.filter(
            product__slug=self.kwargs["slug"], is_approved=True
        )

    def create(self, request, *args, **kwargs):
        product = Product.objects.filter(slug=self.kwargs["slug"], status=Product.Status.ACTIVE).first()
        if not product:
            return Response({"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(
            product=product,
            is_approved=False,
            user=request.user if request.user.is_authenticated else None,
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)