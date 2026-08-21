# Siap Tempur — Feature Status Checklist

> **Branch target:** `feat/schema-v2`  
> **Last audited:** 2026-08-21  
> **Primary staging Supabase:** `lpgrivowdcepcxradavu`  
> **Production Supabase:** `llnttutwhtvxtdktiizo`  
> **Production status:** **NO-GO** sampai production cutover checklist selesai dan ada approval eksplisit.

Dokumen ini adalah master tracker fitur Siap Tempur. Gunakan `[x]` untuk selesai dan `[ ]` untuk pekerjaan yang belum selesai.

## Legend

- [x] Selesai / usable
- [ ] Belum selesai
- 🟡 Parsial / belum release-ready
- 🔴 Belum dibangun sebagai produk lengkap
- 🚧 Ditahan oleh gate lain

---

# 1. Authentication & User Account

- [x] Register email/password
- [x] Login email/password
- [x] Google OAuth
- [x] Email verification + resend
- [x] Forgot/reset/change password
- [x] Sign out
- [x] Profile user
- [x] Track selection / activation
- [ ] Device management UI
- [ ] Anti account-sharing / device-limit enforcement

**Status:** ✅ core auth selesai.

---

# 2. Multi-Program Architecture

- [x] Program `CPNS`
- [x] Program `TKA`
- [x] Track `CPNS / SKD`
- [x] Track `TKA / SD`
- [x] Track `TKA / SMP`
- [x] Track `TKA / SMA`
- [x] Subject per track
- [x] Period / tahun ujian
- [x] Exam types
- [x] Exam blueprint engine
- [x] Knowledge taxonomy/path
- [x] Dynamic Program → Track context
- [x] Unified admin context untuk CPNS + TKA

**Status:** ✅.

---

# 3. Unified Admin Workspace

Canonical admin sekarang menggunakan satu namespace global:

```text
/admin
├── content
│   ├── questions
│   ├── review
│   └── articles
├── assessment
│   ├── exams
│   └── events
└── commerce
    ├── products
    └── orders/payments
```

- [x] `/admin`
- [x] `/admin/content/questions`
- [x] `/admin/content/review`
- [x] `/admin/content/articles`
- [x] `/admin/assessment/exams`
- [x] `/admin/assessment/events`
- [x] `/admin/commerce/products`
- [x] `/admin/commerce`
- [x] Program/track context switch
- [x] Legacy `/cpns/admin/*` compatibility redirect
- [x] Permission-aware navigation
- [x] CPNS dan TKA memakai admin shell yang sama

**Status:** ✅ core unified admin selesai.

---

# 4. Reviewer / Content Workspace — MILESTONE 1

## Queue & Filters

- [x] Review Queue
- [x] Filter program
- [x] Filter track
- [x] Filter subject
- [x] Filter workflow status
- [x] Filter review stage
- [x] Filter reviewer
- [x] Search soal

## Authoring

- [x] Create draft question
- [x] Edit draft / revision
- [x] `single_choice`
- [x] `multiple_choice`
- [x] `category`
- [x] Options management
- [x] Explanation
- [x] Stimulus selection/preview
- [x] Primary knowledge-node mapping
- [x] Cognitive level
- [x] Difficulty
- [x] Estimated time
- [x] Source reference
- [x] Transactional `save_question_draft`
- [x] Question version snapshot/history

## Review Workflow

- [x] Submit to Editorial Review
- [x] Assign reviewer
- [x] Editorial Review
- [x] Academic Review
- [x] Technical QA
- [x] Approve
- [x] Request Revision
- [x] Reject
- [x] Publish
- [x] Reviewer notes
- [x] Review rounds/history
- [x] Self-review blocked
- [x] Direct workflow bypass guarded
- [x] Audit trail
- [ ] Batch review management — future enhancement, bukan blocker Milestone 1

## RBAC

