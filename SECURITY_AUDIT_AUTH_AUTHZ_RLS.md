# Security Audit — Authentication, Authorization, Supabase RLS

**Target:** `siap-tempur` — Next.js 16 App Router + Supabase exam/tryout platform
**Working dir:** `/Users/dirga/Projects/siap-tempur` (branch `main`, HEAD `bec3f41`)
**Mode:** READ-ONLY. No file was modified, created, or deleted.
**Scope:** authentication, authorization, RLS/policies/GRANTs, SECURITY DEFINER, secrets, rate limiting, webhook security.

---

## 0. Executive summary

The **application-layer authorization in this codebase is genuinely well built**. Every privileged server action I mapped carries a server-side permission check resolved from `user_roles` → `roles` → `permissions` via a guarded `SECURITY DEFINER` RPC — never from a header, cookie, body field, or query param. The public payment webhook has a correct, timing-safe Midtrans signature check plus real two-layer replay protection. Certificate and beacon endpoints enforce object ownership. There is no open redirect, no hardcoded secret, and `.env.local` is gitignored and untracked.

The **database layer is where the real problems are**, and the biggest one is not a missing control — it is that **two incompatible descriptions of the schema coexist in the repo, and nobody can tell from the files which one production actually runs.**

- `supabase/migrations/*.sql` (161 files) is a *baseline reconstruction*, not a reproducible history. At minimum `49` of the `161` local files have no corresponding entry in production's recorded migration ledger (165 rows), and `106` have none in staging's (82 rows).
- The **real Schema V2 DDL** lives outside the migration chain, in `scripts/cutover/bootstrap/*.sql` (98 `CREATE TABLE`, 98 `ENABLE ROW LEVEL SECURITY`, 71 policies, a frozen ACL).
- Those two sources **directly contradict each other** on function privileges, and at least one migration (`202402280006_security_fixes.sql`) is **syntactically invalid SQL** — so every `search_path` hardening it claims to apply silently never happened.

**Good news, stated plainly:** the answer-key exposure was checked carefully and the repo's canonical ACL is **closed** on it. My first read suggested `attempt_questions.question_snapshot` (which embeds `is_correct` + `score`) was readable by students; that was wrong, caused by a greedy regex in my own parsing. Verified properly: `authenticated` holds **no privilege at all** on `attempt_questions`, `attempt_answers`, `question_versions`, `question_options`, and `question_explanations`. The P0 in `AGENTS.md` is also **stale** — `docs/STATUS.md` and two dated migration-ledger dumps show it was closed on staging and production on 2026-09-16.

**Readiness score: 68 / 100 — Layak production: BELUM** (not because a live exploit is proven, but because deployed state is not verifiable from the repo, and two acknowledged-live defence-in-depth gaps remain).

---

## 1. P0 CRITICAL — none proven

No finding met the bar of "read code that proves a remotely exploitable critical vulnerability." Two items come close and are documented under §3 as P1. I am explicitly declining to label the answer-key issue P0: I read the ACL and it is closed.

---

## 2. What I checked and found CLEAN

Stated up front so the negative results are on the record.

