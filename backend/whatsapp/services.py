from urllib.parse import quote

from .models import WhatsAppSettings


class WhatsAppService:
    """MVP uses wa.me links. Swap the provider later for WhatsApp Cloud API."""

    def __init__(self, settings=None):
        self.settings = settings or WhatsAppSettings.get()

    @property
    def number(self):
        return self.settings.number

    @property
    def international_number(self):
        num = self.settings.number.strip()
        if num.startswith("0"):
            num = "2" + num[1:]
        return num

    def wa_link(self, message=""):
        base = f"https://wa.me/{self.international_number}"
        return f"{base}?text={quote(message)}" if message else base

    def build_message(self, template_key, **kwargs):
        template = self.settings.templates.get(template_key)
        if not template:
            template = ""
        try:
            return template.format(**kwargs)
        except (KeyError, IndexError):
            return template

    def product_inquiry_link(self, product_name, color="", price="", link=""):
        msg = self.build_message(
            "inquiry", product=product_name, color=color or "-", price=price, link=link
        )
        return self.wa_link(msg)

    def order_link(self, template_key, **kwargs):
        return self.wa_link(self.build_message(template_key, **kwargs))