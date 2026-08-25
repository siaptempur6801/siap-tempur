# Siap Tempur — Execution Roadmap

> **Branch target:** `feat/schema-v2`  
> **Working mode:** satu milestone harus **COMPLETE** sebelum milestone berikutnya dimulai.  
> **Production status:** **NO-GO** sampai production cutover gates selesai dan ada approval eksplisit.  
> **Companion tracker:** `docs/FEATURE_STATUS_CHECKLIST.md`  
> **Admin UX standard:** `docs/ADMIN_UI_UX_STANDARD.md`

Prinsip kerja utama:

> **Selama milestone aktif belum memenuhi Definition of Done, jangan mulai milestone berikutnya.**

Untuk seluruh milestone yang menyentuh admin, Definition of Done juga wajib memenuhi UI/UX, responsive, feedback state, dan role-aware interaction sesuai `docs/ADMIN_UI_UX_STANDARD.md`.

---

# Milestone Order

```text
1. REVIEWER / CONTENT WORKSPACE + UNIFIED ADMIN
       ↓
   COMPLETE ✅
       ↓
1.5 ADMIN UI/UX HARDENING
       ↓
   COMPLETE ✅
       ↓
2. TKA SMP MINI + CORE PRODUCT
       ↓
   COMPLETE ✅
       ↓
3. TKA SMP LEARNING LOOP V1
       ↓
   COMPLETE ✅
       ↓
4. TKA SMP MONETIZATION
       ↓
   NEXT ACTIVE ⏭
       ↓
5. SCHEMA V2 PRODUCTION CUTOVER
       ↓
   LOCKED / NO-GO
       ↓
6. TKA SD HARDENING
       ↓
   LOCKED
       ↓
7. TKA SMA
       ↓
   LOCKED
       ↓
8. PLATFORM EXPANSION
```

---

# 1. Reviewer / Content Workspace + Unified Admin

**Status:** [x] **COMPLETE — 2026-08-21**

## Goal

Membuat workflow authoring dan review soal dapat dipakai tim sepenuhnya dari UI tanpa SQL, Supabase Dashboard, atau intervensi developer, sekaligus menjadikan admin CPNS dan TKA satu workspace global dengan context Program → Track.

## Completion Summary

- [x] Canonical `/admin` workspace
- [x] Content questions/review/articles
- [x] Assessment exams/events
- [x] Commerce products/orders
- [x] Program → Track context
- [x] Authoring → Editorial → Academic → Technical QA → Publish
- [x] Least-privilege editor/reviewer RBAC
- [x] Browser workflow without service-role key
- [x] Dedicated content-review E2E and staging cleanup

```text
MILESTONE 1 ✅ COMPLETE
CONTENT OPERATIONS ✅ COMPLETED
UNIFIED ADMIN CPNS + TKA ✅ COMPLETED
```

---

# 1.5 Admin UI/UX Hardening

**Status:** [x] **COMPLETE — 2026-08-21**

## Completion Summary

- [x] Responsive admin shell
- [x] Persistent Program / Track context
- [x] Permission-aware navigation
- [x] Desktop/mobile/tablet workflow
- [x] Structured question-option editor
- [x] Operational empty/success/error states
- [x] Reviewer Workspace established as gold-standard admin surface
- [x] `docs/ADMIN_UI_UX_STANDARD.md` established as permanent standard
- [x] CI + responsive E2E + Vercel preview verified

Evidence:
- final code commit `b0d7627b34447455249063a552ae21ac61f19518`
- CI `32466171315` — SUCCESS
- Content Review + responsive E2E `32466171351` — SUCCESS

```text
MILESTONE 1.5 ✅ COMPLETE
ADMIN UX HARDENING ✅ COMPLETED
```

---

# 2. TKA SMP Mini Tryout + Core Product

**Status:** [x] **COMPLETE — 2026-08-21**

## Goal

Menutup seluruh gap user-facing TKA SMP setelah Full Tryout sehingga learner tidak menemukan dead-end dalam flow ujian dasar.

## Delivered

### Full Tryout
- [x] 60 questions
- [x] BIN 30 / 75 minutes
- [x] MAT 30 / 75 minutes
- [x] Sequential sections
- [x] Attempt/resume/autosave
- [x] Scoring/result/review
- [x] Answer-key protection

