# Production Cutover Readiness — Schema V2

> ⚠️ **HISTORIS — dokumen pra-cutover.**
> Dipertahankan sebagai bukti kesiapan sebelum eksekusi. Hasil akhirnya ada di `PRODUCTION_CUTOVER_COMPLETION.md`.
> Status terkini: [`docs/STATUS.md`](./STATUS.md).

Status: **READINESS ONLY — NO PRODUCTION MUTATION AUTHORIZED**

Milestone: **⑦ Schema V2 production cutover**

Branch: `chore/production-cutover-readiness-v1`

Base integration commit: `bba8fe85eacefcdeec1c31cf94c628c9fffe00c2`

Production Supabase: `llnttutwhtvxtdktiizo` (**read-only until explicit final GO**)

Canonical staging Supabase: `lpgrivowdcepcxradavu`

## Non-negotiable release rule

Do not run DDL/DML on production, deploy production Edge Functions, promote a production Vercel deployment, change production environment variables, change OAuth/payment configuration, merge to `main`, or repoint the production domain until the operator gives an explicit final GO after every gate in this document passes.

`supabase db reset`, fresh migration replay, and ad-hoc patching of historical production migrations are **not approved cutover mechanisms**. The repository contains a mixed legacy/Schema V2 migration history and the original `core_schema_*` bootstrap applied to staging was not committed to Git.

## Current evidence

### Application release candidate

Milestones ①–⑥ are merged into `feat/schema-v2`. The final CPNS + TKA SMP RC E2E merge is the base commit above.

### Production data baseline

A fresh read-only production baseline matched the production-clone rehearsal exactly:

- auth users: 426
- profiles: 426
- user program rows: 430
- quota/wallet source sum: 5090
- test sessions: 476
- completed sessions: 426
- non-completed sessions: 50
- test answers: 16,889
- subject score rows: 1,273
- completed score sum: 88,239
- transactions: 258; amount sum 6,295,630
- event payments: 64; amount sum 2,240,000
- event participants: 104

Expected non-PII production fingerprints immediately before cutover:

| Invariant | Expected MD5 |
| --- | --- |
| auth user IDs | `aba71998de87af045ca2fbc65c9b82eb` |
| profile/quota | `b02379b4056903c5ad5a09971df5a2b9` |
| session/score | `b94db0fdf0fa3aadf8df9331114dd8bd` |
| answers | `ff5048c26f8af5f112d2e45faf37679a` |
| transactions | `5d21ca2bd700a8515df48edabc7c909c` |
| event payments | `433b67a09f9f3673bfa6703813e7cedf` |

Any drift is a **stop condition** until a new snapshot and rehearsal are reconciled.

### DDL fingerprints

Canonical staging (`public` + `app_private`):

| Category | Count | MD5 |
| --- | ---: | --- |
| columns | 845 | `0a9578bac1c0ea80b9e553e1efe66fe4` |
| constraints | 380 | `25b4951cfa03294133cb1a5adf1f7862` |
| functions | 86 | `c49356d6ae6d9a31f9be65c7966758dd` |
| indexes | 376 | `195f564a71e40e8631a6f1fca26917d5` |
| policies | 95 | `d68f5cd55da640505cc8329b78fefd28` |
| sequences | 2 | `ca93d3e36bbe928e6db8d4dbd51f3027` |
| triggers | 12 | `0785fda8bf806b4c8fefedf5d51d9c52` |
| views | 2 | `66e40889bc022ee353d38531be6f2b4d` |

Legacy production (`public` + `app_private`):