- [x] `CONTENT_EDITOR` least privilege
- [x] `CONTENT_REVIEWER` least privilege
- [x] Authenticated authorization RPC
- [x] Reviewer/editor tidak membutuhkan full-admin access
- [x] Normal workspace tidak bergantung pada browser service-role key

## QA Gate

- [x] Lint
- [x] Typecheck
- [x] Unit tests
- [x] Security audit
- [x] Build
- [x] Existing E2E
- [x] TKA SMP regression E2E
- [x] Browser E2E author → reviewer → Editorial → Academic → Technical QA → Published
- [x] Dedicated Content Review E2E sukses 3× berturut-turut pada commit identik
- [x] Disposable CI users cleanup
- [x] Disposable CI questions cleanup
- [x] Staging cleanup verified: 0 CI content users / 0 CI content questions

**Status:** **✅ CONTENT OPERATIONS COMPLETED — Milestone 1 COMPLETE.**

---

# 5. CPNS / SKD Core

- [x] TWK/TIU/TKP question bank
- [x] Drill TWK/TIU/TKP
- [x] Mini Tryout TWK/TIU/TKP
- [x] Full Tryout SKD
- [x] Autosave/resume/submit
- [x] Scoring TWK/TIU/TKP
- [x] Result + pembahasan
- [x] Riwayat
- [x] Ranking / leaderboard

**Status:** ✅ exam core.

---

# 6. CPNS Learning

- [x] Basic result/review
- [x] Basic subject progress
- [x] Basic daily activity
- [x] Basic streak
- [ ] Canonical Schema V2 materials populated
- [ ] Knowledge mastery engine
- [ ] Readiness score
- [ ] Recommendation engine
- [ ] Automatic remedial
- [ ] Structured wrong-question mastery

**Status:** 🟡.

---

# 7. CPNS Monetization

- [x] Token 1
- [x] Token 5
- [x] Token 10
- [x] Wallet + wallet transaction
- [x] Product wallet grant
- [ ] `CPNS_PASS_30` activate
- [ ] `CPNS_PASS_90` activate

**Status:** token ✅, Tempur Pass CPNS 🟡.

---

# 8. TKA Base Experience

- [x] `/tka`
- [x] `/tka/sd`
- [x] `/tka/smp`
- [x] `/tka/sma`
- [x] Track activation
- [x] Generic TKA exam renderer
- [x] `single_choice`
- [x] `multiple_choice`
- [x] `category`
- [x] Stimulus support
- [x] Math rendering

**Status:** ✅ foundation.

---

# 9. TKA SMP Content & Blueprint

- [x] Period TKA SMP 2026
- [x] Bahasa Indonesia mandatory
- [x] Matematika mandatory
- [x] Bahasa Inggris enrichment catalog
- [x] IPA enrichment catalog
- [x] Official blueprint record
- [x] Knowledge taxonomy BIN + MAT
- [x] 150 BIN approved
- [x] 150 MAT approved
- [x] 300 approved questions
- [x] 300 current question-version snapshots
- [x] 900 approved review-stage rows
- [x] Exam eligibility guard

**Status:** ✅.

---

# 10. TKA SMP Full Tryout

- [x] `tka-smp-full`
- [x] 60 questions
- [x] BIN 30 / 75 minutes
- [x] MAT 30 / 75 minutes
- [x] 150 minutes total
- [x] Frozen/current question version
- [x] Blueprint-balanced selection
- [x] Start attempt
- [x] Autosave answer
- [x] Resume
- [x] Section completion
- [x] BIN → MAT transition
- [x] Previous-section lock
- [x] Submit guards
- [x] Result
- [x] Subject/cognitive/knowledge breakdown
- [x] Weakest areas
- [x] 60-question review + explanation
- [x] Answer-key protection during active attempt
- [x] Authenticated browser smoke
- [x] Dedicated staging E2E
- [x] TKA E2E regression green after Unified Admin work

**Status:** ✅.

---

# 11. TKA SMP Mini Tryout — MILESTONE 2

