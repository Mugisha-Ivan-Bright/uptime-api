# Uptime SaaS — Implementation Progress

## Phase 1 — Foundation

[x] Scaffold monorepo structure — root configs, package.jsons, tsconfigs, pnpm-workspace
[x] TASK 1 — Infra (docker-compose.yml) — postgres+redis up, healthy, ports mapped
[x] TASK 2 — Environment Validation — zod validation, fails with readable messages on missing vars
[x] TASK 3 — Fastify Server Bootstrap — health endpoint returns 200, CORS, pino logging, graceful shutdown
[x] TASK 4 — Prisma Plugin — singleton PrismaClient, fastify.prisma, fail-fast on connect failure
[x] TASK 5 — Redis Plugin — singleton ioredis, fastify.redis, ping on startup, logs "Redis connected"
[x] TASK 6 — Queue Definitions — BullMQ "monitor-checks" queue, reuses shared Redis connection
[x] TASK 7 — Worker Skeleton — BullMQ Worker, concurrency 5, logs jobId+monitorId, returns {status:"stub"}
[x] TASK 8 — Route Scaffolds — GET /api/v1/{monitors,incidents,orgs,alerts} all return 200
[x] TASK 9 — Alert Adapter Skeleton — sendAlert switches on type, each adapter logs correctly
[x] Database schema — Prisma schema with all 5 models, TimescaleDB hypertable on CheckResult
[x] TASK 10 — README.md — comprehensive setup instructions
[x] TypeScript — strict mode, compiles with zero errors
[x] pnpm install — all deps installed, workspaces configured

## Phase 2 — Polling Engine & Incident Lifecycle

[x] Shared types — CheckResultPayload, MonitorJob, IncidentOpenedPayload, AlertPayload added to packages/types
[x] Export getPrisma() — prisma plugin exports singleton getter for workers
[x] TASK 11 — HTTP Checker Service (checker.service.ts) — native fetch, timeout, status/keyword checks, ssl warning
[x] TASK 12 — Check Result Writer (checkResult.service.ts) — writes CheckResult row, prisma passed as param
[x] TASK 13 — Quorum Detection Service (quorum.service.ts) — 2-region down threshold opens incident, all-up resolves
[x] TASK 14 — Incident Lifecycle Service (incident.service.ts) — openIncident, resolveIncident, read ops, ack
[x] TASK 15 — Real Worker Implementation (monitor.worker.ts) — full pipeline: check → save → quorum → log
[x] TASK 16 — Alert Fanout Service (alert.service.ts) — email/slack/pagerduty/webhook adapters, Redis idempotency
[x] TASK 17 — Monitor Scheduler (workers/scheduler.ts) — repeatable BullMQ jobs per monitor:region, graceful shutdown
[x] TASK 18 — Monitor CRUD Routes + monitor.service.ts — POST/GET/GET:id/DELETE with status derivation, soft delete
[x] TASK 19 — Incident Routes — GET list, GET detail with check results, POST acknowledge
[x] TASK 20 — README + PROGRESS update — full Phase 2 documentation

## Phase 3 — Auth & Multi-tenancy

[x] TASK 21 — Organization & User Schema Migration — User + ApiKey models, migrated
[x] TASK 22 — Password Utilities — bcrypt hash/verify
[x] TASK 23 — JWT Utilities — sign/verify + JWT_SECRET env
[x] TASK 24 — AppError Class — typed error + global Fastify error handler
[x] TASK 25 — Auth Service — registerOrg, loginUser, createApiKey, revokeApiKey
[x] TASK 26 — Auth Routes — register, login, api-keys CRUD
[x] TASK 27 — Auth Plugin — JWT + API Key authentication decorator
[x] TASK 28 — Protect Existing Routes — monitors, incidents, alerts with auth + org scoping
[x] TASK 29 — Org Routes — public org lookup, org/me, patch org
[x] TASK 30 — README + PROGRESS update — full Phase 3 documentation

## Phase 4 — Public Status Page

[x] TASK 31 — Uptime Calculation Service — getDailyUptimeBars, getUptimePct
[x] TASK 32 — Status Page Data Service — getStatusPageData
[x] TASK 33 — Status Page Cache Layer — getCachedStatusPage, invalidateStatusPageCache
[x] TASK 34 — Status Page Routes — GET /status/:slug, GET /status/:slug/monitors/:id, GET /status/:slug/incidents
[x] TASK 35 — Alert Channel Routes — CRUD for alert channels with alertChannel.service.ts
[x] TASK 36 — Incident Cache Invalidation Wiring — invalidate cache on open/resolve
[x] TASK 37 — SSL Expiry Alert Wiring — ssl_expiry event in worker + alert service
[x] TASK 38 — README + PROGRESS update — full Phase 4 documentation

