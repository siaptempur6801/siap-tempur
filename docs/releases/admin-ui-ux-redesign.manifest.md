# Admin UI/UX P1 — release manifest

**State: P1 CLOSED — all required gates PASS. Deployment NOT AUTHORIZED.**

## Reproducible candidate

- Worktree: `/Users/dirga/Projects/siap-tempur-admin-p1`
- Branch: `codex/admin-ui-p1-candidate`
- Tested code candidate: `124247802c91de15bbca3f192482c15c3dfce264`
- Dependency snapshot parent: `e24d39f3e467c2ba816b571d5715b1d1fde5af85`
- Original repository HEAD: `5b0b80fbce95a93244a94e830d55ffd97df97662`
- UI differential: `e24d39f..1242478` — 56 exact code/test files below.

The starting working tree contained unrelated uncommitted engine/distribution/database/public changes and an earlier partial admin foundation. The dependency snapshot records that exact starting state in a separate commit. **It is not part of the UI release and is not approved for promotion by this manifest.** The UI commits are replayable on this explicit parent or on an independently approved equivalent dependency baseline. Applying them directly to the original HEAD would omit required existing distribution contracts. Approve/reconcile that prerequisite before release; do not deploy the snapshot or mixed original tree.

The original workspace remains uncommitted so its unrelated changes are preserved. All P1 differential source files are mirrored there for review. The candidate worktree contains committed code only; local env and auth artifacts are ignored.

## Exact UI / UX files

- `app/actions/admin-exams.ts`
- `app/actions/admin-organization-exam.ts`
- `app/actions/admin-organization.ts`
- `app/actions/admin-v2.ts`
- `app/actions/content-review.ts`
- `app/admin/AdminOperationsWorkspace.tsx`
- `app/admin/AdminOverview.tsx`
- `app/admin/assessment/events/page.tsx`
- `app/admin/assessment/exams/AdminExamsWorkspace.tsx`
- `app/admin/content/readiness/page.tsx`
- `app/admin/content/review/page.tsx`
- `app/admin/loading.tsx`
- `app/admin/monitoring/page.tsx`
- `app/admin/organizations/page.tsx`
- `app/admin/results/[attemptId]/page.tsx`
- `components/admin/AdminExamFormModal.tsx`
- `components/admin/AdminListToolbar.tsx`
- `components/admin/AdminMonitoringTable.tsx`
- `components/admin/AdminOperationsShared.tsx`
- `components/admin/AdminPagination.tsx`
- `components/admin/AdminProductsPanel.tsx`
- `components/admin/AdminQuestionsPanel.tsx`
- `components/admin/AdminSearchInput.tsx`
- `components/admin/AdminSubmitButton.tsx`
- `components/admin/AdminWorkspacePatterns.tsx`
- `components/admin/AssessmentSelector.tsx`
- `components/admin/BatchExamPanel.tsx`
- `components/admin/EventWorkflowForm.tsx`
- `components/admin/ProductAvailabilityFields.tsx`
- `components/admin/UnifiedAdminShell.tsx`
- `lib/admin-format.ts`
- `lib/admin-monitoring-progress.ts`
- `lib/admin-nav.ts`
- `lib/admin-return-url.ts`
- `lib/question-bank.ts`
- `playwright.config.ts`
- `src/services/admin-assessment-ux.service.ts`
- `src/services/admin-content-readiness.service.ts`
- `src/services/admin-exams.service.ts`
- `src/services/admin-monitoring.service.ts`
- `src/services/admin-product.service.ts`
- `src/services/admin-question-ux.service.ts`
- `src/services/admin-workspace.service.ts`
- `tests/e2e/admin-workflow.ts`
- `tests/e2e/specs/10-admin-workspace-authenticated.spec.ts`
- `tests/e2e/specs/19-admin-role-navigation.spec.ts`
- `tests/e2e/specs/20-instansi-join.spec.ts`
- `tests/e2e/specs/21-instansi-exam.spec.ts`
- `tests/e2e/specs/23-organization-participant-lifecycle.spec.ts`
- `tests/e2e/specs/24-event-context-lifecycle.spec.ts`
- `tests/e2e/specs/26-event-assessment-matrix.spec.ts`
- `tests/e2e/specs/27-admin-task-flows.spec.ts`
- `tests/unit/admin-display-labels.test.ts`
- `tests/unit/admin-nav.test.ts`
- `tests/unit/admin-product-status-case.test.ts`
- `tests/unit/admin-workflow-context.test.ts`

## Documentation evidence

- `docs/ADMIN_UI_UX_REDESIGN.md` — BEFORE / AFTER / WHY per workspace and shared patterns.
- `docs/ADMIN_UI_UX_P1_REPORT.md` — final A–K report, flows, accessibility and regression results.
- `docs/releases/admin-ui-ux-redesign.manifest.md` — this scope and reproduction record.

Documentation is committed separately after the tested code candidate. It does not change application source or test results.

## Allowed minimal server changes

UI context return handling, admin read projections/server pagination, authorized contextual monitoring/result aggregates, draft configuration publish checks and pre-write product readiness validation are included. They use existing repositories, RPCs, permissions and source contracts. No new assessment/session/scoring/auth/quota engine was introduced.