- [x] Mini Bahasa Indonesia exam record
- [x] Mini Matematika exam record
- [ ] Final blueprint Mini BIN
- [ ] Final blueprint Mini MAT
- [ ] Final question count/duration
- [ ] Randomization + version lock verification
- [ ] Activate Mini BIN
- [ ] Activate Mini MAT
- [ ] Autosave/resume verification
- [ ] Result/pembahasan verification
- [ ] Attempt-limit verification
- [ ] Negative tests
- [ ] Dedicated E2E BIN
- [ ] Dedicated E2E MAT
- [ ] Core TKA SMP navigation/history/empty/loading/error/mobile QA
- [ ] Release to learners

**Status:** 🟡 — **NEXT ACTIVE MILESTONE** setelah Milestone 1 merge.

---

# 12. TKA SMP Learning Loop — MILESTONE 3

- [ ] Knowledge mastery per node
- [ ] Wrong-question state
- [ ] Mode ulang soal salah
- [ ] Automatic remedial
- [ ] Weakest-topic learning flow
- [ ] Readiness score V1
- [ ] Rule-based recommendation V1
- [ ] Progress dashboard
- [ ] E2E exam → remedial → mastery update

**Status:** 🔴/🟡 foundation only.

---

# 13. TKA SMP Monetization — MILESTONE 4

- [x] TKA Pass package UI
- [x] Midtrans Snap integration
- [x] Checkout action
- [x] Payment status sync
- [x] Entitlement architecture
- [x] `TKA_SMP_PASS_30` record
- [x] `TKA_SMP_PASS_90` record
- [ ] Final prices
- [ ] Activate products
- [ ] Paid checkout E2E
- [ ] Expiry/access E2E
- [ ] Renewal UX

**Status:** 🟡; intentionally deferred until learning/core product selesai.

---

# 14. TKA SD

- [x] Track + subject catalog
- [x] Question bank populated/published
- [x] Mini BIN/MAT/BIG configs
- [x] Full config
- [x] Pass 30/90 products + prices
- [ ] Revalidate official subject/mandatory structure
- [ ] Blueprint-quality audit equivalent to SMP
- [ ] Canonical version/review hardening
- [ ] Dedicated TKA SD E2E
- [ ] Security/answer-key audit equivalent to SMP

**Status:** 🟡.

---

# 15. TKA SMA

- [x] Track
- [x] Core/optional subject catalog
- [x] Pass product placeholders
- [ ] Final official blueprint
- [ ] Knowledge taxonomy
- [ ] Question bank
- [ ] Canonical review content
- [ ] Mini Tryout
- [ ] Full Tryout
- [ ] Result QA
- [ ] Monetization activation
- [ ] Dedicated E2E

**Status:** 🔴 user-facing product belum lengkap.

---

# 16. Event / Tryout Akbar

- [x] Event CRUD
- [x] Sessions
- [x] Event-product linkage
- [x] Registration
- [x] Payment
- [x] Access control
- [x] Attempt + scoring
- [x] Live/final ranking
- [x] Admin management
- [x] Staging E2E purchase → registration → attempt → ranking

**Status:** ✅ core.

---

# 17. Payment & Commerce

- [x] Products/prices
- [x] Orders/items
- [x] Payments
- [x] Midtrans checkout/Snap
- [x] Payment status sync
- [x] Webhook architecture
- [x] Idempotent fulfillment
- [x] Entitlements
- [x] Wallets
- [x] Payment reconciliation cron
- [ ] Refund user/admin workflow

**Status:** ✅ core, refund pending.

---

# 18. Certificates

- [x] Certificate code/action
- [x] Preview/download route
- [x] Verification capability
- [ ] Canonical template data
- [ ] Canonical generated certificate data
- [ ] Full Schema V2 certificate E2E

**Status:** 🟡.

---

# 19. Voucher / Promotion V2

- [x] Promotions schema
- [x] Promotion-products schema
- [x] Promotion-redemptions schema
- [ ] Promotion admin UI
- [ ] Validation engine
- [ ] Voucher redemption V2
- [ ] Discount checkout application
- [ ] Redemption-limit rules
- [ ] Legacy migration/parity decision

