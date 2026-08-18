from django.urls import path

from . import views

app_name = "catalog"

urlpatterns = [
    path("categories/", views.CategoryListView.as_view(), name="categories"),
    path("brands/", views.BrandListView.as_view(), name="brands"),
    path("products/", views.ProductListView.as_view(), name="products"),
    path("products/featured/", views.FeaturedProductsView.as_view(), name="featured"),
    path("products/best-sellers/", views.BestSellerProductsView.as_view(), name="best-sellers"),
    path("products/<slug:slug>/reviews/", views.ReviewListView.as_view(), name="reviews"),
    path("products/<slug:slug>/", views.ProductDetailView.as_view(), name="product-detail"),
]