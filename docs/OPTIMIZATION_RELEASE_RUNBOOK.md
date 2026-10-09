# Controlled optimization release — 2026-10-09

**Current decision: NO-GO for production rollout.** Code is reviewable; the gates below still require operator approval/evidence. No production migration, Redis write, branch push, deployment, or load test was performed by this follow-up.

## Reviewed database scope

Only these additive, read-only projections belong to this release:

| Version / file | SHA-256 |
|---|---|
| `20261009060323_learner_overview_read_models.sql` | `2313557892334a6f198cce945cde6dde907aa536a4dae609bd5eb2c92e5ee13e` |
| `20261009063825_learner_reward_totals.sql` | `df52d3839c3b0aef143bf6432d51f38d9efb763217f2375fe626b144f87a0884` |

Staging project: `lpgrivowdcepcxradavu`. Production project: `llnttutwhtvxtdktiizo`. Inspect the selected project and connection in the provider console; `current_database() = postgres` does **not** identify a Supabase project. Use an approved private connection/service configuration, never credentials in a command or report.

Live read-only inspection found both versions and all four functions on staging; neither version nor function exists on production. Staging has 197 migration entries, production 195: twelve staging-only and ten production-only timestamps, including ten names recorded under different historical timestamps. See [ledger evidence](optimization-migration-ledger.json). Matching names are not permission to rewrite history. **Do not run broad `supabase db push`, migration repair, bootstrap, or schema reset.**

All four new functions are STABLE, SECURITY INVOKER, `search_path=''`. `practice_completed_attempt_totals(uuid)` and `practice_active_attempt_overviews(uuid)` allow service-role execution only; owner quota/reward functions allow authenticated/service-role execution, deny anon, and explicitly filter `auth.uid()`. They contain no writes, new indexes, scoring changes, or answer-key responses. Caller authorization and table RLS remain necessary. The parameterless reward function returns zero totals under a service JWT with no user subject; its application caller supplies the learner's authenticated client.

Existing function-body differences were reviewed, not automatically synchronized: two are token-identical apart from whitespace, three only add optional alias `AS`, and submission copies the same immutable JSON constant instead of constructing it three times. Raw hashes remain in [function parity](optimization-function-parity.json). Effective critical function/column privileges match in [ACL evidence](optimization-release-acl.json): learners cannot write attempt/answer tables or read question snapshots/options/explanations, and cannot execute privileged scoring/payment/ranking functions directly.

## Operator procedure — prepare now, execute only after approval

1. Review the branch commits, two migration files, current database preflight, current deployment artifact, and rollback owner. Obtain hosted CI without accidentally enabling deployment; the branch has not been pushed. Confirm backup/PITR recovery readiness using the existing production recovery policy.
2. Run the read-only preflight on the **explicitly selected** projects with a private `psql` service configuration. Retain all result sets:

   ```sh
   psql 'service=siaptempur-staging' -X -v ON_ERROR_STOP=1 -f scripts/db-verify/optimization-release-preflight.sql
   # Read-only; requires an explicitly selected production connection.
   psql 'service=siaptempur-production' -X -v ON_ERROR_STOP=1 -f scripts/db-verify/optimization-release-preflight.sql
   ```

   These service names are operator-configured examples, not existing credentials. Abort for unexpected ACL, RLS, function-definition, ledger, or prerequisite schema differences. Review any overloads independently; exact target signatures must be absent before first application. Validate existing score/permission RPCs against the approved baseline.
3. Generate a checksum-pinned bundle locally. This command has **no database connection** and refuses an existing output file or modified migration source:

   ```sh
   node scripts/release/prepare-optimization-migrations.mjs /tmp/siaptempur-reviewed-optimization.sql
   ```

   Inspect the entire output. It wraps only the two files, their exact ledger versions/names/source text, and PostgREST notification in **one transaction**. It checks the migration role, refuses pre-existing target functions/versions, then verifies function-definition hashes, invoker/STABLE/search-path settings and effective ACLs before recording either version. There is no conflict-ignore or broad ledger repair.
4. Rehearse the complete bundle on an approved isolated staging copy with the corresponding pre-release state before production. The original DDL already passed staging parity/role/rollback fixtures. The new bundle's post-install assertion block was executed read-only against staging; production's absence guard passed read-only; both ledger INSERTs were EXPLAIN-planned without execution. **The complete transactional bundle has not been applied by this follow-up.** Do not remove the guard to apply it over the already-migrated shared staging project.
5. Obtain explicit production migration approval. Only then, a human operator executes on the confirmed production service:

   ```sh
   psql 'service=siaptempur-production' -X -v ON_ERROR_STOP=1 -f /tmp/siaptempur-reviewed-optimization.sql
   ```

   Do not add `--single-transaction`: the bundle already contains BEGIN/COMMIT. Lock timeout is 5 s and statement timeout 30 s; a failure aborts the transaction. Investigate a timeout instead of increasing it. The original application can remain on its prior version while these read projections are installed.
