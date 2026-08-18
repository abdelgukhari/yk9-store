from django.contrib import admin

from .models import WhatsAppMessage, WhatsAppSettings


@admin.register(WhatsAppSettings)
class WhatsAppSettingsAdmin(admin.ModelAdmin):
    list_display = ("number", "welcome_message")


@admin.register(WhatsAppMessage)
class WhatsAppMessageAdmin(admin.ModelAdmin):
    list_display = ("template_key", "related_order", "created_at")
    search_fields = ("related_order", "wa_link")