from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Order
from .models import WhatsAppMessage
from .services import WhatsAppService


class ContactLinkView(APIView):
    """Build a wa.me inquiry link with a pre-filled product message."""

    permission_classes = [AllowAny]

    def get(self, request):
        service = WhatsAppService()
        link = service.product_inquiry_link(
            product_name=request.query_params.get("product", "منتج YK9"),
            color=request.query_params.get("color", ""),
            price=request.query_params.get("price", ""),
            link=request.build_absolute_uri(request.query_params.get("link", "")),
        )
        return Response({"wa_link": link, "number": service.number})


class OrderConfirmationLinkView(APIView):
    """Build a confirmation link for an existing order (customer verified by phone)."""

    permission_classes = [AllowAny]

    def post(self, request):
        order_number = request.data.get("order_number", "").strip().upper()
        phone = request.data.get("phone", "").strip()
        order = Order.objects.filter(order_number=order_number).first()
        if not order or order.phone != phone:
            return Response({"detail": "بيانات غير صحيحة."}, status=status.HTTP_404_NOT_FOUND)
        service = WhatsAppService()
        items = "، ".join(
            f"{i.product_name} x{i.quantity}" for i in order.items.all()
        )
        msg = service.build_message(
            "order_confirmation",
            order_number=order.order_number,
            items=items,
            total=str(order.total),
            governorate=order.governorate_name,
            payment_method="الدفع عند الاستلام"
            if order.payment_method == "COD"
            else "فودافون كاش",
        )
        link = service.wa_link(msg)
        WhatsAppMessage.objects.create(
            template_key="order_confirmation",
            text=msg,
            wa_link=link,
            related_order=order.order_number,
        )
        return Response({"wa_link": link})