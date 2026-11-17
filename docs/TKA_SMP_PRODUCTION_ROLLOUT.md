# TKA SMP — Production Rollout Plan

> ⚠️ **HISTORIS — bukan sumber kebenaran status.**
> Rencana ini ditulis pra-rollout; TKA SMP sudah termasuk Production V1 (cutover 2026-09-01).
> Status terkini: [`docs/STATUS.md`](./STATUS.md).

Status: **PRE-PRODUCTION / NO-GO by default**  
Scope: promote the validated TKA SMP Schema V2 flow from staging to production **without touching production until every gate below is explicitly approved**.

## 1. Non-negotiable safety rules

- Production Supabase project ref: `llnttutwhtvxtdktiizo`.
- Staging Supabase project ref: `lpgrivowdcepcxradavu`.
- Never point a preview/staging deployment at the production Supabase project.
- Never run ad-hoc DDL on production. DDL must come from version-controlled migrations in `supabase/migrations`.
- Never copy staging Auth users, attempts, payments, or QA data to production.
- Do not enable payment/Tempur Pass as part of the first TKA SMP rollout.
- Do not merge/push directly to `main` as a shortcut around failed checks.
- A production database change requires a separate explicit go/no-go decision immediately before execution.

## 2. Release gates

All gates must be green before production migration work begins.

### Code & QA

- [ ] `npm run lint` passes with 0 errors.
- [ ] `npm run typecheck` passes.
- [ ] unit tests pass.
- [ ] production build passes.
- [ ] existing public Playwright smoke suite passes.
- [ ] TKA SMP disposable-user staging E2E passes at least 3 consecutive runs.
- [ ] manual authenticated staging smoke passes after the final release candidate build.
- [ ] no relevant Vercel runtime error/fatal logs during staging smoke.

### TKA data integrity

- [ ] 300 TKA SMP questions remain `approved`/eligible in staging.
- [ ] Full exam contains exactly 60 frozen items: 30 BIN + 30 MAT.
- [ ] section durations remain 4,500 seconds each.
- [ ] question-version locks have 0 mismatches.
- [ ] no duplicate selected questions in generated exam.
- [ ] answer keys and explanations are unavailable during an in-progress attempt.
- [ ] result/review access is denied before completion.
- [ ] direct early-submit and inactive-track bypass tests remain blocked.

### Operations

- [ ] production database backup/PITR capability is verified.
- [ ] production environment variable inventory is reviewed by two people or reviewed twice at separate times.
- [ ] a rollback owner and release owner are named.
- [ ] release window avoids an active CPNS event/tryout peak.

## 3. Environment matrix

| Environment | Vercel | Supabase ref | TKA full exam |
| --- | --- | --- | --- |
| Local | local | staging/local only | test |
| Preview | preview | `lpgrivowdcepcxradavu` | staging pilot |
| Schema V2 staging | preview branch | `lpgrivowdcepcxradavu` | enabled for QA |
| Production before rollout | production | `llnttutwhtvxtdktiizo` | existing behavior / disabled for new RPC path |
| Production after go-live | production | `llnttutwhtvxtdktiizo` | enabled only after DB + internal smoke |

Before any production deployment, verify that `APP_ENV=production`/`VERCEL_ENV=production` and the Supabase URL resolves to exactly `llnttutwhtvxtdktiizo`.

## 4. Migration inventory and dry run

Do this **before** applying anything to production.

1. Export/list migration history from staging and production.
2. Build an ordered list of migrations present in staging/repo but absent from production.
3. For every pending migration classify it as:
   - additive DDL,
   - function/RPC replacement,
   - RLS/grant change,
   - index/constraint,
   - seed/DML,
   - destructive/irreversible.
4. Any destructive migration is an automatic NO-GO until rewritten as an expand/contract or forward-fix migration.
5. Review every `SECURITY DEFINER` function for:
   - `auth.uid()` / permission checks,
   - fixed `search_path`,
   - no `PUBLIC`/`anon` execute unless intentional,
   - ownership and grants.
6. Verify migration SQL in a fresh disposable database/branch when available.
7. Record expected row/object counts before and after each data migration.

Required release artifact:

```text
Pending production migrations
1. <version> <name>  [DDL/RPC/RLS/etc]  reversible? yes/no
2. ...

Expected changes
- tables/functions/policies added or replaced
- rows seeded
- indexes created

Explicitly unchanged
- existing CPNS content
- production Auth users
- payments/orders
- active attempts
```

No production migration is executed during this inventory step.

## 5. Production rollout sequence

### Phase A — Code compatibility first

