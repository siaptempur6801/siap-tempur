# Product Experience V1.1 Audit

Status: **IN PROGRESS — P0 audit active**  
Parent tracking: **GitHub Issue #21**  
Phase tracking: **GitHub Issue #22**  
Baseline: **Production V1 / Schema V2**  
Working branch: `feat/product-experience-v1-1`

## 1. Objective

Product Experience V1.1 turns the current technically stable SiapTempur release into a polished, understandable, conversion-ready education product without destabilizing the accepted backend, auth, exam, payment, or database contracts.

This milestone covers:

- full application UI/UX
- information architecture
- Indonesian UX writing
- product copywriting
- conversion and trust
- responsive/mobile experience
- marketing and go-to-market readiness
- analytics/CRO preparation

## 2. Product principles

### 2.1 Language

User-facing copy must:

- use natural Indonesian
- use **kamu** consistently
- use sentence case for ordinary UI text
- explain benefits before implementation details
- avoid raw provider/database/engineering terms
- avoid English unless the term is conventional and clearer
- tell the user what they can do next

Detailed rules live in `docs/PRODUCT_LANGUAGE_GUIDE_V1_1.md`.

### 2.2 Every important screen must answer

1. **Saya sedang ada di mana?**
2. **Apa yang bisa saya lakukan di sini?**
3. **Apa yang sebaiknya saya lakukan berikutnya?**
4. **Kenapa langkah itu bermanfaat untuk saya?**

### 2.3 Experience target

SiapTempur should feel like a focused learning coach, not a collection of exam features.

> Latihan → ukur kemampuan → temukan kelemahan → perbaiki → ulangi.

Core positioning:

> **Bukan cuma latihan soal. SiapTempur membantu kamu tahu apa yang harus dipelajari berikutnya.**

Brand line:

> **Belajar lebih terarah. Hadapi ujian lebih siap.**

---

## 3. Priority map

### P0 — acquisition, activation, learning, payment

| Area | Current route/screen | User goal | Audit | Initial copy cleanup |
|---|---|---|---|---|
| Main | `/` | Understand product and choose CPNS/TKA | ✅ | ✅ |
| Auth | `/login` | Enter account | ✅ | ✅ |
| Auth | `/register` | Create account | ✅ | ✅ |
| CPNS | `/cpns` | Understand CPNS offer | 🟡 | ⬜ |
| CPNS | `/cpns/dashboard` | Know status and best next action | ✅ | 🟡 |
| CPNS | `/cpns/dashboard/drilling-materi` | Choose focused practice | 🟡 | ⬜ |
| CPNS | `/cpns/dashboard/mini-tryout` | Start section tryout | 🟡 | ⬜ |
| CPNS | `/cpns/dashboard/tryout` | Start/resume full tryout | ✅ | ⬜ |
| CPNS | exam session | Complete exam confidently | ✅ | ⬜ |
| CPNS | exam result | Understand result and learn next | ✅ | ✅ |
| TKA | `/tka` | Understand available TKA paths | ✅ | ✅ |
| TKA SMP | `/tka/smp` | Enter learning journey | ✅ | ⬜ |
| TKA SMP | pass/pricing | Understand paid access | ✅ | ✅ initial |
| TKA SMP | learning/progress loops | Know what to improve | 🟡 | ⬜ |
| Commerce | CPNS package/payment | Buy confidently | ✅ | ⬜ |

### P1 — retention, trust, secondary journeys

- forgot password
- CPNS history
- ranking / leaderboard
- event pages
- articles/blog
- profile/settings
- global error/error/empty/loading states

### P2 — supporting information

- legal pages
- certificate verification
- sitemap/robots/manifest metadata

---

## 4. Implemented in the first safe-copy wave

These changes are intentionally copy-only or presentation-copy changes. They do not change Schema V2 contracts or business logic.

### 4.1 Login

Implemented:

- standardized `kamu`
- removed `Anda`
- removed `streak` dependency from the main message
- normalized sentence case
- clarified success/error feedback
- normalized `kata sandi` terminology

Target message now follows:

> **Selamat datang kembali**  
> Masuk untuk melanjutkan belajarmu.

### 4.2 Registration

Implemented:

- registration no longer implies the account is only for SKD
- CPNS + TKA are presented as one account
- sentence case standardized
- success/error feedback clarified

Target message:

> **Buat akun SiapTempur**  
> Mulai belajar CPNS atau TKA dalam satu akun.

