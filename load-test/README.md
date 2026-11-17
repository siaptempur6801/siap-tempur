# Staging load checks

These scripts use Schema V2 `exams` and the owner-scoped learner quota RPC. The
legacy `tryouts` table and `get_tryout_question_counts` RPC are not used.

Defaults are smoke checks: one virtual user and three iterations. No script
creates answers, attempts, payments, or accounts. The Supabase target must be
`https://lpgrivowdcepcxradavu.supabase.co`; production is rejected before requests.

## Environment

Supply values through the test process environment, not command-line arguments:

- `NEXT_PUBLIC_SUPABASE_URL`: approved staging URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- `LOAD_TEST_LEARNER_JWT`: disposable staging learner access token from the CI
  fixture harness, required for database scripts. It must have role
  `authenticated`, `user_metadata.ci_e2e=true`, and the staging auth issuer. A
  service-role token is rejected. Supabase still validates the token and RLS.
- `LOAD_TEST_EXAM_IDS`: comma-separated fixture catalog exam IDs, required by 03.
- `BASE_URL`: local application URL, default `http://127.0.0.1:3100`, for 01 only.

```sh
k6 run load-test/01_public_pages.js
k6 run load-test/02_supabase_api.js
k6 run load-test/03_supabase_stress.js
k6 run load-test/debug_metrics.js
```

A publishable key is an API key, never a Bearer JWT. Anonymous catalog reads are
intentionally denied by RLS; provision an isolated learner through the existing
staging-only CI helpers and clean up that fixture afterward.

Remote application tests require an explicitly approved HTTPS origin through
`LOAD_TEST_APPROVED_STAGING_ORIGIN`, and its `/api/health` must identify a preview
or staging deployment. Production Siap Tempur domains are always rejected.

The bounded 5–10 VU ramp requires both `LOAD_TEST_STRESS=1` and
`LOAD_TEST_ALLOW_STAGING=1`. Set them only after the staging owner approves the
traffic and fixture dataset. No stress run is part of the default smoke command.
The PowerShell runner follows the same rules and does not print API credentials.

Successful smoke results do not establish production capacity. Before an
approved concurrent run, capture database query latency, connection utilization,
function duration, bandwidth, error rate, and P50/P95/P99 with representative
fixtures and coordinate other staging users.
