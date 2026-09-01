# Product Experience V1.1 Audit

Status: **IN PROGRESS**  
Parent tracking: **GitHub Issue #21**  
Phase tracking: **GitHub Issue #22**  
Baseline: **Production V1 / Schema V2**

## 1. Objective

Product Experience V1.1 turns the current technically stable SiapTempur release into a polished, understandable, conversion-ready education product.

This phase focuses on:

- UI/UX across the full user-facing application
- information architecture and user flows
- Indonesian UX writing
- product copywriting
- conversion and trust
- marketing / go-to-market readiness

The accepted Schema V2 backend, production database, payment contracts, authentication contracts, and exam business logic are treated as a stable baseline and must not be redesigned casually as part of this milestone.

---

## 2. Product principles

### 2.1 User language

User-facing copy must:

- use natural Indonesian
- use **kamu** consistently
- be short and actionable
- explain benefits before implementation details
- avoid mixed Indonesian/English unless the English term is already conventional for the audience
- never expose release or engineering terminology to ordinary users

### 2.2 Every important screen must answer

1. **Saya sedang ada di mana?**
2. **Apa yang bisa saya lakukan di sini?**
3. **Apa yang sebaiknya saya lakukan berikutnya?**
4. **Kenapa langkah itu bermanfaat untuk saya?**

### 2.3 Experience target

SiapTempur should feel less like a collection of exam features and more like a learning coach:

> Latihan → ukur kemampuan → temukan kelemahan → perbaiki → ulangi.

Core positioning direction:

> **Bukan cuma latihan soal. SiapTempur membantu kamu tahu apa yang harus dipelajari berikutnya.**

---

## 3. Initial route/screen inventory

This is an initial inventory and will be expanded during the audit.

### P0 — acquisition, activation, learning, payment

| Area | Route / screen | Primary user goal | Initial audit priority |
|---|---|---|---|
| Main | `/` | Understand SiapTempur and choose CPNS/TKA | P0 |
| Auth | `/login` | Enter account | P0 |
| Auth | `/register` | Create account | P0 |
| Auth | `/forgot-password` | Recover access | P1 |
| CPNS | `/cpns` | Understand CPNS product and begin | P0 |
| CPNS | `/cpns/dashboard` | Know learning status and next action | P0 |
| CPNS | `/cpns/drilling-materi` | Choose focused practice | P0 |
| CPNS | `/cpns/twk` | Practice TWK | P0 |
| CPNS | `/cpns/tiu` | Practice TIU | P0 |
| CPNS | `/cpns/tkp` | Practice TKP | P0 |
| CPNS | `/cpns/mini-tryout` | Start section-level tryout | P0 |
| CPNS | `/cpns/full-tryout` | Start full SKD simulation | P0 |
| CPNS | exam session | Complete exam without distraction | P0 |
| CPNS | exam result | Understand score and next learning action | P0 |
| TKA | `/tka` | Understand available TKA product | P0 |
| TKA SMP | `/tka/smp` | Enter SMP learning journey | P0 |
| TKA SMP | pass/pricing | Understand access package and value | P0 |
| TKA SMP | progress | Understand learning progress | P0 |
| TKA SMP | wrong questions | Relearn weak questions | P0 |
| TKA SMP | remedial | Improve weak topics | P0 |
| TKA SMP | exam session | Complete exam without distraction | P0 |
| TKA SMP | result | Understand performance and next action | P0 |
| Commerce | checkout/payment states | Complete payment confidently | P0 |

### P1 — retention, trust, secondary journeys

| Area | Screen | Priority |
|---|---|---|
| CPNS | Riwayat | P1 |
| CPNS | Ranking / leaderboard | P1 |
| CPNS | Event | P1 |
| Event | Public event page | P1 |
| Blog | Article list/detail | P1 |
| Account | Profile/settings | P1 |
| System | Error / global error | P1 |
| System | Empty/loading/locked states | P1 |

### P2 — supporting information

| Area | Screen | Priority |
|---|---|---|
| Legal | Syarat & Ketentuan | P2 |
| Legal | Kebijakan Privasi | P2 |
| Legal | Kebijakan Pengembalian | P2 |
| Utility | Certificate verification | P2 |
| Utility | Sitemap/robots/manifest | P2 |

---

## 4. Confirmed initial UX/copy problems

### 4.1 Internal terminology leaks into public UI

Current public code contains product/engineering language such as:

- `Production V1`
- `production-ready`
- `track`
- `entitlement`
- `commerce`
- `mastery`
- `readiness`
- `progress dashboard`
- internal roadmap explanations

These terms are useful internally but should not generally be visible to ordinary users.

### 4.2 TKA page explains implementation status instead of user value

The current TKA experience explains that SD/SMA are outside Production V1 and discusses roadmap/production readiness.

Target presentation:

- active: **TKA SMP — Mulai belajar**
- inactive: **TKA SD — Segera hadir**
- inactive: **TKA SMA — Segera hadir**

No explanation about deployment state is needed.

### 4.3 Homepage feature lists are too implementation-oriented

Current messaging heavily lists capabilities such as Drill, Mini Tryout, Full Tryout, result, readiness, entitlement, and integrated systems.

Target hierarchy should be:

1. user problem
2. outcome / promise
3. how SiapTempur helps
4. proof / trust
5. product features
6. CTA

### 4.4 Logged-in navigation is product-centric rather than task-centric

A user should not have to decide between technical product areas before seeing what needs attention.

Target dashboard question:

> **Apa yang sebaiknya kamu kerjakan hari ini?**

