from decimal import Decimal

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from audit.services import audit_log
from catalog.models import ProductVariant
from shipping.models import Governorate, ShippingRate, StoreShippingSettings

from .models import (
    Cart,
    CartItem,
    Coupon,
    InventoryReservation,
    Order,
    OrderItem,
    OrderStatus,
    OrderStatusHistory,
    Payment,
    PaymentMethod,
    PaymentStatus,
    Shipment,
    VALID_TRANSITIONS,
)


class OrderError(Exception):
    pass


def get_or_create_cart(user=None, session_key=None):
    if user is not None and user.is_authenticated:
        cart, _ = Cart.objects.get_or_create(user=user)
        return cart
    if session_key:
        cart, _ = Cart.objects.get_or_create(session_key=session_key, user__isnull=True)
        return cart
    raise OrderError("A session key is required for guest carts.")


def add_to_cart(cart, variant, quantity=1):
    inventory = variant.inventory
    if inventory is not None and inventory.available < quantity:
        raise OrderError(f"الكمية المطلوبة غير متوفرة ({inventory.available} متاح).")
    item, created = CartItem.objects.get_or_create(
        cart=cart, variant=variant, defaults={"quantity": quantity}
    )
    if not created:
        new_qty = item.quantity + quantity
        if inventory is not None and inventory.available < new_qty:
            raise OrderError(f"الكمية المطلوبة غير متوفرة ({inventory.available} متاح).")
        item.quantity = new_qty
        item.save()
    return item


def cart_subtotal(cart):
    return sum(
        (item.variant.price * item.quantity for item in cart.items.all()),
        Decimal("0.00"),
    )


def get_shipping_rate(governorate_id):
    if not governorate_id:
        raise OrderError("المحافظة مطلوبة.")
    try:
        rate = ShippingRate.objects.select_related("governorate").get(
            governorate_id=governorate_id, is_active=True
        )
    except ShippingRate.DoesNotExist:
        raise OrderError("لا يوجد سعر شحن لهذه المحافظة.")
    return rate


def calculate_shipping_fee(rate, subtotal):
    settings = StoreShippingSettings.get()
    threshold = settings.free_shipping_threshold or rate.free_shipping_threshold
    if threshold is not None and subtotal >= threshold:
        return Decimal("0.00")
    return rate.price


def calculate_totals(cart, governorate_id, coupon=None):
    subtotal = cart_subtotal(cart)
    rate = get_shipping_rate(governorate_id)
    discount = coupon.apply(subtotal) if coupon else Decimal("0.00")
    after_discount = max(Decimal("0.00"), subtotal - discount)
    shipping_fee = calculate_shipping_fee(rate, after_discount)
    total = after_discount + shipping_fee
    return {
        "subtotal": subtotal,
        "discount": discount,
        "shipping_fee": shipping_fee,
        "total": total,
        "governorate": rate.governorate,
        "estimated_delivery_days": rate.estimated_delivery_days,
        "rate": rate,
    }


def _resolve_coupon(code, subtotal):
    if not code:
        return None
    try:
        coupon = Coupon.objects.get(code=code.strip().upper())
    except Coupon.DoesNotExist:
        raise OrderError("كوبون غير صحيح.")
    if not coupon.is_valid(subtotal):
        raise OrderError("الكوبون غير صالح أو منتهي.")
    return coupon


@transaction.atomic
def create_order(
    *,
    user,
    cart,
    payment_method,
    address,
    coupon_code=None,
    notes="",
    request=None,
):
    settings = StoreShippingSettings.get()
    subtotal = cart_subtotal(cart)
    if subtotal <= 0:
        raise OrderError("السلة فارغة.")

    governorate = Governorate.objects.get(pk=address["governorate_id"])
    coupon = _resolve_coupon(coupon_code, subtotal)
    totals = calculate_totals(cart, governorate.pk, coupon)

    items = list(cart.items.select_related("variant__product", "variant__inventory"))
    _validate_stock(items)

    if payment_method == PaymentMethod.COD:
        status = OrderStatus.AWAITING_CONFIRMATION
    elif payment_method == PaymentMethod.VODAFONE_CASH:
        status = OrderStatus.PAYMENT_VERIFICATION_PENDING
    else:
        raise OrderError("طريقة الدفع غير مدعومة.")

    order = Order.objects.create(
        user=user if getattr(user, "is_authenticated", False) else None,
        status=status,
        payment_method=payment_method,
        subtotal=totals["subtotal"],
        discount=totals["discount"],
        shipping_fee=totals["shipping_fee"],
        total=totals["total"],
        coupon=coupon,
        full_name=address["full_name"],
        phone=address["phone"],
        whatsapp=address.get("whatsapp", ""),
        governorate_name=governorate.name_ar,
        city_name=address.get("city_name", ""),
        area=address.get("area", ""),
        address_detail=address["detail"],
        landmark=address.get("landmark", ""),
        notes=notes,
        estimated_delivery_days=totals["estimated_delivery_days"],
        inventory_policy=settings.inventory_reservation_policy,
    )

    for item in items:
        variant = item.variant
        unit_price = variant.price
        item_discount = _line_discount(
            variant.price, item.quantity, totals["discount"], totals["subtotal"]
        )
        OrderItem.objects.create(
            order=order,
            product_name=variant.product.name_ar,
            sku=variant.sku or variant.product.slug,
            variant=variant.product.name_ar,
            color=variant.color,
            unit_price=unit_price,
            discount=item_discount,
            quantity=item.quantity,
            total=(unit_price - item_discount) * item.quantity,
        )

    _handle_inventory(order, items, settings)
    _record_status(order, None, status, request=request)

    payment = Payment.objects.create(
        order=order, method=payment_method, amount=order.total
    )

    Shipment.objects.create(
        order=order,
        governorate_name=governorate.name_ar,
        city_name=address.get("city_name", ""),
        address_detail=address["detail"],
        shipping_fee=totals["shipping_fee"],
        estimated_delivery_days=totals["estimated_delivery_days"],
    )

    if coupon:
        Coupon.objects.filter(pk=coupon.pk).update(used_count=F("used_count") + 1)

    audit_log(request, user, "order.created", "order", order.order_number, {"total": str(order.total)})
    cart.items.all().delete()
    return order


