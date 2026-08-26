# Siap Tempur — Production-Clone Rehearsal

> Milestone: ⑤ Production-Clone Rehearsal
> Integration base: `feat/schema-v2`
> Source production project: `llnttutwhtvxtdktiizo` (`Siap Tempur SG`)
> Canonical staging project: `lpgrivowdcepcxradavu` (`Siap Tempur Staging`)
> Safety rule: production is READ-ONLY for this milestone.

## Goal

Prove that the current production data can be moved into the canonical Schema V2 model without losing user identity, exam history, scores, balances, payment history, or event participation, and prove that rollback is possible before any production cutover.

This milestone is a hard prerequisite for the final release-candidate E2E and production cutover.

## Rehearsal topology

1. Production (`llnttutwhtvxtdktiizo`) remains the read-only source of truth.
2. A disposable Supabase branch is created from canonical staging (`lpgrivowdcepcxradavu`) so the target starts with the exact Schema V2 migrations/master catalog used by the application.
3. Production data is copied/transformed into the disposable target only.
4. Reconciliation is performed using row counts, FK/orphan checks, aggregate totals, and non-PII deterministic hashes.
5. Rollback rehearsal destroys/resets only the disposable target. Production is never modified.

## Production baseline — 2026-08-26

### Identity and access

- Auth users: `426`
- Profiles: `426`
- Matching `auth.users.id = profiles.id`: `426`
- Auth users without profile: `0`
- Profiles without auth user: `0`
- User-program rows: `430`
- Distinct users with program: `426`
- Profile CPNS quota sum: `5090`
- User-program quota sum: `5090`

Program enrollment snapshot:

- CPNS: `426` users, quota sum `5090`
- TKA SD: `2` users
- TKA SMP: `1` user
- TKA SMA: `1` user

### Exam history

- Test sessions: `476`
- Completed sessions: `426`
- Non-completed sessions: `50`
- Answers: `16889`
- Subject score rows: `1273`
- Orphan session users: `0`
- Orphan answers → sessions: `0`
- Orphan answers → questions: `0`
- Orphan subject scores → sessions: `0`
- Completed total-score sum: `88239`
- Completed TWK score sum: `21365`
- Completed TIU score sum: `22255`
- Completed TKP score sum: `44603`

### Commerce and events

- Transactions: `258`
- Transaction amount sum: `6295630`
  - `settlement`: `19`
  - `expire`: `239`
- Event payments: `64`
- Event payment amount sum: `2240000`
  - `settlement`: `31`
  - `expire`: `33`
- Event participants: `104`
- Voucher claims: `310`
- Token-ledger rows: `0`
- Orphan transaction users: `0`
- Orphan event-payment users: `0`
- Orphan event-participant users: `0`

## Non-PII source fingerprints

These hashes must be regenerated immediately before the real cutover. They are recorded here only as the rehearsal baseline.

- Auth user ID hash: `aba71998de87af045ca2fbc65c9b82eb`
- Profile/quota hash: `b02379b4056903c5ad5a09971df5a2b9`
- Session/score hash: `b94db0fdf0fa3aadf8df9331114dd8bd`
- Answer hash: `ff5048c26f8af5f112d2e45faf37679a`
- Transaction hash: `5d21ca2bd700a8515df48edabc7c909c`
- Event-payment hash: `433b67a09f9f3673bfa6703813e7cedf`

## Canonical mapping contract

### Identity

- Preserve every production `auth.users.id` UUID.
- Create canonical `profiles.id` with the same UUID.
- Preserve profile timestamps and supported profile fields.
- No production email/password value is required for reconciliation output; reports must remain non-PII.

### Program access

- Legacy `programs.slug=cpns` → canonical `CPNS / SKD` track.
- Legacy `tka-sd` → canonical `TKA / SD`.
- Legacy `tka-smp` → canonical `TKA / SMP`.
- Legacy `tka-sma` → canonical `TKA / SMA`.
- Legacy CPNS `tryout_quota` must reconcile to the canonical wallet/access representation without changing the total balance (`5090`).

### Exam history

- Legacy `test_sessions` → canonical `exam_attempts`.
- Legacy ordered `test_answers` → `attempt_questions` + `attempt_answers` (+ `attempt_answer_options` where applicable).
- Legacy `session_subject_scores` → canonical `attempt_scores` subject rows.
- Preserve legacy session IDs in deterministic migration metadata/source references even when the canonical PK is regenerated.
- Completed/in-progress state and total/TWK/TIU/TKP score aggregates must reconcile exactly.

### Commerce

- Legacy `transactions` and `event_payments` are immutable historical payment source records.
- Preserve order IDs/provider references, amount, status, and timestamps.
- Canonical `orders/payments` must reconcile both row counts and amount/status aggregates.
- Settled historical purchases must produce equivalent canonical access/entitlement or wallet state exactly once.
- Expired transactions must never create paid entitlements.

### Events

- Legacy event registrations/participants and event-payment linkage must remain attributable to the same user UUID.
- Historical rankings/certificates are preserved as historical records or documented snapshots; no silent deletion is allowed.

## Hard PASS gates

Rehearsal is PASS only if all are true:

- [ ] 426/426 user UUIDs preserved.
- [ ] 0 orphan canonical profiles/user tracks/attempts/orders/entitlements.
- [ ] CPNS quota/balance total reconciles to `5090`.
- [ ] 476 historical sessions accounted for, including 50 non-completed sessions.
- [ ] 16889 historical answers accounted for or explicitly documented when an answer cannot be canonicalized.
- [ ] 1273 subject-score rows reconcile with source score aggregates.
- [ ] Transaction count/amount/status totals reconcile (`258`, `6295630`).
- [ ] Event-payment count/amount/status totals reconcile (`64`, `2240000`).
- [ ] 104 event participants reconcile.
- [ ] Settled payments are idempotent and do not double-grant access.
- [ ] No expired payment grants paid access.
- [ ] CPNS reviewed question migration remains `433 draft`, 6 needs-revision withheld.
- [ ] Production remains unchanged throughout the rehearsal.
- [ ] Disposable target can be reset/destroyed and recreated from the same process.
- [ ] Rollback runbook is timed and recorded.
- [ ] No unresolved P0 data-integrity/security defect.

## Rollback rehearsal

Rollback for this milestone means deleting/resetting the disposable rehearsal environment and proving the production application/database remains untouched and healthy. The production cutover rollback procedure will be derived from the measured rehearsal steps and finalized before the real cutover.

## Current status

- Production source inventory: **captured**.
- Identity/FK baseline: **green**.
- Exam-history FK baseline: **green**.
- Commerce/event FK baseline: **green**.
- Canonical target branch: **pending cost confirmation**.
- Production writes: **0**.
