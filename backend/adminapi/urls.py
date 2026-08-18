from django.urls import path

from . import views

urlpatterns = [
    path("dashboard/", views.DashboardView.as_view(), name="admin-dashboard"),
    path("orders/", views.AdminOrderListView.as_view(), name="admin-orders"),
    path("orders/statuses/", views.AdminOrderStatusListView.as_view(), name="admin-order-statuses"),
    path(
        "orders/<str:order_number>/",
        views.AdminOrderDetailView.as_view(),
        name="admin-order-detail",
    ),
    path(
        "orders/<str:order_number>/transition/",
        views.AdminOrderTransitionView.as_view(),
        name="admin-order-transition",
    ),
    path(
        "orders/<str:order_number>/payment/review/",
        views.AdminOrderPaymentReviewView.as_view(),
        name="admin-order-payment-review",
    ),
    path(
        "orders/<str:order_number>/release/",
        views.AdminOrderReleaseView.as_view(),
        name="admin-order-release",
    ),
    path(
        "orders/<str:order_number>/consume/",
        views.AdminOrderConsumeView.as_view(),
        name="admin-order-consume",
    ),
    path("categories/", views.AdminCategoryListView.as_view(), name="admin-categories"),
    path(
        "categories/<int:pk>/",
        views.AdminCategoryDetailView.as_view(),
        name="admin-category-detail",
    ),
    path("brands/", views.AdminBrandListView.as_view(), name="admin-brands"),
    path("brands/<int:pk>/", views.AdminBrandDetailView.as_view(), name="admin-brand-detail"),
    path("products/", views.AdminProductListView.as_view(), name="admin-products"),
    path("products/create/", views.AdminProductCreateView.as_view(), name="admin-product-create"),
    path("products/<int:pk>/", views.AdminProductDetailView.as_view(), name="admin-product-detail"),
    path(
        "products/<int:pk>/archive/",
        views.AdminProductArchiveView.as_view(),
        name="admin-product-archive",
    ),
    path("images/", views.AdminProductImageCreateView.as_view(), name="admin-image-create"),
    path(
        "images/<int:pk>/",
        views.AdminProductImageDetailView.as_view(),
        name="admin-image-detail",
    ),
    path("variants/", views.AdminVariantCreateView.as_view(), name="admin-variant-create"),
    path(
        "variants/<int:pk>/",
        views.AdminVariantDetailView.as_view(),
        name="admin-variant-detail",
    ),
    path("coupons/", views.AdminCouponListView.as_view(), name="admin-coupons"),
    path("coupons/<int:pk>/", views.AdminCouponDetailView.as_view(), name="admin-coupon-detail"),
    path("reviews/", views.AdminReviewListView.as_view(), name="admin-reviews"),
    path("reviews/<int:pk>/moderate/", views.AdminReviewModerateView.as_view(), name="admin-review-moderate"),
    path("customers/", views.AdminCustomerListView.as_view(), name="admin-customers"),
    path("ai/agents/", views.AdminAgentListView.as_view(), name="admin-ai-agents"),
    path("ai/agents/<int:pk>/", views.AdminAgentDetailView.as_view(), name="admin-ai-agent-detail"),
    path("ai/providers/", views.AdminProviderListView.as_view(), name="admin-ai-providers"),
    path(
        "ai/providers/<int:pk>/",
        views.AdminProviderDetailView.as_view(),
        name="admin-ai-provider-detail",
    ),
]