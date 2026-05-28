# Uptime SaaS

Production-grade backend for an **uptime monitoring + public status page** platform. Multi-region health checks, quorum-based incident detection, alert fanout (email/Slack/PagerDuty/webhook), plan-based billing, and a public status page API — all running on Node.js + Fastify.

---

## Features

- **Multi-region HTTP checks** — configurable intervals, timeouts, SSL checks, keyword matching
- **Quorum-based incident detection** — requires 2+ regions to report down before opening an incident (prevents false alarms)
- **Alert fanout** — email (Resend), Slack webhook, PagerDuty Events API v2, generic webhook with secret signing
- **Plan enforcement** — Hobby / Starter / Pro / Business tiers with monitor limits, interval constraints, and channel restrictions
- **Subscription billing** — Stripe Checkout, Billing Portal, and webhook sync
- **Public status page API** — cached 120s, uptime bars, incident history
- **API key auth** — generate scoped API keys for programmatic access
- **Data retention** — automatic daily cleanup of old check results per plan policy
- **WebSocket real-time updates** — live monitor status push to dashboard clients
- **Swagger UI** — interactive API docs at `/docs`

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Fastify Server                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐  │
│  │ Auth      │ │ Rate     │ │ Version  │ │ Swagger  │  │
│  │ Plugin    │ │ Limit    │ │ Headers  │ │ UI       │  │
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘  │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Routes (thin handlers only)                     │  │
│  │ auth │ monitors │ incidents │ alerts │ orgs     │  │
│  │ status │ billing │ ws                           │  │
│  └─────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Services (framework-agnostic business logic)    │  │
│  └─────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
    ┌─────────┐   ┌─────────┐   ┌─────────┐
    │ Prisma  │   │  Redis  │   │ BullMQ  │
    │ ORM     │   │ Cache   │   │ Queue   │
    └────┬────┘   └─────────┘   └────┬────┘
         ▼                           ▼
    ┌─────────┐                 ┌─────────┐
    │Postgres │                 │ Workers │
    │Timescale│                 │ monitor │
    │   DB    │                 │retention│
    └─────────┘                 └─────────┘
```

### Polling lifecycle

```
Scheduler (startup)
    ↓  fetches active monitors, creates repeatable BullMQ jobs
Monitor Queue (BullMQ + Redis)
    ↓  dispatches jobs per monitor+region
Worker
    ├── runCheck()          → HTTP fetch with timeout
    ├── saveCheckResult()   → writes to CheckResult hypertable
    └── evaluateQuorum()    → opens/resolves incidents
            ↓
        Quorum Service
            ├── downCount >= 2 AND no incident → open → fanout alerts
            └── downCount === 0 AND incident   → resolve → fanout recovery
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js >=20, TypeScript strict mode |
| HTTP | Fastify 5 with plugins (cors, rate-limit, websocket, swagger) |
| ORM | Prisma 5 + PostgreSQL 15 with TimescaleDB hypertable |
| Queue | BullMQ 5 on Redis 7 |
| Cache | ioredis — status page cache, rate-limit store, alert idempotency |
| Auth | bcrypt (hashing), jsonwebtoken (JWT), scoped API keys |
| Payments | Stripe — Checkout, Billing Portal, webhook |
| Email | Resend SDK for alert delivery |
| Logging | Pino structured JSON |
| Validation | Zod (env), JSON schemas (routes) |
| Deploy | Docker multi-stage, Fly.io |
| Monorepo | pnpm workspaces |

---

## Project Structure

