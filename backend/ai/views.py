from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .chat import chat, get_agent, get_or_create_session
from .models import ChatMessage, ChatSession, KnowledgeDocument, AIAgent
from .serializers import (
    AIAgentSerializer,
    ChatMessageSerializer,
    ChatRequestSerializer,
    ChatSessionSerializer,
    KnowledgeDocumentSerializer,
)


class PublicAPIViewMixin:
    permission_classes = [AllowAny]


class ChatView(PublicAPIViewMixin, APIView):
    """Send a message. Creates/fetches a session, runs the agent, returns reply."""

    def post(self, request):
        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        agent = get_agent(data.get("agent_id"))
        if not agent:
            return Response(
                {"detail": "No active AI agent configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        session = None
        if data.get("session_id"):
            session = ChatSession.objects.filter(pk=data["session_id"], status="open").first()
        if not session:
            session = get_or_create_session(request.user, agent)

        user_msg, assistant_msg = chat(agent, session, data["message"], request.user, request)

        history = ChatMessage.objects.filter(session=session).order_by("created_at")
        return Response(
            {
                "session_id": session.id,
                "message": ChatMessageSerializer(assistant_msg).data,
                "history": ChatMessageSerializer(history, many=True).data,
                "suggested": session.recommended_product_ids,
            }
        )


class ChatHistoryView(PublicAPIViewMixin, generics.GenericAPIView):
    def get(self, request, session_id):
        session = ChatSession.objects.filter(pk=session_id).first()
        if not session or (session.user and session.user_id != request.user.id):
            return Response({"detail": "Session not found."}, status=status.HTTP_404_NOT_FOUND)
        messages = ChatMessage.objects.filter(session=session).order_by("created_at")
        return Response(
            {
                "session": ChatSessionSerializer(session).data,
                "messages": ChatMessageSerializer(messages, many=True).data,
            }
        )


class AgentsView(PublicAPIViewMixin, generics.ListAPIView):
    serializer_class = AIAgentSerializer
    queryset = AIAgent.objects.filter(is_active=True)


class KnowledgeDocumentsView(PublicAPIViewMixin, generics.ListAPIView):
    serializer_class = KnowledgeDocumentSerializer
    queryset = KnowledgeDocument.objects.filter(is_active=True)[:50]