| Category | Count | MD5 |
| --- | ---: | --- |
| columns | 675 | `3efca801c0fd50e6717764e5bfd925d7` |
| constraints | 412 | `56f31d69055ffa2e6c4dda701dcdafe4` |
| functions | 135 | `7e741b81951c2843a5e8dc08f421bacf` |
| indexes | 216 | `72c95b2e7a500bfb17fd7cc01a934074` |
| policies | 80 | `0f207e74375365ddaaa7ced9717bd049` |
| sequences | 4 | `f0a91a6446adc0e8dbed1fc743c7c24e` |
| triggers | 73 | `f3b99b4a36981a0bbd9861f5ad8ff986` |
| views | 8 | `66390d7b7626329f2a7565bc6374ebd7` |

The databases are not shape-compatible. Applying only the later Schema V2 migrations is unsafe.

## Table collision classification

There are 98 canonical staging tables and 60 legacy production tables in `public`.

### 19 conflicting names

Every table below exists on both sides but its canonical and legacy shape differs and must be treated as a collision set:

`articles`, `audit_logs`, `exam_blueprint_rules`, `exam_sections`, `exams`, `leaderboard_entries`, `learning_recommendations`, `materials`, `notification_campaigns`, `notification_deliveries`, `organizations`, `products`, `profiles`, `programs`, `question_stimuli`, `question_tags`, `question_versions`, `questions`, `subjects`.

The current strategy must not alter these in-place column-by-column. Exact cutover rehearsal must first prove an archive/rename + canonical-create + data-transform sequence.

### 79 canonical-only tables

`attempt_answer_options`, `attempt_answers`, `attempt_events`, `attempt_questions`, `attempt_scores`, `attempt_section_states`, `certificate_templates`, `certificates`, `class_members`, `classes`, `content_reviews`, `entitlements`, `event_products`, `event_rankings`, `event_registrations`, `event_sessions`, `events`, `exam_attempts`, `exam_blueprints`, `exam_question_items`, `exam_rules`, `exam_statistics`, `exam_types`, `feature_flag_overrides`, `feature_flags`, `features`, `generated_reports`, `knowledge_node_paths`, `knowledge_nodes`, `leaderboards`, `material_knowledge_nodes`, `notifications`, `order_items`, `orders`, `organization_exam_assignments`, `organization_licenses`, `organization_members`, `payment_webhook_events`, `payments`, `periods`, `permissions`, `product_features`, `product_prices`, `product_wallet_grants`, `promotion_products`, `promotion_redemptions`, `promotions`, `question_assets`, `question_explanations`, `question_knowledge_nodes`, `question_options`, `question_reports`, `question_statistics`, `refunds`, `remedial_session_items`, `remedial_sessions`, `role_permissions`, `roles`, `session_activity`, `system_settings`, `tags`, `track_periods`, `tracks`, `user_activity_daily`, `user_devices`, `user_knowledge_progress`, `user_question_bookmarks`, `user_question_notes`, `user_question_state`, `user_readiness`, `user_roles`, `user_streaks`, `user_subject_progress`, `user_track_preferences`, `user_tracks`, `user_wrong_questions`, `wallet_transactions`, `wallets`, `wrong_question_reviews`.

### 41 legacy-only tables

These must remain available in the rollback/archive source until post-cutover acceptance is complete:

`capabilities`, `competencies`, `curriculum_domains`, `event_admin_assignments`, `event_bot_names`, `event_certificates`, `event_custom_question_drafts`, `event_payments`, `exam_questions`, `learning_contents`, `notification_templates`, `options`, `organization_memberships`, `organization_periods`, `platform_roles`, `product_access_rules`, `program_packages`, `question_reviews`, `question_tag_links`, `refund_requests`, `role_capabilities`, `session_subject_scores`, `subcompetencies`, `subscriptions`, `test_answers`, `test_sessions`, `transactions`, `tryout_configurations`, `tryout_event_bot_entries`, `tryout_event_codes`, `tryout_event_participants`, `tryout_event_questions`, `tryout_event_sessions`, `tryout_events`, `user_program_subjects`, `user_program_token_ledger`, `user_programs`, `user_role_assignments`, `user_subject_mastery`, `voucher_claims`, `vouchers`.

## Working cutover architecture

