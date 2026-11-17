# Siap Tempur

Siap Tempur is a Next.js learning platform for CPNS/SKD and TKA (school-level assessment) preparation. The app focuses on practice workflows, structured learning content, test readiness, and Supabase-backed product features.

## Highlights

- CPNS/SKD and TKA practice: drill, mini tryout, full tryout, results and explanations
- Events, certificates, token wallet and Midtrans payments
- Organization (instansi) batches with monitoring and XLSX export
- Unified admin workspace with permission-based access
- Production domain: `siaptempur.id`

## Tech Stack

- Next.js 16 (App Router, `proxy.ts` for CSP nonce, session refresh and CSRF cookie)
- React 19, TypeScript, Tailwind CSS 4
- Supabase (Auth, Postgres with RLS/RPC, Storage)
- Midtrans (Snap, webhook, daily reconciliation cron)
- Upstash Redis (shared rate limiting)
- Vitest (unit) and Playwright (E2E)

## Repository Structure

- `app/`: routes, layouts, server actions (`app/actions/`) and route handlers (`app/api/`)
- `components/`: UI components
- `lib/`: shared utilities (env, CSRF, sanitization, rate limiting, Supabase clients)
- `src/`: domain layer (`auth/`, `domain/`, `repositories/`, `services/`, `tka/`)
- `types/`: generated Supabase types and declarations
- `supabase/`: migrations, Edge Functions and config
- `scripts/`: cutover bootstrap SQL, local gates and operational scripts
- `tests/unit/` (Vitest), `tests/e2e/` and `playwright/` (Playwright)
- `load-test/`: k6 scripts, staging only
- `docs/`: documentation; start with [`docs/STATUS.md`](docs/STATUS.md)

## Development

```bash
npm ci
npm run dev
```

Copy the variables listed in [`docs/production-readiness.md`](docs/production-readiness.md) into `.env.local`. Local development points at the staging Supabase project; never use production credentials locally.

## Checks

Run these before opening a pull request:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
```

E2E, schema parity and staging gates are described in [`docs/LOCAL_STAGING_GATES.md`](docs/LOCAL_STAGING_GATES.md) and [`docs/production-readiness.md`](docs/production-readiness.md).

## Status

Release status, open blockers and the public-domain gate are tracked only in [`docs/STATUS.md`](docs/STATUS.md). Work rules for developers and AI agents are in [`AGENTS.md`](AGENTS.md).
