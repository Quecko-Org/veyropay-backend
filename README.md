# Nero Bank Backend

Non-custodial crypto neo-bank orchestration API. Built with NestJS, TypeORM, and PostgreSQL.

The `/docs` directory is the single source of truth for architecture, conventions, and product
decisions. Read it before making changes.

## Status

**Phase 1 — Backend Foundation** is complete: project scaffolding, infrastructure modules, and
empty business/provider modules wired together. No business logic (auth, wallet, swaps, KYC,
cards) has been implemented yet.

## Requirements

- Node.js 22 LTS
- PostgreSQL 16
- Docker (optional, for containerized runs)

## Getting Started

```bash
cp .env.example .env   # fill in real values
npm install
npm run start:dev
```

The API listens on `PORT` (default `3000`):

- `GET /health` — liveness/readiness check (Terminus + PostgreSQL)
- `GET /metrics` — Prometheus exposition format
- `GET /api/docs` — Swagger UI
- `/api/v1/*` — versioned business endpoints

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start:dev` | Run with hot reload |
| `npm run start:prod` | Run the compiled build |
| `npm run lint` / `lint:check` | ESLint (fix / check) |
| `npm run format` / `format:check` | Prettier (fix / check) |
| `npm run test` | Unit tests |
| `npm run migration:generate -- <name>` | Generate a TypeORM migration |
| `npm run migration:run` | Apply pending migrations |

## Docker

```bash
docker compose -f docker/docker-compose.dev.yml up -d   # Postgres only, for local dev
docker compose -f docker/docker-compose.yml up --build   # Full stack: API + Postgres + Nginx
```

## Documentation

See `/docs` for the project overview, product requirements, system architecture, tech stack,
folder structure, database design, authentication & recovery, provider integrations, and payment
& settlement flow.