The dashboard should prioritize next-best-action, weak topic, upcoming exam/event, latest score, and progress.

### 4.5 Mixed terminology needs normalization

Candidate terminology standard:

| Internal/current term | Preferred user-facing term |
|---|---|
| Production V1 | remove from UI |
| track | jalur belajar |
| entitlement | akses |
| progress dashboard | perkembangan belajar |
| mastery | penguasaan materi |
| readiness | kesiapan ujian |
| wrong questions | soal yang perlu diulang |
| start exam | mulai ujian |
| submit | kumpulkan jawaban |
| payment pending | menunggu pembayaran |
| payment expired | waktu pembayaran habis |
| activate pass | aktifkan akses |
| learning recommendation | rekomendasi belajar |

Final terminology will be validated globally before implementation.

---

## 5. Initial design-system assessment

Current public UI strongly uses a neo-brutalist visual identity:

- dark 2px borders
- hard offset shadows
- high-contrast blocks
- handwritten/display typography
- yellow/cyan/blue accents

This can remain part of the SiapTempur identity, but it needs refinement.

### Keep

- recognizable energetic personality
- strong CTA contrast
- playful educational character
- visual differentiation from generic test-prep platforms

### Improve

- reduce visual noise in long-session learning screens
- use calmer surfaces in dashboards/results/exams
- reserve hard shadows for high-priority cards/actions
- define semantic color roles
- standardize spacing/radius/border usage
- separate marketing visual language from focused exam visual language
- ensure mobile controls remain comfortable

### Experience modes proposed

**Marketing mode**  
More expressive, branded, energetic.

**Learning mode**  
Cleaner, calmer, information-first.

**Exam mode**  
Minimal distraction, maximum readability and confidence.

---

## 6. Proposed information architecture

### Public

```text
SiapTempur
├── CPNS
├── TKA
├── Tryout/Event
├── Artikel
├── Harga / Paket
└── Masuk / Daftar
```

### Logged-in CPNS

```text
Dashboard
├── Lanjutkan Belajar
├── Latihan
│   ├── TWK
│   ├── TIU
│   └── TKP
├── Tryout
│   ├── Mini Tryout
│   └── Full Tryout
├── Hasil & Analisis
├── Riwayat
└── Ranking / Event
```

### Logged-in TKA SMP

```text
Dashboard
├── Lanjutkan Belajar
├── Latihan
├── Tryout
├── Hasil & Analisis
├── Soal yang Perlu Diulang
├── Latihan Perbaikan
└── Perkembangan Belajar
```

---

## 7. Target acquisition and conversion journey

```text
Content / Search / Referral
        ↓
Landing Page
        ↓
Free useful action
(Mini Tryout / Drill / Diagnostic)
        ↓
Registration
        ↓
Result / Analysis
        ↓
Personalized next recommendation
        ↓
Package / Access recommendation
        ↓
Checkout
        ↓
Paid access
        ↓
Learning loop
        ↓
Retention / Referral
```

The free experience should demonstrate the product promise instead of functioning only as a teaser.

---

## 8. Copywriting framework

### Brand promise

**Primary direction**

> Belajar lebih terarah. Hadapi ujian lebih siap.

**Differentiator**

> Bukan cuma latihan soal. SiapTempur membantu kamu tahu apa yang harus dipelajari berikutnya.

### CPNS direction

> Persiapan SKD yang tidak berhenti di skor.

Supporting message:

> Latihan TWK, TIU, dan TKP, ukur kemampuanmu, lalu fokus memperbaiki bagian yang masih lemah.

### TKA SMP direction

> Belajar dari setiap hasil, bukan sekadar menyelesaikan soal.

Supporting message:

> Latihan, tryout, dan rekomendasi belajar membantu kamu memahami bagian yang sudah kuat dan yang masih perlu diperbaiki.

---

## 9. Implementation waves

### Wave 0 — Audit

- route inventory
- copy inventory
- terminology inventory
- UX-flow mapping
- P0/P1/P2 prioritization

### Wave 1 — Foundation

- language guide
- design tokens
- typography
- layout/container rules
- navigation model
- common states/components

### Wave 2 — Public acquisition

- `/`
- `/cpns`
- `/tka`
- auth
- pricing/package presentation

### Wave 3 — CPNS core experience

- dashboard
- practice selection
- mini/full tryout selection
- results and learning recommendations
- history/ranking

### Wave 4 — TKA SMP core experience

- dashboard
- practice/tryout
- progress
- wrong-question loop
- remedial
- result/recommendation

### Wave 5 — Commerce & trust

- pricing
- checkout
- payment states
- access activation
- refund/support language

### Wave 6 — Growth

- analytics events
- acquisition funnel
- campaign pages
- SEO content system
- referral/retention

### Wave 7 — Regression + Product Experience release

- responsive QA
- accessibility pass
- CI/build/E2E
- release notes

---

## 10. Guardrails

Do not change without separate technical approval:

- canonical Schema V2 contracts
- production data migration state
- payment fulfillment semantics
- Midtrans webhook verification
- auth security contracts
- scoring/business rules
- `legacy_prod`
- deferred TKA SD/SMA/SMK functionality

---

## 11. Next audit actions

- [ ] Enumerate every user-facing `page.tsx`
- [ ] Enumerate user-facing shared components containing copy
- [ ] Search globally for English/internal terminology
- [ ] Audit current login/register pages
- [ ] Audit CPNS dashboard
- [ ] Audit TKA SMP dashboard
- [ ] Audit both exam interfaces
- [ ] Audit result pages
- [ ] Audit checkout/payment states
- [ ] Produce final P0 implementation backlog
