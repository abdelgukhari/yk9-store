from django.urls import path

from . import views

app_name = "ai"

urlpatterns = [
    path("chat/", views.ChatView.as_view(), name="chat"),
    path("chat/<int:session_id>/", views.ChatHistoryView.as_view(), name="chat-history"),
    path("agents/", views.AgentsView.as_view(), name="agents"),
    path("knowledge/", views.KnowledgeDocumentsView.as_view(), name="knowledge"),
]