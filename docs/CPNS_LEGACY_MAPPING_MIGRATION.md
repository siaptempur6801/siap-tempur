# CPNS Legacy Mapping + Schema V2 Migration

## Scope

This workflow migrates legacy **CPNS/SKD** questions into Schema V2 without inferring new knowledge-node mappings from legacy category labels.

Out of scope:
- TKA SMK
- production schema writes
- automatic category-to-subtopic classification

## Safety contract

1. Production is a read-only source for this workflow.
2. Raw question payload is staged separately from mapping decisions.
3. Mapping decisions are source-controlled in `data/cpns_legacy_mapping_review_v1.json` as **explicit question-code lists**.
4. Grouping inside that artifact is compression only. The runner expands exact codes and must never extrapolate a mapping to another question.
5. `legacy_category` and `legacy_sub_category` are preserved only as source metadata.
6. A question becomes import-ready only when `cpns_legacy_mapping_reviews.review_status = 'reviewed'`.
7. Reviewed primary/secondary nodes must exist and belong to the same canonical CPNS/SKD subject.
8. `pending`, `needs_revision`, and `blocked` rows are forbidden from carrying node decisions.
9. Question images must be copied to staging `question-images` before a question can become import-ready.
10. Canonical import defaults to `draft`. Publishing requires an explicit command-line confirmation and is staging-only.
11. Registry sync, staging, summary, and import RPCs are service-role-only; `anon` and `authenticated` cannot execute them.
12. The runner reconciles source count, review-artifact count, registry count, review status, raw stage count, and import-ready count before continuing.

## Current reviewed inventory

Source-controlled review inventory: **439** legacy CPNS questions.

Current result after semantic review and re-review:
- **433 reviewed**
- **6 needs revision**
- **0 pending**
- **0 invalid reviewed mappings**

Questions intentionally withheld:
- `TIU-000033` — letter sequence does not fit the current official `Deret Angka` node precisely.
- `TIU-000064` — Indonesian sentence-pattern/syntax task has no exact current TIU node.
- `TIU-000065` — Indonesian sentence-pattern/syntax task has no exact current TIU node.
- `TWK-000385` — stem cites Pasal 1 ayat (1), while the keyed answer tests ministerial responsibility; content is internally inconsistent.
- `TWK-000448` — IKN policy-rationale item does not map cleanly to one current TWK competency.
- `TWK-000461` — keyed trait is innovation/creative problem solving and does not cleanly fit the current TWK Integritas contract.

These rows must be fixed by content/taxonomy review. Do not force-map them in a migration.

## Source-controlled review artifact

`data/cpns_legacy_mapping_review_v1.json` is the durable review decision artifact.

It contains:
- exact question codes
- reviewed / needs-revision status
- exact primary node code
- optional exact secondary node code
- specific notes for unresolved questions

The artifact deliberately does **not** contain production question UUIDs or a hard-coded reviewer UUID. Source question IDs are resolved from the read-only source database at runtime. Reviewer identity is supplied separately through environment configuration.

Before any raw question is staged, the runner:
1. expands the exact code lists from the artifact,
2. rejects duplicate codes,
3. verifies the expanded count is exactly 439,
4. verifies source and artifact contain the same question-code set,
5. verifies each artifact subject matches the source question subject,
6. syncs those explicit decisions into the private staging registry.

## Required environment variables

The migration runner intentionally uses separate names so production and staging credentials cannot be confused accidentally:

```text
CPNS_LEGACY_SOURCE_SUPABASE_URL
CPNS_LEGACY_SOURCE_SERVICE_ROLE_KEY
CPNS_SCHEMA_V2_STAGING_SUPABASE_URL
CPNS_SCHEMA_V2_STAGING_SERVICE_ROLE_KEY
CPNS_MAPPING_REVIEWER_USER_ID
```

`CPNS_MAPPING_REVIEWER_USER_ID` must be an existing staging profile that owns the explicit review decision for audit purposes. It is intentionally not hard-coded in a migration or data file.

Never commit any of these values.

## Commands

### 1. Sync review registry + stage source payload only

```bash
npm run cpns:legacy:stage
```

This:
- reads the source-controlled review artifact,
- reads the CPNS source bank,
- reconciles source ↔ artifact,
- syncs the private mapping registry,
- copies required question images to staging,
- stages raw source payload through the guarded RPC.

It does **not** create canonical questions.

### 2. Sync + stage + import reviewed rows as draft

```bash
npm run cpns:legacy:import:staging
```

Only rows exposed through `app_private.cpns_legacy_import_ready` are imported. The six unresolved questions remain excluded.

### 3. Publish on staging only

Publishing is intentionally not exposed as a package script. It requires an explicit command:

```bash
node scripts/migrate_cpns_legacy_reviewed_to_schema_v2.mjs \
  --import-reviewed \
  --publish \
  --confirm-publish=STAGING_ONLY
```

Do not use this until draft-import QA is complete.

## Image migration

Legacy question images are copied from the source `question-images` bucket into staging using this deterministic path:

```text
legacy-cpns/<QUESTION_CODE>/<SOURCE_FILENAME>
```

The canonical path is stored in `question_assets.storage_path`. The legacy source URL is retained only in question metadata for auditability.

At the current snapshot, four TIU questions contain question-level images:
- `TIU-000078`
- `TIU-000079`
- `TIU-000080`
- `TIU-000081`

The database import-ready view blocks image-bearing questions until `canonicalAssetStoragePath` is present.

## Database objects

Private:
- `app_private.cpns_legacy_mapping_reviews`
- `app_private.cpns_legacy_import_stage`
- `app_private.cpns_legacy_import_ready`
- `app_private.cpns_legacy_mapping_review_summary`
- `app_private.validate_cpns_legacy_mapping_review()`

Service-role-only public RPCs:
- `upsert_cpns_legacy_mapping_review(...)`
- `stage_cpns_legacy_question(...)`
- `import_reviewed_cpns_legacy_question(...)`
- `import_reviewed_cpns_legacy_batch(...)`
- `get_cpns_legacy_import_summary()`

## Definition of done before production migration

- source-controlled review artifact expands to exactly 439 unique codes
- source and artifact question-code sets reconcile exactly
- registry/source count reconciles
- every imported question has exactly 5 options
- every imported question has exactly one `is_correct` option
- TKP score values remain preserved
- explanation count reconciles with source non-empty explanations
- all reviewed mappings resolve to canonical same-subject nodes
- all question images resolve from canonical staging storage
- six withheld questions remain excluded until explicitly repaired
- canonical questions pass content/admin QA in staging
- question versions are frozen before any exam blueprint consumes the migrated bank
- no production write occurs as part of this workflow