### Mini Bahasa Indonesia
- [x] 15 questions
- [x] 35 minutes
- [x] One free attempt
- [x] Blueprint/randomization/version lock
- [x] Attempt/resume/autosave
- [x] Scoring/result/review
- [x] Attempt-limit + negative-path verification

### Mini Matematika
- [x] 15 questions
- [x] 35 minutes
- [x] One free attempt
- [x] Blueprint/randomization/version lock
- [x] Attempt/resume/autosave
- [x] Scoring/result/review
- [x] Attempt-limit + negative-path verification

### Core learner UX
- [x] Full/mini navigation
- [x] Track activation/access guards
- [x] Result + pembahasan
- [x] Browser regression coverage
- [x] Mobile/core flow verification

## Definition of Done Result

> User dapat masuk TKA SMP, memilih Mini Tryout atau Full Tryout, menyelesaikan ujian, melihat hasil/pembahasan, dan mengulang flow tanpa intervensi admin.

```text
MILESTONE 2 ✅ COMPLETE
TKA SMP CORE PRODUCT ✅ COMPLETED
```

---

# 3. TKA SMP Learning Loop V1

**Status:** [x] **COMPLETE — 2026-08-21**

## Goal

Mengubah Siap Tempur dari sekadar tryout menjadi learning loop sederhana, deterministic, aman, dan dapat dilacak.

```text
Selesai ujian
     ↓
Analisis kelemahan
     ↓
Soal salah / unanswered gaps
     ↓
Automatic remedial / Repeat Wrong
     ↓
Update mastery
     ↓
Weakest-topic recommendation
     ↓
Readiness Score V1
     ↓
Progress Dashboard
```

## Delivered

- [x] Learning Projection Engine / knowledge mastery per node
- [x] Subject progress projection
- [x] Wrong-question persistent state
- [x] Mode Ulang Soal Salah
- [x] Automatic remedial, max 10 per source attempt
- [x] Weakest-topic deterministic ranking
- [x] Rule-based Recommendation V1
- [x] Readiness Score V1
- [x] Progress Dashboard `/tka/smp/progress`
- [x] RLS/RPC least-privilege boundary
- [x] Cross-user/BOLA denial verification
- [x] Final single-chain E2E exam → remedial → Repeat Wrong → mastery → recommendation → readiness → dashboard

## Closure Evidence

- PR #10 merged into `feat/schema-v2`
- Milestone head before merge: `c17bf515cc18d810af63aa3a957746ca3c7b82d3`
- Merge commit: `ee306041fbfee3f5d1a2dc99cfa44613778e11a5`
- CI #256 — SUCCESS
- TKA SMP Staging E2E #130 — SUCCESS
- Playwright 7/7 passed, 0 retry/flaky
- Disposable learner cleanup: 0 leaked users
- Production and `main` untouched

## Definition of Done Result

> Setiap hasil ujian menghasilkan tindakan belajar berikutnya secara otomatis dan state belajar tersebut konsisten sampai dashboard.

```text
MILESTONE 3 ✅ COMPLETE
TKA SMP LEARNING LOOP V1 ✅ ACCEPTED + MERGED
```

---

# 4. TKA SMP Monetization

**Status:** [ ] **NEXT ACTIVE MILESTONE**

## Goal

Mengaktifkan Tempur Pass hanya setelah Core Product dan Learning Loop siap, dengan payment + entitlement lifecycle yang deterministic dan aman.

## Existing foundation to audit/reuse

- [x] TKA Pass package UI exists
- [x] Midtrans Snap integration exists
- [x] Checkout action exists
- [x] Payment status sync exists
- [x] Entitlement architecture exists
- [x] `TKA_SMP_PASS_30` product record exists
- [x] `TKA_SMP_PASS_90` product record exists

## Remaining checklist

- [ ] Audit current product/pricing/payment/entitlement schema and code
- [ ] Final price 30-day
- [ ] Final price 90-day
- [ ] Product activation on staging
- [ ] Product-feature mapping verification
- [ ] Entitlement issuance verification
- [ ] Midtrans checkout QA
- [ ] Pending/paid/failed/expired payment states
- [ ] Idempotent webhook verification
- [ ] Pass expiry enforcement
- [ ] Access denied after expiry/no entitlement
- [ ] Renewal UX
- [ ] Admin payment/order verification
- [ ] Paid E2E
- [ ] Expiry/no-entitlement E2E
- [ ] Security/BOLA/payment-integrity audit
- [ ] Final staging closure