### 4.3 Main landing page

Implemented first-pass cleanup:

- removed `Production V1` from ordinary user UI
- removed `commerce`, `entitlement`, `track`, `readiness`, `learning loop`, and similar internal/product language
- changed feature-heavy hero into outcome-oriented positioning
- clarified CPNS/TKA choice
- changed user explanation toward the learning loop

This is **not yet the final conversion redesign**. Social proof, pricing, trust, free acquisition hook, FAQ, analytics, and campaign structure remain pending.

### 4.4 TKA landing

Implemented:

- removed production/release/roadmap language
- replaced SD/SMA development status with simple `Segera hadir`
- replaced `mastery`, `readiness`, `progress dashboard`, and `salah-soal`
- changed active TKA SMP CTA toward `Mulai belajar`

### 4.5 CPNS result

Implemented:

- removed `Schema V2`
- removed `server-side`, `snapshot`, `attempt`, and `answer key` from learner-facing copy
- normalized `Total Score` to `Total skor`
- normalized result status language
- changed `Review Jawaban` into `Pembahasan jawaban`
- made result introduction point toward learning improvement

A later wave still needs **data-driven next-best-action** based on weak subject/subtopic.

### 4.6 TKA paid access

Implemented initial copy cleanup:

- `checkout` → payment language
- `premium` → learning access where possible
- raw Midtrans/Snap wording removed from ordinary user errors
- pending/failed/closed payment states made actionable
- package CTA now describes duration of access

---

## 5. Confirmed P0 findings

### 5.1 Homepage/public acquisition

Previous issues:

- internal release terminology visible
- feature lists described implementation instead of outcomes
- CTA labels were destination-oriented (`Lihat CPNS`) instead of action-oriented
- no strong free-value acquisition step
- no social proof/trust layer
- no pricing/value comparison on the main journey

Decision:

Public pages use **marketing mode**: expressive brand identity, clear outcomes, proof, and conversion path.

Remaining work:

- build free-to-paid funnel
- add trust/social proof
- add pricing/value section
- add FAQ
- add analytics events
- review SEO claims

### 5.2 Auth

Confirmed problems:

- `kamu`/`Anda` mixed
- title case inconsistent
- registration was CPNS-only in wording
- generic system errors
- success messages were noisier than needed

First-pass copy is now implemented. Visual/accessibility review remains.

### 5.3 CPNS dashboard

Current dashboard gives very high visual weight to:

- `Mulai Tryout`
- ranking
- ticket balance

But the product promise requires the dashboard to answer:

> **Apa yang sebaiknya kamu kerjakan hari ini?**

Target hierarchy:

1. active session resume, if any
2. next-best learning action
3. weakest subject/topic
4. latest result and improvement trend
5. upcoming event/tryout
6. access/token status
7. ranking as secondary motivation

This requires UX redesign and may require additional derived data, so it is not being patched blindly in the safe-copy wave.

### 5.4 CPNS full-tryout entry

Confirmed issues:

- fabricated motivational quote style is not useful for conversion or confidence
- `CAT BKN 2025/2026` and `Passing Grade Terupdate` require factual/legal verification
- `token` and `ticket` are used inconsistently
- `Ticket Habis!` is both inconsistent and overly noisy
- start page contains more decorative copy than decision-support information
- user needs clearer explanation of cost, duration, question count, resume behavior, and what happens after completion

Target structure:

1. what this tryout measures
2. format/duration/question count
3. access cost
4. resume/session rule
5. clear `Mulai tryout` / `Lanjutkan tryout` CTA
6. concise preparation note

### 5.5 Exam session

The current exam interface has useful functional foundations:

- question navigator
- answered/marked/unanswered states
- timer
- resume persistence
- exit confirmation
- image enlargement
- answer sync

But the tone is not appropriate for a focused high-stakes session.

Confirmed copy/UX problems include:

- `Waktu Tipis!`
- `Gas pol`
- `Siap Mandraguna!`
- `DARURAT!`
- `Buruan`
- `auto-submit`
- `OKE OKE!!`
- `Anda` appears in exit confirmation

Decision:

Exam mode must be **calm, minimal, unambiguous**.

Target warning examples:

**5 minutes**
> Sisa waktu kurang dari 5 menit. Periksa soal yang belum dijawab atau masih kamu tandai.

CTA: `Lanjut mengerjakan`

**1 minute**
> Sisa waktu kurang dari 1 menit. Jawaban akan dikumpulkan otomatis saat waktu habis.

