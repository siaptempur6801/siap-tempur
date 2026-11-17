# Production Cutover Runtime Schema Target

Status: **FROZEN READ-ONLY TARGET FOR REHEARSAL**

This document defines the Schema V2 **runtime** target derived from canonical staging. It intentionally excludes one-time CPNS migration staging artifacts so production is not forced to reproduce temporary import machinery.

## Runtime object target

| Category | Count | MD5 |
| --- | ---: | --- |
| public tables | 98 | `31c5755439cc95afaa6048926bb45f23` |
| public columns | 823 | `18bf18549161ffc7c28772fa6bd48771` |
| public constraints | 369 | `18ea88a6124dcaa216afa16e410cdce8` |
| public indexes | 368 | `1788349683b55f78fabdb8e986b60d52` |
| runtime functions (`public` + `app_private`) | 80 | `e147d38d3801ac4c02ad41e21c02fe2a` |
| public policies | 95 | `23530b7447a51944807e82e3231c3c68` |
| public runtime triggers | 11 | `96b6d77f0c85d8a977cb18d5e1b108bc` |
| public sequences | 2 | `ae1743f34f7a1648e378e6d346eef986` |

All 98 public runtime tables have RLS enabled. No public runtime table uses `FORCE ROW LEVEL SECURITY`.

There are no custom enum/domain types in `public` or `app_private`, no identity columns, no generated columns, no non-default column collations, no partitioned public tables, and no public table/column comments that need to be reconstructed.

## Runtime ACL target

| Category | Count | MD5 |
| --- | ---: | --- |
| runtime table/sequence ACL | 1,659 | `c5fdcbcef6ef9ea81401b3b513c63d36` |
| runtime function ACL | 166 | `fbfcd289d78e77af89e5d9117e8af833` |
| runtime schema ACL | 10 | `28854a5ad42ca691a4c5700a9b8c3da7` |

Observed ACL roles are limited to `PUBLIC`, `anon`, `authenticated`, `service_role`, `postgres`, and `pg_database_owner`.

`app_private` canonical staging schema grants `USAGE` to `authenticated` and owner privileges to `postgres`; it does not broadly expose CREATE to client roles.

## Existing extensions

Canonical staging requires no production-only extension removal. Both staging and production already include the runtime extensions used by Schema V2:

- `pgcrypto`
- `uuid-ossp`
- `pg_stat_statements`
- `supabase_vault`
- `plpgsql`

Legacy production currently has additional `pg_cron`, `hypopg`, and `index_advisor`. The cutover must not drop these as part of Schema V2 bootstrap.

## Migration-only exclusions

The following staging objects are deliberately **not** part of the production runtime target:

### app_private tables/views

- `app_private.cpns_legacy_import_stage`
- `app_private.cpns_legacy_mapping_reviews`
- `app_private.cpns_skd_p1_import_stage`
- `app_private.cpns_legacy_import_ready`
- `app_private.cpns_legacy_mapping_review_summary`

### migration-only functions

- `app_private.validate_cpns_legacy_mapping_review()`
- `public.get_cpns_legacy_import_summary()`
- `public.import_reviewed_cpns_legacy_batch(boolean, integer)`
- `public.import_reviewed_cpns_legacy_question(uuid, boolean)`
- `public.stage_cpns_legacy_question(uuid, text, jsonb)`
- `public.upsert_cpns_legacy_mapping_review(uuid, text, text, text, text, text, text, text, text, text, uuid)`

A staging catalog scan confirmed that these are the only functions whose current definitions reference `cpns_legacy` objects.

## auth.users boundary

`auth.users` must remain untouched during the in-place Schema V2 migration so all authentication credentials and 426 user UUIDs stay in the same Supabase project.

Both canonical staging and legacy production already have the same trigger definition:

`on_auth_user_created` → `public.handle_new_user()`

Canonical trigger-definition MD5: `786e53a33077b3a68f1ec248e238d18a`.

However the handler implementation differs:

- canonical `public.handle_new_user()` MD5: `dbae3074708706cbe687389241c39a16`
- legacy production handler MD5 observed during readiness: `239e87c99d61e1baaafdba1806853e82`

Therefore the exact cutover plan should preserve the existing auth trigger and reconcile the handler function only after the canonical `profiles` shape exists. This must be proven in the local in-place rehearsal before production authorization.

## Source-controlled tools

- `scripts/production_cutover_schema_manifest.sql` — generic read-only schema inventory.
- `scripts/production_cutover_extract_staging_runtime_schema.sql` — read-only extractor that emits candidate runtime DDL as text; never pipe directly to production.
- `scripts/production_cutover_runtime_schema_verify.sql` — read-only verifier for the frozen runtime hashes in this document.
- `scripts/production_cutover_preflight.sql` — read-only legacy production source gate.

## Acceptance rule

The future assembled bootstrap is acceptable only when a fresh isolated/local target passes `production_cutover_runtime_schema_verify.sql` for object hashes, ACL hashes, RLS posture, the auth trigger, and the canonical `handle_new_user()` implementation, with any intentional delta explicitly documented and reviewed.