1. Create a release PR from the stabilized Schema V2 branch to `main`.
2. Require green CI and Vercel preview.
3. Confirm new TKA RPC path remains production-gated/disabled until its required database objects exist.
4. Merge/deploy compatibility code only when it is safe against the **current** production schema.
5. Verify existing CPNS login, dashboard, active tryout, result, admin, and payment webhook health.

If the code cannot safely run against the current production schema, combine Phase A and B in a controlled maintenance window rather than deploying incompatible code early.

### Phase B — Database migrations

Only after an explicit production approval:

1. Capture production migration version and health metrics.
2. Confirm backup/PITR immediately before change.
3. Apply **only** reviewed version-controlled pending migrations, in order.
4. Stop immediately on the first unexpected error; do not skip a failed migration.
5. Verify:
   - schema objects,
   - RPC signatures,
   - function grants,
   - RLS policies,
   - indexes/constraints,
   - CPNS read/write smoke.
6. Do not seed the 300-question bank until structural verification passes.

### Phase C — TKA catalog/content seed

1. Seed TKA program/track/period/subjects/blueprint only from reviewed idempotent data migrations/scripts.
2. Validate counts and referential integrity.
3. Seed TKA SMP question bank/version snapshots/review state as a separate controlled step.
4. Validate production target counts before enabling user access.
5. Keep payment/Tempur Pass disabled for this phase.

### Phase D — Internal production smoke

Use a dedicated internal production QA account, never a real learner account.

Test:

```text
login
→ activate TKA/SMP track
→ open TKA SMP
→ start full tryout
→ answer single/multiple/category
→ refresh/resume
→ complete BIN
→ verify BIN locked
→ MAT active with new timer
→ submit
→ result
→ review/pembahasan
```

Also verify negative paths:

- inactive track cannot start,
- early submit is rejected,
- result/review is hidden before completion,
- answer keys are absent from in-progress frontend responses,
- another user cannot read the attempt.

Delete/disable the internal QA account and its attempts if policy requires cleanup.

### Phase E — Controlled enablement

1. Enable TKA SMP for internal/admin cohort only.
2. Observe for at least one normal test window.
3. Expand to a small real-user cohort if metrics remain healthy.
4. Enable general access.
5. Monetization/Tempur Pass/payment integration is a **separate release** after free/full-exam stability is proven.

## 6. Observability during rollout

Watch at minimum:

- Vercel 5xx / server action failures,
- Supabase Postgres errors and connection pressure,
- RPC failure rate for the 7 TKA exam RPCs,
- attempt starts vs completions,
- autosave failures,
- section-transition failures,
- scoring/result generation failures,
- Auth failures,
- CPNS regression metrics,
- database CPU/IO and slow queries.

Suggested release checkpoints:

- T+5 min
- T+30 min
- T+2 h
- T+24 h

## 7. Rollback strategy

Prefer **disable + forward-fix** over destructive database down-migrations.

### Application rollback

1. Disable the TKA SMP feature/path first.
2. Roll Vercel back to the previous known-good production deployment if needed.
3. Confirm CPNS and Auth health after rollback.

### Database rollback

- Do not drop new tables/columns/functions merely because application code was rolled back; additive unused objects are safer than destructive rollback.
- For a faulty function/RLS policy, deploy a reviewed forward-fix migration restoring the previous safe definition.
- For bad seed data, use a targeted, reviewed cleanup keyed by stable program/track/batch identifiers. Never broad-delete production rows.
- Use PITR only for severe database-wide corruption and only with an explicit incident decision, because PITR also rewinds unrelated production writes.

### Emergency kill switch

The release must retain a way to make the new TKA full-exam path unavailable without deleting data. A feature flag/environment gate is preferred. Disabling the feature must not invalidate existing CPNS flows.

## 8. Final go/no-go checklist

### GO only if all are true

- [ ] CI fully green.
- [ ] staging E2E green 3 consecutive times.
- [ ] manual release-candidate smoke green.
- [ ] production migration diff reviewed and documented.
- [ ] backup/PITR verified.
- [ ] no destructive unreviewed migration.
- [ ] production secrets/env matrix verified.
- [ ] rollback path verified.
- [ ] monitoring owner available during release window.

### Automatic NO-GO

- any lint/type/build/E2E failure,
- staging using production Supabase or vice versa,
- unknown migration drift,
- unanswered security advisor issue affecting TKA exposed tables/RPCs,
- failure to reproduce section locking or answer-key protection,
- active production incident,
- inability to roll back/disable the feature.

## 9. Current action boundary

This document is planning only. Creating or merging the stabilization PR, running staging CI/E2E, and inspecting migration differences are allowed pre-production steps. **Applying a migration, seed, or configuration change to `llnttutwhtvxtdktiizo` is outside this plan until a separate explicit production approval is given.**
