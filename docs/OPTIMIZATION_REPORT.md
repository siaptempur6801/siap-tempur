# Siap Tempur optimization report — 2026-10-09

## Outcome and scope

Implemented and committed safe improvements on `optimize/end-to-end-2026-10-09`, based on the clean, current `origin/main` commit `c9d80a7aaace704ec67f1e3276ad86264a808b76`. Read `docs/ADMIN_PERFORMANCE_REPORT.md` and `SECURITY_AUDIT_AUTH_AUTHZ_RLS.md` before editing. Existing admin projections, pagination, authorization, payment fraud checks, and transaction safeguards were preserved.

Runtime dependency audit is clean. The local CI gates pass, including public E2E with CI's placeholder service-role credential. CPNS, TKA, admin roles, payment script navigation, and database parity were exercised. Production database, secrets, deployments, and infrastructure were not modified. Two versioned migrations were applied **only to verified staging**, `lpgrivowdcepcxradavu`.

**Latest follow-up decision: ready for code review; NO-GO for production rollout until the concrete checklist below passes.** Hosted CI has not been rerun on these commits: the branch was not pushed, avoiding an automatic deployment. Production rollout and capacity certification remain separate, approval-gated operations.

## Measurement method

Baseline: Node 24.16.0, npm 11.13.0, local production build, Supabase staging, Chromium desktop 1440 × 1000. Each browser route used three fresh contexts, disposable learner fixtures, the same readiness selectors, and a 500 ms post-readiness observation. Server-side fetch instrumentation counted Supabase HTTP requests and response bytes, including authentication, proxy calls, and speculative prefetches. These are **HTTP counts, not SQL statement counts**. Instrumentation adds overhead to both runs.

Raw sanitized samples are committed in [optimization-metrics.json](optimization-metrics.json). Schema comparison evidence is in [optimization-schema-parity.json](optimization-schema-parity.json). Detailed local logs and screenshots are under `/tmp/siap-tempur-optimization`; credentials and fixture cookies are not committed.

Staging has 1,086 questions and 42 catalog assessments. Browser samples are small, network-sensitive observations, not production P95/P99 or concurrency evidence. JavaScript bytes use Resource Timing `encodedBodySize`; opaque cross-origin assets may report zero. Midtrans requests are counted separately.

| Route | Readiness median before → after | Supabase requests median | Response bytes median | JS bytes before → after |
|---|---:|---:|---:|---:|
| `/cpns/dashboard` | 1,343 → 716 ms | 37 → 21 | 30,102 → 11,925 | 212,010 → 210,241 |
| `/tka/smp` | 1,045 → 1,167 ms | 33 → 21 | 51,143 → 21,603 | 193,183 → 193,348 |
| `/tka/smp/tryout` | 829 → 1,137 ms | 31 → 16 | 35,524 → 19,680 | 206,339 → 206,504 |
| `/tka/smp/mini-tryout` | 857 → 1,095 ms | 32 → 16 | 36,658 → 19,680 | 206,339 → 206,504 |
| `/` | 104 → 112 ms | 0 → 0 | 0 → 0 | 196,606 → 196,761 |

CPNS dashboard median readiness improved 46.7%; its Supabase payload fell 60.4%. TKA request and payload reductions are confirmed, but **TKA latency improvement is not established**: the measured medians increased. The small JS increases on other routes followed the framework security update; no bundle reduction is claimed there.

## Phase 1 — Security and CI

### Confirmed findings and changes

