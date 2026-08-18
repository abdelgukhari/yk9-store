from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "actor_email", "target_type", "target_id", "created_at")
    list_filter = ("action", "created_at")
    search_fields = ("actor_email", "action", "target_id")
    readonly_fields = ("actor", "actor_email", "action", "target_type", "target_id", "detail", "ip", "created_at")