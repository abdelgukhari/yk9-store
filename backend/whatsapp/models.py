from django.db import models


DEFAULT_TEMPLATES = {
    "inquiry": "مرحبًا YK9، أريد الاستفسار عن منتج {product}، اللون {color}، والسعر {price} جنيه. رابط المنتج: {link}",
    "order_confirmation": "مرحبًا YK9، قمت بطلب رقم {order_number}.\nالمنتجات: {items}\nالإجمالي: {total} جنيه\nالمحافظة: {governorate}\nطريقة الدفع: {payment_method}",
    "cod_confirmation": "مرحبًا YK9، أريد تأكيد طلبي رقم {order_number} (الدفع عند الاستلام).",
    "vodafone_cash": "مرحبًا YK9، حولت مبلغ {total} جنيه عبر فودافون كاش للطلب رقم {order_number}.",
    "support": "مرحبًا YK9، أحتاج مساعدة.",
}


class WhatsAppSettings(models.Model):
    number = models.CharField(
        max_length=15, help_text="رقم واتساب بصيغة محلية مثل 01037839725"
    )
    welcome_message = models.TextField(default="أهلًا بك في YK9 👋")
    templates = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "WhatsApp settings"
        verbose_name_plural = "WhatsApp settings"

    def save(self, *args, **kwargs):
        merged = dict(DEFAULT_TEMPLATES)
        merged.update(self.templates or {})
        self.templates = merged
        if not self.pk and WhatsAppSettings.objects.exists():
            raise ValueError("Only a single WhatsAppSettings row is allowed.")
        super().save(*args, **kwargs)

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1, defaults={"number": "01037839725"})
        return obj


class WhatsAppMessage(models.Model):
    template_key = models.CharField(max_length=64)
    text = models.TextField()
    wa_link = models.CharField(max_length=2000, blank=True)
    related_order = models.CharField(max_length=32, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)