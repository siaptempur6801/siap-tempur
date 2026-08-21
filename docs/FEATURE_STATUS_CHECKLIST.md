# Siap Tempur — Feature Status Checklist

> **Branch:** `feat/schema-v2`  
> **Last audited:** 2026-08-21  
> **Primary staging Supabase:** `lpgrivowdcepcxradavu`  
> **Production Supabase:** `llnttutwhtvxtdktiizo`  
> **Production status:** **NO-GO** sampai checklist cutover production selesai dan ada approval eksplisit.

Dokumen ini dipakai sebagai checklist kerja fitur Siap Tempur. Update checkbox dan catatan ketika implementasi berubah.

## Legend

- [x] Selesai / sudah usable
- [ ] Belum selesai
- 🟡 Parsial — fondasi/engine sudah ada, tetapi belum lengkap atau belum production-ready
- 🔴 Belum dibangun sebagai fitur user-facing
- 🚧 Ditahan sampai gate tertentu selesai

---

# 1. Authentication & User Account

- [x] Register email/password
- [x] Login email/password
- [x] Login Google OAuth
- [x] Email verification
- [x] Resend verification email
- [x] Forgot password
- [x] Reset password
- [x] Change password
- [x] Sign out
- [x] Profile user
- [x] Track selection / activation CPNS-TKA
- [x] User dapat memiliki track aktif
- [ ] Device management UI
- [ ] Anti account-sharing / device limit

## Catatan

Auth utama sudah berjalan pada Schema V2. Device/session tables sudah tersedia, tetapi enforcement anti-sharing belum menjadi fitur lengkap.

---

# 2. Multi-Program Architecture

- [x] Program `CPNS`
- [x] Program `TKA`
- [x] Track `CPNS / SKD`
- [x] Track `TKA / SD`
- [x] Track `TKA / SMP`
- [x] Track `TKA / SMA`
- [x] Subject per track
- [x] `user_tracks`
- [x] `user_track_preferences`
- [x] Period / tahun ujian
- [x] Exam types
- [x] Exam blueprint engine
- [x] Knowledge node taxonomy
- [x] Knowledge node closure/path
- [x] Dynamic catalog context untuk admin

---

# 3. CPNS / SKD Core

## Question Bank

- [x] TWK question bank
- [x] TIU question bank
- [x] TKP question bank
- [x] Published CPNS bank tersedia di staging

## Drill

- [x] Drill TWK
- [x] Drill TIU
- [x] Drill TKP

## Mini Tryout

- [x] Mini Tryout TWK
- [x] Mini Tryout TIU
- [x] Mini Tryout TKP

## Full Tryout

- [x] Full Tryout SKD
- [x] TWK/TIU/TKP scoring
- [x] Autosave jawaban
- [x] Resume attempt
- [x] Submit
- [x] Result
- [x] Pembahasan
- [x] Riwayat tryout
- [x] Ranking / leaderboard

## Learning CPNS

- [x] Basic result/review
- [x] Basic activity tracking
- [x] Basic streak
- [ ] Canonical V2 materials populated — 🟡
- [ ] Knowledge mastery engine
- [ ] Readiness score
- [ ] Recommendation engine
- [ ] Automatic remedial
- [ ] Structured wrong-question mastery

---

# 4. CPNS Monetization

## Token

- [x] 1 Token Full Tryout
- [x] 5 Token Full Tryout
- [x] 10 Token Full Tryout
- [x] Wallet
- [x] Wallet transaction
- [x] Product wallet grant

## Tempur Pass CPNS

- [ ] Tempur Pass 30 hari activated — 🟡 product masih draft
- [ ] Tempur Pass 90 hari activated — 🟡 product masih draft

---

# 5. TKA Base Experience

- [x] `/tka`
- [x] `/tka/sd`
- [x] `/tka/smp`
- [x] `/tka/sma`
- [x] Dynamic track context
- [x] Track activation
- [x] Generic TKA practice/exam renderer
- [x] `single_choice`
- [x] `multiple_choice`
- [x] `category`
- [x] Stimulus support
- [x] Math rendering

