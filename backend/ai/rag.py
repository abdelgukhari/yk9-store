"""Keyword-overlap RAG for the MVP.

No embeddings yet: chunks are scored by term overlap with the query, which is
fast, offline, and deterministic for a small curated knowledge base. Swap in a
vector index (pgvector) later without changing the chat API.
"""

import re
import unicodedata

from .models import KnowledgeChunk, KnowledgeDocument

# Split on anything that isn't a Unicode word char (letters/digits/_).
_WORD_RE = re.compile(r"[^\w]+", re.UNICODE)
# Arabic diacritics / tatweel.
_DIACRITICS = re.compile(r"[\u064B-\u065F\u0670\u0640]")
# Character equivalences so Egyptian/dialect spellings all collapse to one form.
_REPLACEMENTS = {
    "أ": "ا", "إ": "ا", "آ": "ا", "ى": "ي", "ة": "ه",
    "ؤ": "و", "ئ": "ي", "ء": "", "ـ": "",
}
_DEF_ART = re.compile(r"^ال")


def _normalize_ar(text):
    text = unicodedata.normalize("NFKC", text)
    text = _DIACRITICS.sub("", text)
    for a, b in _REPLACEMENTS.items():
        text = text.replace(a, b)
    return text


def _tokenize(text):
    text = _normalize_ar(text)
    tokens = []
    for t in _WORD_RE.split(text):
        if len(t) <= 1:
            continue
        t = t.lower()
        tokens.append(t)
        stripped = _DEF_ART.sub("", t)
        if stripped != t:
            tokens.append(stripped)
    return tokens


def search_documents(query, limit=5):
    terms = _tokenize(query)
    if not terms:
        return [], []
    scored = []
    for chunk in (
        KnowledgeChunk.objects.select_related("document")
        .filter(document__is_active=True, document__status=KnowledgeDocument.Status.INDEXED)
    ):
        tokens = _tokenize(chunk.content)
        overlap = sum(1 for t in terms if t in tokens)
        if overlap:
            scored.append((overlap, len(tokens), chunk))
    scored.sort(key=lambda x: (-x[0], x[1]))
    chunks = [c for _, _, c in scored[:limit]]
    return chunks, chunks


def build_context(chunks):
    if not chunks:
        return ""
    parts = [f"مستند: {c.document.title}\n{c.content}" for c in chunks]
    return "\n\n".join(parts)