## Exclusions

All starting-state changes are excluded from the UI differential: migrations; attempt/scoring/session/quota/token engines; participant result pages and public flows; unrelated content audit files; database verification scripts; original file deletions; existing bootstrap changes. In shared files, release scope is the differential from the dependency parent, not their entire content relative to the original HEAD. No credentials, storageState, environment files or production mutations are included.

## Reproduce and verify

```sh
git switch codex/admin-ui-p1-candidate
git checkout CODE_SHA
npm ci
# Configure an ignored .env.local using designated staging credentials.
# Existing runner rejects a non-staging Supabase project.
node scripts/local-gates/run-gate.mjs cpns
SKIP_BUILD=1 node scripts/local-gates/run-gate.mjs admin
SKIP_BUILD=1 node scripts/local-gates/run-gate.mjs tka
# Own production app on port 3100, from the build above; never reuse stale dev port 3000.
E2E_REMOTE_BASE_URL=1 BASE_URL=http://127.0.0.1:3100 CI=true npx playwright test --project=chromium-public
SKIP_BUILD=1 node scripts/local-gates/run-gate.mjs review
npm run test:unit
npm run lint
npm run typecheck
git diff --check DEPENDENCY_SHA CODE_SHA
```

Replace CODE_SHA / DEPENDENCY_SHA with the exact hashes above. Build is run freshly by the CPNS gate; subsequent staging and public gates reuse that same production artifact. The TKA runner intentionally uses its existing CI placeholder service role behavior; it is not replaced with a new auth path.

To prepare only UI changes on an approved compatible baseline:

```sh
git diff --binary DEPENDENCY_SHA CODE_SHA > /tmp/admin-ui-p1.patch
# In a clean checkout of the approved equivalent dependency baseline:
git apply --check /tmp/admin-ui-p1.patch
git apply /tmp/admin-ui-p1.patch
# Review, commit, then rerun the full gates against that exact new commit.
```

## Reproduction proof

The 56-file UI patch was applied with `git apply --check` to a fresh detached checkout of the exact dependency parent, then staged for tree comparison. Both the reconstructed tree and candidate code tree are `86a43bfa76a203c63adc01c8b9b111533215a15d`. The reconstruction passed `git diff --cached --check`.

- Patch SHA-256: `fb826d666417876780dd185318fd0925142a0954f0c8e57996e6e4f7a77cca1e`
- Local patch artifact: `/tmp/siap-tempur-admin-p1-artifacts/admin-ui-p1.patch`
- Local screenshots: `/tmp/siap-tempur-admin-p1-artifacts/`

This proves reproducibility on the explicit dependency snapshot; it does not grant release approval for that prerequisite.

## Final gate evidence

Final tested code: `124247802c91de15bbca3f192482c15c3dfce264`. Completed 7 October 2026, 22:18 WIB.

| Gate | Result |
|---|---|
| CPNS staging | PASS — 9 passed, retries disabled for lifecycle/matrix task tests |
| Admin staging + role navigation | PASS — 65 passed, 1 flaky passed on retry (66 total) |
| TKA SMP staging | PASS — 17 passed |
| Public E2E, clean production build | PASS — 42 passed, 2 existing skips |
| Content Review staging (additional) | PASS — 5 passed |
| Unit | PASS — 98 files / 726 tests |
| Lint | PASS |
| Typecheck | PASS |
| Production build | PASS, fresh CPNS gate build reused by subsequent gates |
| git diff --check | PASS |
| UI patch reconstruction | PASS — reconstructed tree equals candidate code tree |

All final gate processes exited 0. Critical task tests use retries: 0. The role ADMIN flaky test timed out at 5 seconds while the Dashboard skeleton was still visible; retry passed. It is recorded as P2 test readiness/latency debt. No failed critical flow was hidden with a skip or removed assertion.

Diagnostics during development found and fixed the answer relation shape, exact participant-name semantics, taxonomy composite order, result assignment context, and async test races. TKA lifecycle tests now await persisted answers before reload and require the full exam confirmation after the existing interaction lock clears. No participant engine or auth source was changed to obtain PASS.

The earlier foundation-only report claiming staging credentials were missing is superseded: the existing staging bootstrap is configured and used. Results from older diagnostic SHAs are not final release evidence.

Logs: `/tmp/siap-tempur-admin-p1-final-{cpns,admin,tka,public,review,unit,lint,types}.log`; summary `/tmp/siap-tempur-admin-p1-verification-summary.log`. Screenshots / patch are in the artifact directory above. Admin failure/retry artifacts were preserved before subsequent suites cleared test-results.

## Artifacts and limitations

Playwright task tests capture assessment distribution, event monitoring, organization result and mobile sidebar screenshots. Fixtures are disposable staging data; real attempt/scoring/isolation regression remains in CPNS/TKA suites. Console destination-stream-close messages produced during navigations are recorded, not hidden; gate status is determined by browser assertions and exit codes. Content readiness uses a dated production audit snapshot clearly distinguished from live environment configuration. This task does not change production content or activate products.

**No deployment, push or production admin access occurred.**