| Area | Verdict | Evidence |
|---|---|---|
| **Server-action authorization** | CLEAN | All 25 exports of `app/actions/admin.ts` call `isAdmin()`; all 11 of `admin-v2.ts` call `actor(PERMISSIONS.*)`; all 3 of `admin-exams.ts` call `requireExamManager()`; all 6 of `articles.ts` and 5 of `content-review.ts` carry permission guards. |
| **Role source is server-side** | CLEAN | `lib/utils/admin.ts:43-45` → `authorizationService.hasPermission` → `src/repositories/authorization.repository.ts:28` RPC → guard at `202608210006_authenticated_authorization_rpc_v1.sql:16-20` (`p_user_id <> v_actor and not current_user_has_permission('admin.access')` → raise). |
| **Client-supplied admin flags** | CLEAN | Exhaustive grep for `formData.get('isAdmin'/'is_admin'/'role'/'admin')`, `searchParams.get('admin')`, `x-admin`/`x-role` headers, `body/input/payload/data.role` used for authz → zero hits. |
| **`/admin` + `/cpns/admin` enforcement** | CLEAN | `app/admin/layout.tsx:25-45` and `app/cpns/admin/layout.tsx:23-53` are server components with `force-dynamic`; they redirect on missing user and on missing permissions. Not middleware-dependent. |
| **Open redirect** | CLEAN | `lib/auth-redirect.ts:4-14` rejects non-`/`-prefixed, `//`-prefixed, and backslash-containing values; applied in `proxy.ts:67`, `app/auth/callback/route.ts:6-8,157,193`, `app/actions/auth.ts:45-60`, `app/login/page.tsx:8`. |
| **Certificate download/preview authz** | CLEAN | `app/api/certificates/[certificateNumber]/certificate-render-data.ts:52-76`: 401 without session, 403 when `row.user_id !== user.id` unless `admin.access`. `certificateNumber` is only a lookup key. |
| **Beacon ownership** | CLEAN | `app/api/practice-sessions/[id]/beacon/route.ts:24-28,48-54,70-71` — session-verified user, then `.eq('id', id).eq('user_id', user.id)` before every write. |
| **Webhook signature** | CLEAN | `app/api/payments/webhook/route.ts:9-15,45-54` — SHA512 `order_id+status_code+gross_amount+serverKey`, hex-shape pre-check, `crypto.timingSafeEqual`. `env.midtransServerKey()` uses `requireEnv` (throws if unset) → no empty-key fail-open. |
| **Webhook replay/idempotency** | CLEAN | Unique `(provider, event_id)`; `alreadyProcessed` short-circuit + `23505` catch (`src/services/payment.service.ts:292-322`); `fulfill_paid_order` uses `SELECT … FOR UPDATE`, advisory lock, per-item `wallet_transactions` guard, and `ON CONFLICT DO NOTHING` on entitlements (`20260823071419_tka_pass_revival_stacking_v1.sql:30-33,96-98,122-141,190-192`). Replay cannot re-grant tokens. |
| **Amount tampering** | CLEAN | `payment.service.ts:288` and SQL `:39-41` both enforce `p_amount = order.total_amount`. |
| **Secrets** | CLEAN | No hardcoded Supabase/JWT/Midtrans keys in `app/`, `lib/`, `src/`, `components/`, `scripts/`, `tests/`, `types/`. All keys via `lib/env.ts`. `NEXT_PUBLIC_*` grep for `service\|secret\|private\|server_key\|password` → zero. `.env.local` covered by `.gitignore:27` (`*.local`) + `.gitignore:37` (`.env*`); `git ls-files` confirms untracked. |
| **Score/token/payment columns unwritable by users** | CLEAN (in v2) | `authenticated` holds **SELECT only** on `exam_attempts` (incl. `total_score`, `percentage`, `rank`, `passed`), `attempt_scores`, `wallets`, `wallet_transactions`, `payments`, `orders`, `leaderboard_entries`, `event_rankings`. Full per-table ACL resolution in §5. |
| **CSRF coverage** | CLEAN with 2 exceptions | `validateCsrf()` present in 17 of 19 action files; the 2 without it (`leaderboard.ts`, `event-leaderboard.ts`) contain no mutation. |
| **Storage policies** | CLEAN | `avatars` (`20260904175000:9-18`), `article-images` (`20260823082622:15-27`), `event-certificates` (`20260904133923:62-95`) are all folder-scoped to `auth.uid()` with `WITH CHECK`, plus permission checks. |
| **RLS coverage (bootstrap)** | CLEAN | All **98** runtime `public` tables have RLS enabled (`14_rls_enable.sql`); **0** tables have a policy with RLS disabled. |
| **No `FOR ALL` in v2** | CLEAN | Zero `FOR ALL` policies in the v2 bootstrap; the only 2 in the repo are legacy `storage.objects` policies. |
| **All v2 UPDATE policies have `WITH CHECK`** | CLEAN | Verified every one; e.g. `15_policies_a_p.sql:108-110`, `:201-203`, `:40-48`; `16_policies_q_z.sql:22-24`. |
| **Leaderboard integrity** | CLEAN | `recalculate_leaderboard` / `recalculate_event_rankings` / `fulfill_paid_order` are invoked only from server code via service-role clients (`app/actions/event-leaderboard.ts:162-163`, `app/actions/event-certificate.ts:83-84`, `src/services/commerce.service.ts:315-316`). |
| **Scoring is server-side** | CLEAN | `src/services/scoring.service.ts`; answer saves go through `attemptAnswerService` which validates `getActiveOwnedAttempt(userId, attemptId)` (`src/services/attempt-answer.service.ts:55-58,86-89`) and enforces the server-side deadline (`:35-46`, `ATTEMPT_TIME_EXPIRED`, 30 s grace). |
| **Answer keys stripped from the live exam RPC** | CLEAN | `app_private.get_exam_attempt_state_for_user` strips them: `jsonb_agg(o - 'is_correct' - 'score' …)` (`scripts/cutover/bootstrap/08_functions_app_private_a_m.sql:942`). Same pattern at `:1035` and `13_functions_public_learning_rankings.sql:256`. |

---

## 3. P1 HIGH

### P1-1 — `authenticated` can EXECUTE `recalculate_leaderboard` (SECURITY DEFINER) and `recalculate_event_rankings`

**Confidence:** CONFIRMED for the repo's canonical ACL. **Live production state: NEEDS VERIFICATION.**

The in-repo migrations deliberately lock these down:

```sql
-- supabase/migrations/20260820131000_schema_v2_event_ranking_recalculation.sql:84-87
revoke all on function public.recalculate_event_rankings(uuid) from public;
revoke all on function public.recalculate_event_rankings(uuid) from anon;
revoke all on function public.recalculate_event_rankings(uuid) from authenticated;
grant execute on function public.recalculate_event_rankings(uuid) to service_role;
```
```sql
-- supabase/migrations/202608200630_schema_v2_national_leaderboard.sql:103-106  (identical for recalculate_leaderboard)
```

The canonical cutover ACL grants them straight back:

```sql
-- scripts/cutover/bootstrap/18_acl.sql
374: GRANT EXECUTE ON FUNCTION
…
361:   public.recalculate_event_rankings(p_event_id uuid),
362:   public.recalculate_leaderboard(p_leaderboard_id uuid),
…
403: TO authenticated;
```

Line 362 sits inside the block that terminates at line 403 (`TO authenticated;`) — I verified the block boundaries explicitly, because a sibling review initially misread line 372 as the terminator.

Privilege of the two functions differs, which changes exploitability:

- **`public.recalculate_leaderboard`** is `SECURITY DEFINER` (`scripts/cutover/bootstrap/13_functions_public_learning_rankings.sql:393-398`), so it runs with owner rights and **no in-function caller check**:
  ```sql
  393: CREATE OR REPLACE FUNCTION public.recalculate_leaderboard(p_leaderboard_id uuid)
  394:  RETURNS void
  395:  LANGUAGE plpgsql
  396:  SECURITY DEFINER
  397:  SET search_path TO 'public', 'pg_temp'
  ```
  Body: `delete from public.leaderboard_entries where leaderboard_id = p_leaderboard_id;` then recompute and re-insert for an **arbitrary** `p_leaderboard_id`.
- **`public.recalculate_event_rankings`** is SECURITY **INVOKER** (`13_functions_public_learning_rankings.sql:311-314`), and `authenticated` holds only `SELECT` on `event_rankings` → a direct call should fail with `permission denied for table event_rankings`.

**Exploit path:**
```
POST /rest/v1/rpc/recalculate_leaderboard
Authorization: Bearer <any learner access token>
{"p_leaderboard_id":"<any leaderboard uuid>"}
```
→ deletes and rewrites the national leaderboard for an arbitrary period, outside any admin flow.