---

# 6. TKA SMP — Content & Blueprint

## Official Structure

- [x] TKA SMP 2026 period
- [x] Bahasa Indonesia mandatory
- [x] Matematika mandatory
- [x] Bahasa Inggris enrichment catalog
- [x] IPA enrichment catalog
- [x] Official blueprint record
- [x] Bahasa Indonesia knowledge taxonomy
- [x] Matematika knowledge taxonomy

## Question Bank

- [x] 150 Bahasa Indonesia approved
- [x] 150 Matematika approved
- [x] 300 approved total
- [x] 300 current question version snapshots
- [x] 0 pending review pada bank approved
- [x] Exam eligibility guard

## Bahasa Indonesia Balance

- [x] Pemahaman Tekstual — 50
- [x] Pemahaman Inferensial — 50
- [x] Evaluasi & Apresiasi — 50

## Matematika Balance

- [x] Bilangan — 38
- [x] Aljabar — 38
- [x] Geometri & Pengukuran — 37
- [x] Data & Peluang — 37
- [x] Pengetahuan & Pemahaman — 50
- [x] Aplikasi — 50
- [x] Penalaran — 50

---

# 7. Content Review Workflow

## Backend Workflow

- [x] Draft
- [x] Submitted
- [x] Editorial Review
- [x] Academic Review
- [x] Technical QA
- [x] Revision Required
- [x] Reject
- [x] Approve
- [x] Publish
- [x] Reviewer assignment
- [x] Review rounds
- [x] Version snapshot
- [x] Self-review protection
- [x] Direct workflow bypass guard
- [x] Exam generator only accepts approved/published version

## Current TKA SMP Review Audit

- [x] Editorial approved — 300
- [x] Academic approved — 300
- [x] Technical QA approved — 300
- [x] Total approved review rows — 900

## Reviewer/Admin UI

- [ ] Review Queue UI
- [ ] Assign Reviewer UI
- [ ] Editorial Review workspace
- [ ] Academic Review workspace
- [ ] Technical QA workspace
- [ ] Revision request workflow UI
- [ ] Reviewer history/timeline UI
- [ ] Batch review management UI

**Status:** backend ✅, reviewer workspace UI 🔴.

---

# 8. TKA SMP Full Tryout

## Exam Definition

- [x] `tka-smp-full`
- [x] 60 questions total
- [x] 30 Bahasa Indonesia
- [x] 30 Matematika
- [x] 75 minutes Bahasa Indonesia
- [x] 75 minutes Matematika
- [x] 150 minutes total
- [x] Frozen/current question version
- [x] No duplicate selected questions
- [x] Blueprint-balanced generator
- [x] Deterministic selection support

## User-facing RPC

- [x] `start_exam_attempt`
- [x] `get_exam_attempt_state`
- [x] `save_exam_answer`
- [x] `complete_exam_section`
- [x] `submit_exam_attempt`
- [x] `get_exam_attempt_result`
- [x] `get_exam_attempt_review`

## Exam Player

- [x] Pre-exam
- [x] Start
- [x] Single choice answer
- [x] Multiple choice answer
- [x] Category answer
- [x] Mark/flag question
- [x] Autosave
- [x] Refresh/resume
- [x] Question navigator
- [x] Database-backed timer
- [x] BIN → MAT sequential section transition
- [x] Previous section lock
- [x] Submit after section completion
- [x] Early-submit backend guard
- [x] Inactive-track backend guard

## Result & Review

- [x] Total score
- [x] Score per subject
- [x] Correct / wrong / unanswered
- [x] Cognitive breakdown
- [x] Knowledge breakdown
- [x] Weakest areas
- [x] 60-question review
- [x] User answer
- [x] Correct answer
- [x] Explanation
- [x] Answer key hidden during active attempt
- [x] Result/review denied before completion

## QA

- [x] Manual authenticated browser smoke
- [x] Automated disposable-user browser E2E
- [x] GitHub OIDC → staging Supabase E2E provisioning
- [x] Disposable user cleanup
- [x] Dedicated E2E success 3 consecutive runs

