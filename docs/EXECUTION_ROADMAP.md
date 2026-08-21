# Siap Tempur — Execution Roadmap

> **Branch:** `feat/schema-v2`  
> **Working mode:** milestone-by-milestone, one area must be **COMPLETE** before starting the next.  
> **Production status:** **NO-GO** until production cutover gates are explicitly approved.  
> **Companion tracker:** `docs/FEATURE_STATUS_CHECKLIST.md`

Dokumen ini mengatur **urutan pengerjaan**, bukan sekadar daftar fitur. Prinsip utamanya:

> **Selama milestone aktif belum memenuhi Definition of Done, jangan mulai milestone berikutnya.**

Tujuannya agar pengerjaan Siap Tempur tidak berpindah-pindah antara payment, TKA SD, TKA SMA, remedial, admin, dan fitur lain sebelum satu area benar-benar selesai.

---

# Milestone Order

```text
1. REVIEWER / CONTENT WORKSPACE
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
   COMPLETE ✅
       ↓
5. SCHEMA V2 PRODUCTION CUTOVER
       ↓
   COMPLETE ✅
       ↓
6. TKA SD HARDENING
       ↓
   COMPLETE ✅
       ↓
7. TKA SMA
       ↓
   COMPLETE ✅
       ↓
8. PLATFORM EXPANSION
```

---

# 1. Reviewer / Content Workspace

**Status:** [ ] COMPLETE

## Goal

Membuat workflow authoring dan review soal dapat dipakai tim sepenuhnya dari UI tanpa SQL, Supabase Dashboard, atau intervensi developer.

## Checklist

- [ ] Review Queue
- [ ] Filter program
- [ ] Filter track
- [ ] Filter subject
- [ ] Filter workflow status
- [ ] Filter review stage
- [ ] Assign reviewer
- [ ] Editorial Review UI
- [ ] Academic Review UI
- [ ] Technical QA UI
- [ ] Approve
- [ ] Request Revision
- [ ] Reject
- [ ] Publish
- [ ] Reviewer notes
- [ ] Question version history
- [ ] Review round/history
- [ ] Display stimulus
- [ ] Display question options
- [ ] Display explanation
- [ ] Display knowledge node mapping
- [ ] Permission `CONTENT_EDITOR`
- [ ] Permission `CONTENT_REVIEWER`
- [ ] Self-review blocked
- [ ] Audit action/history
- [ ] Browser E2E: author → reviewer → approved → published
- [ ] Lint green
- [ ] Typecheck green
- [ ] Unit tests green
- [ ] Build green
- [ ] E2E green

## Definition of Done

Milestone ini hanya boleh dianggap selesai jika:

> Tim dapat membuat soal dari draft sampai published **tanpa SQL, tanpa Supabase Dashboard, dan tanpa bantuan developer/tool eksternal**.

Completion marker:

```text
CONTENT OPERATIONS ✅ COMPLETED
```

**Do not start Milestone 2 until this is complete.**

---

# 2. TKA SMP Mini Tryout + Core Product

**Status:** [ ] COMPLETE

## Goal

Menutup seluruh gap user-facing TKA SMP setelah Full Tryout sehingga learner tidak menemukan dead-end dalam flow belajar/ujian dasar.

## Existing completed foundation

- [x] TKA SMP Full Tryout
- [x] 60 questions
- [x] 30 Bahasa Indonesia
- [x] 30 Matematika
- [x] 75-minute BIN section
- [x] 75-minute MAT section
- [x] Attempt/resume
- [x] Section transition
- [x] Scoring
- [x] Result
- [x] Review/pembahasan
- [x] Answer-key protection
- [x] Automated browser E2E

## Mini Tryout Bahasa Indonesia

- [ ] Blueprint internal
- [ ] Question count finalized
- [ ] Duration finalized
- [ ] Randomization
- [ ] Question-version lock
- [ ] Attempt creation
- [ ] Autosave
- [ ] Refresh/resume
- [ ] Scoring
- [ ] Result
- [ ] Pembahasan
- [ ] Attempt limit
- [ ] Negative tests
- [ ] Browser E2E

## Mini Tryout Matematika

- [ ] Blueprint internal
- [ ] Question count finalized
- [ ] Duration finalized
- [ ] Randomization
- [ ] Question-version lock
- [ ] Attempt creation
- [ ] Autosave
- [ ] Refresh/resume
- [ ] Scoring
- [ ] Result
- [ ] Pembahasan
- [ ] Attempt limit
- [ ] Negative tests
- [ ] Browser E2E

