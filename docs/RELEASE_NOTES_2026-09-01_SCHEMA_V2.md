# Release Notes — Production V1 / Schema V2

> ℹ️ **Catatan status:** "Production accepted" di sini berarti cutover database/runtime Schema V2 selesai.
> **Domain publik sengaja tidak diaktifkan** (dark launch).
> Status terkini & blocker: [`docs/STATUS.md`](./STATUS.md).

Release date: **2026-09-01**

Status: **Production accepted**

## Overview

This release moves SiapTempur.id to the canonical Schema V2 application/runtime and establishes the Production V1 baseline for CPNS/SKD, TKA SMP, Unified Admin, commerce, events, and post-exam learning flows.

## User-facing highlights

### CPNS / SKD

- Canonical CPNS/SKD exam and practice flows run on Schema V2 services.
- Existing historical sessions, answers, and scores were preserved through cutover.
- Drill, Mini Tryout, Full Tryout, result review, history, profile, leaderboard, and event-related paths are aligned to the canonical runtime.
- Historical CPNS question migration preserves reviewed mappings and keeps unresolved legacy mappings out of automatic canonical publication.

### TKA SMP

Production V1 introduces the TKA SMP learning track with the canonical assessment model, including:

- practice/drill flows
- mini/full exam flows
- progress dashboard
- wrong-question mode
- automatic remedial
- weakest-topic learning focus
- readiness score
- TKA SMP pass catalog and access contract

TKA SD, SMA, and SMK are not part of this Production V1 release.

### Unified Admin

Administration is consolidated into the Schema V2 admin workspace, covering the primary operational areas for:

- assessment/exam management
- question/content review
- articles/content
- events
- commerce/products
- operational overview

Legacy CPNS admin routes are progressively redirected or backed by canonical services rather than maintaining a second independent data model.

### Commerce and payments

- Canonical commerce uses `orders` and `payments`.
- Payment fulfillment is handled through shared Schema V2 services.
- Midtrans webhook handling and scheduled reconciliation use centralized provider-status normalization.
- Reconciliation no longer depends on legacy `transactions` / `event_payments` tables.
- Expired, failed, refunded, and other provider outcomes are normalized into safe canonical states.

## Platform and engineering changes

### Canonical Schema V2 runtime

Production now uses the reviewed canonical runtime with:

- 98 public tables
- 823 columns
- 369 constraints
- 368 indexes
- 80 runtime functions
- 95 RLS policies
- 11 public triggers
- 2 sequences

All 98 public tables have RLS enabled.

### Service architecture

A service/repository layer now owns key business flows, including:

- assessment attempts and scoring
- catalog/configured exams
- profiles and authorization
- user tracks and progress
- commerce and fulfillment
- payments
- events and rankings
- TKA learning, remedial, readiness, and wrong-question workflows

This reduces direct dependency on legacy table-specific application code and creates a cleaner foundation for later tracks.

### Release and QA tooling

The release adds or strengthens:

- Schema V2 CI
- CPNS staging E2E
- TKA staging E2E
- Unified Admin E2E
- content-review E2E
- production-clone rehearsal tooling
- production cutover preflight and runtime fingerprint verification
- source-controlled canonical runtime bootstrap fragments
- payment reconciliation unit coverage

The final payment hotfix head passed lint, TypeScript, unit tests, security audit, production build, and E2E before promotion.

## Migration result

The production cutover preserved the existing business history while replacing the active runtime schema.

Verified production data includes:

- 426 real production users
- 476 historical sessions
- 426 completed sessions
- 16,889 answers
- 1,273 subject score rows
- 322 migrated commerce/payment records
- Rp8,535,630 migrated commerce value
- 104 event participants
- zero verified migration orphans

The previous Production schema remains archived under `legacy_prod` during the rollback-retention window.

## Post-release payment reliability fix

Monitoring after the initial cutover found a payment reconciliation regression caused first by legacy-table references and then by incomplete provider status handling.

The issue was fixed before release housekeeping was closed. Final Production reconciliation reported:

```text
checked: 2
settled: 0
expired: 2
pending: 0
skipped: 0
failed: 0
```

A direct database verification afterward showed zero pending Midtrans payments.

## Security and operations

- Production database credentials were rotated during cutover and dependent Production environment values were updated.
- No credential values are included in source control.
- Google OAuth was revalidated after cutover and credential rotation.
- Production health checks report environment, database, and leaderboard checks healthy.
- `legacy_prod` remains intentionally retained as the rollback safety source.

## Known follow-ups

These items are outside the release blocker set:

- complete the 24-hour Production observation window
- review Midtrans client-key environment scope
- review/split cron secret scope between environments
- retire `legacy_prod` only after explicit rollback-retention acceptance
- remove obsolete merged branches after the final mainline release is complete
- optionally publish a GitHub tag/release from the final `main` merge commit

## Source identity

Cutover-tested Production source prior to release-document commits:

`bc2159d2e3d820f0b615be9e0b8168080aa4e8e7`

The release documentation commits are source-control-only follow-ups and do not change the accepted Production application behavior.