CTA: `Kembali ke soal`

Exit confirmation:

> Progres dan posisi soal terakhir akan tersimpan. Kamu bisa melanjutkan sesi ini nanti.

This screen also needs a visual pass to reduce animation/noise during exam mode.

### 5.6 CPNS result

Before cleanup, result UI exposed implementation language (`Schema V2`, server-side scoring, snapshot, attempt, answer key).

Initial cleanup is complete.

Remaining UX requirement:

Result must progress from:

`score → interpretation → weak area → recommended action`

rather than ending at score/review.

### 5.7 CPNS packages/payment

Confirmed user-facing issues:

- `Harga dan benefit langsung dari katalog SiapTempur` exposes product-system language
- `token`, `ticket`, and `wallet` are mixed concepts
- `Midtrans Snap belum siap` exposes provider implementation
- provider/action errors may be surfaced too directly
- payment close/pending states do not always tell the user what to do
- package cards emphasize units/features more than the learning value purchased

Decision required before final rewrite:

Choose **one commercial mental model** for CPNS:

- `token`, or
- `tiket tryout`

Do not alternate both terms in user UI.

### 5.8 TKA SMP entry

Confirmed technical language leakage includes:

- `track`
- `catalog`
- `progress`
- `attempt`
- `entitlement`
- `user_tracks`

The activation area even explains storage implementation. This must become learner-facing language.

Target activation:

> **Aktifkan jalur belajar TKA SMP**  
> Simpan perkembangan latihan dan hasil tryout kamu dalam satu tempat.

Optional profile inputs should explain their benefit, not their database purpose.

### 5.9 TKA paid access/payment

First-pass payment copy is now clearer.

Remaining work:

- verify package names/descriptions coming from database follow the language guide
- clarify exact included features
- verify unlimited-access wording matches actual entitlement rules
- add support/recovery path for delayed payment verification
- audit mobile Snap flow

### 5.10 Navigation

Desktop/mobile labels are inconsistent:

| Desktop | Mobile |
|---|---|
| Dashboard | Home |
| Mini Tryout | Mini |
| Drilling Materi | Drill |
| Beli Token | Beli |

Other findings:

- `XP` badges may create meaning without sufficient explanation
- `LIVE` event badge may be stale if not state-driven
- learning/practice destinations are presented as flat product features
- results/analysis are not first-class in the navigation

Target IA should group tasks:

```text
Beranda
Belajar
├── Latihan fokus
├── Mini tryout
└── Full tryout
Hasil & perkembangan
Event
Paket / akses
Profil
```

Exact mobile architecture will be decided during design-system/navigation work.

---

## 6. Design-system direction

Current identity:

- 2px dark borders
- hard offset shadows
- handwritten display typography
- yellow/cyan/blue accents
- playful neo-brutalist composition

Keep the recognizable personality, but establish three experience modes.

### Marketing mode

Expressive, energetic, stronger brand devices.

### Learning mode

Calmer surfaces, clearer hierarchy, less decoration, data/action first.

### Exam mode

Minimal distraction, high readability, stable layout, limited animation, neutral feedback until submission.

Design system must standardize:

- typography roles
- semantic colors
- spacing/grid
- border/radius/shadow hierarchy
- buttons
- forms
- cards
- tabs
- alerts/toasts
- modal/dialog
- loading/empty/error/locked states
- score/result visualization
- navigation
- mobile interaction targets

---

## 7. Target information architecture

### Public

```text
SiapTempur
├── CPNS
├── TKA
├── Tryout / Event
├── Artikel
├── Harga / Paket
└── Masuk / Daftar
```

### Logged-in CPNS

```text
Beranda
├── Lanjutkan sesi
├── Rekomendasi hari ini
├── Latihan fokus
│   ├── TWK
│   ├── TIU
│   └── TKP
├── Tryout
│   ├── Mini tryout
│   └── Full tryout
├── Hasil & perkembangan
├── Riwayat
├── Event
└── Peringkat
```

### Logged-in TKA SMP

```text
Beranda
├── Lanjutkan belajar
├── Rekomendasi hari ini
├── Latihan
├── Tryout
├── Hasil & perkembangan
├── Soal yang perlu diulang
└── Latihan perbaikan
```

---

## 8. Target acquisition and conversion journey

