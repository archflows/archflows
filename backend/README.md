# ArcFlow backend

Express + PostgreSQL API for the ArcFlow modules (hard lock, linear vest, stream, airdrop, escrow, staking). The frontend talks to this service with an API key. Writes are an index of on-chain activity — they do not replace wallet transactions.

## Setup

```bash
cp .env.example .env
# set DATABASE_URL, API_KEY, CORS_ORIGINS, and the same contract addresses as web/.env
npm install
npm run migrate
npm run dev
```

Listens on `PORT` (default `4000`). Schema is also applied on boot.

## Swagger

Open `http://localhost:4000/docs` (OpenAPI JSON at `/docs.json`). Logins live in Postgres `docs_users` and are seeded from env:

```
SWAGGER_USER=
SWAGGER_PASSWORD=
SWAGGER_PARTNER_USER=partner
SWAGGER_PARTNER_PASSWORD=
```

Add more with an admin API key: `POST /v1/docs-users` `{ "username", "password", "role": "partner" }`. List/revoke via `GET /v1/docs-users` and `PATCH /v1/docs-users/:id`. If no active docs user exists, `/docs` returns 503. Sign out at `/docs/logout`. Use **Authorize** in Swagger to send `x-api-key` for `/v1` routes.

## Auth

Public API keys live in Postgres table `api_keys` (`secret`, `role`, `active`). The backend looks up the incoming key there — env is only used to **seed** rows on boot.

Send one of:

- `x-api-key: <key>`
- `Authorization: Bearer <key>`

`API_KEY` / `API_KEYS` seed `role=client` (the web app). `ADMIN_API_KEY` seeds `role=admin` for issuing more public keys:

- `GET /v1/keys` — list stored keys (admin)
- `POST /v1/keys` `{ "name": "partner", "role": "client" }` — create and persist a key (admin)
- `PATCH /v1/keys/:id` `{ "active": false }` — revoke (admin)

`/health` and `/ready` are public.

`/v1` has a loose **per-IP** rate limit (default 600 requests / 60 seconds). The shared client key is not used as the bucket, so one user cannot throttle everyone. Tune with `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`, or set `RATE_LIMIT_MAX=0` to turn it off. A `429` looks like `{ "ok": false, "error": { "code": "rate_limited", ... } }`.

## CORS

`CORS_ORIGINS` is a comma-separated allowlist (`http://localhost:3000,https://app.example.com`) or `*` for any origin.

## Contract addresses

Copied from the same env names as `web/.env` and returned by `GET /v1/config`:

- `NEXT_PUBLIC_ARCFLOW_ADDRESS` (lock / vest vault)
- `NEXT_PUBLIC_ARCFLOW_STREAM_ADDRESS`
- `NEXT_PUBLIC_ARCFLOW_DISTRIBUTOR_ADDRESS`
- `NEXT_PUBLIC_ARCFLOW_ESCROW_ADDRESS`
- `NEXT_PUBLIC_ARCFLOW_STAKING_ADDRESS`
- `ARCFLOW_TREASURY`

Aliases without `NEXT_PUBLIC_` also work. Change them in `.env` and restart.

## Endpoints

All `/v1/*` responses are JSON: `{ "ok": true, "data": ... }` or `{ "ok": false, "error": { "code", "message" } }`.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | liveness + Postgres status (`database.status`, `database.ms`) |
| GET | `/ready` | Postgres ping |
| GET | `/v1/config` | chain + contract addresses |
| GET/POST | `/v1/locks` | hard lock + vest (`kind` auto: cliff==end → lock) |
| GET/PATCH | `/v1/locks/:id` | |
| GET/POST | `/v1/streams` | |
| POST | `/v1/streams/batch` | up to 200 (payroll) |
| GET/PATCH | `/v1/streams/:id` | |
| GET/POST | `/v1/campaigns` | airdrops |
| GET/PATCH | `/v1/campaigns/:id` | |
| GET/POST | `/v1/campaigns/:id/claims` | |
| GET/POST | `/v1/escrow` | |
| GET/PATCH | `/v1/escrow/:id` | `status`: open / released / refunded |
| GET/POST | `/v1/pools` | staking |
| GET/PATCH | `/v1/pools/:id` | |
| GET/POST | `/v1/pools/:id/stakes` | |

List queries accept `limit` (max 200), `offset`, and address filters (`creator`, `beneficiary`, `sender`, `token`, …). Amounts stay integer strings (uint128). Addresses are stored lowercase.

Lock fee is **$10 USDC flat** (`10000000` in 6-decimal units), matching the vault. Stream / airdrop / escrow / staking have no protocol fee.

## Concurrency

- Async Express handlers; the event loop is never blocked on I/O
- `pg` connection pool (`PG_POOL_MAX`, default 20)
- List + count run in parallel
- Optional `CLUSTER_WORKERS=N` forks Node workers for multi-core
