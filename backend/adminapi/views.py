from datetime import timedelta
from decimal import Decimal
import secrets

from django.db import IntegrityError
from django.db import models
from django.db.models import F, OuterRef, Q, Subquery, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from ai.models import AIAgent, AIProvider
from catalog.models import Brand, Category, Inventory, Product, ProductImage, ProductVariant, Review
from orders.models import (
    Coupon,
    Order,
    OrderStatus,
    Payment,
    PaymentStatus,
)
from orders.services import (
    OrderError,
    change_order_status,
    consume_reservations,
    release_inventory,
    review_vodafone_payment,
)

from .permissions import IsStaffPermission
from .serializers import (
    AdminAgentSerializer,
    AdminBrandSerializer,
    AdminCategorySerializer,
    AdminCouponSerializer,
    AdminCustomerSerializer,
    AdminOrderDetailSerializer,
    AdminOrderListSerializer,
    AdminProductDetailSerializer,
    AdminProductImageSerializer,
    AdminProductListSerializer,
    AdminProductWriteSerializer,
    AdminProviderSerializer,
    AdminReviewSerializer,
    AdminVariantSerializer,
    AdminVariantWriteSerializer,
)


class AdminPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


def _allowed_statuses(order):
    from orders.models import VALID_TRANSITIONS

    return sorted(VALID_TRANSITIONS.get(order.status, set()), key=lambda s: s.lower())


class DashboardView(APIView):
    permission_classes = [IsStaffPermission]

    def get(self, request):
        now = timezone.now()
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        last_30 = now - timedelta(days=30)
        active_statuses = [
            OrderStatus.PENDING,
            OrderStatus.AWAITING_CONFIRMATION,
            OrderStatus.PAYMENT_VERIFICATION_PENDING,
            OrderStatus.PAYMENT_REJECTED,
            OrderStatus.CONFIRMED,
            OrderStatus.PROCESSING,
            OrderStatus.SHIPPED,
        ]
        revenue_statuses = active_statuses + [OrderStatus.DELIVERED]

        orders_qs = Order.objects.all()
        today_qs = orders_qs.filter(created_at__gte=start_of_day)
        recent_qs = orders_qs.filter(created_at__gte=last_30)

        revenue = (
            orders_qs.filter(status__in=revenue_statuses)
            .aggregate(
                total=Coalesce(
                    Sum("total"),
                    Decimal("0.00"),
                    output_field=models.DecimalField(max_digits=12, decimal_places=2),
                )
            )["total"]
        )
        revenue_today = (
            today_qs.filter(status__in=revenue_statuses)
            .aggregate(
                total=Coalesce(
                    Sum("total"),
                    Decimal("0.00"),
                    output_field=models.DecimalField(max_digits=12, decimal_places=2),
                )
            )["total"]
        )

        low_stock = (
            Inventory.objects.annotate(
                available_qty=F("quantity") - F("reserved_quantity")
            )
            .filter(
                available_qty__lte=F("low_stock_threshold"),
                available_qty__gt=0,
            )
            .select_related("variant__product")
        )

        top_products = (
            Order.objects.filter(
                created_at__gte=last_30,
                items__isnull=False,
            )
            .exclude(status__in=[OrderStatus.CANCELLED, OrderStatus.RETURNED])
            .values("items__product_name")
            .annotate(quantity=Sum("items__quantity"), revenue=Sum("items__total"))
            .order_by("-quantity")[:5]
        )

        stats = {
            "orders_today": today_qs.count(),
            "orders_total": orders_qs.count(),
            "revenue_total": revenue,
            "revenue_today": revenue_today,
            "awaiting_confirmation": orders_qs.filter(
                status=OrderStatus.AWAITING_CONFIRMATION
            ).count(),
            "payment_verification_pending": orders_qs.filter(
                status=OrderStatus.PAYMENT_VERIFICATION_PENDING
            ).count(),
            "processing": orders_qs.filter(
                status__in=[OrderStatus.CONFIRMED, OrderStatus.PROCESSING]
            ).count(),
            "cancelled": orders_qs.filter(status=OrderStatus.CANCELLED).count(),
            "low_stock_count": low_stock.count(),
            "customers_count": User.objects.filter(is_active=True).count(),
        }

        recent_orders = AdminOrderListSerializer(
            recent_qs.select_related("payment", "user").order_by("-created_at")[:6],
            many=True,
        ).data

        low_stock_items = [
            {
                "variant_id": inv.variant_id,
                "sku": inv.variant.sku or "",
                "product_name": inv.variant.product.name_ar,
                "available": inv.available,
                "threshold": inv.low_stock_threshold,
            }
            for inv in low_stock[:10]
        ]

        return Response(
            {
                "stats": stats,
                "recent_orders": recent_orders,
                "low_stock": low_stock_items,
                "top_products": [
                    {
                        "product_name": row["items__product_name"],
                        "quantity": row["quantity"],
                        "revenue": row["revenue"],
                    }
                    for row in top_products
                ],
            }
        )