The latest inspected main CI run, [37839046620](https://github.com/8shagrid/siap-tempur/actions/runs/37839046620), passed lint, typecheck, and 800 unit tests, then failed its dependency audit. The installed runtime dependency graph contained one critical advisory and additional high/low advisories.

| Dependency | Installed before | Installed after | Change |
|---|---|---|---|
| Next.js | 16.3.4 | 16.3.8 | Conservative patch; matching `eslint-config-next` |
| Sharp | 0.35.4 | 0.35.5 | Patched runtime image dependency |
| KaTeX | 0.16.47 | 0.18.10 | Patched parser; minimum declared version 0.18.2 |
| react-katex | 3.1.0 | 3.1.0 | Retained wrapper API; override uses the patched direct KaTeX dependency |
| source-map-js | 1.2.1 | 1.2.2 | Targeted lockfile security update |

Relevant primary advisories: [Next.js](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j), [Sharp](https://github.com/advisories/GHSA-wq5f-xc86-pv6w), [KaTeX](https://github.com/advisories/GHSA-238p-pmpm-9mq7), and [source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).

Files: `package.json`, `package-lock.json`, `.github/workflows/ci.yml`, `tests/unit/katex-security.test.tsx`. CI now uses `npm ci`; its audit commands and thresholds are unchanged. Lock normalization also incorporated safe transitive patches. No forced broad dependency upgrade or audit suppression was used.

Further CI-equivalent testing exposed two existing privileged-read dependencies:

- TKA result rewards failed without a real admin key. `src/services/gamification.service.ts`, `src/repositories/practice-overview.repository.ts`, and `app/tka/[level]/tryout/[sessionId]/result/page.tsx` now use the supplied authenticated client and a parameterless owner-only total aggregate. Streak reads use the same authenticated client. Scoring and XP formulas are unchanged.
- Public `/cpns` and `/blog` failed because `src/services/article-read.service.ts` used a service-role client inside its public cache. A stateless publishable client now follows the existing published-only RLS policy. All four queries retain the explicit published filter, cache keys, 300-second TTL, and invalidation behavior. No cookies or user permissions enter this persistent cache.

### Results and remaining risk

Runtime audit: **5 findings → 0**. Full audit: **11 findings, including 1 critical → 5 high findings, 0 critical**. The remaining findings are the development-only `braces` → `micromatch` → `fast-glob` → Next ESLint dependency chain. The [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) had no published patch at verification time. It remains visible to the unchanged audit gate; it is not ignored or overridden to an unverified version.

`npm ci`, lint, typecheck, production build, 844 unit tests, and both original CI audit commands pass. KaTeX regression tests cover inline/display rendering, incomplete editor math, prototype-polluted trust, and blocked untrusted images. Public E2E with `SUPABASE_SERVICE_ROLE_KEY=ci-no-service-role`: **42 passed, 2 existing optional-credential skips**. TKA with the same placeholder: **17 passed**.

Commits: `89d16c3`, `f04bf80`, `b008f23`.

## Phase 2 — Database and backend

### Confirmed bottlenecks and implemented changes

- `src/repositories/practice-overview.repository.ts`: XP and session totals downloaded and reduced every completed attempt in 1,000-row pages. One SQL aggregate now returns two scalar totals. At 1,005 completed attempts, the prior code needs two history responses; the replacement returns one row. This bound was verified with rollback fixtures, not presented as a production load benchmark.
- Active CPNS progress previously fetched attempt questions and selected answers in batches. A bounded 30-attempt projection now computes counts in SQL, preserving the existing single-option answered-count convention and status casing. Question snapshots, answer keys, and selected option IDs are not returned.
- `app/tka/[level]/page.tsx`: downloaded up to 5,000 question rows solely for a total. The overview now uses an exact HEAD count. The tested 300-question response body previously contained 17,098 bytes; the count response has no row body. Counts also remain accurate beyond the old row cap.
- `app/tka/[level]/tryout/page.tsx` and `mini-tryout/page.tsx`: unbounded attempt history for quotas is replaced by one owner-scoped summary per catalog exam, including its latest active attempt ID. Counts include all statuses. Full tryout preserves the prior direct-context filter; mini tryout preserves its prior all-context counting.
- `src/repositories/tka-catalog-read.repository.ts`: joined track/program lookup removes a dependent HTTP read. `React.cache` deduplicates only within a request. It does not persist attempts, entitlements, payments, or permissions across users.

Migrations:

1. `supabase/migrations/20261009060323_learner_overview_read_models.sql`: privileged completed totals and active progress; authenticated owner-only TKA quota summaries.
2. `supabase/migrations/20261009063825_learner_reward_totals.sql`: parameterless authenticated reward totals, always constrained by `auth.uid()`.

All four functions use `SECURITY INVOKER`, explicit empty search paths, and existing RLS. Anonymous execution is denied. CPNS projections remain service-role-only. No table grants, RLS policies, scoring writes, quota deductions, or transaction functions were changed.

### Validation and impact

`learner-overview-parity.mjs`: **20 assertions passed** while the owned active QA attempt was present. After cleanup, **14 assertions passed** against the original 42 attempts and three TKA tracks. `admin-performance-parity.mjs`: **1,634 assertions passed** across 42 assessments, 1,086 questions, three contexts, and four monitoring scopes.

`learner-overview-fixtures.sql` passed on staging and rolled back: 1,005 completed attempts, fractional/negative/null scores, each XP minimum, invalid metadata types, completion casing, 1,008 total-context attempts, 1,006 direct-context attempts, latest-active selection, 1,005 active questions, and selected versus merely timestamped answers. Actual authenticated-role reward totals match; switching the JWT subject cannot reveal another user's totals. Existing authenticated TKA E2E verifies quotas, pass enforcement, owner-only orders/payments, simultaneous starts, results, and remedial behavior.

EXPLAIN ANALYZE staging observations: completed-total projection approximately **1.5 ms**; active-progress projection approximately **10.4 ms**, including the sample-user lookup. A question-count plan used existing bitmap indexes. These are individual small-fixture observations, not an equivalent before/after SQL latency benchmark. No speculative index was added.

Read-only metadata comparison through Supabase MCP found exactly four new staging functions, the previously documented staging import table and its index, and migration-ledger differences. Existing table columns, policies, indexes, triggers and function signatures/security settings otherwise match. This original comparison did not compare function bodies or column privileges; the follow-up below adds those checks and explains raw ACL/body differences. The CLI parity runner was blocked by its token's project-status privileges; the connected MCP comparison succeeded. Ledger histories differ in both directions, so broad `supabase db push` must not be used as a release shortcut.

Remaining risk: production callers require the two reviewed migrations before deployment. Larger datasets need representative query plans and latency measurements. Ranking, streak rules, score computation, and atomic/idempotent exam and payment transactions retain their existing implementation.

Commits: `ee5b4ee`, `f04bf80`.

## Phase 3 — Frontend performance

Measured request traces showed speculative dashboard navigation causing repeated authentication and backend reads. `components/dashboard/NavItem.tsx` and three direct links in `DashboardShell.tsx` now use `prefetch={false}`. Navigation still loads its destination normally. Existing admin prefetch work was preserved.

`components/payments/MidtransSnapScript.tsx` is a shared server component used only by CPNS token, pass, and event payment pages. The global script was removed from `app/cpns/dashboard/layout.tsx`; the duplicate pass script was consolidated. Its canonical ID, CSP nonce, client key, sandbox/production selection, and `afterInteractive` strategy remain intact.

CPNS dashboard Midtrans downloads: **1 → 0** per fresh visit. Desktop and mobile browser checks verified dashboard → payment navigation, all three payment entry points, sandbox key selection, a nonempty nonce, no page errors, and no horizontal overflow. Snap was stubbed; no payment or charge was created. Screenshots were visually inspected after page content and animation settled.

Current CPNS exam browser profiling observed four question navigations in **34–89 ms**, zero long tasks above 50 ms during the short idle/navigation observation, and five timer ticks over approximately five seconds. This is browser task profiling on one fixture, not React commit profiling or a before/after CPU comparison. Existing CPNS timer isolation was retained; no speculative memoization or lazy loading was added.

Public landing Lighthouse 13.5.0, default mobile simulation: performance **77**, FCP **1.21 s**, simulated LCP **6.62 s**, TBT **40 ms**, CLS **0**. No comparable baseline Lighthouse run exists, so no improvement is claimed. Browser-measured unthrottled landing LCP remained 64 ms; TKA overview CLS remained 0.0333. Field INP and production Core Web Vitals were not available.

Public pages retain dynamic authenticated CTA selection and CSP nonce behavior. Existing safe published-article caching was preserved and moved to anon RLS. Heavy math rendering remains available when required. Remaining work: investigate throttled mobile LCP, font/preload traffic, and the large favicon without changing the visual design; repeat TKA timing measurements under controlled conditions.

Commits: `ee423d2`, `b008f23`.

## Phase 4 — Exam reliability

The three session clients retained successful selections in their synchronization maps and re-sent them during completion. Save errors were swallowed, so a manual finish could proceed after a failed latest answer.

`lib/answer-save-queue.ts` now provides a per-instance queue to:

- Serialize writes to each question and coalesce superseded edits.
- Remove acknowledged selections, making completion flush only dirty answers.
- Keep failures retryable and retry pending answers on the browser's online event.
- Wait for all pending saves and reject manual completion if any latest save fails.
- Preserve automatic expiry transitions using server-accepted answers, including rejected late saves.

Updated `PracticeSessionClient.tsx`, `UniversalPracticeSessionClient.tsx`, and `TkaFullExamSessionClient.tsx`. The universal client's network side effect was removed from a React state updater, and explicitly empty multi-selections no longer fall back to an old single-option selection. Existing completion locks remain in place. Timers, section duration, scoring, question order, quota consumption, and completion RPCs were not changed.

Eight queue tests cover coalescing, independent questions, retained failures, superseded errors, synchronous adapter errors, flags/empty selections, manual save barriers, and expiry handling. A clean selection is sent once and contributes **zero** additional writes to the final flush; the previous clients retained and re-sent it. This is verified queue behavior, not a production request-volume estimate.

The committed CPNS lifecycle E2E now deliberately aborts autosave: **two failed save attempts, zero completion actions while unsaved**, followed by online recovery and refresh restoring the latest selection. The complete CPNS suite passed **9/9**, including exactly-once token charging, resume, organization isolation, event isolation, and result/review journeys. TKA passed **17/17** with authenticated RLS and no admin key, including concurrent start/submission and single/multi-response journeys.

Remaining risk: an edit never acknowledged by the server cannot survive a full page reload merely through this in-memory queue. No persistent private-answer cache was added. Long offline sessions, cross-device progress/flag resume, and classroom concurrency need dedicated staging scenarios.

Commit: `6e642e3`.

## Phase 5 — Infrastructure and load testing

### Rate limits

`lib/api-utils.ts` previously used separate Redis INCR/EXPIRE requests; interruption could leave a counter without expiry. Its fallback silently reverted to per-instance memory, allowing serverless-instance bypasses. `app/api/practice-sessions/[id]/beacon/route.ts` always used the memory limiter.

One atomic Redis EVAL request now increments and establishes expiry, repairing prior counters without TTL. Redis replies are validated and requests have a two-second bound. Production denies critical requests when the shared store is missing/unavailable; staging/development retain memory fallback with expired-entry cleanup. Beacon uses the same shared helper and its existing 60/minute per-IP policy. Production cannot enable the staging auth-rate bypass.

Eleven regression tests cover atomic request construction, counters across module instances, malformed/failing Redis responses, fail-closed production behavior, staging fallback, exact expiry, and the production bypass guard. Redis HTTP requests per check: **2 on the first old-window request → 1**. Production `/api/health` was read-only inspected and reports Redis configured. No production Redis key was written. Real EVAL permissions and outage behavior must be verified in an approved Redis environment before deployment; mocks do not establish provider availability. Shared per-IP beacon sizing needs classroom/NAT testing.

### Artifacts and load scripts

`lib/event-certificate-pdf.ts` used dynamically constructed paths that made tracing scan too much of the project. Explicit paths and parallel asset loading remove the warning while preserving all three Poppins fonts, the logo, and signature. Certificate render/PDF tests pass.

| Certificate route | Traced files before → after | Raw traced bytes before → after |
|---|---:|---:|
| Download | 1,261 → 228 | 39,667,147 → 25,737,977 |
| Preview | 1,261 → 228 | 39,666,720 → 25,737,550 |

This is an 81.9% file-count and 35.1% byte reduction on the local macOS build. These are raw trace totals, not a Vercel Linux ZIP-size or billed-cost measurement. No environment files appear in the final traces. Native Sharp/Resvg dependencies remain the main artifact cost.

The old k6 scripts referenced the absent `tryouts` table (`PGRST205`) and legacy question-count RPC. `load-test/01_public_pages.js`, `02_supabase_api.js`, `03_supabase_stress.js`, `debug_metrics.js`, and the PowerShell runner now use Schema V2, protected learner reads, and exact counts. Target guards reject production. Database scripts require a disposable staging learner JWT; service-role/non-fixture/wrong-project tokens are rejected. Publishable keys are not used as Bearer JWTs. Seven safety tests pass. Instructions are in `load-test/README.md`.

k6 2.3.0 was downloaded from the official release and checksum verified. Default checks use one VU and three iterations, with no exam/payment writes:

| Smoke | HTTP samples | Passed checks | P50 / P95 / P99 | Error rate |
|---|---:|---:|---:|---:|
| Staging catalog + count + learner quotas | 9 | 18/18 | 62.79 / 274.46 / 350.16 ms | 0% |
| Staging catalog | 3 | 9/9 | 122.02 / 381.65 / 404.73 ms | 0% |
| Local landing/login/register | 9 | 21/21 | 7.55 / 14.62 / 14.69 ms | 0% |

These tiny smoke percentiles validate endpoints, not capacity. No high-volume/concurrent load test ran, and no production load or migration ran. Database connections, serverless memory/duration, production bandwidth, and billing changes remain unmeasured. The PowerShell runner was inspected but not executed on macOS.

Commits: `ccbcdc1`, `b036cea`, `775b85f`.

## Phase 6 — Validation and release evidence

| Check | Actual final result |
|---|---|
| Reproducible installation | `npm ci` passed against the normalized lock |
| ESLint / TypeScript | Both passed |
| Unit tests | **844 passed, 115 files**; baseline 800 tests, 107 files |
| Production build | Passed; certificate tracing warning removed |
| Runtime audit | **0 vulnerabilities**, unchanged moderate threshold |
| Full audit | Exit 0 at unchanged critical threshold; **5 dev-only high findings remain visible** |
| Public Chromium E2E | **42 passed, 2 existing optional-credential skips**, placeholder admin credential |
| TKA staging E2E | **17 passed**, placeholder admin credential |
| CPNS/organization/event E2E | **9 passed**, including new save-failure regression |
| Admin/role E2E | **76 first-attempt passes + 1 retry-dependent pass** |
| Admin flaky-case isolated rerun | **3 passed** including setup/cleanup, retries disabled |
| Admin data parity | **1,634 assertions passed** |
| Learner data parity | **20 assertions with active fixture; 14 after cleanup** |
| Large-fixture SQL / role checks | Passed; transaction rolled back; anon denied |
| Metadata schema parity | Four pending new functions plus known import artifacts; ledger drift recorded |
| Payment script desktop/mobile QA | Passed; no paid transaction executed |
| k6 staging/local smoke | **48/48 checks**, zero request errors |
| Lighthouse | Completed; mobile LCP issue recorded above |

Failures were investigated rather than masked: early TKA setup exhausted the local auth limiter until the server used the workflow's existing staging-only bypass; an early parity run overlapped E2E mutations and was rerun after teardown; placeholder-key testing exposed and fixed reward/public-article dependencies. No existing timeout was increased, assertion weakened, or failing test skipped. The admin navigation flake passed unchanged in an isolated retry-free run; its initial failure remains recorded.

Reviewable implementation commits:

| Commit | Logical change |
|---|---|
| `89d16c3` | Dependency security patches and reproducible CI install |
| `ee5b4ee` | Learner totals, active progress, TKA quotas and catalog reads |
| `b036cea` | Explicit certificate asset tracing |
| `ee423d2` | Payment-only Midtrans and measured dashboard prefetch removal |
| `ccbcdc1` | Atomic shared rate limits and production failure behavior |
| `775b85f` | Schema V2 staging-only load scripts and safety guards |
| `f04bf80` | Owner-scoped TKA rewards without privileged credentials |
| `6e642e3` | Retained failed saves, dirty flushes, reconnect and E2E regression |
| `b008f23` | Public article reads through anon RLS, preserving cache semantics |

## Follow-up — TKA latency and production readiness

Continued from clean commit `7604144` on the same optimization branch. Completed aggregate, payment, security-dependency, certificate and autosave implementations were retained. Evidence is in [follow-up metrics](optimization-followup-metrics.json), [function hashes](optimization-function-parity.json), [effective ACLs](optimization-release-acl.json), and [current migration ledger](optimization-migration-ledger.json). Private fixture cookies/recorded responses were kept outside git and removed after verification. No new migration was applied.

### 1. TKA latency diagnosis and targeted fix

**Root causes confirmed in code and waterfalls:** the pages awaited Auth before a request-scoped, RLS-protected catalog lookup; the overview separately awaited `user_tracks` before independent exams/types/question count. `app/tka/layout.tsx` now shares the existing request-scoped `getAuthUser()` with pages. `src/repositories/tka-catalog-read.repository.ts` starts identity and catalog together, preserves authenticated query errors, and immediately permits the login redirect if Auth fails even when catalog stalls. All three page files use it. Overview track status joins the existing parallel batch. No permissions, quotas, scores, entitlement evaluation, rows, or UI changed.

The trace distinguishes **one proxy Auth round trip and the render Auth round trip** from later speculative prefetches. Next already coalesced equivalent render fetches; this change does not claim an additional HTTP-count reduction. The request counts remain 21 / 16 / 16 including the observation window. Authentication stays server-verified `getUser()`, with no persistent permission cache.

Seven fresh contexts per route against staging, serially, reproduced substantial HTTP variability. The previous three-sample readiness regression did **not** reproduce as a stable signal. A bounded authenticated-role `EXPLAIN (ANALYZE, BUFFERS)` of the quota function, including its catalog selector and a zero-history subject, took **4.054 ms** (planning 4.334 ms). Individual HTTP calls in the trace reached hundreds of milliseconds; an after-run Auth call took 580 ms. This is evidence to investigate region/network/Auth variation, not an index justification. No index or SQL function was changed.

| Route | Live readiness median before → after | Live document completion before → after | Fixed-delay replay document completion before → after |
|---|---:|---:|---:|
| `/tka/smp` | 805 → 724 ms | 604 → 530 ms | **626 → 421 ms** |
| `/tka/smp/tryout` | 687 → 731 ms | 377 → 534 ms | **427 → 320 ms** |
| `/tka/smp/mini-tryout` | 538 → 674 ms | 343 → 492 ms | **530 → 428 ms** |

Replay uses recorded responses from our own disposable fixture, fixed **100 ms per Supabase response**, seven fresh contexts per route and speculative prefetch blocked in both versions. It compares detached baseline `7604144` with the targeted page/layout change, before font changes. It makes no staging calls during replay. Completion measures the streamed document/RSC response; it is **not** browser readiness or production latency. Replay readiness was 662 → 721, 721 → 689, and 728 → 729 ms respectively: hydration/load scheduling remains variable. The repeatable result is two removed network dependency stages on overview and one on each catalog page. A consistently faster user-ready TKA page is still unproven; larger, interleaved deployment measurements and field traces remain a gate for a latency/capacity claim.

Reproduce live diagnostics with an owned staging fixture's private Playwright storage state, a local production build, and `scripts/perf/tka-readiness.mjs`. Set `PERF_BASE_URL`, `PERF_STORAGE_STATE_PATH`, `PERF_OUTPUT_PATH`, `PERF_SAMPLES=7`; the script restricts itself to loopback, serial 1–10 samples and the same three selectors. Optional `PERF_BLOCK_PREFETCH=1` isolates document work. For sanitized server timings, preload `scripts/perf/supabase-fetch-timing.mjs` using Node `--import` and set `FETCH_METRICS_FILE` in both processes. It records method/path/status/bytes/timing only. Use the same build mode, fixture, viewport and conditions on both revisions; do not overlap other suites. Fixed replay artifacts remain private under `/tmp/siap-tempur-followup-2026-10-09`, rather than publishing learner responses.

Validation: eight focused catalog tests, lint/typecheck/build, final three-route diagnostic and the 17-test TKA suite with retries disabled. One new test specifically protects the immediate invalid-session redirect during catalog failure/stall. Commit: `b3f3eec`; reproducible diagnostics: `a926b0a`.

### 2. Mobile critical rendering path

The LCP element is the hero **H1 text**, not a hero image. Brand imagery is inline SVG, and no third-party payment script loads here. `app/layout.tsx` preloaded two secondary font families unused by the landing page in addition to Poppins and Patrick Hand. It also declared two icon links beside Next's automatic `app/favicon.ico` link. Lighthouse's icon collection downloaded the large nine-frame ICO three times.

Implemented: `preload:false` for Geist/Geist Mono, while retaining their definitions and on-demand availability; Poppins weights, Patrick Hand, display swap, all typography/CSS and CSP stay intact. Next emits the one favicon link. Re-encoded the existing ICO frames losslessly, retaining every size and the small legacy DIB frame; decoded RGBA hashes match for each converted frame. The original 256-pixel PNG and 16-pixel DIB remain byte-identical. No visual asset was redesigned.

The historical **6.62 s** simulated mobile LCP did not reproduce. Three fresh baseline Lighthouse 13.5 runs established 3,641 / 3,636 / 3,636 ms; three after runs gave 3,249 / 3,250 / 3,258 ms. Compare these controlled runs, not the historical outlier:

| Metric | Baseline median → after median |
|---|---:|
| Simulated mobile LCP | **3,636 → 3,250 ms (-10.6%)** |
| FCP | 1,206 → 1,206 ms |
| Performance score | **90 → 93** |
| CLS | **0 → 0** |
| Font transfers | **8 / 110,663 B → 6 / 57,079 B** |
| ICO file size | **177,694 → 32,632 B (-81.6%)** |
| Lighthouse icon transfers | **3 / 534,960 B → 2 / 66,514 B** |

The remaining second icon fetch is manifest/icon gathering, not a second metadata icon link. Simulated LCP and observed H1 paint differ; the old trace observed about 1.2 s, while new unthrottled traces paint much sooner. These are local laboratory values, not field Core Web Vitals. LCP remains above 2.5 s; blocking CSS and mobile network/CPU still need deployment/field evidence before further structural changes.

Browser plugin not available; used existing Playwright/Chromium at `http://127.0.0.1:3100`, desktop 1440×900 and mobile 390×900. Flow: landing → desktop program link or mobile menu/program link → visible target content. Identity, meaningful hero, no framework overlay, no runtime/console errors, no horizontal overflow, computed Poppins typography, one icon link, six preloads, nonce-bearing scripts and interactions passed. Screenshots were captured before interaction and inspected outside git. Public E2E is recorded in the final validation table below. Commit: `341fdd9`.

### 3. Exam resilience and NAT

Extended the existing CPNS E2E without reducing assertions or increasing its timeout: acknowledge an answer and reload; set the browser truly offline; make three edits; bring it online; reload and verify the **latest** selected option; then exercise interrupted save, manual-submit blocking, explicit retry/reload and existing token/result/resume journeys. The first run used a nonexistent fifth option in this four-option fixture; that test defect left an active attempt and caused the later state-dependent event-start failure. Corrected the selector, cleaned up through the existing teardown, and reran the **entire nine-test suite with fresh fixtures and retries disabled: 9 passed**. No application regression was established from that failed run.

Queue regression checks cover a lost response, a later expired-save rejection and a clean acknowledged answer, alongside existing coalescing, independent questions, latest-value recovery and automatic-expiry barriers. The final TKA E2E passes full/mini resume, section boundaries, quota/pass expiry, results, payment owner isolation and diagnostic/remedial behavior. No score/duration/order/token code changed.

A real staging database test, [answer-expiry-fixture.sql](../scripts/db-verify/answer-expiry-fixture.sql), then ran the existing save RPC **as service_role** against one synthetic question/attempt belonging to a fresh owned CI user. Initial acknowledgement and duplicate retry succeeded with one answer row; after expiring only that transaction's synthetic attempt, a different edit raised `ATTEMPT_TIME_EXPIRED`; after marking it completed, edits raised `EXAM_CONFIGURATION_ERROR`. The acknowledged answer's entire row (including scoring columns) and wallet balance remained unchanged. All synthetic rows rolled back, the disposable user was removed, and final parity returned to 42 attempts. No scoring/submission routine or production mutation ran. Commit: `f9a9bad`.

A shared mocked Redis counter across two newly imported application instances enforces 60 accepted / 2 rejected requests for 62 concurrent requests to one NAT key; a second NAT key remains independent. This proves the current policy's classroom collision, **not real provider behavior or capacity**. The 60/IP/min policy remains intact pending an approved security-policy decision. It applies to progress/flags beacons; answers save through server actions. No acknowledged-answer loss was observed. Unacknowledged in-memory edits cannot survive full offline reload, cross-device progress during beacon rejection remains unverified, and provider failure, re-authentication, cross-device concurrency and browser automatic expiry through a long outage still need an approved environment. Commit: `abe3f4b`.

### 4. Release-blocking database/provider risks

Read-only inspections now include all existing function-definition hashes, effective critical function privileges and protected column grants. Six pre-existing body differences are formatting/optional aliases/equivalent constant assignments as described in the runbook; they were not overwritten. Learners have no direct write privileges on attempts/answers and no direct read privileges on question snapshots/options/versions/explanations. Privileged score/payment/ranking execution remains denied to anon/authenticated on both projects. New projections have the exact expected invoker/STABLE/empty-path/execute matrix. This supplements rather than replaces the earlier table/policy/index parity.

The migration-ledger drift is **197 staging / 195 production**, twelve staging-only and ten production-only versions. Only the two reviewed optimization versions and four functions are missing from production. Broad push/repair is unsafe.

[Exact production instructions and rollback strategy](OPTIMIZATION_RELEASE_RUNBOOK.md) use a local checksum-pinned SQL generator. It creates no connection, refuses altered migration content, existing output files/functions/versions, verifies deployed hashes/effective ACLs and records the exact two ledger entries atomically with DDL and schema notification. Its post-install verification block passed as read-only SQL on staging; the absence preflight passed read-only on production; both ledger INSERT statements passed EXPLAIN planning without execution. Original DDL/large parity fixtures remain staged and validated. A complete isolated rehearsal and explicit operator approval are still required before production execution. Keep the prior application artifact as the preferred rollback; unused read functions need not be removed. Any removal is a separately reviewed forward migration, RESTRICT only, preserving history.

Prepared a ten-request, uniquely scoped Redis EVAL/TTL/repair checker with explicit staging origin and environment guards. Four mocked-transport tests pass, including production/origin rejection before requests. It does not auto-load Redis credentials. Official Upstash [EVAL](https://upstash.com/docs/redis/sdks/ts/commands/scripts/eval) / [REST ACL](https://upstash.com/docs/redis/features/restapi) support does not prove the deployed credential permits the commands. No approved staging Redis origin was supplied, and no provider Redis write was made. Production limiter failure remains fail-closed. Commit: `6a5464c`.

### 5. CI and capacity verification

Re-inspected latest main CI: `37839046620` is still the dependency-audit failure on `c9d80a7`; no branch push or workflow trigger occurred. The normalized lock stayed unchanged after fresh `npm ci`. Runtime audit remains zero; the full critical-threshold audit passes with **five visible high development-only braces-chain findings**. No security check was removed/suppressed. No controlled realistic load test was explicitly authorized, so no k6 run, resource/connection sampling under load or production percentile/capacity claim was added. The earlier smoke results remain historical smoke evidence only.

| Follow-up check | Actual result |
|---|---|
| Fresh `npm ci` / production build | PASS; lock unchanged |
| ESLint / TypeScript | PASS |
| Unit tests | **856 passed, 117 files** |
| Final TKA E2E | **17 passed**, retries disabled |
| CPNS/organization/event E2E | **9 passed**, fresh retry-free rerun; initial 7 pass / 2 fail retained above |
| Public/placeholder-credential E2E | **42 passed, 2 existing optional-credential skips**, retries disabled |
| TKA/placeholder-credential E2E | **17 passed**, retries disabled |
| Desktop/mobile rendered landing QA | PASS, interactions/CSP/no errors/overflow |
| Mobile Lighthouse | 3 baseline + 3 after; 3.636 → 3.250 s median LCP |
| SQL definition/ACL/absence assertions | PASS, read-only |
| Real database expired/completed answer rejection | PASS as service_role; acknowledged row/wallet preserved; fixture transaction rolled back |
| Ledger INSERT syntax/planning | PASS, EXPLAIN without execution |
| Final learner parity / cleanup | **14 assertions passed**, original 42 attempts/3 tracks; owned fixtures and private files removed |
| Real staging Redis / realistic capacity / full bundle rehearsal | NOT RUN; approval/designated environment pending |

Admin parity/E2E and original >1,000-row SQL checks were not blindly repeated: no admin query/scoring/schema changes were introduced. Their historical results and retry flake remain above; hosted CI on the release candidate is still required. Learner parity passed after final teardown: 14 assertions, original 42 attempts/3 tracks; owned fixtures and private cookie/response files were removed. The pre-existing developer server was left running.

### Concrete go/no-go release checklist

**GO for code review. NO-GO for production rollout today.** Each missing evidence item is a stop condition for the associated release claim.

- [x] Small independent code commits; existing business/security/UI semantics preserved.
- [x] Reproducible install, lint/typecheck/unit/build/audits pass locally; development advisories visible.
- [x] TKA waterfall improvement demonstrated separately from variable browser readiness.
- [x] Mobile LCP improves in repeated laboratory runs; typography/CSP/visual identity verified.
- [x] CPNS real offline/reconnect/reload and token tests pass without retries.
- [x] Two migration definitions, effective privileges and production absence reviewed; exact apply/rollback procedure prepared.
- [ ] Hosted CI on the reviewed branch, through a process that does not auto-deploy without approval.
- [ ] Approved isolated rehearsal of the complete migration bundle; production migration approval; post-install PostgREST/owner/anon parity.
- [ ] Explicitly designated staging Redis and real EVAL/TTL/token-ACL verification; confirm production credential/config through approved operations.
- [ ] Classroom NAT policy decision and cross-device progress/flag verification at the supported classroom size.
- [ ] Approved realistic staging concurrency/soak and resource measurements with defined SLOs, P50/P95/P99, errors and connection/function/bandwidth evidence.
- [ ] Representative deployment/field TKA readiness and mobile LCP verification before latency/CWV certification.
- [ ] Separate deployment approval, canary plan and rollback owner/artifact confirmed.

## Prioritized remaining technical debt

1. **Release prerequisite:** review and explicitly approve applying only the two new migrations to production before deploying callers. Verify function ACLs, owner parity, and configured Redis EVAL permission. Do not deploy these callers to a database missing the projections, or use broad migration push against divergent ledgers. Obtain hosted CI on the reviewed branch through the controlled release process.
2. **P1 security:** track the unpatched development-only braces advisory. Adopt a verified upstream patch when available; retain the audit checks.
3. **P1 capacity:** approve representative staging concurrency/soak tests and collect DB connection usage, query plans, function duration/memory, bandwidth, error rates, and sufficiently sampled P50/P95/P99. The follow-up removes confirmed TKA waterfall stages; representative user-ready latency still needs deployment evidence. Resolve the demonstrated shared-IP beacon collision under an approved NAT policy.
4. **P1 resilience:** test server-side flag/progress resume across devices, prolonged outages, expiry during failed saves, and provider outages. Generic progress beacons still need a privileged server credential; do not mistake local resume state in placeholder-key CI for cross-device persistence. Establish an explicitly scoped recovery design before persisting any private answers.
5. **P2 frontend:** collect deployment/field mobile LCP and INP. The follow-up fixes excess secondary font preload and duplicate/oversized favicon traffic; simulated LCP remains 3.25 s. Detailed React commit profiling on exam and admin screens remains useful at representative question complexity; the short browser trace is not a substitute.
6. **P2 backend:** `PracticeOverviewRepository.listDrillingMaterials` still performs per-node reads/counts. Measure it before replacing hierarchy semantics with a batch projection. The TKA overview still uses a bounded recent-history list; separate old active attempts from recent results if evidence confirms they are hidden by that bound.
7. **P2 maintainability:** reconcile pre-existing staging/production migration histories deliberately; avoid assuming ledger presence proves live schema parity. Keep sensitive projections request-scoped and extend permission/answer-key regression coverage as new read models are added.

All automatic work remained within local code and the verified staging environment, apart from read-only production health and catalog-metadata inspection. Only owned disposable fixtures were used and cleaned up; the pre-existing developer server was left running. Restart that server normally to load the patched framework version.

## UI/UX continuation — 9 October 2026

### Baseline and scope

UI work starts at the clean, verified local optimization commit **`705375b`**, on the new branch **`uiux/shared-foundations-2026-10-09`**. It does not restart from `origin/main`. The optimization commits, pending migrations, autosave queues, CPNS/TKA queries, authentication/actions, CSP, scoped payment scripts, rate limits, font preloads and favicon improvements remain intact. This continuation changes shared dialog presentation/interaction and profile validation feedback; it does not change database or exam contracts. No push, migration, deployment, production writes or load test occurred.

### Repository-wide inventory and design-reference precedence

Static inventory at the baseline covered **86 page modules and 156 TSX components**, including shared primitives and their callers. Rendered verification samples representative surfaces; this is not a claim that every route/state has been visually remediated.

| Area | Current foundations / representative files | Inventory decision |
|---|---|---|
| Marketing | `app/page.tsx`, `components/home/*`, `components/brand/*`, `components/ui/Button.tsx`, `Card.tsx`, `Section.tsx` | Preserve expressive identity, wordmark, Poppins, mascots and existing primary CTAs. Shared Button already supplies 44 px targets and focus rings. No global size/theme rewrite. |
| Authentication | `components/auth/LoginForm.tsx`, `RegisterForm.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx` | Login/register already have linked errors and labelled visibility controls. ResetPasswordForm still has legacy copy, decoration and hidden labels; audit this specific flow before changing its recovery/auth contract. |
| Learning navigation/layout | `components/dashboard/*`, `app/tka/[level]/layout.tsx`, `components/profile/TkaProfile.module.css` | Keep separate CPNS/TKA visual modes and existing shells, active state and optimized navigation requests. Profile's local TKA styles intentionally soften borders/shadows. |
| Catalog / start decisions | CPNS `PracticeClient.tsx`, `MiniTryoutClient.tsx`, `DrillingMateriClient.tsx`; TKA catalog pages | Preserve all query/entitlement/quota logic. Confirmed token-dialog focus and short-viewport defects remediated through one shared component for all three CPNS callers. |
| Exam sessions | `PracticeSessionClient.tsx`, `UniversalPracticeSessionClient.tsx`, `TkaFullExamSessionClient.tsx`, `TkaSectionConfirmModal.tsx` | Preserve queue/timer/scoring/order/submission code. Fix only the shared TKA section confirmation. Other custom exit/submission/navigation overlays remain candidates for focused keyboard audits. |
| Profile / media | `SettingsTab.tsx`, `ProfileTab.tsx`, `ImageCropper.tsx` | Remediate shared password/deletion dialogs, input spacing and linked validation. Image preview/cropper remain separate, with media/processing-specific dismissal contracts to verify before consolidation. |
| Results / review | `components/practice/review/*`, `TkaInteractiveReviewClient.tsx`, `XPRewardPopup.tsx` | Preserve result semantics and reward completion flow. Review drawers/reward overlay remain separate; do not assume every overlay can be replaced by the confirmation foundation. |
| Payments / events | `components/payments/*`, `components/pass/*`, `components/dashboard/EventClient.tsx` | Preserve scoped Midtrans loading, pending/error states and payment security. Event/payment overlay consolidation requires dedicated pending-state tests. |
| Admin operations | `UnifiedAdminShell.tsx`, `AdminUi.tsx`, `AdminModal.tsx`, `AdminConfirmDialog.tsx`, `AdminDataTable.tsx`, `components/admin/forms/*` | Preserve the completed workspace/table/navigation/form and query improvements. Existing native modal/drawer behavior is not reimplemented. Verify representative responsiveness and keyboard flows. |

Reference conflicts were resolved by scope and current implementation/release evidence:

- Product identity and experience modes follow [Product Design System V1.1](PRODUCT_DESIGN_SYSTEM_V1_1.md) and [Product Language Guide](PRODUCT_LANGUAGE_GUIDE_V1_1.md). The specific learning scale in §2.6 takes precedence over the older generic app-heading scale. Brand/category tokens in §6.0/6.2 take precedence over the older cyan accent paragraph. Exam mode remains quiet and without decorative motion.
- Admin uses the newer [Admin UI/UX Standard](ADMIN_UI_UX_STANDARD.md), [P1 redesign/report](ADMIN_UI_UX_REDESIGN.md) and [8 October release evidence](releases/admin-workspace-2026-10-08.md). The older [Admin Workspace UI System](ADMIN_WORKSPACE_UI_SYSTEM.md) describes historical routes/modal CRUD defaults; it does not override current canonical routes or page-based long forms. The admin table's explicit 28 px desktop / 36 px mobile density is preserved as a scoped exception to the product's practical 44 px target guidance, not applied to learner dialogs.
- [Product audit](PRODUCT_EXPERIENCE_V1_1_AUDIT.md) and [implementation backlog](PRODUCT_EXPERIENCE_V1_1_IMPLEMENTATION_BACKLOG.md) provide context, but unchecked historical items do not prove an optimization/design feature is missing. Current code and verified release reports prevent repeating completed work.

### Confirmed defects and implemented changes

| Finding / root cause | Before | Implemented result |
|---|---|---|
| `components/ui/Modal.tsx`: custom animated div has no dialog semantics, initial focus or focus containment; cleanup writes `overflow: unset` | TKA section confirmation allows keyboard focus to leave the decision and cannot correctly preserve an existing scroll style | New `DialogSurface.tsx` uses native modal/background inertness, explicit Tab wrapping that excludes hidden/disabled controls, labelled dialog, Escape/backdrop handling and exact, counted scroll-lock restoration. `Modal.tsx` adopts it with a 44 px close control and quieter exam styling. |
| `TokenUsageConfirmModal.tsx`: centered, unconstrained overlay, no keyboard lifecycle; high visual emphasis on ordinary remaining balance | Heading and primary action clipped on a short mobile viewport; focus remains behind overlay | Named, scrollable summary with fixed title/actions, safe initial Cancel focus, shared Button sizes/focus rings, calmer amber/neutral hierarchy and disabled dismissal while loading. All quantities, token text/calculations and callbacks retained. |
| `SettingsTab.tsx`: independent overlays without modal focus lifecycle or short-height constraint | CPNS password/deletion panels exceed a 568 px viewport; Escape fails; background remains keyboard-accessible | Shared native surface with viewport scrolling, exact focus restoration even when React unmounts a conditional dialog, and 44 px TKA close control. CPNS/TKA styling remains scoped. |
| `SettingsTab.tsx`: password errors are toast-only; field labels do not establish consistent block spacing | Users must infer which input needs correction; Enter does not use a form submit | Existing empty/mismatch/server validation now also has visible, linked field/form errors; labels stay separate from error text so accessible names remain stable. Native form submission supports Enter using the same update action and validation rules. Mobile TKA password text is 16 px. |
| `SettingsTab.tsx`: deletion backdrop close does not clear `deleteConfirmText` | Reopening can retain the previously typed `HAPUS` confirmation | Every allowed cancellation clears the confirmation. Pending deletion remains non-dismissible; deletion action/authorization unchanged. |
| `tests/e2e/pages/TkaExamActions.ts`: catch also absorbs a failed click on an already visible confirmation | A broken interaction can be mistaken for an absent optional modal | Only the visibility wait is optional. Clicking a visible confirmation must succeed. |

No new dependency, caching, memoization or speculative backend optimization was introduced. Modal/token opening no longer depends on decorative Framer Motion transitions. No bundle-size or latency gain is claimed without measurement.

### Before/after UI measurements

Same owned staging fixtures, local production build at `http://127.0.0.1:3100`, Chromium, and **1440×900 / 390×844 / 390×568**. Geometry is sampled after the dialog appears; the old animated token geometry varies slightly while entering. Browser plugin was unavailable; existing Playwright was used.

| Reproducible check | Before | After |
|---|---:|---:|
| CPNS token/password/delete: initial focus inside (nine viewport/flow cases) | 0/9 | 9/9 |
| Same cases: focus inside after 12 Tab presses | 0/9 | 9/9 |
| Same cases: Escape closes / focus returns to trigger | 0/9 / 0/9 | 9/9 / 9/9 |
| Token, 390×568: top / bottom | −38.57 / 610.92 px | 16 / 552 px |
| Password, 390×568: top / bottom | −3.72 / 571.72 px | 16 / 552 px |
| Delete, 390×568: top / bottom | −37.14 / 605.14 px | 16 / 552 px |
| TKA password: Tab containment / Escape across the three viewports | 0/3 / 0/3 | 3/3 / 3/3 |
| TKA password close-control height | 32 px (source class) | 44 px (browser assertion) |
| Current dialog samples: page exceptions / console errors | No page exceptions in baseline samples | 0 / 0 across nine CPNS samples; TKA keyboard flow also passes |

Token title and primary action are both in the viewport on the short screen. Profile forms can scroll as their validation content grows. [Before token](/tmp/siap-tempur-uiux-2026-10-09/before-token-390x568.png) and [after token](/tmp/siap-tempur-uiux-2026-10-09/after-token-390x568.png) illustrate the short-screen fix. Before/after JSON and screenshots live outside the repository under `/tmp/siap-tempur-uiux-2026-10-09/`: `before-dialog-qa.json`, `after-dialog-qa.json`, `before-tka-dialog-qa.json`, `after-tka-dialog-qa.json`, and corresponding viewport screenshots. Private fixture cookies were removed after exact owned-fixture cleanup. All test-suite users were cleaned through their existing teardown; the two additional screenshot-fixture users were deleted by their recorded IDs. Test servers/helper were stopped; the existing user server on port 3000 was retained.

### Verification and commits

- `d8bc2fb`: shared foundation and TKA cancellation/focus regression. Foundation lint, typecheck, build and 856 unit tests passed; focused TKA end-to-end flow passed (three checks including setup/cleanup).
- `c5266fc`: scrollable CPNS token confirmation with visible mobile actions; committed regression covers keyboard scroll region, Tab/Shift+Tab, backdrop/Escape cancellation, exact prior scroll style, 44 px action, unchanged wallet after reload, held/aborted start request and blocked pending dismissal.
- `a8c8ff8`: CPNS/TKA profile surface, stable field labels/linked errors, Enter validation, fresh destructive confirmation, and conditional-unmount focus restoration. Shared profile E2E helper asserts that its empty/mismatch/cancel flows send **zero mutation Server Action requests**.
- `150af3d`: desktop/short-mobile TKA confirmation screenshots and viewport-bound assertions. The full learning-loop selection reran successfully (**3 passed, retries 0**, including setup/cleanup); screenshots were visually inspected.
- Final code: **lint, typecheck, production build and 856 unit tests / 117 files passed**.
- Final CPNS UI/engine selection: **6 passed, retries 0** (setup/cleanup included). Full/Mini/Drill lifecycle, exact token charging, acknowledged answer reload, offline queued edits/reconnect and failed-save submission block remain intact. Five additional unchanged Event/Instansi isolation/matrix cases passed during the token iteration; the first new keyboard test then failed because the scrollable summary was an implicit Tab stop. It was made an explicit named region and corrected assertions now pass. The final selection does not claim a rerun of all distribution cases.
- Final TKA staging suite: **18 passed, retries 0** (setup/cleanup included): diagnostic, full sections/result/remedial, Mini/Drill, mobile/tablet resume, quotas, pass denial/expiry/access, plus the new profile regression.
- Final public suite: **42 passed, 2 pre-existing optional credential skips, retries 0**. No assertions/security checks were disabled or timeouts increased.
- Final admin representative checks: **35 passed, retries 0** (setup/cleanup included): desktop core modules, 390 px mobile / 1024 px tablet overflow checks, archive confirmation, mobile drawer focus/return, and desktop/mobile signout confirmation.
- Landing browser checks at 1440/390 px: meaningful page/title, Poppins identity, menu interaction, no overflow or console/page errors; nonce-bearing scripts, six font preloads and one favicon link remain intact.
- `git diff --check` passed. Diff review confirms no changes to package/lockfile, migrations, repositories, exam engine clients, answer queue, authentication actions, rate-limit implementation, font/CSP setup or payment scripts.

Initial new keyboard tests exposed native focus wrapping toward browser chrome, implicit scroll-region traversal, and conditional-unmount focus restoration; fixes were verified with the assertions retained. The rapid reopen test waits for the existing repeat-click guard's visible lock state to clear, rather than changing that guard or adding arbitrary sleeps.

### Remaining UI debt and rollout checklist

Priority order for further UI work:

1. **P1:** Browser-audit the remaining CPNS exam exit/submit/mobile-navigation overlays, reward popup, learner signout and EventClient dialogs. Verify pending dismissal, autosave/acknowledgement and timer transitions before adopting shared behavior. Do not mechanically replace every overlay.
2. **P1:** Verify native-dialog/focus behavior with supported Safari/Firefox, screen readers and real mobile software keyboards. Current automation proves Chromium desktop/mobile/tablet behavior; it does not simulate all assistive technology or device keyboards. Nested shared-surface scroll locking is implemented defensively but no new nested consumer is introduced or certified by this batch.
3. **P2:** Audit reset-password field labels, visibility-control targets and legacy language against the current product references, with a disposable recovery-link flow; retain existing password and session security.
4. **P2:** Review image preview/cropper dialogs and review drawers with their own processing/resizing/navigation tests.
5. **P2:** Consolidate legacy Card/Section literal colors and local overrides only after rendered evidence confirms a mismatch. Preserve intentional marketing/learning/admin density differences. Reconcile historical backlog completion marks with code/release evidence separately.

Review/controlled-rollout checklist:

- [x] Dedicated UI branch starts at the latest verified optimization baseline; earlier work preserved.
- [x] Design-reference conflicts resolved by scope/version before applying shared changes.
- [x] Shared foundation verified in a real TKA session before learner-surface expansion.
- [x] Representative screenshot, keyboard, short-mobile, functional exam and form-error checks pass.
- [x] Token, scoring, autosave acknowledgement, quota and authentication contracts preserved.
- [ ] Hosted CI for the exact candidate after an approved push (not triggered locally).
- [ ] Complete the **existing** production release gates above: reviewed/rehearsed migration bundle and ledger handling, real Redis verification/NAT policy, explicitly authorized capacity testing, deployment/field checks and deployment approval.

**Production remains NO-GO under the existing optimization release gates.** This UI batch is ready for review, not deployment authorization. UI rollback is code-only: revert `150af3d`, `a8c8ff8`, `c5266fc`, then `d8bc2fb`; this returns to the verified optimization baseline without undoing its SQL/queue/query/security work. No database rollback is introduced by these UI commits.