**Impact:** leaderboard integrity/availability. A non-admin can force full recomputation (expensive DELETE + window-function INSERT) repeatedly, and a failure part-way leaves the board empty until the next scheduled recalculation. Not a confidentiality breach. **Downgraded from the sibling review's P1 to P2 for exploitability**, but retained as P1 for *correctness of privilege model* — migrations and bootstrap contradict each other and the contradiction is unresolved.

**Also reachable through legitimate app entrypoints**, which masks it: `app/actions/event-leaderboard.ts:162-163` and `app/actions/event-certificate.ts:83-84` both call the service-role RPC with **no `EVENT_MANAGE` check**. Any authenticated user who knows an event UUID can trigger a full ranking recalculation for it.

**Fix:** delete lines 361-362 from `18_acl.sql:374-403`; add a `has_permission('admin.access')`/`event.manage` guard inside `recalculate_leaderboard`; normalize `SET search_path TO 'public','pg_temp'` → `''`.

---

### P1-2 (historical) — Midtrans `fraud_status` validation gap

> **Status update (2026-10-11): SUPERSEDED in the current source tree.** Both the webhook and status-sync paths now pass Midtrans `capture` responses through `resolveMidtransFulfilment()` before applying provider status. `deny` blocks fulfilment; `challenge` and an unrecognized supplied fraud value remain pending. A missing fraud field is allowed for payment methods that do not use FDS. See `lib/midtrans-status.ts`, `app/api/payments/webhook/route.ts`, and `src/services/payment.service.ts`. The analysis and snippets below record the earlier audit snapshot; production deployment parity still needs verification.

**Confidence at that snapshot:** CONFIRMED (the omission) / POSSIBLE (real-world impact depended on Midtrans channel config).

```ts
// app/api/payments/webhook/route.ts:39-43
const transactionStatus = normalizeMidtransStatus(payload.transaction_status)
if (!isSupportedMidtransStatus(transactionStatus)) {
    return errorResponse('validation_error', 'Unsupported transaction status', 400)
}
```
```ts
// lib/midtrans-status.ts
const SUCCESS_STATUSES = new Set(['capture', 'settlement'])
```

At the time of the original snapshot, `fraud_status` existed in the typed payload (`lib/midtrans.ts:53`) and survived Zod `.passthrough()`, but a repo-wide grep across `app/`, `src/`, `lib/`, `components/`, `supabase/`, `scripts/`, `tests/`, `types/` returned **one hit — the type declaration itself**:

```
lib/midtrans.ts:53:    fraud_status?: string;
```

In that snapshot, neither the route, `paymentService.processWebhook`, nor `fulfill_paid_order` read it. The SQL success predicate was only:
```sql
-- 20260823071419_tka_pass_renewal_stacking_v1.sql:28
v_success boolean := lower(p_status) in ('capture', 'settlement');
```

**Historical exploit path:** on card/credit channels where Midtrans returned `transaction_status='capture'` with `fraud_status='challenge'` or `'deny'`, the webhook could set the order to `paid`, credit wallet tokens, extend entitlements, and create the event registration before or despite the fraud decision. A later `deny`/`refund` notification could hit the monotonic guard (`:62-70` kept `capture`/`settlement`) without clawing back granted goods.

**Impact at that snapshot:** direct revenue loss and free premium/event access, with no compensating reversal path.

**Historical recommendation:** when `transaction_status === 'capture'`, require `fraud_status === 'accept'`; treat `challenge`/`deny` as non-fulfilling. The current shared resolver implements the policy described in the status update above.

---

### P1-3 — A "security fix" migration is syntactically invalid, so its hardening never applied

**Confidence:** CONFIRMED by reading the SQL.

`supabase/migrations/202402280006_security_fixes.sql` is titled *"Security Fix: Function Search Path Mutable"*. It contains top-level bare PL/pgSQL blocks, which are **not valid SQL** outside a `DO` block or function body:

```sql
-- supabase/migrations/202402280006_security_fixes.sql:29-33
BEGIN
  ALTER FUNCTION public.increment_tryout_quota(UUID, INT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN NULL; END;
```
Repeated at `:38-41` (`update_user_streak`), `:43-46` (`calculate_session_score`), `:48-51` (`is_admin`).

This file cannot parse, so **every statement in it is inert** — including the `search_path` pins it claims to establish. Two functions are left with an unpinned `search_path` as a result:

- `public.update_user_streak()` — `202401290007_streak_trigger.sql:34` closes with `$$ language plpgsql security definer;` and has no `search_path`. The "fix" at `:38-41` additionally uses the wrong signature (`UUID` vs the actual zero-arg trigger function).
- `public.refresh_leaderboard_snapshot()` — `202402120003_leaderboard_snapshot.sql:23` `RETURNS void AS $$` with no `SECURITY DEFINER` and no `search_path`, never redefined or `ALTER`ed anywhere.

**Impact:** a `SECURITY DEFINER` function without a pinned `search_path` is the classic privilege-escalation vector (a caller who can create objects earlier in the resolution path can shadow referenced relations). Current exploitability is **LOW** because these are v1 (legacy) functions and their bodies are largely schema-qualified, but the migration is also the *reason* the gap was never noticed.

**Fix:** rewrite the four blocks as `ALTER FUNCTION … SET search_path = '';` statements (no `BEGIN/EXCEPTION`), fix the `update_user_streak` signature, and add the missing pin to `refresh_leaderboard_snapshot`.

---

## 4. P2 MEDIUM

### P2-1 — RLS write policies exist for tables where `authenticated` has no write GRANT (latent escalation)

The v2 RLS layer grants more than the ACL does. These policies are currently **unreachable** because the table privilege is absent — but they are a live footgun: a single future `GRANT UPDATE ON TABLE public.exam_attempts TO authenticated` instantly weaponises them.