---

# 9. TKA SMP Mini Tryout

- [x] Mini Bahasa Indonesia exam record exists
- [x] Mini Matematika exam record exists
- [ ] Activate Mini Bahasa Indonesia — currently draft
- [ ] Activate Mini Matematika — currently draft
- [ ] Final question distribution
- [ ] Dedicated E2E Mini Bahasa Indonesia
- [ ] Dedicated E2E Mini Matematika
- [ ] Release to learners

**Status:** 🟡.

---

# 10. TKA SMP Tempur Pass

## Engine/UI

- [x] TKA Pass package UI
- [x] Midtrans Snap integration
- [x] TKA pass checkout server action
- [x] Payment status sync
- [x] Entitlement architecture

## Product Activation

- [x] `TKA_SMP_PASS_30` product record exists
- [x] `TKA_SMP_PASS_90` product record exists
- [ ] Set active price for 30-day pass
- [ ] Set active price for 90-day pass
- [ ] Activate products
- [ ] TKA SMP paid checkout E2E
- [ ] TKA SMP entitlement expiry E2E
- [ ] General production rollout

**Status:** 🟡 — intentionally separated from first free/full-exam rollout.

---

# 11. TKA SD

## Catalog

- [x] SD track
- [x] Subject catalog
- [x] Question bank populated
- [x] Published bank available

## Exams

- [x] Mini Bahasa Indonesia config
- [x] Mini Matematika config
- [x] Mini Bahasa Inggris config
- [x] Full TKA SD config
- [x] Full + Bahasa Inggris config

## Monetization

- [x] TKA SD Pass 30-day product active
- [x] TKA SD Pass 90-day product active
- [x] Prices configured

## Remaining QA/Hardening

- [ ] Revalidate official SD subject taxonomy/mandatory status
- [ ] Apply formal blueprint quality audit equivalent to SMP
- [ ] Move complete bank through canonical version/review workflow
- [ ] Dedicated TKA SD E2E
- [ ] Answer-key/security audit equivalent to SMP

**Status:** 🟡 — feature-rich, tetapi belum QA-complete seperti SMP.

---

# 12. TKA SMA

## Catalog

- [x] SMA track
- [x] Core subjects catalog
- [x] Optional/elective subjects catalog

## Product

- [x] SMA pass product placeholders
- [ ] Final official blueprint
- [ ] Knowledge taxonomy
- [ ] Question bank
- [ ] Review workflow content
- [ ] Mini Tryout
- [ ] Full Tryout
- [ ] Result QA
- [ ] Tempur Pass price/activation
- [ ] Dedicated E2E

**Status:** 🔴 user-facing product belum dibangun; baru catalog/foundation.

---

# 13. Result, Review & Learning Intelligence

## Result Core

- [x] Attempt scoring
- [x] Subject score
- [x] Review answer
- [x] Explanation
- [x] Result history

## Progress/Intelligence

- [x] Basic user subject progress
- [x] Basic activity daily
- [x] Basic streak
- [ ] `user_knowledge_progress` engine
- [ ] `user_readiness` engine
- [ ] `user_question_state` behavior
- [ ] `learning_recommendations` engine
- [ ] Automatic remedial generation
- [ ] `remedial_sessions` flow
- [ ] `remedial_session_items` flow
- [ ] Wrong-question mastery mode
- [ ] Bookmark question UI
- [ ] Personal question notes UI
- [ ] Question statistics pipeline
- [ ] Exam statistics pipeline

**Status:** core result ✅, learning intelligence 🔴/🟡.

---

# 14. Event / Tryout Akbar

- [x] Event data model
- [x] Event CRUD
- [x] Event sessions
- [x] Event exam relationship
- [x] Event product/ticket linking
- [x] Registration
- [x] Payment
- [x] Access control
- [x] Attempt
- [x] Scoring
- [x] Live leaderboard
- [x] Final event ranking
- [x] Admin management
- [x] Staging E2E purchase → registration → attempt → ranking

