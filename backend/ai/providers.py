import json
import os
import ssl
import urllib.request
from dataclasses import dataclass

try:
    import certifi
except ImportError:  # pragma: no cover - optional helper
    certifi = None


def _ssl_context():
    """CA bundle for urllib (certifi) so HTTPS providers work even on systems
    without system CA paths (e.g. MSYS2-based Python)."""
    if certifi:
        return ssl.create_default_context(cafile=certifi.where())
    return None


class ProviderError(Exception):
    pass


@dataclass
class ProviderResult:
    content: str
    model: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0


class BaseProvider:
    kind = "base"

    def complete(self, system, messages, temperature, max_tokens):
        raise NotImplementedError


class MockProvider(BaseProvider):
    """Deterministic offline provider used for local dev and tests."""

    kind = "mock"

    def complete(self, system, messages, temperature, max_tokens):
        user_text = " ".join(
            m["content"] for m in messages if m.get("role") == "user"
        ).strip()
        lower = user_text.lower()

        if any(word in lower for word in ("مرحبا", "السلام", "هلا", "hi", "hello")):
            answer = "أهلًا بك في YK9 👋 كيف أقدر أساعدك؟"
        elif any(word in lower for word in ("السعر", "سعر", "كم", "بكام")):
            answer = (
                "أحدث الأسعار تجدها في صفحة المنتج مباشرةً. "
                "أقدر أرشّحلك منتجات مناسبة لميزانيتك لو قولتلي نطاق السعر."
            )
        elif any(word in lower for word in ("شحن", "التوصيل", "توصيل", "delivery")):
            answer = "الشحن لباب البيت على كل محافظات مصر خلال 2-6 أيام عمل، والشحن مجاني للطلبات فوق 1500 جنيه."
        elif any(word in lower for word in ("ضمان", "warranty")):
            answer = "كل منتجاتنا عليها ضمان حقيقي، ومدة الضمان مذكورة في صفحة كل منتج."
        elif any(word in lower for word in ("استرجاع", "رجع", "استبدال")):
            answer = "الاسترجاع خلال 14 يوم من الاستلام، بشرط الحالة الجيدة والفاتورة."
        elif any(word in lower for word in ("فودافون", "دفع", "الدفع", "payment")):
            answer = "نستقبل الدفع عند الاستلام (COD) أو عبر فودافون كاش مع إرسال إثبات التحويل."
        elif any(word in lower for word in ("سماعة", "buds", "soundcore", "samsung", "earbuds")):
            answer = "عندنا تشكيلة سماعات لاسلكية مميزة. تقدر تكتب اسم المنتج المحدد أو تقول الميزانية وأرشّحلك."
        elif any(word in lower for word in ("شاحن", "باور", "charger", "power")):
            answer = "عندنا شواحن GaN سريعة وباور بانكات من Anker. محتاج توصية؟"
        else:
            answer = (
                "تقدر تسألني عن المنتجات والأسعار والشحن والدفع والضمان. "
                "لو محتاج مساعدة فورية، كلمنا واتساب."
            )
        return ProviderResult(content=answer, model="mock")


class OpenAICompatProvider(BaseProvider):
    """OpenAI-compatible chat completions (works with OpenAI, Ollama, vLLM, etc.)."""

    kind = "openai"

    def __init__(self, base_url=None, api_key=None, model=None):
        self.base_url = (
            base_url or os.environ.get("AI_BASE_URL", "https://api.openai.com/v1")
        ).rstrip("/")
        self.api_key = api_key if api_key is not None else os.environ.get("AI_API_KEY", "")
        self.model = model or os.environ.get("AI_MODEL", "")
        if not self.model:
            raise ProviderError("AI_MODEL is required.")

    def complete(self, system, messages, temperature, max_tokens):
        url = f"{self.base_url}/chat/completions"
        body = {
            "model": self.model,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
            "messages": [{"role": "system", "content": system}, *messages],
        }
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode(),
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30, context=_ssl_context()) as resp:
                payload = json.loads(resp.read().decode())
        except urllib.error.HTTPError as exc:
            raise ProviderError(f"Provider HTTP {exc.code}: {exc.read().decode()[:200]}")
        except Exception as exc:
            raise ProviderError(str(exc))
        try:
            content = payload["choices"][0]["message"]["content"]
        except (KeyError, IndexError):
            raise ProviderError("Unexpected provider response.")
        usage = payload.get("usage") or {}
        return ProviderResult(
            content=content,
            model=payload.get("model") or self.model,
            prompt_tokens=int(usage.get("prompt_tokens") or 0),
            completion_tokens=int(usage.get("completion_tokens") or 0),
        )


def get_provider(kind=None, *, base_url=None, api_key=None, model=None):
    kind = (kind or os.environ.get("AI_PROVIDER", "mock")).lower()
    if kind in ("mock", ""):
        return MockProvider()
    if kind in ("openai", "ollama"):
        return OpenAICompatProvider(base_url=base_url, api_key=api_key, model=model)
    raise ProviderError(f"Unsupported AI provider: {kind}")


# USD per 1K tokens (input, output). Rough public list prices, matched by
# substring against the model name; unknown models get a negligible default.
_COST_PER_1K = [
    ("gpt-4o-mini", (0.15, 0.60)),
    ("gpt-4o", (2.50, 10.00)),
    ("gpt-4-turbo", (10.00, 30.00)),
    ("gpt-4", (30.00, 60.00)),
    ("o1", (15.00, 60.00)),
    ("o3", (2.00, 8.00)),
    ("gpt-3.5-turbo", (0.50, 1.50)),
    ("llama", (0.15, 0.60)),
]


def estimate_cost(model, prompt_tokens, completion_tokens):
    key = (model or "").lower()
    for name, (price_in, price_out) in _COST_PER_1K:
        if name in key:
            return (price_in * prompt_tokens + price_out * completion_tokens) / 1000
    return (prompt_tokens + completion_tokens) / 1_000_000