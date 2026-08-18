from django.urls import path

from . import views

app_name = "orders"

urlpatterns = [
    path("cart/", views.CartView.as_view(), name="cart"),
    path("cart/items/<int:item_id>/", views.CartItemView.as_view(), name="cart-item"),
    path("cart/clear/", views.CartClearView.as_view(), name="cart-clear"),
    path("cart/totals/", views.CartTotalsView.as_view(), name="cart-totals"),
    path("coupon/", views.CouponView.as_view(), name="coupon"),
    path("checkout/", views.CheckoutView.as_view(), name="checkout"),
    path("orders/mine/", views.MyOrdersView.as_view(), name="my-orders"),
    path("orders/track/", views.OrderTrackView.as_view(), name="order-track"),
    path(
        "orders/<str:order_number>/payment-proof/",
        views.PaymentProofSubmitView.as_view(),
        name="payment-proof",
    ),
    path("orders/<str:order_number>/", views.OrderDetailView.as_view(), name="order-detail"),
    path("wishlist/", views.WishlistView.as_view(), name="wishlist"),
    path("addresses/", views.AddressListCreateView.as_view(), name="addresses"),
    path("addresses/<int:pk>/", views.AddressDetailView.as_view(), name="address-detail"),
]