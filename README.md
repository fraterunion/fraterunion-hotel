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