```sql
-- scripts/cutover/bootstrap/15_policies_a_p.sql:102-110
CREATE POLICY exam_attempts_insert_own ON public.exam_attempts AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY exam_attempts_update_own ON public.exam_attempts AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
```
```sql
-- scripts/cutover/bootstrap/15_policies_a_p.sql:28-48
CREATE POLICY attempt_answers_insert_own … WITH CHECK (EXISTS (… ea.user_id = auth.uid() …));
CREATE POLICY attempt_answers_update_own … USING (…) WITH CHECK (…);
```
```sql
-- scripts/cutover/bootstrap/15_policies_a_p.sql:90-91
CREATE POLICY event_registrations_insert_own ON public.event_registrations … WITH CHECK ((user_id = auth.uid()));
```

None of these policies is column-scoped. `exam_attempts` carries `total_score`, `percentage`, `rank`, `passed`, `status` (`scripts/cutover/bootstrap/01_tables_a_f.sql:225-243`). If the GRANT ever appears, the exploit is a single PostgREST call:
```
PATCH /rest/v1/exam_attempts?id=eq.<own attempt>   {"total_score":500,"passed":true,"percentage":100}
```

The ACL is what saves it (`scripts/cutover/bootstrap/18_acl.sql`, resolved per-table):
```
exam_attempts      → REVOKE ALL FROM PUBLIC,anon,authenticated,service_role
                     GRANT ALL TO service_role
                     GRANT SELECT TO authenticated
attempt_answers    → REVOKE ALL … ; GRANT ALL TO service_role          ← no authenticated grant at all
event_registrations→ … GRANT SELECT TO authenticated
```

**Note the deliberate contrast that proves this is not the intended pattern:** for `profiles` and `notifications`, the codebase *does* use column-level grants to constrain a permissive RLS policy:
```sql
-- scripts/cutover/bootstrap/18_acl.sql:283-285
GRANT UPDATE (read_at) ON TABLE public.notifications TO authenticated;
GRANT UPDATE (avatar_url, birth_date, display_name, full_name, gender, onboarding_completed, phone, updated_at)
  ON TABLE public.profiles TO authenticated;
```
```sql
-- supabase/migrations/20260904174500_allow_users_to_update_own_profile.sql:1-3
-- RLS decides which row a user owns; column grants limit which profile fields
-- that owner may change through the Data API.
```
So `exam_attempts_update_own` / `attempt_answers_update_own` / `event_registrations_insert_own` are missing that second half.

**Fix:** either drop the three dead policies, or pair them with explicit column grants the way `profiles` does. Do **not** add a table-level `GRANT UPDATE`.

---

### P2-2 — Contract drift: canonical ACL disagrees with migrations and with `docs/STATUS.md`