---

# 15. Certificates

- [x] Certificate action/code exists
- [x] Certificate preview/download path exists
- [x] Certificate verification capability exists
- [ ] Canonical certificate templates populated
- [ ] Canonical certificates populated
- [ ] Full certificate generation E2E on Schema V2

**Status:** 🟡.

---

# 16. Payment & Commerce

- [x] Products
- [x] Product prices
- [x] Orders
- [x] Order items
- [x] Payments
- [x] Midtrans checkout
- [x] Midtrans Snap
- [x] Staging QRIS QA path
- [x] Payment status sync
- [x] Webhook architecture
- [x] Idempotent fulfillment
- [x] Entitlements
- [x] Wallets
- [x] Wallet transactions
- [x] Product wallet grants
- [x] Payment reconciliation cron
- [ ] Refund user/admin workflow

---

# 17. Voucher / Promotion V2

## Schema

- [x] `promotions`
- [x] `promotion_products`
- [x] `promotion_redemptions`

## Product Feature

- [ ] Promotion admin UI
- [ ] Promotion validation engine
- [ ] Voucher code redemption V2
- [ ] Discount application to checkout
- [ ] Redemption limit rules
- [ ] Historical voucher migration strategy
- [ ] Legacy voucher parity decision

**Status:** 🔴 blocker production cutover unless explicitly retired.

---

# 18. Operational Export V2

- [ ] User export V2
- [ ] Attempt/result export V2
- [ ] Payment/order export V2
- [ ] Event registration/ranking export V2
- [ ] Question/content export V2
- [ ] Replace legacy export dependencies

**Status:** 🔴 production cutover blocker unless explicitly accepted as unavailable for first release.

---

# 19. Admin Workspace V2

## Existing Core

- [x] Program/track context switch
- [x] Product CRUD
- [x] Price management
- [x] Token grant management
- [x] Event CRUD
- [x] Event session management
- [x] Event-product linkage
- [x] Exam CRUD
- [x] Exam section CRUD
- [x] Question CRUD
- [x] Question option management
- [x] Orders view
- [x] Payments view
- [x] Permission enforcement

## Missing Workspace Modules

- [ ] Reviewer Workspace
- [ ] RBAC user/role assignment UI
- [ ] Promotion/Voucher manager
- [ ] Organization/School manager
- [ ] Notification manager
- [ ] Feature flag manager
- [ ] System settings UI
- [ ] Advanced analytics dashboard
- [ ] Operational export UI

---

# 20. RBAC

## Backend

- [x] Roles table
- [x] Permissions table
- [x] Role-permission mapping
- [x] User-role mapping
- [x] Permission checks server-side
- [x] `SUPER_ADMIN`
- [x] `ADMIN`
- [x] `CONTENT_EDITOR`
- [x] `CONTENT_REVIEWER`
- [x] `FINANCE`
- [x] `SUPPORT`
- [x] `SCHOOL_ADMIN`

## Management UI

- [ ] Role management UI
- [ ] Permission matrix UI
- [ ] User role assignment UI
- [ ] User role audit/history UI

---

# 21. School / Organization / B2B

## Schema Foundation

- [x] `organizations`
- [x] `organization_members`
- [x] `classes`
- [x] `class_members`
- [x] `organization_licenses`
- [x] `organization_exam_assignments`

## Product Flow

- [ ] School admin onboarding
- [ ] Organization CRUD UI
- [ ] Class CRUD UI
- [ ] Student/member import
- [ ] Assign exam to organization/class
- [ ] Organization license management
- [ ] School leaderboard
- [ ] Class report
- [ ] Organization analytics

**Status:** 🔴 schema-only foundation.

---

# 22. Notifications

## Schema

- [x] `notifications`
- [x] `notification_campaigns`
- [x] `notification_deliveries`

## Product

- [ ] Notification inbox UI
- [ ] Campaign manager
- [ ] Scheduled campaign delivery
- [ ] Exam reminder
- [ ] Payment notification
- [ ] Learning/remedial notification