## Core learner UX

- [ ] History TKA SMP verified
- [ ] Empty states verified
- [ ] Loading/error states verified
- [ ] Mobile responsive verified
- [ ] Track activation UX verified
- [ ] Access-denied UX verified
- [ ] No broken navigation/dead-end

## Definition of Done

> User dapat masuk ke TKA SMP, memilih Mini Tryout atau Full Tryout, menyelesaikan ujian, melihat hasil/pembahasan, kembali ke dashboard/history, dan mengulang flow tanpa dead-end atau intervensi admin.

Completion marker:

```text
TKA SMP CORE PRODUCT ✅ COMPLETED
```

**Do not start Milestone 3 until this is complete.**

---

# 3. TKA SMP Learning Loop V1

**Status:** [ ] COMPLETE

## Goal

Mengubah Siap Tempur dari sekadar aplikasi tryout menjadi platform belajar adaptif sederhana.

Target flow:

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

- [ ] Knowledge mastery per knowledge node
- [ ] Subject progress
- [ ] Wrong-question state
- [ ] Mode ulang soal salah
- [ ] Automatic remedial session
- [ ] Weakest topics
- [ ] Readiness score V1
- [ ] Rule-based recommendation V1
- [ ] Progress dashboard
- [ ] Remedial result
- [ ] Mastery recalculation
- [ ] Unanswered-question handling
- [ ] Attempt-to-learning-event pipeline
- [ ] Browser E2E: exam → weakness → remedial → mastery update
- [ ] Negative tests
- [ ] Lint/typecheck/test/build green

## Scope guard

Jangan implementasikan AI recommendation kompleks pada V1.

V1 harus deterministic / rule-based agar:

- mudah diuji,
- mudah dijelaskan,
- mudah direproduksi,
- tidak membutuhkan banyak historical user data.

## Definition of Done

> Setiap hasil ujian menghasilkan tindakan belajar berikutnya secara otomatis dan perubahan progress/mastery dapat dilihat user.

Completion marker:

```text
TKA SMP LEARNING LOOP V1 ✅ COMPLETED
```

**Do not start Milestone 4 until this is complete.**

---

# 4. TKA SMP Monetization

**Status:** [ ] COMPLETE

## Goal

Mengaktifkan monetisasi TKA SMP hanya setelah core product + learning loop stabil.

Suggested access model:

```text
Free
├── sample / diagnostic
└── selected Mini Tryout

Premium / Tempur Pass
├── Mini Tryout unlimited
├── Full Tryout
├── Learning analysis
├── Remedial
└── History / progress
```

## Checklist

- [ ] Finalize TKA SMP Pass 30-day price
- [ ] Finalize TKA SMP Pass 90-day price
- [ ] Activate products
- [ ] Product features mapping
- [ ] Entitlement rules
- [ ] Midtrans checkout
- [ ] Payment pending handling
- [ ] Payment paid handling
- [ ] Payment failed handling
- [ ] Payment expired handling
- [ ] Idempotent webhook
- [ ] Automatic entitlement fulfillment
- [ ] Pass expiration
- [ ] Access denied after expiry
- [ ] Renewal flow
- [ ] Admin orders view verified
- [ ] Admin payments view verified
- [ ] E2E: buy → pay → entitlement → access
- [ ] E2E: no entitlement → denied
- [ ] E2E: expired entitlement → denied
- [ ] Refund policy decision
- [ ] Operational monitoring

## Definition of Done

> User dapat membeli Tempur Pass sendiri, memperoleh akses otomatis setelah pembayaran valid, kehilangan akses ketika entitlement berakhir, dan seluruh lifecycle dapat dilacak admin tanpa intervensi database manual.

Completion marker:

```text
TKA SMP MONETIZATION ✅ COMPLETED
```

**Do not start Milestone 5 until this is complete.**

---

# 5. Schema V2 Production Cutover

**Status:** [ ] COMPLETE

## Goal

Migrasi production lama ke Schema V2 secara terkontrol tanpa kehilangan identity, attempt, score, payment, event, token/wallet, dan data historis penting.

## Feature freeze rule

Pada milestone ini:

> **Jangan menambah fitur baru.**

Fokus hanya pada migration, rehearsal, reconciliation, rollback, dan cutover.

## Sequence

