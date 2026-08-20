# Schema V2 Production Cutover Runbook

Status: **NO-GO until every blocker in this document is closed.**

This runbook exists because the production database and Schema V2 staging database contain tables with the same names but incompatible structures. Schema V2 must **not** be applied directly to the current production database with `CREATE TABLE IF NOT EXISTS`, `prisma db push`, or ad-hoc DDL.

## Safety rules

- `main` is not the migration workspace. All preparation stays on `feat/schema-v2` until explicit approval.
- Production Supabase is read-only during preparation and rehearsal.
- Never expose or copy the service-role key into client code, logs, tickets, or chat.
- Never point a Vercel Preview deployment at production Supabase.
- Never use Midtrans production keys/endpoints from staging or Preview.
- Keep `auth.users.id` stable. All user-owned canonical rows must preserve the same user UUIDs.
- Do not delete legacy production tables during the first cutover. Rename/isolate them so rollback remains possible.

## Why direct migration is unsafe

Production contains real legacy/previous-generation data, including approximately:

| Source | Approx. rows at audit |
| --- | ---: |
| profiles | 426 |
| questions | 799 |
| options | 3,109 |
| test_sessions | 475 |
| test_answers | 16,779 |
| session_subject_scores | 1,273 |
| transactions | 258 |
| event_payments | 64 |
| leaderboard_entries | 243 |
| voucher_claims | 310 |
| vouchers | 6 |
| tryout_events | 4 |
| tryout_event_sessions | 68 |
| tryout_event_participants | 104 |
| tryout_event_questions | 185 |

Several same-named tables are structurally incompatible. Examples:

- production `exams`: `name`, `exam_type`, `duration_minutes`, ...
- V2 `exams`: `track_id`, `exam_type_id`, `title`, `duration_seconds`, `token_cost`, ...
- production `questions`: `content`, `type`, legacy `options`, ...
- V2 `questions`: `track_id`, `question_type`, `stem`, `source_type`, `source_reference`, ... plus `question_options`
- production `leaderboard_entries`: one best-session row per user style
- V2 `leaderboard_entries`: `leaderboard_id`, score/rank/metadata per board

Therefore production requires a **transition migration**, not merely the V2 creation migrations.

## Required blockers before cutover

### B1 — Production transition migration

Create a dedicated, versioned transition package that can run against a clone of production. It must:

1. Generate a collision manifest for every production table whose name also exists in V2.
2. Rename/isolate incompatible production tables under a deterministic `legacy_v1_*` name or a dedicated legacy schema.
3. Create the canonical V2 schema from a clean state.
4. Preserve `auth.users` and user UUIDs.
5. Transform and migrate legacy data into canonical tables.
6. Reconcile row counts, monetary totals, attempt scores, event registrations, wallet balances, and user identities.
7. Keep legacy tables intact until rollback window expires.

Do not improvise column-by-column ALTER statements during the live maintenance window.

### B2 — Data transformation mapping

At minimum, define and rehearse mappings for:

- `profiles` -> V2 `profiles`, `user_roles`, `user_streaks`, wallets/user-track state as applicable.
- `questions` + `options` -> V2 `questions` + `question_options` (+ version/explanation structures when required).
- `test_sessions` -> `exam_attempts`.
- `test_answers` -> `attempt_questions`, `attempt_answers`, `attempt_answer_options` as required.
- `session_subject_scores` -> `attempt_scores`.
- `transactions` + `event_payments` -> `orders`, `order_items`, `payments`; preserve provider/order references and financial totals.
- legacy token/quota values -> `wallets` + opening `wallet_transactions` with a traceable migration source.
- `tryout_events`, participants, sessions and questions -> `events`, `event_sessions`, `event_registrations`, canonical EVENT exams/attempt metadata.
- `vouchers` + `voucher_claims` -> `promotions`, `promotion_products`, `promotion_redemptions` or an explicitly approved retirement strategy.
- legacy leaderboard rows -> canonical leaderboard recalculation from migrated completed attempts where possible; do not blindly copy stale ranks.
- existing learning/material data -> canonical materials/knowledge-node relationships as applicable.

### B3 — Voucher/promotion feature parity

Production still has voucher history and claims. Schema V2 has promotion tables but the audited staging environment currently has no migrated promotions/redemptions and the old admin voucher route has been disabled to prevent legacy-table access.

Before GO, choose one explicitly:

- implement canonical promotion redemption/admin flow and migrate relevant vouchers/claims, or
- formally retire voucher redemption while preserving historical data in a read-only migration archive.

### B4 — Canonical operational export

The old export API reads legacy `test_sessions`, `options`, `tryout_events`, vouchers, and legacy leaderboard columns. It is disabled on the Schema V2 branch so it cannot silently query removed tables.

Before GO, either implement V2 export for the required datasets or explicitly accept that export is unavailable for the first release with a dated follow-up owner.

### B5 — Production environment verification

Before switch, verify without exposing secret values:

- `APP_ENV`/runtime resolves to `production`.
- production Vercel uses production Supabase URL/project ref only.
- production publishable and service-role credentials belong to the production Supabase project.
- Midtrans server/client keys are production keys only.
- Midtrans API/Snap endpoint resolves to production only.
- OAuth redirect allow-list contains the production callback URL.
- `NEXT_PUBLIC_SITE_URL` resolves to the production origin.
- Preview/staging variables remain isolated from production.