```
uptime/
├── apps/
│   ├── api/               # Fastify server
│   │   └── src/
│   │       ├── config/     # Zod env loader, plan definitions
│   │       ├── lib/        # Logger, errors, JWT, password utils
│   │       ├── plugins/    # prisma, redis, auth, rate-limit, versioning, swagger
│   │       ├── routes/     # Route handlers (thin)
│   │       ├── services/   # Business logic
│   │       ├── queues/     # BullMQ queue definitions
│   │       └── workers/    # BullMQ workers (monitor checks, data retention)
│   ├── dashboard/          # React + Vite private dashboard
│   └── status/             # React + Vite public status page
├── packages/
│   ├── db/                 # Prisma schema + migrations
│   └── types/              # Shared TypeScript interfaces
├── infra/                  # Docker Compose, Fly.io docs
├── Dockerfile              # Multi-stage production build
├── fly.toml                # Fly.io deployment config
└── .env.example            # Environment template
```

---

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm (`npm install -g pnpm`)
- Docker Desktop

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start infrastructure (PostgreSQL + Redis)
docker compose -f infra/docker-compose.yml up -d

# 3. Generate Prisma client
pnpm db:generate

# 4. Run migrations
pnpm db:migrate

# 5. Create TimescaleDB hypertable for check results
docker exec -i uptime-postgres psql -U postgres -d uptime \
  -c "SELECT create_hypertable('\"CheckResult\"', 'checkedAt');"

# 6. Configure environment
cp .env.example apps/api/.env
# Edit apps/api/.env with real values

# 7. Start the API server
pnpm dev
# → http://localhost:3000 | Health: http://localhost:3000/health
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `REDIS_URL` | Yes | — | Redis connection string |
| `JWT_SECRET` | Yes | — | JWT signing key (min 32 chars) |
| `STRIPE_SECRET_KEY` | Yes | — | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | — | Stripe webhook signing secret |
| `PORT` | No | `3000` | HTTP server port |
| `NODE_ENV` | No | `development` | `development`, `production`, `test` |
| `RESEND_API_KEY` | No | — | Resend API key for email alerts |
| `APP_URL` | No | `http://localhost:3000` | Public-facing app URL |

---

## API Reference

All routes mount under `/api/v1`. Auth column: `—` no auth, `JWT` Bearer token, `JWT|ApiKey` either.

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | — | Register org + user |
| POST | `/api/v1/auth/login` | — | Login, returns JWT |
| POST | `/api/v1/auth/api-keys` | JWT | Create API key |
| DELETE | `/api/v1/auth/api-keys/:keyId` | JWT | Revoke API key |

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"orgName":"My Org","slug":"my-org","email":"admin@test.com","password":"password123"}'

curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'
```

### Monitors

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/monitors` | JWT\|ApiKey | Create monitor |
| GET | `/api/v1/monitors` | JWT\|ApiKey | List monitors |
| GET | `/api/v1/monitors/:id` | JWT\|ApiKey | Monitor detail + last 10 results |
| DELETE | `/api/v1/monitors/:id` | JWT\|ApiKey | Soft-deactivate monitor |

```bash
curl -X POST http://localhost:3000/api/v1/monitors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Example","url":"https://example.com","regions":["us-east","eu-west"],"intervalSeconds":300}'
```

### Incidents

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/incidents` | JWT\|ApiKey | List incidents |
| GET | `/api/v1/incidents/:id` | JWT\|ApiKey | Incident detail + check results |
| POST | `/api/v1/incidents/:id/acknowledge` | JWT\|ApiKey | Acknowledge incident |

### Alerts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/alerts` | JWT\|ApiKey | List alert channels |
| POST | `/api/v1/alerts` | JWT\|ApiKey | Create alert channel |
| DELETE | `/api/v1/alerts/:id` | JWT\|ApiKey | Delete alert channel |

Types: `email`, `slack`, `pagerduty`, `webhook`. Events: `down`, `recovered`, `ssl_expiry`.

```bash
curl -X POST http://localhost:3000/api/v1/alerts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"type":"webhook","config":{"url":"https://hooks.example.com/alerts","secret":"s3cret"},"notifyOn":["down","recovered"]}'
```

