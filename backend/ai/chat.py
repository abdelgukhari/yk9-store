import os
import time

from django.utils import timezone

from catalog.models import Product

from .models import (
    AIAgent,
    AIProvider,
    AIUsageLog,
    ChatMessage,
    ChatSession,
    KnowledgeChunk,
    KnowledgeDocument,
)
from .providers import (
    MockProvider,
    OpenAICompatProvider,
    ProviderError,
    ProviderResult,
    estimate_cost,
    get_provider,
)
from .rag import _tokenize, build_context, search_documents


def get_agent(agent_id=None):
    if agent_id:
        agent = AIAgent.objects.filter(pk=agent_id, is_active=True).first()
        if agent:
            return agent
    return AIAgent.objects.filter(is_active=True, is_default=True).first()


def _get_agent_provider(agent):
    """Resolve the provider for an agent from its AIProvider/AIModel records,
    falling back to environment configuration (and finally the mock provider)."""
    provider_obj = agent.provider if agent and agent.provider_id else None
    if provider_obj and provider_obj.is_active:
        if provider_obj.kind == AIProvider.Kind.MOCK:
            return MockProvider(), provider_obj
        if provider_obj.kind in (AIProvider.Kind.OPENAI, AIProvider.Kind.OLLAMA):
            model = ""
            if agent.model_id:
                model = agent.model.model_id
            if not model:
                model = provider_obj.model or os.environ.get("AI_MODEL", "")
            return OpenAICompatProvider(
                base_url=provider_obj.base_url or None, model=model
            ), provider_obj
    return get_provider(), None


def get_or_create_session(user, agent):
    if user.is_authenticated:
        session, _ = ChatSession.objects.get_or_create(
            user=user, agent=agent, status="open"
        )
        return session
    session = ChatSession.objects.create(agent=agent)
    return session


def _retrieve(agent, query):
    document_ids = agent.agentdocument_set.values_list("document_id", flat=True)
    terms = _tokenize(query)
    if not terms:
        return []
    if document_ids:
        chunks = (
            KnowledgeChunk.objects.select_related("document")
            .filter(
                document__pk__in=document_ids,
                document__is_active=True,
                document__status=KnowledgeDocument.Status.INDEXED,
            )
            .order_by("document_id", "seq")
        )
        scored = []
        for chunk in chunks:
            tokens = set(_tokenize(chunk.content))
            overlap = sum(1 for t in terms if t in tokens)
            if overlap:
                scored.append((overlap, len(tokens), chunk))
        scored.sort(key=lambda x: (-x[0], x[1]))
        return [c for _, _, c in scored[:5]]
    return search_documents(query, 5)[0]


# Dialect/Egyptian synonyms → catalog keyword groups (normalized forms).
_PRODUCT_SYNONYMS = [
    {"شاحن", "شواحن", "شحن", "اشحن", "ادابتور", "راس شحن", "باور"},
    {"سماعه", "سماعات", "سماعة", "ايربودز", "هيدفون", "بلوتوث", "اذن"},
    {"باور", "باوربانك", "باوربنك", "بانك", "بنك"},
    {"موبايل", "محمول", "تليفون", "جوال", "فون"},
]


def _stem_ar(token):
    """Loose Arabic stemming: drop plural/ta-marbuta suffixes so
    'سماعات'/'سماعه' and 'شواحن'/'شاحن' compare equal."""
    for suffix in ("ات", "ان"):
        if token.endswith(suffix):
            token = token[:-2]
    if token.endswith("ه"):
        token = token[:-1]
    return token


def _active_products():
    return list(
        Product.objects.select_related("brand", "category")
        .filter(status=Product.Status.ACTIVE, variants__is_active=True)
        .distinct()
    )


def _match_terms(query_tokens, hay_tokens):
    hits = 0
    for qt in query_tokens:
        qs = _stem_ar(qt)
        matched = False
        for ht in hay_tokens:
            hs = _stem_ar(ht)
            if qs == hs or (qs and hs and (qs in hs or hs in qs)):
                matched = True
                break
        if not matched and qs:
            matched = any(qs in group for group in _PRODUCT_SYNONYMS)
        if matched:
            hits += 1
    return hits


