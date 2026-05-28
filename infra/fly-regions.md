# Fly.io Multi-Region Worker Deployment

## Architecture

- **Primary API**: Deployed to `iad` (US East — Virginia)
- **Monitoring Workers**: Deployed to `iad`, `lhr` (London), `sin` (Singapore)

The API server handles HTTP requests, while the BullMQ workers perform HTTP checks
from multiple geographic regions. Workers are deployed as separate Fly machines
in different regions so that uptime checks originate from diverse locations.

## Deploying the Primary API

```bash
# Set secrets
fly secrets set DATABASE_URL="<postgres-connection-string>"
fly secrets set REDIS_URL="<redis-connection-string>"
fly secrets set JWT_SECRET="<random-32-char-min>"
fly secrets set STRIPE_SECRET_KEY="<stripe-secret>"
fly secrets set STRIPE_WEBHOOK_SECRET="<stripe-webhook-secret>"
fly secrets set RESEND_API_KEY="<resend-key>"
fly secrets set APP_URL="https://uptime-api.fly.dev"

# Deploy
fly deploy
```

## Deploying Workers to Multiple Regions

Workers run the same build but start with a worker entry point and a `REGION` env
var that tags each `CheckResult` with the correct origin region.

### 1. Create a separate fly.toml for workers or use machine config

Create `fly.workers.toml`:

```toml
app = "uptime-workers"
primary_region = "iad"

[http_service]
  internal_port = 3000
  force_https = false
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 0

[env]
  NODE_ENV = "production"
  WORKER_MODE = "true"
```

### 2. Deploy to iad (US East)

```bash
fly deploy --config fly.workers.toml --region iad \
  --env REGION=us-east
```

### 3. Deploy to lhr (London)

```bash
fly deploy --config fly.workers.toml --region lhr \
  --env REGION=eu-west
```

### 4. Deploy to sin (Singapore)

```bash
fly deploy --config fly.workers.toml --region sin \
  --env REGION=ap-southeast
```

### 5. Scale each region to the desired concurrency

```bash
fly machine update <machine-id> --vm-cpus 1 --vm-memory 512
```

## How REGION Injects CheckResult Tags

Each worker machine has a `REGION` environment variable set (e.g., `us-east`,
`eu-west`, `ap-southeast`). When the worker performs a check, it reads
`process.env.REGION` and writes it to the `CheckResult.region` column.

This allows the quorum detection service to evaluate checks from multiple
geographic regions and accurately determine if a monitor is truly down
(quorum threshold: 2+ regions reporting down) or if it's a regional blip.

## Release Command

The primary API app runs Prisma migrations on deploy via the release command:

```toml
[deploy]
  release_command = "pnpm --filter @uptime/db prisma migrate deploy"
```

Workers do not need the release command since they share the same database.
