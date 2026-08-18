import secrets
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from catalog.models import Product, ProductVariant
from common.validators import validate_egyptian_mobile, validate_uploaded_image
from shipping.models import City, Governorate


class Cart(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="cart",
    )
    session_key = models.CharField(max_length=64, null=True, blank=True, db_index=True)
    coupon = models.ForeignKey(
        "Coupon", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart({self.pk})"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])

    class Meta:
        unique_together = ("cart", "variant")

    def __str__(self):
        return f"{self.variant.sku} x{self.quantity}"


class Wishlist(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wishlist"
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "product")


class Address(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="addresses"
    )
    full_name = models.CharField(max_length=128)
    phone = models.CharField(max_length=15, validators=[validate_egyptian_mobile])
    whatsapp = models.CharField(max_length=15, blank=True, validators=[validate_egyptian_mobile])
    governorate = models.ForeignKey(Governorate, on_delete=models.PROTECT)
    city = models.ForeignKey(City, null=True, blank=True, on_delete=models.SET_NULL)
    area = models.CharField(max_length=128, blank=True)
    detail = models.CharField(max_length=255)
    landmark = models.CharField(max_length=128, blank=True)
    notes = models.TextField(blank=True)
    is_default = models.BooleanField(default=False)

    class Meta:
        ordering = ("-is_default", "-id")

    def __str__(self):
        return f"{self.full_name} - {self.governorate.name_ar}"


class OrderStatus(models.TextChoices):
    PENDING = "Pending", "Pending"
    AWAITING_CONFIRMATION = "AwaitingConfirmation", "Awaiting Confirmation"
    PAYMENT_VERIFICATION_PENDING = "PaymentVerificationPending", "Payment Verification Pending"
    PAYMENT_REJECTED = "PaymentRejected", "Payment Rejected"
    CONFIRMED = "Confirmed", "Confirmed"
    PROCESSING = "Processing", "Processing"
    SHIPPED = "Shipped", "Shipped"
    DELIVERED = "Delivered", "Delivered"
    CANCELLED = "Cancelled", "Cancelled"
    RETURNED = "Returned", "Returned"
    REFUNDED = "Refunded", "Refunded"


VALID_TRANSITIONS = {
    OrderStatus.PENDING: {OrderStatus.AWAITING_CONFIRMATION, OrderStatus.CANCELLED},
    OrderStatus.AWAITING_CONFIRMATION: {
        OrderStatus.CONFIRMED,
        OrderStatus.PAYMENT_VERIFICATION_PENDING,
        OrderStatus.CANCELLED,
    },
    OrderStatus.PAYMENT_VERIFICATION_PENDING: {
        OrderStatus.CONFIRMED,
        OrderStatus.PAYMENT_REJECTED,
        OrderStatus.CANCELLED,
    },
    OrderStatus.PAYMENT_REJECTED: {
        OrderStatus.PAYMENT_VERIFICATION_PENDING,
        OrderStatus.CANCELLED,
    },
    OrderStatus.CONFIRMED: {OrderStatus.PROCESSING, OrderStatus.CANCELLED},
    OrderStatus.PROCESSING: {OrderStatus.SHIPPED, OrderStatus.CANCELLED},
    OrderStatus.SHIPPED: {OrderStatus.DELIVERED, OrderStatus.RETURNED},
    OrderStatus.DELIVERED: {OrderStatus.RETURNED},
    OrderStatus.RETURNED: {OrderStatus.REFUNDED},
    OrderStatus.CANCELLED: set(),
    OrderStatus.REFUNDED: set(),
}


class PaymentMethod(models.TextChoices):
    COD = "COD", "Cash on Delivery"
    VODAFONE_CASH = "VODAFONE_CASH", "Vodafone Cash"


class Order(models.Model):
    order_number = models.CharField(max_length=32, unique=True, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="orders",
    )
    status = models.CharField(
        max_length=40, choices=OrderStatus.choices, default=OrderStatus.PENDING, db_index=True
    )
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices)

    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    shipping_fee = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total = models.DecimalField(max_digits=12, decimal_places=2)
    coupon = models.ForeignKey(
        "Coupon", null=True, blank=True, on_delete=models.SET_NULL, related_name="orders"
    )

    full_name = models.CharField(max_length=128)
    phone = models.CharField(max_length=15, validators=[validate_egyptian_mobile])
    whatsapp = models.CharField(max_length=15, blank=True, validators=[validate_egyptian_mobile])
    governorate_name = models.CharField(max_length=128)
    city_name = models.CharField(max_length=128, blank=True)
    area = models.CharField(max_length=128, blank=True)
    address_detail = models.CharField(max_length=255)
    landmark = models.CharField(max_length=128, blank=True)
    notes = models.TextField(blank=True)

    estimated_delivery_days = models.PositiveIntegerField(default=3)
    inventory_policy = models.CharField(max_length=20, default="hold")
    is_demo = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return self.order_number

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = self._generate_number()
        super().save(*args, **kwargs)

    @staticmethod
    def _generate_number():
        ts = timezone.now().strftime("%Y%m%d")
        return f"YK9-{ts}-{secrets.token_hex(3).upper()}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")

    product_name = models.CharField(max_length=255)
    sku = models.CharField(max_length=64)
    variant = models.CharField(max_length=64, blank=True)
    color = models.CharField(max_length=64, blank=True)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    quantity = models.PositiveIntegerField(default=1)
    total = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        ordering = ("id",)


