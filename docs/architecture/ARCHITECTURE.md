# YK9 Architecture

## Stack
- **Backend**: Django 5 + Django REST Framework + PostgreSQL (extends `backend/`).
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS (`frontend/`).
- **Auth**: JWT (access + rotating refresh), custom email-based User, RBAC via roles.
- **Payments**: Cash on Delivery (manual confirm) + Vodafone Cash (manual proof review). No card gateways in MVP.
- **WhatsApp**: `wa.me` links with template messages (MVP). `WhatsAppService` interface for future Cloud API.
- **AI**: Provider abstraction (OpenAI-compatible / Ollama / Mock). RAG via PostgreSQL FTS. Prices/stock always read live from DB.
- **Storage**: Django local media storage first; upload service abstraction for S3/Cloudinary later.

## Key principles
1. Every price, discount, shipping fee, and permission is computed **server-side**. Browser values are never trusted.
2. Orders are created inside DB transactions with inventory reservation/update.
3. `OrderItem` stores a full product snapshot (name, SKU, variant, color, unit price, discount, qty, total) — historical orders never change when products are edited.
4. All important actions write an `AuditLog` (who, what, when, IP).
5. AI requests never leave the server; API keys live only in Django env.
6. Egyptian validation: mobile `^01[0-9]{9}$`; Egypt-only shipping.

## Repo layout
```
backend/     Django API (accounts, catalog, shipping, orders, whatsapp, ai, audit)
frontend/    Next.js storefront + admin dashboard
docker/      Dockerfiles, docker-compose
docs/        architecture, ERD, agents, features, deploy
```

## Data flow (order placement)
Checkout (Next) → POST /api/orders (Django) → server validates (address, items, prices from DB, shipping, coupon) → transaction: reserve inventory → create Order/OrderItem snapshot/Payment/StatusHistory → respond with order token → WhatsApp link with prefilled confirmation message.

## Data flow (AI chat)
Widget (Next) → POST /api/ai/chat → Django: rate limit + sanitize → intent detection → RAG (FTS on KnowledgeChunk + live product queries) → prompt build (verified context only) → provider call (Mock/Ollama/OpenAI-compatible) → Egyptian Arabic answer + internal sources → save ChatSession/Message + AIUsageLog.