### B6 — Backup and rollback rehearsal

A rollback is not "re-run the old deploy" unless the database is still compatible with the old deploy.

Required rehearsal on a production clone:

1. Take/verify a restorable database backup immediately before migration.
2. Record the old Vercel production deployment ID.
3. Run transition migration and data transform.
4. Run reconciliation and smoke tests.
5. Simulate a failed smoke test.
6. Restore routing/app to the old deployment and restore/re-enable legacy data layout using the rehearsed rollback procedure.
7. Measure total rollback time and define the maximum acceptable maintenance window.

## Rehearsal procedure

Use a clone/branch restored from production data. Never rehearse on live production.

1. Freeze writes on the clone.
2. Record baseline counts and financial sums.
3. Apply the transition migration package.
4. Apply canonical V2 migrations in deterministic order.
5. Run data transformations.
6. Run all reconciliation checks below.
7. Deploy `feat/schema-v2` against the migrated clone.
8. Run auth, purchase, fulfillment, practice, event and admin smoke tests.
9. Run rollback rehearsal.
10. Only after a clean rehearsal may cutover be proposed.

## Mandatory reconciliation checks

### Identity

- Every production `auth.users.id` expected by the application has exactly one V2 profile.
- No new random UUIDs replace existing user identities.
- Admin/writer role assignments are explicit in canonical RBAC; no `profiles.role` dependency remains.

### Questions

- Source question count reconciles to migrated + intentionally retired rows.
- Every selectable question has the expected option count.
- Correct-answer cardinality is valid for each response type.
- Browser roles have zero direct grants to answer-key tables.

### Attempts and scoring

- Session/attempt counts reconcile.
- Completed attempt scores match source totals for a sampled and aggregate set.
- TWK/TIU/TKP score breakdowns match.
- Unanswered answers remain distinguishable from answered rows.
- Event attempts do not enter the national Full Tryout leaderboard.

### Commerce

- Source paid transaction count and paid gross amount reconcile with V2 paid orders/payments.
- Provider order/transaction references remain traceable.
- No paid order is fulfilled twice.
- Opening wallet balances match approved source quota/token balances.
- Wallet credits have traceable migration source IDs.

### Events

- Participant counts reconcile.
- Paid registrations retain payment linkage.
- Event/session/exam relationships are valid.
- Completed event attempts produce deterministic final ranking.

### Security

- RLS enabled on every public table.
- Browser grants are explicit and minimal.
- Server-only commerce/answer-key/RBAC tables have no anon/authenticated table grants.
- SECURITY DEFINER functions have fixed `search_path`.
- Default privileges do not automatically grant future tables/functions to browser roles.
- All FK columns used operationally have suitable indexes.

## Cutover sequence after explicit approval

1. Announce maintenance window / disable mutable user operations.
2. Take verified production backup and record old deployment ID.
3. Stop/restrict payment initiation if reconciliation cannot tolerate concurrent orders.
4. Record final source counts/sums and a cutover timestamp.
5. Execute rehearsed transition migration only — no manual schema improvisation.
6. Run transformation scripts.
7. Run mandatory reconciliation. Any unexplained mismatch = **abort**.
8. Configure/verify production environment variables.
9. Deploy the approved Schema V2 commit.
10. Run smoke tests: login, dashboard, one controlled purchase path, fulfillment idempotency, Full Tryout, result, event access, admin read paths, health endpoint.
11. Re-enable traffic/writes.
12. Monitor errors, payment webhook failures, auth failures and DB load during the rollback window.
13. Keep legacy tables/backups until rollback window is formally closed.

## Abort conditions

Immediately abort/rollback when any of these occurs:

- identity/profile mismatch;
- monetary reconciliation mismatch;
- missing or duplicate paid fulfillment;
- question/answer-key corruption;
- migrated score mismatch outside an explicitly documented historical exception;
- production app points to staging services or vice versa;
- OAuth login cannot establish a stable production session;
- unexpected 5xx rate or critical RLS/permission failure;
- rollback procedure is not executable within the agreed window.

## Current audited state (2026-08-20)

- Staging user E2E: purchase -> fulfillment -> event registration -> 110-question attempt -> scoring -> event ranking: PASS.
- Admin Schema V2 CRUD: PASS.
- Staging QA artifacts from the interactive run: cleaned.
- Answer-key browser grants: none.
- RLS: enabled on all audited public tables.
- Default browser privileges: hardened for future postgres-owned objects.
- Server-only `event_products` and `product_wallet_grants`: browser grants revoked.
- FK index audit: no missing FK indexes after hardening.
- Auth callback return target: hardened against protocol-relative redirects.
- Legacy admin finance/event/question routes: redirected to canonical workspace.
- Legacy voucher/export paths: disabled pending V2 feature parity.
- Production transition/data migration rehearsal: **NOT DONE — blocking**.
- Production env verification: **NOT DONE — blocking**.
- Backup/rollback rehearsal: **NOT DONE — blocking**.

Final status: **NO-GO for production cutover until all blockers above are closed and the user explicitly authorizes cutover.**
