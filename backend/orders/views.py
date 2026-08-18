from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.services import audit_log
from catalog.models import Product, ProductVariant
from common.validators import validate_egyptian_mobile

from .models import (
    Address,
    Cart,
    CartItem,
    Coupon,
    Order,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    VodafoneCashProof,
    Wishlist,
)
from .serializers import (
    AddressSerializer,
    CartSerializer,
    CheckoutSerializer,
    OrderSerializer,
    VodafoneCashProofSerializer,
    VodafoneProofSubmitSerializer,
    WishlistSerializer,
)
from .services import (
    OrderError,
    add_to_cart,
    calculate_totals,
    change_order_status,
    create_order,
    get_or_create_cart,
)


def _session_key(request):
    return request.headers.get("X-Session-Key") or request.query_params.get("session_key")


def _get_cart(request):
    user = request.user
    if user.is_authenticated:
        return get_or_create_cart(user=user)
    key = _session_key(request)
    if not key:
        raise NotFound("Session key missing. Send X-Session-Key header for guest carts.")
    return get_or_create_cart(session_key=key)


def _get_user_or_401(request):
    if not request.user.is_authenticated:
        raise PermissionDenied("Authentication required.")
    return request.user


class CartView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        cart = _get_cart(request)
        return Response(CartSerializer(cart, context={"request": request}).data)

    def post(self, request):
        cart = _get_cart(request)
        variant_id = request.data.get("variant_id")
        quantity = int(request.data.get("quantity", 1))
        variant = ProductVariant.objects.filter(pk=variant_id, is_active=True).select_related(
            "product", "inventory"
        ).first()
        if not variant:
            return Response({"detail": "Variant not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            add_to_cart(cart, variant, quantity)
        except OrderError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(CartSerializer(cart, context={"request": request}).data)


class CartItemView(APIView):
    permission_classes = [AllowAny]

    def _get_item(self, request, item_id):
        cart = _get_cart(request)
        return cart.items.select_related("variant__product", "variant__inventory").filter(pk=item_id).first()

    def patch(self, request, item_id):
        item = self._get_item(request, item_id)
        if not item:
            return Response({"detail": "Item not found."}, status=status.HTTP_404_NOT_FOUND)
        quantity = int(request.data.get("quantity", item.quantity))
        if quantity <= 0:
            item.delete()
            cart = _get_cart(request)
            return Response(CartSerializer(cart, context={"request": request}).data)
        inv = item.variant.inventory
        if inv is not None and inv.available < quantity:
            return Response(
                {"detail": f"الكمية غير متوفرة ({inv.available} متاح)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        item.quantity = quantity
        item.save()
        cart = _get_cart(request)
        return Response(CartSerializer(cart, context={"request": request}).data)

    def delete(self, request, item_id):
        item = self._get_item(request, item_id)
        if item:
            item.delete()
        cart = _get_cart(request)
        return Response(CartSerializer(cart, context={"request": request}).data)


class CartClearView(APIView):
    permission_classes = [AllowAny]

    def delete(self, request):
        cart = _get_cart(request)
        cart.items.all().delete()
        return Response({"detail": "Cart cleared."})


class CartTotalsView(APIView):
    """Compute subtotal/discount/shipping/total for a governorate."""

    permission_classes = [AllowAny]

    def post(self, request):
        cart = _get_cart(request)
        governorate_id = request.data.get("governorate_id")
        coupon_code = request.data.get("coupon_code", "")
        try:
            totals = calculate_totals(cart, governorate_id, coupon=None)
            coupon = None
            if coupon_code:
                coupon = Coupon.objects.filter(code=coupon_code.strip().upper()).first()
                if not coupon or not coupon.is_valid(totals["subtotal"]):
                    return Response({"detail": "الكوبون غير صالح."}, status=status.HTTP_400_BAD_REQUEST)
                totals = calculate_totals(cart, governorate_id, coupon)
        except OrderError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {
                "subtotal": totals["subtotal"],
                "discount": totals["discount"],
                "shipping_fee": totals["shipping_fee"],
                "total": totals["total"],
                "governorate": totals["governorate"].name_ar,
                "estimated_delivery_days": totals["estimated_delivery_days"],
                "coupon_code": coupon.code if coupon else "",
            }
        )


class CouponView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        code = request.data.get("code", "").strip().upper()
        cart = _get_cart(request)
        subtotal = sum((i.variant.price * i.quantity for i in cart.items.all()), Decimal("0.00"))
        coupon = Coupon.objects.filter(code=code).first()
        if not coupon or not coupon.is_valid(subtotal):
            return Response({"detail": "الكوبون غير صالح."}, status=status.HTTP_400_BAD_REQUEST)
        cart.coupon = coupon
        cart.save(update_fields=["coupon"])
        return Response({"detail": "تم تطبيق الكوبون.", "code": coupon.code})

    def delete(self, request):
        cart = _get_cart(request)
        cart.coupon = None
        cart.save(update_fields=["coupon"])
        return Response({"detail": "تمت إزالة الكوبون."})


class CheckoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user = request.user
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        cart = _get_cart(request)
        if not cart.items.exists():
            return Response({"detail": "السلة فارغة."}, status=status.HTTP_400_BAD_REQUEST)
        if data.get("save_address") and user.is_authenticated:
            Address.objects.create(user=user, **serializer.address_dict())
        try:
            order = create_order(
                user=user,
                cart=cart,
                payment_method=data["payment_method"],
                address=serializer.address_dict(),
                coupon_code=data.get("coupon_code", ""),
                notes=data.get("notes", ""),
                request=request,
            )
        except OrderError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {
                "order_number": order.order_number,
                "status": order.status,
                "total": order.total,
                "payment_method": order.payment_method,
                "estimated_delivery_days": order.estimated_delivery_days,
            },
            status=status.HTTP_201_CREATED,
        )


class MyOrdersView(generics.ListAPIView):
    serializer_class = OrderSerializer

    def get_queryset(self):
        user = _get_user_or_401(self.request)
        return Order.objects.filter(user=user).prefetch_related("items", "status_history")


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    lookup_field = "order_number"

    def get_queryset(self):
        user = _get_user_or_401(self.request)
        return Order.objects.filter(user=user).prefetch_related("items", "status_history")


class OrderTrackView(APIView):
    """Public order tracking by order_number + phone."""

    permission_classes = [AllowAny]

    def post(self, request):
        order_number = request.data.get("order_number", "").strip().upper()
        phone = request.data.get("phone", "").strip()
        try:
            validate_egyptian_mobile(phone)
        except ValidationError as exc:
            return Response(
                {"detail": (exc.messages or ["رقم موبايل غير صحيح."])[0]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order = Order.objects.filter(order_number=order_number).prefetch_related(
            "items", "status_history"
        ).first()
        if not order or order.phone != phone:
            return Response({"detail": "بيانات غير صحيحة."}, status=status.HTTP_404_NOT_FOUND)
        return Response(OrderSerializer(order).data)


class PaymentProofSubmitView(APIView):
    """Customer submits a Vodafone Cash transfer proof for an order.

    Verified by order ownership (authenticated user) or order_number + phone
    match (guest orders). Resubmission after rejection moves the order back to
    payment verification pending.
    """

    permission_classes = [AllowAny]

    def post(self, request, order_number):
        serializer = VodafoneProofSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        order = (
            Order.objects.filter(order_number=order_number.upper())
            .select_related("payment")
            .prefetch_related("payment__proofs")
            .first()
        )
        if not order:
            return Response({"detail": "الطلب غير موجود."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        owner = user.is_authenticated and order.user_id == user.id
        if not owner and order.phone != data["phone"]:
            return Response({"detail": "بيانات غير صحيحة."}, status=status.HTTP_404_NOT_FOUND)

        if order.payment_method != PaymentMethod.VODAFONE_CASH:
            return Response(
                {"detail": "هذا الطلب ليس دفعًا عبر فودافون كاش."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if order.status not in (
            OrderStatus.PAYMENT_VERIFICATION_PENDING,
            OrderStatus.PAYMENT_REJECTED,
        ):
            return Response(
                {"detail": "لا يمكن إرسال إثبات الدفع في هذه المرحلة."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        payment = order.payment
        if payment is None or payment.status == PaymentStatus.PAID:
            return Response(
                {"detail": "الدفع معتمد مسبقًا."}, status=status.HTTP_400_BAD_REQUEST
            )

        proof = VodafoneCashProof.objects.create(
            payment=payment,
            sender_number=data["sender_number"],
            reference=data.get("reference", ""),
            proof_image=data["proof_image"],
            note=data.get("note", ""),
        )

        if order.status == OrderStatus.PAYMENT_REJECTED:
            change_order_status(
                order,
                OrderStatus.PAYMENT_VERIFICATION_PENDING,
                user,
                "تم إرسال إثبات دفع جديد",
                request,
            )

        audit_log(
            request,
            user,
            "payment.proof.submitted",
            "payment",
            payment.pk,
            {"order": order.order_number, "proof": proof.pk},
        )

        return Response(
            {
                "order_number": order.order_number,
                "status": order.status,
                "payment_status": payment.status,
                "proof": VodafoneCashProofSerializer(
                    proof, context={"request": request}
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )


class WishlistView(generics.ListCreateAPIView):
    serializer_class = WishlistSerializer

    def get_queryset(self):
        user = _get_user_or_401(self.request)
        return Wishlist.objects.filter(user=user).select_related("product")

    def create(self, request, *args, **kwargs):
        user = _get_user_or_401(request)
        product = Product.objects.filter(pk=request.data.get("product_id"), status=Product.Status.ACTIVE).first()
        if not product:
            return Response({"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            item = Wishlist.objects.create(user=user, product=product)
        except IntegrityError:
            return Response({"detail": "Already in wishlist."}, status=status.HTTP_200_OK)
        return Response(WishlistSerializer(item, context={"request": request}).data, status=status.HTTP_201_CREATED)

    def delete(self, request):
        user = _get_user_or_401(request)
        Wishlist.objects.filter(user=user, product_id=request.query_params.get("product_id")).delete()
        return Response({"detail": "Removed."})


class AddressListCreateView(generics.ListCreateAPIView):
    serializer_class = AddressSerializer

    def get_queryset(self):
        user = _get_user_or_401(self.request)
        return Address.objects.filter(user=user).select_related("governorate", "city")

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(user=user)
        if serializer.instance.is_default:
            Address.objects.filter(user=user).exclude(pk=serializer.instance.pk).update(is_default=False)


class AddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AddressSerializer

    def get_queryset(self):
        user = _get_user_or_401(self.request)
        return Address.objects.filter(user=user)

    def perform_update(self, serializer):
        serializer.save()
        if serializer.instance.is_default:
            Address.objects.filter(user=self.request.user).exclude(pk=serializer.instance.pk).update(
                is_default=False
            )