# Admin UI/UX P1 — workflow redesign

## Scope and release boundary

P1 follows Assessment → Distribution (Direct / Event / Instansi) → Monitoring → Hasil. Scoring, attempt context, quota, session engines, authorization and database contracts remain unchanged by this changeset. Read adapters and existing admin actions receive small UI context / validation extensions. No UI library or theme rewrite was added. Deployment is not authorized.

The original workspace was mixed before this task. A separate worktree captures the exact starting dependency state, then commits only the P1 differential. The dependency snapshot is not a UI release and must not be silently promoted as one. See the release manifest for exact parent, candidate, files, gates and exclusions.

## A. Navigation

**Before:** four foundation groups existed, but assessments sat among distribution operations; contextual monitoring was scattered across routes.

**After:** Assessment sits in Learning. Operations contains Event, Instansi and permission-aware Monitoring. Native mobile dialog contains keyboard focus and restores the trigger. Route context and business breadcrumbs remain visible.

**Why:** operators find the resource they configure, then enter its distribution workspace without scanning unrelated modules.

## B. Assessment

**Before:** stacked cards, large edit modal, fragmented distribution actions and partial URL filters.

**After:** paginated operational table (name, domain, type, level, questions, readiness, status, updated, actions); search/domain/type/status/level/page in URL; Overview, Soal, Konfigurasi, Distribusi and Hasil tabs; sectioned create/edit page; real configuration and review evidence; explicit Direct / Event / Instansi choices; canonical eligibility disables unavailable actions with reasons. Draft publishing validates configuration through a server action and offers distribution next.

**Why:** list → detail → distribution carries assessment identity and list state. Configuration readiness and three-stage content review are shown separately; the UI does not invent a new assessment eligibility contract.

Question previews select stems from bound versions, never whole snapshots, keys or scoring options. Drill preview follows its configured material and frozen approved pool. Dynamic previews explicitly describe the pool rather than claiming to predict participant composition.

## C. Event

**Before:** list CRUD and create modal required operators to reconnect assessment and session context.

**After:** lifecycle-filtered list, sectioned Event → Assessment → Registration → Schedule → Review creation, preselected shared assessment selector, then existing event/session services. Detail preserves Overview / Peserta / Monitoring / Leaderboard / Pengaturan context. Participants and monitoring share a table. Failed session creation returns to the created event for recovery. Draft ticket products can be linked before activation to avoid a readiness dead end.

**Why:** assessment is chosen once; event creation ends at an operational workspace with monitoring one click away.

## D. Instansi

**Before:** organization, batch, participant and assignment forms shared a long screen; new batches did not lead directly to assignment.

**After:** persistent organization/batch header, Overview / Peserta / Batch / Penugasan / Monitoring / Pengaturan tabs; list shows real participant, batch and assignment counts; new batch is selected and opens Penugasan. Assignment uses Target → Assessment → Schedule → Review and the same selector as Event. Participants remain paginated with contextual search. Existing CSV validation, preview and confirm flow remains. Destructive actions require confirmation.

**Why:** organization, batch and assessment stay in the URL through create, refresh, assignment and monitoring.

## E. Monitoring and result

**Before:** separate event and organization patterns, overloaded scores and inconsistent return navigation.

**After:** shared table with participant, status, progress, start, completion, score and named result action; four roster-based summary metrics; search/status/page in URL. Result scopes its privileged reads to the authorized event or organization/batch/assignment and shows actual aggregate scores / sections. Return URL restores the exact monitoring state and browser Back works.

**Why:** operators can move from distribution to participant result and resume the same queue. Monitoring is refreshed on demand and clearly labelled; it does not pretend to stream live data. Server-side compact identifier scans avoid oversized filters; only one page of participant details reaches the UI. Progress reads are paged beyond the database response limit.

## F. Content readiness

**Before:** long question stems and disconnected taxonomy/review evidence; partial Drill looked unavailable without useful explanation.

**After:** short question previews, taxonomy / type / review / status / updated columns; URL filters for section, material, submaterial and review state. Consistent Needs Review / Approved / Rejected / Blocked Asset / Blocked Content labels. A production audit snapshot shows actual Full / Mini and 7 / 28 Drill coverage, plus the materials without readiness evidence. Blocked assets have an actionable explanation without storage paths.

**Why:** operators distinguish content needing review from usable content. The dated checked-in production audit is explicitly separate from live environment configuration. Answer-key access remains in the existing permission boundary.

## G. Commerce

**Before:** product status and content availability were difficult to interpret; activation lacked a useful explanation.

**After:** product / domain / price / availability / readiness / status table; requirement checklist per product type; activation disabled when requirements fail; admin save validates the same readiness before writing. CPNS tokens require Full Tryout, not Mini or Drill. CPNS Pass shows partial Drill and Full release evidence gaps. Existing wallet, pricing, order and entitlement contracts remain untouched.

**Why:** unavailable products explain the missing work and cannot become active by forging a disabled UI control. Existing active records are displayed truthfully; this task does not bulk-change their database statuses.

## H. Shared patterns

Reused: AdminUi page/header/card/metric/status/empty/table tokens, AdminModal, AdminConfirmDialog, ConfirmSubmit, form fields, pagination, existing services and permission checks.

Created / standardized: AdminBreadcrumb, WorkspaceTabs, ReadinessChecklist, WorkspaceError, AdminSubmitButton, AdminSearchInput, AssessmentSelector, AdminMonitoringTable and safe admin return URLs. Search is debounced; submit buttons show pending state; long critical forms use pages/sections, not modal flows. Native form validation and visible linked errors support keyboard users.

## Validation

**P1 CLOSED.** Source `124247802c91de15bbca3f192482c15c3dfce264`: Admin PASS (65 + 1 retry), CPNS 9/9, TKA 17/17, Public 42 passed / 2 existing skips, Content Review 5/5, Unit 726/726, lint/typecheck/build/diff checks PASS. Full A–K results: [P1 report](ADMIN_UI_UX_P1_REPORT.md).

See `docs/releases/admin-ui-ux-redesign.manifest.md` for the final gate evidence. Task-based staging tests assert resource identities and filtered return URLs; isolated fixtures never use production accounts. Public regression runs against a clean production build. Browser plugin is unavailable; regular Playwright provides browser validation and artifacts.

## Remaining debt

P1 debt is empty after all required gates PASS. One role Dashboard test hit its 5-second loading expectation and passed on retry; this remains P2 test readiness/latency debt. P2 includes denser responsive filter drawers, advanced filtering and visual refinement. P3 includes automatic monitoring refresh and durable cross-session form drafts; current monitoring explicitly uses manual refresh and critical context reconstructs from URLs/server data.
