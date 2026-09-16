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
| `npm run migration:run` | Apply pending migrations (required after a DB wipe) |

## Docker

```bash
docker compose -f docker/docker-compose.dev.yml up -d   # Postgres only, for local dev
docker compose -f docker/docker-compose.yml up --build   # Full stack: API + Postgres + Nginx
```

## Reset the local database

Use this on local/dev after rotating Turnkey credentials (new org or API keys).
Old `users.turnkey_user_id` and wallet rows will not match the new Turnkey org.

Do **not** run this against staging or production.

Check `.env` first: wipe the database named in `DATABASE_NAME` on
`DATABASE_HOST`/`DATABASE_PORT`. If `DATABASE_HOST=localhost` and Postgres is
installed on the Mac (not Docker), Docker volume resets will not clear your data.

Stop the API first, then wipe and re-apply migrations (`synchronize` is off, so
an empty database has no tables until migrations run).

### Local Postgres on localhost (common)

```bash
# Load DATABASE_* from .env, then drop/recreate the public schema
export $(grep -E '^DATABASE_' .env | xargs)
PGPASSWORD="$DATABASE_PASSWORD" psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" \
  -U "$DATABASE_USERNAME" -d "$DATABASE_NAME" \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npm run migration:run
```

Or recreate the database:

```bash
export $(grep -E '^DATABASE_' .env | xargs)
dropdb -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USERNAME" "$DATABASE_NAME"
createdb -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USERNAME" "$DATABASE_NAME"
npm run migration:run
```

### Docker Compose Postgres

Only if the API actually uses the compose DB (same host/port/name as `.env`):

```bash
docker compose -f docker/docker-compose.dev.yml down -v
docker compose -f docker/docker-compose.dev.yml up -d
npm run migration:run
```

`down -v` removes the `postgres-data-dev` volume. Without `-v` the old data
comes back. Compose defaults to DB name `nero_bank` unless your `.env` overrides it.

### Drop schema inside the Docker container

```bash
docker compose -f docker/docker-compose.dev.yml exec postgres \
  psql -U "${DATABASE_USERNAME:-postgres}" -d "${DATABASE_NAME:-nero_bank}" \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npm run migration:run
```

Restart with `npm run start:dev`. Users must sign up again; this does not
delete sub-orgs on Turnkey's side.

## Documentation

See `/docs` for the project overview, product requirements, system architecture, tech stack,
folder structure, database design, authentication & recovery, provider integrations, and payment
& settlement flow.