```text
Feature Freeze
      ↓
Clone Production
      ↓
Transition Migration
      ↓
Transform Legacy Data
      ↓
Reconciliation
      ↓
Schema V2 App Smoke
      ↓
Rollback Rehearsal
      ↓
GO / NO-GO
      ↓
Production Cutover
```

## Checklist

- [ ] Production collision manifest
- [ ] Transition migration package
- [ ] Legacy → V2 mapping document
- [ ] Preserve all required `auth.users.id`
- [ ] Profiles migration
- [ ] Roles migration
- [ ] Questions/options migration
- [ ] Attempts migration
- [ ] Answer migration
- [ ] Subject score migration
- [ ] Payments/orders migration
- [ ] Wallet/token migration
- [ ] Event migration
- [ ] Event registration migration
- [ ] Voucher/promotion migration or retirement decision
- [ ] Leaderboard recalculation
- [ ] Material/learning data decision
- [ ] Monetary reconciliation
- [ ] User identity reconciliation
- [ ] Attempt count reconciliation
- [ ] Score reconciliation
- [ ] Production env verification
- [ ] OAuth redirect verification
- [ ] Midtrans production env verification
- [ ] Backup/PITR verification
- [ ] Clone rehearsal
- [ ] Rollback rehearsal
- [ ] Measure rollback time
- [ ] Internal production smoke plan
- [ ] Monitoring owner
- [ ] Release owner
- [ ] Explicit final GO approval

## Definition of Done

> Schema V2 berjalan di production, data legacy yang dipertahankan telah direkonsiliasi, rollback path telah direhearsal, CPNS existing tidak rusak, dan release dinyatakan GO secara eksplisit.

Completion marker:

```text
SCHEMA V2 PRODUCTION CUTOVER ✅ COMPLETED
```

**Do not start Milestone 6 until production is stable after cutover.**

---

# 6. TKA SD Hardening

**Status:** [ ] COMPLETE

## Goal

Menjadikan TKA SMP sebagai **gold standard** lalu membawa TKA SD ke kualitas arsitektur, content governance, QA, dan E2E yang sama.

## Sequence

```text
TKA SMP = GOLD STANDARD
            ↓
Audit TKA SD
            ↓
Official Blueprint
            ↓
Taxonomy
            ↓
Content Review
            ↓
Exam Hardening
            ↓
Learning Loop
            ↓
Monetization
            ↓
E2E
```

## Checklist

- [ ] Verify official TKA SD framework
- [ ] Fix mandatory/enrichment subject taxonomy if needed
- [ ] Official/internal blueprint separation
- [ ] Knowledge taxonomy audit
- [ ] Audit existing SD question bank
- [ ] Question version snapshots
- [ ] Review workflow for bank
- [ ] Editorial review
- [ ] Academic review
- [ ] Technical QA
- [ ] Mini Bahasa Indonesia
- [ ] Mini Matematika
- [ ] Other officially required SD subjects
- [ ] Full Tryout
- [ ] Result/review
- [ ] Learning Loop V1
- [ ] Tempur Pass validation
- [ ] Payment E2E
- [ ] Dedicated TKA SD browser E2E x3
- [ ] Production smoke

## Definition of Done

> TKA SD memenuhi standar kualitas yang sama dengan TKA SMP dan bukan sekadar memakai exam generic yang kebetulan berjalan.

Completion marker:

```text
TKA SD ✅ COMPLETED
```

**Do not start Milestone 7 until this is complete.**

---

# 7. TKA SMA

**Status:** [ ] COMPLETE

## Goal

Membangun TKA SMA dari framework resmi sampai platform user-facing lengkap.

## Sequence

```text
Official Framework
      ↓
Subject Architecture
      ↓
Student Elective Selection
      ↓
Blueprint
      ↓
Knowledge Taxonomy
      ↓
Content Bank
      ↓
Review
      ↓
Mini / Full Exam
      ↓
Result
      ↓
Learning
      ↓
Monetization
      ↓
E2E
```

## Checklist

- [ ] Verify official framework
- [ ] Mandatory subject architecture
- [ ] Elective subject architecture
- [ ] User elective selection UX
- [ ] Track preference storage
- [ ] Blueprint mandatory subjects
- [ ] Blueprint elective subjects
- [ ] Knowledge taxonomy per subject
- [ ] Question authoring plan
- [ ] Question bank targets per subject
- [ ] Content review workflow
- [ ] Version locking
- [ ] Mini Tryout
- [ ] Full Tryout
- [ ] Elective composition rules
- [ ] Scoring
- [ ] Result/review
- [ ] Learning Loop V1
- [ ] Monetization
- [ ] Browser E2E
- [ ] Production smoke