class AdminOrderListView(generics.ListAPIView):
    permission_classes = [IsStaffPermission]
    pagination_class = AdminPagination
    serializer_class = AdminOrderListSerializer

    def get_queryset(self):
        qs = Order.objects.select_related("payment", "user").order_by("-created_at")
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(
                Q(order_number__icontains=q)
                | Q(full_name__icontains=q)
                | Q(phone__icontains=q)
                | Q(user__email__icontains=q)
            )
        return qs


class AdminOrderDetailView(APIView):
    permission_classes = [IsStaffPermission]

    def get(self, request, order_number):
        order = (
            Order.objects.select_related("payment", "user", "coupon")
            .prefetch_related("items", "status_history", "payment__proofs")
            .filter(order_number=order_number)
            .first()
        )
        if order is None:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(
            {
                "order": AdminOrderDetailSerializer(order, context={"request": request}).data,
                "allowed_statuses": _allowed_statuses(order),
            }
        )


class AdminOrderTransitionView(APIView):
    permission_classes = [IsStaffPermission]

    def post(self, request, order_number):
        order = (
            Order.objects.select_related("payment")
            .filter(order_number=order_number)
            .first()
        )
        if order is None:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
        new_status = request.data.get("new_status")
        reason = request.data.get("reason", "")
        if not new_status:
            return Response(
                {"detail": "new_status is required."}, status=status.HTTP_400_BAD_REQUEST
            )
        try:
            change_order_status(order, new_status, request.user, reason, request)
        except OrderError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {
                "order": AdminOrderDetailSerializer(
                    order, context={"request": request}
                ).data,
                "allowed_statuses": _allowed_statuses(order),
            }
        )


class AdminOrderPaymentReviewView(APIView):
    permission_classes = [IsStaffPermission]

    def post(self, request, order_number):
        order = (
            Order.objects.select_related("payment")
            .filter(order_number=order_number)
            .first()
        )
        if order is None:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
        payment = getattr(order, "payment", None)
        if payment is None:
            return Response({"detail": "No payment record."}, status=status.HTTP_400_BAD_REQUEST)
        decision = request.data.get("decision")
        reason = request.data.get("rejection_reason", "")
        try:
            review_vodafone_payment(payment, decision, request.user, reason, request)
        except OrderError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {
                "order": AdminOrderDetailSerializer(
                    order, context={"request": request}
                ).data,
                "allowed_statuses": _allowed_statuses(order),
            }
        )


class AdminOrderReleaseView(APIView):
    permission_classes = [IsStaffPermission]

    def post(self, request, order_number):
        order = Order.objects.filter(order_number=order_number).first()
        if order is None:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
        release_inventory(order)
        return Response({"detail": "Inventory released."})


class AdminOrderConsumeView(APIView):
    permission_classes = [IsStaffPermission]

    def post(self, request, order_number):
        order = Order.objects.filter(order_number=order_number).first()
        if order is None:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
        consume_reservations(order)
        return Response({"detail": "Reservations consumed."})


class AdminCategoryListView(generics.ListCreateAPIView):
    permission_classes = [IsStaffPermission]
    serializer_class = AdminCategorySerializer

    def get_queryset(self):
        return Category.objects.all().order_by("sort_order", "name_ar")


class AdminCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsStaffPermission]
    serializer_class = AdminCategorySerializer
    queryset = Category.objects.all()


class AdminBrandListView(generics.ListCreateAPIView):
    permission_classes = [IsStaffPermission]
    serializer_class = AdminBrandSerializer

    def get_queryset(self):
        return Brand.objects.all().order_by("name")


class AdminBrandDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsStaffPermission]
    serializer_class = AdminBrandSerializer
    queryset = Brand.objects.all()


class AdminProductListView(generics.ListAPIView):
    permission_classes = [IsStaffPermission]
    pagination_class = AdminPagination
    serializer_class = AdminProductListSerializer

    def get_queryset(self):
        stock_subq = Inventory.objects.filter(variant=OuterRef("pk")).values("quantity")
        qs = (
            Product.objects.annotate(
                total_stock=Coalesce(
                    Subquery(
                        ProductVariant.objects.filter(product=OuterRef("pk"))
                        .annotate(vstock=Coalesce(stock_subq, 0))
                        .values("vstock")
                        .order_by()
                        .annotate(s=Sum("vstock"))
                        .values("s")
                    ),
                    0,
                    output_field=models.IntegerField(),
                ),
                min_price_agg=Coalesce(
                    Subquery(
                        ProductVariant.objects.filter(
                            product=OuterRef("pk"), is_active=True
                        )
                        .order_by("price")
                        .values("price")[:1]
                    ),
                    Decimal("0.00"),
                    output_field=models.DecimalField(max_digits=12, decimal_places=2),
                ),
            )
            .select_related("brand", "category")
            .order_by("-created_at")
        )
        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(
                Q(name_ar__icontains=q)
                | Q(name_en__icontains=q)
                | Q(slug__icontains=q)
            )
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class AdminProductCreateView(generics.CreateAPIView):
    permission_classes = [IsStaffPermission]
    serializer_class = AdminProductWriteSerializer


