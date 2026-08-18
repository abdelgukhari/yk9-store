from django.contrib import admin

from .models import (
    AIAgent,
    AIAgentVersion,
    AIProvider,
    AIUsageLog,
    ChatMessage,
    ChatSession,
    KnowledgeChunk,
    KnowledgeDocument,
)


@admin.register(AIProvider)
class AIProviderAdmin(admin.ModelAdmin):
    list_display = ("name", "kind", "model", "is_active", "is_online")
    list_filter = ("kind", "is_active", "is_online")


@admin.register(AIAgent)
class AIAgentAdmin(admin.ModelAdmin):
    list_display = ("name", "role", "provider", "is_active", "is_default", "updated_at")
    list_filter = ("is_active", "is_default")
    search_fields = ("name", "role")


@admin.register(KnowledgeDocument)
class KnowledgeDocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "status", "is_active", "updated_at")
    list_filter = ("status", "category", "is_active")
    search_fields = ("title", "content")


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "agent", "status", "updated_at")
    list_filter = ("status",)


admin.site.register(AIAgentVersion)
admin.site.register(KnowledgeChunk)
admin.site.register(ChatMessage)
admin.site.register(AIUsageLog)