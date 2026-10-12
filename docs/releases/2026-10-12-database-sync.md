# Database synchronization — 2026-10-12

## Targets and scope

- Staging: `lpgrivowdcepcxradavu` (Siap Tempur Staging).
- Production: `llnttutwhtvxtdktiizo` (Siap Tempur SG).
- Vercel project: `siap-tempur` / `prj_K11KarCNNVAkYCKXU4oIO4N27Vq5`.
- User explicitly requested database synchronization, commit, push, and deployment.
- Compared runtime schemas `public` and `app_private`, Storage policies, and bucket configuration. Auth accounts, user data, question content, uploaded files, transactions, attempts, answers, and results were not copied or rewritten.

## Applied migrations

| Migration | Local version | Staging ledger | Production ledger |
| --- | --- | --- | --- |
| sync_learner_overview_projections | 20261012103034 | 20261012151830 | 20261012152009 |
| align_runtime_function_definitions | 20261012103036 | 20261012151925 | 20261012152013 |
| align_content_storage_policies | 20261012103038 | 20261012151841 | 20261012152014 |

Each migration was applied to staging before production. Production application
migrations already applied under older, different timestamps were not replayed.
Historical ledger entries were preserved; matching runtime objects and migration
names are the compatibility evidence, not identical application timestamps.
Do not use a broad `db push` or blanket ledger repair against this historical ledger.

### Changes

1. Seven read-only learner projection RPCs are now present in both environments,
   including four canonical read models and three existing staging compatibility
   names. The RPCs remain SECURITY INVOKER with an empty search path. Anonymous
   execution is denied; privileged user-ID projections are service-role only.
2. Six existing TKA private functions now have identical definitions. Reviewed
   differences were formatting, explicit AS aliases, and reuse of an identical
   JSON value. Their owners and execution privileges were preserved. The migration
   did not invoke the functions or recalculate any result.
3. Production now has the canonical public `article-images` bucket (2 MiB;
   JPEG/PNG/WebP/GIF) and owner-folder/content-permission upload policy. Eight
   obsolete production-only Storage policies were removed, including policies
   referencing `legacy_prod.profiles`. Current canonical owner-folder policies
   remain. No Storage object was removed. Public image delivery uses public bucket
   URLs; the certificate bucket remains private.

## Read-only verification

- Compared definitions, signatures, columns/defaults, constraints, indexes,
  triggers, row security settings, privileges, and Storage policies after applying
  migrations: **1,259 shared objects match**.
- Staging has 1,262 compared objects. Its three additional objects are the
  previously documented `app_private.cpns_skd_p1_import_stage` table and its
  primary-key constraint/index. This staging import artifact is not deployed.
- Seven private-function ACL representation differences are equivalent: a NULL
  function ACL gives PostgreSQL's default owner/PUBLIC execution, matching the
  explicit owner/PUBLIC ACL on the other environment. No grant was expanded.
- All five Storage bucket configurations match, including the private certificate
  bucket and existing size/MIME restrictions.
- Projection queries with NULL user scope returned zero totals on staging;
  production projection privileges match the same restricted contract.
- PostgreSQL platform-managed schemas and engine patch versions were not changed.
- Supabase advisors still report existing items outside these changes; this is not
  a claim of a clean full security audit:
- [Function Search Path Mutable](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable): 1 finding(s).
- [Signed-In Users Can Execute SECURITY DEFINER Function](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable): 59 finding(s).
- [Leaked Password Protection Disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection): 1 finding(s).

## Application release preparation

The release includes the accumulated audit/UI work, the full-width answer-option
editor, and the three synchronization migrations. A Playwright browser literal
needed a type narrowing to unblock the Next.js production build. An accepted
Midtrans fraud status now keeps the successful capture status instead of being
classified as unknown. Temporary browser captures and local environment files
are excluded from Git.

- `npm run build`: passed, including TypeScript and route generation.
- ESLint: passed with zero errors and warnings.
- `npm run format:check`: passed, including all 265 SQL files.
- `git diff --check`: passed before release.
- No new automated tests were added or run for this release preparation.
