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
   COMPLETE
       ↓
3. TKA SMP LEARNING LOOP V1
       ↓
   COMPLETE
       ↓
4. TKA SMP MONETIZATION
       ↓
   COMPLETE
       ↓
5. SCHEMA V2 PRODUCTION CUTOVER
       ↓
   COMPLETE
       ↓
6. TKA SD HARDENING
       ↓
   COMPLETE
       ↓
7. TKA SMA
       ↓
   COMPLETE
       ↓
8. PLATFORM EXPANSION
```

---

# 1. Reviewer / Content Workspace + Unified Admin

**Status:** [x] **COMPLETE — 2026-08-21**

## Goal

Membuat workflow authoring dan review soal dapat dipakai tim sepenuhnya dari UI tanpa SQL, Supabase Dashboard, atau intervensi developer, sekaligus menjadikan admin CPNS dan TKA satu workspace global dengan context Program → Track.

## Unified Admin

- [x] Canonical `/admin`
- [x] `/admin/content/questions`
- [x] `/admin/content/review`
- [x] `/admin/content/articles`
- [x] `/admin/assessment/exams`
- [x] `/admin/assessment/events`
- [x] `/admin/commerce/products`
- [x] `/admin/commerce`
- [x] Program → Track context
- [x] CPNS dan TKA menggunakan admin shell yang sama
- [x] Legacy `/cpns/admin/*` compatibility redirect

## Reviewer Workspace

- [x] Review Queue
- [x] Filter program
- [x] Filter track
- [x] Filter subject
- [x] Filter workflow status
- [x] Filter review stage
- [x] Filter reviewer
- [x] Search soal
- [x] Create/edit draft
- [x] Stimulus
- [x] Question options
- [x] Explanation
- [x] Knowledge-node mapping
- [x] Question version history
- [x] Assign reviewer
- [x] Editorial Review
- [x] Academic Review
- [x] Technical QA
- [x] Approve
- [x] Request Revision
- [x] Reject
- [x] Publish
- [x] Reviewer notes
- [x] Review round/history
- [x] Self-review blocked
- [x] Audit action/history

## Security / RBAC

- [x] `CONTENT_EDITOR` least privilege
- [x] `CONTENT_REVIEWER` least privilege
- [x] Authenticated authorization RPC
- [x] Normal content workspace tidak membutuhkan browser service-role key
- [x] Workflow write memakai validated RPC/actions

## QA Gate

- [x] Lint green
- [x] Typecheck green
- [x] Unit tests green
- [x] Security audit green
- [x] Build green
- [x] Existing E2E green
- [x] TKA SMP regression green
- [x] Browser E2E: author → reviewer → Editorial → Academic → Technical QA → published
- [x] Dedicated Content Review E2E success 3 consecutive executions on identical code
- [x] Cleanup staging verified: 0 disposable content users
- [x] Cleanup staging verified: 0 disposable content questions

## Definition of Done Result

> Tim dapat membuat soal dari draft sampai published melalui UI canonical tanpa SQL, tanpa Supabase Dashboard, dan tanpa bantuan developer/tool eksternal.

Completion marker:

```text
MILESTONE 1 ✅ COMPLETE
CONTENT OPERATIONS ✅ COMPLETED
UNIFIED ADMIN CPNS + TKA ✅ COMPLETED
```

---

# 1.5 Admin UI/UX Hardening

**Status:** [x] **COMPLETE — 2026-08-21**

## Goal

Membuat Unified Admin nyaman untuk operasional harian dan menetapkan standar UI/UX permanen agar milestone berikutnya tidak dianggap selesai hanya karena backend bekerja.

## Unified Admin Shell

- [x] Professional responsive admin shell
- [x] Persistent Program / Track selector di topbar
- [x] Program / Track context dipertahankan saat pindah sidebar/bottom navigation
- [x] Permission-aware navigation
- [x] Collapsible desktop sidebar
- [x] Mobile drawer navigation
- [x] Mobile bottom navigation
- [x] Canonical `/admin/*` tetap menjadi namespace utama
- [x] Existing canonical Question/Exam/Event/Product/Commerce routing tetap berfungsi

## Operational UX

- [x] Actionable `/admin` dashboard dengan data operasional nyata
- [x] Review Queue hierarchy diperjelas
- [x] Search/filter toolbar konsisten
- [x] Human-readable workflow statuses
- [x] Queue + selected detail responsive layout
- [x] Structured question-option editor; pipe-delimited storage format tidak lagi menjadi primary input admin
- [x] Authoring/revision form hierarchy diperjelas
- [x] Review/assign/publish action lebih dekat ke current task
- [x] Empty/success/error states diperjelas
- [x] Audit/history dipisahkan dari primary work surface
- [x] Reviewer Workspace ditetapkan sebagai gold-standard admin surface
- [x] `docs/ADMIN_UI_UX_STANDARD.md` menjadi standar permanen

## Responsive / UX QA

- [x] Desktop browser workflow verified
- [x] Mobile `390×844` smoke verified
- [x] Tablet `1024×768` smoke verified
- [x] No unintended document-level horizontal overflow pada mobile
- [x] No unintended document-level horizontal overflow pada tablet
- [x] Mobile drawer open/close/navigation verified
- [x] Program/Track visible pada responsive header
- [x] Visual Playwright screenshot review dilakukan

## Engineering QA

- [x] Lint green
- [x] Typecheck green
- [x] Unit tests green
- [x] Security audit green
- [x] Build green
- [x] Existing E2E green
- [x] Reviewer lifecycle E2E green
- [x] Responsive E2E green
- [x] Staging cleanup: 0 disposable content users
- [x] Staging cleanup: 0 recent CWS questions
- [x] Staging cleanup: 0 associated CWS reviews
- [x] Staging cleanup: 0 associated CWS audit logs
- [x] Vercel preview READY
- [x] Vercel build error check: 0 build errors
- [x] Vercel runtime error/fatal check: 0

## Evidence

- Final code commit: `b0d7627b34447455249063a552ae21ac61f19518`
- Standard CI: run `32466171315` — SUCCESS
- Content Review + responsive staging E2E: run `32466171351` — SUCCESS
- Vercel preview: `dpl_GjoRAFHXNKfVPTSUpc65FijDDqji` — READY
- Staging cleanup verification: `0 users / 0 questions / 0 reviews / 0 audit logs`

## Definition of Done Result

> Admin dapat berpindah CPNS/TKA, menemukan pekerjaan, membuat/mereview soal, memahami status, dan menjalankan workflow penting pada desktop/tablet/mobile tanpa format input teknis, tanpa kehilangan context, dan tanpa dead-end operasional yang jelas.

Completion marker:

```text
MILESTONE 1.5 ✅ COMPLETE
ADMIN UX HARDENING ✅ COMPLETED
ADMIN UI/UX DEFINITION OF DONE ✅ ACTIVE
```

**Milestone 2 boleh dimulai setelah PR #8 di-merge ke `feat/schema-v2` dan deployment hasil merge terverifikasi.**

---

# 2. TKA SMP Mini Tryout + Core Product

**Status:** [ ] COMPLETE — **NEXT ACTIVE MILESTONE**

## Goal

Menutup seluruh gap user-facing TKA SMP setelah Full Tryout sehingga learner tidak menemukan dead-end dalam flow ujian dasar.

## Existing completed foundation

- [x] TKA SMP Full Tryout
- [x] 60 questions
- [x] BIN 30 / 75 minutes
- [x] MAT 30 / 75 minutes
- [x] Attempt/resume
- [x] Sequential sections
- [x] Scoring
- [x] Result
- [x] Review/pembahasan
- [x] Answer-key protection
- [x] Automated browser E2E
- [x] Canonical content/review operations dari Milestone 1
- [x] Admin UI/UX standard dari Milestone 1.5 aktif untuk seluruh admin work pada milestone ini

## Mini Tryout Bahasa Indonesia

- [ ] Blueprint internal finalized
- [ ] Question count finalized
- [ ] Duration finalized
- [ ] Randomization verified
- [ ] Question-version lock verified
- [ ] Attempt creation
- [ ] Autosave
- [ ] Refresh/resume
- [ ] Scoring
- [ ] Result
- [ ] Pembahasan
- [ ] Attempt limit
- [ ] Negative tests
- [ ] Browser E2E
- [ ] Activate/release

## Mini Tryout Matematika

- [ ] Blueprint internal finalized
- [ ] Question count finalized
- [ ] Duration finalized
- [ ] Randomization verified
- [ ] Question-version lock verified
- [ ] Attempt creation
- [ ] Autosave
- [ ] Refresh/resume
- [ ] Scoring
- [ ] Result
- [ ] Pembahasan
- [ ] Attempt limit
- [ ] Negative tests
- [ ] Browser E2E
- [ ] Activate/release

## Core learner UX

- [ ] History TKA SMP verified
- [ ] Empty states verified
- [ ] Loading/error states verified
- [ ] Mobile responsive verified
- [ ] Track activation UX verified
- [ ] Access-denied UX verified
- [ ] No broken navigation/dead-end

## Definition of Done

> User dapat masuk TKA SMP, memilih Mini Tryout atau Full Tryout, menyelesaikan ujian, melihat hasil/pembahasan, kembali ke history/dashboard, dan mengulang flow tanpa dead-end atau intervensi admin.

Completion marker:

```text
TKA SMP CORE PRODUCT ✅ COMPLETED
```

**Do not start Milestone 3 until this is complete.**

---

# 3. TKA SMP Learning Loop V1

**Status:** [ ] COMPLETE — LOCKED

## Goal

Mengubah Siap Tempur dari sekadar tryout menjadi learning loop sederhana dan deterministic.

```text
Selesai ujian
     ↓
Analisis kelemahan
     ↓
Soal salah
     ↓
Remedial
     ↓
Update mastery
     ↓
Rekomendasi latihan berikutnya
```

## Checklist

- [ ] Knowledge mastery per node
- [ ] Subject progress hardening
- [ ] Wrong-question state
- [ ] Mode ulang soal salah
- [ ] Automatic remedial
- [ ] Weakest topics
- [ ] Readiness score V1
- [ ] Rule-based recommendation V1
- [ ] Progress dashboard
- [ ] E2E exam → remedial → mastery update

## Definition of Done

> Setiap hasil ujian menghasilkan tindakan belajar berikutnya secara otomatis dan dapat dilacak.

**Do not start Milestone 4 until this is complete.**

---

# 4. TKA SMP Monetization

**Status:** [ ] COMPLETE — LOCKED

## Goal

Mengaktifkan Tempur Pass hanya setelah Core Product dan Learning Loop siap.

## Checklist

- [ ] Final price 30-day
- [ ] Final price 90-day
- [ ] Product activation
- [ ] Product-feature mapping
- [ ] Entitlement issuance
- [ ] Midtrans checkout QA
- [ ] Pending/paid/failed/expired states
- [ ] Idempotent webhook verification
- [ ] Pass expiry enforcement
- [ ] Access denied after expiry
- [ ] Renewal UX
- [ ] Admin payment/order verification
- [ ] Paid E2E
- [ ] Expiry/no-entitlement E2E

## Definition of Done

> User dapat membeli pass sendiri dan akses premium berubah otomatis sesuai payment + entitlement lifecycle.

**Do not start Milestone 5 until this is complete.**

---

# 5. Schema V2 Production Cutover

**Status:** [ ] COMPLETE — **NO-GO / LOCKED**

## Rule

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

## Blocking Checklist

- [ ] Collision manifest
- [ ] Legacy → V2 mapping
- [ ] User UUID preservation
- [ ] Questions migration rehearsal
- [ ] Attempts migration rehearsal
- [ ] Scores migration rehearsal
- [ ] Payments migration rehearsal
- [ ] Wallet/token migration rehearsal
- [ ] Event migration rehearsal
- [ ] Voucher/promotion parity decision
- [ ] Operational export parity/deferral decision
- [ ] Leaderboard reconciliation
- [ ] Financial reconciliation
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
- [ ] Taxonomy audit
- [ ] Existing bank audit
- [ ] Canonical version/review workflow
- [ ] Mini exam QA
- [ ] Full exam QA
- [ ] Learning loop adaptation
- [ ] Monetization QA
- [ ] Dedicated E2E
- [ ] Security/answer-key audit

## Definition of Done

> TKA SD mencapai standar engineering/QA yang sama dengan TKA SMP.

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

## Definition of Done

> TKA SMA usable end-to-end untuk subject wajib dan pilihan yang disepakati.

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
| 2026-08-21 | Milestone 1 — Reviewer / Content Workspace + Unified Admin | ✅ COMPLETE; CI green, TKA regression green, Content Review E2E 3× green, staging cleanup 0/0 |
| 2026-08-21 | Milestone 1.5 — Admin UI/UX Hardening | ✅ COMPLETE; CI `32466171315` green, Content Review + responsive E2E `32466171351` green, staging cleanup 0/0/0/0, Vercel preview READY |

# Current Focus

```text
Milestone 1 ✅ COMPLETE
Milestone 1.5 ✅ COMPLETE
        ↓
PR #8 merge + post-merge Vercel staging verification
        ↓
Milestone 2 — TKA SMP Mini + Core Product
```
