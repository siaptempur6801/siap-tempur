# Production Cutover Completion — Schema V2

> ℹ️ **Catatan status:** cutover database selesai. **Eksposur publik (domain `siaptempur.id`) sengaja ditahan** karena project belum dinilai siap.
> Status terkini & blocker: [`docs/STATUS.md`](./STATUS.md).

Status: **COMPLETE / ACCEPTED**

Cutover completion date: **2026-09-01**

Production scope: **CPNS/SKD + TKA SMP + Unified Admin + Commerce/Event**

Deferred from this release: **TKA SD, SMA, and SMK**

## Release identity

- Production release branch at cutover: `chore/production-cutover-readiness-v1`
- Final verified source SHA: `bc2159d2e3d820f0b615be9e0b8168080aa4e8e7`
- Final promoted Vercel Production deployment: `dpl_GCyotX48Hy7Te3tLS7MxjZSTz4K3`
- Production Supabase project ref: `llnttutwhtvxtdktiizo`
- Canonical integration branch: `feat/schema-v2`

The pre-cutover readiness document remains preserved as historical evidence. This document records the actual post-cutover state.

## Final production outcome

Schema V2 is live in Production. The legacy `public` schema was archived to `legacy_prod` and the canonical Schema V2 runtime became the active `public` schema.

Final verified runtime target:

| Category | Count | Fingerprint |
| --- | ---: | --- |
| public tables | 98 | `31c5755439cc95afaa6048926bb45f23` |
| columns | 823 | `18bf18549161ffc7c28772fa6bd48771` |
| constraints | 369 | `18ea88a6124dcaa216afa16e410cdce8` |
| indexes | 368 | `1788349683b55f78fabdb8e986b60d52` |
| runtime functions | 80 | `e147d38d3801ac4c02ad41e21c02fe2a` |
| public triggers | 11 | `96b6d77f0c85d8a977cb18d5e1b108bc` |
| RLS policies | 95 | `23530b7447a51944807e82e3231c3c68` |
| sequences | 2 | `ae1743f34f7a1648e378e6d346eef986` |
| function ACL | 166 | `fbfcd289d78e77af89e5d9117e8af833` |
| schema ACL | 10 | `28854a5ad42ca691a4c5700a9b8c3da7` |
| table ACL | 1659 | `c5fdcbcef6ef9ea81401b3b513c63d36` |

All 98 canonical public tables have RLS enabled. FORCE RLS count is 0.

## Data preservation gates

The final production migration gate passed with the expected historical data preserved.

Key verified counts after cutover:

- 426 real production users preserved
- 430 user-program rows
- quota/wallet aggregate: 5,090
- 476 historical sessions; 426 completed
- 16,889 historical answers
- 1,273 subject-score rows
- completed score total: 88,239
- TWK: 21,365
- TIU: 22,255
- TKP: 44,603
- commerce orders/payments migrated: 322
- migrated commerce amount: Rp8,535,630
- settlement: 50
- expire: 272
- event participants: 104
- orphan checks: 0

Two technical cutover actors were intentionally added for migration/audit ownership and are not counted as real production users.

## Authentication and application smoke tests

Post-cutover verification passed for:

- Google OAuth login
- Supabase Auth external-provider redirect
- Production database connectivity
- homepage and primary application routes
- CPNS/SKD access
- TKA SMP access
- Unified Admin access paths
- leaderboard database check
- `/api/health` with `env=true`, `database=true`, and `leaderboard=true`

The health endpoint currently does not expose a populated deployment commit SHA. Exact release identity is therefore verified from Vercel deployment metadata, not from the health payload alone.

## Payment reconciliation incident and resolution

Post-cutover monitoring identified a payment reconciliation regression that did not appear in the initial smoke test.

### Root cause

The reconciliation cron initially referenced legacy payment tables. After moving to canonical `orders` and `payments`, additional Midtrans transaction statuses exposed an incomplete provider-status whitelist.

### Final fix

The final payment implementation:

- reconciles canonical `payments` + `orders`
- uses the shared payment service instead of duplicate legacy logic
- centralizes Midtrans status handling
- normalizes provider status casing/whitespace
- maps provider statuses to canonical order/payment outcomes
- retains safe handling for provider status lookup failures
- keeps webhook and cron status handling aligned

Final reconciliation verification at `2026-09-01T03:56:55Z`:

```text
checked: 2
settled: 0
expired: 2
pending: 0
skipped: 0
failed: 0
```

Database verification immediately afterward showed **0 pending Midtrans payments**. The two outstanding test-era pending records were correctly normalized to `payment=expire` and `order=expired`.

No real Production payment was created solely for cutover verification.

## Credential remediation

A Production database credential was rotated during cutover. The corresponding Production Vercel database environment variables were updated and the application was redeployed successfully afterward.

No secret values are recorded in this repository or in this document.

## Rollback and retention

`legacy_prod` remains the rollback source and must not be deleted during the stabilization window.

Retention policy for this release:

1. Keep `legacy_prod` intact for at least several days after acceptance; seven days is the preferred minimum unless storage or an incident requires a different decision.
2. Do not perform an ad-hoc rollback by blindly renaming every `legacy_prod` object into `public`; migration helper/metadata tables must be excluded according to the cutover runbook.
3. Remove `legacy_prod` only after Production stability, backup confidence, and rollback retirement are explicitly accepted.

## Post-cutover monitoring

A 24-hour Production watch was created to surface meaningful health, authentication, database, and runtime regressions. The watch is an observation period, not a requirement to freeze all source-control housekeeping.

During the observation window:

- documentation and Git housekeeping are allowed
- low-risk source-control merges are allowed when they do not intentionally change Production runtime
- avoid new schema migrations, destructive cleanup, major environment changes, and deletion of rollback assets

## Deferred housekeeping

The following items are deliberately non-blocking and should be handled separately:

- review `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` environment scope
- split or review `CRON_SECRET` scope between Production and Preview
- decide when to remove `legacy_prod`
- delete obsolete release/cutover branches after the final release PR is merged
- create a formal GitHub tag/release if desired
- continue TKA SD/SMA/SMK as later milestones

## Final acceptance

The Schema V2 production cutover is **accepted**. Production is operating on canonical Schema V2, authentication is functioning, final payment reconciliation is healthy, and the legacy schema is retained as a rollback safety net.