`scripts/cutover/bootstrap/18_acl.sql` grants `SELECT` on **57** tables to `authenticated`, and — critically — grants **nothing** on `attempt_questions`, `attempt_answers`, `question_versions`, `question_options`, `question_explanations` (I resolved each table's effective privilege by parsing every `GRANT`/`REVOKE` statement, after an initial greedy-regex parse misled me; see §8).

Three sources disagree:

| Source | Claim about `attempt_questions` / `attempt_answers` / `question_versions` |
|---|---|
| `scripts/cutover/bootstrap/18_acl.sql` (frozen 2026-09-16 21:10) | No privilege for `authenticated` — **closed** |
| `docs/STATUS.md:187,193` | "`authenticated` tanpa SELECT di `attempt_questions`/`attempt_answers`/`question_versions`" — agrees |
| `supabase/migrations/*.sql` | Contains **no** `REVOKE` for `attempt_questions`/`attempt_answers` at all; only `20260916213100` revokes `question_versions` |
| `supabase/migration-history-archive/production-2026-09-16-before-baseline.json` | 165 ledger rows; ≥**49 of 161** local files have no matching entry; staging's ledger (82 rows) is missing ≥**106** |

`supabase/migrations/README.md:88-89` concedes the point: *"Ini deklarasi baseline, bukan klaim bahwa setiap file dijalankan satu per satu."*

**Impact:** `supabase db push` cannot be trusted to reproduce either environment, and a fresh environment built only from `supabase/migrations/` would differ from production in ways no test detects. There is **no regression test** asserting `authenticated` lacks SELECT on `attempt_questions`/`attempt_answers` — `tests/unit/answer-key-access-contract.test.ts` only tests `question_versions` and the `get_content_question_detail` guard.

**Fix:** add idempotent `REVOKE SELECT ON TABLE public.attempt_questions, public.attempt_answers FROM public, anon, authenticated;` migrations; extend the answer-key contract test to those tables; reconcile the ledger.

---

### P2-3 — The P0 recorded in `AGENTS.md` is stale; docs contradict each other

`AGENTS.md` states:
> **Blocker P0 terbuka:** kebocoran kunci jawaban lewat RPC `get_content_question_detail` dan tabel `question_versions`. Migration perbaikan sudah ada, **belum di-apply ke DB**.

`docs/STATUS.md:81-91` (updated 2026-09-16) states both are **fixed and verified on staging *and* production**, and lists the evidence:

| P0-1 | ✅ diperbaiki | ✅ **staging 2026-09-16** · ✅ **produksi 2026-09-16** |
| P0-2 | ✅ diperbaiki | ✅ **staging 2026-09-16** · ✅ **produksi 2026-09-16** |

Corroborating in-repo evidence: both migration-ledger dumps list `20260916213000` and `20260916213100` as their two newest recorded versions; the bootstrap function files (mtime 21:10) encode the *fixed* guard; git commit `6c6b5c4` *"fix(security): tutup kebocoran kunci jawaban (P0)"*.

The fix itself is sound and I verified it:
```sql
-- 20260916213000_fix_content_question_detail_answer_key_leak.sql:41-51
v_allowed :=
  v_q.author_id = v_actor
  or v_q.reviewer_id = v_actor
  or app_private.current_user_has_permission('admin.access')
  or app_private.current_user_has_permission('question.manage')
  or app_private.current_user_has_permission('content.read')
  … ;
if not v_allowed then raise exception 'Question detail access denied'; end if;
```
The leaky `v_q.status in ('approved','published')` predicate is gone, and the function is pinned: `:28-29` `security definer` / `set search_path to ''`.

**Caveat I cannot discharge from files:** `supabase migration repair --status applied` also writes ledger rows without executing SQL. The two verification queries in `docs/STATUS.md:158-168` (both expected to return 0 rows) are the only way to settle it.

**Fix:** update `AGENTS.md` to mark P0-1/P0-2 CLOSED and point at `docs/STATUS.md`. Stale security docs cause real harm — a reader will either chase a fixed bug or distrust the fix list entirely.

---

### P2-4 — Unscoped `USING (true)` on `leaderboard_entries` and `event_rankings`

```sql
-- scripts/cutover/bootstrap/15_policies_a_p.sql:139-140
CREATE POLICY leaderboard_entries_read ON public.leaderboard_entries AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
```
```sql
-- scripts/cutover/bootstrap/15_policies_a_p.sql:87-88
CREATE POLICY event_rankings_read ON public.event_rankings AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
```

Both tables are `GRANT SELECT TO authenticated`, so **any** logged-in user can read **every** row — `leaderboard_id, user_id, score, rank, metadata` — across all programs, tracks and periods, with no scoping. The sibling `leaderboards_read` policy at least requires `status='ACTIVE'`; these two do not.

**Impact:** privacy — cross-program enumeration of user IDs and scores. Not a write risk. Also means a learner can read a competition board for a period they were never part of.

**Fix:** scope `leaderboard_entries_read` through a join on `leaderboards` (status + program/track/period window), mirroring what `app_private.get_national_leaderboard` already does server-side.

The other 14 `USING (true)` policies in the v2 bootstrap are all SELECT-only reference/master data (`exam_types`, `subjects`, `tags`, `product_prices`, …) and are acceptable.

---

### P2-5 — Rate limiting absent on answer-submission, event registration and certificate-claim actions

Only two action files call any limiter:

```
app/actions/payment.ts      5 rate-limit call sites
app/auth/actions.ts         5 rate-limit call sites
```
All 17 others — including `practice.ts` (7 exports: `startPractice`, `startMiniTryout`, `startTryout`, `submitAnswer`, `submitAnswerOptions`, `finishPractice`, …), `tka-full-exam.ts`, `tka-practice.ts`, `event.ts`, `profile.ts`, `user-track.ts` — have none.

Mitigating factors that keep this at P2, not P1: answer writes are idempotent upserts keyed on `attempt_question_id`, the attempt must be owned and `in_progress` (`attempt-answer.service.ts:55-58`), and the server-side deadline applies (`:35-46`). So the realistic exposure is DB write amplification and connection pressure, plus PDF render cost in `claimEventCertificate`, not score manipulation.

`isAuthActionRateLimited` is well designed where it is applied — `lib/server-rate-limit.ts:43-54` deliberately does **not** key login/signup per-email to avoid lockout DoS, hashes emails before using them as Redis keys (`:60-62`), and enforces a fail-closed default (`E2E_DISABLE_AUTH_RATE_LIMIT !== '1'`).

**Fix:** apply `isServerActionRateLimited(user.id, …)` to `submitAnswer`/`submitAnswerOptions`, `registerTryoutEvent`, and `claimEventCertificate`.

---

### P2-6 — IP extraction prioritises a client-spoofable header; `/api/health` advertises it

```ts
// lib/request-ip.ts:19-23
const CLIENT_IP_CANDIDATES = ['x-vercel-forwarded-for', 'x-real-ip', 'x-forwarded-for']
…
const ip = value.split(',')[0]?.trim()
```

On Vercel, `x-vercel-forwarded-for` and `x-forwarded-for` are platform-set and this is safe. On any other host, `x-real-ip` and `x-forwarded-for` are attacker-controlled, so every IP-keyed limiter (login, signup, forgot-password, beacon) can be evaded by rotating the header. `docs/STATUS.md:186-188` acknowledges this is proven only for header *priority*, and that Vercel's overwrite guarantee is a platform contract — which is accurate and honest.

Separately, `/api/health` (`app/api/health/route.ts:26-37,58`) is unauthenticated and returns `clientIpSource`, `rateLimitStore` (`'redis'|'memory'`), `deploymentCommitSha` and `deploymentEnvironment`. This is reconnaissance value: `rateLimitStore: 'memory'` tells an attacker the limiter is per-instance, and the commit SHA enables targeting known revisions. No row data is returned and it does construct a service-role client (`:68`) for existence probes only.

**Fix:** drop `x-real-ip` from the candidate list on non-Vercel deployments (or gate it behind an explicit env flag); gate `/api/health` detail behind a shared secret.

---

### P2-7 — Cron secret compared with non-constant-time `===`

```ts
// app/api/cron/reconcile-payments/route.ts:26-29
function isAuthorized(request: Request) {
    const cronSecret = process.env.CRON_SECRET
    return Boolean(cronSecret && request.headers.get('authorization') === `Bearer ${cronSecret}`)
}
```

Fail-**closed** (good — missing env means every request 401s) and reads only the `authorization` header (good), but not timing-safe, unlike two other places in this same repo that get it right (`lib/csrf.ts:23-30`, `app/api/payments/webhook/route.ts:9-15`). Remote timing extraction of a 32+ char secret is not practical, hence P2 not P1. `CRON_SECRET` is absent from `.env.schema-v2.example`, so accidental omission silently disables reconciliation.

**Fix:** `crypto.timingSafeEqual` over equal-length buffers.

---

## 5. P3 LOW

| # | Finding | Evidence | Note |
|---|---|---|---|
| P3-1 | Retired unauthenticated route under `/api/admin/*` | `app/api/admin/export/route.ts:3-14` — no auth, but returns 410 and touches no data/DB client | Harmless now; a live unauthenticated admin-namespace endpoint a future edit could arm |
| P3-2 | `/auth/callback` POST has no Origin/CSRF check | `app/auth/callback/route.ts:173-214` accepts `{access_token,refresh_token,next}` from any origin and sets session cookies | Open-redirect is closed (`sanitizeNext`), residual is login-CSRF/session fixation |
| P3-3 | CSRF fallback trusts `x-forwarded-host`/`x-forwarded-proto` | `lib/csrf.ts:69-83` | Safe on Vercel; spoofable on a self-hosted reverse proxy. Primary header-mode double-submit is sound |
| P3-4 | `PG_TEMP` in a SECURITY DEFINER search_path | `scripts/cutover/bootstrap/13_functions_public_learning_rankings.sql:397` `SET search_path TO 'public', 'pg_temp'` | Documented anti-pattern; not exploitable today (all relations schema-qualified; no `CREATE` on `public`) |
| P3-5 | `GRANT EXECUTE … TO PUBLIC` on 11 `app_private` functions | `scripts/cutover/bootstrap/18_acl.sql:412-424` incl. `get_content_question_detail`, `get_user_authorization`, `save_question_draft` | `TO PUBLIC` includes `anon`; mitigated because `app_private` is not PostgREST-exposed (`supabase/config.toml:13` `schemas = ["public","graphql_public"]`) and bodies self-guard. Deviates from least privilege |
| P3-6 | Two `app_private` tables have no RLS | `20260823114955_cpns_legacy_mapping_review_registry_v1.sql:1`, `20260823115204_cpns_legacy_import_stage_v1.sql:1` | Contain CPNS legacy import payloads; not reachable (schema not exposed). Defence-in-depth only |
| P3-7 | Admin actions leak guard error text into redirect URLs | `app/actions/admin-exams.ts:80-81,151-154`; `app/actions/admin-v2.ts:143` | `Missing permission: exam.manage`, `Invalid CSRF token` land in the URL/referrer. No escalation. `finish()` also calls `revalidatePath` before the authz outcome is known |
| P3-8 | Webhook has no IP allowlist / rate limit | `app/api/payments/webhook/route.ts` | Signature verification is the sole gate; unauthenticated traffic reaches SHA512 + JSON parse + (on valid signature) DB lookups |
| P3-9 | Four migrations reference `profiles.role`, which does not exist in Schema V2 | **(a)** `202606200002_harden_rls_policies.sql:7-17` — admin-gated read of v1 `options`/`questions`; **(b)** `202606200003_audit_logs.sql:18-20` — `CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT USING ((select role from profiles where id = auth.uid()) IN ('admin','superadmin'))`; **(c)** `202606240002_article_writer_storage.sql:15-17` — storage insert gated on `profiles.role = 'article_writer'`; **(d)** the grep in `app/actions/admin.ts:982` documenting the removal | Schema V2 `profiles` has **no** `role` column (verified: `scripts/cutover/bootstrap/02_tables_g_p.sql:278-293`). In v2, `audit_logs` is **deny-all** with zero policies (verified against both policy files), and the v2 table shape differs anyway (`actor_user_id`/`entity_type`/`entity_id` vs the migration's `actor_id`/`target_type`/`target_id` — `01_tables_a_f.sql:88-99`). All are fail-closed dead code that *looks* like protection, so an auditor may wrongly believe admin audit-log review exists |
| P3-10 | Nonce is set on the request but never applied to framework scripts by hand | `proxy.ts:120` sets `x-nonce`; `app/layout.tsx` does not read it (only `app/cpns/dashboard/layout.tsx:28,80` and `app/auth/callback/route.ts:44,97` do) | Presumed handled by Next.js's CSP-nonce detection; if not, the CSP would break the app loudly rather than silently weaken it. Worth one browser confirmation of `script-src` behaviour |

---

## 6. Legacy vs Schema V2 — what is real

This distinction matters more here than in most audits. The repo contains **three** strata:

1. **Schema V2 canonical runtime** — `scripts/cutover/bootstrap/*.sql` (98 tables, 98 RLS-enabled, 71 policies, frozen ACL) plus migrations dated `2026082*`–`202609*`. **This is production.**
2. **Legacy v1** — `supabase/schema.sql` (8 tables: `profiles`, `questions`, `options`, `test_sessions`, `test_answers`, `transactions`, `tryout_configurations`, `leaderboard_snapshot`), `2024*`–`2026-06*` migrations, `supabase/migrations/_archive/`. Archived to `legacy_prod` at the 2026-09-01 cutover (`docs/STATUS.md:37`).
3. **Generic/TOEFL sandbox** — `20260316_create_generic_exam_schema.sql`; dropped again by `202604100002_remove_generic_toefl_schema.sql:32-36`.

**Legacy findings that are real for v1 and must NOT be applied to v2:**

`supabase/schema.sql:357` and `202402280004_performance_fixes.sql:11` define:
```sql
create policy "Users can update own profile" on profiles for update using ((select auth.uid()) = id);
```
No `WITH CHECK`, no column restriction. In PostgreSQL an UPDATE policy with only `USING` reuses it as the check, so **every column on the owned row becomes writable** — and v1 `profiles` has `role text not null default 'user'` (`schema.sql:61`). Combined with Supabase's default table privileges (no `GRANT`/`REVOKE` on `profiles` anywhere in the v1 chain), this is self-promotion to `admin`, which then unlocks the answer-key read policies at `202606200002:7-17`.

Same shape at `supabase/schema.sql:373` for `test_sessions` (columns `total_score`, `score_twk/tiu/tkp`, `is_passed`, `status`) — and the leaderboard is computed straight from that table (`202402120002_leaderboard_mv_cron.sql:11-20`), so it is direct ranking forgery. No migration ever drops that policy.

**These do not apply to Schema V2**, because v2 `profiles` has no `role` column and v2 uses RBAC tables plus column grants. But they are the exact reason v2 is built the way it is, they remain live for any v1 environment, and they are a hazard if `legacy_prod` is ever exposed. **Verify `legacy_prod` is not in PostgREST `db-schemas`.**

One legacy file must never be re-run: `supabase/migrations/_archive/quota_rpc.sql` (`SECURITY DEFINER` with no `search_path` at `:6-13`, plus a permissive `transactions` INSERT policy at `:24-26`; both superseded and closed in the active chain).

---

## 7. Authentication deep-dive

- **`proxy.ts` is the Next.js 16 middleware successor.** `node_modules/next/dist/lib/constants.js:289` defines `PROXY_FILENAME = 'proxy'`, so `proxy.ts` **is** the active middleware — the absence of `middleware.ts` is not a gap. It handles legacy `/cpns/admin*` → `/admin*` redirects, per-request CSP nonce, `x-pathname`, and the CSRF cookie.
- **Middleware is not the authorization boundary, and correctly so.** `lib/utils/supabase/middleware.ts:9` lists only `/onboarding`, `/cpns/dashboard`, `/cpns/admin` as `PROTECTED_ROUTES` — `/admin` is deliberately **not** there. That is fine because `app/admin/layout.tsx:25-45` enforces it server-side. I verified no admin page relies on the middleware. Its real job is session cookie refresh (`:62` `getUser()`), which it does correctly.
- **`x-pathname` cannot be spoofed into the admin layout.** `proxy.ts:121` overwrites it on every matched request; the matcher (`:137-140`) excludes only static assets. A client-supplied value is always replaced.
- **`SERVICE_ROLE` usage is disciplined.** `createAdminClient()` / `createV2AdminClient()` (`lib/utils/supabase/server.ts:70-88`) each carry a "USE ONLY on the server after explicit authorization checks" doc comment, and no client component imports that module.
- **`get_user_authorization` is correctly scoped:**
  ```sql
  -- 202608210006_authenticated_authorization_rpc_v1.sql:16-20
  if v_actor is null then raise exception 'Authentication required'; end if;
  if p_user_id is null then raise exception 'User id required'; end if;
  if p_user_id <> v_actor and not app_private.current_user_has_permission('admin.access') then
    raise exception 'Authorization lookup denied';
  end if;
  ```
  Pinned with `set search_path = ''` (`:9`), `revoke all … from public,anon` (`:68`), `grant execute … to authenticated` (`:69`). A user cannot enumerate another user's permissions.
- **Password flows are sound.** `updatePassword` re-authenticates with the current password before updating (`app/actions/profile.ts:202-208`) and then signs out other sessions globally (`:215-225`). `deleteAccount` requires the literal `'HAPUS'` (`:243-245`) and can only delete the session user's own account (`:251`).
- **`get_content_question_detail` P0** — verified fixed in-repo, pinned, denied to unpermissioned users. See P2-3 for the stale-docs caveat.

---

## 8. Methodology note — one self-correction

I initially concluded that `attempt_questions.question_snapshot` (which embeds `is_correct` + `score`, per `scripts/cutover/bootstrap/09_functions_app_private_n_r.sql:59-75` and the snapshot built at `10_functions_app_private_s_z.sql:648-672`) was readable by students, because `attempt_questions_select_own` exists (`15_policies_a_p.sql:50-53`) and I misread the ACL.

The ACL parse was wrong: a greedy `GRANT … ON TABLE (.*?) TO authenticated` regex swallowed the `REVOKE` block, making it look like the `GRANT ALL … TO service_role` list was an `authenticated` grant. Re-parsing each statement individually gave the true result:

```
attempt_questions → REVOKE ALL FROM PUBLIC,anon,authenticated,service_role
                    GRANT ALL TO service_role                    ← nothing for authenticated
attempt_answers   → same
question_versions → same
question_options  → same
```

**Conclusion: no answer-key exposure through these tables. This is a `GRANT`-level control, not an RLS-level one** — which is exactly why P2-1 (dead RLS write policies) and P2-2 (no test pinning the ACL) matter: nothing structural prevents a regression.

---

## 9. TOP 10 SECURITY FINDINGS — ranked by real exploitability

| # | Sev | Confidence | Finding | Exploit path | Primary evidence |
|---|---|---|---|---|---|
| 1 | **P1** | CONFIRMED (repo) / NEEDS VERIFICATION (live) | `authenticated` holds `EXECUTE` on `recalculate_leaderboard` (SECURITY DEFINER, no caller check) and `recalculate_event_rankings`, contradicting migrations that revoke both | `POST /rest/v1/rpc/recalculate_leaderboard {"p_leaderboard_id":"<any>"}` with any learner token → wipes and rewrites an arbitrary leaderboard | `18_acl.sql:361-362` inside block ending `:403`; `13_functions_public_learning_rankings.sql:393-398` (SECURITY DEFINER) vs `202608200630:103-106` (revoke) |
| 2 | **P1** | Historical finding; remediated in current source, deployment needs verification | Earlier snapshot did not validate Midtrans `fraud_status` before fulfilment; both webhook and status sync now use the shared resolver | Historical risk: `capture` + `fraud_status='deny'` could grant goods before the fix | Earlier evidence: `app/api/payments/webhook/route.ts:39-43`; current guard: `lib/midtrans-status.ts`, `app/api/payments/webhook/route.ts`, `src/services/payment.service.ts` |
| 3 | **P1** | CONFIRMED | `202402280006_security_fixes.sql` is invalid SQL (top-level bare `BEGIN…EXCEPTION`), so all its `search_path` hardening is inert; 2 live SECURITY DEFINER functions remain unpinned and the "fix" uses the wrong signature | Latent search-path privilege escalation on legacy functions | `202402280006:29-33,38-41,43-46,48-51`; `202401290007:34`; `202402120003:23` |
| 4 | **P2** | CONFIRMED | RLS write policies exist for `exam_attempts` (`total_score`/`passed`/`percentage`/`rank`), `attempt_answers`, `event_registrations` with no column scoping; only the missing table GRANT prevents escalation | One future `GRANT UPDATE` → `PATCH /rest/v1/exam_attempts?id=eq.<own>` `{"total_score":500,"passed":true}` | `15_policies_a_p.sql:102-110,28-48,90-91`; contrast the deliberate column grants at `18_acl.sql:283-285` |
| 5 | **P2** | CONFIRMED | Canonical ACL ≠ migration chain ≠ `docs/STATUS.md`; ≥49/161 local files absent from production's ledger, no test pins the answer-table ACL. Unscoped `USING (true)` on `leaderboard_entries` + `event_rankings` | Cross-program enumeration of every user's `user_id`/`score`/`rank`; `supabase db push` semantics untrustworthy | `18_acl.sql` vs `20260916213100` (only `question_versions` revoked); `migration-history-archive/*.json`; `15_policies_a_p.sql:139-140,87-88` |
| 6 | **P2** | CONFIRMED | No rate limiting on answer submission, event registration, certificate claim — 17 of 19 action files have none | Authenticated user floods `submitAnswer`/`claimEventCertificate` → DB write amplification, PDF render cost, connection pressure | `app/actions/practice.ts`, `tka-full-exam.ts`, `event.ts` vs limiter use only in `payment.ts` + `auth/actions.ts` |
| 7 | **P2** | CONFIRMED | Legacy v1 self-escalation: `profiles.role` self-promotion → admin → answer keys; `test_sessions` score forgery → leaderboard manipulation | `PATCH /rest/v1/profiles?id=eq.<own>` `{"role":"admin"}`; `PATCH /rest/v1/test_sessions?id=eq.<own>` `{"total_score":500,"is_passed":true}` | `supabase/schema.sql:61,357,373`; `202402280004:11`; `202606200002:7-17`; `202402120002:11-20` — **v1 only, verify `legacy_prod` is not exposed** |
| 8 | **P2** | CONFIRMED | IP-based rate limiting prioritises a client-spoofable header; `/api/health` advertises the header used and whether the limiter is Redis-backed | Rotate `x-real-ip` to bypass login/signup/forgot-password limits on non-Vercel hosts | `lib/request-ip.ts:19-23,32`; `app/api/health/route.ts:26-37,58` |
| 9 | **P2** | CONFIRMED | Cron secret compared with `===` (not timing-safe); `CRON_SECRET` absent from `.env.schema-v2.example` so omission silently 401s | Practical remote timing attack unlikely; consistency + silent-failure risk | `app/api/cron/reconcile-payments/route.ts:26-29` vs `lib/csrf.ts:23-30` |
| 10 | **P2** | CONFIRMED | `AGENTS.md` declares the answer-key P0 open/"belum di-apply" while `docs/STATUS.md:81-91` records it fixed on staging **and** production, corroborated by both migration-ledger dumps and commit `6c6b5c4` | Operator confusion: either chases a fixed bug or distrusts the whole fix list | `AGENTS.md` "Status Terkini" vs `docs/STATUS.md:81-91,135-136`; `migration-history-archive/*.json` |

**P3 items (not ranked):** retired unauthenticated `/api/admin/export`; `/auth/callback` POST without Origin check; CSRF fallback header trust; `pg_temp` in a SECURITY DEFINER path; `GRANT EXECUTE … TO PUBLIC` on `app_private` functions; two `app_private` tables without RLS; admin-action error text in redirect URLs; no webhook IP allowlist; four migrations referencing the non-existent `profiles.role` (including a dead `audit_logs` admin-read policy); hand-maintained CSP nonce.

---

## 10. Prioritised remediation

**Before exposing the public domain**
1. Resolve finding #1: remove `recalculate_leaderboard` / `recalculate_event_rankings` from the `TO authenticated` block in `18_acl.sql:374-403`, add in-function permission guards, normalize `pg_temp` → `''`.
2. Verify that the active deployment includes the shared fraud-status resolver in both webhook and status-sync paths; the current source already contains this guard.
3. Run the two verification queries in `docs/STATUS.md:158-168` (expect 0 rows) plus the `pg_proc.proconfig` query below, to convert every NEEDS VERIFICATION into settled fact.

```sql
-- Unpinned SECURITY DEFINER functions (expect 0 rows after fixes)
select p.oid::regprocedure, p.proconfig
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where p.prosecdef
  and (p.proconfig is null or not exists (
    select 1 from unnest(p.proconfig) c where c like 'search\_path=%'))
order by 1;

-- Live privileges on the ranking RPCs
select p.proname, p.proacl, p.prosecdef
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('recalculate_leaderboard','recalculate_event_rankings');

-- Confirm legacy_prod is not API-exposed
select current_setting('pgrst.db_schemas', true), nspname
from pg_namespace where nspname in ('legacy_prod','app_private');
```

**Next**
4. Finding #4: drop the three dead write policies, or pair them with explicit column grants as `profiles`/`notifications` already do.
5. Finding #5: add idempotent revoke migrations for `attempt_questions`/`attempt_answers`; extend `tests/unit/answer-key-access-contract.test.ts` to pin the ACL for those tables; scope the two `USING (true)` leaderboard policies.
6. Finding #6: apply `isServerActionRateLimited` to `submitAnswer`, `submitAnswerOptions`, `registerTryoutEvent`, `claimEventCertificate`.
7. Finding #7: confirm `legacy_prod` is not in `db-schemas`; if any v1 environment is reachable, add `WITH CHECK` + column grants to the `profiles` and `test_sessions` UPDATE policies.
8. Findings #8/#9: drop `x-real-ip` from the candidate list on non-Vercel hosts; gate `/api/health` detail; make the cron compare timing-safe; add `CRON_SECRET` to `.env.schema-v2.example`.
9. Finding #10: correct `AGENTS.md`.

**Process (highest long-term value)**
10. Make schema state reproducible and *tested*: reconcile the local migration folder with the recorded ledgers, and add an RLS/ACL contract test suite that asserts, for `anon` and `authenticated`, the exact privilege set on every sensitive table. Every P2 finding above is a case where the code and the docs disagreed and nothing failed.

---

*End of report. Read-only: no file in the repository was created, modified, or deleted by this audit. This report file itself is the only artifact written, at the user's request for a deliverable.*