6. Re-run preflight. Expect the four reviewed hashes and exact privilege matrix; both ledger versions must appear once. Confirm PostgREST discovers all four signatures. Run approved disposable-owner/second-owner/anon parity checks, including >1,000 attempts, direct vs event/organization quota contexts, scores/XP, and active progress. Never use customer attempts as mutation fixtures. Do not deploy callers until this gate passes.
7. Obtain separate deployment approval after Redis, NAT, hosted CI and capacity gates pass. Perform controlled canary journey checks (CPNS/TKA/resume/rewards/quota/payment script) without a paid transaction or production load test. Retain error/latency dashboards and the prior deployment artifact.

## Rollback

The preferred operational rollback is the previous application artifact; leave the four unused read functions installed. No data conversion needs reversal, and leaving them avoids breaking in-flight calls.

If removal is explicitly approved, first roll back the application and drain callers. Create a **new, reviewed forward rollback migration**, record its own new ledger version, and use only:

```sql
DROP FUNCTION public.learner_completed_attempt_totals() RESTRICT;
DROP FUNCTION public.learner_exam_attempt_summaries(uuid[], boolean) RESTRICT;
DROP FUNCTION public.practice_active_attempt_overviews(uuid) RESTRICT;
DROP FUNCTION public.practice_completed_attempt_totals(uuid) RESTRICT;
```

Apply it transactionally. No CASCADE, customer-data deletion, or deletion/repair of the two original ledger records. An unexpected dependency is a stop condition. Future reinstallation requires a reviewed forward migration; the preparation bundle deliberately rejects already-recorded versions. If the installation transaction fails, rollback leaves neither partial functions nor partial ledger records.

## Redis and classroom gate

[Upstash documents EVAL](https://upstash.com/docs/redis/sdks/ts/commands/scripts/eval) and [REST ACL tokens](https://upstash.com/docs/redis/features/restapi). This establishes API support, not that the deployed token permits it. `/api/health` reports configuration only. Production fails closed when EVAL/Redis is unavailable; an incompatible/read-only token can deny legitimate rate-limited actions.

After explicitly approving a **designated staging Redis origin**, provide its URL/token privately in environment variables, set `APP_ENV=staging` and `REDIS_VERIFY_APPROVED_STAGING_ORIGIN` to that exact HTTPS origin, then run:

```sh
node scripts/db-verify/staging-redis-rate-limit.mjs
```

This performs ten bounded REST requests against two uniquely named test keys: four concurrent increments, TTL checks, legacy no-expiry repair, then deletion of only its own keys. It does not load `.env.local`, scan/delete application counters, or constitute a load test. A process termination during the intentional no-TTL repair check may require operator cleanup of its uniquely scoped verification key. Use a test credential with SET/PERSIST/DEL permission as well as the application EVAL/INCR/PTTL/PEXPIRE permissions; do not broaden production credentials for the checker. Guard tests reject production or a mismatched origin before any request. It has **only been exercised with mocked transport**, not a provider account.

The beacon endpoint's existing shared **60 requests/IP/minute** policy rejects two out of 62 locally simulated requests across independent instances. Thirty-one classmates sending two progress beacons each in one minute exceed it. Answer server actions use a separate persistence path, so this specifically threatens progress/flag updates and cross-device resume, not evidence that an acknowledged answer was lost. Preserve the current protection pending an approved policy decision: establish supported classroom size/traffic, assess authenticated-user quotas plus IP abuse protection, and test non-spoofable identity, ownership and multi-instance enforcement before changing limits.

## Capacity gate (not authorized or executed)

Approve exact staging origins, owned fixtures, maximum VUs/request rate/duration, and abort thresholds before any load test. Use unique learner sessions, representative quotas and autosave/navigation/submit mixes; include classroom NAT and independent-user cases. Existing guarded k6 catalog/Schema V2 scripts are smoke coverage, not a realistic exam capacity certification. Collect adequately sampled P50/P95/P99, 429/5xx rates, database connections/query latency, function duration/memory, and bandwidth. Define acceptance against the approved expected peak and SLO, rather than selecting thresholds after seeing results. Production is excluded.
