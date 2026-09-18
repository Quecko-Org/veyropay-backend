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

Base Sepolia testnet (uses `testnet.env`):

```bash
npm run start:dev:testnet
npm run migration:run:testnet   # first time / after DB wipe
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

Guardian social recovery API flow: [`docs/recovery.md`](./docs/recovery.md).

### Social recovery module (grace period)

Grace period is fixed in the module constructor. Changing only
`SAFE_RECOVERY_MODULE_ADDRESS` in `.env` is **not enough** — guardians are
registered **per module address**.

To switch (dev/fast test vs production):

1. Set `SAFE_RECOVERY_MODULE_ADDRESS` in `.env` (see table below)
2. Restart the API (`npm run start:dev`)
3. On each wallet: **enable** the new module on-chain
4. **Re-register guardians** on that same module address
5. Create a **new** recovery request (in-flight recoveries on the old module keep the old period)

| Env | Period | `SAFE_RECOVERY_MODULE_ADDRESS` |
| --- | --- | --- |
| Fast test (testnets*) | ~3 minutes | `0x949d01d424bE050D09C16025dd007CB59b3A8c66` |
| Production (recommended) | 3 days | `0x38275826E1933303E508433dD5f289315Da2541c` |
| Stricter production | 7 days | `0x088f6cfD8BB1dDb1BB069CCb3fc1A98927D233f2` |
| Default (unset) | 14 days (Safe official) | `0x4Aa5Bf7D840aC607cb5BD3249e6Af6FC86C04897` |

\*Candide documents the 3-minute module as **testnets only**. On Base mainnet prefer **3 days** for production.

| Period | Typical use | Docs |
| --- | --- | --- |
| 3 minutes | Testnets only | [Candide deployments](https://docs.candide.dev/wallet/technical-reference/deployments/) |
| 3 / 7 / 14 days | Production (3 days recommended UX/security balance) | [Grace period selector](https://docs.candide.dev/wallet/plugins/recovery-service-sdk-reference/) |
| 14 days (Safe official) | Default in this repo | [Safe modules changelog](https://github.com/safe-global/safe-modules/blob/main/modules/recovery/CHANGELOG.md) |

External references:

- [Candide SocialRecoveryModule SDK](https://docs.candide.dev/wallet/plugins/recovery-module-reference/)
- [Candide recovery service SDK (grace selectors + addresses)](https://docs.candide.dev/wallet/plugins/recovery-service-sdk-reference/)
- [Candide contract deployments by chain](https://docs.candide.dev/wallet/technical-reference/deployments/)
- [Safe Foundation — Candide social recovery](https://safefoundation.org/blog/introducing-candides-social-recovery)
- [Safe social recovery module changelog (14-day official deploy)](https://github.com/safe-global/safe-modules/blob/main/modules/recovery/CHANGELOG.md)


```Bash
curl -X POST \
  -H "content-type: application/json" \
  -H "accept: application/json" \
  https://stg-api-veyropay.quecko.org/api/v1/system/admin/clear-database \
  -d '{"password":"Delete@Db"}'
```