## Phase 5 — Billing & Plan Enforcement

[x] TASK 39 — Stripe Schema Migration — Subscription model, migrated
[x] TASK 40 — Plan Enforcement Service — assertCanCreateMonitor, assertCanCreateAlertChannel
[x] TASK 41 — Wire Plan Enforcement into Routes — monitors POST, alerts POST
[x] TASK 42 — Stripe Service — checkout, portal, webhook handling
[x] TASK 43 — Billing Routes — /billing/checkout, /portal, /webhook, /plans
[x] TASK 44 — Data Retention Worker — daily cleanup of old CheckResults
[x] TASK 45 — README + PROGRESS update

## Phase 6 — Polish & Production Readiness

[x] TASK 46 — Rate Limiting — @fastify/rate-limit installed, plugin created with Redis store, route-level overrides for auth (5/min register, 10/min login) and webhook (500/min)
[x] TASK 47 — Request Validation Hardening — all body/query routes updated with JSON schemas including maxLength, pattern, enum constraints; manual validation removed where schema covers it
[x] TASK 48 — Structured Error Codes — ErrorCodes constant added, AppError.code field added, all throw sites updated, global error handler includes code in response, route catch blocks pass code through
[x] TASK 49 — Health Check Hardening — /health endpoint now checks database, redis, and queue; returns status "degraded" if any dependency fails; always returns 200
[x] TASK 50 — API Versioning Middleware — X-API-Version and X-Request-Id headers added to all responses; requestId stored on request object; ALS context set for pino logging
[x] TASK 51 — Fly.io Deployment Configuration — fly.toml, Dockerfile, .dockerignore, and infra/fly-regions.md created
[x] TASK 52 — Final README + PROGRESS — comprehensive production-grade README written, PROGRESS.md finalized with full build history

## Frontend — Dashboard & Status Page

[x] F1 — Project Scaffold — apps/dashboard + apps/status created as Vite+React projects, added to pnpm-workspace.yaml
[x] F2 — Design System Components — Button, Input, Badge, Card, Terminal, StatusDot in both apps (JetBrains Mono / IBM Plex Mono, 0 border-radius, CSS custom properties)
[x] F3 — Auth Store + API Client — zustand store with localStorage persistence, axios instance with JWT interceptor and 401 redirect
[x] F4 — Dashboard Layout — TopBar (48px, org name, plan badge, logout) + Sidebar (220px, 6 nav items, active highlight)
[x] F5 — Dashboard Overview — Three.js sphere particle hero, GSAP stat counters, monitor grid with status dots + uptime bars, recent incidents table
[x] F6 — Monitors Pages — /monitors list with search, /monitors/new form (react-hook-form+zod, conditional fields), /monitors/:id detail with sparkline SVG + uptime bars + check results
[x] F7 — Incidents Page — filter tabs (ALL/OPEN/RESOLVED), expanded rows, acknowledge button, region chips
[x] F8 — Alert Channels Page — list with type icons, inline add form (conditional config fields by type), delete
[x] F9 — Billing Page — current plan card with Terminal limits, 4-column plan comparison grid, Stripe checkout/portal redirect
[x] F10 — Settings Page — org name update form, API key create (shows plain key once in Terminal) + revoke
[x] F11 — Auth Pages — Login + Register full-screen centered forms, zod validation, error display in Terminal blocks
[x] F12 — Public Status Page (apps/status) — hero with org name + badge, monitor rows with 90-day uptime bars, active incidents card, incident history, 30s polling, GSAP stagger entrance
[x] F13 — WebSocket Real-Time Updates — useRealtimeMonitors hook (native WebSocket, exponential backoff reconnect, react-query cache invalidation), backend ws.ts stub with @fastify/websocket, broadcast wired into worker + quorum service
[x] F14 — README + PROGRESS Update — frontend section with env vars, design system docs, all tasks documented
[x] Types — Added StatusPageData, MonitorSummary, ActiveIncident, RecentIncident, UptimeBar, JwtPayload, AuthResponse, and other frontend-facing types to @uptime/types