def _line_discount(variant_price, variant_qty, total_discount, subtotal):
    if subtotal <= 0 or total_discount <= 0:
        return Decimal("0.00")
    line = variant_price * variant_qty
    return (line / subtotal * total_discount).quantize(Decimal("0.01"))


def _validate_stock(items):
    for item in items:
        inv = item.variant.inventory
        if inv is not None and inv.available < item.quantity:
            raise OrderError(f"الكمية غير متوفرة للمنتج {item.variant.product.name_ar}.")


def _handle_inventory(order, items, settings):
    policy = settings.inventory_reservation_policy
    reservation_hours = settings.reservation_hours
    if policy == "none":
        return
    for item in items:
        inv = item.variant.inventory
        if inv is None:
            continue
        if policy == "deduct":
            ProductVariant.objects.select_for_update().get(pk=item.variant.pk)
            inv.quantity = inv.quantity - item.quantity
            inv.save(update_fields=["quantity"])
        else:  # hold
            inv.reserved_quantity = inv.reserved_quantity + item.quantity
            inv.save(update_fields=["reserved_quantity"])
            InventoryReservation.objects.create(
                order=order,
                variant=item.variant,
                quantity=item.quantity,
                reserved_until=timezone.now()
                + timezone.timedelta(hours=reservation_hours),
            )


def _record_status(order, prev_status, new_status, user=None, reason="", request=None):
    OrderStatusHistory.objects.create(
        order=order,
        prev_status=prev_status or "",
        new_status=new_status,
        changed_by=user if getattr(user, "is_authenticated", False) else None,
        reason=reason,
    )
    audit_log(
        request, user, "order.status", "order", order.order_number,
        {"from": prev_status or "", "to": new_status, "reason": reason},
    )


def change_order_status(order, new_status, user=None, reason="", request=None):
    prev = order.status
    if new_status == prev:
        raise OrderError("الحالة هي نفسها بالفعل.")
    if new_status not in VALID_TRANSITIONS.get(prev, set()):
        raise OrderError("انتقال غير مسموح بين الحالات.")
    if new_status == OrderStatus.CANCELLED:
        release_inventory(order)
    if new_status in (OrderStatus.CONFIRMED, OrderStatus.PROCESSING):
        consume_reservations(order)
    order.status = new_status
    order.save(update_fields=["status", "updated_at"])
    _record_status(order, prev, new_status, user, reason, request)
    return order


def release_inventory(order):
    for res in order.reservations.filter(status=InventoryReservation.Status.ACTIVE):
        inv = res.variant.inventory
        if inv:
            inv.reserved_quantity = max(0, inv.reserved_quantity - res.quantity)
            inv.save(update_fields=["reserved_quantity"])
        res.status = InventoryReservation.Status.RELEASED
        res.save(update_fields=["status"])


def consume_reservations(order):
    for res in order.reservations.filter(status=InventoryReservation.Status.ACTIVE):
        inv = res.variant.inventory
        if inv:
            inv.reserved_quantity = max(0, inv.reserved_quantity - res.quantity)
            inv.quantity = max(0, inv.quantity - res.quantity)
            inv.save(update_fields=["reserved_quantity", "quantity"])
        res.status = InventoryReservation.Status.CONSUMED
        res.save(update_fields=["status"])


def review_vodafone_payment(payment, decision, reviewer, reason="", request=None):
    if payment.method != PaymentMethod.VODAFONE_CASH:
        raise OrderError("هذه ليست عملية فودافون كاش.")
    if payment.status == PaymentStatus.PAID:
        raise OrderError("الدفع معتمد مسبقًا.")
    if decision == "accept":
        payment.status = PaymentStatus.PAID
        payment.verified_by = reviewer if getattr(reviewer, "is_authenticated", False) else None
        payment.verified_at = timezone.now()
        payment.rejection_reason = ""
        payment.save(update_fields=["status", "verified_by", "verified_at", "rejection_reason"])
        change_order_status(
            payment.order, OrderStatus.CONFIRMED, reviewer, "دفع فودافون كاش مقبول", request
        )
    elif decision == "reject":
        payment.status = PaymentStatus.REJECTED
        payment.rejection_reason = reason or "لم يتم التأكد من التحويل."
        payment.verified_by = reviewer if getattr(reviewer, "is_authenticated", False) else None
        payment.verified_at = timezone.now()
        payment.save(update_fields=["status", "rejection_reason", "verified_by", "verified_at"])
        change_order_status(
            payment.order, OrderStatus.PAYMENT_REJECTED, reviewer,
            payment.rejection_reason, request,
        )
    else:
        raise OrderError("قرار غير صحيح.")
    audit_log(request, reviewer, "payment.review", "payment", payment.pk, {"decision": decision})
    return payment