### Status Page (public)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/status/:slug` | — | Full status page (cached 120s) |
| GET | `/api/v1/status/:slug/monitors/:id` | — | Single monitor summary |
| GET | `/api/v1/status/:slug/incidents` | — | Paginated incidents |

### Billing

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/billing/plans` | — | Plan definitions |
| POST | `/api/v1/billing/checkout` | JWT | Stripe Checkout session |
| POST | `/api/v1/billing/portal` | JWT | Stripe Billing Portal session |
| POST | `/api/v1/billing/webhook` | Stripe sig | Stripe webhook handler |

### Health

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"...","dependencies":{"database":"ok","redis":"ok","queue":"ok"}}
```

---

## Plan Limits

| Feature | Hobby | Starter | Pro | Business |
|---------|-------|---------|-----|----------|
| Max monitors | 3 | 10 | 50 | Unlimited |
| Min check interval | 5 min | 1 min | 30 sec | 30 sec |
| Max regions per monitor | 1 | 3 | 5 | Unlimited |
| Alert channels | Email | Email, Slack | Email, Slack, PD, Webhook | All |
| Data retention | 30 days | 90 days | 365 days | 365 days |
| Custom domain | — | — | ✅ | ✅ |
| API access | — | ✅ | ✅ | ✅ |

---

## Deployment

### Fly.io

```bash
# Set secrets
fly secrets set DATABASE_URL="<connection-string>"
fly secrets set REDIS_URL="<redis-connection-string>"
fly secrets set JWT_SECRET="<random-32-char-min>"
fly secrets set STRIPE_SECRET_KEY="<stripe-secret>"
fly secrets set STRIPE_WEBHOOK_SECRET="<stripe-webhook-secret>"
fly secrets set RESEND_API_KEY="<resend-key>"
fly secrets set APP_URL="https://uptime-api.fly.dev"

# Deploy
fly deploy
```

### Docker

```bash
docker build -t uptime-api .
docker run -p 3000:3000 --env-file apps/api/.env uptime-api
```

---

## Error Format

All errors return a consistent shape:

```json
{
  "error": "FORBIDDEN",
  "message": "Monitor limit reached for your plan",
  "statusCode": 403,
  "code": "MONITOR_LIMIT_REACHED"
}
```

Common codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMIT_EXCEEDED` (429), `MONITOR_LIMIT_REACHED` (403), `INTERVAL_TOO_SHORT` (403), `CHANNEL_NOT_ON_PLAN` (403), `INVALID_CREDENTIALS` (401).

All responses include `X-API-Version: v1` and `X-Request-Id` headers.

---

## Frontend

### Dashboard (`apps/dashboard`)

Private customer dashboard for managing monitors, incidents, alert channels, and billing.

**Stack:** React 18, Vite, React Router v6, @tanstack/react-query, zustand, react-hook-form + zod, GSAP, Three.js

```bash
pnpm --filter @uptime/dashboard dev
# → http://localhost:5173
```

### Status Page (`apps/status`)

Public-facing status page — no auth required, reads org slug from subdomain.

**Stack:** React 18, Vite, React Router v6, @tanstack/react-query, GSAP

```bash
pnpm --filter @uptime/status dev
# → http://localhost:5174
```

---

## Testing the Pipeline

```bash
# Register an org
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"orgName":"Test","slug":"test-org","email":"admin@test.com","password":"password123"}'

# Create a monitor pointing to something that will fail
curl -X POST http://localhost:3000/api/v1/monitors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Failing","url":"http://localhost:1999","regions":["us-east","eu-west"],"intervalSeconds":300}'

# Create an alert channel
curl -X POST http://localhost:3000/api/v1/alerts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"type":"email","config":{"recipient":"admin@test.com"},"notifyOn":["down","recovered"]}'

# View incidents when they fire
curl http://localhost:3000/api/v1/incidents \
  -H "Authorization: Bearer <token>"

# Check public status page
curl http://localhost:3000/api/v1/status/test-org
```