## Scope guard

Jangan langsung generate bank soal besar sebelum official blueprint, taxonomy, dan elective selection rules selesai.

## Definition of Done

> User SMA dapat memilih kombinasi mata pelajaran yang valid, mengerjakan ujian sesuai blueprint, melihat result/pembahasan/learning progress, dan menggunakan produk secara end-to-end.

Completion marker:

```text
TKA SMA ✅ COMPLETED
```

**Do not start Milestone 8 until this is complete.**

---

# 8. Platform Expansion

**Status:** [ ] COMPLETE

Fitur horizontal ini **ditunda** sampai CPNS + TKA core sudah stabil.

## Organization / School

- [ ] Organization workspace
- [ ] School admin
- [ ] Organization member management
- [ ] Class management
- [ ] Student membership
- [ ] Exam assignment
- [ ] School leaderboard
- [ ] Class report
- [ ] Organization licensing

## Notification

- [ ] Notification center
- [ ] Campaign management
- [ ] Delivery tracking
- [ ] Email/push strategy
- [ ] User preferences

## Reporting & Analytics

- [ ] Advanced learner analytics
- [ ] Question statistics
- [ ] Exam statistics
- [ ] Generated reports
- [ ] Admin reporting dashboard
- [ ] Operational exports

## Security / Device

- [ ] Device management UI
- [ ] Session management
- [ ] Account-sharing detection
- [ ] Concurrent-session policy
- [ ] Abuse monitoring

## Promotion / Voucher

- [ ] Canonical promotion manager
- [ ] Promo code redemption
- [ ] Product eligibility
- [ ] Usage limit
- [ ] Redemption history

## Certificate

- [ ] Certificate template manager
- [ ] Certificate issuance automation
- [ ] Certificate verification
- [ ] Certificate history

## Platform Operations

- [ ] Feature flag admin UI
- [ ] System settings UI
- [ ] Audit log viewer
- [ ] Notification admin
- [ ] Support tooling

---

# Active Milestone

Current recommended milestone:

```text
MILESTONE 1
REVIEWER / CONTENT WORKSPACE
```

Rule:

- [ ] Do not start TKA SMP Mini implementation before Reviewer Workspace reaches Definition of Done.
- [ ] Update `docs/FEATURE_STATUS_CHECKLIST.md` after every completed milestone.
- [ ] Update this file when scope/Definition of Done changes.
- [ ] A milestone can only move to COMPLETE after lint, typecheck, tests, build, and relevant E2E are green.

---

# Completion Log

Gunakan bagian ini untuk mencatat milestone ketika sudah selesai.

| Milestone | Status | Completed At | Release/PR/Commit | Notes |
| --- | --- | --- | --- | --- |
| 1. Reviewer / Content Workspace | ⏳ ACTIVE | - | - | Current focus |
| 2. TKA SMP Core | ⏸️ BLOCKED | - | - | Wait for Milestone 1 |
| 3. TKA SMP Learning Loop V1 | ⏸️ BLOCKED | - | - | Wait for Milestone 2 |
| 4. TKA SMP Monetization | ⏸️ BLOCKED | - | - | Wait for Milestone 3 |
| 5. Schema V2 Production Cutover | ⏸️ BLOCKED | - | - | Wait for Milestone 4 |
| 6. TKA SD Hardening | ⏸️ BLOCKED | - | - | Wait for production stability |
| 7. TKA SMA | ⏸️ BLOCKED | - | - | Wait for TKA SD |
| 8. Platform Expansion | ⏸️ BLOCKED | - | - | Long-term |

---

# Working Agreement

1. Fokus satu milestone.
2. Tidak membuka milestone baru sebelum DoD milestone aktif terpenuhi.
3. Bug/regression yang ditemukan di milestone aktif dianggap bagian milestone tersebut.
4. Jangan menandai complete hanya karena UI sudah ada; backend, authorization, error state, QA, dan E2E harus ikut selesai.
5. Jangan menganggap tabel database kosong sebagai fitur selesai.
6. Production changes selalu membutuhkan approval eksplisit terpisah.
7. Jika scope milestone perlu berubah, ubah dokumen ini terlebih dahulu agar Definition of Done tetap jelas.