**Status:** 🔴.

---

# 23. Reporting & Analytics

- [x] Basic dashboard metrics
- [x] Basic ranking
- [x] Attempt score breakdown
- [ ] `generated_reports` pipeline
- [ ] Question statistics pipeline
- [ ] Exam statistics pipeline
- [ ] Admin analytics dashboard
- [ ] User mastery trend
- [ ] School/organization reporting
- [ ] Scheduled reports

**Status:** 🟡 basic analytics, 🔴 advanced reporting.

---

# 24. Blog / Content Marketing

- [x] Blog routes
- [x] Article detail
- [x] Article admin
- [x] Create article
- [x] Edit article

---

# 25. Security, CI & QA

- [x] RLS on canonical public tables
- [x] Server-side authorization pattern
- [x] Answer-key protection for TKA SMP active exam
- [x] Early-submit guard
- [x] Inactive-track guard
- [x] Security-definer hardening pattern
- [x] Staging/production environment separation
- [x] GitHub OIDC for staging E2E provisioning
- [x] Disposable E2E user cleanup
- [x] ESLint green
- [x] TypeScript green
- [x] Unit tests green
- [x] Security dependency audit green
- [x] Production build green
- [x] Existing Playwright suite green
- [x] TKA SMP dedicated E2E x3 green
- [x] Latest `feat/schema-v2` Vercel deployment READY
- [ ] Normalize `package-lock.json` drift
- [ ] Remove/replace unrelated legacy server warnings in CI

---

# 26. Production Schema V2 Cutover

> **CURRENT STATUS: 🔴 NO-GO**

Refer to:

- `docs/schema-v2-cutover-runbook.md`
- `docs/TKA_SMP_PRODUCTION_ROLLOUT.md`

## Blocker B1 — Transition Migration

- [ ] Generate production collision manifest
- [ ] Design deterministic legacy table isolation/rename
- [ ] Build versioned transition migration
- [ ] Preserve production `auth.users.id`
- [ ] Rehearse against production clone

## Blocker B2 — Data Transformation

- [ ] Profiles/users mapping
- [ ] Questions/options mapping
- [ ] Legacy sessions → exam attempts
- [ ] Legacy answers → attempt answers
- [ ] Subject scores → attempt scores
- [ ] Transactions/payments mapping
- [ ] Legacy token/quota → wallets
- [ ] Event migration
- [ ] Voucher migration/retirement decision
- [ ] Leaderboard recalculation strategy
- [ ] Learning/material mapping

## Blocker B3 — Voucher / Promotion Parity

- [ ] Implement V2 promotion flow **or** formally retire voucher redemption
- [ ] Preserve voucher history

## Blocker B4 — Operational Export

- [ ] Implement V2 operational export **or** formally accept temporary unavailability

## Blocker B5 — Production Environment Verification

- [ ] Verify production Supabase ref
- [ ] Verify production publishable key belongs to production project
- [ ] Verify production service-role belongs to production project
- [ ] Verify Midtrans production keys/endpoints
- [ ] Verify OAuth callback allow-list
- [ ] Verify production site URL
- [ ] Verify Preview/Staging isolation

## Blocker B6 — Backup & Rollback Rehearsal

- [ ] Verify backup/PITR capability
- [ ] Record current production deployment ID
- [ ] Migration rehearsal on production clone
- [ ] Reconciliation rehearsal
- [ ] Simulate failed smoke test
- [ ] Application rollback rehearsal
- [ ] Database rollback/forward-fix rehearsal
- [ ] Measure rollback time

## Final Production Gates

- [ ] All P0 blockers closed
- [ ] Migration diff reviewed
- [ ] No unexplained monetary mismatch
- [ ] No identity mismatch
- [ ] No score migration mismatch
- [ ] Production smoke plan approved
- [ ] Rollback owner assigned
- [ ] Release owner assigned
- [ ] Monitoring owner assigned
- [ ] Explicit GO approval from project owner

---

# 27. Priority Roadmap

## P0 — Current Product Completion