class AdminProductDetailView(APIView):
    permission_classes = [IsStaffPermission]

    def _get(self, pk):
        return (
            Product.objects.select_related("brand", "category")
            .prefetch_related("variants__inventory", "specifications", "images")
            .filter(pk=pk)
            .first()
        )

    def get(self, request, pk):
        product = self._get(pk)
        if product is None:
            return Response({"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(AdminProductDetailSerializer(product, context={"request": request}).data)

    def patch(self, request, pk):
        product = self._get(pk)
        if product is None:
            return Response({"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = AdminProductWriteSerializer(product, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AdminProductDetailSerializer(product, context={"request": request}).data)


class AdminProductArchiveView(APIView):
    permission_classes = [IsStaffPermission]

    def post(self, request, pk):
        product = Product.objects.filter(pk=pk).first()
        if product is None:
            return Response({"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND)
        product.status = Product.Status.ARCHIVED
        product.save(update_fields=["status"])
        return Response({"detail": "Product archived."})


class AdminProductImageCreateView(generics.CreateAPIView):
    permission_classes = [IsStaffPermission]
    serializer_class = AdminProductImageSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if "sort_order" not in request.data:
            product = serializer.validated_data.get("product")
            last = product.images.order_by("-sort_order").first()
            serializer.validated_data["sort_order"] = (last.sort_order + 1) if last else 0
        image = serializer.save()
        out = AdminProductImageSerializer(image, context={"request": request}).data
        return Response(out, status=status.HTTP_201_CREATED)


class AdminProductImageDetailView(APIView):
    permission_classes = [IsStaffPermission]

    def patch(self, request, pk):
        image = ProductImage.objects.filter(pk=pk).first()
        if image is None:
            return Response({"detail": "Image not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = AdminProductImageSerializer(
            image, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        image = ProductImage.objects.filter(pk=pk).first()
        if image is None:
            return Response({"detail": "Image not found."}, status=status.HTTP_404_NOT_FOUND)
        image.image.delete(save=False)
        image.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminVariantCreateView(generics.CreateAPIView):
    permission_classes = [IsStaffPermission]
    serializer_class = AdminVariantWriteSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        stock = serializer.validated_data.pop("stock", None)
        if not serializer.validated_data.get("sku"):
            product = serializer.validated_data.get("product")
            base = getattr(product, "slug", None) or "var"
            serializer.validated_data["sku"] = f"{base}-{secrets.token_hex(3).upper()}"
        try:
            variant = serializer.save()
        except IntegrityError:
            return Response(
                {"detail": "SKU already exists."}, status=status.HTTP_400_BAD_REQUEST
            )
        if stock is not None:
            Inventory.objects.update_or_create(
                variant=variant, defaults={"quantity": max(0, stock)}
            )
        out = AdminVariantSerializer(variant, context={"request": request}).data
        return Response(out, status=status.HTTP_201_CREATED)


class AdminVariantDetailView(APIView):
    permission_classes = [IsStaffPermission]

    def patch(self, request, pk):
        variant = (
            ProductVariant.objects.select_related("inventory").filter(pk=pk).first()
        )
        if variant is None:
            return Response({"detail": "Variant not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = AdminVariantWriteSerializer(variant, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        stock = serializer.validated_data.pop("stock", None)
        if not serializer.validated_data.get("sku"):
            serializer.validated_data["sku"] = f"{variant.product.slug}-{secrets.token_hex(3).upper()}"
        try:
            serializer.save()
        except IntegrityError:
            return Response(
                {"detail": "SKU already exists."}, status=status.HTTP_400_BAD_REQUEST
            )
        if stock is not None:
            inv, _ = Inventory.objects.get_or_create(variant=variant)
            inv.quantity = max(0, stock)
            inv.save(update_fields=["quantity"])
        return Response(AdminVariantSerializer(variant, context={"request": request}).data)

    def delete(self, request, pk):
        variant = ProductVariant.objects.filter(pk=pk).first()
        if variant is None:
            return Response({"detail": "Variant not found."}, status=status.HTTP_404_NOT_FOUND)
        variant.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminCouponListView(generics.ListCreateAPIView):
    permission_classes = [IsStaffPermission]
    pagination_class = AdminPagination
    serializer_class = AdminCouponSerializer

    def get_queryset(self):
        qs = Coupon.objects.all().order_by("-id")
        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(code__icontains=q)
        return qs


class AdminCouponDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsStaffPermission]
    serializer_class = AdminCouponSerializer
    queryset = Coupon.objects.all()


class AdminReviewListView(generics.ListAPIView):
    permission_classes = [IsStaffPermission]
    pagination_class = AdminPagination
    serializer_class = AdminReviewSerializer

    def get_queryset(self):
        qs = Review.objects.select_related("product", "user").order_by("-created_at")
        status_filter = self.request.query_params.get("status")
        if status_filter == "pending":
            qs = qs.filter(is_approved=False)
        elif status_filter == "approved":
            qs = qs.filter(is_approved=True)
        return qs


class AdminReviewModerateView(APIView):
    permission_classes = [IsStaffPermission]

    def post(self, request, pk):
        review = Review.objects.filter(pk=pk).first()
        if review is None:
            return Response({"detail": "Review not found."}, status=status.HTTP_404_NOT_FOUND)
        approve = request.data.get("approve")
        if approve is None:
            return Response(
                {"detail": "approve is required."}, status=status.HTTP_400_BAD_REQUEST
            )
        review.is_approved = bool(approve)
        review.save(update_fields=["is_approved"])
        return Response(AdminReviewSerializer(review).data)


class AdminCustomerListView(generics.ListAPIView):
    permission_classes = [IsStaffPermission]
    pagination_class = AdminPagination
    serializer_class = AdminCustomerSerializer

    def get_queryset(self):
        from accounts.models import User

        qs = User.objects.all().order_by("-date_joined")
        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(
                Q(email__icontains=q)
                | Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
            )
        return qs


class AdminAgentListView(generics.ListAPIView):
    permission_classes = [IsStaffPermission]
    serializer_class = AdminAgentSerializer

    def get_queryset(self):
        return AIAgent.objects.select_related("provider").order_by("name")


class AdminAgentDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsStaffPermission]
    serializer_class = AdminAgentSerializer
    queryset = AIAgent.objects.select_related("provider")


class AdminProviderListView(generics.ListCreateAPIView):
    permission_classes = [IsStaffPermission]
    serializer_class = AdminProviderSerializer
    queryset = AIProvider.objects.order_by("name")


class AdminProviderDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsStaffPermission]
    serializer_class = AdminProviderSerializer
    queryset = AIProvider.objects.all()


class AdminOrderStatusListView(APIView):
    permission_classes = [IsStaffPermission]

    def get(self, request):
        return Response(
            {
                "statuses": [c for c, _ in OrderStatus.choices],
                "payment_statuses": [c for c, _ in PaymentStatus.choices],
            }
        )