class InventoryReservation(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        RELEASED = "released", "Released"
        CONSUMED = "consumed", "Consumed"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="reservations")
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    reserved_until = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)


class OrderStatusHistory(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="status_history"
    )
    prev_status = models.CharField(max_length=40, blank=True)
    new_status = models.CharField(max_length=40)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at",)


class PaymentStatus(models.TextChoices):
    PENDING = "Pending", "Pending"
    PAID = "Paid", "Paid"
    REJECTED = "Rejected", "Rejected"


class Payment(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="payment")
    method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    status = models.CharField(
        max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="verified_payments",
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment {self.pk} - {self.method} - {self.status}"


class VodafoneCashProof(models.Model):
    payment = models.ForeignKey(
        Payment, on_delete=models.CASCADE, related_name="proofs"
    )
    sender_number = models.CharField(max_length=15, validators=[validate_egyptian_mobile])
    reference = models.CharField(max_length=128, blank=True)
    proof_image = models.FileField(
        upload_to="vodafone_proofs/", validators=[validate_uploaded_image]
    )
    note = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-submitted_at",)


class Shipment(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="shipment")
    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("shipped", "Shipped"),
            ("delivered", "Delivered"),
            ("returned", "Returned"),
        ],
        default="pending",
    )
    governorate_name = models.CharField(max_length=128)
    city_name = models.CharField(max_length=128, blank=True)
    address_detail = models.CharField(max_length=255)
    shipping_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    estimated_delivery_days = models.PositiveIntegerField(default=3)
    tracking_code = models.CharField(max_length=128, blank=True)


class Coupon(models.Model):
    class Type(models.TextChoices):
        FIXED = "fixed", "Fixed amount"
        PERCENT = "percent", "Percent"

    code = models.CharField(max_length=32, unique=True)
    type = models.CharField(max_length=10, choices=Type.choices)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    min_subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    max_discount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    usage_limit = models.PositiveIntegerField(default=0, help_text="0 = unlimited")
    used_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.code

    def is_valid(self, subtotal):
        now = timezone.now()
        if not self.is_active:
            return False
        if self.valid_from and now < self.valid_from:
            return False
        if self.valid_until and now > self.valid_until:
            return False
        if self.usage_limit and self.used_count >= self.usage_limit:
            return False
        if subtotal < self.min_subtotal:
            return False
        return True

    def apply(self, subtotal):
        if not self.is_valid(subtotal):
            return Decimal("0.00")
        if self.type == self.Type.FIXED:
            discount = min(self.value, subtotal)
        else:
            discount = (subtotal * self.value / Decimal("100")).quantize(Decimal("0.01"))
            if self.max_discount is not None:
                discount = min(discount, self.max_discount)
        return discount