# FraterUnion Hotel

Starter monorepo for **FraterUnion Hotel V1**.

## Stack
- pnpm workspaces
- Turborepo
- NestJS API
- Prisma + PostgreSQL
- Redis
- Next.js web
- Next.js admin

## Quick start

1. Copy `.env.example` to `.env`
2. Start infra:
   ```bash
   docker compose up -d
   ```
3. Install deps:
   ```bash
   pnpm install
   ```
4. Generate Prisma client:
   ```bash
   pnpm db:generate
   ```
5. Run migrations:
   ```bash
   pnpm db:migrate
   ```
6. Seed demo data:
   ```bash
   pnpm db:seed
   ```
7. Run all apps:
   ```bash
   pnpm dev
   ```

## Apps
- API: http://localhost:4000/api
- Web: http://localhost:3000
- Admin: http://localhost:3001

## Demo credentials
- email: admin@casafrater.com
- password: ChangeMe123!

Update this before using in any real environment.

## Cars arbitrage MVP (Phase 1)

This repo now includes a minimal cars-arbitrage MVP:
- API ingestion endpoint: `POST /api/cars/ingest`
- Opportunities endpoint: `GET /api/cars/opportunities`
- Telegram alerts for listings priced at `<= 85%` of cohort median
- Python worker in `apps/ingestion-worker` for Segundamano + Mercado Libre polling

### Extra environment variables

Add these to `.env` for alerts:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### Run MVP flow

1. Start infra and API:
   ```bash
   docker compose up -d
   pnpm install
   pnpm db:generate
   pnpm db:migrate
   pnpm --filter @fraterunion/api dev
   ```
2. In another terminal, run worker:
   ```bash
   cd apps/ingestion-worker
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   python main.py
   ```
