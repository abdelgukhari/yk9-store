# YK9 — Wireless Audio, Charging & Mobile Accessories (Egypt)

E-commerce store for Egypt: Arabic RTL storefront + admin dashboard (Next.js) backed by a Django REST API (PostgreSQL). Cash on Delivery + Vodafone Cash, WhatsApp ordering, and an Arabic AI assistant with a RAG knowledge base.

## Stack
- Backend: Django 5 + DRF + PostgreSQL
- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS
- Auth: JWT (email-based custom user), RBAC
- AI: provider-agnostic (OpenAI-compatible / Ollama / Mock) with PostgreSQL FTS RAG

## Local development

### Option A — Docker (recommended)
```bash
cp .env.example .env
docker compose up --build
```
- Storefront: http://localhost:3000
- API: http://localhost:8000
- Admin (Django): http://localhost:8000/admin

### Option B — Native
```bash
# 1. Start Postgres (or run via: docker compose up db)
# 2. Backend
python -m venv backend/.venv
backend/.venv/Scripts/activate        # or: source backend/.venv/bin/activate
pip install -r backend/requirements.txt
python backend/manage.py migrate
python backend/manage.py runserver

# 3. Frontend (separate terminal)
cd frontend
npm ci
npm run dev
```

## Environment
Copy `.env.example` to `.env` and set `VODAFONE_CASH_NUMBER`, and AI provider values. `.env.example` contains no real secrets.

## Testing
- Backend: `cd backend && python manage.py test`
- Frontend: `cd frontend && npm run lint && npx tsc --noEmit && npm run build`

Full setup and operations docs live in `docs/`.