The candidate design is an **in-place cutover on the existing production Supabase project** so that `auth.users` and its credentials remain untouched. This remains a design under rehearsal, not authorization to execute it.

The exact local rehearsal must prove this sequence:

1. Freeze application writes / enter maintenance window.
2. Re-run `scripts/production_cutover_preflight.sql` and the rehearsal source baseline; stop on any unexpected drift.
3. Take/verify the approved backup/PITR restore point.
4. Preserve legacy public objects in a deterministic rollback namespace or rename plan; preserve `auth.users` unchanged.
5. Create canonical Schema V2 objects from a source-controlled DDL reconstructed from canonical staging, not from broken historical replay.
6. Seed only canonical catalog/reference state required by V1.
7. Transform identity-linked profile/track/wallet state while preserving all 426 auth UUIDs.
8. Transform attempt/question/answer/score history using the already rehearsed Phase 2 mappings and withheld-question rules.
9. Transform commerce/events using the already rehearsed Phase 3 reconciliation; do not replay historical grants.
10. Verify production counts, monetary totals, orphan checks, canonical fingerprints, RLS/policies/functions, and application health.
11. Deploy/promote the exact approved application RC from the correct repository and bind `siaptempur.id` only after DB gates pass.
12. Run authenticated CPNS + TKA SMP production smoke with controlled accounts.
13. Observe error/auth/payment metrics during acceptance window.
14. Keep rollback objects until acceptance is signed off; cleanup is a separate later change.

## Vercel cutover warning

The current production domain was observed on a production deployment sourced from the older repository `siaptempur6801/siap-tempur`, branch `main`, rather than the Schema V2 repository `8shagrid/siap-tempur`.

Therefore the production web cutover requires an explicit deploy/promote step for the approved Schema V2 source. Merging `main` alone is not sufficient evidence that `siaptempur.id` serves the intended release.

## Readiness gates

- [x] Milestones ①–⑥ merged into integration branch.
- [x] Production-clone data transform rehearsal passed.
- [x] Fresh production source baseline matches rehearsal fingerprints.
- [x] Canonical staging DDL fingerprints captured.
- [x] Legacy production DDL fingerprints captured.
- [x] 19 conflict / 79 canonical-only / 41 legacy-only table sets classified.
- [ ] Reconstructed canonical Schema V2 DDL is source-controlled and reproduces staging shape.
- [ ] Exact **in-place** cutover sequence passes locally from a fresh raw production snapshot.
- [ ] Exact rollback sequence passes locally after simulated cutover.
- [ ] Production backup/PITR availability and restore point are verified immediately before cutover.
- [ ] Production Vercel environment variable names/targets are verified without exposing secret values.
- [ ] Production OAuth redirect/callback configuration is verified.
- [ ] Production payment provider configuration/webhook target is verified.
- [ ] Correct Schema V2 Vercel production deployment path is verified.
- [ ] Final exact-head CI + CPNS + TKA SMP gates are green after readiness code is frozen.
- [ ] No unresolved P0/P1 blockers.
- [ ] Operator gives explicit final GO.

## Stop conditions

Stop the cutover if any of these occurs:

- production source fingerprints drift without reconciliation;
- backup/PITR cannot be confirmed;
- auth UUID preservation is not provable;
- orphan counts become non-zero;
- wallet total, attempt totals, score totals, transaction totals, event totals, or settled links differ unexpectedly;
- canonical schema fingerprint differs from the approved staging source without an explained migration delta;
- production deploy comes from the wrong repository/ref/SHA;
- OAuth or payment callbacks are not verified;
- any P0/P1 regression is open.

## Next implementation step

Reconstruct a deterministic canonical Schema V2 DDL from the current staging catalog into source control, reproduce it in a fresh/local rehearsal target, then adapt the existing Phase 1–3 transforms to the exact in-place archive/bootstrap sequence. **Do not run that future write path on production until the final explicit GO.**