## Definition of Done

> User dapat membeli pass sendiri dan akses premium berubah otomatis sesuai payment + entitlement lifecycle; duplicate webhook, expired entitlement, dan cross-user access tidak dapat memberi akses tidak sah.

**Do not start Milestone 5 until this is complete.**

---

# 5. Schema V2 Production Cutover

**Status:** [ ] COMPLETE — **NO-GO / LOCKED**

Milestone ini merupakan proyek cutover tersendiri. Saat aktif, lakukan feature freeze; jangan mencampur penambahan fitur baru.

```text
Feature Freeze
      ↓
Production Clone / Rehearsal
      ↓
Transition Migration
      ↓
Transform Legacy Data
      ↓
Reconciliation
      ↓
Schema V2 Smoke
      ↓
Rollback Rehearsal
      ↓
GO / NO-GO
      ↓
Production Cutover
```

Blocking checklist:
- [ ] Collision manifest
- [ ] Legacy → V2 mapping
- [ ] User UUID preservation
- [ ] Questions/attempts/scores migration rehearsal
- [ ] Payments/wallet/token/event migration rehearsal
- [ ] Voucher/promotion parity decision
- [ ] Operational export parity/deferral decision
- [ ] Leaderboard + financial reconciliation
- [ ] Production environment verification
- [ ] Backup/PITR verification
- [ ] Rollback rehearsal
- [ ] Production-clone rehearsal
- [ ] Final smoke test
- [ ] Explicit GO approval

**Production Supabase dan `main` tetap tidak boleh disentuh tanpa explicit GO.**

---

# 6. TKA SD Hardening

**Status:** [ ] COMPLETE — LOCKED

- [ ] Revalidate official SD structure
- [ ] Final blueprint
- [ ] Taxonomy + existing bank audit
- [ ] Canonical version/review workflow
- [ ] Mini exam QA
- [ ] Full exam QA
- [ ] Learning loop adaptation
- [ ] Monetization QA
- [ ] Dedicated E2E
- [ ] Security/answer-key audit

> TKA SD harus mencapai standar engineering/QA yang sama dengan TKA SMP.

---

# 7. TKA SMA

**Status:** [ ] COMPLETE — LOCKED

- [ ] Official framework
- [ ] Core/elective architecture final
- [ ] Student elective selection
- [ ] Blueprint
- [ ] Knowledge taxonomy
- [ ] Content bank
- [ ] Canonical review
- [ ] Mini exams
- [ ] Full exams
- [ ] Result/review
- [ ] Learning loop
- [ ] Monetization
- [ ] Dedicated E2E

> TKA SMA harus usable end-to-end untuk subject wajib dan pilihan yang disepakati.

---

# 8. Platform Expansion

**Status:** [ ] COMPLETE — LOCKED

Potential scope setelah core CPNS/TKA stabil:

- [ ] Organization / School
- [ ] Class management
- [ ] School leaderboard
- [ ] Exam assignment
- [ ] Notification center/campaigns
- [ ] Advanced analytics
- [ ] Generated reports
- [ ] Device management / anti-sharing
- [ ] Voucher/promotion advanced features
- [ ] Certificate platform hardening
- [ ] Feature flag/settings dashboard

---

# Completion Log

| Date | Milestone | Result |
|---|---|---|
| 2026-08-21 | Milestone 1 — Reviewer / Content Workspace + Unified Admin | ✅ COMPLETE |
| 2026-08-21 | Milestone 1.5 — Admin UI/UX Hardening | ✅ COMPLETE |
| 2026-08-21 | Milestone 2 — TKA SMP Mini + Core Product | ✅ COMPLETE |
| 2026-08-21 | Milestone 3 — TKA SMP Learning Loop V1 | ✅ COMPLETE + ACCEPTED; PR #10 merged to `feat/schema-v2` as `ee306041fbfee3f5d1a2dc99cfa44613778e11a5` |

# Current Focus

```text
Milestone 1   ✅ COMPLETE
Milestone 1.5 ✅ COMPLETE
Milestone 2   ✅ COMPLETE
Milestone 3   ✅ COMPLETE
        ↓
Milestone 4 — TKA SMP Monetization ⏭ NEXT ACTIVE
        ↓
Milestone 5 — Schema V2 Production Cutover 🔒 NO-GO
```
