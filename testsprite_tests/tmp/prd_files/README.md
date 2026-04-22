# Siap Tempur

Siap Tempur is a Next.js application for CPNS and kedinasan exam preparation. The product centers on SKD tryout flows with CAT-style timing, scoring, progress tracking, leaderboard views, profile management, and payment integration.

## Stack

- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase for auth, database, and storage
- Midtrans for payment flow

## Main Areas

- Public landing page at `/cpns`
- Authentication: login, register, forgot password, reset password
- Participant dashboard for tryout access, rankings, history, and profile
- Admin pages for question and tryout configuration management
- Server actions under `app/actions`
- API routes under `app/api`
- Supabase schema, migrations, and seed files under `supabase`

## Prerequisites

- Node.js 20+
- npm
- Supabase CLI if you want to run the local Supabase stack

## Environment Variables

Create `.env.local` with the variables used by the app:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MIDTRANS_SERVER_KEY=
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=
MIDTRANS_SERVER_KEY_SANDBOX=
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY_SANDBOX=
E2E_ADMIN_EMAIL=
E2E_ADMIN_PASSWORD=
E2E_PARTICIPANT_EMAIL=
E2E_PARTICIPANT_PASSWORD=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` is required for the existing script-based integration test.
- `NEXT_PUBLIC_SITE_URL` is used by auth redirects. If it is not set, some flows fall back to `http://localhost:3000`.
- Do not commit real secrets.

## Install

```bash
npm install
```

## Run The App

Development:

```bash
npm run dev
```

Production-like local run:

```bash
npm run build
npm run start
```

The app is expected to run on `http://localhost:3000`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test:cpns-resume
```

## Supabase Workflow

This repo includes a local Supabase configuration in [supabase/config.toml](/b:/projects/siap-tempur/supabase/config.toml).

Useful commands if you want to work against local Supabase:

```bash
supabase start
supabase db reset
```

Important detail:

- The checked-in `.env.local` may point to a hosted Supabase project. If you switch to local Supabase, update the env values to the local API and keys before running the app or tests.

## Existing Test Coverage

There is one repo-owned script-based integration check:

```bash
npm run test:cpns-resume
```

What it validates:

- test user creation through Supabase admin APIs
- profile creation trigger
- tryout session start
- placeholder answer generation
- progress persistence and resume behavior
- session completion and cleanup

This test depends on:

- reachable Supabase project
- valid `NEXT_PUBLIC_SUPABASE_URL`
- valid `SUPABASE_SERVICE_ROLE_KEY`

## TestSprite

This project is suitable for frontend TestSprite runs on port `3000`.

Recommended flow:

1. Start the app locally.
2. Prefer production mode for more stable browser automation:

```bash
npm run build
npm run start
```

3. Then generate and execute the TestSprite suite against the running app.

Current assumptions for TestSprite:

- project type: `frontend`
- app port: `3000`
- framework: Next.js

## Project Structure

```text
app/                App Router pages, layouts, actions, and API routes
components/         UI, dashboard, admin, profile, practice, and home components
lib/                shared business logic and helpers
public/             static assets
scripts/            standalone project scripts
supabase/           config, schema, seed data, and migrations
tests/              project test assets if added later
types/              shared TypeScript definitions
utils/              Supabase and admin helper modules
load-test/          k6 and load test utilities
```

## Operational Notes

- The root route redirects permanently to `/cpns`.
- Some flows depend on external services, especially Supabase and Midtrans.
- Content Security Policy and remote image rules are configured in [next.config.ts](/b:/projects/siap-tempur/next.config.ts).

## Deployment

The repo includes deployment-related files for Netlify and Vercel:

- [netlify.toml](/b:/projects/siap-tempur/netlify.toml)
- [vercel.json](/b:/projects/siap-tempur/vercel.json)

Before deploying, verify:

- production Supabase keys
- production Midtrans keys
- correct site URL for auth redirects