def _retrieve_products(query, limit=4):
    """Find real, purchasable products actually relevant to the query
    (normalized Arabic / dialect term overlap, see _match_terms).

    Returns [] when the query isn't product-related, so the chat widget
    only shows product suggestion chips when the customer actually asked
    about products — not on every unrelated message.
    """
    products = _active_products()
    if not products:
        return []
    terms = _tokenize(query)
    if not terms:
        return []
    scored = []
    for p in products:
        hay = _tokenize(
            f"{p.name_ar} {p.name_en} {p.brand.name} {p.category.name_ar} {p.description}"
        )
        hits = _match_terms(terms, hay)
        if hits:
            scored.append((hits, p))
    scored.sort(key=lambda x: -x[0])
    return [p for _, p in scored[:limit]]


def _fmt_price(value):
    return f"{int(value):,}".replace(",", "،")


def build_product_context(products):
    if not products:
        return ""
    lines = []
    for p in products:
        parts = [f"- {p.name_ar} ({p.brand.name})"]
        parts.append(f"السعر: {_fmt_price(p.min_price)} ج.م")
        if p.noise_cancellation:
            parts.append("عزل ضوضاء")
        if p.battery_life_hours:
            parts.append(f"بطارية {p.battery_life_hours} ساعة")
        if p.charging_type:
            parts.append(p.charging_type)
        if p.warranty_months:
            parts.append(f"ضمان {p.warranty_months} شهر")
        parts.append(f"الرابط: /products/{p.slug}")
        lines.append(" | ".join(parts))
    return "\n".join(lines)


def chat(agent, session, message, user=None, request=None):
    provider, provider_obj = _get_agent_provider(agent)
    retrieved = _retrieve(agent, message)
    context = build_context(retrieved)
    products = _retrieve_products(message)

    system = agent.system_instructions
    if context:
        system = f"{system}\n\nاستخدم المعلومات التالية فقط واذكر مصدرها ولا تخترع:\n{context}"
    if products:
        system = (
            f"{system}\n\nهذه المنتجات متوفرة فعليًا الآن (اختر منها للرد ولا تخترع غيرها):\n"
            f"{build_product_context(products)}"
        )

    history = [
        {"role": m.role, "content": m.content}
        for m in session.messages.order_by("created_at")[:10]
    ]
    history.append({"role": "user", "content": message})

    user_msg = ChatMessage.objects.create(
        session=session, role=ChatMessage.Role.USER, content=message
    )

    started = time.time()
    error = ""
    result = ProviderResult(content="")
    try:
        result = provider.complete(system, history, agent.temperature, agent.max_tokens)
    except ProviderError as exc:
        error = str(exc)
        result = ProviderResult(
            content="عذرًا، حصل خطأ في المساعد. جرب تاني أو كلمنا واتساب.",
            model=getattr(provider, "model", ""),
        )
        if provider_obj:
            AIProvider.objects.filter(pk=provider_obj.pk).update(
                is_online=False, last_checked_at=timezone.now()
            )
    else:
        if provider_obj:
            AIProvider.objects.filter(pk=provider_obj.pk).update(
                is_online=True, last_checked_at=timezone.now()
            )
    finally:
        latency = int((time.time() - started) * 1000)

    AIUsageLog.objects.create(
        agent=agent,
        provider=provider_obj,
        model=result.model or getattr(provider, "model", ""),
        prompt_tokens=result.prompt_tokens,
        completion_tokens=result.completion_tokens,
        latency_ms=latency,
        cost_est=estimate_cost(result.model, result.prompt_tokens, result.completion_tokens),
        error=error[:500],
    )

    answer = result.content

    sources = [
        {"title": c.document.title, "document_id": c.document_id}
        for c in retrieved
    ]
    sources += [
        {
            "type": "product",
            "product_id": p.id,
            "slug": p.slug,
            "title": p.name_ar,
            "price": str(p.min_price),
        }
        for p in products
    ]
    assistant_msg = ChatMessage.objects.create(
        session=session,
        role=ChatMessage.Role.ASSISTANT,
        content=answer,
        sources=sources,
    )

    recommended = [
        s.get("product_id") for s in sources if s.get("product_id")
    ]
    if recommended:
        ids = list(dict.fromkeys(session.recommended_product_ids + recommended))[:10]
        session.recommended_product_ids = ids
        ChatSession.objects.filter(pk=session.pk).update(recommended_product_ids=ids)

    session.updated_at = timezone.now()
    session.save(update_fields=["updated_at"])
    return user_msg, assistant_msg