- [ ] Reviewer Workspace UI
- [ ] TKA SMP Mini Tryout BIN
- [ ] TKA SMP Mini Tryout MAT
- [ ] TKA SMP Mini Tryout E2E
- [ ] Final staging release-candidate smoke

## P1 — Learning Platform V1

- [ ] Knowledge mastery
- [ ] Wrong-question mode
- [ ] Automatic remedial
- [ ] Learning recommendations
- [ ] Readiness score
- [ ] User bookmarks/notes

## P1 — TKA SD Hardening

- [ ] Official blueprint revalidation
- [ ] Canonical review/version migration
- [ ] Dedicated E2E

## P1/P2 — TKA SMA

- [ ] Official blueprint
- [ ] Knowledge taxonomy
- [ ] Question bank
- [ ] Review workflow
- [ ] Mini/Full Tryout
- [ ] Dedicated E2E

## P1 — Production Parity

- [ ] Voucher/Promotion V2
- [ ] Operational Export V2
- [ ] Production transition migration
- [ ] Production clone rehearsal

## P2 — Growth / B2B

- [ ] School/organization workspace
- [ ] Notification campaigns
- [ ] Advanced reporting
- [ ] Certificate canonical data flow
- [ ] Device/account-sharing controls

---

# 28. Quick Launch Checklist — TKA SMP Only

Jika targetnya meluncurkan **TKA SMP saja**, tidak perlu menunggu TKA SMA, School/B2B, Notifications, atau Advanced Reporting.

## Product

- [x] 300 approved bank
- [x] Official TKA SMP full blueprint
- [x] 60-question Full Tryout
- [x] 30 BIN + 30 MAT
- [x] 75 + 75 minute sections
- [x] Attempt / autosave / resume
- [x] Scoring
- [x] Result
- [x] Pembahasan
- [x] Browser E2E
- [x] Automated E2E x3
- [ ] Optional: Mini Tryout before launch
- [ ] Optional: Reviewer Workspace before team scales content

## Production Safety

- [ ] Production transition migration ready
- [ ] Production clone rehearsal green
- [ ] Production env verified
- [ ] Backup/rollback verified
- [ ] Internal production QA plan ready
- [ ] Controlled cohort plan ready
- [ ] Explicit production GO

---

# 29. Current High-Level Status

| Area | Status |
| --- | --- |
| Authentication | ✅ |
| Multi-program architecture | ✅ |
| CPNS exam core | ✅ |
| CPNS event | ✅ |
| CPNS payment/token | ✅ |
| CPNS learning intelligence | 🟡 |
| TKA SD | 🟡 |
| TKA SMP Full Tryout | ✅ |
| TKA SMP Mini Tryout | 🟡 |
| TKA SMP Tempur Pass | 🟡 |
| TKA SMA | 🔴 |
| Result & review | ✅ |
| Content review backend | ✅ |
| Reviewer Workspace UI | 🔴 |
| Admin core V2 | ✅ |
| Payment/Midtrans | ✅ |
| RBAC backend | ✅ |
| Voucher/Promotion V2 | 🔴 |
| Certificates | 🟡 |
| Learning recommendation/remedial | 🔴 |
| Organizations/Schools | 🔴 |
| Notifications | 🔴 |
| Advanced reporting | 🔴 |
| Operational Export V2 | 🔴 |
| CI / E2E / Vercel Preview | ✅ |
| Production Schema V2 Cutover | 🔴 NO-GO |

---

# 30. Update Rules

Saat mengubah checklist ini:

1. Centang `[x]` hanya setelah implementasi dan minimal smoke test lolos.
2. Jangan menandai production-ready hanya karena tabel/schema sudah ada.
3. Untuk fitur parsial, pecah menjadi subtask dan centang per komponen.
4. Catat E2E/QA yang menjadi bukti untuk fitur kritikal.
5. Jangan mengubah status production `NO-GO` sebelum seluruh blocker cutover direview.
6. Production database tidak boleh dimodifikasi hanya untuk membuat checklist menjadi hijau.