**Status:** 🔴 product incomplete; production cutover dependency unless explicitly retired.

---

# 20. Operational Export V2

- [ ] User export
- [ ] Attempt/result export
- [ ] Payment/order export
- [ ] Event export
- [ ] Question/content export
- [ ] Remove legacy export dependency

**Status:** 🔴 production cutover dependency unless explicitly deferred.

---

# 21. RBAC

- [x] Roles
- [x] Permissions
- [x] Role-permission mapping
- [x] User-role mapping
- [x] Server-side permission checks
- [x] `SUPER_ADMIN`
- [x] `ADMIN`
- [x] `CONTENT_EDITOR`
- [x] `CONTENT_REVIEWER`
- [x] `FINANCE`
- [x] `SUPPORT`
- [x] `SCHOOL_ADMIN`
- [x] Content roles hardened to least privilege
- [ ] User/role assignment management UI
- [ ] Program/track scope management UI

**Status:** backend ✅, management UI 🟡.

---

# 22. Organizations / School / B2B

- [x] Organizations/classes/licenses/assignment schema foundation
- [ ] Organization manager UI
- [ ] Member/class management UI
- [ ] School licensing flow
- [ ] Exam assignment flow
- [ ] School reporting
- [ ] B2B E2E

**Status:** 🔴 foundation only.

---

# 23. Notifications

- [x] Notification schema foundation
- [ ] Notification center
- [ ] Campaign manager
- [ ] Delivery worker/integration
- [ ] Preferences
- [ ] E2E

**Status:** 🔴.

---

# 24. Advanced Analytics & Learning Intelligence

- [x] Basic subject progress/activity/streak
- [ ] Knowledge mastery pipeline
- [ ] User readiness
- [ ] Learning recommendation engine
- [ ] Remedial sessions
- [ ] Bookmark/note UX
- [ ] Question statistics pipeline
- [ ] Exam statistics pipeline
- [ ] Generated reports

**Status:** 🔴/🟡.

---

# 25. Production Schema V2 Cutover — MILESTONE 5

**Current status: 🚧 NO-GO.**

Blocking gates:

- [ ] Production transition migration
- [ ] Legacy → Schema V2 data transformation mapping
- [ ] Preserve user UUID/auth relationships
- [ ] Question/attempt/score migration rehearsal
- [ ] Payment/wallet/event migration rehearsal
- [ ] Voucher/promotion parity or explicit retirement
- [ ] Operational export parity or explicit accepted deferral
- [ ] Production environment verification
- [ ] Backup/PITR verification
- [ ] Rollback rehearsal
- [ ] Production-clone rehearsal
- [ ] Financial/data reconciliation
- [ ] Explicit final GO approval

**Rule:** production Supabase dan `main` tidak boleh disentuh sebelum gate ini selesai dan ada approval eksplisit.

---

# Milestone Summary

| Milestone | Status |
|---|---|
| 1. Reviewer / Content Workspace + Unified Admin | ✅ COMPLETE |
| 2. TKA SMP Mini + Core Product | ⏭️ NEXT |
| 3. TKA SMP Learning Loop V1 | ⏸️ LOCKED |
| 4. TKA SMP Monetization | ⏸️ LOCKED |
| 5. Schema V2 Production Cutover | 🚧 NO-GO / LOCKED |
| 6. TKA SD Hardening | ⏸️ LOCKED |
| 7. TKA SMA | ⏸️ LOCKED |
| 8. Platform Expansion | ⏸️ LOCKED |

## Current completion marker

```text
MILESTONE 1 ✅ COMPLETE
CONTENT OPERATIONS ✅ COMPLETED
UNIFIED ADMIN CPNS + TKA ✅ COMPLETED
```

Next engineering focus setelah merge Milestone 1:

```text
MILESTONE 2 — TKA SMP MINI TRYOUT + CORE PRODUCT
```