```text
Content / Search / Referral
        ↓
Landing page
        ↓
Free useful action
        ↓
Registration
        ↓
Result / analysis
        ↓
Personalized recommendation
        ↓
Package recommendation
        ↓
Payment
        ↓
Paid access
        ↓
Learning loop
        ↓
Retention / referral
```

The free experience must demonstrate the product promise, not function only as a teaser.

---

## 9. Copy system

Primary terminology is defined in `docs/PRODUCT_LANGUAGE_GUIDE_V1_1.md`.

Important replacements:

| Internal / inconsistent | User-facing |
|---|---|
| Production V1 | remove |
| production-ready | remove |
| track | jalur belajar |
| catalog | pilihan / daftar |
| entitlement | akses |
| attempt | pengerjaan / sesi |
| progress | perkembangan |
| mastery | penguasaan materi |
| readiness | kesiapan ujian |
| wrong questions | soal yang perlu diulang |
| checkout | pembayaran |
| rank | peringkat |
| submit | kumpulkan jawaban |

Open terminology decision:

**CPNS `token` vs `tiket tryout` must be unified before the commerce/navigation rewrite.**

---

## 10. Implementation waves

### Wave 0 — Audit

Status: **IN PROGRESS**

- [x] establish audit document
- [x] establish language guide
- [x] audit homepage
- [x] audit login/register
- [x] audit CPNS dashboard
- [x] audit TKA landing/entry
- [x] audit CPNS full-tryout entry
- [x] audit CPNS exam session
- [x] audit CPNS result
- [x] audit CPNS package/payment copy
- [x] audit TKA pass/payment copy
- [x] audit CPNS desktop/mobile navigation
- [ ] enumerate remaining user-facing routes/components
- [ ] audit TKA exam/result/learning-loop screens in detail
- [ ] audit global empty/error/loading/locked states
- [ ] validate all marketing/SEO claims

### Wave 1 — Foundation

- [x] language guide draft
- [ ] design tokens
- [ ] typography rules
- [ ] layout/container rules
- [ ] semantic color roles
- [ ] navigation model
- [ ] standard common states

### Wave 2 — Public acquisition

- [x] homepage safe-copy cleanup
- [x] TKA landing safe-copy cleanup
- [x] auth safe-copy cleanup
- [ ] CPNS landing rewrite
- [ ] final homepage conversion layout
- [ ] trust/social proof
- [ ] pricing/value presentation
- [ ] FAQ

### Wave 3 — CPNS core

- [ ] dashboard redesign around next-best-action
- [ ] practice selection
- [ ] mini/full tryout entry
- [ ] calm exam-mode copy/visual pass
- [x] result safe-copy cleanup
- [ ] data-driven learning recommendation
- [ ] history/ranking cleanup

### Wave 4 — TKA SMP core

- [ ] TKA SMP dashboard/entry rewrite
- [ ] practice/tryout
- [ ] result
- [ ] development/progress
- [ ] wrong-question loop
- [ ] remedial

### Wave 5 — Commerce & trust

- [ ] decide CPNS token/ticket terminology
- [ ] CPNS package rewrite
- [x] TKA payment/access initial copy cleanup
- [ ] payment recovery/support states
- [ ] mobile payment QA

### Wave 6 — Growth

- [ ] analytics events
- [ ] funnel instrumentation
- [ ] campaign pages
- [ ] SEO content system
- [ ] referral/retention

### Wave 7 — Regression + release

- [ ] responsive QA
- [ ] accessibility pass
- [ ] CI/build/E2E
- [ ] Product Experience release notes

---

## 11. Guardrails

Do not change without separate technical approval:

- canonical Schema V2 contracts
- production data migration state
- payment fulfillment semantics
- Midtrans webhook verification
- auth security contracts
- scoring/business rules
- `legacy_prod`
- deferred TKA SD/SMA/SMK functionality

All Product Experience implementation must remain isolated from `main` until reviewed, tested, and intentionally released.

---

## 12. Immediate next implementation backlog

1. Finalize CPNS commercial terminology: **token vs tiket tryout**.
2. Rewrite CPNS full-tryout entry without unsupported/internal claims.
3. Refactor exam-session copy into calm exam mode.
4. Rewrite TKA SMP entry/activation copy without database terminology.
5. Define navigation IA and mobile bottom-nav model.
6. Create design-system tokens and component rules.
7. Rewrite CPNS package/payment UX.
8. Audit TKA exam/result/remedial/wrong-question screens.
9. Start CPNS dashboard next-best-action redesign.
10. Add public conversion/trust/funnel sections after the foundation is locked.
