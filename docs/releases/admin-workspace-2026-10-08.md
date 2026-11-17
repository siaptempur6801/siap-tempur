# Admin workspace release — 2026-10-08

## Database parity before application release

Targets verified: staging `lpgrivowdcepcxradavu`, production `llnttutwhtvxtdktiizo`.
Vercel target: `siap-tempur` / `prj_K11KarCNNVAkYCKXU4oIO4N27Vq5`, owner `team_8s1aLdeHGuJOatfy9irDpG2V`, public domain `siaptempur.id`.

Applied production migrations:
- `admin_read_models`: six read-only, security-invoker admin RPCs, pagination and database aggregation.
- `align_tka_smp_runtime_contracts`: align the existing staging learning-focus response (path, available drill target and next action). Drill start retains the same authentication, active-track, entitlement/quota, attempt and metadata behavior; its definition was normalized to the staging SQL.

Post-migration public catalog comparison: **937 columns, 411 indexes, 433 constraints, 100 RLS policies and 101 function definitions/ACLs match exactly**.
Public/app-private runtime table grants, RLS flags, views and 14 triggers match.
Expected environment exception: staging-only `app_private.cpns_skd_p1_import_stage` is an import rehearsal resource and is not copied to production.
Six private TKA SQL definitions differ in formatting/equivalent aliases or assignment expressions; their existing business contracts are retained. ACL null/default and ordering differences represent equivalent privileges.

No auth users, attempts, payments, orders, content or entitlement fixtures were copied. Production business-row counts and product statuses were checked before/after and remained unchanged. Existing CPNS content/commerce readiness restrictions remain in effect.

Production RPC checks:
- All six use invoker rights; anonymous execution denied.
- Five sensitive read models deny authenticated direct execution; server permission checks remain mandatory.
- Question pages return 25 rows, exact database totals for all three populated contexts (465, 213, 300), no options or answer keys.
- Assessment aggregate returns 41 rows for 41 assessments.
- Supabase advisors report no new warnings for these RPCs. Existing warnings include archived `legacy_prod.set_articles_updated_at` search_path, authenticated guarded definer functions and leaked-password protection; these predate this change.

## Validation

The final application source passed:
- Admin E2E: 77
- Public E2E: 42 passed, 2 existing placeholders skipped
- CPNS staging: 9
- TKA SMP staging: 17
- Content Review: 5
- Unit: 789 tests / 105 files (repeated before commit)
- Lint, typecheck, production build, database parity (1,634 assertions)
- Responsive browser QA at 1440, 1024 and 390 px
- Staged-source credential-pattern scan: 255 files, no findings
- `git diff --check`

See [performance report](../ADMIN_PERFORMANCE_REPORT.md) for measurements and the explained staging concurrency spike. Existing certificate-font tracing warning remains performance debt.

The release uses remote Vercel builds for each environment. The local staging `.next` output and local environment files are excluded from deployment. Production and preview keep their own Supabase/payment credentials.
