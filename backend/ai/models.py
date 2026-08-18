from django.conf import settings
from django.db import models

from common.validators import validate_uploaded_document


class AIProvider(models.Model):
    class Kind(models.TextChoices):
        OPENAI = "openai", "OpenAI-compatible"
        OLLAMA = "ollama", "Ollama"
        MOCK = "mock", "Mock"

    name = models.CharField(max_length=128)
    kind = models.CharField(max_length=16, choices=Kind.choices, default=Kind.OPENAI)
    base_url = models.CharField(max_length=512, blank=True)
    model = models.CharField(max_length=128, blank=True)
    is_active = models.BooleanField(default=True)
    is_online = models.BooleanField(default=False)
    last_checked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return f"{self.name} ({self.kind})"


class AIModel(models.Model):
    provider = models.ForeignKey(
        AIProvider, on_delete=models.CASCADE, related_name="models"
    )
    model_id = models.CharField(max_length=128)
    label = models.CharField(max_length=128, blank=True)

    class Meta:
        unique_together = ("provider", "model_id")

    def __str__(self):
        return self.label or self.model_id


class AIAgentTool(models.Model):
    name = models.CharField(max_length=64, unique=True)
    description = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class AIAgent(models.Model):
    name = models.CharField(max_length=128)
    description = models.CharField(max_length=255, blank=True)
    role = models.CharField(max_length=64, blank=True, help_text="Business role of the agent")
    system_instructions = models.TextField(blank=True)
    provider = models.ForeignKey(
        AIProvider, null=True, blank=True, on_delete=models.SET_NULL, related_name="agents"
    )
    model = models.ForeignKey(
        AIModel, null=True, blank=True, on_delete=models.SET_NULL, related_name="agents"
    )
    temperature = models.FloatField(default=0.4)
    max_tokens = models.PositiveIntegerField(default=600)
    tools = models.ManyToManyField(AIAgentTool, blank=True, related_name="agents")
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class AIAgentVersion(models.Model):
    agent = models.ForeignKey(AIAgent, on_delete=models.CASCADE, related_name="versions")
    system_instructions = models.TextField(blank=True)
    temperature = models.FloatField(default=0.4)
    max_tokens = models.PositiveIntegerField(default=600)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)


class KnowledgeDocument(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        INDEXED = "indexed", "Indexed"
        ERROR = "error", "Error"

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    content = models.TextField(blank=True, help_text="نص المستند (للمستندات اليدوية)")
    file = models.FileField(
        upload_to="knowledge_docs/", null=True, blank=True, validators=[validate_uploaded_document]
    )
    file_type = models.CharField(max_length=16, blank=True)
    category = models.CharField(max_length=128, blank=True)
    tags = models.JSONField(default=list, blank=True)
    agents = models.ManyToManyField(AIAgent, through="AgentDocument", blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    index_error = models.CharField(max_length=500, blank=True)
    indexed_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_demo = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)

    def __str__(self):
        return self.title


class KnowledgeChunk(models.Model):
    document = models.ForeignKey(
        KnowledgeDocument, on_delete=models.CASCADE, related_name="chunks"
    )
    seq = models.PositiveIntegerField(default=0)
    content = models.TextField()

    class Meta:
        ordering = ("seq",)

    def __str__(self):
        return f"{self.document.title} #{self.seq}"


class AgentDocument(models.Model):
    agent = models.ForeignKey(AIAgent, on_delete=models.CASCADE)
    document = models.ForeignKey(KnowledgeDocument, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("agent", "document")


class ChatSession(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    agent = models.ForeignKey(AIAgent, null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(
        max_length=20,
        choices=[
            ("open", "Open"),
            ("closed", "Closed"),
            ("handoff", "Handed off to human"),
            ("archived", "Archived"),
        ],
        default="open",
    )
    recommended_product_ids = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)


class ChatMessage(models.Model):
    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"

    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=16, choices=Role.choices)
    content = models.TextField()
    sources = models.JSONField(default=list, blank=True)
    rating = models.PositiveSmallIntegerField(null=True, blank=True)
    flagged = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at",)


class AIUsageLog(models.Model):
    agent = models.ForeignKey(AIAgent, null=True, blank=True, on_delete=models.SET_NULL)
    provider = models.ForeignKey(AIProvider, null=True, blank=True, on_delete=models.SET_NULL)
    model = models.CharField(max_length=128, blank=True)
    prompt_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)
    latency_ms = models.PositiveIntegerField(default=0)
    cost_est = models.DecimalField(max_digits=10, decimal_places=6, default=0)
    error = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)


class AgentEvaluation(models.Model):
    message = models.OneToOneField(ChatMessage, on_delete=models.CASCADE)
    rating = models.PositiveSmallIntegerField(choices=[(i, str(i)) for i in range(1, 6)])
    notes = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)